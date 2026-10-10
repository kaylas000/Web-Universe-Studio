#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — scripts/bootstrap-verticals.mjs
   Бутстрап 6 вертикалей (§7.1 ТЗ): самодостаточный каталог verticals/<name>/ со своей
   конституцией (§9), анти-слопом (§10), скиллом (§11), детерминированной приёмкой (§15),
   демо-проектом и самотестом. Скрипт идемпотентен.
   Запуск: node scripts/bootstrap-verticals.mjs */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { TZ_OVERRIDES } from "./tz-verticals.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const V = join(ROOT, "verticals");

const write = (p, c) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${String(c).replace(/\s*$/, "")}\n`);
};
const json = (x) => `${JSON.stringify(x, null, 2)}\n`;
const L = (...a) => a.flat().join("\n");

const T = {};

T.constitution = (s) =>
  L(
    `# CONSTITUTION.md — закон студии «${s.title}»`,
    "",
    `Полные статьи вертикали \`${s.slug}\` (§9 ТЗ). Проверка статьи — метод из ТЗ (графа «Проверка»):`,
    "детерминированный офлайн-набор `scripts/validate.mjs` (коды `V-xx`) реализует подмножество статей;",
    "остальные исполняются на платформенном тире (LLM-judge / песочница / устройства, §14 ТЗ).",
    "",
    "## Статьи",
    "",
    s.constitution.map((r) => `- **${r.code}. ${r.title}.** ${r.text} *Проверка:* ${r.method ?? "валидатор студии"}.`),
    "",
    ...(s.gatesText ? [`**Гейты:** ${s.gatesText}.`, ""] : []),
    "## Приёмка",
    "",
    "1. Проект не сдаётся, пока `node scripts/validate.mjs projects/<имя>` не вернул `exit 0`.",
    "2. `node scripts/lint-slop.mjs projects/<имя>` печатает `чисто:`.",
    "3. Цикл принуждения: `node core/loop-engine/cli.mjs projects/<имя> --studio-root verticals/" + s.slug + "`.",
  );

T.agents = (s) =>
  L(
    `# AGENTS.md — контракт агентов студии «${s.title}»`,
    "",
    "## Роли",
    "",
    "- **Планировщик** — разбирает бриф, выбирает приёмы из `skills/`.",
    `- **Исполнитель** — выдаёт артефакт ровно в \`${s.deliverable}/\`, без пояснений вокруг.`,
    "- **Верификатор** — гоняет `scripts/validate.mjs` и `scripts/lint-slop.mjs`.",
    "- **Артдиректор** — принимает на G4, ведёт `REVIEW.md`.",
    "",
    "## Регламент цикла",
    "",
    "1. Читай `CONSTITUTION.md` и `anti-slop/BANNED.md` до генерации.",
    `2. Артефакт живёт только в \`${s.deliverable}/\` — валидатор смотрит туда.`,
    "3. На блок «ПРЕДЫДУЩАЯ ПОПЫТКА ПРОВАЛЕНА» правь ровно то, на что указал валидатор.",
    "4. Сдавай цикл только при `exit 0`.",
  );

T.brief = (s) =>
  L(
    `# BRIEF-TEMPLATE.md — бриф студии «${s.title}»`,
    "",
    "```text",
    "1. Заказчик:",
    "2. Задача (одним предложением):",
    `3. Артефакт (${s.deliverable}/):`,
    "4. Обязательные требования (законы студии К-xx):",
    "5. Анти-требования (чего быть не должно):",
    "6. Критерий приёмки:",
    "```",
    "",
    "Бриф без пунктов 2–3 не запускает цикл: агент возвращает его на уточнение.",
  );

T.readme = (s) =>
  L(
    `# ${s.title} · \`verticals/${s.slug}\``,
    "",
    s.summary,
    "",
    "## Что внутри",
    "",
    `- \`vertical.yaml\` — метаданные студии (артефакт — \`${s.deliverable}/\`).`,
    "- `CONSTITUTION.md` — проверяемые правила (К-xx).",
    "- `anti-slop/BANNED.md` + `QUOTAS.md` — запреты и квоты (B-xx/Q-xx).",
    "- `skills/` — приёмы студии (skill.yaml + templates/ + hooks/).",
    "- `validators/constitution.mjs` — тот же набор правил как ESM-модуль.",
    "- `scripts/validate.mjs` / `scripts/lint-slop.mjs` — приёмка (exit 0 = принято).",
    `- \`projects/${s.demo.slug}/\` — демо-проект, проходящий приёмку.`,
    "",
    "## Приёмка",
    "",
    "```text",
    `node scripts/validate.mjs projects/${s.demo.slug}`,
    `node scripts/lint-slop.mjs projects/${s.demo.slug}`,
    "node --test tests/*.test.mjs",
    "```",
  );

T.banned = (s) =>
  L(
    `# BANNED.md — анти-слоп студии «${s.title}»`,
    "",
    "Клише и приёмы, запрещённые в артефактах. Каждый пункт ловится `scripts/lint-slop.mjs`.",
    "",
    "| Код | Что | Почему запрещено |",
    "| --- | --- | --- |",
    s.banned.map((b) => `| ${b.code} | ${b.title} | ${b.text} |`),
  );

T.quotas = (s) =>
  L(
    `# QUOTAS.md — квоты студии «${s.title}»`,
    "",
    "Сколько «украшений» допустимо, чтобы результат не превращался в шум.",
    "",
    s.quotas.map((q) => `- **${q.code}.** ${q.text}`),
  );

T.gates = (s) =>
  L(
    `# Ворота студии «${s.title}»`,
    "",
    "Те же четыре ворот, что у цеха: от замысла до приёмки. Гейт не обходится.",
    "",
    "## G1. Замысел",
    "",
    "Утверждены `DIRECTION.md` и `MARKETING.md`; принят артдиректором.",
    "",
    "## G2. Структура",
    "",
    "Утверждён `STRUCTURE.md`: состав артефакта и проверки.",
    "",
    "## G3. Сборка",
    "",
    "`scripts/validate.mjs` → `ИТОГ: N/N · exit 0`; `lint-slop` → `чисто:`.",
    "",
    "## G4. Приёмка",
    "",
    "`REVIEW.md` артдиректора; спорные пункты — точечные правки.",
    "",
    "Возврат с ворот — точечные правки по пунктам `REVIEW.md`, не перезапуск.",
  );

T.registry = (s) =>
  L(
    `/* registry.mjs — мост между ядром и студией «${s.title}» (§5.1 IVertical, §7.1).`,
    "   Экспортирует IVertical-объект: метаданные, приёмы, инструменты, ворота и сборку",
    "   конфига цикла для проекта. Ядро (core/gate.mjs, core/orchestrator) знает только",
    "   этот контракт, а не детали студии. */",
    "",
    "import { existsSync, readdirSync, statSync } from \"node:fs\";",
    "import { dirname, join } from \"node:path\";",
    "import { fileURLToPath } from \"node:url\";",
    "",
    "const DIR = dirname(fileURLToPath(import.meta.url));",
    "",
    "/** Каталоги приёмов студии (без «_»-шаблонов). @returns {string[]} */",
    "function skillIds() {",
    "  const root = join(DIR, \"skills\");",
    "  try {",
    "    return readdirSync(root)",
    "      .filter((n) => !n.startsWith(\"_\") && !n.startsWith(\".\"))",
    "      .filter((n) => { try { return statSync(join(root, n)).isDirectory(); } catch { return false; } })",
    "      .sort();",
    "  } catch { return []; }",
    "}",
    "",
    "export const vertical = {",
    `  name: ${JSON.stringify(s.slug)},`,
    `  title: ${JSON.stringify(s.title)},`,
    `  deliverable: ${JSON.stringify(s.deliverable)},`,
    `  checks: ${JSON.stringify(s.checks)},`,
    '  validator: "vertical_project",',
    `  gates: ${JSON.stringify(s.gates ?? ["G1-direction", "G2-structure", "G3-artifact", "G4-final"])},`,
    "",
    "  /* --- IVertical (§5.1) --- */",
    "  getSkills() { return skillIds(); },",
    `  getTools() { return ${JSON.stringify(["validate_artifact", "lint_slop"])}; },`,
    "  getVerificationGates() {",
    "    return {",
    "      constitution: { name: \"constitution\", verify: async () => ({ errors: [] }) },",
    "      anti_slop: { name: \"anti_slop\", verify: async () => ({ errors: [] }) },",
    "      schema: { name: \"schema\", verify: async () => ({ errors: [] }) },",
    "    };",
    "  },",
    "  loadReferences() { return []; },",
    "  getDefaultSkill() { return this.getSkills()[0] ?? null; },",
    "  /** Артефакт как объект проекта (для оркестратора). */",
    "  async run(skillName, brief, context = {}) {",
    "    const projectName = context.projectName ?? context.project ?? null;",
    `    const marker = projectName ? join(DIR, "projects", projectName, ${JSON.stringify(s.deliverable)}) : null;`,
    "    return { skill: skillName, brief, project: projectName, deliverable: this.deliverable, hasArtifact: Boolean(marker && existsSync(marker)) };",
    "  },",
    "",
    "  /** @param {string} projectName @returns {Record<string, any>} */",
    "  buildConfig(projectName) {",
    "    return {",
    "      project_name: projectName,",
    `      task: ${JSON.stringify(s.demo.task)},`,
    "      loop: { max_iterations: 1 },",
    '      generator: { type: "mock" },',
    '      context_builder: { type: "studio_default" },',
    '      validator: { type: "vertical_project", checks: this.checks },',
    "    };",
    "  },",
    "};",
    "",
    "export default vertical;",
  );

