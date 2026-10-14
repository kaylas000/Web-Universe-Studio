# SKILL-INDEX — реестр приёмов студии «Студия мини-приложений»

Один приём = директория `skills/<id>/` с исполнимой частью:
`skill.yaml` (метаданные, коды приёмки, evidence) · `templates/{planner,coder,verifier,fixer}.j2`
(роли цикла) · `hooks/{pre_execute,post_execute}.mjs` (объявление целей и evidence-скан).

Загрузчик — `core/loop-engine/skills.mjs`; проверка признаков — `core/vertical-kit/skill-evidence.mjs`;
связь «статья закона ↔ код ↔ приём» собирает `core/loop-engine/contract.mjs`.

| Приём | id | Что делает | Коды приёмки | Ролей | Крючков |
| --- | --- | --- | --- | --- | --- |
| `a11y-pass` | — |  | V-03, V-11 | 4 | 2 |
| `conversion` | — |  | V-20, V-23 | 4 | 2 |
| `expert-copywriter` | — |  | A-01, A-03, B-06, B-07, C-01, C-02, C-03, C-05, C-07, C-09, C-13 | 4 | 2 |
| `motion-pass` | — |  | V-24 | 4 | 2 |
| `offline-worker` | — |  | Q-05, V-12, V-13 | 4 | 2 |
| `payments` | — |  | V-07, V-15 | 4 | 2 |
| `single-page-app` | — |  | Q-01, Q-02, Q-03, Q-04, V-01, V-02, V-04, V-08, V-18 | 4 | 2 |
| `telegram-sdk` | — |  | B-03, V-02, V-03, V-06, V-16 | 4 | 2 |
| `usability-heuristics` | — |  | B-05, B-08, B-09, V-19, V-22 | 4 | 2 |
| `viewport-adaptive` | — |  | B-04, V-01, V-05, V-06, V-17 | 4 | 2 |

Всего приёмов: 10. Обновлено: 2026-10-14 (scripts/upgrade_skills.mjs).
