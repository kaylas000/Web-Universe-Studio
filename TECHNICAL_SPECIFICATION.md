# TECHNICAL_SPECIFICATION.md — Мета-платформа ИИ-студий (Agentic Studio Platform)

> **Версия 3.0 (Node/JS).** Единый источник истины. Пришла на смену ТЗ v2.0 (Python),
> пять разрозненных частей которого сведены в этот документ.
>
> **Ключевое изменение относительно v2.0:** ядро платформы — **Node ≥ 18 / ESM / ноль npm-зависимостей**,
> построено на уже работающем движке `core/loop-engine/` этого репозитория (К-21), а не на
> Python-стеке (FastAPI / LangGraph / LiteLLM / pydantic / Kubernetes). Эталонная веб-вертикаль —
> сам репозиторий `ceh-veb` (ЦЕХ). Все 7 конституций раскрыты полностью; ссылок на
> «предыдущее ТЗ» больше нет.
>
> **Для ИИ-агента:** здесь описаны все контракты, структуры, интерфейсы и правила. Не выдумывай
> сущности, которых нет в документе. Если ТЗ противоречиво — остановись и спроси (см. §17.4).

---

## СОДЕРЖАНИЕ

1. Назначение и принципы
2. Домены (6 вертикалей)
3. Архитектура системы (Node)
4. Ядро (Kernel)
5. Протоколы взаимодействия
6. Стандарт кодов ошибок
7. Структура студии (вертикали)
8. Декларативное описание студии (`vertical.yaml`)
9. Конституции 6 доменов (полные тексты)
10. Anti-slop система (BANNED + QUOTAS)
11. Система скиллов
12. Референсы и RAG
13. Композиции и CEO-агент
14. Инфраструктура и CI
15. Критерии приёмки и тесты
16. Риски и митигации
17. План реализации и регламент агента
18. Итоговое резюме

---

## 1. НАЗНАЧЕНИЕ И ПРИНЦИПЫ

### 1.1. Назначение

Модульная мета-платформа для быстрого развёртывания специализированных ИИ-студий
(**вертикалей**), решающих задачи в конкретных предметных областях с гарантированным качеством
через **циклы самокоррекции** и **детерминированную валидацию**.

### 1.2. Ключевые архитектурные принципы

| № | Принцип | Исполнение на Node |
|---|---|---|
| 1 | **Domain-agnostic ядро** | `core/` (`loop-engine` + `api` + `budget` + `knowledge`) не знает о предметке |
| 2 | **Студии как плагины** | `verticals/<name>/` реализуют контракты `IVertical`/`IVerificationGate` |
| 3 | **Циклическая самокоррекция** | раннер `Генерация → Валидация → Фидбек → Исправление` (К-21) |
| 4 | **Constitution as Code** | `CONSTITUTION.md` + детерминированные валидаторы/линтеры |
| 5 | **Экономичность** | ноль npm-зависимостей; бесплатные/локальные модели (Ollama, vLLM) через встроенный `fetch` |
| 6 | **Детерминированная валидация** | скрипты (`validate.mjs`, `lint-*.mjs`) решают приёмку, LLM — только там, где указано |
| 7 | **Переиспользуемые референсы** | архив `references/` с обязательным `takeaway` |
| 8 | **Многоагентная оркестрация** | CEO-агент + декларативные композиции (`compositions/*.yaml`) |
| 9 | **Один закон — цикл** | проект не сдан без `exit 0` цикла и evidence `workspace/loop-result.json` (К-21) |

### 1.3. Глоссарий

| Термин | Определение |
|---|---|
| **Ядро (Kernel)** | Domain-agnostic инфраструктура; здесь — `core/loop-engine/` этого репозитория |
| **Вертикаль (Vertical)** | Специализированная студия для предметной области (`verticals/<name>/`) |
| **Конституция** | Набор проверяемых правил `К-01…К-N` + привязка к кодам ошибок |
| **Цикл (Loop)** | Итерация `генерация → валидация → фидбек → исправление` (`UniversalLoopRunner`) |
| **Гейт (Gate)** | Контрольная точка `G1–G4`, пропускающая артефакт только через валидаторы |
| **Скилл (Skill)** | Переиспользуемая способность вертикали (`SK-xx`; шаблоны + правила) |
| **Код ошибки** | Типизированный идентификатор проблемы (`V-01`, `B-03`, `Q-02`, `E-…`) |
| **Anti-slop** | Детерминированные запреты (`BANNED.md`) и лимиты (`QUOTAS.md`) |
| **CEO-агент** | Мета-оркестратор, координирующий несколько студий |
| **Композиция** | Декларативное описание сложной задачи для нескольких студий (YAML) |
| **Артефакт** | Результат генерации: строка либо карта файлов `{"site/index.html": "…"}` |
| **Фидбек** | Структурированный вердикт валидатора, возвращаемый в цикл |

---

## 2. ДОМЕНЫ (6 ВЕРТИКАЛЕЙ)

| № | Вертикаль | Продукты | Стек артефактов |
|---|---|---|---|
| 1 | `web_studio` | лендинги, каталоги, портфолио, интернет-магазины, корпоративные сайты | HTML/CSS/JS, Vite/React |
| 2 | `content_studio` | SEO-статьи, описания товаров, email-цепочки, посты для каналов | Markdown/HTML |
| 3 | `data_analytics` | SQL, Python-скрипты, отчёты, дашборды | SQL, Python |
| 4 | `education` | уроки, курсы, тесты, онбординг | Markdown/HTML |
| 5 | `mini_apps` | Telegram/VK Mini Apps: магазины, боты, игры, сервисы записи | React + Telegram WebApp SDK / VK Bridge |
| 6 | `mobile_apps` | React Native / Flutter / SwiftUI / Compose MVP, UI-киты, ассеты сторов | RN/Expo, Flutter, Swift, Kotlin |

---

## 3. АРХИТЕКТУРА СИСТЕМЫ (Node)

### 3.1. Общая схема

```text
КЛИЕНТСКИЙ СЛОЙ (CLI · REST API node:http · Telegram Bot · Web UI)
        │
        ▼
┌───────────────────────────────────────────┐
│  API Gateway (core/api, node:http)        │
│  • Auth (API keys / JWT)                  │
│  • Rate limiting + идемпотентность        │
│  • Маршрутизация к вертикалям             │
└───────────┬───────────────────────────────┘
            │
┌───────────▼───────────────────────────────┐
│  ЯДРО (core/)                             │
│  ┌─────────────────────────────────────┐  │
│  │ loop-engine (Runner/Orchestrator)   │  │
│  │ • UniversalLoopRunner               │  │
│  │ • resume через workspace/iterations │  │
│  │ • pending feedback (HITL при исчерп.)│ │
│  └──────────────┬──────────────────────┘  │
│  ┌────────┐ ┌────────┐ ┌────────┐         │
│  │LLM Mgr │ │Sandbox │ │Budget  │         │
│  │(fetch) │ │(proc/  │ │Manager │         │
│  │        │ │docker) │ │        │         │
│  └────────┘ └────────┘ └────────┘         │
│  ┌────────┐ ┌────────┐ ┌────────┐         │
│  │Skills  │ │Knowled-│ │Tools   │         │
│  │Engine  │ │ge Base │ │Registry│         │
│  └────────┘ │(local/ │ └────────┘         │
│             │Qdrant*)│                    │
│             └────────┘                    │
│  ┌──────────────────────────────────────┐ │
│  │ Observability (logger + metrics.json)│ │
│  └──────────────────────────────────────┘ │
└───────────┬───────────────────────────────┘
            │
    ┌───────┼───────┬──────────┬───────────┐
    ▼       ▼       ▼          ▼           ▼
┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐
│Web    ││Content││Data   ││Educa- ││Mini   ││Mobile │
│Studio ││Studio ││Analyt.││tion   ││Apps   ││Apps   │
└───────┘└───────┘└───────┘└───────┘└───────┘└───────┘
            ▲
            │
┌───────────┴───────────────────────────────┐
│  CEO-агент (orchestrator)                 │
│  • Классификация задач                    │
│  • Композиции (YAML) · Параллель (DAG)    │
│  • Маршрутизация к студиям                │
└───────────────────────────────────────────┘
```

`*` Qdrant — **опционально**. Базовая конфигурация — локальный индекс референсов (см. §12).

### 3.2. Слои архитектуры

- **Слой 1 — Клиентский.** CLI (`cli.mjs`), REST API (`core/api`, `node:http`), Telegram Bot, Web UI (опционально).
- **Слой 2 — API Gateway.** Аутентификация (роли `viewer`, `developer`, `admin`), rate limiting (RPM/RPD/concurrent), идемпотентность, маршрутизация и композиция задач.
- **Слой 3 — Ядро (Kernel).** `loop-engine` (описан в §4), LLM Manager (`fetch`), Sandbox Manager (`subprocess`/Docker), Budget Manager, Skills Engine, Knowledge Base, Observability.
- **Слой 4 — Вертикали.** `verticals/<name>/`: `vertical.yaml`, `CONSTITUTION.md`, `anti-slop/`, `validators/`, `skills/`, `references/`, `gates/`.
- **Слой 5 — Оркестрация (CEO-агент).** Классификация задач, композиции, параллельное выполнение, сборка результатов.

### 3.3. Поток данных

```text
1. Клиент отправляет запрос → API Gateway (или CLI).
2. Gateway аутентифицирует и маршрутизирует:
   ├─ Простая задача → Студия напрямую (один run цикла)
   └─ Сложная задача → CEO-агент → Композиция → Студии (DAG)
3. VerticalLoader читает vertical.yaml + CONSTITUTION.md + anti-slop/.
4. buildRunnerFromConfig собирает раннер (generator + validator + contextBuilder).
5. UniversalLoopRunner запускает цикл:
   - context-builder собирает контекст из архива (mechanics, gates, skills, references, motion, dossier);
   - generator генерирует артефакт;
   - validator прогоняет детерминированные проверки вертикали;
   - при провале — фидбек «ПРЕДЫДУЩАЯ ПОПЫТКА ПРОВАЛЕНА» возвращается в задачу;
   - цикл повторяется до ok:true либо исчерпания max_iterations.
6. Результат сохраняется (workspace/loop-result.json) и возвращается клиенту.
```

---

## 4. ЯДРО (KERNEL)

Ядро уже существует как `core/loop-engine/` этого репозитория. Ниже — его контракты и то,
что требуется достроить. **Правило неизменности:** сигнатуры существующих классов не меняются;
расширение — только новыми модулями.

### 4.1. Управление состоянием (State Management)

Состояние одного прогона — `LoopState`. Персистится в файловую систему (zero-dep, без БД).

```js
// core/loop-engine/base.mjs
LoopState = {
  iteration,          // номер текущей итерации
  temperature,        // текущая температура (ставит раннер по расписанию)
  history,            // история провалов (глубина history_window)
  taskInput,          // исходный бриф/задача
  studioRoot,         // корень студии
  projectName,        // имя проекта
  workspaceDir,       // каталог записи (только внутри проекта)
  budgetUsed,         // { iterations, tokens, costUsd, elapsedMs }
}
```

**Хранение и чекпоинты:**
- `workspace/iterations/iter-NN/{artifact.txt,feedback.json}` — evidence итерации (`persist_iterations: true`).
- `workspace/loop-result.json` — итог прогона (`LoopResult`).
- `resume`: повторный запуск с тем же `projectDir` подхватывает последнюю итерацию и продолжает с `iteration + 1`.

**Требования:** сериализация только в JSON (allowlist полей); запись только внутри проекта
(`safeResolveInside`, `E-PATH` при выходе за пределы).

> В v2.0 состояние хранилось в PostgreSQL + LangGraph-чекпоинтах. В Node-версии БД не требуется:
> файлы + детерминированные имена дают тот же `resume` без внешнего сервиса.

