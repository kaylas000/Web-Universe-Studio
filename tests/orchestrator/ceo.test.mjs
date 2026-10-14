/* tests/orchestrator/ceo.test.mjs — CEO-агент (§13.2): Route, Plan, Run, Aggregate, HITL (К-09). */
import { test } from "node:test";
import assert from "node:assert/strict";

import { CeoAgent, CeoError, shortAlias } from "../../core/orchestrator/ceo.mjs";
import { normalizeComposition } from "../../core/orchestrator/composition.mjs";

const okRunner = async () => ({ status: "ok", codes: [], iterations: 1, ms: 1, evidence: { ok: true } });

const comp = (tasks, aggregate = { mode: "all" }, name = "t") =>
  normalizeComposition({ apiVersion: "autogen/v1", kind: "Composition", metadata: { name, goal: "g" }, tasks, aggregate });

test("shortAlias укорачивает имена вертикалей", () => {
  assert.equal(shortAlias("web_studio"), "web");
  assert.equal(shortAlias("mini_apps"), "mini");
  assert.equal(shortAlias("mobile_apps"), "mobile");
});

test("route сопоставляет цель с доменами по ключевым словам", () => {
  const agent = new CeoAgent();
  const routed = agent.route("Нужен лендинг запуска и пост в блог по запуску");
  const domains = routed.map((r) => r.domain);
  assert.ok(domains.includes("web"));
});

test("plan строит валидную композицию с needs-цепочкой", () => {
  const agent = new CeoAgent();
  const plan = agent.plan("сделай лендинг и таймер");
  assert.ok(plan.tasks.length >= 1);
  const withNeeds = plan.tasks.filter((t) => t.needs.length > 0);
  assert.ok(withNeeds.length >= 1);
  assert.equal(plan.tasks[0].needs.length, 0);
});

test("plan без совпадений → E-COMPOSITION-ROUTE", () => {
  const agent = new CeoAgent();
  assert.throws(() => agent.plan("абракадабра ни о чём"), (e) => e instanceof CeoError && e.code === "E-COMPOSITION-ROUTE");
});

test("run: все задачи зелёные → ok, без HITL", async () => {
  const agent = new CeoAgent({ runTask: okRunner });
  const report = await agent.run(comp([{ id: "a", vertical: "mini_apps", gate: "G4" }, { id: "b", vertical: "web", gate: "G4", needs: ["a"] }]));
  assert.equal(report.ok, true);
  assert.equal(report.passed, 2);
  assert.deepEqual(report.hitl_pending, []);
});

test("run: HITL-задача не закрывается без человека (К-09)", async () => {
  const agent = new CeoAgent({ runTask: okRunner });
  const c = comp([{ id: "review", vertical: "mini_apps", gate: "G4", hitl: true }]);
  const blocked = await agent.run(c);
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.hitl_pending, ["review"]);
  assert.ok(blocked.codes.includes("E-COMPOSITION-HITL"));
  const accepted = await agent.run(c, { acceptedHitl: true });
  assert.equal(accepted.ok, true);
});

test("run: провал зависимости блокирует потомка", async () => {
  const runner = async ({ task }) => (task.id === "a" ? { status: "fail", codes: ["V-01"], iterations: 1, ms: 1 } : { status: "ok", codes: [], iterations: 1, ms: 1 });
  const agent = new CeoAgent({ runTask: runner });
  const report = await agent.run(comp([{ id: "a", vertical: "web", gate: "G4" }, { id: "b", vertical: "mini_apps", gate: "G4", needs: ["a"] }]));
  assert.equal(report.ok, false);
  assert.equal(report.results.find((r) => r.id === "b").status, "blocked");
});

test("run: неизвестная вертикаль → E-COMPOSITION-ROUTE", async () => {
  const agent = new CeoAgent({ runTask: okRunner });
  await assert.rejects(() => agent.run(comp([{ id: "a", vertical: "nope", gate: "G4" }])), (e) => e.code === "E-COMPOSITION-ROUTE");
});

test("aggregate: режимы all / best_effort / quorum", () => {
  const agent = new CeoAgent({ runTask: okRunner });
  const c = comp([{ id: "a", vertical: "web" }, { id: "b", vertical: "mini_apps" }], { mode: "all" });
  const results = [
    { id: "a", status: "ok", codes: [], hitl: false },
    { id: "b", status: "fail", codes: ["V-01"], hitl: false },
  ];
  assert.equal(agent.aggregate(c, results, "all").ok, false);
  assert.equal(agent.aggregate(c, results, "best_effort").ok, true);
  assert.equal(agent.aggregate(c, results, "quorum").ok, true);
  const allFail = [{ id: "a", status: "fail", codes: [], hitl: false }];
  assert.equal(agent.aggregate(comp([{ id: "a", vertical: "web" }]), allFail, "best_effort").ok, false);
});
