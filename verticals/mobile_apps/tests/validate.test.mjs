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

/** Отчёт студии «ИТОГ: N/N · exit C»: ждём полное совпадение и exit 0, а порог числа правил
    задаём отдельно — так добавление правил не ломает тест, а падение правила — ломает. */
function expectCleanReport(output, { what, atLeast }) {
  const match = /ИТОГ:\s*(\d+)\/(\d+)\s*·\s*exit\s*(\d+)/.exec(output);
  assert.ok(match, `${what}: в отчёте нет строки ИТОГ —\n${output}`);
  const [, passed, total, code] = match.map((value, i) => (i === 0 ? value : Number(value)));
  assert.equal(code, 0, `${what}: exit ${code}, проходит ${passed}/${total}`);
  assert.equal(passed, total, `${what}: провалено ${total - passed} правил из ${total}`);
  assert.ok(total >= atLeast, `${what}: правил ${total}, ожидалось не меньше ${atLeast}`);
}


test("validate: демо-проект проходит приёмку", () => {
  expectCleanReport(run("scripts/validate.mjs"), { what: "validate notes-app", atLeast: 29 });
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
