/* tests/validate.test.mjs — самотест студии «Студия мобильных приложений»: демо-проект обязан пройти приёмку. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { evalRule } from "../../../core/vertical-kit/index.mjs";

const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMO = "projects/notes-app";

const run = (script) => execFileSync(process.execPath, [script, DEMO], { cwd: VERTICAL, encoding: "utf8" });

test("validate: демо-проект проходит приёмку", () => {
  assert.match(run("scripts/validate.mjs"), /ИТОГ: 25\/25 · exit 0/);
});

test("lint-slop: демо-проект чист", () => {
  assert.match(run("scripts/lint-slop.mjs"), /чисто:/);
});

test("V-22 themeContrast: рубит слабую пару, пропускает сильную", () => {
  const rule = { kind: "themeContrast", path: "app/theme.json", min: 4.5 };
  const dir = mkdtempSync(join(tmpdir(), "mobile-contrast-"));
  const write = (theme) => {
    mkdirSync(join(dir, "app"), { recursive: true });
    writeFileSync(join(dir, "app", "theme.json"), JSON.stringify(theme));
  };
  // #777777 на #FFFFFF ≈ 4.48:1 — ниже порога, правило обязано вернуть false.
  write({ themes: { light: { fg: "#777777", bg: "#FFFFFF" } }, contrast: [{ fg: "fg", bg: "bg" }] });
  assert.equal(evalRule(dir, rule), false, "серая пара ниже 4.5:1 должна падать");
  // #111318 на #FFFFFF ≈ 18.6:1 — правило пропускает.
  write({ themes: { light: { fg: "#111318", bg: "#FFFFFF" } }, contrast: [{ fg: "fg", bg: "bg" }] });
  assert.equal(evalRule(dir, rule), true, "контрастная пара должна проходить");
});
