# Контент-студия · `verticals/content_studio`

Пишет посты и статьи с проверяемой структурой: заголовок, лид, подзаголовки, метаданные, источники и призыв к действию — без штампов.

## Что внутри

- `vertical.yaml` — метаданные студии (артефакт — `content/`).
- `CONSTITUTION.md` — проверяемые правила (К-xx).
- `anti-slop/BANNED.md` + `QUOTAS.md` — запреты и квоты (B-xx/Q-xx).
- `skills/` — 6 приёмов студии (skill.yaml + templates/ + hooks/): `longform-post`,
  `copy-edit`, `seo-meta`, `link-audit`, `typography`, `cta-analytics`.
- `references/` — 6 референсов с takeaway (метаданные + RAG-индекс).
- `validators/constitution.mjs` — тот же набор правил как ESM-модуль.
- `scripts/validate.mjs` / `scripts/lint-slop.mjs` / `scripts/lint-quotas.mjs` —
  приёмка V-xx, запреты B-xx и квоты Q-xx (exit 0 = принято).
- `tools/typographer.mjs` — типографика текста (К-13) из CLI или как ESM-модуль.
- `projects/post-bez-shablonov/` и `projects/seo-tekst-i-dannye/` — демо-проекты,
  проходящие приёмку.

## Приёмка

```text
node scripts/validate.mjs projects/post-bez-shablonov
node scripts/validate.mjs projects/seo-tekst-i-dannye
node scripts/lint-slop.mjs projects/seo-tekst-i-dannye
node scripts/lint-quotas.mjs projects/seo-tekst-i-dannye
node --test tests/*.test.mjs
```