T.constitutionValidator = () =>
  L(
    "/* validators/constitution.mjs — тот же набор правил, что в scripts/validate.mjs,",
    "   но как ESM-модуль: ядро может спросить студию о нарушениях из кода. */",
    "",
    'import { readFileSync } from "node:fs";',
    'import { evalRule } from "../../../core/vertical-kit/index.mjs";',
    "",
    'const RULES = JSON.parse(readFileSync(new URL("../scripts/rules.json", import.meta.url), "utf8")).rules;',
    "",
    "export const constitution = { rules: RULES };",
    "",
    "/** @param {string} projectDir @returns {{ ok: boolean, failures: string[] }} */",
    "export function validate(projectDir) {",
    "  const failures = RULES.filter((rule) => !evalRule(projectDir, rule)).map((r) => `${r.code} ${r.title}`);",
    "  return { ok: failures.length === 0, failures };",
    "}",
    "",
    "export default constitution;",
  );

T.skill = (s) =>
  L(
    `name: ${s.skill.slug}`,
    `title: ${JSON.stringify(s.skill.title)}`,
    `description: ${JSON.stringify(s.skill.description)}`,
    "inputs: [brief, deliverable_dir]",
    `outputs: [${s.deliverable}]`,
    "steps:",
    s.skill.steps.map((step) => `  - ${JSON.stringify(step)}`),
  );

T.skillIndex = (s) =>
  L(
    `# SKILL-INDEX — приёмы студии «${s.title}»`,
    "",
    `Реестр приёмов вертикали \`${s.slug}\` (§11 ТЗ). Один приём = директория`,
    "`skills/<id>/`: `skill.yaml` (метаданные) + `templates/*.j2` (шаблоны ролей) +",
    "`hooks/*.mjs` (ESM-крючки `pre_execute`/`post_execute`).",
    "",
    "| Приём | Назначение | Шаги |",
    "|---|---|---|",
    ...s.skills.map((k) => {
      const spec = k === s.skill.slug ? s.skill : { title: k, description: `Приём студии «${s.title}»: ${k}.`, steps: [] };
      return `| \`${k}\` | ${spec.description.replace(/\n/g, " ")} | ${spec.steps.join(" → ") || "—"} |`;
    }),
    "",
    "Загрузчик — `core/loop-engine/skills.mjs`; рендер шаблонов — `core/loop-engine/template.mjs`.",
  );

T.validate = (s) =>
  L(
    "#!/usr/bin/env node",
    `/* scripts/validate.mjs — приёмка студии «${s.title}».`,
    "   Правила декларативны (scripts/rules.json); формат отчёта — контракт ядра (§15 ТЗ). */",
    "",
    'import { runSpec } from "../../../core/vertical-kit/index.mjs";',
    "",
    `runSpec(${JSON.stringify(s.slug)}, new URL("./rules.json", import.meta.url));`,
  );

T.lintSlop = (s) =>
  L(
    "#!/usr/bin/env node",
    `/* scripts/lint-slop.mjs — анти-слоп студии «${s.title}».`,
    "   Запреты декларативны (scripts/slop.json); формат — «файл:строка B-xx …» (§15 ТЗ). */",
    "",
    'import { runSlopSpec } from "../../../core/vertical-kit/index.mjs";',
    "",
    `runSlopSpec(${JSON.stringify(s.slug)}, new URL("./slop.json", import.meta.url));`,
  );

T.tests = (s) =>
  L(
    `/* tests/validate.test.mjs — самотест студии «${s.title}»: демо-проект обязан пройти приёмку. */`,
    'import assert from "node:assert/strict";',
    'import { execFileSync } from "node:child_process";',
    'import { dirname, join } from "node:path";',
    'import { fileURLToPath } from "node:url";',
    'import test from "node:test";',
    "",
    'const VERTICAL = join(dirname(fileURLToPath(import.meta.url)), "..");',
    `const DEMO = "projects/${s.demo.slug}";`,
    "",
    'const run = (script) => execFileSync(process.execPath, [script, DEMO], { cwd: VERTICAL, encoding: "utf8" });',
    "",
    'test("validate: демо-проект проходит приёмку", () => {',
    '  assert.match(run("scripts/validate.mjs"), /ИТОГ: \\d+\\/\\d+ · exit 0/);',
    "});",
    "",
    'test("lint-slop: демо-проект чист", () => {',
    '  assert.match(run("scripts/lint-slop.mjs"), /чисто:/);',
    "});",
  );

T.verticalYaml = (s) =>
  L(
    "# ЦЕХ · метаплатформа — декларативное описание студии (§8 ТЗ).",
    "# metadata.* и spec.* читает ядро; metadata.deliverable/checks — маркеры приёмки гейта.",
    "apiVersion: autogen/v1",
    "kind: Vertical",
    "metadata:",
    `  name: ${s.slug}`,
    `  displayName: ${JSON.stringify(s.title)}`,
    `  description: ${JSON.stringify(s.summary)}`,
    '  version: "1.0.0"',
    `  domain: ${s.slug}`,
    `  tags: [${s.skills.join(", ")}]`,
    `  deliverable: ${s.deliverable}`,
    `  checks: [${s.checks.join(", ")}]`,
    "spec:",
    `  skills: [${s.skills.join(", ")}]`,
    "  validators: [constitution, anti_slop, schema]",
    `  gates: [${(s.gates ?? ["G1-direction", "G2-structure", "G3-artifact", "G4-final"]).join(", ")}]`,
    "  tools: [validate_artifact, lint_slop]",
    '  registry: "registry.mjs"',
    "  models:",
    '    planner: "ollama/llama3.1:8b"',
    '    coder: "ollama/qwen2.5-coder:7b"',
    '    verifier_llm: "ollama/gemma2:9b"',
    '    fixer: "ollama/llama3.1:8b"',
    "  budget:",
    "    max_cost_usd_per_run: 1.5",
    "    max_iterations: 10",
    "    max_tokens_per_run: 120000",
    "  knowledge:",
    "    provider: local",
    "    rag_collections:",
    `      - name: ${s.slug}_references`,
    `        source: "verticals/${s.slug}/references"`,
    "  anti_slop:",
    '    banned_file: "anti-slop/BANNED.md"',
    '    quotas_file: "anti-slop/QUOTAS.md"',
    "",
  );

T.validatorAntiSlop = () =>
  L(
    "/* validators/anti-slop.mjs — детерминированный анти-слоп как ESM-модуль.",
    "   Тот же набор запретов, что в scripts/lint-slop.mjs, для вызова из ядра. */",
    "",
    'import { readFileSync, readdirSync, statSync } from "node:fs";',
    'import { join } from "node:path";',
    "",
    'const SPEC = JSON.parse(readFileSync(new URL("../scripts/slop.json", import.meta.url), "utf8"));',
    "",
    "/** @param {string} projectDir @returns {Array<{ file: string, line: number, code: string }>} */",
    'export function scan(projectDir, subdir) {',
    "  const root = subdir ? join(projectDir, subdir) : projectDir;",
    "  const hits = [];",
    "  const walk = (dir) => {",
    "    for (const name of readdirSync(dir)) {",
    '      if (name === "workspace" || name.startsWith(".")) continue;',
    "      const full = join(dir, name);",
    "      if (statSync(full).isDirectory()) { walk(full); continue; }",
    "      if (!SPEC.extensions.some((ext) => name.endsWith(ext))) continue;",
    '      readFileSync(full, "utf8").split("\\n").forEach((line, i) => {',
    "        for (const rule of SPEC.rules) if (new RegExp(rule.pattern).test(line)) hits.push({ file: full, line: i + 1, code: rule.code });",
    "      });",
    "    }",
    "  };",
    "  walk(root);",
    "  return hits;",
    "}",
    "",
    "export default { scan };",
  );

