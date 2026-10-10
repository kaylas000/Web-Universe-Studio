/* tests/kernel/protocols.test.mjs — протоколы §5 и коды §6: структурная типизация, severity, фидбек. */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ERR,
  SEVERITY,
  codeScope,
  defineGate,
  defineTool,
  defineVertical,
  isTool,
  isVerificationGate,
  isVertical,
  toAgentFeedback,
  validationError,
  verificationResult,
} from "../../core/loop-engine/protocols.mjs";

test("ERR: префиксы V/B/Q/C/A/R локальны, E/S/L/J/M — платформенные (§6.1)", () => {
  assert.equal(ERR.V.scope, "vertical");
  assert.equal(ERR.M.scope, "platform");
  assert.equal(codeScope("V-01"), "vertical");
  assert.equal(codeScope("E-PATH"), "platform");
  assert.equal(codeScope("B-25"), "vertical");
  assert.equal(codeScope("X-01"), null);
});

test("validationError нормализует краткую строку кода", () => {
  const e = validationError("V-02 Контраст текста ниже 4.5:1");
  assert.equal(e.code, "V-02");
  assert.equal(e.severity, SEVERITY.MAJOR);
  assert.match(e.description, /Контраст/);
});

test("validationError чинит неверную severity на major", () => {
  const e = validationError({ code: "B-01", severity: "whatever", description: "transition: all" });
  assert.equal(e.severity, SEVERITY.MAJOR);
  assert.equal(e.fixExample, null);
});

test("verificationResult: passed выводится из отсутствия errors", () => {
  assert.equal(verificationResult({ errors: [] }).passed, true);
  assert.equal(verificationResult({ errors: ["V-01 нет источника"] }).passed, false);
  assert.equal(verificationResult({ passed: true, errors: [{ code: "V-01" }] }).passed, false);
  const r = verificationResult({ errors: [{ code: "Q-01", severity: "minor", description: "квота" }] });
  assert.equal(r.errors[0].severity, "minor");
});

test("defineVertical собирает IVertical-совместимый объект", () => {
  const v = defineVertical({ name: "demo", skills: ["a", "b"], tools: [], gates: {}, defaultSkill: "a" });
  assert.equal(isVertical(v), true);
  assert.deepEqual(v.getSkills(), ["a", "b"]);
  assert.equal(v.getDefaultSkill(), "a");
  assert.deepEqual(v.loadReferences("x"), []);
});

test("defineGate возвращает структурный IVerificationGate и нормализует результат", async () => {
  const gate = defineGate({ name: "constitution", verify: async () => ({ errors: [{ code: "V-03", severity: "critical", description: "нет скила" }] }) });
  assert.equal(isVerificationGate(gate), true);
  const res = await gate.verify({}, {});
  assert.equal(res.passed, false);
  assert.equal(res.errors[0].code, "V-03");
});

test("defineGate без verify → ProtocolError", () => {
  assert.throws(() => defineGate({ name: "bad" }), (e) => e.code === "E-PROTOCOL-GATE");
});

test("defineTool собирает ITool-совместимый объект", async () => {
  const tool = defineTool({ name: "validate_artifact", description: "проверка", execute: async () => 42 });
  assert.equal(isTool(tool), true);
  assert.equal(await tool.execute({}), 42);
});

test("toAgentFeedback даёт структуру §6.3", () => {
  const fb = toAgentFeedback({ errors: [{ code: "V-02", severity: "critical", description: "контраст" }] }, { iterationsUsed: 3, budgetUsedUsd: 0.45 });
  assert.equal(fb.passed, false);
  assert.equal(fb.iterations_used, 3);
  assert.equal(fb.budget_used_usd, 0.45);
  assert.equal(fb.errors[0].code, "V-02");
});
