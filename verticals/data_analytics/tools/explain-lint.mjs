#!/usr/bin/env node
/* tools/explain-lint.mjs — эвристики по плану запроса EXPLAIN ANALYZE (К-04, К-12, К-13).

   Разбирает текстовый план PostgreSQL: находит узлы сканирования (Seq Scan / Index Scan /
   Bitmap Heap Scan / Hash Join / Nested Loop / Merge Join), извлекает Execution Time и
   проверяет два инварианта:
     • нет Seq Scan по «большим» таблицам (список передаётся опцией --big);
     • Execution Time ≤ бюджета (--budget-ms).

   Это автономная утилита студии, а не часть приёмки: validate.mjs использует те же
   эвристики декларативно. CLI: node tools/explain-lint.mjs <plan.txt> [--big t1,t2] [--budget-ms 5000]
   Выход: 0 — план в норме; 1 — найдены нарушения.
*/

import { readFileSync } from "node:fs";

const NODE_RE = /^\s*(?:->\s*)?(Seq Scan|Index Scan|Bitmap Heap Scan|Hash Join|Nested Loop|Merge Join|Hash|Materialize)\b.*?\bon\s+([A-Za-z_]\w*)/;

/** @param {string} text план запроса */
export function parsePlan(text) {
  const nodes = [];
  let executionMs = null;
  let planningMs = null;
  for (const line of String(text ?? "").split("\n")) {
    const m = line.match(NODE_RE);
    if (m) nodes.push({ type: m[1].trim(), table: m[2] });
    const exec = line.match(/Execution Time:\s*([\d.]+)\s*ms/);
    if (exec) executionMs = Number(exec[1]);
    const plan = line.match(/Planning Time:\s*([\d.]+)\s*ms/);
    if (plan) planningMs = Number(plan[1]);
  }
  return { nodes, executionMs, planningMs };
}

/** @param {string} text @param {{ big?: string[], budgetMs?: number }} [opts] */
export function lintPlan(text, opts = {}) {
  const plan = parsePlan(text);
  const big = new Set((opts.big ?? ["payments", "refunds", "orders", "deliveries"]).map((t) => t.trim()));
  const budgetMs = Number(opts.budgetMs ?? 5000);
  const findings = [];
  for (const node of plan.nodes) {
    if (node.type === "Seq Scan" && big.has(node.table)) {
      findings.push(`Seq Scan по большой таблице «${node.table}» — нужен индекс/фильтр (К-04)`);
    }
  }
  if (plan.executionMs === null) findings.push("нет Execution Time в плане (К-04)");
  else if (plan.executionMs > budgetMs) findings.push(`Execution Time ${plan.executionMs} ms > бюджета ${budgetMs} ms (К-13)`);
  return { ok: findings.length === 0, findings, plan };
}

function main(argv) {
  const only = argv.find((a) => !a.startsWith("--"));
  if (!only) {
    process.stderr.write("укажите путь к plan.txt: node tools/explain-lint.mjs <plan.txt> [--big t1,t2] [--budget-ms 5000]\n");
    return 2;
  }
  const big = (argv.find((a) => a.startsWith("--big=")) ?? "").split("=")[1]?.split(",") ?? [];
  const budgetArg = (argv.find((a) => a.startsWith("--budget-ms=")) ?? "").split("=")[1];
  const text = readFileSync(only, "utf8");
  const res = lintPlan(text, { big: big.length ? big : undefined, budgetMs: budgetArg ? Number(budgetArg) : undefined });
  const plan = res.plan;
  process.stdout.write(`план: узлов ${plan.nodes.length}, Execution Time ${plan.executionMs ?? "—"} ms\n`);
  for (const node of plan.nodes) process.stdout.write(`  ${node.type} on ${node.table}\n`);
  if (res.ok) {
    process.stdout.write("ИТОГ: план в норме · exit 0\n");
    return 0;
  }
  for (const f of res.findings) process.stdout.write(`FAIL ${f}\n`);
  process.stdout.write("ИТОГ: план нарушает инварианты · exit 1\n");
  return 1;
}

const invokedDirectly = process.argv[1] ? process.argv[1].endsWith("explain-lint.mjs") : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { parsePlan, lintPlan };