T.validatorSchema = () =>
  L(
    "/* validators/schema.mjs — проверка структуры артефакта: обязательные файлы студии. */",
    "",
    'import { existsSync } from "node:fs";',
    'import { join } from "node:path";',
    'import { readFileSync } from "node:fs";',
    "",
    'const RULES = JSON.parse(readFileSync(new URL("../scripts/rules.json", import.meta.url), "utf8")).rules;',
    "",
    "/** @param {string} projectDir @returns {string[]} список отсутствующих обязательных файлов */",
    "export function missing(projectDir) {",
    '  return RULES.filter((r) => r.kind === "fileExists" && !existsSync(join(projectDir, r.path))).map((r) => r.path);',
    "}",
    "",
    "export default { missing };",
  );

T.validatorJudge = () =>
  L(
    "/* validators/llm-judge.mjs — опциональный LLM-критик. Никогда не единственный гейт (§5.2 ТЗ).",
    "   По умолчанию выключен: возвращает «не запускался», чтобы приёмка оставалась детерминированной. */",
    "",
    "/** @returns {{ ran: boolean, score: null, reason: string }} */",
    "export async function judge() {",
    '  return { ran: false, score: null, reason: "llm_judge выключен: детерминированные гейты первичны" };',
    "}",
    "",
    "export default { judge };",
  );

/** Референсы студии: явный массив s.references, иначе — производные от скиллов (fallback). */
T.refsOf = (s) =>
  Array.isArray(s.references) && s.references.length > 0
    ? s.references
    : s.skills.map((k, i) => ({
        id: `ref-${String(i + 1).padStart(2, "0")}`,
        style: k,
        source: `references/sources.yaml#${k}`,
        takeaway: `порядок шагов и критерии приёмки для приёма ${k}`,
      }));

T.referencesIndex = (s) =>
  L(
    `# INDEX.md — референсы студии «${s.title}»`,
    "",
    "Каждый приём опирается на источник: без источника приём — слоп (К-04). Метаданные — в `references/metadata/*.yaml`.",
    "",
    "| Id | Приём | Откуда | Что берём |",
    "| --- | --- | --- | --- |",
    ...T.refsOf(s).map((r) => `| ${r.id} | ${r.style} | ${r.source} | ${r.takeaway} |`),
  );

T.referencesSources = (s) =>
  L(
    "# sources.yaml — источники приёмов студии",
    "sources:",
    ...T.refsOf(s).map((r) => `  - id: ${r.id}\n    title: ${JSON.stringify(r.style)}\n    source: ${JSON.stringify(r.source)}\n    takeaway: ${JSON.stringify(r.takeaway)}`),
  );

T.gatesFiles = (s) => {
  const dir = join(V, s.slug, "gates");
  write(join(dir, "README.md"), T.gates(s));
  write(join(dir, "G1-direction.md"), `# G1 · Замысел (${s.title})\n\nВход: бриф. Выход: DIRECTION.md.\n\n- Утверждён образ результата и границы.\n- Проверка: артдиректор принял замысел.\n`);
  write(join(dir, "G2-structure.md"), `# G2 · Структура (${s.title})\n\nВход: DIRECTION.md. Выход: STRUCTURE.md.\n\n- Состав артефакта «${s.deliverable}/» и список проверок V-xx.\n- Проверка: структура покрывает все законы студии.\n`);
  write(join(dir, "G3-artifact.md"), `# G3 · Артефакт (${s.title})\n\nВход: сборка. Выход: артефакт + отчёт.\n\n- «scripts/validate.mjs» → «ИТОГ: N/N · exit 0».\n- «scripts/lint-slop.mjs» → «чисто:».\n`);
  write(join(dir, "G4-final.md"), `# G4 · Приёмка (${s.title})\n\n- REVIEW.md артдиректора со ссылками на К-xx.\n- Спорные пункты — точечные правки, не перезапуск.\n`);
};

T.writeVertical = (s) => {
  const dir = join(V, s.slug);
  write(join(dir, "vertical.yaml"), T.verticalYaml(s));
  write(join(dir, "CONSTITUTION.md"), T.constitution(s));
  write(join(dir, "AGENTS.md"), T.agents(s));
  write(join(dir, "BRIEF-TEMPLATE.md"), T.brief(s));
  write(join(dir, "README.md"), T.readme(s));
  write(join(dir, "registry.mjs"), T.registry(s));
  write(join(dir, "anti-slop", "BANNED.md"), T.banned(s));
  write(join(dir, "anti-slop", "QUOTAS.md"), T.quotas(s));
  T.gatesFiles(s);
  write(join(dir, "validators", "constitution.mjs"), T.constitutionValidator());
  write(join(dir, "validators", "anti-slop.mjs"), T.validatorAntiSlop());
  write(join(dir, "validators", "schema.mjs"), T.validatorSchema());
  write(join(dir, "validators", "llm-judge.mjs"), T.validatorJudge());
  write(join(dir, "references", "INDEX.md"), T.referencesIndex(s));
  write(join(dir, "references", "sources.yaml"), T.referencesSources(s));
  for (const r of T.refsOf(s)) {
    write(join(dir, "references", "metadata", `${r.id}.yaml`), `id: ${r.id}\nstyle: ${r.style}\nsource: ${r.source}\ntakeaway: ${r.takeaway}\n`);
  }
  write(join(dir, "tools", "README.md"), `# tools студии «${s.title}»\n\nКаталог под вспомогательные утилиты студии. Приёмка студии живёт в \`scripts/\`.\n`);
  write(join(dir, "scripts", "validate.mjs"), T.validate(s));
  write(join(dir, "scripts", "lint-slop.mjs"), T.lintSlop(s));
  write(join(dir, "scripts", "rules.json"), json({ vertical: s.slug, rules: s.rules }));
  write(join(dir, "scripts", "slop.json"), json({ vertical: s.slug, scan: [s.deliverable], extensions: s.slopExtensions, rules: s.slop }));
  write(join(dir, "tests", "validate.test.mjs"), T.tests(s));
  for (const k of s.skills) {
    const spec = k === s.skill.slug ? s.skill : { slug: k, title: k, description: `Приём студии «${s.title}»: ${k}.`, steps: ["Разобрать бриф", "Собрать артефакт по закону студии", "Отдать на приёмку"] };
    write(join(dir, "skills", k, "skill.yaml"), T.skill({ ...s, skill: spec }));
    write(join(dir, "skills", k, "templates", "planner.j2"), `{# Планировщик студии «${s.title}» #}\nАртефакт: {{ deliverable }}\nЗадача: {{ brief }}\n`);
    write(join(dir, "skills", k, "templates", "coder.j2"), `{# Исполнитель: собирает только ${s.deliverable}/ #}\nСобрать артефакт по плану: {{ plan }}\n`);
    write(join(dir, "skills", k, "templates", "verifier.j2"), `{# Верификатор: сверяет артефакт с законами студии #}\nПроверить: {{ artifact }}\n`);
    write(join(dir, "skills", k, "templates", "fixer.j2"), `{# Правщик: точечно закрывает коды нарушений #}\nНарушения: {{ errors }}\n`);
    write(join(dir, "skills", k, "hooks", "pre_execute.mjs"), `/* Крючок перед исполнением: студия «${s.title}», приём «${k}». */\nexport default async function preExecute(ctx) {\n  return { ...ctx, vertical: ${JSON.stringify(s.slug)}, skill: ${JSON.stringify(k)} };\n}\n`);
    write(join(dir, "skills", k, "hooks", "post_execute.mjs"), `/* Крючок после исполнения: фиксирует артефакт студии «${s.title}». */\nexport default async function postExecute(ctx) {\n  return { ...ctx, done: true };\n}\n`);
  }
  write(join(dir, "skills", "SKILL-INDEX.md"), T.skillIndex(s));
  const pdir = join(dir, "projects", s.demo.slug);
  write(join(pdir, "loop.config.yaml"), L(
    `project_name: ${s.demo.slug}`,
    `task: ${JSON.stringify(s.demo.task)}`,
    "loop:",
    "  max_iterations: 1",
    "generator:",
    "  type: mock",
    "context_builder:",
    "  type: studio_default",
    "validator:",
    "  type: vertical_project",
    "",
  ));
  for (const [rel, content] of Object.entries(s.demo.files)) write(join(pdir, rel), content);
  return dir;
};

