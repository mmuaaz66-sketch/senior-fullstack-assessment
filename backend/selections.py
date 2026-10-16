from datetime import datetime

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from auth import CurrentUser, current_user
from db import get_conn
from errors import ApiError

router = APIRouter(prefix="/selections", tags=["selections"])


class SelectionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku_ids: list[int] = Field(min_length=1, max_length=2)

    @field_validator("sku_ids")
    @classmethod
    def no_repeats(cls, sku_ids: list[int]) -> list[int]:
        if len(set(sku_ids)) != len(sku_ids):
            raise ValueError("each SKU can only be selected once")
        return sku_ids


class SelectionOut(BaseModel):
    id: int
    sku_ids: list[int]
    created_at: datetime


@router.post("", response_model=SelectionOut, status_code=status.HTTP_201_CREATED)
def create_selection(body: SelectionIn, user: CurrentUser = Depends(current_user)) -> SelectionOut:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, title, quantity FROM skus WHERE id = ANY(%s) ORDER BY id FOR UPDATE",
            (body.sku_ids,),
        )
        locked = {row[0]: row for row in cur.fetchall()}

        missing = [sku_id for sku_id in body.sku_ids if sku_id not in locked]
        if missing:
            raise ApiError(404, "sku_not_found", f"SKU not found: {', '.join(map(str, missing))}")

        sold_out = [locked[sku_id][1] for sku_id in body.sku_ids if locked[sku_id][2] == 0]
        if sold_out:
            raise ApiError(409, "sold_out", f"Sold out: {', '.join(sold_out)}")

        cur.execute(
            "UPDATE skus SET quantity = quantity - 1, updated_at = now() WHERE id = ANY(%s)",
            (body.sku_ids,),
        )
        cur.execute(
            "INSERT INTO selections (user_id) VALUES (%s) RETURNING id, created_at",
            (user.id,),
        )
        selection_id, created_at = cur.fetchone()
        cur.executemany(
            "INSERT INTO selection_items (selection_id, sku_id) VALUES (%s, %s)",
            [(selection_id, sku_id) for sku_id in body.sku_ids],
        )
    return SelectionOut(id=selection_id, sku_ids=body.sku_ids, created_at=created_at)
