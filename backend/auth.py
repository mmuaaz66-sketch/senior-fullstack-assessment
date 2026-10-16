import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field

from db import get_conn
from errors import ApiError

load_dotenv()

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_TTL_MINUTES = int(os.getenv("JWT_TTL_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class RegisterIn(LoginIn):
    password: str = Field(min_length=8, max_length=72)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUser(BaseModel):
    id: int
    email: str


def unauthorized(code: str, message: str) -> ApiError:
    return ApiError(401, code, message, {"WWW-Authenticate": "Bearer"})


def issue_token(user_id: int) -> TokenOut:
    now = datetime.now(timezone.utc)
    claims = {"sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=JWT_TTL_MINUTES)}
    return TokenOut(access_token=jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM))


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> CurrentUser:
    if creds is None:
        raise unauthorized("not_authenticated", "Missing bearer token")
    try:
        claims = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(claims["sub"])
    except (JWTError, KeyError, ValueError):
        raise unauthorized("invalid_token", "Token is invalid or expired")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, email FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
    if row is None:
        raise unauthorized("invalid_token", "Token is invalid or expired")
    return CurrentUser(id=row[0], email=row[1])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn) -> TokenOut:
    password_hash = pwd_context.hash(body.password)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (email, password_hash) VALUES (%s, %s)
            ON CONFLICT (email) DO NOTHING
            RETURNING id
            """,
            (body.email.lower(), password_hash),
        )
        row = cur.fetchone()
    if row is None:
        raise ApiError(409, "email_taken", "An account with this email already exists")
    return issue_token(row[0])


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn) -> TokenOut:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, password_hash FROM users WHERE email = %s", (body.email.lower(),))
        row = cur.fetchone()
    if row is None:
        pwd_context.dummy_verify()
        raise unauthorized("invalid_credentials", "Email or password is incorrect")
    if not pwd_context.verify(body.password, row[1]):
        raise unauthorized("invalid_credentials", "Email or password is incorrect")
    return issue_token(row[0])