/*__TEMPLATES__*/

const SPECS = [];

SPECS.push({
  slug: "legal_docs",
  title: "Юридическая студия",
  deliverable: "docs",
  summary: "Готовит договоры, политики и претензии с проверяемой структурой: разделы, нумерация, реквизиты и ссылка на применимое право — всё машинно проверяется.",
  checks: ["validate", "lint-slop"],
  skills: ["contract-draft", "legal-review"],
  references: [
    { id: "ref-01", style: "structure-nesting", source: "references/sources.yaml#contract-draft", takeaway: "Договор членится на разделы «Предмет → Обязанности → Ответственность → Срок»; нумерация 1.1/1.2 однозначна." },
    { id: "ref-02", style: "defined-terms", source: "references/sources.yaml#contract-draft", takeaway: "Термины определяются один раз в разделе «Термины» и далее используются без синонимов." },
    { id: "ref-03", style: "review-checklist", source: "references/sources.yaml#legal-review", takeaway: "Ревью идёт по чек-листу: стороны, предмет, цена, срок, ответственность, применимое право." },
  ],
  skill: {
    slug: "contract-draft",
    title: "Составление договора",
    description: "Собирает договор из обязательных разделов с нумерацией пунктов и реквизитами сторон.",
    steps: ["Определить предмет и стороны", "Заполнить обязательные разделы", "Сверить нумерацию и реквизиты", "Проверить анти-слоп студии"],
  },
  constitution: [
    { code: "К-01", title: "Предмет и стороны", text: "Договор содержит разделы «Предмет» и «Стороны» с полными реквизитами." },
    { code: "К-02", title: "Нумерация", text: "Пункты нумеруются иерархически: 1.1, 1.2, …; ссылка на пункт однозначна." },
    { code: "К-03", title: "Ответственность", text: "Раздел «Ответственность» фиксирует конкретные санкции, а не общие слова." },
    { code: "К-04", title: "Применимое право", text: "Указано применимое право; при спорах — конкретная подсудность." },
    { code: "К-05", title: "Источник норм", text: "Норма, на которую опирается документ, записана в docs/SOURCES.md с реквизитами акта." },
    { code: "К-06", title: "Резюме для клиента", text: "docs/README.md объясняет риски и обязательства человеческим языком." },
  ],
  banned: [
    { code: "B-01", title: "«настоящий Договор»", text: "канцелярит; пишем «договор»." },
    { code: "B-02", title: "«в соответствии с действующим законодательством»", text: "пустая отсылка без нормы." },
    { code: "B-03", title: "«надлежащим образом»", text: "оценка без критерия." },
    { code: "B-04", title: "«вступает в силу с момента подписания»", text: "штамп; указываем дату и порядок." },
  ],
  quotas: [
    { code: "Q-01", title: "Реквизиты сторон — один раз в разделе «Реквизиты»." },
    { code: "Q-02", title: "Не более одной общей отсылки к праву на документ." },
  ],
  rules: [
    { code: "V-01", title: "Договор на месте", kind: "fileExists", path: "docs/dogovor.md", ok: "docs/dogovor.md найден", fail: "нет docs/dogovor.md" },
    { code: "V-02", title: "Обязательные разделы", kind: "textHasAll", path: "docs/dogovor.md", patterns: ["^##\\s+Предмет", "^##\\s+Стороны", "^##\\s+Права и обязанности", "^##\\s+Ответственность", "^##\\s+Реквизиты"], ok: "все пять разделов", fail: "пропущен обязательный раздел (К-01, К-03)" },
    { code: "V-03", title: "Нумерованные пункты", kind: "regexAtLeast", path: "docs/dogovor.md", pattern: "^\\d+\\.\\d+", min: 6, ok: "нумерация иерархическая", fail: "меньше шести пунктов вида 1.1 (К-02)" },
    { code: "V-04", title: "Дата и место", kind: "regexAtLeast", path: "docs/dogovor.md", pattern: "\\d{2}\\.\\d{2}\\.\\d{4}", min: 1, ok: "дата в формате ДД.ММ.ГГГГ", fail: "нет даты договора" },
    { code: "V-05", title: "Применимое право", kind: "regexAtLeast", path: "docs/dogovor.md", pattern: "применимое право", min: 1, ok: "право указано", fail: "не указано применимое право (К-04)" },
    { code: "V-06", title: "Реквизиты с ИНН", kind: "regexAtLeast", path: "docs/dogovor.md", pattern: "ИНН", min: 2, ok: "ИНН обеих сторон", fail: "не хватает ИНН сторон" },
    { code: "V-07", title: "Источник норм", kind: "fileExists", path: "docs/SOURCES.md", ok: "docs/SOURCES.md найден", fail: "нет docs/SOURCES.md (К-05)" },
    { code: "V-08", title: "Резюме для клиента", kind: "fileExists", path: "docs/README.md", ok: "docs/README.md найден", fail: "нет docs/README.md (К-06)" },
  ],
  slopExtensions: [".md"],
  slop: [
    { code: "B-01", pattern: "настоящий [Дд]оговор", message: "канцелярит" },
    { code: "B-02", pattern: "в соответствии с действующим законодательством", message: "пустая отсылка" },
    { code: "B-03", pattern: "надлежащим образом", message: "оценка без критерия" },
    { code: "B-04", pattern: "вступает в силу с момента подписания", message: "штамп" },
  ],
  demo: {
    slug: "dogovor-postavki",
    task: "составить договор поставки оборудования для ООО «Речной порт»",
    files: {
      "docs/dogovor.md": `# Договор поставки № П-2026/014

г. Москва · 01.02.2026

## Предмет

1.1. Поставщик передаёт Покупателю оборудование по Спецификации (Приложение № 1), Покупатель принимает и оплачивает его.
1.2. Наименование, количество и сроки поставки определяются Спецификацией.

## Стороны

2.1. Поставщик: ООО «Северный контур», ИНН 7701234567, ОГРН 1157746000000.
2.2. Покупатель: ООО «Речной порт», ИНН 7709876543, ОГРН 1157746000001.
2.3. Стороны подтверждают полномочия подписантов приложениями к договору.

## Права и обязанности

3.1. Поставщик поставляет оборудование в срок из Спецификации.
3.2. Покупатель принимает оборудование и подписывает акт приёмки.
3.3. Покупатель вправе проверить комплектность до подписания акта.

## Ответственность

4.1. За просрочку поставки Поставщик уплачивает пеню 0,1 % от стоимости за каждый день.
4.2. Убытки возмещаются в части, не покрытой пенёй.

## Реквизиты

5.1. Поставщик: ООО «Северный контур», 127015, Москва, ул. Лесная, д. 5, ИНН 7701234567.
5.2. Покупатель: ООО «Речной порт», 115184, Москва, ул. Большая, д. 12, ИНН 7709876543.
5.3. К договору применяется применимое право Российской Федерации; споры — в Арбитражном суде города Москвы.
`,
      "docs/SOURCES.md": `# Источники норм

| Норма | Реквизиты акта | Что берём |
| --- | --- | --- |
| Ст. 506 ГК РФ | ГК РФ, часть вторая | договор поставки |
| Ст. 330 ГК РФ | ГК РФ, часть первая | неустойка (пеня) |
| Ст. 309 ГК РФ | ГК РФ, часть первая | исполнение обязательств |
`,
      "docs/README.md": `# Резюме договора поставки

Клиент получает оборудование по Спецификации и платит за него. Срок поставки — в Приложении № 1.

## Что важно знать

- Просрочка Поставщика: пеня 0,1 % в день.
- Убытки сверх пени возмещаются в непокрытой части.
- Споры разбирает Арбитражный суд города Москвы.
`,
    },
  },
});

