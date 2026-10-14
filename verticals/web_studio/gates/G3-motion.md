# G3 — Движение

## Цель
Движение как часть направления, а не украшение: 1–3 рецепта, кривые из реестра.

## Вход
G2 принят

## Чек-лист
1. Выбрано 1–3 рецепта, не больше одного reveal-приёма на секцию (Q-01, Q-02, К-06)
   `@check motion-recipes min=1 max=3`
2. Нет конфликтов dont_combine_with (К-06, Q-02)
   `@check dont-combine`
3. Все easing из easing-curves.json (К-05, V-06)
   `@check easing-registry`
4. Motion-карта записана в SOURCES.md
   `@check motion-map`
5. prefers-reduced-motion учтён
   `@check reduced-motion`

## Выходной артефакт
motion-карта в SOURCES.md

## Критерии отказа
Дефолтные easing или «всё сразу» — возврат.
Прогон: `node cli/main.mjs gates G3 --studio web_studio --project <имя>`.
