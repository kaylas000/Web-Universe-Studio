/* tests/e2e/negative-fixture.test.mjs — §15.5: на фикстуре fixtures/slop-site валидатор ОБЯЗАН упасть,
   иначе проверка бесполезна. Прогоняем эталонные validate/lint-slop веб-студии по слоп-проекту. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WEB = resolve(ROOT, "verticals", "web_studio");
const FIXTURE = resolve(ROOT, "fixtures", "slop-site");

function run(script, projectAbs) {
  // validate/lint-slop склеивают root+project через path.join, поэтому путь должен быть относительным.
  const project = relative(WEB, projectAbs);
  return spawnSync(process.execPath, [resolve(WEB, script), project], { cwd: WEB, encoding: "utf8" });
}

test("validate.mjs падает на слоп-проекте с кодами V-xx", () => {
  const res = run("scripts/validate.mjs", resolve(FIXTURE));
  const out = `${res.stdout}${res.stderr}`;
  assert.notEqual(res.status, 0, "валидатор обязан вернуть ненулевой exit");
  assert.match(out, /V-\d{2}/, "в отчёте должны быть коды нарушений V-xx");
});

test("lint-slop.mjs падает на слоп-проекте с кодами B-xx", () => {
  const res = run("scripts/lint-slop.mjs", resolve(FIXTURE));
  const out = `${res.stdout}${res.stderr}`;
  assert.notEqual(res.status, 0, "линтер обязан вернуть ненулевой exit");
  assert.match(out, /B-\d{2}/, "в отчёте должны быть коды запретов B-xx");
});

test("эталонный демо-проект веб-студии, наоборот, проходит", () => {
  const res = run("scripts/validate.mjs", resolve(WEB, "projects", "pcpolimer"));
  assert.equal(res.status, 0, `${res.stdout}\n${res.stderr}`);
});