SPECS.push({
  slug: "content_studio",
  title: "Контент-студия",
  deliverable: "content",
  summary: "Пишет посты и статьи с проверяемой структурой: заголовок, лид, подзаголовки, метаданные, источники и призыв к действию — без штампов.",
  checks: ["validate", "lint-slop"],
  skills: ["longform-post", "copy-edit"],
  references: [
    { id: "ref-01", style: "one-thesis", source: "references/sources.yaml#longform-post", takeaway: "Один длинный текст держит один тезис; каждый абзац продвигает его, а не повторяет сказанное." },
    { id: "ref-02", style: "concrete-open", source: "references/sources.yaml#longform-post", takeaway: "Первая фраза начинается с факта или сцены, а не с обобщения вроде «в современном мире»." },
    { id: "ref-03", style: "read-aloud", source: "references/sources.yaml#copy-edit", takeaway: "Правку читают вслух: спотыкание на слоге — сигнал переписать предложение короче." },
  ],
  skill: {
    slug: "longform-post",
    title: "Лонгрид",
    description: "Собирает пост: лид, два и более подзаголовка, метаданные, источники, призыв к действию.",
    steps: ["Сформулировать лид", "Развернуть подзаголовками", "Собрать метаданные и источники", "Поставить призыв к действию", "Проверить анти-слоп"],
  },
  constitution: [
    { code: "К-01", title: "Один заголовок", text: "Пост начинается с одного H1; дубли H1 запрещены." },
    { code: "К-02", title: "Лид", text: "Первый абзац объясняет пользу поста в двух-трёх предложениях." },
    { code: "К-03", title: "Структура", text: "Не менее двух подзаголовков H2 разбивают текст на смысловые блоки." },
    { code: "К-04", title: "Метаданные", text: "content/meta.json содержит title, description и tags." },
    { code: "К-05", title: "Источники", text: "Каждый факт с числом или нормой подтверждён в content/SOURCES.md." },
    { code: "К-06", title: "Призыв", text: "Пост заканчивается призывом к действию." },
  ],
  banned: [
    { code: "B-01", pattern: "в современном мире" },
    { code: "B-02", pattern: "не секрет, что" },
    { code: "B-03", pattern: "играет важную роль" },
    { code: "B-04", pattern: "давайте разберёмся" },
    { code: "B-05", pattern: "как никогда" },
  ].map((b) => ({ ...b, title: `«${b.pattern}»`, text: "штамп-клише" })),
  quotas: [
    { code: "Q-01", title: "Не более одного списка на два подзаголовка." },
    { code: "Q-02", title: "Не более одной метафоры на весь пост." },
  ],
  rules: [
    { code: "V-01", title: "Пост на месте", kind: "fileExists", path: "content/post.md", ok: "content/post.md найден", fail: "нет content/post.md" },
    { code: "V-02", title: "Один H1", kind: "regexAtLeast", path: "content/post.md", pattern: "^#\\s+\\S", min: 1, ok: "заголовок есть", fail: "нет заголовка H1 (К-01)" },
    { code: "V-03", title: "Подзаголовки", kind: "regexAtLeast", path: "content/post.md", pattern: "^##\\s+\\S", min: 2, ok: "два и более H2", fail: "меньше двух H2 (К-03)" },
    { code: "V-04", title: "Метаданные", kind: "jsonHas", path: "content/meta.json", keys: ["title", "description", "tags"], ok: "title/description/tags на месте", fail: "нет обязательного поля метаданных (К-04)" },
    { code: "V-05", title: "Источники", kind: "fileExists", path: "content/SOURCES.md", ok: "content/SOURCES.md найден", fail: "нет content/SOURCES.md (К-05)" },
    { code: "V-06", title: "Объём", kind: "minWords", path: "content/post.md", min: 260, ok: "объём достаточный", fail: "пост короче 260 слов" },
    { code: "V-07", title: "Призыв к действию", kind: "textHasAll", path: "content/post.md", patterns: ["Попробуйте"], ok: "призыв есть", fail: "нет призыва к действию (К-06)" },
    { code: "V-08", title: "README студии проекта", kind: "fileExists", path: "content/README.md", ok: "content/README.md найден", fail: "нет content/README.md" },
  ],
  slopExtensions: [".md"],
  slop: [
    { code: "B-01", pattern: "в современном мире", message: "штамп" },
    { code: "B-02", pattern: "не секрет, что", message: "штамп" },
    { code: "B-03", pattern: "играет важную роль", message: "пустая оценка" },
    { code: "B-04", pattern: "давайте разберёмся", message: "филлер" },
    { code: "B-05", pattern: "как никогда", message: "штамп" },
  ],
  demo: {
    slug: "post-bez-shablonov",
    task: "написать лонгрид о сборке страниц под задачу вместо шаблонов",
    files: {
      "content/post.md": `# Лендинг без шаблона: как собирать страницу под задачу

Шаблон экономит час на старте и стоит недели на правках. Мы собираем страницы из блоков, которые появляются из задачи клиента, а не из чужого макета. Ниже — как устроен процесс и что он даёт.

## Почему шаблон мешает

Готовый шаблон приносит чужие решения: чужую сетку, чужой ритм, чужой список блоков. Первый экран получается похожим на сотню других. Когда клиент просит убрать блок, выясняется, что он держит соседние: сетка собрана под него. Правка превращается в перерисовку.

Второй источник потерь — контент. Шаблон рассчитан на определённую длину заголовка и число пунктов. Реальный текст в него не влезает, и его подрезают под макет. Смысл уходит в угоду сетке.

## Как устроен процесс

Мы начинаем с задачи: что человек должен понять и сделать на странице. Из задачи выводим блоки: обещание, доказательство, цена, действие. Каждый блок отвечает на один вопрос и живёт в своей сетке.

Дальше собираем типографику. Заголовок и текст задают вертикальный ритм; блоки наследуют его, а не наоборот. Когда текста больше, добавляем строку, а не уменьшаем кегль. Так страница не ломается от нового абзаца.

Затем — отклик. Кнопка и ссылка ведут себя предсказуемо: состояние фокуса видно, нажатие отвечает движением, вес макета не прыгает. Это не украшение, а условие, что человек не потеряется.

## Что получает клиент

Клиент получает страницу, у которой каждый блок обоснован задачей. Её можно дополнять: новый блок встаёт рядом, не ломая соседей. Правки остаются точечными, а не превращаются в перезапуск.

Плюс прозрачная приёмка: контраст, размеры целей нажатия и вертикальный ритм проверяются скриптом. Спор «нравится — не нравится» заменяется списком проверок.

## Как начать

Возьмите одну свою страницу и выпишите, на какой вопрос отвечает каждый блок. Если блок ни на что не отвечает — он лишний; если вопрос без блока — страница неполна. Разложите текст по блокам и проверьте ритм.

Попробуйте собрать следующий экран от задачи, а не от макета. Первый проход будет медленнее, зато правки станут точечными.
`,
      "content/meta.json": `${json({ title: "Лендинг без шаблона", description: "Как собирать страницу под задачу клиента вместо готового шаблона.", tags: ["лендинг", "вёрстка", "типографика"] })}`,
      "content/SOURCES.md": `# Источники

- C. Alexander, «A Pattern Language» — принцип «форма следует задаче».
- Исследования конверсии о влиянии длины первого абзаца.
- Наши замеры: медиана правок шаблона против блочной сборки.
`,
      "content/README.md": `# Пост «Лендинг без шаблона»

Задача: объяснить, почему блочная сборка под задачу выгоднее шаблона.

Аудитория: владельцы продукта и маркетологи без дизайнера в команде.
`,
    },
  },
});

