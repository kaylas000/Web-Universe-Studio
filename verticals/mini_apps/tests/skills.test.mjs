/* tests/skills.test.mjs — приёмы студии «Студия мини-приложений» (§11 ТЗ):
   не меньше 6 приёмов, у каждого skill.yaml с обязательными полями (включая source
   вида REF-xx и takeaway — без источника приём — слоп, К-04), 4 шаблона ролей,
   2 ESM-крючка и рабочий рендер роли-планировщика через загрузчик ядра. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadSkills, executeSkill } from "../../../core/loop-engine/skills.mjs";

const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED_META = ["name", "title", "description", "source", "takeaway", "inputs", "outputs", "steps", "checks", "applies_to"];
const ROLES = ["planner", "coder", "verifier", "fixer"];

test("приёмов не меньше шести", () => {
  const skills = loadSkills(VERTICAL);
  assert.ok(skills.length >= 6, `ожидалось ≥ 6 приёмов, найдено ${skills.length}`);
});

test("у каждого приёма полный скелет §11 (skill.yaml + шаблоны + крючки)", () => {
  const skills = loadSkills(VERTICAL);
  assert.ok(skills.length > 0, "нет приёмов");
  for (const skill of skills) {
    const yaml = readFileSync(join(skill.dir, "skill.yaml"), "utf8");
    for (const field of REQUIRED_META) {
      assert.ok(new RegExp(`^${field}:`, "m").test(yaml), `${skill.id}: нет поля ${field} в skill.yaml`);
    }
    assert.match(yaml, /^source:\s*(REF|SK)-\d+/m, `${skill.id}: source не вида REF-xx (без источника приём — слоп, К-04)`);
    assert.ok(/^applies_to:/m.test(yaml), `${skill.id}: нет поля applies_to`);
    assert.ok(/^\s*- mini_apps/m.test(yaml), `${skill.id}: applies_to не содержит mini_apps`);
    for (const role of ROLES) {
      assert.ok(existsSync(join(skill.dir, "templates", `${role}.j2`)), `${skill.id}: нет templates/${role}.j2`);
    }
    for (const hook of ["pre_execute", "post_execute"]) {
      assert.ok(existsSync(join(skill.dir, "hooks", `${hook}.mjs`)), `${skill.id}: нет hooks/${hook}.mjs`);
    }
  }
});

test("рендер планировщика каждого приёма даёт текст (загрузчик ядра)", async () => {
  const skills = loadSkills(VERTICAL);
  for (const skill of skills) {
    const res = await executeSkill(skill, { template: "planner", context: { deliverable: "app", brief: "тест приёма" } });
    assert.equal(typeof res.output, "string", `${skill.id}: рендер не вернул строку`);
    assert.ok(res.output.length > 0, `${skill.id}: пустой рендер`);
    assert.deepEqual(res.hooks.sort(), ["post_execute", "pre_execute"], `${skill.id}: крючки не подключены`);
  }
});