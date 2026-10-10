# SKILL-INDEX — приёмы студии «Студия мини-приложений»

Реестр приёмов вертикали `mini_apps` (§11 ТЗ). Один приём = директория
`skills/<id>/`: `skill.yaml` (метаданные) + `templates/*.j2` (шаблоны ролей) +
`hooks/*.mjs` (ESM-крючки `pre_execute`/`post_execute`).

| Приём | Назначение | Шаги |
|---|---|---|
| `single-page-app` | Собирает мини-приложение: разметка, скрипт с addEventListener, стиль. | Собрать разметку → Навесить обработчики через addEventListener → Оформить стиль без transition: all → Проверить анти-слоп |
| `a11y-pass` | Приём студии «Студия мини-приложений»: a11y-pass. | — |

Загрузчик — `core/loop-engine/skills.mjs`; рендер шаблонов — `core/loop-engine/template.mjs`.
