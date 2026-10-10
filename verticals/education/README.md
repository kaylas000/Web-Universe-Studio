# Образовательная студия · `verticals/education`

Собирает учебный модуль: программу с целями, урок с блоками «Теория/Практика/Проверка», тест с вопросами и источники.

## Что внутри

- `vertical.yaml` — метаданные студии (артефакт — `course/`).
- `CONSTITUTION.md` — проверяемые правила (К-xx).
- `anti-slop/BANNED.md` + `QUOTAS.md` — запреты и квоты (B-xx/Q-xx).
- `skills/` — приёмы студии (skill.yaml + templates/ + hooks/).
- `validators/constitution.mjs` — тот же набор правил как ESM-модуль.
- `scripts/validate.mjs` / `scripts/lint-slop.mjs` — приёмка (exit 0 = принято).
- `projects/kurs-proverka-dannyh/` — демо-проект, проходящий приёмку.

## Приёмка

```text
node scripts/validate.mjs projects/kurs-proverka-dannyh
node scripts/lint-slop.mjs projects/kurs-proverka-dannyh
node --test tests/*.test.mjs
```