### 4.2. Граф выполнения (контракт цикла)

Вместо LangGraph — универсальный раннер. «Узлы» реализуются функциями/классами:

| Узел | Тип | Реализация |
|---|---|---|
| `initialize` | System | `StudioContextBuilder.build()` — чтение архива студии |
| `planner` | LLM | генератор с промптом-планировщиком (или планировщик композиции) |
| `executor` (Coder) | LLM/Tool | `Generator.generate()` |
| `verifier` | **Детерминированный** | `Validator.validate()` (`validate.mjs` + линтеры + schema) |
| `fixer` | LLM | тот же генератор, но контекст содержит блок провала |
| `human_review` | HITL | `LoopResult{ok:false}` при исчерпании итераций + запись в `REVIEW.md` |
| `packager` | System | `saveResult()` / `writeArtifact()` |

**Логика переходов:**

```text
executor → verifier
verifier → packager       (если feedback.ok === true)
verifier → fixer          (если есть ошибки и iteration < max_iterations)
verifier → human_review   (если iteration >= max_iterations)
fixer → verifier
```

**Условная маршрутизация (фактическая сигнатура раннера, `runner.mjs` — уже реализовано):**

```js
while (state.iteration < config.max_iterations) {
  const artifact = await generator.generate(context, state);
  const feedback = await validator.validate(artifact, state);
  if (feedback.ok) return result({ ok: true, artifact, feedback, state });
  state.history.push(feedback);
  state.iteration++;
  state.temperature = temperatureForIteration(state.iteration, config.temperature_schedule);
}
return result({ ok: false }); // human_review
```

### 4.3. LLM Manager

**Реализация:** `core/loop-engine/generators/llm.mjs` (`LlmGenerator`) через встроенный `fetch`.

**Требования:**
- Провайдеры: OpenAI-совместимый (`openai`), Anthropic (`anthropic`), локальные (Ollama/vLLM через `base_url`).
- Модельные алиасы «роль → модель» — на уровне `vertical.yaml`/`skill.yaml` (§8, §11).
- Трекинг стоимости и токенов (`BudgetManager`, §4.5).
- Ретраи с exponential backoff (`1с, 2с, 4с`) + учёт заголовка `retry-after` (реализовано).
- Кэш повторяющихся запросов (по хэшу промпта).
- Ключи — **только из переменных окружения** (`api_key_env`), не логируются.

```yaml
llm:
  model_aliases:
    planner:      "ollama/llama3.1:8b"
    coder:        "ollama/qwen2.5-coder:7b"
    verifier_llm: "ollama/gemma2:9b"
    fixer:        "ollama/llama3.1:8b"
    embedding:    "ollama/nomic-embed-text"
  temperature: { planner: 0.3, coder: 0.7, verifier: 0.0, fixer: 0.3 }
  max_retries: 3
  base_url: "http://localhost:11434/v1"   # Ollama OpenAI-совместимый эндпоинт
```

```js
/** @typedef {{text:string, tokens:{prompt:number,completion:number}, model:string}} CompletionResponse */
class ILLMClient {                                   // Protocol
  async complete(messages, model, temperature, maxTokens) {} // → CompletionResponse
  async embed(text, model) {}                                // → number[]
}
```

### 4.4. Sandbox Manager

**Реализация:** `core/loop-engine/subprocess.mjs` (`runCommand`: `shell:false`, массив аргументов,
timeout + SIGKILL, усечение вывода) + опциональный Docker-провайдер.

**Требования:** провайдеры `local` (по умолчанию), `docker`, `e2b`; таймауты и квоты (CPU/RAM/время);
очистка ресурсов; запрет сети наружу (allowlist) для `docker`; инъекция команд исключена.

```js
/** @typedef {{success:boolean, stdout:string, stderr:string, exitCode:number, executionTime:number, memoryUsedMb:number}} ExecutionResult */
class ISandbox { async execute(code, language, timeout = 30, env = null) {} } // → ExecutionResult
```

```yaml
sandbox:
  provider: "docker"          # local | docker | e2b
  default_template: "node-20" # см. §14.2
  timeout: 300
  max_concurrent: 10
```

### 4.5. Budget Manager

**Реализация:** `core/budget/manager.mjs` (новый модуль ядра; расширяет бюджеты раннера).

**Требования:** лимиты на run / день / токены-в-минуту / итерации; алерт при 80%;
пауза при превышении (`LoopResult{ok:false, reason:"E-BUDGET"}`).

```yaml
budget:
  max_cost_usd_per_day: 20.0
  max_cost_usd_per_run: 2.0
  max_tokens_per_minute: 400000
  max_iterations_per_run: 10
  alert_threshold: 0.8
  alert_webhook_url: "${ALERT_WEBHOOK_URL}"
```

```js
class BudgetManager {
  async checkBudget(runId, estimatedCost) {}   // → boolean
  async recordCost(runId, cost, tokens) {}
  async getUsageReport(days) {}                 // → CostReport
  async isRunExceeded(runId) {}                 // → boolean
}
```

### 4.6. Skills Engine

**Реализация:** `core/loop-engine/template.mjs` (рендерер `{{ }}`, `{% if %}`, `{% for %}`, `{# #}`,
`{var}`; неизвестное не роняет сборку) + загрузчик скиллов.

**Требования:** скилл — директория `skill.yaml` + `templates/` + опционально `hooks/`; хуки
`pre_execute`/`post_execute` — **ESM-модули** (`export default async function(ctx){}`), а не Python;
рендер идёт по контексту `StudioContextBuilder`.

### 4.7. Knowledge Base (RAG)

**Реализация:** `core/knowledge/` (новый модуль).

**Требования:** база — индекс референсов вертикали `references/INDEX.md` → JSON
(`id, style, source, takeaway, techniques`); поиск по умолчанию лексический (BM25-подобный, zero-dep),
опционально векторный через `embed`; индексатор `scripts/index_references.mjs` строит
`references/.index.json`; Qdrant — **опциональный** провайдер (`knowledge.provider: "qdrant"`).

```js
class KnowledgeRetriever {
  async search(query, { topK = 5, filters = {} }) {} // → Array<ReferenceMeta>
  async index(collection) {}
}
```

### 4.8. Observability

**Реализация:** `core/loop-engine/logger.mjs` (структурный логгер, stderr,
`LOOP_ENGINE_LOG=debug|info|warn|error|silent`) + `core/observability/metrics.mjs` (новый).

```js
// core/observability/metrics.mjs — экспорт через GET /metrics
RUN_DURATION        // histogram: ['vertical','skill','status']
RUN_ITERATIONS      // histogram: ['vertical','skill']
VALIDATION_ERRORS   // counter:   ['vertical','error_code']
BUDGET_USED         // gauge:     ['vertical','run_id']
TOKENS_USED         // counter:   ['model','role']
LLM_LATENCY         // histogram: ['model','role']
SANDBOX_TIME        // histogram: ['provider','language']
BUNDLE_SIZE         // gauge:     ['vertical','skill']
VIEWPORT_FAILURES   // counter:   ['vertical','viewport']
PLATFORM_VIOLATIONS // counter:   ['platform','rule']
```

```js
import { createLogger } from "./core/loop-engine/logger.mjs";
const log = createLogger({ level: process.env.LOOP_ENGINE_LOG ?? "info" });
log.info("run.started", { runId, vertical, skill });
```

**Трейсинг.** События прохождения по «узлам» пишутся в `workspace/trace.jsonl`
(`{ts, runId, node, iteration, durationMs, ok}`). OTel-экспорт — опционален, по умолчанию выключен.

### 4.9. API Gateway и CLI

**Реализация:** `core/api/` (`node:http`, без фреймворка) + существующий `core/loop-engine/cli.mjs`.

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/health` | liveness/readiness |
| `GET` | `/metrics` | метрики в формате Prometheus |
| `POST` | `/v1/generate` | запуск задачи вертикали (`vertical`, `skill`, `input`, `idempotency_key`) |
| `GET` | `/v1/runs/{id}` | статус run + `loop-result.json` |
| `GET` | `/v1/verticals` | список вертикалей и скиллов |
| `POST` | `/v1/compositions/{name}` | запуск композиции |

**Требования:** роли `viewer`/`developer`/`admin`; rate limiting; идемпотентность по `idempotency_key`;
запуск run в фоне (очередь в памяти процесса; внешняя очередь — опциональна).

```bash
node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project
node core/loop-engine/cli.mjs projects/<имя> --provider ollama --model qwen2.5-coder:7b
node core/loop-engine/gate.mjs                 # гейт К-21 по всем проектам
```

---

## 5. ПРОТОКОЛЫ ВЗАИМОДЕЙСТВИЯ

Ядро не знает о внутренней кухне студии. Взаимодействие — через строгие контракты
(структурная типизация; наследование не требуется).

### 5.1. Интерфейс Вертикали (`IVertical`)

```js
class IVertical {
  name; description;
  getSkills() {}                          // → string[]
  getTools() {}                           // → Function[]
  getVerificationGates() {}               // → Record<string, IVerificationGate>
  loadReferences(query) {}                // → ReferenceMeta[]
  getDefaultSkill() {}                    // → string
  async run(skillName, brief, context) {} // → Artifact
}
```

### 5.2. Интерфейс Валидационного Гейта (`IVerificationGate`)

```js
/**
 * @typedef {Object} ValidationError
 * @property {string} code                       // V-01, B-02, Q-01, E-…
 * @property {'critical'|'major'|'minor'} severity
 * @property {string} description
 * @property {?string} location
 * @property {string} suggestion
 * @property {?string} fixExample
 */
/**
 * @typedef {Object} VerificationResult
 * @property {boolean} passed
 * @property {ValidationError[]} errors
 * @property {ValidationError[]} warnings
 * @property {Object} metrics
 */
class IVerificationGate {
  name;
  async verify(artifact, context) {} // → VerificationResult
}
```

**Важно:** `verify` максимально быстрый и детерминированный. LLM-критика допускается только как
один из гейтов (`llm_judge`), но не как единственный.

### 5.3. Интерфейс Инструмента (`ITool`)

```js
class ITool { name; description; async execute(kwargs) {} } // → any
```

### 5.4. Контракты цикла (существующие, `base.mjs`)

```js
// Generator / Validator / ContextBuilder
generate(context: string, state: LoopState) → Artifact | Promise<Artifact>
validate(artifact: Artifact, state: LoopState) → Feedback | Promise<Feedback>
build(task: string, state: LoopState, studioRoot: string) → string

