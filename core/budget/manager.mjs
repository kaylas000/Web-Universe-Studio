/* ЦЕХ · Метаплатформа — core/budget/manager.mjs
   BudgetManager (§4.5 ТЗ): лимиты на run / день / токены-в-минуту / итерации, алерт при 80 %,
   пауза при превышении. Расширяет бюджеты раннера: результат при превышении — LoopResult
   { ok:false, reason:"E-BUDGET" }-совместимый код.

   Ноль зависимостей. Состояние — в памяти (итерация живёт в процессе), опционально — файл.

   Пример:
     const budget = new BudgetManager({ max_cost_usd_per_day: 20, max_cost_usd_per_run: 2 });
     if (!budget.checkBudget("run-1", 0.5)) { ... }   // false → пауза
     budget.recordCost("run-1", 0.5, 12000);
*/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const BUDGET_EXCEEDED = "E-BUDGET";

/** @typedef {{ max_cost_usd_per_day?: number, max_cost_usd_per_run?: number, max_tokens_per_minute?: number, max_iterations_per_run?: number, alert_threshold?: number, alert_webhook_url?: string, state_file?: string }} BudgetConfig */

export class BudgetManager {
  /** @param {BudgetConfig} config */
  constructor(config = {}, deps = {}) {
    this.config = {
      max_cost_usd_per_day: num(config.max_cost_usd_per_day, 20),
      max_cost_usd_per_run: num(config.max_cost_usd_per_run, 2),
      max_tokens_per_minute: num(config.max_tokens_per_minute, 400000),
      max_iterations_per_run: num(config.max_iterations_per_run, 10),
      alert_threshold: num(config.alert_threshold, 0.8),
      alert_webhook_url: config.alert_webhook_url ?? null,
      state_file: config.state_file ?? null,
    };
    /** @type {(event: {kind: string, runId: string, ratio: number, message: string }) => void} */
    this.onAlert = deps.onAlert ?? (() => {});
    this.now = deps.now ?? (() => Date.now());
    /** @type {Map<string, { cost: number, tokens: number, iterations: number }>} */
    this.runs = new Map();
    /** @type {Array<{ ts: number, runId: string, cost: number, tokens: number }>} */
    this.ledger = [];
    /** @type {Array<{ ts: number, tokens: number }>} */
    this.tokenEvents = [];
    this._restore();
  }

  /** Оценка перед запуском: укладывается ли оценка в лимиты run и дня. @returns {boolean} */
  checkBudget(runId, estimatedCost = 0) {
    const run = this._run(String(runId));
    if (run.cost + estimatedCost > this.config.max_cost_usd_per_run) {
      this._alert(String(runId), "per_run", (run.cost + estimatedCost) / this.config.max_cost_usd_per_run);
      return false;
    }
    const dayCost = this._dayCost() + estimatedCost;
    if (dayCost > this.config.max_cost_usd_per_day) {
      this._alert(String(runId), "per_day", dayCost / this.config.max_cost_usd_per_day);
      return false;
    }
    if (this._tokensLastMinute() >= this.config.max_tokens_per_minute) {
      this._alert(String(runId), "tokens_per_minute", 1);
      return false;
    }
    // предупреждение при 80 %
    const ratio = Math.max((run.cost + estimatedCost) / this.config.max_cost_usd_per_run, dayCost / this.config.max_cost_usd_per_day);
    if (ratio >= this.config.alert_threshold) this._alert(String(runId), "threshold", ratio);
    return true;
  }

  /** Учесть потраченное. @returns {void} */
  recordCost(runId, cost, tokens = 0) {
    const id = String(runId);
    const run = this._run(id);
    run.cost += num(cost, 0);
    run.tokens += num(tokens, 0);
    const ts = this.now();
    this.ledger.push({ ts, runId: id, cost: num(cost, 0), tokens: num(tokens, 0) });
    if (tokens > 0) this.tokenEvents.push({ ts, tokens: num(tokens, 0) });
    this._persist();
    const ratio = Math.max(run.cost / this.config.max_cost_usd_per_run, this._dayCost() / this.config.max_cost_usd_per_day);
    if (run.cost >= this.config.max_cost_usd_per_run || this._dayCost() >= this.config.max_cost_usd_per_day) this._alert(id, "exceeded", ratio);
    else if (ratio >= this.config.alert_threshold) this._alert(id, "threshold", ratio);
  }

  /** Отметить итерацию; превышение лимита итераций → true (пауза). */
  recordIteration(runId) {
    const run = this._run(String(runId));
    run.iterations += 1;
    return run.iterations > this.config.max_iterations_per_run;
  }

  /** @returns {boolean} превышен ли бюджет run. */
  isRunExceeded(runId) {
    const run = this.runs.get(String(runId));
    return Boolean(run && run.cost > this.config.max_cost_usd_per_run);
  }

  /** @returns {{ days: number, total_cost_usd: number, total_tokens: number, runs: number, by_run: Array<{ run_id: string, cost_usd: number, tokens: number, iterations: number }> }} */
  getUsageReport(days = 1) {
    const since = this.now() - num(days, 1) * 24 * 60 * 60 * 1000;
    const recent = this.ledger.filter((e) => e.ts >= since);
    const totalCost = recent.reduce((a, e) => a + e.cost, 0);
    const totalTokens = recent.reduce((a, e) => a + e.tokens, 0);
    return {
      days: num(days, 1),
      total_cost_usd: round(totalCost),
      total_tokens: totalTokens,
      runs: recent.length,
      by_run: [...this.runs.entries()].map(([run_id, r]) => ({ run_id, cost_usd: round(r.cost), tokens: r.tokens, iterations: r.iterations })),
    };
  }

  /** Остаток дня в долларах (может быть отрицательным при перерасходе). */
  remainingDailyUsd() {
    return round(this.config.max_cost_usd_per_day - this._dayCost());
  }

  /* ————————————————————————— внутреннее ————————————————————————— */

  _run(id) {
    if (!this.runs.has(id)) this.runs.set(id, { cost: 0, tokens: 0, iterations: 0 });
    return this.runs.get(id);
  }

  _dayCost() {
    const start = new Date(this.now()).setHours(0, 0, 0, 0);
    return this.ledger.filter((e) => e.ts >= start).reduce((a, e) => a + e.cost, 0);
  }

  _tokensLastMinute() {
    const since = this.now() - 60 * 1000;
    return this.tokenEvents.filter((e) => e.ts >= since).reduce((a, e) => a + e.tokens, 0);
  }

  _alert(runId, kind, ratio) {
    this.onAlert({ kind, runId, ratio: round(ratio), message: `бюджет ${kind}: ${Math.round(ratio * 100)}% (порог ${this.config.alert_threshold * 100}%)`, webhook: this.config.alert_webhook_url });
  }

  _persist() {
    if (!this.config.state_file) return;
    try {
      mkdirSync(dirname(this.config.state_file), { recursive: true });
      writeFileSync(this.config.state_file, JSON.stringify({ ledger: this.ledger, tokenEvents: this.tokenEvents, runs: [...this.runs.entries()] }));
    } catch {
      /* персистентность опциональна */
    }
  }

  _restore() {
    if (!this.config.state_file || !existsSync(this.config.state_file)) return;
    try {
      const data = JSON.parse(readFileSync(this.config.state_file, "utf8"));
      this.ledger = data.ledger ?? [];
      this.tokenEvents = data.tokenEvents ?? [];
      this.runs = new Map(data.runs ?? []);
    } catch {
      /* битый файл состояния игнорируем */
    }
  }
}

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const round = (v) => Math.round(Number(v) * 1e6) / 1e6;

export default BudgetManager;
