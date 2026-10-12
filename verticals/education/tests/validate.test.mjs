/* tests/validate.test.mjs — самотест студии «Образовательная студия»: демо-проект обязан пройти приёмку. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMO = "projects/kurs-proverka-dannyh";
const DEMO_FULL = "projects/osnovy-analitiki";

const run = (script, project) => execFileSync(process.execPath, [script, project], { cwd: VERTICAL, encoding: "utf8" });

test("validate: демо-проект проходит приёмку", () => {
  assert.match(run("scripts/validate.mjs", DEMO), /ИТОГ: \d+\/\d+ · exit 0/);
});

test("lint-slop: демо-проект чист", () => {
  assert.match(run("scripts/lint-slop.mjs", DEMO), /чисто:/);
});

test("lint-quotas: полный демо-проект проходит квоты Q-01…Q-05", () => {
  assert.match(run("scripts/lint-quotas.mjs", DEMO_FULL), /ИТОГ: 5\/5 · exit 0/);
});
