/* registry.mjs — мост между ядром и студией «Студия мини-приложений» (§5.1 IVertical, §7.1).
   Экспортирует IVertical-объект: метаданные, приёмы, инструменты, ворота и сборку
   конфига цикла для проекта. Ядро (core/gate.mjs, core/orchestrator) знает только
   этот контракт, а не детали студии.

   Ворота (getVerificationGates) здесь НЕ заглушки: каждый verify реально вызывает
   валидатор студии (constitution/anti-slop/schema/llm-judge) по каталогу проекта. */

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));

/** Каталоги приёмов студии (без «_»-шаблонов). @returns {string[]} */
function skillIds() {
  const root = join(DIR, "skills");
  try {
    return readdirSync(root)
      .filter((n) => !n.startsWith("_") && !n.startsWith("."))
      .filter((n) => { try { return statSync(join(root, n)).isDirectory(); } catch { return false; } })
      .sort();
  } catch { return []; }
}

/** Каталог проекта из артефакта/контекста гейта; дефолт — cwd. */
function projectDirOf(artifact, context) {
  const raw = context?.projectDir ?? context?.dir ?? artifact?.projectDir ?? artifact?.dir ?? null;
  return raw ? resolve(String(raw)) : process.cwd();
}

/** Нарушения «пропущен/нарушен» в форму VerificationResult (§5.2). */
function asErrors(entries) {
  return entries.map((entry) => {
    if (typeof entry === "string") return { code: "E-VAL", severity: "major", description: entry };
    return { code: entry.code ?? "E-VAL", severity: "major", description: `${entry.code ?? ""} ${entry.title ?? entry.message ?? ""}`.trim(), location: entry.file ? `${entry.file}:${entry.line ?? ""}` : null };
  });
}

export const vertical = {
  name: "mini_apps",
  title: "Студия мини-приложений",
  deliverable: "app",
  checks: ["validate","lint-slop","lint-copy"],
  validator: "vertical_project",
  gates: ["G1-direction","G2-structure","G3-artifact","G4-final"],

  /* --- IVertical (§5.1) --- */
  getSkills() { return skillIds(); },
  getTools() { return ["validate_artifact", "lint_slop", "lint_quotas", "initdata_check"]; },
  /** @returns {Record<string, { name: string, verify: Function }>} реальные ворота: вызов валидаторов студии. */
  getVerificationGates() {
    const gates = {
      constitution: {
        name: "constitution",
        verify: async (artifact, context) => {
          const { validate } = await import("./validators/constitution.mjs");
          const res = validate(projectDirOf(artifact, context));
          return { passed: res.ok, errors: asErrors(res.failures) };
        },
      },
      anti_slop: {
        name: "anti_slop",
        verify: async (artifact, context) => {
          const { check } = await import("./validators/anti-slop.mjs");
          const res = check(projectDirOf(artifact, context));
          return { passed: res.ok, errors: asErrors(res.hits) };
        },
      },
      schema: {
        name: "schema",
        verify: async (artifact, context) => {
          const { check } = await import("./validators/schema.mjs");
          const res = check(projectDirOf(artifact, context));
          return { passed: res.ok, errors: asErrors(res.missing.map((p) => `нет ${p}`)) };
        },
      },
      llm_judge: {
        name: "llm_judge",
        verify: async (artifact, context) => {
          const { judge } = await import("./validators/llm-judge.mjs");
          const res = await judge(artifact, { ...(context ?? {}), projectDir: projectDirOf(artifact, context) });
          // выключенный судья не проваливает гейт: детерминированные ворота первичны (§5.2)
          return { passed: res.ran ? Boolean(res.ok) : true, errors: asErrors(res.errors ?? []), metrics: { ran: res.ran, score: res.score } };
        },
      },
    };
    return gates;
  },

  loadReferences() { return []; },
  getDefaultSkill() { return this.getSkills()[0] ?? null; },
  /** Артефакт как объект проекта (для оркестратора). */
  async run(skillName, brief, context = {}) {
    const projectName = context.projectName ?? context.project ?? null;
    const marker = projectName ? join(DIR, "projects", projectName, "app") : null;
    return { skill: skillName, brief, project: projectName, deliverable: this.deliverable, hasArtifact: Boolean(marker && existsSync(marker)) };
  },

  /** @param {string} projectName @returns {Record<string, any>} */
  buildConfig(projectName) {
    return {
      project_name: projectName,
      task: "собрать Telegram/VK Mini App по брифу: DIRECTION.md → STRUCTURE.md → app/ → REVIEW.md",
      loop: { max_iterations: 1 },
      generator: { type: "mock" },
      context_builder: { type: "studio_default" },
      validator: { type: "vertical_project", checks: this.checks, judge_generator: null },
    };
  },
};

export default vertical;