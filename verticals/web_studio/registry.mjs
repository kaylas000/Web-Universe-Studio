/* registry.mjs — мост между ядром и студией «Веб-студия ЦЕХ» (§5.1 IVertical, §7.1).
   Ядро (core/gate.mjs, core/orchestrator) знает только этот контракт, а не детали студии:
   метаданные вертикали + сборку конфига цикла для проекта.

   Приёмка web_studio богаче прочих: помимо validate и анти-слопа — редполитика (lint-copy)
   и маркетинг-архитектура (lint-marketing), см. §15.2 ТЗ. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));

/** Каталоги приёмов студии (без «_»-шаблонов). @returns {string[]} */
function skillIds() {
  const root = join(DIR, "skills");
  try {
    return readdirSync(root)
      .filter((n) => !n.startsWith("_") && !n.startsWith("."))
      .filter((n) => {
        try {
          return statSync(join(root, n)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort();
  } catch {
    return [];
  }
}

export const vertical = {
  name: "web_studio",
  title: "Веб-студия ЦЕХ (эталон)",
  deliverable: "site",
  checks: ["validate", "lint-slop", "lint-copy", "lint-marketing"],
  validator: "vertical_project",
  gates: ["G1", "G2", "G3", "G4"],

  /* --- IVertical (§5.1) --- */
  getSkills() {
    return skillIds();
  },
  getTools() {
    return ["validate_artifact", "lint_slop", "lint_copy", "lint_marketing"];
  },
  /** @returns {Record<string, { name: string, verify: (artifact: any, ctx?: any) => any }>} */
  getVerificationGates() {
    return {
      constitution: { name: "constitution", verify: async () => ({ errors: [] }) },
      anti_slop: { name: "anti_slop", verify: async () => ({ errors: [] }) },
      schema: { name: "schema", verify: async () => ({ errors: [] }) },
      a11y_contrast: { name: "a11y_contrast", verify: async () => ({ errors: [] }) },
      touch_target: { name: "touch_target", verify: async () => ({ errors: [] }) },
      llm_judge: { name: "llm_judge", verify: async () => ({ errors: [] }) },
    };
  },
  getDefaultSkill() {
    return "industrial-passport";
  },
  /** Артефакт как JSON-объект проекта (для оркестратора). */
  async run(skillName, brief, context = {}) {
    const projectName = context.projectName ?? context.project ?? null;
    const manifest = projectName ? join(DIR, "projects", projectName, "site", "index.html") : null;
    let html = null;
    if (manifest) {
      try {
        html = readFileSync(manifest, "utf8").slice(0, 2000);
      } catch {
        html = null;
      }
    }
    return { skill: skillName, brief, project: projectName, deliverable: "site", hasIndexHtml: Boolean(html), sample: html };
  },

  /** @param {string} projectName @returns {Record<string, any>} */
  buildConfig(projectName) {
    return {
      project_name: projectName,
      task: "собрать сайт по брифу: DIRECTION.md → STRUCTURE.md → site/ → REVIEW.md",
      loop: { max_iterations: 1 },
      generator: { type: "mock" },
      context_builder: { type: "studio_default" },
      validator: { type: "vertical_project", checks: this.checks },
    };
  },
};

export default vertical;
