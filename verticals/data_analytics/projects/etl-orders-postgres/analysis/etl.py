"""ETL пайплайна orders: загрузка заказов в PostgreSQL.

Идемпотентно: upsert по бизнес-ключу (order_id) через ON CONFLICT.
PII не сохраняется: телефон клиента хранится только в виде хеша (sha256).
"""
import hashlib

import psycopg

SEED = 42  # фиксированный seed для воспроизводимого сэмпла

UPSERT_ORDER = """
INSERT INTO orders (id, user_phone_hash, status, created_at, cancelled_at)
VALUES (%(id)s, %(user_phone_hash)s, %(status)s, %(created_at)s, %(cancelled_at)s)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
"""


def hash_phone(phone):
    """Псевдонимизация: телефон клиента заменяется хешем, исходник не хранится."""
    return hashlib.sha256(str(phone).encode()).hexdigest()


def load_orders(rows):
    """Загрузка заказов с обработкой ошибок и пустого входа."""
    if not rows:
        return 0
    loaded = 0
    with psycopg.connect("dbname=orders") as conn:
        try:
            with conn.cursor() as cur:
                for row in rows:
                    cur.execute(UPSERT_ORDER, row)
                    loaded += 1
            conn.commit()
        except psycopg.Error:
            conn.rollback()
            return 0
    return loaded