# USER GUIDE — как работать с платформой

Ноль npm-зависимостей и сети: всё работает офлайн на Node ≥18.

## Быстрый старт

```bash
node cli/main.mjs help          # список команд
npm run acceptance              # полная приёмка DoD (§15)
```

## 0. Работа в студии (оболочка)

Платформа — оболочка из 3 студий: агент работа **внутри** студии, в папках
`verticals/<студия>/projects/<имя>/`, по правилам и циклам этой студии — её
конституции (К-xx), приёмам (`skills/`), примерам (`references/`) и скриптам
приёмки (`scripts/`). Контракт каждой студии — её `AGENTS.md`.

```bash
# пример: ведём новый проект в мини-студии
cd verticals/mini_apps
mkdir -p projects/moj-app/app
node scripts/validate.mjs projects/moj-app            # приёмка V-xx → «ИТОГ: N/N · exit 0»
node scripts/lint-slop.mjs projects/moj-app           # запреты B-xx → «чисто:»
node scripts/lint-quotas.mjs projects/moj-app         # квоты Q-xx → «ИТОГ: Q/Q · exit 0»
cd ../..
node core/loop-engine/cli.mjs projects/moj-app --studio-root verticals/mini_apps   # цикл студии
```

Сводка по студиям:

| Студия | Контракт | Артефакт в | Приёмка |
| --- | --- | --- | --- |
| mini_apps | verticals/mini_apps/AGENTS.md | `app/` | validate + lint-slop + lint-quotas |
| mobile_apps | verticals/mobile_apps/AGENTS.md | `app/` | то же |
| web_studio | verticals/web_studio/AGENTS.md | `site/` | сборка + validate |

## 1. Прогнать цикл по одному проекту (К-21)

```bash
node core/loop-engine/cli.mjs projects/<имя> --studio-root verticals/<студия> --dry-run
node core/loop-engine/cli.mjs projects/<имя> --json | head
```
`exit 0` — закон исполнен. `exit 1` — в `feedback.codes` список точечных правок (`V-xx`/`B-xx`/`Q-xx`).

## 2. Проверить всю платформу

```bash
node core/gate.mjs                       # все 3 вертикали
node core/gate.mjs --vertical web_studio --json
```

## 3. Сложная задача через CEO-агента (композиция)

```bash
# готовые композиции
node core/orchestrator/cli.mjs compositions/app-with-landing/composition.yaml
node core/orchestrator/cli.mjs compositions/mobile-with-review/composition.yaml   # HITL → exit 1

# спланировать из цели
node core/orchestrator/cli.mjs --plan-only --goal "лендинг и таймер"
node core/orchestrator/cli.mjs --goal "мобильное приложение и лендинг" --accept-hitl
```
Правило К-09: композиция с `hitl: true` не сдаётся без явного вердикта человека (`--accept-hitl`).

## 4. Поиск по архиву референсов (RAG)

```bash
node scripts/index_references.mjs                                   # собрать индексы
node cli/references_cli.mjs search "договор ответственность" --top 3
node cli/references_cli.mjs search "цель нажатия" --vertical mobile_apps
node cli/references_cli.mjs stats
```

## 5. API

```bash
node core/api/server.mjs
curl -s localhost:8787/health
curl -s -H 'Authorization: Bearer dev-token' localhost:8787/v1/verticals
```
Подробнее — `docs/API.md`.

## 6. Тесты

```bash
npm run test:engine        # 148 тестов ядра
npm run test:platform      # тесты подсистем и сквозные
npm run test:verticals     # по каждой студии
npm test                   # всё вместе
```

## 7. Аудит архива (К-04)

```bash
node scripts/scrape_references.mjs          # каждая запись обязана иметь takeaway
```

## Где что лежит

| Каталог | Назначение |
| --- | --- |
| `core/loop-engine` | ядро цикла К-21 |
| `core/gate.mjs` | платформенный гейт |
| `core/orchestrator` | CEO-агент и композиции |
| `core/{budget,knowledge,observability}` | подсистемы |
| `verticals/<name>` | 3 студии |
| `compositions/` | декларативные сложные задачи |
| `configs/` | провайдеры LLM, песочницы, матрица устройств, источники архива |
| `docs/` | эта документация |

## Правило правок

Возврат с ворот — **точечные правки по пунктам**, а не перезапуск (К-10). Вердикт в `REVIEW.md`
и приёмка на G4 — за человеком: цикл подтверждает исполнимость закона, но не оценивает вкус (К-09).
