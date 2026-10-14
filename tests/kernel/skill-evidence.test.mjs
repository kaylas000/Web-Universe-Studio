/* ЦЕХ · ядро — tests/kernel/skill-evidence.test.mjs
   Приём обязан быть проверяемым: evidence из skill.yaml судит артефакт, и судит одинаково
   во всех трёх студиях. Здесь закреплены семантика (require — «есть хотя бы раз»,
   forbid — «нет нигде»), область скана, glob'ы и то, что приём не молчит при отсутствии
   артефакта. */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkEvidence, collectArtifacts, globToRegExp, loadEvidence, reportEvidence } from "../../core/loop-engine/skill-evidence.mjs";
import { collectSkillEvidence, executeSkill, loadSkill, loadSkills } from "../../core/loop-engine/skills.mjs";

/** Проект-стенд: артефакт в site/ и мусор вне области скана. */
function makeProject({ html = "<html lang=\"ru\"><body><main>ок</main></body></html>", css = ".a{color:#111}", extra = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ceh-skill-"));
  mkdirSync(join(dir, "site"), { recursive: true });
  if (html !== null) writeFileSync(join(dir, "site", "index.html"), html, "utf8");
  if (css !== null) writeFileSync(join(dir, "site", "styles.css"), css, "utf8");
  for (const [rel, content] of Object.entries(extra)) {
    mkdirSync(join(dir, rel.split("/").slice(0, -1).join("/")), { recursive: true });
    writeFileSync(join(dir, rel), content, "utf8");
  }
  return dir;
}

/** Стенд-приём: только skill.yaml, чтобы проверять движок, а не студию. */
function makeSkill({ require: req = [], forbid = [], files = [], severity, name = "stand-skill" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ceh-skilldir-"));
  const lines = [
    `name: ${name}`,
    'title: "Стендовый приём"',
    "codes:",
    '  - "V-01"',
    "evidence:",
    "  require:",
    ...(req.length ? req.map((r) => `    - "${r.replace(/"/g, '\\"')}"`) : ['    - "—"']),
    "  forbid:",
    ...(forbid.length ? forbid.map((r) => `    - "${r.replace(/"/g, '\\"')}"`) : ['    - "—"']),
    "  files:",
    ...(files.length ? files.map((f) => `    - "${f}"`) : []),
  ];
  if (severity) lines.push(`  severity: ${severity}`);
  if (files.length === 0) {
    // пустой список области скана — это «весь проект»
    const idx = lines.indexOf("  files:");
    lines.splice(idx, 1, "  files: []");
  }
  writeFileSync(join(dir, "skill.yaml"), `${lines.join("\n")}\n`, "utf8");
  return dir;
}

test("globToRegExp понимает **, *, {a,b} и регистронезависим", () => {
  assert.equal(globToRegExp("site/**/*.html").test("site/lp/a/index.html"), true);
  assert.equal(globToRegExp("site/*.{html,css}").test("site/styles.css"), true);
  assert.equal(globToRegExp("site/*.{html,css}").test("site/lp/a.css"), false);
  assert.equal(globToRegExp("**/*.JS").test("app/main.js"), true);
  assert.equal(globToRegExp("app/**/*.js").test("site/main.js"), false);
});

test("loadEvidence: пустые списки («—») не превращаются в запреты", () => {
  const dir = makeSkill({ require: ["color:\\s*var\\("], forbid: [], files: ["site/**/*.css"] });
  const evidence = loadEvidence(dir);
  assert.deepEqual(evidence.forbid, []);
  assert.deepEqual(evidence.require, ["color:\\s*var\\("]);
  assert.deepEqual(evidence.files, ["site/**/*.css"]);
  assert.equal(evidence.severity, "warn");
});

test("require — признак обязан быть хотя бы один раз, и это одна находка", () => {
  const project = makeProject({ css: ".a{--x:1}" });
  const skill = makeSkill({ require: ["color:\\s*var\\("] });
  const result = checkEvidence({ skillDir: skill, projectDir: project });
  assert.equal(result.ok, true, "предупреждение не делает вердикт красным");
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].severity, "warn");
  assert.deepEqual(result.missing, ["color:\\s*var\\("]);

  const good = checkEvidence({ projectDir: makeProject({ css: ".a{color:var(--ink)}" }), skillDir: skill });
  assert.deepEqual(good.findings, []);
  assert.deepEqual(good.missing, []);
});

