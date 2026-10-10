# Студия данных · `verticals/data_analytics`

Считает метрики и оформляет разбор: SQL-запросы, метрики с формулами, выводы и указание источника данных — всё проверяется машинно.

## Что внутри

- `vertical.yaml` — метаданные студии (артефакт — `analysis/`).
- `CONSTITUTION.md` — проверяемые правила (К-xx).
- `anti-slop/BANNED.md` + `QUOTAS.md` — запреты и квоты (B-xx/Q-xx).
- `skills/` — приёмы студии (skill.yaml + templates/ + hooks/).
- `validators/constitution.mjs` — тот же набор правил как ESM-модуль.
- `scripts/validate.mjs` / `scripts/lint-slop.mjs` — приёмка (exit 0 = принято).
- `projects/sales-dashboard/` — демо-проект, проходящий приёмку.

## Приёмка

```text
node scripts/validate.mjs projects/sales-dashboard
node scripts/lint-slop.mjs projects/sales-dashboard
node --test tests/*.test.mjs
```
