/* tests/kernel/skills.test.mjs — загрузчик скиллов (§4.6): skill.yaml, шаблоны, ESM-крючки. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { loadSkill, listSkills, findSkill, renderSkillTemplate, runSkillHook, executeSkill, SkillError } from "../../core/loop-engine/skills.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = resolve(ROOT, "verticals/data_analytics");
const WEB = resolve(ROOT, "verticals/web_studio");

test("listSkills находит скиллы вертикали", () => {
  assert.ok(listSkills(DATA).length >= 6, "стандарт студии: ≥6 приёмов");
  assert.ok(
    listSkills(DATA).every((d) =>
      /dashboard-spec|etl-pipeline|metric-report|quality-profile|schema-validate|sql-audit$/.test(d),
    ),
  );
});

test("loadSkill читает метаданные, шаблоны и крючки", () => {
  const skill = loadSkill(resolve(DATA, "skills/metric-report"));
  assert.equal(skill.id, "metric-report");
  assert.ok(skill.meta.title);
  assert.deepEqual(skill.templates, ["coder", "fixer", "planner", "verifier"]);
  assert.deepEqual(Object.keys(skill.hooks).sort(), ["post_execute", "pre_execute"]);
});

test("renderSkillTemplate рендерит Jinja-подобный шаблон", () => {
  const skill = loadSkill(resolve(DATA, "skills/metric-report"));
  const out = renderSkillTemplate(skill, "planner", { deliverable: "отчёт", brief: "продажи" });
  assert.match(out, /отчёт/);
  assert.match(out, /продажи/);
});

test("отсутствие шаблона → SkillError", () => {
  const skill = loadSkill(resolve(DATA, "skills/metric-report"));
  assert.throws(() => renderSkillTemplate(skill, "нет-такого", {}), (e) => e instanceof SkillError);
});

test("крючки — ESM-модули, выполняются по порядку pre→post", async () => {
  const skill = loadSkill(resolve(DATA, "skills/metric-report"));
  const pre = await runSkillHook(skill, "pre_execute", {});
  assert.equal(pre.vertical, "data_analytics");
  assert.equal(pre.skill, "metric-report");
  const res = await executeSkill(skill, { template: "planner", context: { deliverable: "x", brief: "y" } });
  assert.equal(res.context.done, true);
  assert.equal(res.hooks.sort().join(","), "post_execute,pre_execute");
});

test("findSkill: скилл без skill.yaml (только SKILL.md) не исполняем → null", () => {
  assert.equal(findSkill(WEB, "scroll-story"), null);
  assert.ok(findSkill(DATA, "metric-report"));
  assert.equal(findSkill(DATA, "нет-такого"), null);
});