test("forbid — находка на каждое вхождение и только в области скана", () => {
  const project = makeProject({
    css: ".a{transition: all .3s}\n.b{transition: all .2s}",
    extra: { "docs/notes.css": ".c{transition: all .1s}" },
  });
  const scoped = checkEvidence({ skillDir: makeSkill({ forbid: ["transition:\\s*all"], files: ["site/**/*.css"] }), projectDir: project });
  assert.equal(scoped.findings.length, 2, "два вхождения в site/, docs/ вне области");
  assert.equal(scoped.findings[0].severity, "warn", "по умолчанию приём советует, а не приговаривает");
  assert.equal(scoped.ok, true);

  const unscoped = checkEvidence({ skillDir: makeSkill({ forbid: ["transition:\\s*all"] }), projectDir: project });
  assert.equal(unscoped.findings.length, 3, "без области скана виден и docs/");
});

test("severity: error — только если приём сам так объявил", () => {
  const project = makeProject({ css: ".a{transition: all}" });
  const soft = checkEvidence({ skillDir: makeSkill({ forbid: ["transition:\\s*all"] }), projectDir: project });
  assert.equal(soft.ok, true);
  const hard = checkEvidence({ skillDir: makeSkill({ forbid: ["transition:\\s*all"], severity: "error" }), projectDir: project });
  assert.equal(hard.ok, false);
});

test("collectArtifacts: без области скана обходит проект, с областью — только совпавшее", () => {
  const project = makeProject({ extra: { "app/main.js": "console.log(1)", "README.md": "# x" } });
  const all = collectArtifacts(project);
  assert.ok(all.length >= 3, `ожидалось ≥3 файла, получено ${all.length}`);
  const scoped = collectArtifacts(project, { files: ["app/**/*.js"] });
  assert.deepEqual(scoped.map((f) => f.slice(project.length + 1)), ["app/main.js"]);
});

test("reportEvidence печатает находки в формате студий", () => {
  const chunks = [];
  const stream = { write: (chunk) => chunks.push(String(chunk)) };
  const project = makeProject({ css: ".a{transition: all}" });
  const result = checkEvidence({ skillDir: makeSkill({ forbid: ["transition:\\s*all"] }), projectDir: project });
  reportEvidence(result, { stream });
  assert.match(chunks.join(""), /site\/styles\.css:1 stand-skill:forbid/);
});

test("executeSkill: движок сам проверяет приём, если крючок этого не сделал", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ceh-skills-"));
  const skillDir = join(dir, "skills", "stand");
  mkdirSync(join(skillDir, "templates"), { recursive: true });
  writeFileSync(join(skillDir, "skill.yaml"), 'name: stand\ntitle: "Стенд"\nevidence:\n  require:\n    - "<main>"\n  forbid:\n    - "transition:\\\\s*all"\n  files:\n    - "site/**/*.{html,css}"\n', "utf8");
  writeFileSync(join(skillDir, "templates", "verifier.j2"), "проверь {{ projectName }}\n", "utf8");
  const skill = loadSkill(skillDir);
  const project = makeProject({ css: ".a{transition: all}" });
  const result = await executeSkill(skill, { template: "verifier", context: { projectName: "стенд" }, projectDir: project });
  assert.equal(result.evidence.skill, "stand");
  assert.equal(result.evidence.findings.length, 1);
  assert.deepEqual(result.evidence.missing, [], "признак <main> есть в index.html");
  assert.equal(result.evidence.findings[0].file, "site/styles.css");
  assert.match(result.output, /проверь стенд/);
});

test("collectSkillEvidence: без артефакта приём не выдумывает находок", async () => {
  const skills = loadSkills(join(process.cwd(), "verticals", "web_studio"));
  assert.ok(skills.length >= 20);
  const ctx = await collectSkillEvidence(skills[0], {});
  assert.equal(ctx.evidence, undefined, "нет projectDir — скана нет");
});
