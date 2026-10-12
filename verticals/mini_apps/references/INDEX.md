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