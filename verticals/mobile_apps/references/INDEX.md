# INDEX.md — референсы студии «Студия мобильных приложений»

Каждый приём опирается на источник: без источника приём — слоп (К-04). Метаданные — в `references/metadata/*.yaml`.

| Id | Приём | Откуда | Что берём |
| --- | --- | --- | --- |
| ref-01 | thumb-zone | references/sources.yaml#screen-composer | Главные действия — в нижней трети экрана, в зоне большого пальца. |
| ref-02 | platform-nav | references/sources.yaml#screen-composer | Навигация следует платформе: таб-бар снизу на iOS, системная панель на Android. |
| ref-03 | touch-target | references/sources.yaml#a11y-pass | Цель нажатия не меньше 44×44 px и отделена от соседей видимым зазором. |
| ref-04 | offline-cache | references/sources.yaml#offline-queue | Offline-режим — кэш последних данных плюс очередь мутирующих запросов: сеть пропала — экран живёт кэшем, запросы уходят при восстановлении (К-07, К-17). |
| ref-05 | store-assets | references/sources.yaml#store-release | Стор принимает приложение по трём артефактам: иконка 1024×1024 без прозрачности, скриншоты 6.5" и 5.5", и описание ценности (К-20). |
| ref-06 | i18n-keys | references/sources.yaml#i18n-pass | Локализация живёт ключами: en.json и ru.json — единственный источник текста, в коде только ключи, без хардкода строк (К-14, B-04). |
