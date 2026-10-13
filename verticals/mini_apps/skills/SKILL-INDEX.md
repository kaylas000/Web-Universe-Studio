# SKILL-INDEX — приёмы студии «Студия мини-приложений»

Реестр приёмов вертикали `mini_apps` (§11 ТЗ). Один приём = директория
`skills/<id>/`: `skill.yaml` (метаданные) + `templates/*.j2` (шаблоны ролей) +
`hooks/*.mjs` (ESM-крючки `pre_execute`/`post_execute`).

| Приём | Назначение | Шаги |
|---|---|---|
| `single-page-app` | Собирает мини-приложение: разметка, скрипт с addEventListener, стиль. | Разобрать бриф → Собрать разметку → Навесить обработчики → Оформить стиль → Добавить sw.js/server.mjs/отчёты → Проверить анти-слоп и квоты |
| `a11y-pass` | Доводит доступность: фокус, тач-таргеты ≥ 44px, контраст тем Telegram. | Скан интерактивных элементов → Тач-таргеты и :hover → Контраст тем → Фокус-стиль → Отчёт a11y-report.md |
| `telegram-sdk` | Интеграция Telegram WebApp SDK: нативные кнопки, темы, высота. | Подключить telegram-web-app.js → MainButton/BackButton/HapticFeedback → var(--tg-theme-*) → safe area и openLink → Проверка приёмки |
| `payments` | Оплата через Telegram Payments (openInvoice/sendData) + HMAC-проверка initData. | Сценарий оплаты → openInvoice/sendData → Без внешних ссылок → HMAC-SHA256 в server.mjs → Проверка V-07/V-15 |
| `viewport-adaptive` | Адаптация 320/375/420, safe area клавиатуры, viewportChanged. | Контрольные точки → media-запросы → env(safe-area-inset-bottom) → viewportChanged → --vh → Проверка V-01/V-05/V-06 |
| `offline-worker` | Базовый offline через Service Worker + сохранение состояния. | Список оболочки → sw.js (cache-first) → регистрация → CloudStorage/sendData → Проверка V-12/V-13 |
| `usability-heuristics` | Эвристики NN/g: статус, выход, распознавание, отклик, справка (К-22). | Карта 10 эвристик → Статус (aria-live) → Выход (BackButton) → Подписи → HapticFeedback → Справка через SDK → Отчёт heuristics-report.md |
| `conversion` | Конверсия: одна цель (MainButton), CTA-глагол (К-20), конкретика цифрами (К-23). | Одна цель → MainButton.setText единожды → regexAbsent на дубль → Число на экране → Отчёт conversion-report.md |

Загрузчик — `core/loop-engine/skills.mjs`; рендер шаблонов — `core/loop-engine/template.mjs`.