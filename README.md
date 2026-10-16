# Senior Full Stack Developer — Take-Home Assessment

**Time: 2 hours.** Fork this repo, work on your fork, commit as you go. When the two hours are up, stop and send us the link to your fork. We grade what is committed.

## The task

Users log in, see a short list of items, pick one or two, and the stock behind those items goes down for everyone else.

## What is already wired

- **Backend** `backend/`: FastAPI with a Postgres connection pool (`db.py`), `/health`, CORS open. Dependencies for bcrypt and JWT are in `requirements.txt`, but no auth code exists yet.
- **Database**: Postgres 16 via `docker-compose.yml`. `backend/schema.sql` has a `users` table; the rest is yours.
- **Frontend** `app/`: Expo (React Native; web preview works) with an API client that attaches a bearer token (`src/api.ts`), the color theme (`src/theme.ts`) and two empty screens (`Login`, `Items`). `App.tsx` switches between them.
- **Public API**: `https://dummyjson.com/products?limit=12` (fields include `id`, `title`, `price`, `thumbnail`, `stock`).

## Build

1. **Auth** — email + password. `POST /auth/register` and `POST /auth/login` return a token. Every other endpoint requires it. Hash passwords. Keep it minimal.
2. **Sync** — a script or endpoint that pulls products from the public API into Postgres as SKUs. Each SKU has a `quantity`: the API's `stock` if present, otherwise `2`. Running the sync twice must not create duplicate SKUs.
3. **Read** — `GET /skus` returns SKUs with `quantity > 0`. `GET /skus/{id}` returns `404` when the SKU is sold out.
4. **Select** — `POST /selections` with `{ "sku_ids": [ ... ] }` (one or two ids). Records which user selected which SKUs and decrements each SKU's quantity by 1.
5. **App** — Login screen, then Items screen: list from `GET /skus` (image + title), select up to two, Confirm. After confirming, the list refreshes and any SKU at 0 is gone. Log in as a different user: the sold-out SKU must not appear.

## Rules

- A SKU at quantity 0 is unreachable: not in the list, and `GET /skus/{id}` returns 404.
- Two users taking the last unit at the same time must not both succeed.
- The user identity comes from the token, never from the request body.
- Do not build: password reset, roles, admin screens, payments, pagination.
- Errors: HTTP status plus `{ "detail": { "code": "...", "message": "..." } }` is fine; any consistent shape is fine.
- Fill in `NOTES.md`: what you would do next, what you skipped on purpose, and anything you would change about this brief.

## Design pointers

- Use the colors in `app/src/theme.ts`.
- Cards with image and title; selected state in the accent color; one Confirm button; a small sign-out.
- Clarity over polish. We are not grading pixels.

## Run

```bash
# database
docker compose up -d
psql postgresql://assessment:assessment@localhost:5432/assessment -f backend/schema.sql

# backend
cd backend
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python sync.py                     # loads products into skus, 
uvicorn main:app --reload          # http://localhost:8000/health

# app
cd ../app
npm install
npx expo start                     # press w for web, or run on a simulator / device
# on a physical device: EXPO_PUBLIC_API_URL=http://<your-machine-ip>:8000 npx expo start
```

## Submitting

Push to your fork and send us the URL. Make sure the Run steps work from a clean clone, and that `NOTES.md` is filled in.
