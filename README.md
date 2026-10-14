# Web-Universe-Studio

Мета-платформа ИИ-студий (Agentic Studio Platform): **Node/ESM ядро без зависимостей**, цикл
принуждения К-21, **3 вертикали** (web, mini, mobile), anti-slop, скиллы, композиции (CEO-агент), API и подсистемы
(бюджет, RAG, метрики).

Источник истины — [`TECHNICAL_SPECIFICATION.md`](TECHNICAL_SPECIFICATION.md) (v3.0).

## Требования

Node ≥18 (проверено на Node 24). `core/`, `scripts/`, `cli/` — **ноль npm-зависимостей**.

## Быстрый старт

```bash
node cli/main.mjs help                 # единый CLI
bash scripts/acceptance_test.sh        # полная приёмка DoD (§15)
node core/gate.mjs                     # гейт К-21 по всем 3 вертикалям
```

## Как работать в студии (оболочка, как в цеху)

Платформа — не автономный конвейер «создай проект одной командой», а оболочка из 3 студий:
агент (LLM) работает **внутри** выбранной студии и ведёт проекты в папках
`verticals/<студия>/projects/<имя>/`. Работа идёт по правилам и циклам **этой студии**,
с её приёмами (`skills/`), примерами (`references/`) и скриптами приёмки (`scripts/`).

1. Войди в студию и прочитай её контракт: `verticals/<студия>/AGENTS.md`
   (порядок чтения: CONSTITUTION → references → skills → anti-slop → gates → scripts).
2. Заведи проект: `verticals/<студия>/projects/<имя>/`, артефакт — в подпапке
   `deliverable` студии (site/ · app/).
3. Гоняй цикл студии, пока `exit 0`:

```bash
cd verticals/web_studio                              # пример: веб-студия
node scripts/validate.mjs projects/<имя>             # приёмка V-xx
node scripts/lint-slop.mjs projects/<имя>            # запреты B-xx
node scripts/lint-copy.mjs projects/<имя>            # текст: следы ИИ (A-xx — гейт) + балл стиля
node scripts/lint-quotas.mjs projects/<имя>          # квоты Q-xx
cd ../.. && node core/loop-engine/cli.mjs projects/<имя> --studio-root verticals/web_studio
```

4. Приёмка: `REVIEW.md` артдиректора → G4. Вердикт — за человеком (К-09).

Во всех трёх студиях текст пишет навык **`expert-copywriter`** и проверяет `lint-copy`
(общий движок `core/vertical-kit/copywriting.mjs`). Подробно — [`docs/COPYWRITING.md`](docs/COPYWRITING.md).

## Структура

