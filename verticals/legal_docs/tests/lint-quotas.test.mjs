/* tests/lint-quotas.test.mjs — самотест квот студии «Юридическая студия» (Q-01…Q-05).
   Демо-проекты обязаны проходить квоты: ИТОГ: 5/5 · exit 0. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");

const run = (project) => execFileSync(process.execPath, ["scripts/lint-quotas.mjs", project], { cwd: VERTICAL, encoding: "utf8" });

test("lint-quotas: dogovor-postavki проходит квоты", () => {
  assert.match(run("projects/dogovor-postavki"), /ИТОГ: 5\/5 · exit 0/);
});

test("lint-quotas: agentskij-dogovor проходит квоты", () => {
  assert.match(run("projects/agentskij-dogovor"), /ИТОГ: 5\/5 · exit 0/);
});