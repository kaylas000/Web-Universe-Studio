/* tests/kernel/skills.test.mjs — загрузчик скиллов (§4.6): skill.yaml, шаблоны, ESM-крючки. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { loadSkill, listSkills, findSkill, renderSkillTemplate, runSkillHook, executeSkill, SkillError } from "../../core/loop-engine/skills.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEGAL = resolve(ROOT, "verticals/legal_docs");
const WEB = resolve(ROOT, "verticals/web_studio");

test("listSkills находит скиллы вертикали", () => {
  assert.ok(listSkills(LEGAL).length >= 6, "стандарт студии: ≥6 приёмов");
  assert.ok(
    listSkills(LEGAL).every((d) =>
      /contract-draft|legal-review|requisites|dispute-clause|pdn-compliance|versioning$/.test(d),
    ),
  );
});

test("loadSkill читает метаданные, шаблоны и крючки", () => {
  const skill = loadSkill(resolve(LEGAL, "skills/contract-draft"));
  assert.equal(skill.id, "contract-draft");
  assert.ok(skill.meta.title);
  assert.deepEqual(skill.templates, ["coder", "fixer", "planner", "verifier"]);
  assert.deepEqual(Object.keys(skill.hooks).sort(), ["post_execute", "pre_execute"]);
});

test("renderSkillTemplate рендерит Jinja-подобный шаблон", () => {
  const skill = loadSkill(resolve(LEGAL, "skills/contract-draft"));
  const out = renderSkillTemplate(skill, "planner", { deliverable: "договор", brief: "аренда" });
  assert.match(out, /договор/);
  assert.match(out, /аренда/);
});

test("отсутствие шаблона → SkillError", () => {
  const skill = loadSkill(resolve(LEGAL, "skills/contract-draft"));
  assert.throws(() => renderSkillTemplate(skill, "нет-такого", {}), (e) => e instanceof SkillError);
});

test("крючки — ESM-модули, выполняются по порядку pre→post", async () => {
  const skill = loadSkill(resolve(LEGAL, "skills/contract-draft"));
  const pre = await runSkillHook(skill, "pre_execute", {});
  assert.equal(pre.vertical, "legal_docs");
  assert.equal(pre.skill, "contract-draft");
  const res = await executeSkill(skill, { template: "planner", context: { deliverable: "x", brief: "y" } });
  assert.equal(res.context.done, true);
  assert.equal(res.hooks.sort().join(","), "post_execute,pre_execute");
});

test("findSkill: скилл без skill.yaml (только SKILL.md) не исполняем → null", () => {
  assert.equal(findSkill(WEB, "scroll-story"), null);
  assert.ok(findSkill(LEGAL, "contract-draft"));
  assert.equal(findSkill(LEGAL, "нет-такого"), null);
});
