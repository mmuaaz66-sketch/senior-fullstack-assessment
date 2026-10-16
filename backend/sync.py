import os
from decimal import Decimal

import httpx
from dotenv import load_dotenv
from pydantic import BaseModel

from db import close_pool, get_conn, open_pool

load_dotenv()

PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "https://dummyjson.com/products?limit=12")
DEFAULT_QUANTITY = 2


class Product(BaseModel):
    id: int
    title: str
    price: Decimal
    thumbnail: str | None = None
    stock: int | None = None


class ProductPage(BaseModel):
    products: list[Product]


def fetch_products() -> list[Product]:
    res = httpx.get(PUBLIC_API_URL, timeout=10)
    res.raise_for_status()
    return ProductPage.model_validate(res.json()).products


def initial_quantity(product: Product) -> int:
    if product.stock is None:
        return DEFAULT_QUANTITY
    return max(product.stock, 0)


def sync_skus() -> tuple[int, int]:
    products = fetch_products()
    created = 0
    with get_conn() as conn, conn.cursor() as cur:
        for product in products:
            cur.execute(
                """
                INSERT INTO skus (external_id, title, price, thumbnail, quantity)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (external_id) DO UPDATE
                SET title = EXCLUDED.title,
                    price = EXCLUDED.price,
                    thumbnail = EXCLUDED.thumbnail,
                    updated_at = now()
                RETURNING (xmax = 0) AS inserted
                """,
                (product.id, product.title, product.price, product.thumbnail, initial_quantity(product)),
            )
            created += cur.fetchone()[0]
    return created, len(products) - created


def main() -> None:
    open_pool()
    try:
        created, existing = sync_skus()
    finally:
        close_pool()
    print(f"Synced {created + existing} products: {created} new, {existing} already present (quantity kept)")


if __name__ == "__main__":
    main()
