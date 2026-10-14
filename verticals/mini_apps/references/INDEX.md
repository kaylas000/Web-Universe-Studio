# INDEX.md — референсы студии «Студия мини-приложений»

Каждый приём опирается на источник: без источника приём — слоп (К-04). Метаданные — в `references/metadata/*.yaml`.

| Id | Приём | Откуда | Что берём | Снимок |
| --- | --- | --- | --- | --- |
| ref-01 | one-screen | references/sources.yaml#single-page-app | Экран решает одну задачу; вторичные действия уходят в меню, а не теснятся рядом. | [ref-01.png](metadata/ref-01.png) |
| ref-02 | instant-feedback | references/sources.yaml#single-page-app | Каждое нажатие отвечает в пределах 100 мс — сменой состояния, а не спиннером. | [ref-02.png](metadata/ref-02.png) |
| ref-03 | focus-visible | references/sources.yaml#a11y-pass | Фокус виден на каждом интерактивном элементе; порядок обхода совпадает с визуальным. | [ref-03.png](metadata/ref-03.png) |
| ref-04 | invoice-initdata | references/sources.yaml#payments | Оплата — только Telegram Payments: openInvoice/sendData вместо внешних ссылок; перед обработкой платежа бэкенд проверяет подпись initData через HMAC-SHA256. | [ref-04.png](metadata/ref-04.png) |
| ref-05 | viewport-safearea | references/sources.yaml#viewport-adaptive | Адаптация 320/375/420 — media-запросы и ограниченная ширина; низ экрана — через env(safe-area-inset-bottom), высота — через viewportChanged, а не жёсткий 100vh. | [ref-05.png](metadata/ref-05.png) |
| ref-06 | offline-sw | references/sources.yaml#offline-worker | Базовый offline — кэш оболочки в Service Worker (install → addAll, fetch → cache-first) и его регистрация; состояние переживает закрытие через CloudStorage/sendData. | [ref-06.png](metadata/ref-06.png) |
| ref-07 | tma-entry | references/sources.yaml#tma-gallery | Витрина TMA — категория (Shop/Game/Utility/Finance), описание и сразу живая кнопка: понятно за секунду, зачем открывать (tma.gallery). | [ref-07.png](metadata/ref-07.png) |
| ref-08 | tma-review | references/sources.yaml#miniapp-cafe | Обзор мини-приложения начинается с назначения и аудитории, а не с перечисления фич (miniapp.cafe). | [ref-08.png](metadata/ref-08.png) |
| ref-09 | tma-niche-charts | references/sources.yaml#tgstat | Нишу проверяй статистикой RU-сегмента: топ-чарты и онбординги, которые реально привели пользователей (tgstat.ru). | [ref-09.png](metadata/ref-09.png) |
| ref-10 | tma-ui-concept | references/sources.yaml#dribbble-tma | Концепт TMA-интерфейса — платформенная сетка плюс одна яркая деталь, а не перерисовка всего с нуля (dribbble: Telegram Mini App UI). | [ref-10.png](metadata/ref-10.png) |
| ref-11 | tma-case | references/sources.yaml#behance-tma | Кейс мини-приложения убеждает метриками (установки, удержание), а не только скриншотами (behance: Mini app case study). | [ref-11.png](metadata/ref-11.png) |
| ref-12 | contrast-ratio | references/sources.yaml#a11y-pass | Контраст текста к фону — не ниже 4.5:1 (WCAG 2.1 AA); пары темы выносятся в токены (app/theme.json) и проверяются расчётом, а не глазами. | [ref-12.png](metadata/ref-12.png) |
| ref-13 | nng-heuristics | references/sources.yaml#nng-heuristics | Десять эвристик NN/g: видимость статуса, соответствие реальному миру, свобода и контроль, консистентность, предотвращение ошибок, распознавание вместо припоминания, гибкость, эстетика, восстановление после ошибки, справка; проверяемое ядро машинизируется прокси-сканом V-22. | [ref-13.png](metadata/ref-13.png) |
| ref-14 | cta-conversion | references/sources.yaml#baymard-cta | Конверсия — одна цель и конкретика: единственный primary CTA (MainButton), CTA-глагол, число вместо абстракций (baymard.com). | [ref-14.png](metadata/ref-14.png) |
| ref-15 | motion-reduce | references/sources.yaml#wm-3 | Движение уважает систему: лёгкий CSS-отклик, отключаемый через prefers-reduced-motion, и никаких блокирующих задержек в JS (V-24). | [ref-15.png](metadata/ref-15.png) |
| ref-16 | human-voice | references/sources.yaml#humanizer-ru | Экспертный текст без следов ИИ: факты и числа вместо клише, глагол вместо «представляет собой», ноль артефактов копипаста; проверяется детерминированным сканом lint-copy (A-xx/C-xx/N-xx/R-xx, балл 0-100). | [ref-16.png](metadata/ref-16.png) |
