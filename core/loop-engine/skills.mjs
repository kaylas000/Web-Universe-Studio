/* ЦЕХ · Universal Loop Engine — skills.mjs
   Загрузчик скиллов (§4.6 ТЗ). Скилл — директория:
     skill.yaml        — метаданные приёма (name/title/description/steps/inputs/outputs)
     templates/*.j2    — шаблоны под роли (planner/coder/verifier/fixer)
     hooks/*.mjs       — опциональные ESM-крючки `export default async function(ctx){}`
                         (pre_execute / post_execute; НЕ Python — закон цеха)

   Рендер — через template.mjs ({{ }}, {% if %}, {% for %}, {# #}, {var}).

   Публичный API:
     listSkills(verticalDir)                 → string[]  (ids)
     loadSkill(skillDir)                     → Skill
     loadSkills(verticalDir)                 → Skill[]
     renderSkillTemplate(skill, name, ctx)   → string
     runSkillHook(skill, name, ctx)          → ctx'
     executeSkill(skill, { template, context }) → { template, output, context, hooks }
*/

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

import { parseSimpleYaml } from "./config.mjs";
import { renderTemplate } from "./template.mjs";

export const SKILL_ERROR = "E-SKILL";

export class SkillError extends Error {
  constructor(message, code = SKILL_ERROR) {
    super(message);
    this.name = "SkillError";
    this.code = code;
  }
}

/** Директории-скиллы внутри verticalDir/skills (без «_» и без файлов). */
export function listSkills(verticalDir) {
  const root = join(verticalDir, "skills");
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => !name.startsWith("_") && !name.startsWith("."))
    .map((name) => join(root, name))
    .filter((dir) => statSync(dir).isDirectory())
    .sort();
}

/** Имена шаблонов ролей в skills/<id>/templates/*.j2 → без расширения. */
function listTemplates(skillDir) {
  const dir = join(skillDir, "templates");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".j2"))
    .map((f) => basename(f, ".j2"))
    .sort();
}

/** Метаданные скилла из skill.yaml (name/description/steps/…). */
function readSkillMeta(skillDir) {
  const file = join(skillDir, "skill.yaml");
  if (!existsSync(file)) throw new SkillError(`нет skill.yaml в ${skillDir}`);
  const meta = parseSimpleYaml(readFileSync(file, "utf8")) ?? {};
  if (!meta.name) meta.name = basename(skillDir);
  return meta;
}

/** Загружает скилл: метаданные + список шаблонов + ленивые ссылки на крючки. */
export function loadSkill(skillDir) {
  const dir = skillDir;
  const meta = readSkillMeta(dir);
  const templates = listTemplates(dir);
  const hooksDir = join(dir, "hooks");
  const hooks = {};
  for (const name of ["pre_execute", "post_execute"]) {
    const file = join(hooksDir, `${name}.mjs`);
    if (existsSync(file)) hooks[name] = file;
  }
  return { id: String(meta.name), dir, meta, templates, hooks };
}

export function loadSkills(verticalDir) {
  return listSkills(verticalDir).map((dir) => loadSkill(dir));
}

/** Ищет скилл по id в вертикали; null, если нет. */
export function findSkill(verticalDir, id) {
  const target = listSkills(verticalDir).find((dir) => basename(dir) === String(id));
  if (!target) return null;
  try {
    return loadSkill(target);
  } catch (err) {
    // скилл-«заглушка» без skill.yaml (например, только SKILL.md) — не считается исполняемым
    if (err instanceof SkillError) return null;
    throw err;
  }
}

/** Рендерит шаблон роли скилла по контексту (см. template.mjs). */
export function renderSkillTemplate(skill, name, context = {}) {
  const file = join(skill.dir, "templates", `${name}.j2`);
  if (!existsSync(file)) throw new SkillError(`у скилла «${skill.id}» нет шаблона ${name}.j2`);
  return renderTemplate(readFileSync(file, "utf8"), context);
}

/** Выполняет ESM-крючок скилла, если он объявлен; возвращает ctx (возможно, изменённый). */
export async function runSkillHook(skill, name, ctx = {}) {
  const file = skill.hooks?.[name];
  if (!file) return ctx;
  const mod = await import(pathToFileURL(file).href);
  const fn = mod.default;
  if (typeof fn !== "function") throw new SkillError(`крючок ${name} скилла «${skill.id}» не экспортирует функцию`);
  const out = await fn(ctx);
  return out === undefined ? ctx : out;
}

/** Полный прогон приёма: pre_execute → рендер шаблона → post_execute. */
export async function executeSkill(skill, { template = "planner", context = {} } = {}) {
  let ctx = await runSkillHook(skill, "pre_execute", context);
  const output = renderSkillTemplate(skill, template, ctx);
  ctx = await runSkillHook(skill, "post_execute", ctx);
  return { skill: skill.id, template, output, context: ctx, hooks: Object.keys(skill.hooks) };
}