SPECS.push({
  slug: "data_analytics",
  title: "Студия данных",
  deliverable: "analysis",
  summary: "Считает метрики и оформляет разбор: SQL-запросы, метрики с формулами, выводы и указание источника данных — всё проверяется машинно.",
  checks: ["validate", "lint-slop"],
  skills: ["metric-report", "sql-audit"],
  references: [
    { id: "ref-01", style: "single-question", source: "references/sources.yaml#metric-report", takeaway: "Отчёт отвечает на один вопрос; каждая метрика связывается с решением, а не с любопытством." },
    { id: "ref-02", style: "denominator", source: "references/sources.yaml#metric-report", takeaway: "Рядом с абсолютным числом всегда стоит знаменатель и период — иначе рост не интерпретируем." },
    { id: "ref-03", style: "sql-nullable", source: "references/sources.yaml#sql-audit", takeaway: "Аудит SQL проверяет JOIN на размножение строк и обработку NULL в агрегатах." },
  ],
  skill: {
    slug: "metric-report",
    title: "Отчёт по метрикам",
    description: "Собирает разбор: запросы, метрики с формулами, выводы и источник данных.",
    steps: ["Определить период", "Написать SQL-запросы", "Посчитать метрики с формулами", "Сформулировать выводы", "Указать источник"],
  },
  constitution: [
    { code: "К-01", title: "Воспроизводимость", text: "Каждая метрика получена запросом из analysis/queries.sql." },
    { code: "К-02", title: "Формула", text: "У метрики явная формула: числитель, знаменатель, фильтры." },
    { code: "К-03", title: "Период", text: "Указан период расчёта; без него метрика не имеет смысла." },
    { code: "К-04", title: "Источник данных", text: "analysis/report.md называет источник данных и его срез." },
    { code: "К-05", title: "Выводы", text: "Отчёт содержит раздел «Вывод» с решением, а не пересказом чисел." },
    { code: "К-06", title: "Разделение", text: "Метрики — в metrics.json, текст — в report.md; данные не дублируются." },
  ],
  banned: [
    { code: "B-01", pattern: "очевидно, что" },
    { code: "B-02", pattern: "как известно" },
    { code: "B-03", pattern: "в целом можно сказать" },
    { code: "B-04", pattern: "данные говорят сами за себя" },
  ].map((b) => ({ ...b, title: `«${b.pattern}»`, text: "вывод без опоры" })),
  quotas: [
    { code: "Q-01", title: "Не более трёх метрик на один вывод." },
    { code: "Q-02", title: "Не более одного кругового графика на отчёт." },
  ],
  rules: [
    { code: "V-01", title: "Отчёт на месте", kind: "fileExists", path: "analysis/report.md", ok: "analysis/report.md найден", fail: "нет analysis/report.md" },
    { code: "V-02", title: "Запросы на месте", kind: "fileExists", path: "analysis/queries.sql", ok: "analysis/queries.sql найден", fail: "нет analysis/queries.sql (К-01)" },
    { code: "V-03", title: "Метрики на месте", kind: "fileExists", path: "analysis/metrics.json", ok: "analysis/metrics.json найден", fail: "нет analysis/metrics.json (К-06)" },
    { code: "V-04", title: "Запросы считают", kind: "regexAtLeast", path: "analysis/queries.sql", pattern: "SELECT", min: 3, ok: "три и более SELECT", fail: "меньше трёх SELECT (К-01)" },
    { code: "V-05", title: "Структура метрик", kind: "jsonHas", path: "analysis/metrics.json", keys: ["period", "metrics"], ok: "period и metrics на месте", fail: "нет period или metrics (К-03)" },
    { code: "V-06", title: "Выводы", kind: "regexAtLeast", path: "analysis/report.md", pattern: "^##\\s+Вывод", min: 1, ok: "раздел «Вывод» есть", fail: "нет раздела «Вывод» (К-05)" },
    { code: "V-07", title: "Формулы метрик", kind: "regexAtLeast", path: "analysis/metrics.json", pattern: "\"formula\"", min: 3, ok: "у каждой метрики формула", fail: "меньше трёх формул (К-02)" },
    { code: "V-08", title: "Источник данных", kind: "textHasAll", path: "analysis/report.md", patterns: ["Источник данных"], ok: "источник указан", fail: "не указан источник данных (К-04)" },
  ],
  slopExtensions: [".md", ".sql"],
  slop: [
    { code: "B-01", pattern: "очевидно, что", message: "вывод без опоры" },
    { code: "B-02", pattern: "как известно", message: "вывод без опоры" },
    { code: "B-03", pattern: "в целом можно сказать", message: "филлер" },
    { code: "B-04", pattern: "данные говорят сами за себя", message: "вывод без опоры" },
  ],
  demo: {
    slug: "sales-dashboard",
    task: "разобрать продажи за квартал и предложить решение по ассортименту",
    files: {
      "analysis/queries.sql": `-- Выручка по месяцам
SELECT date_trunc('month', paid_at) AS month, SUM(amount) AS revenue
FROM payments WHERE status = 'paid' GROUP BY 1 ORDER BY 1;

-- Средний чек
SELECT date_trunc('month', paid_at) AS month, AVG(amount) AS avg_check
FROM payments WHERE status = 'paid' GROUP BY 1 ORDER BY 1;

-- Возвраты
SELECT date_trunc('month', refunded_at) AS month, SUM(amount) AS refunds
FROM refunds GROUP BY 1 ORDER BY 1;
`,
      "analysis/metrics.json": `${json({ period: { from: "2025-10-01", to: "2025-12-31" }, metrics: [
        { name: "Выручка", formula: "SUM(amount) WHERE status='paid'", value: 12840000 },
        { name: "Средний чек", formula: "SUM(amount)/COUNT(order_id) WHERE status='paid'", value: 6420 },
        { name: "Доля возвратов", formula: "SUM(refunds)/SUM(amount)", value: 0.031 },
      ] })}`,
      "analysis/report.md": `# Продажи за IV квартал 2025

Источник данных: таблицы payments и refunds, срез на 31.12.2025.

## Что видно

Выручка выросла на 12 % к прошлому кварталу, но средний чек почти не менялся. Рост дал объём заказов, а не цена. Доля возвратов — 3,1 %.

## Вывод

Расти за счёт объёма дороже, чем поднять чек: возвраты растут вместе с числом мелких заказов. Решение: собрать набор из трёх позиций в один заказ и протестировать на двух категориях в январе.
`,
    },
  },
});

SPECS.push({
  slug: "education",
  title: "Образовательная студия",
  deliverable: "course",
  summary: "Собирает учебный модуль: программу с целями, урок с блоками «Теория/Практика/Проверка», тест с вопросами и источники.",
  checks: ["validate", "lint-slop"],
  skills: ["lesson-plan", "quiz-builder"],
  references: [
    { id: "ref-01", style: "backward-design", source: "references/sources.yaml#lesson-plan", takeaway: "Урок проектируется от результата: сначала проверка, потом материал под неё." },
    { id: "ref-02", style: "single-objective", source: "references/sources.yaml#lesson-plan", takeaway: "Один урок — один измеримый результат, сформулированный глаголом действия." },
    { id: "ref-03", style: "distractor-design", source: "references/sources.yaml#quiz-builder", takeaway: "Дистракторы отражают типичные ошибки ученика, а не случайные числа." },
  ],
  skill: {
    slug: "lesson-plan",
    title: "План урока",
    description: "Собирает урок: цели, теория, практика, проверка и источники.",
    steps: ["Сформулировать цели обучения", "Изложить теорию", "Дать практику", "Собрать проверку", "Указать источники"],
  },
  constitution: [
    { code: "К-01", title: "Цели обучения", text: "Программа курса перечисляет измеримые цели обучения." },
    { code: "К-02", title: "Три блока урока", text: "Урок содержит блоки «Теория», «Практика» и «Проверка»." },
    { code: "К-03", title: "Практика", text: "У каждого блока теории есть задание, которое ученик делает руками." },
    { code: "К-04", title: "Проверка", text: "quiz.json содержит не менее трёх вопросов с вариантами ответа." },
    { code: "К-05", title: "Источники", text: "course/SOURCES.md называет материалы, на которых построен урок." },
    { code: "К-06", title: "Объём", text: "Урок достаточен, чтобы ученик прошёл его без дополнительного текста." },
  ],
  banned: [
    { code: "B-01", pattern: "как известно" },
    { code: "B-02", pattern: "просто запомните" },
    { code: "B-03", pattern: "это очень просто" },
    { code: "B-04", pattern: "не нужно понимать" },
  ].map((b) => ({ ...b, title: `«${b.pattern}»`, text: "суррогат объяснения" })),
  quotas: [
    { code: "Q-01", title: "Не более одной аналогии на блок теории." },
    { code: "Q-02", title: "Ровно один правильный ответ на вопрос теста." },
  ],
  rules: [
    { code: "V-01", title: "Программа на месте", kind: "fileExists", path: "course/README.md", ok: "course/README.md найден", fail: "нет course/README.md" },
    { code: "V-02", title: "Урок на месте", kind: "fileExists", path: "course/lesson-01.md", ok: "course/lesson-01.md найден", fail: "нет course/lesson-01.md" },
    { code: "V-03", title: "Тест на месте", kind: "jsonHas", path: "course/quiz.json", keys: ["questions"], ok: "вопросы есть", fail: "нет course/quiz.json с questions (К-04)" },
    { code: "V-04", title: "Три вопроса", kind: "regexAtLeast", path: "course/quiz.json", pattern: "\"question\"", min: 3, ok: "три и более вопросов", fail: "меньше трёх вопросов (К-04)" },
    { code: "V-05", title: "Цели обучения", kind: "textHasAll", path: "course/README.md", patterns: ["Цели обучения"], ok: "цели перечислены", fail: "нет блока «Цели обучения» (К-01)" },
    { code: "V-06", title: "Три блока урока", kind: "textHasAll", path: "course/lesson-01.md", patterns: ["Теория", "Практика", "Проверка"], ok: "Теория/Практика/Проверка на месте", fail: "пропущен блок урока (К-02)" },
    { code: "V-07", title: "Объём урока", kind: "minWords", path: "course/lesson-01.md", min: 220, ok: "объём достаточный", fail: "урок короче 220 слов (К-06)" },
    { code: "V-08", title: "Источники", kind: "fileExists", path: "course/SOURCES.md", ok: "course/SOURCES.md найден", fail: "нет course/SOURCES.md (К-05)" },
  ],
  slopExtensions: [".md"],
  slop: [
    { code: "B-01", pattern: "как известно", message: "суррогат объяснения" },
    { code: "B-02", pattern: "просто запомните", message: "суррогат объяснения" },
    { code: "B-03", pattern: "это очень просто", message: "обесценивание" },
    { code: "B-04", pattern: "не нужно понимать", message: "отказ от объяснения" },
  ],
  demo: {
    slug: "kurs-proverka-dannyh",
    task: "собрать первый урок курса о проверке данных на входе",
    files: {
      "course/README.md": `# Курс: Проверка данных на входе

## Цели обучения

К концу курса ученик умеет:

1. Находить места, где данные входят в систему.
2. Писать проверку до сохранения, а не после.
3. Различать ошибку данных и ошибку логики.

## Программа

- Урок 1. Где данные входят в систему.
- Урок 2. Проверка типов и границ.
- Урок 3. Сообщения об ошибках.
`,
      "course/lesson-01.md": `# Урок 1. Где данные входят в систему

## Теория

Данные попадают в программу через границу: форму, файл, запрос к API. Граница — единственное место, где данные ещё чужие и могут быть какими угодно. Внутри системы мы уже отвечаем за их форму, поэтому проверять нужно на границе, а не в середине.

Граница отвечает на три вопроса: что пришло, в каком виде, что с этим делать. Первый вопрос — про происхождение: это форма регистрации, файл импорта или ответ чужого сервиса. Второй — про форму: строка это или число, есть ли обязательные поля, в каком диапазоне значения. Третий — про поведение: пропустить, поправить или отклонить.

Когда проверка стоит после обработки, ошибка успевает распространиться по коду. Значение попадает в расчёт, расчёт — в отчёт, отчёт — к человеку. Найти источник такой ошибки трудно: к моменту сбоя данные уже прошли несколько шагов и потеряли связь с формой, из которой пришли.

Есть и цена. Проверка на границе требует явно описать, что мы считаем допустимым. Это работа: нужно знать поля, типы и границы. Зато дальше код может опираться на проверенные данные и не переспрашивать их на каждом шаге.

## Практика

Возьмите форму входа. Выпишите поля и для каждого тип и допустимый диапазон: имя — непустая строка, возраст — целое от 18, почта — строка с одним «@». Отметьте место, где сейчас стоит проверка. Если она стоит после сохранения, перенесите её на границу и оставьте в одном месте, а не в трёх.

Затем проверьте границу на ошибках. Отправьте пустое поле, число вместо строки и строку неверного формата. Каждый случай должен получить понятное сообщение, а не падение. Запишите, что произошло в каждом случае: так вы увидите, где проверка отсутствует.

## Проверка

Пройдите тест из quiz.json. Разберите вопрос про границу: почему проверка «в середине» дороже проверки на входе. Затем вернитесь к своей форме и опишите одним предложением, что именно вы перенесли на границу и почему.
`,
      "course/quiz.json": `${json({ questions: [
        { question: "Где проверять данные?", options: ["На границе", "После сохранения", "В базе"], answer: "На границе" },
        { question: "Что описывает граница?", options: ["Что пришло и в каком виде", "Кто автор", "Сколько памяти"], answer: "Что пришло и в каком виде" },
        { question: "Чем дорога поздняя проверка?", options: ["Ошибка распространяется по коду", "Медленная вёрстка", "Нужен дизайнер"], answer: "Ошибка распространяется по коду" },
      ] })}`,
      "course/SOURCES.md": `# Источники

- Принцип «parse, don't validate» (A. King).
- Практики граничной валидации веб-форм.
- Наш разбор инцидентов с данными на границе.
`,
    },
  },
});

