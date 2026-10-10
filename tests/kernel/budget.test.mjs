/* tests/kernel/budget.test.mjs — BudgetManager (§4.5): pre-flight, пороги, дневной лимит, отчёты. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BudgetManager } from "../../core/budget/manager.mjs";

test("pre-flight отклоняет оценку, превышающую лимит run", () => {
  const bm = new BudgetManager({ max_cost_usd_per_run: 1 });
  assert.equal(bm.checkBudget("r1", 0.5), true);
  assert.equal(bm.checkBudget("r1", 2), false);
});

test("превышение лимита run поднимает алерт и isRunExceeded", () => {
  const alerts = [];
  const bm = new BudgetManager({ max_cost_usd_per_run: 1, alert_threshold: 0.8 }, { onAlert: (e) => alerts.push(e) });
  bm.recordCost("r1", 0.85);
  assert.equal(bm.isRunExceeded("r1"), false);
  assert.equal(alerts.at(-1)?.kind, "threshold");
  bm.recordCost("r1", 0.2);
  assert.equal(bm.isRunExceeded("r1"), true);
  assert.equal(alerts.at(-1)?.kind, "exceeded");
});

test("дневной лимит блокирует новые запуски", () => {
  const bm = new BudgetManager({ max_cost_usd_per_day: 1, max_cost_usd_per_run: 10 });
  bm.recordCost("r1", 1.0);
  assert.equal(bm.checkBudget("r2", 0.5), false);
});

test("recordIteration сигналит при превышении лимита итераций", () => {
  const bm = new BudgetManager({ max_iterations_per_run: 2 });
  assert.equal(bm.recordIteration("r1"), false);
  assert.equal(bm.recordIteration("r1"), false);
  assert.equal(bm.recordIteration("r1"), true);
});

test("getUsageReport суммирует расход по runs", () => {
  const bm = new BudgetManager({});
  bm.recordCost("a", 0.3, 100);
  bm.recordCost("b", 0.2, 50);
  const report = bm.getUsageReport(1);
  assert.equal(report.total_cost_usd, 0.5);
  assert.equal(report.total_tokens, 150);
  assert.equal(report.runs, 2);
});

test("состояние восстанавливается из state_file", () => {
  const dir = mkdtempSync(join(tmpdir(), "ceh-budget-"));
  const stateFile = join(dir, "budget.json");
  try {
    const first = new BudgetManager({ state_file: stateFile });
    first.recordCost("r1", 0.7, 10);
    const second = new BudgetManager({ state_file: stateFile });
    assert.equal(second.getUsageReport(1).total_cost_usd, 0.7);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
