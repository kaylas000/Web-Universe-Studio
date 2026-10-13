/* tests/validate.test.mjs — самотест студии «Студия мини-приложений»: демо-проекты обязаны пройти приёмку. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMOS = ["projects/timer-app", "projects/survey-app"];

const run = (script, project) => execFileSync(process.execPath, [script, project], { cwd: VERTICAL, encoding: "utf8" });

for (const demo of DEMOS) {
  test(`validate: ${demo} проходит приёмку`, () => {
    assert.match(run("scripts/validate.mjs", demo), /ИТОГ: 20\/20 · exit 0/);
  });

  test(`lint-slop: ${demo} чист`, () => {
    assert.match(run("scripts/lint-slop.mjs", demo), /чисто:/);
  });

  test(`lint-quotas: ${demo} в квотах`, () => {
    assert.match(run("scripts/lint-quotas.mjs", demo), /ИТОГ: 5\/5 · exit 0/);
  });
}