Artifact   = { content: string | Record<string,string>, metadata: {} }
Feedback   = { ok: boolean, errors: string[], codes: string[], raw: any, metrics: {} }
LoopResult = { ok, artifact, feedback, state, iterations, successIteration, elapsedMs, reason }
```

---

## 6. СТАНДАРТ КОДОВ ОШИБОК

### 6.1. Префиксы и области видимости

| Префикс | Категория | Область | Пример |
|---|---|---|---|
| **V-xx** | Конституция | локальная (внутри вертикали) | `V-01` — нарушение К-01 |
| **B-xx** | Anti-slop (Banned) | локальная | `B-03` — запрещённый паттерн |
| **Q-xx** | Anti-slop (Quotas) | локальная | `Q-02` — превышение квоты |
| **C-xx** | Чек-лист гейта | локальная | `C-01` — пункт чек-листа не выполнен |
| **M-xx** | Маркетинг/редполитика | платформенная (web) | `M-01` — нет UVP в MARKETING.md |
| **E-xx** | Движок/рантайм | **глобальная** | `E-PATH`, `E-SCHEMA`, `E-TIMEOUT` |
| **S-xx** | Sandbox / Code | глобальная | `S-01` — код не компилируется |
| **A-xx** | Артефакт | локальная | `A-01` — артефакт не прошёл валидацию |
| **R-xx** | Отклонение | локальная | `R-01` — проект отклонён арт-директором |
| **L-xx** | Цикл | глобальная | `L-01` — превышен лимит итераций |
| **J-xx** | LLM Judge | глобальная | `J-01` — LLM не вернул валидный JSON |

**Уточнение (устраняет конфликт нумерации из v2.0):** коды `V-`, `B-`, `Q-`, `C-`, `A-`, `R-`
**локальны для вертикали** — у каждой студии свой отсчёт от 01. Коды `E-`, `S-`, `L-`, `J-`, `M-`
**общие по платформе**. Поэтому «`Q-01` = размер JS-бандла» (Mini Apps) и «`Q-01` = 1–3 motion-рецепта»
(Web) — не противоречие, а разные пространства имён. Коды `V-` и `Q-` ортогональны и не пересекаются:
конституция — это `V-`, квоты anti-slop — это `Q-` (в v2.0 они смешивались).

### 6.2. Коды движка (`E-`), фактически используемые

`E-PATH`, `E-WRITE-GUARD`, `E-CHECK-RUN`, `E-CTX`, `E-GEN-KEY|NET|TIMEOUT|PARSE`, `E-VAL`,
`E-SCHEMA`, `E-SCHEMA-PARSE`, `E-SYN`, `E-TEST`, `E-RUN`, `E-NO-TESTS`, `E-TIMEOUT`,
`E-PY-*`, `E-CONFIG-*` (в т. ч. `E-CONFIG-GRAPH` — цикл в графе композиции), `E-BUDGET`,
`E-LOOP-EXHAUSTED`, `E-COMPOSITION-*` (агрегация/маршрутизация CEO-агента, §13).

**Про `J-xx` и `L-xx`.** Зарезервированные префиксы для читаемости отчётов: `J-xx` — вердикт
LLM-judge, `L-xx` — события цикла. Движок фактически эмитит их с явными именами
(`E-JUDGE-SCORE|PARSE|SCHEMA`, `L-xx` в stdout); при разборе отчёта коды `J-xx`/`E-JUDGE-*`
считать эквивалентными.

### 6.3. Структура фидбека для агента

```json
{
  "passed": false,
  "errors": [
    {
      "code": "V-02",
      "severity": "critical",
      "description": "Контраст текста ниже 4.5:1",
      "location": "css: .hero-text",
      "suggestion": "Увеличьте контраст текста до 4.5:1",
      "fix_example": "color: #000000; background: #ffffff;"
    }
  ],
  "iterations_used": 3,
  "budget_used_usd": 0.45
}
```

---

## 7. СТРУКТУРА СТУДИИ (ВЕРТИКАЛИ)

### 7.1. Канонический скелет вертикали

Каждая студия — самодостаточная директория `verticals/{name}/`:

```text
verticals/{vertical_name}/
├── vertical.yaml              # метаданные, скиллы, модели, бюджет (§8)
├── CONSTITUTION.md            # проверяемые правила (К-01…К-N)
├── AGENTS.md                  # контракт агентов (роли, регламент цикла)
├── BRIEF-TEMPLATE.md          # шаблон брифа для клиентов
├── README.md
├── registry.mjs               # экспорт IVertical-объекта (мост между ядром и студией)
│
├── skills/                    # скиллы студии (skill.yaml + templates/ + hooks/)
│   └── {skill_name}/
│       ├── skill.yaml
│       ├── templates/         # Jinja-подобные: planner.j2, coder.j2, verifier.j2, fixer.j2
│       └── hooks/             # pre_execute.mjs, post_execute.mjs (ESM, не Python)
│
├── validators/                # детерминированные + LLM валидаторы (ESM)
│   ├── constitution.mjs
│   ├── anti-slop.mjs
│   ├── schema.mjs
│   └── llm-judge.mjs
│
├── anti-slop/
│   ├── BANNED.md              # запрещённые паттерны (B-xx)
│   └── QUOTAS.md              # количественные лимиты (Q-xx)
│
├── references/                # база референсов
│   ├── INDEX.md
│   ├── sources.yaml
│   ├── screenshots/
│   └── metadata/              # YAML-метаданные каждого референса (takeaway обязателен)
│
├── gates/                     # G1–G4 (вход, чек-лист, артефакт, отказ)
├── tools/
├── scripts/                   # validate.mjs, lint-slop.mjs, lint-*.mjs
├── projects/                  # артефакты выполненных проектов
└── tests/
```

### 7.2. Эталонная реализация (этот репозиторий)

Репозиторий `ceh-veb` уже содержит **и веб-вертикаль, и ядро**:

- `core/loop-engine/` → **ядро** (`UniversalLoopRunner`, `gate.mjs`, `cli.mjs`, генераторы, валидаторы).
- корень (`CONSTITUTION.md`, `references/`, `skills/`, `motion/`, `anti-slop/`, `gates/`, `scripts/`, `projects/`) → **`verticals/web_studio`**.

**Канонической раскладкой метаплатформы считается разделение:** `core/` (ядро) + `verticals/<name>/`
(студии). Текущий корневой ЦЕХ остаётся рабочим как `verticals/web_studio` (эталон): веб-конституция
из него (§9.1), anti-slop (§10.1), 16 скиллов и 7 референсов переносятся 1:1. Миграция — механическая
(`git mv`), поведение не меняется, т.к. ядро уже лежит в `core/`.

### 7.3. Дерево метаплатформы

```text
autogen-platform/
├── TECHNICAL_SPECIFICATION.md      # этот документ (источник истины)
├── AGENT_PROMPT.md                 # промпт агента-разработчика
├── README.md · package.json
├── core/                           # ЯДРО (Node ≥18, zero-dep)
│   ├── loop-engine/                #   ★ существует (этот репозиторий)
│   ├── api/                        #   node:http API Gateway
│   ├── budget/                     #   BudgetManager
│   ├── knowledge/                  #   RAG (local / Qdrant*)
│   ├── observability/              #   метрики, трейсы
│   └── orchestrator/               #   CEO-агент, DAG-планировщик
├── verticals/                      # 6 СТУДИЙ (по скелету §7.1)
│   ├── web_studio/                 #   эталон = корень ceh-veb
│   ├── content_studio/  data_analytics/  education/  mini_apps/
│   └── mobile_apps/
├── compositions/                   # *.yaml — сложные задачи (§13)
├── configs/                        # references_sources.yaml, llm.yaml, sandbox_templates.yaml, device-matrix
├── scripts/                        # scrape_references.mjs, index_references.mjs, acceptance_test.sh, deploy.sh
├── cli/                            # autogen CLI (main.mjs, references_cli.mjs)
├── tests/                          # kernel/, verticals/, orchestrator/, e2e/
└── docs/                           # ARCHITECTURE.md, API.md, DEPLOY.md, USER_GUIDE.md
```

`*` Qdrant опционален; по умолчанию — локальный индекс (§12).

---

## 8. ДЕКЛАРАТИВНОЕ ОПИСАНИЕ СТУДИИ (`vertical.yaml`)

```yaml
apiVersion: autogen/v1
kind: Vertical

metadata:
  name: mini_apps
  displayName: "Mini Apps Studio"
  description: "Telegram / VK Mini Apps: магазины, боты, игры, сервисы"
  version: "1.0.0"
  domain: mini_apps          # web | content | data | education | mini_apps | mobile_apps
  tags: [telegram, vk, miniapp]

spec:
  skills: [telegram_shop, telegram_bot_ui, telegram_game, telegram_service, vk_miniapp]
  validators: [constitution, anti_slop, schema, telegram_sdk_check, llm_judge]
  gates: [G1-direction, G2-structure, G3-artifact, G4-final]
  tools: [validate_telegram_sdk, test_on_viewports, check_theme_params]
  registry: "registry.mjs"   # путь к IVertical-экспорту

  models:
    planner:      "ollama/llama3.1:8b"
    coder:        "ollama/qwen2.5-coder:7b"
    verifier_llm: "ollama/gemma2:9b"
    fixer:        "ollama/llama3.1:8b"

  budget:
    max_cost_usd_per_run: 1.5
    max_iterations: 10
    max_tokens_per_run: 120000

  knowledge:
    provider: local          # local | qdrant
    rag_collections:
      - name: mini_apps_references
        source: "verticals/mini_apps/references"

  anti_slop:
    banned_file: "anti-slop/BANNED.md"
    quotas_file: "anti-slop/QUOTAS.md"
