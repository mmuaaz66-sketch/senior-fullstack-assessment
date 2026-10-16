from fastapi import APIRouter, Depends
from psycopg.rows import class_row
from pydantic import BaseModel

from auth import current_user
from db import get_conn
from errors import ApiError

router = APIRouter(prefix="/skus", tags=["skus"], dependencies=[Depends(current_user)])


class SkuOut(BaseModel):
    id: int
    title: str
    price: float
    thumbnail: str | None
    quantity: int


@router.get("", response_model=list[SkuOut])
def list_skus() -> list[SkuOut]:
    with get_conn() as conn, conn.cursor(row_factory=class_row(SkuOut)) as cur:
        cur.execute(
            "SELECT id, title, price, thumbnail, quantity FROM skus WHERE quantity > 0 ORDER BY id"
        )
        return cur.fetchall()


@router.get("/{sku_id}", response_model=SkuOut)
def get_sku(sku_id: int) -> SkuOut:
    with get_conn() as conn, conn.cursor(row_factory=class_row(SkuOut)) as cur:
        cur.execute(
            "SELECT id, title, price, thumbnail, quantity FROM skus WHERE id = %s AND quantity > 0",
            (sku_id,),
        )
        sku = cur.fetchone()
    if sku is None:
        raise ApiError(404, "sku_not_found", "SKU not found or sold out")
    return sku
