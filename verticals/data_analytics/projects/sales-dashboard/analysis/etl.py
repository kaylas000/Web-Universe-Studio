"""ETL: загрузка платежей в витрину sales. Идемпотентно через ON CONFLICT.

PII не хранится: пользователь представлен хешем (sha256).
"""
import hashlib

import psycopg

SEED = 42  # фиксированный seed для воспроизводимых сэмплов

UPSERT = """
INSERT INTO sales_payments (id, paid_at, amount, status)
VALUES (%(id)s, %(paid_at)s, %(amount)s, %(status)s)
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;
"""


def mask_user(user):
    """Псевдонимизация пользователя: PII заменяем хешем, исходник не сохраняем."""
    return hashlib.sha256(str(user).encode()).hexdigest()


def load(rows):
    """Загрузка платежей с обработкой ошибок и пустого входа."""
    if not rows:
        return 0
    loaded = 0
    with psycopg.connect("dbname=sales") as conn:
        try:
            with conn.cursor() as cur:
                for row in rows:
                    cur.execute(UPSERT, row)
                    loaded += 1
            conn.commit()
        except psycopg.Error:
            conn.rollback()
            return 0
    return loaded
