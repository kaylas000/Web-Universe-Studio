/* registry.mjs — мост между ядром и студией «Студия мобильных приложений» (§5.1 IVertical, §7.1).
   Экспортирует IVertical-объект: метаданные, приёмы, инструменты, ворота и сборку
   конфига цикла для проекта. Ядро (core/gate.mjs, core/orchestrator) знает только
   этот контракт, а не детали студии. */

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
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

export const vertical = {
  name: "mobile_apps",
  title: "Студия мобильных приложений",
  deliverable: "app",
  checks: ["validate","lint-slop"],
  validator: "vertical_project",
  gates: ["G1-direction","G2-structure","G3-artifact","G4-final"],

  /* --- IVertical (§5.1) --- */
  getSkills() { return skillIds(); },
  getTools() { return ["validate_artifact","lint_slop"]; },
  getVerificationGates() {
    return {
      constitution: { name: "constitution", verify: async () => ({ errors: [] }) },
      anti_slop: { name: "anti_slop", verify: async () => ({ errors: [] }) },
      schema: { name: "schema", verify: async () => ({ errors: [] }) },
    };
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
      task: "собрать экран заметок с состоянием и доступными подписями",
      loop: { max_iterations: 1 },
      generator: { type: "mock" },
      context_builder: { type: "studio_default" },
      validator: { type: "vertical_project", checks: this.checks },
    };
  },
};

export default vertical;
