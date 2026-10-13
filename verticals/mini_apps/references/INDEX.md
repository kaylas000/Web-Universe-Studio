# INDEX.md — референсы студии «Студия мини-приложений»

Каждый приём опирается на источник: без источника приём — слоп (К-04). Метаданные — в `references/metadata/*.yaml`.

| Id | Приём | Откуда | Что берём |
| --- | --- | --- | --- |
| ref-01 | one-screen | references/sources.yaml#single-page-app | Экран решает одну задачу; вторичные действия уходят в меню, а не теснятся рядом. |
| ref-02 | instant-feedback | references/sources.yaml#single-page-app | Каждое нажатие отвечает в пределах 100 мс — сменой состояния, а не спиннером. |
| ref-03 | focus-visible | references/sources.yaml#a11y-pass | Фокус виден на каждом интерактивном элементе; порядок обхода совпадает с визуальным. |
| ref-04 | invoice-initdata | references/sources.yaml#payments | Оплата — только Telegram Payments: openInvoice/sendData вместо внешних ссылок; перед обработкой платежа бэкенд проверяет подпись initData через HMAC-SHA256. |
| ref-05 | viewport-safearea | references/sources.yaml#viewport-adaptive | Адаптация 320/375/420 — media-запросы и ограниченная ширина; низ экрана — через env(safe-area-inset-bottom), высота — через viewportChanged, а не жёсткий 100vh. |
| ref-06 | offline-sw | references/sources.yaml#offline-worker | Базовый offline — кэш оболочки в Service Worker (install → addAll, fetch → cache-first) и его регистрация; состояние переживает закрытие через CloudStorage/sendData. |
| ref-07 | tma-entry | references/sources.yaml#tma-gallery | Витрина TMA — категория (Shop/Game/Utility/Finance), описание и сразу живая кнопка: понятно за секунду, зачем открывать (tma.gallery). |
| ref-08 | tma-review | references/sources.yaml#miniapp-cafe | Обзор мини-приложения начинается с назначения и аудитории, а не с перечисления фич (miniapp.cafe). |
| ref-09 | tma-niche-charts | references/sources.yaml#tgstat | Нишу проверяй статистикой RU-сегмента: топ-чарты и онбординги, которые реально привели пользователей (tgstat.ru). |
| ref-10 | tma-ui-concept | references/sources.yaml#dribbble-tma | Концепт TMA-интерфейса — платформенная сетка плюс одна яркая деталь, а не перерисовка всего с нуля (dribbble: Telegram Mini App UI). |
| ref-11 | tma-case | references/sources.yaml#behance-tma | Кейс мини-приложения убеждает метриками (установки, удержание), а не только скриншотами (behance: Mini app case study). |
| ref-12 | contrast-ratio | references/sources.yaml#a11y-pass | Контраст текста к фону — не ниже 4.5:1 (WCAG 2.1 AA); пары темы выносятся в токены (app/theme.json) и проверяются расчётом, а не глазами. |