SPECS.push({
  slug: "mini_apps",
  title: "Студия мини-приложений",
  deliverable: "app",
  summary: "Собирает лёгкие веб-приложения: разметка, скрипт и стиль, без инлайновых обработчиков и тяжёлых эффектов — с проверкой доступности цели нажатия.",
  checks: ["validate", "lint-slop"],
  skills: ["single-page-app", "a11y-pass"],
  references: [
    { id: "ref-01", style: "one-screen", source: "references/sources.yaml#single-page-app", takeaway: "Экран решает одну задачу; вторичные действия уходят в меню, а не теснятся рядом." },
    { id: "ref-02", style: "instant-feedback", source: "references/sources.yaml#single-page-app", takeaway: "Каждое нажатие отвечает в пределах 100 мс — сменой состояния, а не спиннером." },
    { id: "ref-03", style: "focus-visible", source: "references/sources.yaml#a11y-pass", takeaway: "Фокус виден на каждом интерактивном элементе; порядок обхода совпадает с визуальным." },
  ],
  skill: {
    slug: "single-page-app",
    title: "Одностраничное приложение",
    description: "Собирает мини-приложение: разметка, скрипт с addEventListener, стиль.",
    steps: ["Собрать разметку", "Навесить обработчики через addEventListener", "Оформить стиль без transition: all", "Проверить анти-слоп"],
  },
  constitution: [
    { code: "К-01", title: "Структура", text: "Приложение состоит из index.html, app.js и style.css." },
    { code: "К-02", title: "Разделение", text: "Разметка не содержит обработчиков onclick: они навешиваются в app.js." },
    { code: "К-03", title: "Современный JS", text: "Скрипт использует let/const, а не var." },
    { code: "К-04", title: "Отклик", text: "Интерактив реализован через addEventListener, а не через alert." },
    { code: "К-05", title: "Стиль", text: "Стиль без transition: all и без !important." },
    { code: "К-06", title: "Заголовок", text: "У страницы есть <title>." },
  ],
  banned: [
    { code: "B-01", pattern: "transition: all" },
    { code: "B-02", pattern: "onclick=" },
    { code: "B-03", pattern: "!important" },
    { code: "B-04", pattern: "console.log" },
  ].map((b) => ({ ...b, title: `«${b.pattern}»`, text: "запрещённый приём" })),
  quotas: [
    { code: "Q-01", title: "Не более двух анимаций на экран." },
    { code: "Q-02", title: "Не более одного акцентного цвета." },
  ],
  rules: [
    { code: "V-01", title: "Разметка на месте", kind: "fileExists", path: "app/index.html", ok: "app/index.html найден", fail: "нет app/index.html" },
    { code: "V-02", title: "Скрипт на месте", kind: "fileExists", path: "app/app.js", ok: "app/app.js найден", fail: "нет app/app.js (К-01)" },
    { code: "V-03", title: "Заголовок страницы", kind: "regexAtLeast", path: "app/index.html", pattern: "<title>", min: 1, ok: "<title> есть", fail: "нет <title> (К-06)" },
    { code: "V-04", title: "Без var", kind: "regexAbsent", path: "app/app.js", pattern: "\\bvar\\s", ok: "let/const", fail: "найден var (К-03)" },
    { code: "V-05", title: "Отклик через addEventListener", kind: "regexAtLeast", path: "app/app.js", pattern: "addEventListener", min: 1, ok: "addEventListener есть", fail: "нет addEventListener (К-04)" },
    { code: "V-06", title: "Без alert", kind: "regexAbsent", path: "app/app.js", pattern: "\\balert\\(", ok: "alert не используется", fail: "найден alert (К-04)" },
    { code: "V-07", title: "Стиль на месте", kind: "fileExists", path: "app/style.css", ok: "app/style.css найден", fail: "нет app/style.css (К-01)" },
    { code: "V-08", title: "README проекта", kind: "fileExists", path: "README.md", ok: "README.md найден", fail: "нет README.md" },
  ],
  slopExtensions: [".html", ".js", ".css", ".md"],
  slop: [
    { code: "B-01", pattern: "transition:\\s*all", message: "тяжёлая анимация" },
    { code: "B-02", pattern: "onclick=", message: "инлайновый обработчик" },
    { code: "B-03", pattern: "!important", message: "насилие над каскадом" },
    { code: "B-04", pattern: "console\\.log", message: "отладочный шум" },
  ],
  demo: {
    slug: "timer-app",
    task: "собрать помодоро-таймер как мини-приложение без сборщика",
    files: {
      "README.md": `# Таймер «Помодоро»

Мини-приложение без сборщика: разметка, скрипт и стиль.

## Запуск

Откройте app/index.html в браузере.
`,
      "app/index.html": `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Таймер «Помодоро»</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main class="timer">
      <p class="timer__value" id="value" role="timer" aria-live="polite">25:00</p>
      <div class="timer__controls">
        <button class="timer__button" id="start" type="button">Старт</button>
        <button class="timer__button" id="reset" type="button">Сброс</button>
      </div>
    </main>
    <script src="app.js" type="module"></script>
  </body>
</html>
`,
      "app/app.js": `/* Логика помодоро-таймера: без var, без alert, обработчики через addEventListener. */
const TOTAL = 25 * 60;
const value = document.querySelector("#value");
const start = document.querySelector("#start");
const reset = document.querySelector("#reset");

let left = TOTAL;
let tick = null;

const render = () => {
  const minutes = String(Math.floor(left / 60)).padStart(2, "0");
  const seconds = String(left % 60).padStart(2, "0");
  value.textContent = \`\${minutes}:\${seconds}\`;
};

const stop = () => {
  if (tick !== null) {
    clearInterval(tick);
    tick = null;
  }
  start.textContent = "Старт";
};

const run = () => {
  stop();
  tick = setInterval(() => {
    left -= 1;
    render();
    if (left <= 0) {
      stop();
      left = TOTAL;
      render();
    }
  }, 1000);
  start.textContent = "Пауза";
};

start.addEventListener("click", () => {
  if (tick === null) run();
  else stop();
});

reset.addEventListener("click", () => {
  stop();
  left = TOTAL;
  render();
});

render();
`,
      "app/style.css": `.timer {
  max-width: 22rem;
  margin: 15vh auto;
  font-family: system-ui, sans-serif;
  text-align: center;
}

.timer__value {
  font-size: 4rem;
  font-variant-numeric: tabular-nums;
  margin: 0 0 1.5rem;
}

.timer__controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.timer__button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.5rem 1.25rem;
  border: 1px solid #123;
  border-radius: 0.5rem;
  background: #fff;
  transition: background-color 120ms ease;
}

.timer__button:hover {
  background: #eef;
}

.timer__button:focus-visible {
  outline: 3px solid #36c;
  outline-offset: 2px;
}
`,
    },
  },
});

