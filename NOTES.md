# Notes

## What I built

Everything in the brief - backend and app.

- Register and login with email and password. Passwords are hashed with bcrypt. Login gives back a token that lasts 1 hour.
- `python sync.py` pulls the products into the database. You can run it as many times as you want, it won't make duplicates. It also won't reset the quantity, so items people already took don't come back.
- `GET /skus` only shows items that are still in stock. `GET /skus/{id}` gives 404 if the item is sold out.
- `POST /selections` lets you pick 1 or 2 items and takes 1 off each.
- The app has a login screen and an items screen. You pick up to 2 items, press Confirm, and the list refreshes.

Two people buying the last item at the same time - only one of them gets it. The database locks the row while one request is using it, so the second one has to wait and then sees 0 left. I tested this with 40 requests at once for an item with 1 left. 1 worked, 39 got "sold out".

## What I skipped on purpose and why

- No automated tests. I tested by hand and with a small script, but ran out of time to write real tests.
- If you refresh the page you get logged out - the token is only kept in memory.
- `/health` works without a token, so the check in the README still works.
- Sync is a script, not an API endpoint. There are no admin users, so I didn't want any user to be able to run it.
- No refresh tokens, no login rate limit, no database migrations.
- I only tried the app on web, not on a phone.

## What I would do next

- Write proper tests, especially for two people buying the same item.
- Keep the user logged in after a refresh.
- Add a screen that shows what you picked before.
- Decide what sync should do if the stock on the API changes later.

## What I would change about the brief or the API I was given

A few things didn't work from a fresh clone:

- passlib doesn't work with the newest bcrypt - it crashes on the first password. I pinned `bcrypt==4.0.1` to fix it.
- `pip install` fails on Python 3.14 because one package (`psycopg-binary==3.2.3`) doesn't support it yet. I used Python 3.12. It would help if the README said which version to use.
- The web version of the app wouldn't start - it needed `@expo/metro-runtime`, so I added it.
- There was no step in the README to load the products, so the list was empty. I added `python sync.py`.

Also, the brief doesn't say what should happen to stock when you run sync again. If it just copies the API's stock every time, sold-out items come back. I'd make that clear in the brief.
