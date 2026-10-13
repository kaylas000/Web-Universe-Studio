/* tests/validate.test.mjs — самотест студии «Веб-студия (эталон)»: демо-проекты
   обязаны пройти приёмку 22/22 (V-01…V-22), включая SEO-аудит, типографику, перфоманс,
   эвристики NN/g и формы/состояния динамики. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMOS = ["projects/pcpolimer", "projects/dezobrabotka", "projects/lazer-rezka"];

const run = (script, project) => execFileSync(process.execPath, [script, project], { cwd: VERTICAL, encoding: "utf8" });

for (const demo of DEMOS) {
  test(`validate: ${demo} проходит приёмку 22/22`, () => {
    assert.match(run("scripts/validate.mjs", demo), /ИТОГ: 22\/22 · exit 0/);
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

  test(`lint-heuristics: ${demo} в норме`, () => {
    assert.match(run("scripts/lint-heuristics.mjs", demo), /Эвристики NN\/g в норме/);
  });

  test(`lint-form: ${demo} в норме`, () => {
    assert.match(run("scripts/lint-form.mjs", demo), /в норме/);
  });
}