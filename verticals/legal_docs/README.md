# Юридическая студия · `verticals/legal_docs`

Готовит договоры, политики и претензии с проверяемой структурой: разделы, нумерация, реквизиты и ссылка на применимое право — всё машинно проверяется.

## Что внутри

- `vertical.yaml` — метаданные студии (артефакт — `docs/`).
- `CONSTITUTION.md` — проверяемые правила (К-xx).
- `anti-slop/BANNED.md` + `QUOTAS.md` — запреты и квоты (B-xx/Q-xx).
- `skills/` — 6 приёмов студии (skill.yaml + templates/ + hooks/): `contract-draft`,
  `legal-review`, `requisites`, `dispute-clause`, `pdn-compliance`, `versioning`.
- `validators/constitution.mjs` — тот же набор правил как ESM-модуль.
- `references/` — архив приёмов с RAG-индексом (`metadata/*.yaml`, `INDEX.md`, `.index.json`).
- `scripts/validate.mjs` / `scripts/lint-slop.mjs` / `scripts/lint-quotas.mjs` — приёмка
  (exit 0 = принято; квоты Q-01…Q-05 гоняются через `scripts/quotas.mjs`).
- `tools/requisites-check.mjs` — контрольные суммы ИНН/ОГРН по тексту документа (К-05).
- `projects/dogovor-postavki/` и `projects/agentskij-dogovor/` — демо-проекты, проходящие приёмку.

## Приёмка

```text
node scripts/validate.mjs projects/dogovor-postavki
node scripts/validate.mjs projects/agentskij-dogovor
node scripts/lint-slop.mjs projects/agentskij-dogovor
node scripts/lint-quotas.mjs projects/agentskij-dogovor
node tools/requisites-check.mjs projects/agentskij-dogovor/docs/dogovor.md
node --test tests/*.test.mjs
```