# tools студии «Студия данных»

Утилиты студии, которые можно звать из кода/CLI (приёмка живёт в `scripts/`; общие
инварианты гоняет `core/gate.mjs` по `scripts/validate.mjs` и `scripts/lint-slop.mjs`).

## explain-lint.mjs

Эвристики по плану запроса `EXPLAIN ANALYZE` (К-04, К-12, К-13):

```bash
node tools/explain-lint.mjs projects/sales-dashboard/analysis/plan.txt
node tools/explain-lint.mjs plan.txt --big=payments,refunds,orders --budget-ms=5000
```

- находит узлы плана: Seq Scan / Index Scan / Bitmap Heap Scan / Hash / Join-узлы;
- флагает `Seq Scan` по «большим» таблицам (по умолчанию payments, refunds, orders, deliveries);
- контролирует `Execution Time` против бюджета (`--budget-ms`);
- exit 0 — план в норме; 1 — есть нарушения; 2 — нет аргумента.

ESM-API: `parsePlan(text)` → `{ nodes, executionMs, planningMs }`, `lintPlan(text, opts)` → `{ ok, findings, plan }`.

## Прогон по всем анализам

Линтер используется и декларативно: `scripts/quotas.mjs` (Q-01/Q-02) читает тот же
формат плана через `core/vertical-kit` (`planExecutionTimeUnder`, `regexAbsent`).