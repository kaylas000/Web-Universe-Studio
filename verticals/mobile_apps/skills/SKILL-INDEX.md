# SKILL-INDEX — реестр приёмов студии «Студия мобильных приложений»

Один приём = директория `skills/<id>/` с исполнимой частью:
`skill.yaml` (метаданные, коды приёмки, evidence) · `templates/{planner,coder,verifier,fixer}.j2`
(роли цикла) · `hooks/{pre_execute,post_execute}.mjs` (объявление целей и evidence-скан).

Загрузчик — `core/loop-engine/skills.mjs`; проверка признаков — `core/vertical-kit/skill-evidence.mjs`;
связь «статья закона ↔ код ↔ приём» собирает `core/loop-engine/contract.mjs`.

| Приём | id | Что делает | Коды приёмки | Ролей | Крючков |
| --- | --- | --- | --- | --- | --- |
| `a11y-pass` | — |  | V-03, V-08 | 4 | 2 |
| `animation-pass` | — |  | V-25 | 4 | 2 |
| `expert-copywriter` | — |  | A-01, C-01, C-02 | 4 | 2 |
| `i18n-pass` | — |  | V-14 | 4 | 2 |
| `nav-deeplinks` | — |  | V-08, V-09 | 4 | 2 |
| `offline-queue` | — |  | V-07, V-17 | 4 | 2 |
| `screen-composer` | — |  | V-01, V-04 | 4 | 2 |
| `store-release` | — |  | V-20 | 4 | 2 |
| `typography-pass` | — |  | V-24 | 4 | 2 |
| `usability-heuristics` | — |  | V-23 | 4 | 2 |

Всего приёмов: 10. Обновлено: 2026-10-14 (scripts/upgrade_skills.mjs).
