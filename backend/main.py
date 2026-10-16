import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from db import close_pool, get_conn, open_pool
from errors import register_error_handlers

load_dotenv()

PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "https://dummyjson.com/products?limit=12")


@asynccontextmanager
async def lifespan(_: FastAPI):
    open_pool()
    yield
    close_pool()


app = FastAPI(title="Assessment API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
register_error_handlers(app)
app.include_router(auth_router)


@app.get("/health")
def health():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1")
        cur.fetchone()
    return {"ok": True}
