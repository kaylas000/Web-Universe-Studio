# tools студии «Юридическая студия»

Утилиты студии, которые можно звать из кода/CLI (приёмка живёт в `scripts/`; общие
инварианты гоняет `core/gate.mjs` по `scripts/validate.mjs`, `scripts/lint-slop.mjs`
и `scripts/lint-quotas.mjs`).

## requisites-check.mjs

Контрольные суммы реквизитов (К-05, V-05, B-08): находит ИНН (10/12 знаков) и
ОГРН/ОГРНИП (13/15 знаков) в тексте и проверяет каждый через `isValidInn`/`isValidOgrn`
из `core/vertical-kit` (тот же код, что у V-05 в `scripts/rules.json`):

```bash
node tools/requisites-check.mjs projects/dogovor-postavki/docs/dogovor.md
node tools/requisites-check.mjs projects/agentskij-dogovor/docs/dogovor.md
```

- печатает каждый найденный номер и вердикт контрольной суммы;
- exit 0 — все реквизиты валидны; 1 — есть невалидные (B-08); 2 — нет аргумента/файл не читается.

`check-requisites.mjs` — алиас с тем же поведением (имя, указанное в К-05 CONSTITUTION).

ESM-API: `checkRequisites(text)` → `{ inn: [{value, ok}], ogrn: [{value, ok}], invalid: string[] }`.

## Прогон по всем проектам

Та же проверка идёт декларативно: `scripts/rules.json` (V-05 `innChecksum`/`ogrnChecksum`)
и `scripts/quotas.json` исполняют контрольные суммы через `core/vertical-kit`.