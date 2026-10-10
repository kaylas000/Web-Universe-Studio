# CONSTITUTION.md — закон студии «Студия мини-приложений»

Полные статьи вертикали `mini_apps` (§9 ТЗ). Проверка статьи — метод из ТЗ (графа «Проверка»):
детерминированный офлайн-набор `scripts/validate.mjs` (коды `V-xx`) реализует подмножество статей;
остальные исполняются на платформенном тире (LLM-judge / песочница / устройства, §14 ТЗ).

## Статьи

- **К-01. Viewport Telegram.** Адаптация под viewport Telegram: корректный рендер на 320px, 375px, 420px без горизонтального скролла. *Проверка:* Playwright, 3 viewport'а + скриншоты.
- **К-02. Нативная интеграция SDK.** Нативная интеграция SDK: MainButton, BackButton, HapticFeedback вместо кастомных кнопок внизу. *Проверка:* статический анализ JS.
- **К-03. Темы Telegram.** Поддержка тем Telegram через theme_params / CSS-переменные. *Проверка:* наличие var(--tg-theme-*).
- **К-04. TTI.** TTI < 2 c на 3G. *Проверка:* Lighthouse Mobile + throttling.
- **К-05. Safe area клавиатуры.** Safe area для клавиатуры: поля не перекрываются. *Проверка:* env(safe-area-inset-bottom).
- **К-06. viewportChanged.** Обработка viewportChanged (клавиатура/высота). *Проверка:* подписка на событие.
- **К-07. Оплата.** Оплата — через Telegram Payments (openInvoice/sendData), не внешние ссылки. *Проверка:* наличие вызовов.
- **К-08. Бандл.** JS-бандл < 300KB gzipped. *Проверка:* bundle-analyzer.
- **К-09. Навигация BackButton.** Корректная навигация через BackButton и обработка web_app_data. *Проверка:* обработчики BackButton.onClick.
- **К-10. Ссылки в WebView.** Все ссылки открываются внутри WebView или через openLink (нет target="_blank" без SDK). *Проверка:* regex + скан DOM.
- **К-11. Тач-таргеты.** Тач-таргеты ≥ 44×44px. *Проверка:* статический анализ CSS.
- **К-12. Offline.** Базовый offline через Service Worker. *Проверка:* Lighthouse PWA.
- **К-13. Сохранение состояния.** При закрытии состояние сохраняется через sendData/mainButtonClicked. *Проверка:* наличие обработчика.
- **К-14. Без alert/confirm/prompt.** Запрещены alert(), confirm(), prompt() — только нативные popup Telegram. *Проверка:* regex.
- **К-15. Валидация initData.** Бэкенд валидирует initData через HMAC-SHA256. *Проверка:* наличие проверки подписи.
- **К-16. VK Bridge.** Для VK — обязателен vk-bridge для всех API-вызовов. *Проверка:* импорт @vkontakte/vk-bridge.
- **К-17. Реальные устройства.** Тесты на реальных устройствах: iOS (Safari WebView) и Android (Chrome WebView), 4 устройства. *Проверка:* скриншоты.
- **К-18. Без утечек памяти.** Нет утечек памяти при многократном открытии/закрытии (3 итерации). *Проверка:* Chrome DevTools Memory profiler.

**Гейты:** G1 Бриф/тип продукта → G2 Экраны/навигация → G3 Сборка/вьюпорты → G4 Устройства.

## Приёмка

1. Проект не сдаётся, пока `node scripts/validate.mjs projects/<имя>` не вернул `exit 0`.
2. `node scripts/lint-slop.mjs projects/<имя>` печатает `чисто:`.
3. Цикл принуждения: `node core/loop-engine/cli.mjs projects/<имя> --studio-root verticals/mini_apps`.
