# STUDIO-DEPTH-STANDARD.md — стандарт «полной» студии

Стандарт применяется к **2 не-веб студиям** (`mini_apps`, `mobile_apps`), чтобы они были не каркасом, а полноценными студиями
уровня эталона `verticals/web_studio`. Источник требований — `TECHNICAL_SPECIFICATION.md`
(§7.1 скелет, §8 vertical.yaml, §9 конституция, §10 anti-slop, §11 скиллы, §15 приёмка).

## Обязательный состав каждой студии

1. **`vertical.yaml`** — полный §8: `metadata` (name/title/description/domain/tags/deliverable/checks)
   + `spec` (skills/validators/gates/tools/registry/models/budget/knowledge/anti_slop).
2. **`CONSTITUTION.md`** — все статьи К-01…К-N **дословно из §9.x**, у каждой строка «Проверка».
3. **`AGENTS.md`**, **`BRIEF-TEMPLATE.md`**, **`README.md`** — заполнены под домен.
4. **`skills/`** — **≥6 приёмов**, у каждого:
   - `skill.yaml` — `name`, `title`, `description`, `source` (→ `REF-xx`), `takeaway`, `inputs`,
     `outputs`, `steps`, `checks`, `applies_to`;
   - `templates/{planner,coder,verifier,fixer}.j2` — доменные промпты ролей;
   - `hooks/{pre_execute,post_execute}.mjs` — реальные ESM-крючки.
   Плюс `skills/SKILL-INDEX.md` — реестр всех приёмов.
5. **`validators/`** — рабочие ESM-модули:
   - `constitution.mjs` — реальный прогон правил студии, возвращает `{ok, failures}`;
   - `anti-slop.mjs` — реальный скан запретов B-xx, возвращает список попаданий;
   - `schema.mjs` — реальная проверка структуры артефакта;
   - `llm-judge.mjs` — реальный (но по умолчанию выключенный) LLM-критик ядра
     (`core/loop-engine/validators/llm-judge.mjs`).
6. **`anti-slop/BANNED.md` + `QUOTAS.md`** — дословно из §10.x; машинизированы в
   `scripts/slop.json` (каждый B-xx → `pattern`+`code`) и `scripts/quotas.json` (каждый Q-xx).
7. **`scripts/`** — `validate.mjs` (V-xx), `lint-slop.mjs` (B-xx), `lint-quotas.mjs` (Q-xx).
8. **`references/`** — `INDEX.md`, `sources.yaml`, **≥6** `metadata/*.yaml` с обязательным `takeaway`.
9. **`projects/`** — **≥2** демо-проекта, каждый проходит `validate.mjs` и `lint-slop.mjs`.
10. **`tools/`** — ≥1 реальная утилита студии (+ README).
11. **`gates/`** — `README.md` + `G1-direction.md` … `G4-final.md` с чек-листами под домен.
12. **`tests/`** — самотест приёмки + тест скиллов + тест анти-слопа.

## Инварианты (зелёный CI не ломать)

- `node scripts/validate.mjs projects/<demo>` → `ИТОГ: N/N · exit 0` (все N=N).
- `node scripts/lint-slop.mjs projects/<demo>` → `чисто:`.
- `node --test tests/*.test.mjs` внутри студии — зелёный.
- `registry.mjs` — валидный `IVertical`: `getSkills()` непуст, `getVerificationGates()`
  возвращает ворота с реальными `verify`, `buildConfig(name).validator.type === "vertical_project"`.
- `references/.index.json` — каждая запись с `takeaway` (собирает `scripts/index_references.mjs`).
- Для каждого приёма с `skills/<skill>/deliverable/` — `StudioGenerator` рендерит артефакт,
  который проходит `validate.mjs` (P4, `tests/verticals/generation.test.mjs`).

## Границы изменений

- Разрешено менять только `verticals/<slug>/**` и добавлять `tests/verticals/<slug>.*.test.mjs`.
- Не трогать: `core/`, `scripts/`, `tests/verticals/verticals.test.mjs`, `package.json`,
  другие студии. Коммиты — не в этом проходе.
