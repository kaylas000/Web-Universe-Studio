# ARCHITECTURE — устройство метаплатформы

> Источник истины — `TECHNICAL_SPECIFICATION.md` (v3.0). Этот документ — карта того, что уже
> реализовано в репозитории, со ссылками на разделы ТЗ. Ноль npm-зависимостей в `core/` и `scripts/`.

## Слои (§3.1 ТЗ)

```
┌──────────────────────────────────────────────────────────────┐
│  CLI (cli/main.mjs)          API Gateway (core/api/server.mjs) │
├──────────────────────────────────────────────────────────────┤
│  CEO-агент / оркестратор (core/orchestrator/)                  │
│    • композиции DAG (§13.1)  • Plan→Route→Run→Verify→Aggregate │
├──────────────────────────────────────────────────────────────┤
│  ЯДРО (core/loop-engine) — цикл принуждения К-21               │
│    Runner · Orchestrator · валидаторы · sandbox · генераторы   │
├──────────────────────────────────────────────────────────────┤
│  Подсистемы: budget · knowledge(RAG) · observability           │
├──────────────────────────────────────────────────────────────┤
│  7 ВЕРТИКАЛЕЙ (verticals/<name>) — по скелету §7.1             │
└──────────────────────────────────────────────────────────────┘
```

## Ядро — цикл К-21 (`core/loop-engine`)

Перенесено из эталона без изменений. Цикл: **сборка → ворота → фидбек → приёмка**. Прогон:

```bash
node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project   # exit 0 — закон исполнен
node core/loop-engine/cli.mjs --selftest                               # офлайн-цикл
node core/loop-engine/gate.mjs                                         # гейт по всем проектам
```

`exit 1` возвращает `feedback.codes` (`V-xx`/`B-xx`/`M-xx`) — это **список точечных правок** (К-10),
а не повод начинать заново.

Дополнительно в ядре:

- **Skills Engine** (`core/loop-engine/skills.mjs`, §4.6) — загрузчик приёмов: `skill.yaml` +
  `templates/*.j2` + ESM-крючки `pre_execute`/`post_execute`; рендер — `template.mjs`.
- **Протоколы** (`core/loop-engine/protocols.mjs`, §5–§6) — структурные контракты `IVertical` /
  `IVerificationGate` / `ITool`, фабрики `define*`, проверки `is*`, стандарт кодов и severity,
  нормализация фидбека `toAgentFeedback`.
- **Трейсинг** (`core/loop-engine/trace.mjs`, §4.8) — `makeTraceHook(workspaceDir)` пишет
  `workspace/trace.jsonl` (`{ts, runId, node, iteration, durationMs, ok}`) через `onIteration` раннера.


## Платформенный гейт (`core/gate.mjs`)

Отличие от ядрового гейта: валидатор — `vertical_project` (у каждой студии свой `scripts/validate.mjs`),
поэтому гейт проходит по **всем 7 вертикалям**:

```bash
node core/gate.mjs                       # все вертикали и их проекты
node core/gate.mjs --vertical web_studio --json
```

Вертикаль определяется маркером `metadata.deliverable` в `vertical.yaml` (§8). `listVerticals`,
`readVerticalMeta`, `listProjects`, `runProject` — переиспользуемые примитивы (их использует CEO-агент).

## Вертикали (`verticals/<name>`)

Семь студий: `web_studio` (эталон, корень ceh-veb), `legal_docs`, `content_studio`, `data_analytics`,
`education`, `mini_apps`, `mobile_apps`. Скелет §7.1: `vertical.yaml` (§8), `CONSTITUTION.md`,
`AGENTS.md`, `anti-slop/`, `skills/`, `references/`, `gates/`, `validators/`, `scripts/{validate,lint-slop}.mjs`,
`projects/<demo>/`. Общий контракт отчёта и декларативный движок правил — `core/vertical-kit/index.mjs`.

Шесть новых вертикалей порождены идемпотентным генератором `scripts/bootstrap-verticals.mjs`.

Полные конституции (§9 ТЗ) и анти-слоп (§10 ТЗ) шести вертикалей лежат в `scripts/tz-verticals.mjs`
(слой `TZ_OVERRIDES`, дословные тексты статей `К-xx`, запретов `B-xx` и квот `Q-xx`) и накладываются
на инлайновые SPECS генератора. Офлайн-набор `scripts/validate.mjs` (`V-xx`) реализует детерминированное
подмножество статей; проверки, требующие LLM-judge, песочницы или устройств (Playwright/Lighthouse/Flipper),
исполняются на верхнем тире (§14 ТЗ) и отмечены в графе `method` каждой статьи.

## CEO-агент (`core/orchestrator`)

- `composition.mjs` — загрузка/валидация композиции, топологическая сортировка (`E-CONFIG-GRAPH` на цикле).
- `ceo.mjs` — `route` (ключевые слова → домены), `plan` (цель → композиция), `run` (DAG, блокировка
  зависимостей), `aggregate` (режимы `all` / `best_effort` / `quorum`).
- HITL-задача (`hitl: true`) **не закрывается** без человека — агрегатор возвращает `E-COMPOSITION-HITL` (К-09).
- `cli.mjs` — запуск по файлу или `--goal`, `--plan-only`, `--accept-hitl`.

## API Gateway (`core/api/server.mjs`)

`node:http`, без фреймворка. Роли `viewer`/`developer`/`admin`, rate limiting (RPM/RPD/concurrent),
идемпотентность по `idempotency_key`, очередь run в памяти процесса. См. `docs/API.md`.

## Подсистемы

- **BudgetManager** (`core/budget`) — pre-flight `checkBudget`, пороги (alert 80%), дневной лимит,
  восстановление состояния из `state_file`, `E-BUDGET`.
- **Knowledge / RAG** (`core/knowledge`) — BM25 по архиву референсов, лёгкий стемминг кириллицы,
  провайдер `local`; Qdrant — опционально с честным fallback. Сборка индекса — `scripts/index_references.mjs`.
- **Observability** (`core/observability`) — счётчики/гистограммы/датчики, экспорт Prometheus (`GET /metrics`).

## Данные и безопасность (§14.2–14.3)

- `subprocess.mjs`: `shell: false`, аргументы массивом, `timeout` + SIGKILL, усечение вывода.
- Запись только в `workspace/`; все пути через `safeResolveInside` (`E-PATH`).
- Предохранитель проекта: запись в `projects/<имя>/` без `allow_project_writes: true` → `E-WRITE-GUARD`.
- Ключи моделей — только из переменных окружения.

## Приёмка

```bash
bash scripts/acceptance_test.sh     # DoD §15: тесты движка, selftest, гейт, индекс, аудит, CEO, тесты
```
