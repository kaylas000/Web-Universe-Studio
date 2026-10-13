/* tests/e2e/composition.test.mjs — сквозной прогон CEO-агента по файлам композиций (§13). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { CeoAgent } from "../../core/orchestrator/ceo.mjs";
import { loadComposition, validateComposition } from "../../core/orchestrator/composition.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GREEN = resolve(ROOT, "compositions", "sales-post-with-data", "composition.yaml");
const HITL = resolve(ROOT, "compositions", "launch-landing-with-review", "composition.yaml");

test("зелёная композиция проходит насквозь (реальные студии)", async () => {
  const agent = new CeoAgent();
  const composition = loadComposition(GREEN);
  assert.equal(validateComposition(composition, { knownVerticals: agent.knownNames() }).ok, true);
  const report = await agent.run(composition);
  assert.equal(report.ok, true, JSON.stringify(report.codes));
  assert.equal(report.passed, report.total);
});

test("композиция с HITL блокируется — человек завершает приёмку (К-09)", async () => {
  const agent = new CeoAgent();
  const composition = loadComposition(HITL);
  const blocked = await agent.run(composition);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.hitl_pending.includes("review"));
  const accepted = await agent.run(composition, { acceptedHitl: true });
  assert.equal(accepted.ok, true, JSON.stringify(accepted.codes));
});
