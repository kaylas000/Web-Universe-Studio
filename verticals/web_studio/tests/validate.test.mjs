/* tests/validate.test.mjs — самотест студии «Веб-студия (эталон)»: демо-проекты
   обязаны пройти приёмку 20/20 (V-01…V-20), включая SEO-аудит, типографику и перфоманс. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMOS = ["projects/pcpolimer", "projects/dezobrabotka", "projects/lazer-rezka"];

const run = (script, project) => execFileSync(process.execPath, [script, project], { cwd: VERTICAL, encoding: "utf8" });

for (const demo of DEMOS) {
  test(`validate: ${demo} проходит приёмку 20/20`, () => {
    assert.match(run("scripts/validate.mjs", demo), /ИТОГ: 20\/20 · exit 0/);
  });

  test(`seo-audit: ${demo} чист`, () => {
    assert.match(run("scripts/seo-audit.mjs", demo), /СТАТУС: OK \(exit 0\)/);
  });

  test(`lint-typography: ${demo} чист`, () => {
    assert.match(run("scripts/lint-typography.mjs", demo), /Типографика в норме/);
  });

  test(`lint-performance: ${demo} чист`, () => {
    assert.match(run("scripts/lint-performance.mjs", demo), /Бюджеты в норме/);
  });
}