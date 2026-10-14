# SKILL-INDEX — реестр приёмов студии «Студия мобильных приложений»

Один приём = директория `skills/<id>/` с исполнимой частью:
`skill.yaml` (метаданные, коды приёмки, evidence) · `templates/{planner,coder,verifier,fixer}.j2`
(роли цикла) · `hooks/{pre_execute,post_execute}.mjs` (объявление целей и evidence-скан).

Загрузчик — `core/loop-engine/skills.mjs`; проверка признаков — `core/vertical-kit/skill-evidence.mjs`;
связь «статья закона ↔ код ↔ приём» собирает `core/loop-engine/contract.mjs`.

| Приём | id | Что делает | Коды приёмки | Ролей | Крючков |
| --- | --- | --- | --- | --- | --- |
| `a11y-pass` | — |  | V-03, V-08 | 4 | 2 |
| `animation-pass` | — |  | Q-07, V-25 | 4 | 2 |
| `expert-copywriter` | — |  | A-01, B-07, B-08, B-12, C-01, C-02, C-03, C-05, C-07, C-09, C-13 | 4 | 2 |
| `i18n-pass` | — |  | V-14 | 4 | 2 |
| `nav-deeplinks` | — |  | Q-05, V-08, V-09 | 4 | 2 |
| `offline-queue` | — |  | Q-06, V-07, V-17 | 4 | 2 |
| `screen-composer` | — |  | B-01, B-02, B-03, B-06, Q-03, Q-04, V-01, V-04 | 4 | 2 |
| `store-release` | — |  | B-11, Q-01, Q-02, V-20 | 4 | 2 |
| `typography-pass` | — |  | V-24 | 4 | 2 |
| `usability-heuristics` | — |  | B-05, B-09, B-10, V-23 | 4 | 2 |

Всего приёмов: 10. Обновлено: 2026-10-14 (scripts/upgrade_skills.mjs).
