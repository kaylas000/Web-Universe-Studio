# CONSTITUTION.md — закон студии «Студия мини-приложений»

Проверяемые правила вертикали `mini_apps`: каждое связано с детерминированной проверкой
в `scripts/validate.mjs` (V-xx) или `scripts/lint-slop.mjs` (B-xx). Правило без проверки — пожелание.

## Статьи

- **К-01. Структура.** Приложение состоит из index.html, app.js и style.css.
- **К-02. Разделение.** Разметка не содержит обработчиков onclick: они навешиваются в app.js.
- **К-03. Современный JS.** Скрипт использует let/const, а не var.
- **К-04. Отклик.** Интерактив реализован через addEventListener, а не через alert.
- **К-05. Стиль.** Стиль без transition: all и без !important.
- **К-06. Заголовок.** У страницы есть <title>.

## Приёмка

1. Проект не сдаётся, пока `node scripts/validate.mjs projects/<имя>` не вернул `exit 0`.
2. `node scripts/lint-slop.mjs projects/<имя>` печатает `чисто:`.
3. Цикл принуждения: `node core/loop-engine/cli.mjs projects/<имя> --studio-root verticals/mini_apps`.
