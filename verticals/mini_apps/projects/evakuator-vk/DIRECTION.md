# DIRECTION.md — направление проекта «Ивакуатор»

## Образ результата

Мини-приложение «Ивакуатор» — сервис срочного вызова эвакуатора для водителей в Москве и Химках. Водитель открывает приложение, видит цену и время подачи сразу на главном экране (К-23), нажимает одну кнопку «Вызвать эвакуатор» (MainButton, К-20), указывает адрес и видит статус: «Эвакуатор выехал, будет через 25 минут».

## Почему кросс-платформенный (VK + Telegram)

- Студия `mini_apps` кросс-платформенная по ТЗ (§7).
- Гейт V-16: если README упоминает VK, нужен `vk-bridge`. VK Mini Apps используют VK Bridge, Telegram — WebApp SDK.
- Единственный вариант, проходящий все гейты: VK Bridge + Telegram WebApp SDK + web-fallback для локального предпросмотра.

## Платформенный адаптер

```js
const platform = window.vkBridge ? "vk" : window.Telegram?.WebApp ? "telegram" : "web";
```

- **Telegram**: `tg.MainButton`, `tg.BackButton`, `tg.HapticFeedback`, `tg.openInvoice`, `tg.sendData`, `tg.CloudStorage`.
- **VK**: `vkBridge.send("WebAppGetUserInfo")`, `vkBridge.send("WebAppSetTitle")`, `vkBridge.send("WebAppShare")`, `vkBridge.subscribe("VKWebAppUpdateConfig")` для темы.
- **Web**: кнопки активны, нативные SDK не вызываются, состояние сохраняется в localStorage.

## Границы

- Один главный экран с нативным CTA (К-20, REF-01).
- Форма адреса — встроенный блок, не модалка (B-05).
- Отслеживание — локальная симуляция статусов (реальные данные — потом, когда доступы появятся).
- Оплата — Telegram Payments (`openInvoice`/`sendData`) для Telegram; для VK — нативная кнопка «Оплатить» с заглушкой (VK Pay требует доступов).

## Что НЕ делаем

- Не делаем несколько экранов с навигацией (один экран — одна задача).
- Не используем `alert`/`confirm`/`prompt` (К-14).
- Не делаем редиректы через `window.location.href` (B-03).
- Не генерируем текст с ИИ-паттернами (REF-16, lint-copy).
