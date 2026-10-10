/* tests/verticals/verticals.test.mjs — инварианты платформы по всем 7 вертикалям (§2, §7, §8). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { listVerticals, readVerticalMeta } from "../../core/gate.mjs";
import { listProjects } from "../../core/gate.mjs";

const EXPECTED = ["content_studio", "data_analytics", "education", "legal_docs", "mini_apps", "mobile_apps", "web_studio"];

test("платформа содержит ровно 7 вертикалей", () => {
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
    for (const rel of ["CONSTITUTION.md", "AGENTS.md", "scripts/validate.mjs", "scripts/lint-slop.mjs", "references/INDEX.md"]) {
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
