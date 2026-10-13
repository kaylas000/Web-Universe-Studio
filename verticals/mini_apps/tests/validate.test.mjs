/* tests/validate.test.mjs — самотест студии «Студия мини-приложений»: демо-проекты обязаны пройти приёмку. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { evalRule } from "../../../core/vertical-kit/index.mjs";

const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMOS = ["projects/timer-app", "projects/survey-app"];

const run = (script, project) => execFileSync(process.execPath, [script, project], { cwd: VERTICAL, encoding: "utf8" });

for (const demo of DEMOS) {
  test(`validate: ${demo} проходит приёмку`, () => {
    assert.match(run("scripts/validate.mjs", demo), /ИТОГ: 24\/24 · exit 0/);
  });

  test(`lint-slop: ${demo} чист`, () => {
    assert.match(run("scripts/lint-slop.mjs", demo), /чисто:/);
  });

  test(`lint-quotas: ${demo} в квотах`, () => {
    assert.match(run("scripts/lint-quotas.mjs", demo), /ИТОГ: 5\/5 · exit 0/);
  });
}

test("V-21 themeContrast: рубит слабую пару, пропускает сильную", () => {
  const rule = { kind: "themeContrast", path: "app/theme.json", min: 4.5 };
  const dir = mkdtempSync(join(tmpdir(), "mini-contrast-"));
  const write = (theme) => {
    mkdirSync(join(dir, "app"), { recursive: true });
    writeFileSync(join(dir, "app", "theme.json"), JSON.stringify(theme));
  };
  // #777777 на #FFFFFF ≈ 4.48:1 — ниже порога, правило обязано вернуть false.
  write({ themes: { light: { fg: "#777777", bg: "#FFFFFF" } }, contrast: [{ fg: "fg", bg: "bg" }] });
  assert.equal(evalRule(dir, rule), false, "серая пара ниже 4.5:1 должна падать");
  // #111111 на #FFFFFF ≈ 18.9:1 — правило пропускает.
  write({ themes: { light: { fg: "#111111", bg: "#FFFFFF" } }, contrast: [{ fg: "fg", bg: "bg" }] });
  assert.equal(evalRule(dir, rule), true, "контрастная пара должна проходить");
});