# STRUCTURE.md — структура артефакта «Ивакуатор»

## Состав артефакта (app/)

| Файл | Назначение | Законы |
|---|---|---|
| `app/index.html` | Один экран: заголовок, цена/время, форма адреса, статус | К-01, К-02, К-20 |
| `app/app.js` | Логика: платформенный адаптер, обработчики, симуляция статусов | К-06, К-07, К-14, К-18 |
| `app/style.css` | var(--tg-theme-*), safe-area, media 320/375/420, тач-таргеты ≥44px | К-01, К-03, К-05, К-21 |
| `app/theme.json` | Токены светлой/тёмной темы + contrast ≥4.5:1 | К-21 |
| `app/sw.js` | Кэш оболочки (cache-first) | К-12 |
| `app/server.mjs` | HMAC-SHA256 проверка initData (Telegram) + VK sign | К-15 |
| `app/bundle-size.json` | gzip_kb < 300, localstorage_kb ≤ 2048 | К-08, Q-01 |
| `app/lighthouse.json` | tti_ms < 2000 | К-08 |
| `app/devices-report.json` | ≥ 4 устройства (320/375/420/768) | К-01 |
| `app/devices.md` | Описание устройств и статусов | — |
| `README.md` | Описание проекта, платформы, запуск | — |

## Экраны (V-19)

1. **Главный**: название «Ивакуатор», цена «от 2 500 ₽», время «25–40 мин», кнопка «Вызвать эвакуатор» (MainButton).
2. **Форма адреса**: поле ввода адреса, кнопка «Подтвердить адрес».
3. **Статус**: «Эвакуатор выехал — будет через 25 минут», кнопка «Отменить» (BackButton).
4. **Оплата**: openInvoice (Telegram) / кнопка «Оплатить» (VK, заглушка).

## Платформенный адаптер (VK + Telegram + web)

```js
const platform = window.vkBridge ? "vk" : window.Telegram?.WebApp ? "telegram" : "web";
```

- Telegram: `tg.MainButton`, `tg.BackButton`, `tg.HapticFeedback`, `tg.openInvoice`, `tg.sendData`.
- VK: `vkBridge.send("WebAppGetUserInfo")`, `vkBridge.subscribe("VKWebAppUpdateConfig")`.
- Web: fallback на localStorage.

## Список проверок

- **V-01…V-21**: `scripts/validate.mjs`
- **B-01…B-05**: `scripts/lint-slop.mjs`
- **Q-01…Q-05**: `scripts/lint-quotas.mjs`
- **lint-copy**: 0 ошибок (A-xx), балл ≥ 80
- **Цикл**: `node core/loop-engine/cli.mjs projects/evakuator-vk --studio-root verticals/mini_apps` → exit 0

## Приёмные источники (references/)

- REF-01: один экран — одна задача
- REF-02: мгновенный отклик (<100 мс)
- REF-04: openInvoice/sendData + HMAC
- REF-05: viewport-safearea
- REF-06: offline-sw
- REF-12: contrast ≥ 4.5:1
- REF-14: CTA — один primary, конкретика цифрами
- REF-15: prefers-reduced-motion
- REF-16: текст без следов ИИ
