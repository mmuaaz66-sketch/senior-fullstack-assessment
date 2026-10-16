CREATE TABLE IF NOT EXISTS users (
    id            bigserial PRIMARY KEY,
    email         text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skus (
    id          bigserial PRIMARY KEY,
    external_id integer UNIQUE NOT NULL,
    title       text NOT NULL,
    price       numeric(10, 2) NOT NULL,
    thumbnail   text,
    quantity    integer NOT NULL CHECK (quantity >= 0),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS selections (
    id         bigserial PRIMARY KEY,
    user_id    bigint NOT NULL REFERENCES users (id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS selections_user_id_idx ON selections (user_id);

CREATE TABLE IF NOT EXISTS selection_items (
    selection_id bigint NOT NULL REFERENCES selections (id) ON DELETE CASCADE,
    sku_id       bigint NOT NULL REFERENCES skus (id),
    PRIMARY KEY (selection_id, sku_id)
);

CREATE INDEX IF NOT EXISTS selection_items_sku_id_idx ON selection_items (sku_id);
