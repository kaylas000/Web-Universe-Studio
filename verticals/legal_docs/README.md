# Юридическая студия · `verticals/legal_docs`

Готовит договоры, политики и претензии с проверяемой структурой: разделы, нумерация, реквизиты и ссылка на применимое право — всё машинно проверяется.

## Что внутри

- `vertical.yaml` — метаданные студии (артефакт — `docs/`).
- `CONSTITUTION.md` — проверяемые правила (К-xx).
- `anti-slop/BANNED.md` + `QUOTAS.md` — запреты и квоты (B-xx/Q-xx).
- `skills/` — приёмы студии (skill.yaml + templates/ + hooks/).
- `validators/constitution.mjs` — тот же набор правил как ESM-модуль.
- `scripts/validate.mjs` / `scripts/lint-slop.mjs` — приёмка (exit 0 = принято).
- `projects/dogovor-postavki/` — демо-проект, проходящий приёмку.

## Приёмка

```text
node scripts/validate.mjs projects/dogovor-postavki
node scripts/lint-slop.mjs projects/dogovor-postavki
node --test tests/*.test.mjs
```
