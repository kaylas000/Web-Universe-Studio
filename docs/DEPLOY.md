# DEPLOY — развёртывание и CI

## Требования

- **Node ≥18** (проверено на Node 24). Ноль npm-зависимостей в `core/`, `scripts/`, `cli/`.
- Сеть и ключи нужны только для реальных LLM-провайдеров и внешних песочниц — ядро работает офлайн.

## Локальный запуск

```bash
git clone <repo> && cd студия-юнивёрс
node cli/main.mjs help
node core/gate.mjs              # гейт К-21 по всем вертикалям
node core/api/server.mjs        # API на 127.0.0.1:8787
```

Переменные окружения:

| Переменная | Смысл |
| --- | --- |
| `API_HOST`, `API_PORT` | адрес API (по умолчанию `127.0.0.1:8787`) |
| `API_TOKENS` | JSON `{ "token": "role" }` для ролей viewer/developer/admin |
| `API_ALLOW_ROLE_HEADER` | `0` — запретить заголовок `X-Role` |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_*` | ключи LLM (только из env) |
| `LOOP_ENGINE_LOG` | уровень логирования движка |

## CI: гейт К-21

`.github/workflows/loop-gate.yml` на `push`/`pull_request` в `main`, Node 20, **без `npm ci`**
(движок zero-dep):

1. `node --test core/loop-engine/tests/*.test.mjs` — тесты движка;
2. `node core/loop-engine/cli.mjs --selftest` — офлайн-цикл;
3. `node core/gate.mjs` — по одной итерации цикла на каждый проект, `exit 0` — закон исполнен;
4. `node scripts/run-tests.mjs tests verticals` — тесты платформы и вертикалей.

## Публикация веб-витрины

```bash
bash scripts/deploy.sh              # сухой прогон: что будет собрано
bash scripts/deploy.sh --build      # реальная сборка (npm run build) в вертикали
DEPLOY_VERTICAL=web_studio bash scripts/deploy.sh --build
```

## Приёмка перед релизом

```bash
bash scripts/acceptance_test.sh
```

Скрипт последовательно прогоняет 7 ступеней DoD (§15) и возвращает `exit 0` только если все зелёные.

## Откат

Платформа stateless: состояние прогонов — в `workspace/` проектов и в `state_file` бюджета.
Откат — восстановление предыдущего коммита; артефакты проектов пересобираются циклом заново.
