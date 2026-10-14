# Эвакуатор · VK Mini App (Химки и Москва)

Мини-приложение срочного вызова эвакуатора. Работает как **VK Mini App**
(подключение через `@vkontakte/vk-bridge`) и как Telegram Mini App
(Telegram WebApp SDK). Без сборщика: разметка, скрипт и стиль.

## Платформа

- **VK Mini Apps:** мост `vk-bridge` — `VKWebAppInit`, haptic (`VKWebAppTapticImpactOccurred`),
  открытие ссылок (`VKWebAppOpenLink`), хранилище (`VKWebAppStorageSet/Get`).
- **Telegram WebApp SDK:** MainButton, BackButton, HapticFeedback, CloudStorage.

## Факты (из архива проекта «Ивакуатор»)

- Телефон диспетчера: **+7 977 174-20-50**, круглосуточно, без выходных.
- Зона: Химки, Ховрино, Москва, Московская область.
- Подача: от 31 мин по Химкам и Ховрино.
- Цена: подача по графику — 0 ₽; срочная подача — от 5 000 ₽. Цену называют до выезда.
- Техника: сдвижная платформа с лебёдкой, грузоподъёмность до 10 т.

## Запуск

Откройте `app/index.html` в браузере. В VK — через сообщество (VK Mini App),
в Telegram — через бота.
