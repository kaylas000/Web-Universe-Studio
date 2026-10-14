# REVIEW.md — вердикт артдиректора «Ивакуатор»

## Вердикт: ПРИНЯТ

Проект «Ивакуатор» прошёл полный цикл студии `mini_apps` и принимается.

## Пройденные этапы (Definition of Done)

| Этап | Статус | Подтверждение |
|---|---|---|
| BRIEF.md | ✓ | 6 пунктов, задача и артефакт заданы |
| DIRECTION.md → G1 | ✓ | Кросс-платформенный VK+Telegram, один экран, нативный CTA |
| STRUCTURE.md → G2 | ✓ | 11 файлов app/, 4 экрана, список проверок V-xx |
| G3 артефакт | ✓ | validate 24/24 · lint-slop чисто · lint-copy 0 ошибок · lint-quotas 5/5 |
| Цикл принуждения | ✓ | `cli.mjs` → exit 0, успех на итерации 1 |
| REVIEW.md → G4 | ✓ | Настоящий документ |

## Соответствие законам CONSTITUTION

| Закон | Статус | Где реализован |
|---|---|---|
| К-01 (320/375/420) | ✓ | style.css media-запросы; validate V-01 |
| К-02 (один экран — одна задача) | ✓ | index.html: один main, нативный MainButton |
| К-03 (var(--tg-theme-*)) | ✓ | style.css: все цвета через переменные; V-03 |
| К-05 (safe-area) | ✓ | env(safe-area-inset-bottom); V-05 |
| К-06 (viewportChanged) | ✓ | app.js: tg.onEvent("viewportChanged"); V-06 |
| К-07 (openInvoice/sendData) | ✓ | app.js persist(): sendData + openInvoice path; V-07 |
| К-08 (бандл < 300KB) | ✓ | bundle-size.json: gzip_kb в бюджете; V-08, Q-01 |
| К-14 (без alert/confirm/prompt) | ✓ | lint-slop чисто; V-14 |
| К-15 (HMAC initData) | ✓ | server.mjs: createHmac("sha256"); V-15 |
| К-18 (нет утечек памяти) | ✓ | app.js: removeEventListener в onHide; V-18 |
| К-20 (один primary CTA) | ✓ | MainButton.setText единожды; V-23 |
| К-21 (контраст ≥ 4.5:1) | ✓ | theme.json: contrast-пары; V-21 |
| К-22 (10 эвристик NN/g) | ✓ | статус aria-live, BackButton, haptic, справка; V-22 |
| К-23 (конкретика цифрами) | ✓ | «от 31 мин», «до 10 т», «24/7»; V-23 |
| К-24 (prefers-reduced-motion) | ✓ | style.css: reduce-motion block; V-24 |

## Дизайн-референсы (web_studio/references/)

Приложение построено на двух дизайн-стилях из каталога студии:

| Референс | Палитра | Что применено |
|---|---|---|
| REF-10 (dark) | #0E1116, #E8E6E3, акцент | Тёмная тема по умолчанию (ночной вызов), иерархия через оттенки белого, фон не чисто чёрный |
| REF-07 (industrial) | #17181C, #FF6A2B, #E7E7E2 | Промышленный акцент #FF6A2B, «наряд-заказ» как открывающий экран, рабочая палитра RAL |

Оба стиля — из `verticals/web_studio/references/`, применены через `app/theme.json` и `app/style.css`.

## Приёмные источники (references/)

- REF-01 (one-screen): один экран — вызов эвакуатора
- REF-02 (instant-feedback): каждое изменение select/ввод — мгновенный статус
- REF-04 (invoice-initData): server.mjs HMAC + sendData
- REF-05 (viewport-safearea): safe-area + viewportChanged
- REF-06 (offline-sw): sw.js cache-first
- REF-12 (contrast-ratio): theme.json + расчёт в validate
- REF-14 (cta-conversion): один MainButton, CTA-глагол «Отправить»
- REF-15 (motion-reduce): prefers-reduced-motion
- REF-16 (human-voice): lint-copy 0 ошибок, балл 100

## Платформы

- **VK Mini App**: `@vkontakte/vk-bridge` подключён; V-16 пройден.
- **Telegram Mini App**: WebApp SDK; MainButton/BackButton/HapticFeedback.
- **Web** (локальный предпросмотр): fallback на localStorage.

## Что НЕ сделано (осознанно)

- Реальные данные эвакуаторов (геолокация, цена по адресу) — доступы появятся позже. Сейчас — симуляция статусов.
- VK Pay — требует доступов в кабинет разработчика VK. Кнопка «Позвонить диспетчеру» работает через `tel:`.
- Telegram Payments — openInvoice готов, но платёж требует токена бота и реального initData.

## Спорные пункты / точки роста

- **V-19 (состояния экрана)**: реализованы loading/empty/error/success через `data-state` на body и `#note`. Можно усилить визуальное разделение экранов (специфичные стили для каждого состояния).
- **К-22 (справка)**: кнопка «Как это работает» открывает документацию. Можно добавить встроенный блок FAQ.
- **V-23 (конверсия)**: один CTA «Отправить заявку». Можно добавить экран «Отслеживание» после отправки (симуляция статусов «выехал» → «прибыл»).

## Итог

Проект «Ивакуатор» проходит все ворота студии и принимается. Артефакт готов к публикации в VK Mini Apps / Telegram Mini Apps после получения доступов платформ.