```
core/
  loop-engine/     ядро цикла К-21 (Runner/Orchestrator/валидаторы/sandbox/генераторы,
                   skills.mjs — загрузчик приёмов §4.6, protocols.mjs — контракты §5–§6,
                   trace.mjs — трейсинг §4.8,
                   contract.mjs — контракт студии (закон ↔ код ↔ приём) и план точечных правок,
                   skill-evidence.mjs — проверка признаков приёма на артефакте)
  gate.mjs         платформенный гейт: все вертикали, валидатор vertical_project
  orchestrator/    CEO-агент + композиции (DAG): composition.mjs, ceo.mjs, cli.mjs
  api/             HTTP Gateway (node:http)
  budget/          BudgetManager (§4.5)
  knowledge/       RAG/BM25 по архиву референсов (§4.7)
  observability/   метрики + экспорт Prometheus (§4.8)
verticals/        каждая студия — оболочка цеха: свой AGENTS.md (контракт агента),
                   CONSTITUTION, anti-slop, skills/, references/, gates/, scripts/
                   приёмки и projects/<имя>/ для работы (web_studio, mini_apps, mobile_apps)
compositions/      декларативные сложные задачи (§13)
configs/           llm.yaml, sandbox_templates.yaml, device-matrix.yaml, references_sources.yaml
scripts/           bootstrap-verticals, index_references, scrape_references, run-tests,
                   contract.mjs (CLI контракта), upgrade_skills.mjs (приёмы → исполнимая форма),
                   render_reference_screenshots.mjs + shots/ (снимки дизайнов из референсов),
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
| `node core/orchestrator/cli.mjs compositions/app-with-landing/composition.yaml` | CEO-агент: композиция |
| `node core/api/server.mjs` | API Gateway |
| `node cli/references_cli.mjs search "договор"` | поиск по архиву (RAG) |
| `node cli/main.mjs gates G4 --studio web_studio --project dezobrabotka` | стадии цикла: чек-лист стадии прогоняется по артефакту (`all` — все стадии, `--json` — машинный отчёт) |
| `node cli/main.mjs contract audit` | контракт студии: статьи закона ↔ машинные коды ↔ приёмы (дрейф, покрытие) |
| `node cli/main.mjs contract check <студия> <проект>` | машинная проверка артефакта по контракту + план правок по кодам |
| `node cli/main.mjs skills --check` | у каждого приёма есть `skill.yaml`, 4 шаблона ролей и крючки |
| `node cli/main.mjs shots --check` | снимки дизайнов из референсов: у каждого референса PNG + образец |
| `node scripts/ci-gate.mjs` | гигиена репозитория: CI зовёт гейт, секреты, внутренние ссылки (К-15) |
| `npm run gate` | гейт К-21 по всем проектам всех вертикалей (9/9) |
| `npm test` | тесты движка, платформы и вертикалей |
| `bash scripts/acceptance_test.sh` | приёмка DoD (§15) |

## Тесты

```bash
npm run test:engine      # 161 тест ядра (включая стадии цикла: core/loop-engine/gates.mjs)
npm run test:platform    # 87 тестов подсистем и сквозных сценариев
npm run test:verticals   # 31 тест по студиям (реестры, ворота, RAG-архив)
```

## Документы

- `TECHNICAL_SPECIFICATION.md` — ТЗ v3.0 (единый источник истины).
- `docs/ARCHITECTURE.md` — устройство и слои.
- `docs/API.md` — HTTP API, роли, лимиты.
- `docs/DEPLOY.md` — развёртывание и CI.
- `docs/USER_GUIDE.md` — сценарии работы.

## Контур принуждения (как студия заставляет модель соблюдать правила)

Четыре слоя, каждый из которых возвращает **код** и **точечную правку**, а не «попробуй ещё»:

1. **До генерации** — в системный промпт и контекст идёт контракт студии: статьи закона,
   машинные коды, приёмы с шагами и проверяемыми признаками (`core/loop-engine/contract.mjs`,
   `renderContract`, секция `contract` в `context-builder.mjs`). Правило без кода и правило
   без приёма видны в `contract audit` как дыра, а не растворяются в тексте.
2. **После генерации** — валидатор возвращает не только коды, но и **план точечных правок**
   (`repair`) и **отчёт приёмов** (`skills`: применено / нарушено / не применено + подсказки
   «код → приём → шаг»); артефакт проверяют и сами приёмы (`skill.yaml → evidence`).
3. **На стадиях** — чек-листы `verticals/<студия>/gates/G1…G4.md` больше не текст для чтения:
   рядом с каждым пунктом объявлена машинная реализация (`` `@check kind параметры` ``), а
   `core/loop-engine/gates.mjs` прогоняет их по конкретному артефакту:
   `node cli/main.mjs gates all --studio web_studio --project dezobrabotka`.
   Виды проверок: скрипты студии (`validate.mjs`, `lint-*`), палитра и квоты (Q-07, Q-02),
   соответствие парам шрифтов, рецепты движения, `loop-evidence` (К-21), ворота реестра
   (`a11y_contrast`, `touch_target`) и репозиторная гигиена (К-15). Исход трёхзначный:
   `true` — выполнено, `false` — нарушено, `null` — судит человек; стадия проходит, когда нет
   ни одного `false`, и «не проверено» не выдаётся за приёмку. Сейчас у веб-студии машиной
   закрыто 7/7 · 4/5 · 5/5 · 8/9 пунктов, оставшиеся помечены «человек» (арт-директор).
4. **На повторе** — если коды не меняются, цикл фиксирует **плато** и меняет стратегию
   (температуру поиска и совет сменить приём), а не переписывает то же место.

Дешёвый слой ловит ошибки до человека: `.github/workflows/ci.yml` на каждый push и PR гоняет
`node scripts/ci-gate.mjs` (CI зовёт гейт, секретов нет, внутренние ссылки ведут на файлы),
затем `npm test` и `bash scripts/acceptance_test.sh`.

Проверяемость правил измерима: `node cli/main.mjs contract audit` печатает покрытие каждой
студии по ступеням — приёмом (есть рецепт правки), стадией (код проверяют ворота), скриптом
(код печатает линтер, правка идёт по тексту ошибки). Сейчас: mini_apps — 24/24 статей и
59 правил (100% приёмами), mobile_apps — 26/26 и 64 (100% приёмами), web_studio — 26 статей
и 82 кода (100%: 70 приёмами, 12 стадиями). Две статьи веб-студии объявлены человеческими
(К-10 «точечные правки вместо перезапуска», К-11 «регламент ревью»): у них нет машинного кода,
и аудит говорит это прямо, а не засчитывает их «на глазок».

Проверить контур на реальных проектах: `node cli/main.mjs contract check web_studio verticals/web_studio/projects/dezobrabotka`
и `node cli/main.mjs gates all --studio web_studio --project dezobrabotka`.

## Правило приёмки

Возврат с ворот — **точечные правки по пунктам `feedback.codes`**, не перезапуск (К-10).
Цикл подтверждает исполнимость закона; вердикт в `REVIEW.md` и приёмка на G4 — за человеком (К-09).
