/* tests/kernel/skills.test.mjs — загрузчик скиллов (§4.6): skill.yaml, шаблоны, ESM-крючки. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { loadSkill, loadSkills, listSkills, findSkill, renderSkillTemplate, runSkillHook, executeSkill, SkillError } from "../../core/loop-engine/skills.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = resolve(ROOT, "verticals/mini_apps");
const MOBILE = resolve(ROOT, "verticals/mobile_apps");
const WEB = resolve(ROOT, "verticals/web_studio");

test("listSkills находит скиллы вертикали", () => {
  assert.ok(listSkills(DATA).length >= 6, "стандарт студии: ≥6 приёмов");
  assert.ok(
    listSkills(DATA).every((d) =>
      /single-page-app|a11y-pass|telegram-sdk|payments|viewport-adaptive|offline-worker|usability-heuristics|conversion|motion-pass$|expert-copywriter$/.test(d),
    ),
  );
});

test("loadSkill читает метаданные, шаблоны и крючки", () => {
  const skill = loadSkill(resolve(DATA, "skills/conversion"));
  assert.equal(skill.id, "conversion");
  assert.ok(skill.meta.title);
  assert.deepEqual(skill.templates, ["coder", "fixer", "planner", "verifier"]);
  assert.deepEqual(Object.keys(skill.hooks).sort(), ["post_execute", "pre_execute"]);
});

test("renderSkillTemplate рендерит Jinja-подобный шаблон", () => {
  const skill = loadSkill(resolve(DATA, "skills/conversion"));
  const out = renderSkillTemplate(skill, "planner", { deliverable: "отчёт", brief: "продажи" });
  assert.match(out, /отчёт/);
  assert.match(out, /продажи/);
});

test("отсутствие шаблона → SkillError", () => {
  const skill = loadSkill(resolve(DATA, "skills/conversion"));
  assert.throws(() => renderSkillTemplate(skill, "нет-такого", {}), (e) => e instanceof SkillError);
});

test("крючки — ESM-модули, выполняются по порядку pre→post", async () => {
  const skill = loadSkill(resolve(DATA, "skills/conversion"));
  const pre = await runSkillHook(skill, "pre_execute", {});
  assert.equal(pre.vertical, "mini_apps");
  assert.equal(pre.skill, "conversion");
  const res = await executeSkill(skill, { template: "planner", context: { deliverable: "x", brief: "y" } });
  assert.equal(res.context.done, true);
  assert.equal(res.hooks.sort().join(","), "post_execute,pre_execute");
});

test("findSkill: без skill.yaml приём не исполняем (памятка SKILL.md — не скилл)", () => {
  // Различие принципиальное: памятку движок не загрузит, поэтому каждая студия обязана
  // доводить приём до skill.yaml (scripts/upgrade_skills.mjs). Проверяем на стенде.
  const memo = mkdtempSync(join(tmpdir(), "ceh-memo-"));
  mkdirSync(join(memo, "skills", "memo-only"), { recursive: true });
  writeFileSync(join(memo, "skills", "memo-only", "SKILL.md"), "# Памятка\n", "utf8");
  assert.equal(findSkill(memo, "memo-only"), null);

  // ...а все приёмы трёх студий исполняемы: у каждого skill.yaml и четыре шаблона ролей
  for (const studio of [WEB, DATA, MOBILE]) {
    const skills = loadSkills(studio);
    assert.ok(skills.length >= 10, `${studio}: приёмов ${skills.length}`);
    for (const skill of skills) assert.ok(skill.templates.length >= 4, `${studio}/${skill.id}: шаблонов ${skill.templates.length}`);
  }
  assert.ok(findSkill(WEB, "scroll-story"), "веб-приём теперь загружается движком");
  assert.ok(findSkill(DATA, "conversion"));
  assert.equal(findSkill(DATA, "нет-такого"), null);
});