```

**Соответствие конфигу раннера.** Из `vertical.yaml` собирается `loop.config.yaml` проекта:
`spec.models.*` → `generator.model` по роли, `spec.budget.*` → секция `loop`,
`spec.validators` → `validator.type` (+ кастомные гейты через `registry.mjs`).

---

## 9. КОНСТИТУЦИИ 6 ДОМЕНОВ (ПОЛНЫЕ ТЕКСТЫ)

> В v2.0 конституции 5 базовых студий были помечены как «полный текст сохранён из предыдущего ТЗ»
> и в документе отсутствовали. Здесь они раскрыты полностью. Коды `V-xx` в каждом разделе
> локальны для своей вертикали (§6.1).

### 9.1. Web Studio — К-01…К-24

*Источник: рабочий `CONSTITUTION.md` репозитория `ceh-veb` (переносится дословно).*

**К-01.** Код не пишется до `DIRECTION.md`, принятого на G1. *Проверка:* валидатор (V-01, V-07).
**К-02.** Каждая ключевая секция сайта имеет строку «решение → источник» в `SOURCES.md`. *Проверка:* валидатор (V-02, V-03).
**К-03.** Оси SEED отражены в DIRECTION; два проекта подряд с совпавшими осями запрещены. *Проверка:* валидатор (V-07, V-09).
**К-04.** Каждый визуальный приём имеет источник в `references/` или `skills/`; приём без источника — слоп. *Проверка:* V-10 + вердикт арт-директора.
**К-05.** Easing — только из `motion/easing-curves.json`; браузерные дефолты запрещены. *Проверка:* V-06.
**К-06.** 1–3 motion-рецепта на страницу; конфликты из `dont_combine_with` не допускаются. *Проверка:* V-05.
**К-07.** Шрифты — только из `assets/fonts/PAIRS.md`, пара display + body с ролями. *Проверка:* Q-06 + арт-директор.
**К-08.** Минимум одна текстура из `assets/textures/` на проект. *Проверка:* Q-05.
**К-09.** Проект не принимается без зелёного `validate.mjs` и `REVIEW.md` с вердиктом. *Проверка:* V-04, V-08.
**К-10.** Возврат с ворот — точечные правки по пунктам REVIEW, не перезапуск проекта. *Проверка:* регламент (арт-директор).
**К-11.** Удачное из проекта возвращается в архив: приём → `references/`, скил → `skills/`, рецепт → `motion/`. *Проверка:* приёмка (куратор).
**К-12.** Мобильная адаптация — архитектурный принцип: нет горизонтального скролла с 320px, тап-зоны ≥44px, инпуты ≥16px, safe-area учтена. *Проверка:* mobile-аудит + sweep 22 вьюпорта.
**К-13.** SEO вшивается до кода: без `page_seo_manifest`, JSON-LD по типу и ≥2 внутренних ссылок страница не создаётся. Title 50–60, description 120–158. *Проверка:* V-13 + seo-gate.
**К-14.** Дизайн собирается геном-генератором: seed воспроизводим, цвет вне AI-диапазона 220–260°, комбинация проверяется на уникальность против реестра. *Проверка:* геном-станок + реестр отпечатков.
**К-15.** Ошибки ловятся на самом дешёвом слое (IDE → pre-commit → CI → runtime); PR не мержится без зелёного CI, секреты и битые ссылки блокируют гейт. *Проверка:* qa-fortress + CI-гейты.
**К-16.** Маркетинговая воронка и оффер проектируются до верстки: `MARKETING.md` с UVP, JTBD и картой CTA; каждая кнопка имеет `data-analytics-event`. *Проверка:* `lint-marketing.mjs` (M-01, M-02).
**К-17.** Редполитика и чистый копирайтинг: запрещены штампы (B-17) и бессодержательные CTA (B-18); текст типографируется без висячих предлогов (B-23). *Проверка:* `lint-copy.mjs` + `typographer.mjs`.
**К-18.** Продуктовая полнота UX и доступность: все интерактивные компоненты имеют 5 состояний (Ideal, Empty, Loading, Partial, Error); контраст текста ≥ 4.5:1 (WCAG AA). *Проверка:* `A11yContrastValidator` + `lint-contrast`.
**К-19.** Программируемое кодовое видео должно быть детерминированным (Time Virtualization), использовать зарегистрированные рецепты движения (К-05) и поддерживать `prefers-reduced-motion`. *Проверка:* `lint-video-engine.mjs`.
**К-20.** Senior-архитектура графики и адаптивности: цвета в OKLCH (CSS Color Level 5) с `@layer`, адаптация через Container Queries (`cqw`), ресурсы под бюджетом Q-10 и SRI sha384. *Проверка:* V-16 Senior-аудит.
**К-21.** Закон исполняется циклом, а не памятью агента: итерации «сборка → ворота» гоняются универсальным циклом (`core/loop-engine/`), который собирает контекст из архива, исполняет валидаторы и возвращает коды обратно в задачу. Проект не сдаётся без `exit 0` и сохранённого evidence. *Проверка:* `workspace/loop-result.json` · `exit 0`.
**К-22.** SEO-гигиена страниц: title 50–60, description 120–158, canonical/og:url без `.html`, `og:image` абсолютным URL, JSON-LD (тип Schema.org), один H1, контент ≥ 300 слов. *Проверка:* seo-audit.mjs (V-18).
**К-23.** Типографические минимумы: базовый кегль html/body ≥ 16px, интерлиньяж body ≥ 1.4, контентные теги ≥ 14px (шапки таблиц и псевдо-подписи ≥ 11px). *Проверка:* lint-typography.mjs (V-19).
**К-24.** Перфоманс-бюджеты: `<img>` с width/height, lazy вне первого экрана, `font-display: swap`, запрет `document.write()`. *Проверка:* lint-performance.mjs (V-20).

*Гейты web:* G1 Направление → G2 Структура → G3 Motion/Артефакт → G4 Финал (§15.3).

---

### 9.2. Legal Docs Studio — К-01…К-15

**Продукты:** договоры, оферты, NDA, согласия на ПДн, пользовательские соглашения.
**Дисклеймер:** результаты — не юридическая консультация; для критических документов обязателен HITL.

**К-01.** Определён тип документа и стороны с полными реквизитами. *Проверка:* schema-валидатор (V-01).
**К-02.** Присутствуют все существенные условия предмета (для договора — по ГК РФ). *Проверка:* `constitution_validator` (V-02).
**К-03.** Ссылки на нормы ГК РФ корректны и актуальны. *Проверка:* LLM-judge + RAG по `consultant.ru`/`garant.ru` (V-03).
**К-04.** Нет внутренних противоречий: пункты не отменяют друг друга (cross-reference). *Проверка:* детерминированный линтер нумерации (V-04).
**К-05.** Реквизиты (ИНН/ОГРН/КПП/БИК/р/с) валидны по контрольным суммам. *Проверка:* скрипт (V-05).
**К-06.** Ясность формулировок: нет двусмысленностей, предложения ≤ 40 слов. *Проверка:* readability-линтер (V-06).
**К-07.** Обработка ПДн соответствует 152-ФЗ (цели, срок, согласие). *Проверка:* чек-лист ПДн (V-07).
**К-08.** Определены ответственность сторон и порядок разрешения споров (претензия, суд). *Проверка:* валидатор условий (V-08).
**К-09.** Определён порядок изменения и расторжения. *Проверка:* валидатор условий (V-09).
**К-10.** Документ версионирован: дата, место, номер редакции. *Проверка:* метаданные (V-10).
**К-11.** Нет неюридических оборотов и «воды». *Проверка:* `lint-copy` legal-профиль (V-11).
**К-12.** Сноски на НПА с указанием редакции/даты. *Проверка:* валидатор сносок (V-12).
**К-13.** Присутствует дисклеймер «не является юридической консультацией». *Проверка:* grep-валидатор (V-13).
**К-14.** Формальные атрибуты: нумерация пунктов, приложения, места подписей. *Проверка:* schema (V-14).
**К-15.** Критические документы помечены флагом HITL и не публикуются авто. *Проверка:* gate `human_review` (V-15).

*Гейты:* G1 Бриф/стороны → G2 Структура условий → G3 Документ → G4 Юр-ревью (HITL).

### 9.3. Content Studio — К-01…К-15

**Продукты:** SEO-статьи, описания товаров, email-цепочки, посты для каналов.

**К-01.** Уникальность текста > 90% (шингловый анализ). *Проверка:* `lint-unique.mjs` (V-01).
**К-02.** Плотность ключевого слова 1–3% без переспама. *Проверка:* счётчик вхождений (V-02).
**К-03.** Читаемость: адаптированный Flesch-Kincaid ≥ 60. *Проверка:* `lint-readability.mjs` (V-03).
**К-04.** Структура: ровно один H1, корректная иерархия H2/H3. *Проверка:* HTML/MD-линтер (V-04).
**К-05.** Мета: title 50–60, description 120–158 символов. *Проверка:* `seo-gate` (V-05).
**К-06.** ≥2 внутренних ссылок + авторитетные внешние. *Проверка:* линк-аудит (V-06).
**К-07.** Нет штампов и воды (B-xx). *Проверка:* `lint-copy` (V-07).
**К-08.** Факты и цифры снабжены источником/сноской. *Проверка:* `lint-facts.mjs` (V-08).
**К-09.** Tone of voice из брифа соблюдён (проверка по ключевым маркерам). *Проверка:* LLM-judge (V-09).
**К-10.** Атрибуция/авторство (E-E-A-T) указано. *Проверка:* метаданные (V-10).
**К-11.** Изображения с `alt` и оптимизированным форматом. *Проверка:* линтер ассетов (V-11).
**К-12.** JSON-LD соответствует типу контента (Article/Product/FAQ). *Проверка:* schema-валидатор (V-12).
**К-13.** Редполитика: типографика, тире, кавычки, без висячих предлогов. *Проверка:* `typographer.mjs` (V-13).
**К-14.** CTA имеют `data-analytics-event`. *Проверка:* `lint-marketing` (V-14).
**К-15.** Нет однообразных AI-паттернов («важно отметить», «в современном мире»). *Проверка:* `lint-copy` AI-профиль (V-15).

*Гейты:* G1 Бриф/семантика → G2 Структура/ключи → G3 Текст → G4 Редполитика.

---

### 9.4. Data Analytics Studio — К-01…К-15

**Продукты:** SQL-запросы, Python-скрипты, отчёты, дашборды.

**К-01.** SQL/Python синтаксически валиден. *Проверка:* парсер SQL + `python -m py_compile` в песочнице (V-01).
**К-02.** Нет `SELECT *` в продакшн-запросах (перечисляй колонки). *Проверка:* regex-линтер (V-02).
**К-03.** `JOIN` вместо коррелированных подзапросов там, где это возможно. *Проверка:* анализ плана/эвристика (V-03).
**К-04.** Выполнен `EXPLAIN ANALYZE`; нет `Seq Scan` по большим таблицам. *Проверка:* песочница + парсер плана (V-04).
**К-05.** Обработаны ошибки и пустой результат. *Проверка:* наличие `try/except`/`try/catch` (V-05).
**К-06.** Документация: docstring/комментарии с назначением. *Проверка:* AST-линтер (V-06).
**К-07.** Воспроизводимость: параметризация, фиксированный seed, pinned версии. *Проверка:* чек-лист (V-07).
**К-08.** Параметризация против SQL-инъекций (нет f-string в запросах). *Проверка:* regex-линтер (V-08).
**К-09.** Идемпотентность ETL-скриптов (повторный запуск не дублирует данные). *Проверка:* анализ ключей/upsert (V-09).
**К-10.** Входные данные валидируются по схеме. *Проверка:* schema-валидатор (V-10).
**К-11.** Метрики качества данных: nulls, дубликаты, типы. *Проверка:* профилировщик (V-11).
**К-12.** Контроль стоимости/сканирования: партиции, `LIMIT`, фильтры. *Проверка:* оценка плана (V-12).
**К-13.** Время выполнения укладывается в бюджет песочницы. *Проверка:* замер времени (V-13).
**К-14.** PII маскируется/хешируется. *Проверка:* regex по чувствительным полям (V-14).
**К-15.** Результаты воспроизводимы на тестовом наборе. *Проверка:* прогон в песочнице (V-15).

*Гейты:* G1 Бриф/источники данных → G2 Схема/план → G3 Запрос/скрипт → G4 Воспроизводимость.

### 9.5. Education Studio — К-01…К-15

**Продукты:** уроки, курсы, тесты, онбординг.

**К-01.** Цели обучения сформулированы в терминах таксономии Блума. *Проверка:* taxonomy-валидатор (V-01).
**К-02.** Прогрессия сложности от простого к сложному. *Проверка:* граф зависимостей урока (V-02).
**К-03.** Возрастная адекватность лексики и примеров. *Проверка:* readability + LLM-judge (V-03).
**К-04.** Каждый урок содержит цель, теорию, практику, итог. *Проверка:* schema структуры (V-04).
**К-05.** Минимум один интерактив на 10 минут материала. *Проверка:* счётчик интерактивов (V-05).
**К-06.** Формативная оценка (проверка понимания) после каждого блока. *Проверка:* чек-лист (V-06).
**К-07.** Тесты: валидные дистракторы, один правильный ответ, объяснение. *Проверка:* quiz-валидатор (V-07).
**К-08.** Соответствие учебному плану/стандарту. *Проверка:* маппинг целей на план (V-08).
**К-09.** Доступность: контраст, `alt`, субтитры к видео. *Проверка:* a11y-линтер (V-09).
**К-10.** Термины и единицы определены при первом использовании. *Проверка:* glossary-линтер (V-10).
**К-11.** Оценка времени прохождения реалистична. *Проверка:* калькулятор нагрузки (V-11).
**К-12.** Источники и ссылки на материалы указаны. *Проверка:* линк-аудит (V-12).
**К-13.** Есть обратная связь и разбор ошибок. *Проверка:* наличие feedback-блока (V-13).
**К-14.** Мультимодальность: текст + визуал + практика. *Проверка:* чек-лист (V-14).
**К-15.** Итоговая аттестация измеряет заявленные цели (К-01). *Проверка:* coverage-карта (V-15).

*Гейты:* G1 Бриф/цели → G2 План/прогрессия → G3 Материал → G4 Оценка.

---

### 9.6. Mini Apps Studio (Telegram / VK Mini Apps) — К-01…К-21

**Продукты:** магазины внутри Telegram, сервисы записи, мини-игры, дашборды.
**Стек:** React/Vue + Telegram WebApp SDK / VK Bridge.

**К-01.** Адаптация под viewport Telegram: корректный рендер на 320px, 375px, 420px без горизонтального скролла. *Проверка:* Playwright, 3 viewport'а + скриншоты (V-01).
**К-02.** Нативная интеграция SDK: `MainButton`, `BackButton`, `HapticFeedback` вместо кастомных кнопок внизу. *Проверка:* статический анализ JS (V-02).
**К-03.** Поддержка тем Telegram через `theme_params` / CSS-переменные. *Проверка:* наличие `var(--tg-theme-*)` (V-03).
**К-04.** TTI < 2 c на 3G. *Проверка:* Lighthouse Mobile + throttling (V-04).
**К-05.** Safe area для клавиатуры: поля не перекрываются. *Проверка:* `env(safe-area-inset-bottom)` (V-05).
**К-06.** Обработка `viewportChanged` (клавиатура/высота). *Проверка:* подписка на событие (V-06).
**К-07.** Оплата — через Telegram Payments (`openInvoice`/`sendData`), не внешние ссылки. *Проверка:* наличие вызовов (V-07).
**К-08.** JS-бандл < 300KB gzipped. *Проверка:* bundle-analyzer (V-08).
**К-09.** Корректная навигация через `BackButton` и обработка `web_app_data`. *Проверка:* обработчики `BackButton.onClick` (V-09).
**К-10.** Все ссылки открываются внутри WebView или через `openLink` (нет `target="_blank"` без SDK). *Проверка:* regex + скан DOM (V-10).
**К-11.** Тач-таргеты ≥ 44×44px. *Проверка:* статический анализ CSS (V-11).
**К-12.** Базовый offline через Service Worker. *Проверка:* Lighthouse PWA (V-12).
**К-13.** При закрытии состояние сохраняется через `sendData`/`mainButtonClicked`. *Проверка:* наличие обработчика (V-13).
**К-14.** Запрещены `alert()`, `confirm()`, `prompt()` — только нативные popup Telegram. *Проверка:* regex (V-14).
**К-15.** Бэкенд валидирует `initData` через HMAC-SHA256. *Проверка:* наличие проверки подписи (V-15).
**К-16.** Для VK — обязателен `vk-bridge` для всех API-вызовов. *Проверка:* импорт `@vkontakte/vk-bridge` (V-16).
**К-17.** Тесты на реальных устройствах: iOS (Safari WebView) и Android (Chrome WebView), 4 устройства. *Проверка:* скриншоты (V-17).
**К-18.** Нет утечек памяти при многократном открытии/закрытии (3 итерации). *Проверка:* Chrome DevTools Memory profiler (V-18).
**К-19.** Экран обрабатывает 4 состояния: загрузка (loading), пусто (empty), ошибка (error), успех (success); пустые и ошибочные состояния объясняют, что делать дальше. *Проверка:* ветки состояния в JS (V-19); тексты состояний — B-08/B-09 в lint-slop.
**К-20.** Микрокопи: кнопка — глагол действия и результат; ошибка рядом со следующим шагом; запрещены маркетинговые штампы и «нажмите сюда». *Проверка:* CTA-глагол + implies-правило ошибка→решение (V-20); штампы — B-06…B-09 в lint-slop.
**К-21.** Контраст текста к фону — не ниже 4.5:1 (WCAG 2.1 AA) на светлой и тёмной темах Telegram; пары темы выносятся в токены `app/theme.json`. *Проверка:* kind `themeContrast` — каждая пара `contrast` проходит порог (V-21), расчёт по WCAG 2.1.

*Гейты:* G1 Бриф/тип продукта → G2 Экраны/навигация → G3 Сборка/вьюпорты → G4 Устройства.

### 9.7. Mobile Apps Studio (React Native / Flutter / SwiftUI / Compose) — К-01…К-22

**Продукты:** MVP мобильных приложений, UI-киты, интерактивные прототипы.

**К-01.** Соответствие гайдлайнам платформы: iOS — Apple HIG, Android — Material Design 3. *Проверка:* LLM-критик + статический анализ (V-01).
**К-02.** Safe Area (notch / home indicator): `SafeAreaView` (RN) / `SafeArea` (Flutter) / `.safeAreaInset` (SwiftUI). *Проверка:* статический анализ (V-02).
**К-03.** Тач-таргеты: iOS ≥ 44×44 pt, Android ≥ 48×48 dp. *Проверка:* анализ стилей (V-03).
**К-04.** Каждый экран имеет 4 состояния: Loading, Empty, Error, Success. *Проверка:* наличие компонентов (V-04).
**К-05.** Поддержка тёмной темы (`Appearance` API / `useColorScheme`). *Проверка:* статический анализ (V-05).
**К-06.** FPS ≥ 55 на mid-range, запуск < 2 c. *Проверка:* Flipper / Flutter DevTools (V-06).
**К-07.** Offline-режим: кэш и очередь запросов. *Проверка:* `NetInfo` listener + локальное хранилище (V-07).
**К-08.** Нативные стеки навигации (React Navigation / `go_router` / `NavigationStack`). *Проверка:* отсутствие кастомных стеков без анимаций (V-08).
**К-09.** Клавиатура не перекрывает поля ввода (`KeyboardAvoidingView` / `Scaffold`). *Проверка:* статический анализ (V-09).
**К-10.** Адаптивный layout на планшетах (iPad / Android tablet). *Проверка:* скриншоты (V-10).
**К-11.** Accessibility: `accessibilityLabel` / `semanticLabel`. *Проверка:* статический анализ + Accessibility Inspector (V-11).
**К-12.** Разрешения запрашиваются в момент использования, а не на старте. *Проверка:* отсутствие запросов в `componentDidMount`/`initState` (V-12).
**К-13.** Обработка deep links (universal/app links). *Проверка:* `Info.plist` / `AndroidManifest.xml` (V-13).
**К-14.** Локализация минимум на 2 языка (en + ru) через i18n. *Проверка:* наличие `i18next`/`intl`/`Localizable.strings` (V-14).
**К-15.** Push-уведомления через FCM / APNs. *Проверка:* наличие `onMessage`-обработчика (V-15).
**К-16.** Единый стейт-менеджер (Redux / Zustand / Riverpod / Bloc). *Проверка:* отсутствие prop drilling > 3 уровней (V-16).
**К-17.** Все API-вызовы имеют retry-логику и user-friendly сообщения об ошибках. *Проверка:* `try-catch` с UI-фидбеком (V-17).
**К-18.** Тестирование на 5+ разрешениях (iPhone SE…Android 600dp). *Проверка:* скриншоты Detox/Appium (V-18).
**К-19.** Биометрия через нативные API (`react-native-biometrics` / `local_auth`). *Проверка:* статический анализ (V-19).
**К-20.** Готовность к сторам: иконка 1024×1024, скриншоты 6.5" + 5.5", описание. *Проверка:* наличие файлов в `assets/` (V-20).
**К-21.** Микрокопи: без маркетинговых штампов, ошибка рядом со следующим шагом, кнопки называют действие (не «нажмите сюда»). *Проверка:* скан `locales/ru.json` (V-21) + lint-slop B-07…B-10.
**К-22.** Контраст текста к фону — не ниже 4.5:1 (WCAG 2.1 AA) в светлой и тёмной темах; пары темы выносятся в токены `app/theme.json`. *Проверка:* kind `themeContrast` — каждая пара `contrast` проходит порог (V-22), расчёт по WCAG 2.1.

*Гейты:* G1 Бриф/категория → G2 Архитектура/экраны → G3 Сборка/TS → G4 Устройства/сторы.

---

## 10. ANTI-SLOP СИСТЕМА (BANNED + QUOTAS)

Каждая вертикаль держит свои `anti-slop/BANNED.md` (запреты `B-xx`) и `anti-slop/QUOTAS.md`
(лимиты `Q-xx`). Нумерация локальна для вертикали (§6.1). Метод проверки обязателен у каждого
запрета — иначе запрет не исполним.

### 10.1. Web Studio

**BANNED — 25 запретов** (`anti-slop/BANNED.md`):

| № | Запрет | Метод |
|---|---|---|
| B-01 | `transition: all` — перечислять свойства явно | grep |
| B-02 | Дефолтные easing (ease, ease-in-out, cubic-bezier(.4,0,.2,1), linear) | grep |
| B-03 | Hero «центр. заголовок + подзаголовок + две кнопки» | арт-директор |
| B-04 | Три одинаковые карточки в ряд | арт-директор |
| B-05 | Индиго/фиолетовые градиенты (#6366f1/#8b5cf6/#a855f7) | grep |
| B-06 | Градиентный текст (`background-clip: text`) | grep |
| B-07 | Глассморфизм как основной язык (`backdrop-filter`) | grep + арт-директор |
| B-08 | Единственный шрифт Inter / системный без пары | арт-директор |
| B-09 | `lorem ipsum` в макете | grep |
| B-10 | Скругления 16px на всех элементах подряд | grep + арт-директор |
| B-11 | Эмодзи вместо графики в заголовках | grep |
| B-12 | CTA-заглушки («Узнать больше», «Свяжитесь с нами») | grep |
| B-13 | `blur-3xl` / `blur(80px+)` — размытие в пыль | grep |
| B-14 | «Нам доверяют» / «trusted by» без имён | grep |
| B-15 | Счётчик «500+ клиентов» без источника цифры | grep |
| B-16 | Одинаковый ритм секций `py-24` ×4 и более | grep |
| B-17 | Маркетинговые штампы и клише | `lint-copy` |
| B-18 | Бессодержательные CTA («Подробнее», «Отправить») | `lint-copy` |
| B-19 | Неконтрастный текст (Ratio < 4.5:1) | `lint-contrast` |
| B-20 | Нет состояния загрузки/отклика на формах и кнопках | арт-директор |
| B-21 | Заявленные гарантии/цифры без сноски в SOURCES | `lint-copy` |
| B-22 | Формы с >4 обязательными полями в один экран | арт-директор |
| B-23 | Висячие предлоги и нетипографированный текст | `typographer` |
| B-24 | Растровые иконки низкого разрешения вместо SVG | grep |
| B-25 | CTA-кнопки без `data-analytics-event` | `lint-marketing` |

**QUOTAS — 14 лимитов** (`anti-slop/QUOTAS.md`):

| № | Лимит | Что ограничивает |
|---|---|---|
| Q-01 | 1–3 | motion-рецептов на страницу |
| Q-02 | ≤1 | reveal-приёма на секцию |
| Q-03 | ≥1 | асимметричная композиция на страницу |
| Q-04 | ≥8vw | хотя бы один заголовок |
| Q-05 | ≥1 | текстура из `assets/textures/` |
| Q-06 | 100% | шрифтов из `PAIRS.md` |
| Q-07 | ≤2 | акцентных цвета на проект |
| Q-08 | ≥44px | тап-зоны на мобильных (HIG/Material) |
| Q-09 | 1×h1 | один H1; title 50–60, description 120–158 |
| Q-10 | ≤1.5MB | вес страницы (gzip); JS ≤ 300KB |
| Q-11 | ≥1 | интерактивный инструмент ценности на проект |
| Q-12 | ≥4.5:1 | контраст текста (WCAG 2.1 AA) |
| Q-13 | 5 из 5 | UX-состояний (Ideal, Empty, Loading, Partial, Error) |
| Q-14 | ≤25 слов | максимум слов в предложении (редполитика) |

### 10.2. Legal Docs Studio

**BANNED (`B-xx`):** B-01 шаблонные формулировки без реквизитов; B-02 ссылка на НПА без редакции;
B-03 «прочие условия определяются сторонами» без раскрытия; B-04 противоречие пунктов;
B-05 ПДн без основания обработки; B-06 отсутствие порядка споров; B-07 неактуальная форма (дата в прошлом);
B-08 непроверенные контрольные суммы реквизитов.

**QUOTAS (`Q-xx`):** Q-01 ≤40 слов в предложении; Q-02 обязательные существенные условия — 100%;
Q-03 дисклеймер — 1 на документ; Q-04 приложений ≥ 0 и все перечислены в тексте;
Q-05 сносок на НПА ≥ 1 для документов, ссылающихся на ГК РФ.

### 10.3. Content Studio

**BANNED (`B-xx`):** B-01 переспам ключа (>3%); B-02 «вода» и вводные без смысла; B-03 штампы
(«в современном мире», «важно отметить»); B-04 заголовки-кликбейт без раскрытия; B-05 факт без источника;
B-06 скрытый текст/white-hat нарушение; B-07 дублирование абзацев.

**QUOTAS (`Q-xx`):** Q-01 плотность ключа 1–3%; Q-02 title 50–60; Q-03 description 120–158;
Q-04 внутренних ссылок ≥2; Q-05 абзац ≤ 5 предложений; Q-06 изображений с `alt` — 100%.

---

### 10.4. Data Analytics Studio

**BANNED (`B-xx`):** B-01 `SELECT *`; B-02 коррелированные подзапросы вместо JOIN без причины;
B-03 SQL собирается f-string/конкатенацией (инъекция); B-04 тихо проглоченные ошибки (`except: pass`);
B-05 недетерминированный порядок без `ORDER BY`; B-06 PII в открытом виде; B-07 «магия» без комментария;
B-08 хардкод креденшелов.

**QUOTAS (`Q-xx`):** Q-01 время запроса в бюджете песочницы; Q-02 `Seq Scan` на больших таблицах — 0;
Q-03 docstring/комментарии на каждый непубличный блок; Q-04 дубликаты в результате — 0;
Q-05 доля null в ключевых полях — под порогом.

### 10.5. Education Studio

**BANNED (`B-xx`):** B-01 тест без объяснения правильного ответа; B-02 «выберите все варианты» без числа;
B-03 цель обучения вне таксономии Блума; B-04 неадекватная возрасту лексика; B-05 материал без практики;
B-06 скачок сложности > 1 уровень; B-07 копипаста без источника.

**QUOTAS (`Q-xx`):** Q-01 интерактив ≥1 на 10 минут; Q-02 формативная оценка после каждого блока — 100%;
Q-03 вопросов на проверку ≥ 3 на урок; Q-04 цель → оценивание покрытие 100%; Q-05 время урока реалистично.

### 10.6. Mini Apps Studio

**BANNED — 5 запретов** (`anti-slop/BANNED.md`):

| № | Запрет | Метод |
|---|---|---|
| B-01 | `:hover` как единственный способ взаимодействия (на тач нет hover) | regex `:hover` без `:active` |
| B-02 | Жёсткий `height: 100vh` (перекрывается клавиатурой/шапкой) | regex без `env(safe-area-inset)` |
| B-03 | Навигация через `window.location.href` (закроет Mini App) | regex |
| B-04 | Кастомные скроллбары (`::-webkit-scrollbar`) — ломают iOS momentum | regex |
| B-05 | Блокирующие модалки при загрузке (< 500ms) | DOMContentLoaded + modal.show |

**QUOTAS — 5 лимитов** (`anti-slop/QUOTAS.md`):

| № | Лимит | Что ограничивает |
|---|---|---|
| Q-01 | ≤300KB (gzip) | размер JS-бандла |
| Q-02 | ≤2 | внешних шрифта (заголовки + body) |
| Q-03 | ≤100KB | размер изображения |
| Q-04 | ≤3 | параллельных API-запросов при старте |
| Q-05 | ≤2MB | размер `localStorage` |

### 10.7. Mobile Apps Studio

**BANNED — 6 запретов** (`anti-slop/BANNED.md`):

| № | Запрет | Метод |
|---|---|---|
| B-01 | iOS-паттерны в Android без адаптации | LLM-критик + `Platform.OS` |
| B-02 | Синхронные операции в UI-потоке (ANR) | ESLint `no-sync-in-ui` |
| B-03 | `WebView` без sandbox/`javaScriptEnabled` | regex |
| B-04 | Хардкод строк без i18n | ESLint `i18next/no-literal-string` |
| B-05 | `alert()` / `Alert.alert` вместо нативного UI | regex |
| B-06 | Отсутствие `key` в `FlatList`/`ListView` | ESLint `react/no-array-index-key` |

**QUOTAS — 6 лимитов** (`anti-slop/QUOTAS.md`):

| № | Лимит | Что ограничивает |
|---|---|---|
| Q-01 | ≤50MB | размер APK / IPA (без on-demand) |
| Q-02 | ≤50 | прямых npm-зависимостей |
| Q-03 | ≤2 c | время холодного старта (mid-range) |
| Q-04 | ≤150MB | память в активном состоянии |
| Q-05 | ≤5 | экранов в одном стеке без навигации |
| Q-06 | ≤100MB | размер кэша на диске |

---

## 11. СИСТЕМА СКИЛЛОВ

**Скилл** — воспроизводимый приём с источником в `references/` и обязательным `takeaway`
(К-04: приём без источника — слоп). Скилл не код студии, а инструкция для генератора:
контекст-билдер подмешивает его текст в промпт, а валидатор проверяет исполнение.

### 11.1. Формат скилла (`skills/<id>/SKILL.md`)

```yaml
# skills/SK-01/skill.yaml
id: SK-01
name: "Плакатная типографика"
category: design          # design | marketing | copy
force: design             # Design Forces / Marketing Forces / Copywriting Forces
source: REF-05            # обязателен: id из references/INDEX.md
takeaway: "Заголовок работает как изображение: размер до 10vw, перенос по смыслу."
inputs:  { section: string, headline: string }
checks:  [ "font-size ≥ 8vw", "перенос по смыслу", "шрифт из PAIRS.md" ]
applies_to: [web, mini_apps, mobile_apps, content]
```

Требования: `source` указывает на существующий `REF-*`; `checks` непуст и выражается
машинно или через арт-директора (LLM-judge); `applies_to` ⊆ домены §2.

### 11.2. Реестр скиллов цеха (`skills/SKILL-INDEX.md`)

**Design Forces**

| id | Скилл | Суть |
|---|---|---|
| SK-01 | Плакатная типографика | Заголовок как изображение: афиши, манифесты |
| SK-02 | Ломаная сетка | Асимметричные сетки, динамический ритм |
| SK-03 | Скролл-сторителлинг | Нарратив из ≥5 шагов |
| SK-04 | Редакционная обрезка фото | Арт-дирекшн кадрирования |
| SK-05 | Производственный паспорт | Инженерная подача с артефактом |
| SK-06 | Кинозаставка (intro) | Эффект титров, премьерный запуск |
| SK-07 | Пять UX-состояний | Ideal, Empty, Loading, Partial, Error |
| SK-08 | Интерактивные таблицы | Матрицы с фиксированной колонкой |
| SK-09 | Микровзаимодействия | Тактильный отклик, фокус-ринги |
| SK-16 | WebGPU/WebCodecs видео | Детерминированный таймлайн, экспорт в MP4 |
| SK-17 | Контрастные состояния | Прожектор тоном, AA в любом состоянии |
| SK-18 | Геометрический свип | Кегль от контейнера, отказ от nowrap |
| SK-19 | Кадры заказчика в анимацию | Многослойный файл → общий viewBox, цикл 8000 мс, приёмка по IoU |

**Marketing Forces**

| id | Скилл | Суть |
|---|---|---|
| SK-10 | Калькулятор ценности | Интерактивный расчёт выгоды/ROI |
| SK-11 | Proof Engine | «Было/Стало», факт-плашки, отзывы |
| SK-12 | Матрица сравнения | «Мы vs Традиционный подход» |

**Copywriting Forces**

| id | Скилл | Суть |
|---|---|---|
| SK-13 | Инженерный копирайтинг | Факты, ГОСТы, единицы без штампов |
| SK-14 | Драматургия B2B-кейса | Контекст → Проблема → Решение → Метрики |
| SK-15 | UX-микрокопия | Тексты интерфейсов, ошибки, CTA |

### 11.3. Жизненный цикл скилла

1. **Изъятие** — удачный приём из проекта переносится в `references/` (скриншот + `REF-*.meta.yaml`
   с `takeaway`), затем в `skills/<id>/` (К-11: удачное изъято в архив).
2. **Регистрация** — строка в `SKILL-INDEX.md`; `source` обязателен.
3. **Подмешивание** — `context_builder.include.skills` кладёт индекс первым, затем тела выбранных
   скиллов (по `applies_to` домена и метаданным проекта).
4. **Проверка** — `checks` исполняются валидатором/LLM-judge; непрошедший скилл возвращает код
   `V-xx`, а не «мне не нравится».
5. **Устаревание** — скилл без источника, дублирующий другой, или с неисполнимыми `checks`
   снимается с реестра (К-10: точечная правка, не снос).

Каждый скилл имеет демо (`demo.html`) для визуальных приёмов — как у motion-рецептов.

---

## 12. РЕФЕРЕНСЫ И RAG

### 12.1. Архив референсов (источник приёмов)

Правило К-02/К-04: **каждое решение — строка «решение → файл-источник»**, приём без источника
существовать не может. Референс — это `REF-*` из `references/INDEX.md`:

| id | стиль | источник | takeaway (обязателен) |
|---|---|---|---|
| REF-01 | scroll-story, editorial | pudding.cool | Закрепи сцену на весь экран и меняй в ней ровно одно состояние на шаг текста. |
| REF-02 | editorial, index | pentagram.com | Заменяй сетку карточек плотным индексом: имя проекта крупнее превью. |
| REF-03 | poster, illustration | basecamp.com | Один тезис — один экран; иллюстрация продолжает фразу, а не украшает её. |
| REF-04 | play, canvas | bruno-simon.com | Интерактив оправдан, когда у курсора есть масса и инерция. |
| REF-05 | poster-type | readymag.com | Набирай заголовок как плакат: до 10vw, перенос по смыслу. |
| REF-06 | archive, ledger | fontsinuse.com | Архив живёт плотностью записей, а не декором обложки. |
| REF-07 | industrial, poster, ledger | pcpolimer | Промышленную тему открывай характерным артефактом, акцент — из рабочей палитры отрасли. |
| REF-08 | minimal, whitespace | siteinspire.com | Минимализм — это один акцент на пустом фоне, а не пустой фон без акцента. |
| REF-09 | brutalist, raw | brutalistwebsites.com | Брутализм работает, когда честная конструкция сильнее украшения: рамки, плашки, системный шрифт. |
| REF-10 | dark, night | darkmodedesign.com | Тёмная тема — фон уровня #0E1116, иерархия прозрачностью белого и один яркий акцент. |
| REF-11 | catalog, ecommerce, cards | ecommercetemplates.com | Каталог живёт плотностью карточек: фото, название, цена — и корзина всегда на виду. |
| REF-12 | saas, landing, conversion | saaslandingpage.com | SaaS-лендинг — это одно обещание в hero и доказательство цифрами ниже, а не каталог фич. |
| REF-13 | typography, poster | httpster.net | Типографика — это дизайн: размер до 10vw и игра весов заменяют любые картинки. |
| REF-14 | animation, scroll | godly.website | Анимация усиливает рассказ, если на шаг текста — одно движение; хаос из движений убивает доверие. |
| REF-15 | ui-patterns, components | collectui.com | Компонент ясен без подписи: одно действие, видные состояния, пустое состояние с подсказкой. |
| REF-16 | landing, fullpage | land-book.com | Одностраничник — это серия полноэкранных секций, каждая с одним смыслом и якорем. |
| REF-17 | concept, poster | dribbble.com | Концепт продаёт одна деталь: необычный акцент на привычной сетке, остальное — по правилам. |
| REF-18 | case, portfolio | behance.net | Кейс убеждает историей: задача, решение, метрика до/после — а не галереей красивых картинок. |
| REF-19 | premium, refined | awwwards.com | Премиум — это целостность: типографика, ритм и паузы, и ни одной случайной детали. |

Скриншот добавляет куратор-человек: файл `<id>.png` рядом с `<id>.meta.yaml`.

### 12.2. RAG в Node-ядре (без внешней БД)

Требование «ноль npm-зависимостей» (закон цеха) определяет реализацию RAG:

- **Провайдер по умолчанию — `local`**: лексический поиск по архиву. Документы — файлы
  `skills/`, `references/`, `motion/`, `gates/`, досье проектов. Ранжирование — по пересечению
  токенов запроса с `tags`/`takeaway` (+ boost за точное имя `REF-*`/`SK-*`), лимит — `max_files_per_section`.
- **Провайдер `qdrant` (опционально):** оставлен в `vertical.yaml.knowledge` как апгрейд для больших
  архивов; подключается внешним клиентом и не входит в zero-dep ядро. При отсутствии — честный
  fallback на `local` с записью в `metrics`.
- **Бюджеты контекста:** `max_chars_per_file` → `max_chars_per_section` → `context_char_limit`;
  при переполнении режутся `examples` первыми, `mechanics` — последними (закон всегда в контексте).

### 12.3. Пополнение архива

Изъятие удачного из проекта (К-11): приём → `references/`, скилл → `skills/`, рецепт → `motion/`.
Правило входа: запись без `takeaway` не принимается (иначе архив превращается в свалку картинок).

### 12.4. Источники референсов (каталоги-доноры)

Каждая студия при создании заполняет базу референсов из каталогов-доноров своего домена: обход
(`scripts/scrape_references.mjs --fetch`) парсит скриншоты, структуры и цвета, изъятые приёмы
сохраняются в `references/` с обязательным `takeaway` (К-04). Машиночитаемый реестр источников —
`configs/references_sources.yaml`; по умолчанию все источники `enabled: false`, сетевой обход
включается только явным `--fetch` (ядро остаётся zero-dep и офлайн, §14.3).

#### 12.4.1. Лендинги и одностраничники — `web_studio`

| Сайт | Что брать | Фильтры |
|---|---|---|
| land-book.com | Скриншоты полных страниц | По цвету, типу, индустрии |
| lapa.ninja | 7300+ лендингов с full-page скриншотами | По категории (SaaS, крипто, образование) |
| landingfolio.com | Лендинги + UI-компоненты | По секциям (hero, pricing, FAQ) |
| onepagelove.com | Одностраничники | По типу (портфолио, продукт, ивент) |
| saaslandingpage.com | SaaS-лендинги | По стилю и конверсии |

#### 12.4.2. Полноценные сайты и стили — `web_studio`

| Сайт | Что брать | Фильтры |
|---|---|---|
| awwwards.com | Премиум-дизайн | По технологиям, стилям, оценкам |
| siteinspire.com | Чистый минимализм | По стилю, CMS, типу |
| httpster.net | Трендовая типографика | По году, стилю |
| godly.website | Анимированные сайты | По типу анимации |
| minimal.gallery | Строгий минимализм | По индустрии |
| brutalistwebsites.com | Брутализм | По типу |

#### 12.4.3. Каталоги и E-commerce — `web_studio`

| Сайт | Что брать | Фильтры |
|---|---|---|
| ecommercetemplates.com | Шаблоны магазинов | По платформе, нише |
| mobbin.com | UX-паттерны мобильных и веб | По flow, экрану |
| pageflows.com | Записи пользовательских потоков | По задаче (регистрация, чекаут) |

#### 12.4.4. UI-компоненты — все вертикали

| Сайт | Что брать | Фильтры |
|---|---|---|
| collectui.com | Реальные UI-паттерны | По компоненту (кнопки, формы, карточки) |
| uisources.com | Скриншоты интерфейсов компаний | По приложению |
| dribbble.com | Концепты | По запросу «landing», «catalog», «dashboard» |
| behance.net | Портфолио | По запросу, индустрии |

#### 12.4.5. Тёмные темы — `web_studio`

| Сайт | Что брать |
|---|---|
| darkmodedesign.com | Тёмные интерфейсы |
| dark.design | Тёмные лендинги |

#### 12.4.6. Telegram Mini Apps и мессенджеры — `mini_apps`

| Сайт | Что брать | Фильтры / особенности |
|---|---|---|
| tma.gallery | Реальные скриншоты и ссылки на работающие Telegram Mini Apps | Категории: Shop, Game, Utility, Finance |
| miniapp.cafe | Каталог и обзоры лучших мини-приложений в Telegram | Фильтр по нише и функционалу |
| tgstat.ru | Статистика и скриншоты интерфейсов ботов и мини-аппов (RU-сегмент) | Топ-чарты, примеры онбординга |
| dribbble.com | Концепты UI/UX | Поиск: «Telegram Mini App UI», «TMA design» |
| behance.net | Кейсы и портфолио | Поиск: «Telegram bot UI», «Mini app case study» |

#### 12.4.7. Мобильные приложения (iOS / Android) — `mobile_apps`

| Сайт | Что брать | Фильтры / особенности |
|---|---|---|
| mobbin.com | Полные скриншоты реальных приложений из App Store/Google Play | По OS (iOS/Android), потокам (onboarding, checkout, settings) |
| pttrns.com | Мобильные UI-паттерны (кнопки, формы, табы, пустые состояния) | Категории по типам экранов |
| mobile-patterns.com | Библиотека лучших практик iOS и Android | По гайдлайнам (Apple HIG, Material Design) |
| scrnshts.club | Скриншоты из App Store (маркетинговые экраны) | Для генерации превью приложения |
| uigarage.net | Вдохновение для мобильной навигации и интерактива | Категории: Tab Bar, Navigation, Cards |
| collectui.com | Реальные компоненты | Фильтр «Mobile» (2000+ паттернов) |

---

## 13. КОМПОЗИЦИИ И CEO-АГЕНТ

### 13.1. Композиция

**Композиция** — ориентированный граф (DAG) задач, каждая из которых решается своей вертикалью
через loop-engine. Композиция описывает *что собрать*, вертикаль — *по каким правилам*.

```yaml
# compositions/<name>/composition.yaml
apiVersion: autogen/v1
kind: Composition
metadata:
  name: launch-landing-with-review
  goal: "Лендинг запуска + ревью текстов + 3 поста"
