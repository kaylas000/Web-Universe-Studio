/* tests/orchestrator/composition.test.mjs — схема и DAG композиций (§13.1, E-CONFIG-GRAPH). */
import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeComposition, validateComposition, topologicalOrder, readyTasks, CompositionError } from "../../core/orchestrator/composition.mjs";

const good = () =>
  normalizeComposition({
    apiVersion: "autogen/v1",
    kind: "Composition",
    metadata: { name: "demo", goal: "цель" },
    tasks: [
      { id: "brief", vertical: "content", gate: "G1" },
      { id: "landing", vertical: "web", gate: "G4", needs: ["brief"] },
    ],
    aggregate: { mode: "all" },
  });

test("корректная композиция проходит схему", () => {
  const check = validateComposition(good());
  assert.equal(check.ok, true, JSON.stringify(check.errors));
});

test("topologicalOrder ставит зависимости раньше", () => {
  assert.deepEqual(topologicalOrder(good().tasks), ["brief", "landing"]);
});

test("цикл зависимостей → E-CONFIG-GRAPH", () => {
  const cyclic = normalizeComposition({
    kind: "Composition",
    metadata: { name: "c" },
    tasks: [
      { id: "a", vertical: "web", needs: ["b"] },
      { id: "b", vertical: "web", needs: ["a"] },
    ],
  });
  const check = validateComposition(cyclic);
  assert.equal(check.ok, false);
  assert.ok(check.errors.some((e) => e.code === "E-CONFIG-GRAPH"));
  assert.throws(() => topologicalOrder(cyclic.tasks), (e) => e instanceof CompositionError && e.code === "E-CONFIG-GRAPH");
});

test("неизвестная зависимость → E-SCHEMA", () => {
  const bad = normalizeComposition({ kind: "Composition", metadata: { name: "x" }, tasks: [{ id: "a", vertical: "web", needs: ["ghost"] }] });
  assert.ok(validateComposition(bad).errors.some((e) => e.code === "E-SCHEMA"));
});

test("неизвестная вертикаль ловится при knownVerticals", () => {
  const check = validateComposition(good(), { knownVerticals: ["content", "web"] });
  assert.equal(check.ok, true);
  const bad = normalizeComposition({ kind: "Composition", metadata: { name: "y" }, tasks: [{ id: "a", vertical: "nope" }] });
  assert.ok(validateComposition(bad, { knownVerticals: ["content", "web"] }).errors.some((e) => e.code === "E-SCHEMA"));
});

test("неверный режим агрегации и неверный гейт → E-SCHEMA", () => {
  const bad = normalizeComposition({ kind: "Composition", metadata: { name: "z" }, tasks: [{ id: "a", vertical: "web", gate: "G9" }], aggregate: { mode: "whatever" } });
  const errors = validateComposition(bad).errors;
  assert.ok(errors.some((e) => e.description.includes("aggregate.mode")));
  assert.ok(errors.some((e) => e.description.includes("G9")));
});

test("readyTasks отдаёт только закрытые по зависимостям", () => {
  const tasks = good().tasks;
  assert.deepEqual(readyTasks(tasks, new Set()).map((t) => t.id), ["brief"]);
  assert.deepEqual(readyTasks(tasks, new Set(["brief"])).map((t) => t.id), ["landing"]);
});
