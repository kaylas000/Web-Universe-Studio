/* tests/kernel/metrics.test.mjs — метрики ядра (§4.8): счётчики, гистограммы, экспорт Prometheus. */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createMetrics } from "../../core/observability/metrics.mjs";

test("counter инкрементируется и агрегируется по меткам", () => {
  const m = createMetrics();
  m.counter("tokens_used", { model: "a" }).inc(10);
  m.counter("tokens_used", { model: "a" }).inc(5);
  m.counter("tokens_used", { model: "b" }).inc(2);
  const text = m.renderPrometheus();
  assert.match(text, /tokens_used\{model="a"\} 15/);
  assert.match(text, /tokens_used\{model="b"\} 2/);
});

test("histogram считает count/sum/min/max", () => {
  const m = createMetrics();
  const h = m.histogram("run_duration", { vertical: "web" });
  h.observe(0.2);
  h.observe(0.6);
  const text = m.renderPrometheus();
  assert.match(text, /run_duration_count\{vertical="web"\} 2/);
  assert.match(text, /run_duration_sum\{vertical="web"\} 0\.8/);
  assert.match(text, /run_duration_min\{vertical="web"\} 0\.2/);
  assert.match(text, /run_duration_max\{vertical="web"\} 0\.6/);
});

test("gauge хранит последнее значение", () => {
  const m = createMetrics();
  m.gauge("budget_used_usd", { run_id: "r1" }).set(0.42);
  m.gauge("budget_used_usd", { run_id: "r1" }).set(0.5);
  assert.match(m.renderPrometheus(), /budget_used_usd\{run_id="r1"\} 0\.5/);
});

test("метки сортируются детерминированно", () => {
  const m = createMetrics();
  m.counter("c", { b: "2", a: "1" }).inc();
  assert.match(m.renderPrometheus(), /c\{a="1",b="2"\} 1/);
});
