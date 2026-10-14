# Студия мобильных приложений · `verticals/mobile_apps`

Собирает экран мобильного приложения: манифест, модуль экрана с состоянием и разметкой, доступные подписи и README.

## Что внутри

- `vertical.yaml` — метаданные студии (артефакт — `app/`).
- `CONSTITUTION.md` — проверяемые правила (К-xx).
- `anti-slop/BANNED.md` + `QUOTAS.md` — запреты и квоты (B-xx/Q-xx).
- `skills/` — приёмы студии (skill.yaml + templates/ + hooks/).
- `validators/constitution.mjs` — тот же набор правил как ESM-модуль.
- `scripts/validate.mjs` / `scripts/lint-slop.mjs` / `scripts/lint-copy.mjs` — приёмка (exit 0 = принято).
- `projects/notes-app/` — демо-проект, проходящий приёмку.

## Приёмка

```text
node scripts/validate.mjs projects/notes-app
node scripts/lint-slop.mjs projects/notes-app
node scripts/lint-copy.mjs projects/notes-app   # текст: следы ИИ A-xx (гейт) + балл стиля
node --test tests/*.test.mjs
```
