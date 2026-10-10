# SOURCES.md · PRJ-03 · Цех лазерной резки

Каждая строка: решение → источник. Приём без источника — слоп (К-04).

## Композиция

| решение | источник |
|---|---|
| лист с раскладкой деталей вместо hero | references/industrial/REF-07.meta.yaml · skills/industrial-passport/SKILL.md |
| левая рейка с индексом и телефоном на всём скролле | references/editorial/REF-02.meta.yaml |
| ломаная сетка, блоки на 5 из 12 и 7 из 12 колонок | skills/broken-grid/SKILL.md |
| индекс материалов строками, а не карточками | references/editorial/REF-02.meta.yaml |
| закреплённая плита паспорта, шаг меняет одно значение | references/scroll-story/REF-01.meta.yaml |
| заголовок капс 9vw с переносом по смыслу, офсетный фон | references/poster-type/REF-05.meta.yaml |
| калькулятор с массой и инерцией цифры | references/play/REF-04.meta.yaml |
| плотность записей в разделе «Как добраться» | references/archive/REF-06.meta.yaml |

## Движение

Motion-карта G3. Три рецепта (Q-01), конфликтов `dont_combine_with` нет.

| рецепт | источник | применение |
|---|---|---|
| sticky-scene | motion/recipes/sticky-scene/recipe.yaml | плита паспорта закреплена, пять шагов допусков, по одному значению на шаг |
| scramble-decode | motion/recipes/scramble-decode/recipe.yaml | коды шагов маршрута собираются как табло ЧПУ |
| counter-tick | motion/recipes/counter-tick/recipe.yaml | цена в калькуляторе докручивается при смене толщины и объёма |

Кривые — motion/easing-curves.json: ceh-brake, ceh-drag, ceh-snap.
Браузерные дефолты `ease`, `ease-in-out`, `cubic-bezier(0.4,0,0.2,1)` запрещены (К-05, B-02).
`prefers-reduced-motion` гасит всё (К-19).

## Скилы

| решение | источник |
|---|---|
| первый экран как документ профессии | skills/industrial-passport/SKILL.md |
| фильтр и матрица материалов | skills/comparison-matrix/SKILL.md |
| калькулятор с мгновенным перерасчётом и захватом | skills/value-calculator/SKILL.md |
| пять UX-состояний калькулятора и формы | skills/ux-states/SKILL.md |
| система доказательств, отзывы и цифры со сноской | skills/proof-engine/SKILL.md |
| инженерный копирайтинг, ГОСТы и единицы измерения | skills/industrial-copy/SKILL.md |
| микрокопия кнопок, ошибок и подтверждений | skills/ux-writing/SKILL.md |
| наратив маршрута из четырёх шагов | skills/case-storytelling/SKILL.md |
| асимметричная сетка с левой рейкой | skills/broken-grid/SKILL.md |

## Стили

| решение | источник |
|---|---|
| шрифтовая пара Tektur и IBM Plex Sans с ролями display и body | assets/fonts/PAIRS.md |
| woff2 скачаны в `site/fonts/`, SRI sha384 на preload, сторонних запросов нет | assets/fonts/PAIRS.md |
| зерно T-01, feTurbulence baseFrequency 0.8 | assets/textures/grain.md |
| палитра: бумага и сталь из постерного референса | references/poster-type/REF-05.meta.yaml |
| акцент линии реза из референса play | references/play/REF-04.meta.yaml |
| шкала отступов 0…256 | tokens/spacing.tokens.json |
| цвета в OKLCH, каскадные слои, контейнерные запросы | css-architecture/layers-fluid.css |

## Цифры заказчика

Все числа на странице идут со сноской (B-21). Источник один: сайт заказчика
https://ceh-lazer-rezka.ru и его страница материалов https://ceh-lazer-rezka.ru/materials/

| число | где применяется | источник |
|---|---|---|
| 3 кВт, 3000 × 1500 мм, ±0.01 мм, до 30 м/мин | штампы развророта | https://ceh-lazer-rezka.ru/services/metal/ |
| 1…20 мм, 1…12 мм, 1…10 мм | толщины материалов | https://ceh-lazer-rezka.ru/materials/ |
| 56, 70, 73, 85 ₽/пог.м | базовые цены | https://ceh-lazer-rezka.ru/materials/ |
| скидки −15 % и −20 %, наценка +40 % | сетка доказательств | https://ceh-lazer-rezka.ru/materials/ |
| 3000 ₽ минимальный заказ | форма расчёта | https://ceh-lazer-rezka.ru/materials/ |
| более 500 заказов, 4.9 по 47 отзывам, с 2020 года | полоса фактов | https://ceh-lazer-rezka.ru/ |
| допуски ±0.01 мм, ±1°, ±0.3 мм, ±0.5 мм | паспорт детали | https://ceh-lazer-rezka.ru/services/metal/ |
| Голицыно, Заводской проспект 34, Пн–Пт 09:00…18:00 | контакты | https://ceh-lazer-rezka.ru/contacts/ |

## SEO (К-13)

| решение | источник |
|---|---|
| title 50…60 знаков, description 120…158 знаков | ai-agent-rules/ |
| JSON-LD LocalBusiness и Service по типу страницы | generators/structured-data/SchemaFactory.js |
| девять районов обслуживания списком, без пустых дверей | references/archive/REF-06.meta.yaml |
| 25 внутренних переходов между разделами одной страницы | references/editorial/REF-02.meta.yaml |
| sitemap.xml и robots.txt на выдачу | generators/SitemapGenerator.js |

## Производственный контракт (PRJ-03)

Ворота: G1 (DIRECTION + MARKETING) → G2 (STRUCTURE) → G3 (движение, три рецепта)
→ сборка site/ → G4 (REVIEW).
Цикл принуждения К-21: `node core/loop-engine/cli.mjs projects/lazer-rezka --validator ceh_project`,
exit 0 обязателен, evidence в workspace/loop-result.json.