tasks:
  - id: brief
    vertical: content          # одна из 6 вертикалей §2
    gate: G1
    output: MARKETING.md
  - id: landing
    vertical: web
    gate: G4
    needs: [brief]
  - id: review
    vertical: content
    gate: G4
    needs: [brief]
    hitl: true                 # ревью человеком обязательна (К-09)
  - id: posts
    vertical: content
    gate: G4
    needs: [landing]
aggregate:
  mode: all                    # all | best_effort | quorum
  deliverable: "verticals/*/workspace/loop-result.json"
```

Инварианты: `needs` образуют DAG (цикл = `E-CONFIG-GRAPH`); каждая вершина наследует конституцию
своей вертикали; задача с `hitl: true` не закрывается без вердикта человека (G4).

### 13.2. CEO-агент (платформенный оркестратор)

CEO-агент — верхнеуровневый агент платформы. Он **не пишет контент**, а декомпозирует
запрос пользователя и запускает композиции:

```
запрос → маршрутизация к домену(ам) → композиция (DAG) → run(loop-engine) на задачу
      → агрегация вердиктов → отчёт (REVIEW.md) → HITL на G4
```

Цикл принятия решения CEO-агентом (тот же движок К-21, другой валидатор):

| Шаг | Действие | Контракт |
|---|---|---|
| Plan | разложить цель на `tasks[]` (вертикаль, gate, `needs`) | LLM + схема `composition.yaml` (`E-SCHEMA`) |
| Route | выбрать вертикаль по `vertical.yaml.spec.skills` | реестр вертикалей (§7) |
| Run | `loadConfigAndRun` на каждую задачу | `LoopResult` (exit 0/1) |
| Verify | гейты G1–G4 вертикали | `V-xx`/`B-xx`/`M-xx` |
| Aggregate | `mode: all/best_effort/quorum` | отчёт + `E-COMPOSITION-*` |
| Escalate | `hitl: true` → человеку | G4 REVIEW.md |

Роли (адаптация `ROLES.md` к 7 доменам):

- **CEO-агент** — декомпозиция, маршрутизация, агрегация; вердикт без «мне не нравится».
- **Агент-вертикаль** — собирает артефакт строго из архива своей вертикали по G1–G4.
- **Агент-маркетолог/копирайтер** — MARKETING.md + COPYWRITING.md (web/content).
- **Арт-директор (LLM-judge)** — вторая модель оценивает по рубрике, порог `pass_threshold`.
- **Куратор-человек** — пополняет архив, калибрует правила, финальная приёмка (К-09).

Ограничения: CEO-агент не обходит конституции вертикалей и не подменяет HITL; `aggregate` не
может объявить успех, если хотя бы одна задача с `hitl: true` не принята человеком (К-09).

---

## 14. ИНФРАСТРУКТУРА И CI

### 14.1. Стек и раскладка

- **Node ≥ 18, ESM, ноль npm-зависимостей** в `core/` и в скриптах цеха (только встроенные модули).
  Витрина веб-вертикали (`src/`) использует обычные зависимости Vite/React — это отдельный слой.
- Раскладка метаплатформы: `core/` (движок) + `verticals/<name>/` (студии) + `analyzers/`,
  `generators/`, `validators/` — общие механики.
- Текущий корень репозитория — **эталонная реализация `verticals/web_studio`**; ядро вынесено в `core/`.

```bash
npm run gate            # node core/loop-engine/gate.mjs — гейт К-21 по всем проектам
npm run loop            # node core/loop-engine/cli.mjs — ручной прогон цикла
npm run loop:selftest   # офлайн-самопроверка цикла (mock, без сети/ключей)
npm run test:engine     # node --test core/loop-engine/tests/*.test.mjs (148 тестов)
```

### 14.2. CI: гейт К-21 (`.github/workflows/loop-gate.yml`)

На `push`/`pull_request` в `main`, Node 20, **без `npm ci`** (движок zero-dep):

1. `node --test core/loop-engine/tests/*.test.mjs` — тесты движка;
2. `node core/loop-engine/cli.mjs --selftest` — офлайн-цикл (провал → фидбек → приёмка);
3. `node core/loop-engine/gate.mjs` — одна итерация цикла на каждый проект, `exit 0` — закон исполнен.

Дополнительно `qa-fortress/` даёт pre-commit/pre-push хуки и мобильные/SEO/spacing-гейты;
`deploy.yml` публикует веб-витрину (`vite build`).

### 14.3. Песочница и безопасность ядра

- `subprocess.mjs`: `shell: false`, аргументы массивом (инъекция команд невозможна),
  `timeout` + `SIGKILL`, обрезка вывода.
- Запись только в `workspace/`; все пути проходят `safeResolveInside` (`../../` и абсолютные
  пути → `E-PATH`).
- Предохранитель проекта: запись в `projects/<имя>/` запрещена без `allow_project_writes: true`
  (`E-WRITE-GUARD`) — принятый проект нельзя испортить случайным прогоном.
- Ключи моделей только из переменных окружения (`api_key_env`); в отчётах — флаг `apiKeyPresent`.
- Логи — в stderr (`LOOP_ENGINE_LOG`), отчёт — в stdout (коды `L-xx/V-xx/B-xx/E-xx`).

### 14.4. Модели и провайдеры

| Среда | Provider | Пример |
|---|---|---|
| Локально / офлайн | `mock` | `--dry-run`, `--selftest`, CI |
| Локальные модели | `openai` (совместимый эндпоинт) | `ollama/llama3.1:8b`, `ollama/qwen2.5-coder:7b` |
| Прод | `openai` / `anthropic` | `gpt-4o-mini`, Claude; ключ из env |

`response_format: files` позволяет генерировать несколько файлов сайта за итерацию; JSON-режим —
для структурированных артефактов (`E-GEN-*` при сбое разбора).

### 14.5. Хранение состояния

**Состояние = файлы, не PostgreSQL.** Решение зафиксировано в §3 и §4: досье проекта
(`SEED/DIRECTION/STRUCTURE/SOURCES/…`), итерации (`workspace/iterations/iter-NN/`) и итог
(`workspace/loop-result.json`). Это делает прогон воспроизводимым на чистом checkout без БД.

---

## 15. КРИТЕРИИ ПРИЁМКИ И ТЕСТЫ

### 15.1. Definition of Done (задача/вертикаль)

1. **Цикл сошёлся:** `node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project` → **exit 0**;
   evidence — `workspace/loop-result.json`.
2. **REVIEW.md:** вердикт со ссылками на пункты конституции (не «мне не нравится»).
3. **Удачное изъято в архив:** приём → `references/`, скилл → `skills/`, рецепт → `motion/` (К-11).

### 15.2. Машинные проверки цеха

| Инструмент | Что проверяет | Коды |
|---|---|---|
| `scripts/validate.mjs` | 17 проверок V-01…V-17 (см. §15.3) | `V-xx` |
| `scripts/lint-slop.mjs` | BANNED B-01…B-25 по `site/` | `B-xx` |
| `scripts/lint-copy.mjs` | редполитика, штампы B-17…B-23, ≤25 слов (Q-14) | `B-xx` |
| `scripts/lint-marketing.mjs` | UVP, воронка, `data-analytics-event` (К-16) | `M-xx` |
| `scripts/lint-contrast.mjs` | контраст текста WCAG AA (Q-12) | `B-xx` |
| `scripts/typographer.mjs` | русская типографика (тире, кавычки, висячие предлоги) | `B-23` |
| `scripts/diff-projects.mjs` | сходство проектов ≤10% | `V-09` |
| `core/loop-engine/validators/*` | код/схема/конституция/LLM-judge | `E-*` |
| `core/loop-engine/tests/*` | 148 тестов движка на `node:test` | exit code |

### 15.3. `validate.mjs` — V-01…V-17

| Код | Проверка |
|---|---|
| V-01 | DIRECTION: референсы и цитаты (≥3 источников, ≥3 takeaway) |
| V-02 | SOURCES: пути существуют |
| V-03 | SOURCES: ≥2 рецептов, ≥1 скила |
| V-04 | site/ чист от BANNED B-01…B-16 |
| V-05 | Квоты Q-01…Q-07 |
| V-06 | Easing из `easing-curves.json` |
| V-07 | SEED: 3 оси отражены |
| V-08 | REVIEW: вердикт + ссылки (≥2) |
| V-09 | diff-projects: сходство ≤10% |
| V-10 | Полнота `REF-*.meta.yaml` |
| V-11 | Редполитика: чисто от штампов B-17…B-23 |
| V-12 | Маркетинг: воронка и аналитика (К-16) |
| V-13 | Русская типографика |
| V-14 | A11y: контрастность WCAG AA (Q-12) |
| V-15 | Code-Video: детерминизм и reduced-motion (К-19) |
| V-16 | Senior Architecture: OKLCH, Container Queries, SchemaFactory (К-20) |
| V-17 | Style Variance Engine: фиксация Архетипа на G1 |

### 15.4. Ворота G1–G4

| Гейт | Вход | Выходной артефакт | Отказ |
|---|---|---|---|
| **G1** Направление | BRIEF | `DIRECTION.md` (архетип, палитра, 3 оси) + `MARKETING.md` | нет источника/приёма (К-01, К-16) |
| **G2** Структура | DIRECTION | `STRUCTURE.md`, выбор motion-рецептов | нет соответствия конституции |
| **G3** Артефакт | STRUCTURE | `site/` (сборка) | validate/lint красные |
| **G4** Финал | сборка | `REVIEW.md` + принятый проект | любое нарушение без фикса; цикл ≠ exit 0 |

### 15.5. Тесты платформы

- **Юнит** — `node:test` (148 проверок движка: генераторы, валидаторы, конфиг, шаблон, песочница, gate).
- **Интеграция** — прогон `MockGenerator` по вертикали с негативной фикстурой `fixtures/slop-site`;
  валидатор **обязан упасть** (иначе проверка бесполезна).
- **E2E вертикали** — цепочка G1→G4 → `exit 0` + evidence.
- **Кросс-проектная регрессия** — `npm run gate` по всем проектам: любой красный → `exit 1`.

> **Известный дрейф репозитория (фиксируется этим ТЗ).** `gates/G4-final.md` и `LIBRARY.md`/`README.md`
> местами ссылаются на старые объёмы (V-01…V-10, B-01…B-16, BANNED 16 / QUOTAS 7). Актуальные
> источники истины: `scripts/validate.mjs` (**V-01…V-17**) и `anti-slop/BANNED.md` /
> `anti-slop/QUOTAS.md` (**25 / 14**). Чек-лист G4 приводится к V-17/B-25 точечной правкой (К-10).

---

## 16. РИСКИ И МИТИГАЦИИ

| № | Риск | Проявление | Митигация |
|---|---|---|---|
| R-01 | Слоп от генератора | индиго-градиенты, три карточки, штампы | anti-slop BANNED/QUOTAS как валидатор (`V-04`, `V-05`, `lint-copy`), негативная фикстура `slop-site` в CI |
| R-02 | Дрейф конституции | код пишется до `DIRECTION.md` | гейты G1–G4 + `V-01`/`V-07`; возврат с ворот = точечные правки (К-10) |
| R-03 | Недетерминизм прогона | разный результат на одинаковом входе | `MockGenerator` для офлайн/CI, `temperature_schedule`, `state = файлы`, evidence итераций |
| R-04 | Перерасход бюджета/токенов | цикл крутится без сходимости | `max_iterations`, `max_total_seconds`, бюджеты контекста, `E-BUDGET`, `E-LOOP-EXHAUSTED` |
| R-05 | Побег за пределы проекта | запись вне `workspace/` | `safeResolveInside` (`E-PATH`), `allow_project_writes` (`E-WRITE-GUARD`), `shell:false` |
| R-06 | Утечка ключей | ключ в логах/отчётах | только env (`api_key_env`), в выводе — `apiKeyPresent` |
| R-07 | Слабость local-RAG | приём не находится по запросу | теги + `takeaway`, boost по `REF-*`/`SK-*`; апгрейд на `qdrant` внешним клиентом |
| R-08 | Поломка веб-витрины | `core/` тянет зависимости в `src/` | `core/` не импортируется из `src/`, `tsconfig.include=["src"]`, байт-в-байт сборка |
| R-09 | Дрейф документов студии | G4 говорит V-01…V-10 | §15.5: сверка с `validate.mjs` (V-17) и BANNED (25); правка по К-10 |
| R-10 | HITL — узкое место | юридический/финальный вердикт ждёт человека | `hitl: true` только на нужных воротах; `aggregate.mode: best_effort` для несвязанных задач |
| R-11 | Разрастание архива | свалка картинок без смысла | запись без `takeaway` не принимается (К-04) |
| R-12 | Хрупкость кросс-доменных композиций | цикл зависимостей, спор доменов | DAG-инвариант (`E-CONFIG-GRAPH`), каждая вершина наследует свою конституцию |

---

## 17. ПЛАН РЕАЛИЗАЦИИ И РЕГЛАМЕНТ АГЕНТА

### 17.1. Фазы

| Фаза | Содержание | Критерий выхода |
|---|---|---|
| **P0. Ядро** | `core/loop-engine/` — контракты, генераторы, валидаторы, песочница | 148 тестов зелёные, `--selftest` exit 0 |
| **P1. Веб-вертикаль** | `verticals/web_studio` (= текущий репозиторий): конституция, anti-slop, gates, projects | `npm run gate` exit 0 |
| **P2. Домены** | конституции Legal/Content/Data/Education/MiniApps/Mobile (§9) + anti-slop (§10) | по вертикали `validate` + линтеры зелёные |
| **P3. Композиции** | `compositions/`, CEO-агент, агрегация (§13) | составная задача проходит G1→G4 |
| **P4. Студии под-платформы** | генерация артефактов не-веб доменами (SQL/уроки/APK) | e2e-прогон вертикали + изъятие в архив (К-11) |

### 17.2. Регламент агента (из `AGENTS.md`)

- **Порядок чтения (обязателен):** CONSTITUTION.md → references/INDEX.md → skills/SKILL-INDEX.md →
  motion/RECIPES.md + easing-curves.json → anti-slop/BANNED.md + QUOTAS.md → gates/G1–G4 →
  core/loop-engine/README.md.
- **Запрещено писать код до `DIRECTION.md` и `MARKETING.md`, принятых на G1** (К-01, К-16).
- Каждое решение — строка в `SOURCES.md`: «решение → файл-источник» (К-02).
- Приём без источника в `references/` или `skills/` — слоп (К-04).
- Easing — только из `motion/easing-curves.json` (К-05).
- 1–3 motion-рецепта на страницу (Q-01); шрифты — из `PAIRS.md` (Q-06).
- Запрещены клише B-17, кнопки без отклика B-18/B-20, текст без типографики B-23.

### 17.3. Цикл принуждения (К-21)

Проект не сдаётся, пока цикл не сошёлся:

```bash
node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project      # exit 0 — закон исполнен
node core/loop-engine/gate.mjs                                          # гейт по всем проектам (CI)
```

`exit 1` → в `feedback.codes` коды `V-xx`/`B-xx`/`M-xx` — это список **точечных правок** (К-10),
а не повод начинать заново.

### 17.4. Если ТЗ противоречиво

Остановиться и спросить, не выдумывая сущности и не «дописывая» правила по догадке. Частные
случаи фиксируются как дрейф документов (§15.5) и правятся точечно (К-10). Вердикт в `REVIEW.md`
и приёмка на G4 остаются за человеком: цикл подтверждает исполнимость закона, но не оценивает
вкус (К-09).

---

## 18. ИТОГОВОЕ РЕЗЮМЕ

### 18.1. Что описывает ТЗ v3.0

Единая мета-платформа ИИ-студий: **Node/ESM zero-dep ядро** (`core/loop-engine`, цикл К-21),
**6 вертикалей** (web, content, data, education, mini_apps, mobile_apps) с полными
конституциями (§9), anti-slop системами (§10), скиллами (§11), референс-архивом и RAG (§12),
композициями и CEO-агентом (§13), инфраструктурой/CI (§14) и критериями приёмки (§15).
Эталонная реализация веб-вертикали — сам репозиторий `ceh-veb`.

### 18.2. Diff: ТЗ v2.0 (Python) → v3.0 (Node/JS)

| Аспект | v2.0 (5 частей, Python) | v3.0 (единый документ, Node/JS) |
|---|---|---|
| Форма | 5 разрозненных частей, ссылки на «предыдущее ТЗ» | один самодостаточный файл, нумерация линейна |
| Ядро | FastAPI + LangGraph + LiteLLM + pydantic + K8s | `core/loop-engine` (Node ≥18, ESM, zero-dep), К-21 |
| Состояние | PostgreSQL + очереди | `state = файлы` (досье + `workspace/`) |
| Оркестрация | LangGraph-граф | генератор/валидатор/контекст-билдер + композиции (§13) |
| Конституции | веб заявлен как 24 правила, 6 доменов «позже» | все **7** доменов раскрыты (web = К-01…К-21) |
| Коды ошибок | смешаны `V-/E-` | неймспейсы: локальные `V-/B-/Q-/C-/A-/R-`, глобальные `E-/S-/L-/J-/M-` (§6) |
| Anti-slop | декларация | 25 BANNED + 14 QUOTAS (web) и наборы по доменам, метод проверки у каждого |
| Приёмка | ручная | `exit 0/1` + evidence, CI-гейт `npm run gate` (К-15, К-21) |
| Стек моделей | LiteLLM-прокси | `openai`-совместимый / `anthropic` / `ollama`, ключ только из env |

### 18.3. Definition of Done платформы

1. `node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project` → **exit 0**, evidence
   в `workspace/loop-result.json`.
2. `npm run gate` по всем проектам → **exit 0** (CI-слой К-15/К-21).
3. `REVIEW.md` — вердикт со ссылками на пункты конституции.
4. Удачное изъято в архив: приём → `references/`, скилл → `skills/`, рецепт → `motion/` (К-11).

---

*Конец документа. Версия 3.0 (Node/JS).*

