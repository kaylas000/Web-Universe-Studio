/* tests/validate.test.mjs — самотест студии «Образовательная студия»: демо-проект обязан пройти приёмку. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMO = "projects/kurs-proverka-dannyh";

const run = (script) => execFileSync(process.execPath, [script, DEMO], { cwd: VERTICAL, encoding: "utf8" });

test("validate: демо-проект проходит приёмку", () => {
  assert.match(run("scripts/validate.mjs"), /ИТОГ: \d+\/\d+ · exit 0/);
});

test("lint-slop: демо-проект чист", () => {
  assert.match(run("scripts/lint-slop.mjs"), /чисто:/);
});
