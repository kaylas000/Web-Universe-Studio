# INDEX.md — референсы студии «Студия мобильных приложений»

Каждый приём опирается на источник: без источника приём — слоп (К-04). Метаданные — в `references/metadata/*.yaml`.

| Id | Приём | Откуда | Что берём | Снимок |
| --- | --- | --- | --- | --- |
| ref-01 | thumb-zone | references/sources.yaml#screen-composer | Главные действия — в нижней трети экрана, в зоне большого пальца. | [ref-01.png](metadata/ref-01.png) |
| ref-02 | platform-nav | references/sources.yaml#screen-composer | Навигация следует платформе: таб-бар снизу на iOS, системная панель на Android. | [ref-02.png](metadata/ref-02.png) |
| ref-03 | touch-target | references/sources.yaml#a11y-pass | Цель нажатия не меньше 44×44 px и отделена от соседей видимым зазором. | [ref-03.png](metadata/ref-03.png) |
| ref-04 | offline-cache | references/sources.yaml#offline-queue | Offline-режим — кэш последних данных плюс очередь мутирующих запросов: сеть пропала — экран живёт кэшем, запросы уходят при восстановлении (К-07, К-17). | [ref-04.png](metadata/ref-04.png) |
| ref-05 | store-assets | references/sources.yaml#store-release | Стор принимает приложение по трём артефактам: иконка 1024×1024 без прозрачности, скриншоты 6.5" и 5.5", и описание ценности (К-20). | [ref-05.png](metadata/ref-05.png) |
| ref-06 | i18n-keys | references/sources.yaml#i18n-pass | Локализация живёт ключами: en.json и ru.json — единственный источник текста, в коде только ключи, без хардкода строк (К-14, B-04). | [ref-06.png](metadata/ref-06.png) |
| ref-07 | flow-real-apps | references/sources.yaml#mobbin-flows | Флоу рисуй по реальным приложениям: онбординг → чекаут → настройки, по OS, а не из головы (mobbin.com). | [ref-07.png](metadata/ref-07.png) |
| ref-08 | pattern-library | references/sources.yaml#pttrns | Пустые состояния, кнопки и табы берутся из библиотек паттернов, а не придумываются заново (pttrns.com). | [ref-08.png](metadata/ref-08.png) |
| ref-09 | platform-lang | references/sources.yaml#mobile-patterns | iOS и Android говорят по-разному (HIG vs Material): дизайн следует платформе, иначе приложение кажется чужим (mobile-patterns.com). | [ref-09.png](metadata/ref-09.png) |
| ref-10 | store-preview | references/sources.yaml#scrnshts | Превью в сторе — маркетинговые скриншоты 6.5″ и 5.5″ как продающая история, а не снимок экрана (scrnshts.club). | [ref-10.png](metadata/ref-10.png) |
| ref-11 | nav-patterns | references/sources.yaml#uigarage | Навигацию выбирай из проверенных паттернов (Tab Bar, Navigation, Cards), а не изобретай с нуля (uigarage.net). | [ref-11.png](metadata/ref-11.png) |
| ref-12 | mobile-components | references/sources.yaml#collectui-mobile | Компонент мобильного экрана берётся из реальных паттернов (фильтр Mobile), а не рисуется с нуля (collectui.com). | [ref-12.png](metadata/ref-12.png) |
| ref-13 | contrast-ratio | references/sources.yaml#a11y-pass | Контраст текста к фону — не ниже 4.5:1 (WCAG 2.1 AA); пары темы выносятся в токены (app/theme.json) и проверяются расчётом, а не глазами. | [ref-13.png](metadata/ref-13.png) |
| ref-14 | nng-heuristics | references/sources.yaml#nng-heuristics | Десять эвристик NN/g: видимость статуса, соответствие реальному миру, свобода и контроль, консистентность, предотвращение ошибок, распознавание вместо припоминания, гибкость, эстетика, восстановление после ошибки, справка; проверяемое ядро машинизируется прокси-сканом V-23. | [ref-14.png](metadata/ref-14.png) |
| ref-15 | mobile-typography | references/sources.yaml#material-typography | Типографика задаётся явными атрибутами: базовый кегль ≥ 16, контент ≥ 14, интерлиньяж ≥ 20; мелкие кегли и удушающее межстрочное — нарушение норм (V-24). | [ref-15.png](metadata/ref-15.png) |
| ref-16 | rn-animations | references/sources.yaml#rn-animations | Анимация на 60fps — нативный драйвер и кадровая модель: Animated.timing/spring с useNativeDriver: true, requestAnimationFrame/Easing; длинные setTimeout на главном потоке — тормоза (V-25). | [ref-16.png](metadata/ref-16.png) |
| ref-17 | human-voice | references/sources.yaml#humanizer-ru | Экспертный текст без следов ИИ: факты и числа вместо клише, глагол вместо «представляет собой», ноль артефактов копипаста; проверяется детерминированным сканом lint-copy (A-xx/C-xx/N-xx/R-xx, балл 0-100). | [ref-17.png](metadata/ref-17.png) |
