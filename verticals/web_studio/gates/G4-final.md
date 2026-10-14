# G4 — Финал

## Цель
Принимается только то, что прошло валидатор и арт-директора.

## Вход
Сборка готова

## Чек-лист
1. validate.mjs зелёный целиком: документы, SEO, перфоманс, формы (V-01…V-25, К-14, К-15, К-21)
   `@check studio-script script=validate.mjs`
2. lint-slop чист (B-01…B-16)
   `@check studio-script script=lint-slop.mjs`
3. diff-projects: сходство ≤10% (V-09, К-03)
   `@check similarity max=10`
4. REVIEW.md: вердикт со ссылками на правила (V-08, К-09)
   `@check review-verdict min=2`
5. Удачное изъято в архив (К-11)
6. Цикл сошёлся (К-21, V-24): `node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project` → exit 0, evidence в `workspace/loop-result.json`
   `@check loop-evidence`
7. Маркетинговая воронка, UVP и аналитика каждой кнопки (К-16, M-01, M-02)
   `@check studio-script script=lint-marketing.mjs`
8. Доступность и тач-зоны воротами реестра (Q-08, Q-12)
   `@check registry-gates names=a11y_contrast,touch_target`
9. Ошибки ловятся дешёвым слоем: CI-гейт, секреты, битые ссылки (К-15, V-25)
   `@check repo-hygiene`

## Выходной артефакт
REVIEW.md + принятый проект

## Критерии отказа
Любое нарушение CONSTITUTION без фикса — возврат.
Прогон: `node cli/main.mjs gates G4 --studio web_studio --project <имя>`.
