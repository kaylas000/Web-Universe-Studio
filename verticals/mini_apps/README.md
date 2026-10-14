# Студия мини-приложений · `verticals/mini_apps`

Собирает лёгкие веб-приложения: разметка, скрипт и стиль, без инлайновых обработчиков и тяжёлых эффектов — с проверкой доступности цели нажатия.

## Что внутри

- `vertical.yaml` — метаданные студии (артефакт — `app/`).
- `CONSTITUTION.md` — проверяемые правила (К-xx).
- `anti-slop/BANNED.md` + `QUOTAS.md` — запреты и квоты (B-xx/Q-xx).
- `skills/` — приёмы студии (skill.yaml + templates/ + hooks/).
- `validators/constitution.mjs` — тот же набор правил как ESM-модуль.
- `scripts/validate.mjs` / `scripts/lint-slop.mjs` / `scripts/lint-copy.mjs` — приёмка (exit 0 = принято).
- `projects/timer-app/` — демо-проект, проходящий приёмку.

## Приёмка

```text
node scripts/validate.mjs projects/timer-app
node scripts/lint-slop.mjs projects/timer-app
node scripts/lint-copy.mjs projects/timer-app   # текст: следы ИИ A-xx (гейт) + балл стиля
node --test tests/*.test.mjs
```
