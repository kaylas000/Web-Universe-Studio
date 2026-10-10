# Студия Юнивёрс

Мета-платформа ИИ-студий (Agentic Studio Platform): **Node/ESM ядро без зависимостей**, цикл
принуждения К-21, **7 вертикалей**, anti-slop, скиллы, композиции (CEO-агент), API и подсистемы
(бюджет, RAG, метрики).

Источник истины — [`TECHNICAL_SPECIFICATION.md`](TECHNICAL_SPECIFICATION.md) (v3.0).

## Требования

Node ≥18 (проверено на Node 24). `core/`, `scripts/`, `cli/` — **ноль npm-зависимостей**.

## Быстрый старт

```bash
node cli/main.mjs help                 # единый CLI
bash scripts/acceptance_test.sh        # полная приёмка DoD (§15)
node core/gate.mjs                     # гейт К-21 по всем 7 вертикалям
```

## Структура

```
core/
  loop-engine/     ядро цикла К-21 (Runner/Orchestrator/валидаторы/sandbox/генераторы,
                   skills.mjs — загрузчик приёмов §4.6, protocols.mjs — контракты §5–§6,
                   trace.mjs — трейсинг §4.8)
  gate.mjs         платформенный гейт: все вертикали, валидатор vertical_project
  orchestrator/    CEO-агент + композиции (DAG): composition.mjs, ceo.mjs, cli.mjs
  api/             HTTP Gateway (node:http)
  budget/          BudgetManager (§4.5)
  knowledge/       RAG/BM25 по архиву референсов (§4.7)
  observability/   метрики + экспорт Prometheus (§4.8)
verticals/         эталон web_studio + legal_docs, content_studio, data_analytics,
                   education, mini_apps, mobile_apps (по скелету §7.1)
compositions/      декларативные сложные задачи (§13)
configs/           llm.yaml, sandbox_templates.yaml, device-matrix.yaml, references_sources.yaml
scripts/           bootstrap-verticals, index_references, scrape_references, run-tests,
                   acceptance_test.sh, deploy.sh
cli/               единый CLI (main.mjs) и поиск по архиву (references_cli.mjs)
tests/             kernel, orchestrator, verticals, e2e + fixtures/slop-site (негативная фикстура)
docs/              ARCHITECTURE.md, API.md, DEPLOY.md, USER_GUIDE.md
```

## Команды

| Команда | Что делает |
| --- | --- |
| `node cli/main.mjs help` | список команд |
| `node core/gate.mjs` | гейт К-21 по всем вертикалям (`exit 0` — закон исполнен) |
| `node core/orchestrator/cli.mjs compositions/sales-post-with-data/composition.yaml` | CEO-агент: композиция |
| `node core/api/server.mjs` | API Gateway |
| `node cli/references_cli.mjs search "договор"` | поиск по архиву (RAG) |
| `npm test` | тесты движка, платформы и вертикалей |
| `bash scripts/acceptance_test.sh` | приёмка DoD (§15) |

## Тесты

```bash
npm run test:engine      # 148 тестов ядра
npm run test:platform    # подсистемы и сквозные сценарии
npm run test:verticals   # по каждой студии
```

## Документы

- `TECHNICAL_SPECIFICATION.md` — ТЗ v3.0 (единый источник истины).
- `docs/ARCHITECTURE.md` — устройство и слои.
- `docs/API.md` — HTTP API, роли, лимиты.
- `docs/DEPLOY.md` — развёртывание и CI.
- `docs/USER_GUIDE.md` — сценарии работы.

## Правило приёмки

Возврат с ворот — **точечные правки по пунктам `feedback.codes`**, не перезапуск (К-10).
Цикл подтверждает исполнимость закона; вердикт в `REVIEW.md` и приёмка на G4 — за человеком (К-09).
