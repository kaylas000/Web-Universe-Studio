# Контент-студия · `verticals/content_studio`

Пишет посты и статьи с проверяемой структурой: заголовок, лид, подзаголовки, метаданные, источники и призыв к действию — без штампов.

## Что внутри

- `vertical.yaml` — метаданные студии (артефакт — `content/`).
- `CONSTITUTION.md` — проверяемые правила (К-xx).
- `anti-slop/BANNED.md` + `QUOTAS.md` — запреты и квоты (B-xx/Q-xx).
- `skills/` — приёмы студии (skill.yaml + templates/ + hooks/).
- `validators/constitution.mjs` — тот же набор правил как ESM-модуль.
- `scripts/validate.mjs` / `scripts/lint-slop.mjs` — приёмка (exit 0 = принято).
- `projects/post-bez-shablonov/` — демо-проект, проходящий приёмку.

## Приёмка

```text
node scripts/validate.mjs projects/post-bez-shablonov
node scripts/lint-slop.mjs projects/post-bez-shablonov
node --test tests/*.test.mjs
```
