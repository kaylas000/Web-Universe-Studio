# API — HTTP Gateway (§4.9 ТЗ)

Реализация: `core/api/server.mjs` (`node:http`, без фреймворка). Запуск:

```bash
node core/api/server.mjs            # http://127.0.0.1:8787 (API_PORT/API_HOST из env)
# или
node cli/main.mjs api
```

## Аутентификация и роли

Токен в заголовке `Authorization: Bearer <token>`. Соответствие токен → роль задаётся переменной
окружения `API_TOKENS` (JSON). Для локальной разработки есть dev-токены:

| Токен | Роль | RPM | RPD | concurrent |
| --- | --- | --- | --- | --- |
| `viewer-token` | viewer | 60 | 2 000 | 2 |
| `dev-token` | developer | 300 | 20 000 | 8 |
| `admin-token` | admin | 1 000 | 100 000 | 32 |

Для отладки разрешён заголовок `X-Role: viewer|developer|admin` (отключается `API_ALLOW_ROLE_HEADER=0`).

- нет токена → `401 E-AUTH`;
- превышен лимит → `429 E-RATE-LIMIT`.

## Маршруты

### `GET /health`
Открыт, без токена.
```json
{ "status": "ok", "ready": true, "verticals": 7, "runs": 0, "uptime_s": 3 }
```

### `GET /metrics`
Открыт. Метрики в формате Prometheus (`run_duration_count`, `tokens_used`, `budget_used_usd`, …).

### `GET /v1/verticals`
Список вертикалей, их скиллов, гейтов и демо-проектов.

### `POST /v1/generate`
Запуск задачи вертикали в фоне. Тело:
```json
{ "vertical": "data", "skill": "metric-report", "input": {"...": "..."}, "idempotency_key": "k1" }
```
- `202` → `{ "run_id": "run-1-…", "status": "queued" }`;
- повтор с тем же `idempotency_key` → `200 { "idempotent": true, "run_id": "…" }`;
- неизвестная вертикаль → `400 E-API-VERTICAL`; нет `vertical` → `400 E-API-INPUT`.

### `GET /v1/runs/{id}`
Статус run (`queued|running|ok|fail|error`) и результат (`loop-result.json`-совместимо).

### `POST /v1/compositions/{name}`
Запуск композиции `compositions/<name>/composition.yaml` через CEO-агента. Заголовок
`X-Accept-Hitl: 1` отмечает HITL-задачи принятыми человеком (К-09).

## Ошибки

Единый формат: `{ "error": "E-…", "message": "…" }`. Коды: `E-AUTH`, `E-RATE-LIMIT`, `E-API-INPUT`,
`E-API-VERTICAL`, `E-API-NOT-FOUND`, `E-API-404`, `E-API-JSON`, `E-API-BODY`, `E-API-RUN`.

## Пример

```bash
BASE=http://127.0.0.1:8787
curl -s $BASE/health
curl -s -H 'Authorization: Bearer dev-token' $BASE/v1/verticals | head
RUN=$(curl -s -H 'Authorization: Bearer dev-token' -H 'Content-Type: application/json' \
  -d '{"vertical":"data","idempotency_key":"k1"}' $BASE/v1/generate | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).run_id))')
sleep 1; curl -s -H 'Authorization: Bearer dev-token' $BASE/v1/runs/$RUN
```
