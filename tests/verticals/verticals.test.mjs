/* tests/verticals/verticals.test.mjs — инварианты платформы по всем 6 вертикалям (§2, §7, §8). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { listVerticals, readVerticalMeta } from "../../core/gate.mjs";
import { listProjects } from "../../core/gate.mjs";

const EXPECTED = ["content_studio", "data_analytics", "education", "mini_apps", "mobile_apps", "web_studio"];

test("платформа содержит ровно 6 вертикалей", () => {
  const names = listVerticals().map((d) => basename(d));
  assert.deepEqual(names, EXPECTED);
});

test("у каждой вертикали — манифест §8 (§apiVersion/kind/metadata/spec)", () => {
  for (const dir of listVerticals()) {
    const raw = readFileSync(join(dir, "vertical.yaml"), "utf8");
    assert.match(raw, /apiVersion:\s*autogen\/v1/, `${dir}: apiVersion`);
    assert.match(raw, /kind:\s*Vertical/, `${dir}: kind`);
    assert.match(raw, /^metadata:/m, `${dir}: metadata`);
    const meta = readVerticalMeta(dir);
    assert.ok(meta.name, `${dir}: имя`);
    assert.ok(meta.deliverable, `${dir}: deliverable`);
    assert.ok(Array.isArray(meta.checks) && meta.checks.length > 0, `${dir}: checks`);
  }
});

test("у каждой вертикали есть скелет §7.1 и хотя бы один демо-проект", () => {
  for (const dir of listVerticals()) {
    const meta = readVerticalMeta(dir);
    for (const rel of ["CONSTITUTION.md", "AGENTS.md", "BRIEF-TEMPLATE.md", "README.md", "registry.mjs", "scripts/validate.mjs", "scripts/lint-slop.mjs", "references/INDEX.md"]) {
      assert.ok(existsSync(join(dir, rel)), `${meta.name}: нет ${rel}`);
    }
    const gates = existsSync(join(dir, "gates")) ? readdirSync(join(dir, "gates")) : [];
    assert.ok(gates.some((f) => /^G1/i.test(f)) && gates.some((f) => /^G4/i.test(f)), `${meta.name}: нет гейтов G1/G4`);
    const projects = listProjects(dir, meta.deliverable);
    assert.ok(projects.length >= 1, `${meta.name}: нет демо-проектов`);
    for (const project of projects) {
      assert.ok(existsSync(join(project, "loop.config.yaml")) || existsSync(join(project, "DIRECTION.md")), `${project}: нет ни loop.config.yaml, ни DIRECTION.md`);
      assert.ok(existsSync(join(project, meta.deliverable)), `${project}: нет артефакта ${meta.deliverable}/`);
    }
  }
});

test("registry.mjs каждой вертикали — валидный IVertical (§5.1, §7.1)", async () => {
  const { isVertical } = await import("../../core/loop-engine/protocols.mjs");
  for (const dir of listVerticals()) {
    const meta = readVerticalMeta(dir);
    const { vertical } = await import(`../../verticals/${meta.name}/registry.mjs`);
    assert.ok(isVertical(vertical), `${meta.name}: registry.mjs не совместим с IVertical`);
    assert.deepEqual(vertical.checks, meta.checks, `${meta.name}: checks реестра ≠ checks манифеста`);
    assert.ok(vertical.getSkills().length > 0, `${meta.name}: реестр без приёмов`);
    assert.ok(vertical.getDefaultSkill(), `${meta.name}: нет приёма по умолчанию`);
    const gates = vertical.getVerificationGates();
    assert.ok(Object.values(gates).every((g) => typeof g.verify === "function"), `${meta.name}: ворота без verify`);
    const cfg = vertical.buildConfig(meta.name);
    assert.equal(cfg.project_name, meta.name, `${meta.name}: buildConfig.project_name`);
    assert.equal(cfg.validator.type, "vertical_project", `${meta.name}: buildConfig.validator`);
  }
});

test("RAG-индекс покрывает архив каждой вертикали", () => {
  for (const dir of listVerticals()) {
    const meta = readVerticalMeta(dir);
    const indexPath = join(dir, "references", ".index.json");
    assert.ok(existsSync(indexPath), `${meta.name}: нет .index.json (запусти index_references.mjs)`);
    const data = JSON.parse(readFileSync(indexPath, "utf8"));
    assert.ok(Array.isArray(data.documents) && data.documents.length > 0, `${meta.name}: пустой индекс`);
    assert.ok(data.documents.every((d) => d.takeaway && d.takeaway.length > 0), `${meta.name}: запись без takeaway (К-04)`);
  }
});

test("у каждой вертикали есть реестр приёмов skills/SKILL-INDEX.md (§11)", () => {
  for (const dir of listVerticals()) {
    const meta = readVerticalMeta(dir);
    const index = join(dir, "skills", "SKILL-INDEX.md");
    assert.ok(existsSync(index), `${meta.name}: нет skills/SKILL-INDEX.md`);
    assert.ok(readFileSync(index, "utf8").trim().length > 0, `${meta.name}: пустой SKILL-INDEX.md`);
  }
});

test("загрузчик скиллов ядра (§4.6) исполняет приёмы всех вертикалей", async () => {
  const { listSkills, loadSkill, executeSkill } = await import("../../core/loop-engine/skills.mjs");
  for (const dir of listVerticals()) {
    const meta = readVerticalMeta(dir);
    const dirs = listSkills(dir);
    assert.ok(dirs.length > 0, `${meta.name}: нет каталогов приёмов`);
    // вертикали, порождённые bootstrap'ом, имеют исполняемые приёмы (skill.yaml + шаблоны + крючки);
    // эталон web_studio использует SKILL.md — проверяем только то, что скиллы видны.
    const executable = dirs.filter((d) => existsSync(join(d, "skill.yaml")));
    for (const skillDir of executable) {
      const skill = loadSkill(skillDir);
      assert.ok(skill.templates.length > 0, `${meta.name}/${skill.id}: нет шаблонов`);
      const res = await executeSkill(skill, { template: "planner", context: { deliverable: meta.deliverable, brief: "тест" } });
      assert.equal(typeof res.output, "string", `${meta.name}/${skill.id}: пустой рендер`);
    }
  }
});
