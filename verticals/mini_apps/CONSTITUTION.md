# CONSTITUTION.md — закон студии «Студия мини-приложений»

Статьи К-01…К-18 — дословно из §9.6 ТЗ. У каждой статьи графа «Проверка» — какой код
`scripts/validate.mjs` (V-xx) её исполняет и где прогоняется остаток (тир/устройства).

## Статьи

- **К-01.** Адаптация под viewport Telegram (320px, 375px, 420px) без горизонтального скролла. *Проверка:* V-01 (прокси: скан CSS media/width; рендер в 3 viewport'ах — Playwright на тире).
- **К-02.** Нативная интеграция SDK: MainButton, BackButton, HapticFeedback вместо кастомных кнопок внизу. *Проверка:* V-02 (статический скан JS).
- **К-03.** Поддержка тем Telegram через theme_params / CSS-переменные var(--tg-theme-*). *Проверка:* V-03 (скан CSS).
- **К-04.** TTI < 2 c на 3G. *Проверка:* V-04 (прокси: app/lighthouse.json от Lighthouse Mobile).
- **К-05.** Safe area для клавиатуры env(safe-area-inset-bottom). *Проверка:* V-05 (скан CSS).
- **К-06.** Обработка viewportChanged (клавиатура/высота). *Проверка:* V-06 (скан JS).
- **К-07.** Оплата — Telegram Payments (openInvoice/sendData), не внешние ссылки. *Проверка:* V-07 (скан JS).
- **К-08.** JS-бандл < 300KB gzipped. *Проверка:* V-08 (прокси: декларативный вес app/bundle-size.json, gzip_kb).
- **К-09.** Корректная навигация через BackButton и обработка web_app_data. *Проверка:* V-09 (скан JS).
- **К-10.** Ссылки открываются внутри WebView или через openLink, нет target="_blank" без SDK. *Проверка:* V-10 (скан HTML/JS).
- **К-11.** Тач-таргеты ≥ 44×44px. *Проверка:* V-11 (прокси: скан CSS min-height; тап — тир).
- **К-12.** Базовый offline через Service Worker. *Проверка:* V-12 (sw.js + регистрация; кэш — Lighthouse PWA).
- **К-13.** Состояние сохраняется через sendData/mainButtonClicked. *Проверка:* V-13 (скан JS).
- **К-14.** Запрещены alert()/confirm()/prompt() — только нативные popup Telegram. *Проверка:* V-14 (скан JS).
- **К-15.** Бэкенд валидирует initData через HMAC-SHA256. *Проверка:* V-15 (скан server.mjs; сам тест — tools/initdata-check.mjs).
- **К-16.** Для VK обязателен vk-bridge для всех API-вызовов. *Проверка:* V-16 (implies: README упоминает VK ⇒ vk-bridge/@vkontakte).
- **К-17.** Тесты на iOS (Safari WebView) и Android (Chrome WebView), 4 устройства. *Проверка:* V-17 (прокси: app/devices-report.json, ≥ 4 устройства; скриншоты — тир).
- **К-18.** Нет утечек памяти при 3 итерациях открытия/закрытия. *Проверка:* V-18 (прокси: очистка таймеров/слушателей в скан-коде; 3 цикла — Memory profiler на тире).

**Гейты:** G1 Бриф/тип продукта → G2 Экраны/навигация → G3 Сборка/вьюпорты → G4 Устройства.

## Приёмка

1. Проект не сдаётся, пока `node scripts/validate.mjs projects/<имя>` не вернул `exit 0` (V-01…V-18).
2. `node scripts/lint-slop.mjs projects/<имя>` печатает `чисто:` (B-01…B-05).
3. `node scripts/lint-quotas.mjs projects/<имя>` завершается `exit 0` (Q-01…Q-05).
4. Цикл принуждения: `node core/loop-engine/cli.mjs projects/<имя> --studio-root verticals/mini_apps`.