SPECS.push({
  slug: "mobile_apps",
  title: "Студия мобильных приложений",
  deliverable: "app",
  summary: "Собирает экран мобильного приложения: манифест, модуль экрана с состоянием и разметкой, доступные подписи и README.",
  checks: ["validate", "lint-slop"],
  skills: ["screen-composer", "a11y-pass"],
  references: [
    { id: "ref-01", style: "thumb-zone", source: "references/sources.yaml#screen-composer", takeaway: "Главные действия — в нижней трети экрана, в зоне большого пальца." },
    { id: "ref-02", style: "platform-nav", source: "references/sources.yaml#screen-composer", takeaway: "Навигация следует платформе: таб-бар снизу на iOS, системная панель на Android." },
    { id: "ref-03", style: "touch-target", source: "references/sources.yaml#a11y-pass", takeaway: "Цель нажатия не меньше 44×44 px и отделена от соседей видимым зазором." },
  ],
  skill: {
    slug: "screen-composer",
    title: "Экран приложения",
    description: "Собирает экран: манифест, модуль с состоянием, доступная разметка.",
    steps: ["Описать манифест", "Собрать состояние экрана", "Отрисовать разметку", "Добавить подписи доступности", "Проверить анти-слоп"],
  },
  constitution: [
    { code: "К-01", title: "Манифест", text: "app/app.json задаёт имя и версию приложения." },
    { code: "К-02", title: "Модуль экрана", text: "Экран живёт в app/src/App.mjs и экспортируется." },
    { code: "К-03", title: "Состояние", text: "Экран хранит состояние явно, а не в замыканиях разметки." },
    { code: "К-04", title: "Доступность", text: "Интерактивные элементы имеют подписи доступности." },
    { code: "К-05", title: "Без alert", text: "Обратная связь — в интерфейсе, а не через alert." },
    { code: "К-06", title: "README", text: "README.md объясняет, как запустить приложение." },
  ],
  banned: [
    { code: "B-01", pattern: "\\balert\\(" },
    { code: "B-02", pattern: "TODO" },
    { code: "B-03", pattern: "console\\.log" },
    { code: "B-04", pattern: ":\\s*any\\b" },
  ].map((b) => ({ ...b, title: `«${b.pattern}»`, text: "запрещённый приём" })),
  quotas: [
    { code: "Q-01", title: "Не более одного акцентного действия на экран." },
    { code: "Q-02", title: "Не более двух уровней вложенности разметки." },
  ],
  rules: [
    { code: "V-01", title: "Манифест на месте", kind: "fileExists", path: "app/app.json", ok: "app/app.json найден", fail: "нет app/app.json" },
    { code: "V-02", title: "Модуль экрана", kind: "fileExists", path: "app/src/App.mjs", ok: "app/src/App.mjs найден", fail: "нет app/src/App.mjs (К-02)" },
    { code: "V-03", title: "Имя и версия", kind: "jsonHas", path: "app/app.json", keys: ["name", "version"], ok: "name и version на месте", fail: "нет name или version (К-01)" },
    { code: "V-04", title: "Экспорт экрана", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "\\bexport\\b", min: 1, ok: "экран экспортирован", fail: "App.mjs ничего не экспортирует (К-02)" },
    { code: "V-05", title: "Без alert", kind: "regexAbsent", path: "app/src/App.mjs", pattern: "\\balert\\(", ok: "alert не используется", fail: "найден alert (К-05)" },
    { code: "V-06", title: "Доступность", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "aria-label", min: 1, ok: "подписи доступности есть", fail: "нет подписей доступности (К-04)" },
    { code: "V-07", title: "README проекта", kind: "fileExists", path: "README.md", ok: "README.md найден", fail: "нет README.md (К-06)" },
    { code: "V-08", title: "Состояние экрана", kind: "regexAtLeast", path: "app/src/App.mjs", pattern: "state", min: 1, ok: "состояние хранится явно", fail: "нет явного состояния (К-03)" },
  ],
  slopExtensions: [".mjs", ".json", ".md"],
  slop: [
    { code: "B-01", pattern: "\\balert\\(", message: "обратная связь через alert" },
    { code: "B-02", pattern: "TODO", message: "незавершённое" },
    { code: "B-03", pattern: "console\\.log", message: "отладочный шум" },
    { code: "B-04", pattern: ":\\s*any\\b", message: "нетипизированное место" },
  ],
  demo: {
    slug: "notes-app",
    task: "собрать экран заметок с состоянием и доступными подписями",
    files: {
      "README.md": `# Заметки

Экран списка заметок с добавлением и удалением.

## Запуск

Модуль app/src/App.mjs отрисует экран в контейнер с идентификатором app.
`,
      "app/app.json": `${json({ name: "notes", version: "1.0.0", entry: "src/App.mjs", displayName: "Заметки" })}`,
      "app/src/App.mjs": `/* Экран заметок: состояние хранится явно, разметка несёт подписи доступности. */

export function createState() {
  return {
    items: [
      { id: 1, text: "Позвонить в порт" },
      { id: 2, text: "Подписать акт" },
    ],
    draft: "",
  };
}

const item = (note) => \`<li class="note">
  <span class="note__text">\${note.text}</span>
  <button type="button" aria-label="Удалить заметку" data-action="remove" data-id="\${note.id}">×</button>
</li>\`;

export function render(state) {
  const list = state.items.map(item).join("");
  return \`<section class="screen" aria-labelledby="notes-title">
  <h1 id="notes-title">Заметки</h1>
  <ul class="notes">\${list}</ul>
  <form class="compose">
    <input class="compose__field" aria-label="Новая заметка" data-role="draft" value="\${state.draft}" />
    <button type="button" aria-label="Добавить заметку" data-action="add">Добавить</button>
  </form>
</section>\`;
}

export function addItem(state, text) {
  if (!text.trim()) return state;
  const id = Math.max(0, ...state.items.map((note) => note.id)) + 1;
  return { ...state, items: [...state.items, { id, text }], draft: "" };
}

export function removeItem(state, id) {
  return { ...state, items: state.items.filter((note) => note.id !== id) };
}

export default { createState, render, addItem, removeItem };
`,
    },
  },
});

/*__SPECS__*/

const main = () => {
  const dirs = SPECS.map((s) => T.writeVertical({ ...s, ...(TZ_OVERRIDES[s.slug] ?? {}) }));
  for (const dir of dirs) process.stdout.write(`вертикаль создана: ${dir}\n`);
  process.stdout.write(`готово: ${dirs.length} вертикалей\n`);
};

main();
