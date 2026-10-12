# tools студии «Студия мини-приложений»

Утилиты студии, которые можно звать из кода/CLI (приёмка живёт в `scripts/`; общие
инварианты гоняет `core/gate.mjs` по `scripts/validate.mjs` и `scripts/lint-slop.mjs`).

## bundle-audit.mjs

Вес бандла мини-приложения (К-08, Q-01):

```bash
node tools/bundle-audit.mjs projects/survey-app
node tools/bundle-audit.mjs projects/survey-app --limit-kb 300
node tools/bundle-audit.mjs .                 # по умолчанию — текущий каталог
```

- декларативный вес из `app/bundle-size.json` (`gzip_kb`);
- фактический gzip артефакта (index.html + app.js + style.css через `node:zlib`);
- контроль лимита 300KB gzip (Q-01);
- exit 0 — бандл в лимите; 1 — превышен; 2 — нет агумента/артефакта.

ESM-API: `auditBundle(projectDir, { limitKb })` → `{ ok, declared, computed, limitKb, files }`.

Связь с приёмкой: `scripts/validate.mjs` (V-08) и `scripts/lint-quotas.mjs` (Q-01) читают
тот же вес декларативно через `core/vertical-kit` (`jsonNumberMax` по `app/bundle-size.json`).