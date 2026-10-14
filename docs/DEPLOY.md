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

Конфигурация CI — часть репозитория, а не настройка в веб-интерфейсе: источник лежит в
`ci/workflows/ci.yml`, установка одной командой.

```bash
bash scripts/install-ci.sh          # поставить .github/workflows/ci.yml
bash scripts/install-ci.sh --check  # только сверить: установлено и совпадает (exit 0/1)
```

Workflow идёт по этапам на `push` (любая ветка), `pull_request` и вручную, Node 22,
**без `npm ci`** (движок zero-dep), без сети и ключей:

1. `node scripts/ci-gate.mjs` — самый дешёвый слой (К-15): CI зовёт гейт, в репозитории нет
   секретов, внутренние ссылки в документах ведут на существующие файлы;
2. `npm test` — тесты движка (включая стадии цикла `core/loop-engine/gates.mjs`), платформы
   и вертикалей;
3. `bash scripts/acceptance_test.sh` — полная приёмка DoD (§15 ТЗ): гейт К-21 по всем
   проектам (`9/9`), снимки архива, RAG-индекс, контракты студий.

PR не мержится без зелёного CI; локально те же шаги занимают меньше минуты.

Почему установка отдельной командой: GitHub читает workflow только из `.github/workflows/`,
и этот путь могут закрывать правами доступа — интеграция, которой заливают ветку, иногда не
имеет права `workflows`, и тогда сервер отклоняет push целиком («refusing to allow a GitHub
App to create or update workflow»). Файл-источник в `ci/workflows/` пушится всегда, поэтому
конфигурация не теряется. Пока workflow не установлен, `node scripts/ci-gate.mjs` печатает
`WARN` с командой установки, а «workflow есть, но гейт не зовёт» — уже провал К-15; дрейф
установленного файла с источником — тоже провал.

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
