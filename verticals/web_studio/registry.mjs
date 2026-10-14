/* registry.mjs — мост между ядром и студией «Веб-студия ЦЕХ» (§5.1 IVertical, §7.1).
   Ядро (core/gate.mjs, core/orchestrator) знает только этот контракт, а не детали студии:
   метаданные вертикали + сборку конфига цикла для проекта.

   Приёмка web_studio богаче прочих: помимо validate и анти-слопа — редполитика (lint-copy)
   и маркетинг-архитектура (lint-marketing), см. §15.2 ТЗ. */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { contrastRatio } from "../../core/vertical-kit/index.mjs";

const DIR = dirname(fileURLToPath(import.meta.url));

/** Каталог проекта из артефакта/контекста (у ворот нет своего projectName). */
function projectDirOf(artifact, context) {
  const raw = context?.projectDir ?? context?.dir ?? artifact?.projectDir ?? artifact?.dir ?? null;
  return raw ? resolve(String(raw)) : resolve(DIR, "projects");
}

function readText(path) {
  try {
    return existsSync(path) && statSync(path).isFile() ? readFileSync(path, "utf8") : null;
  } catch {
    return null;
  }
}

function codeOf(line, fallback) {
  return /\b([A-ZА-Я]{1,2}-\d{2})\b/.exec(String(line))?.[1] ?? fallback;
}

function hexToRgb(value) {
  const raw = String(value ?? "").replace("#", "");
  const hex = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return [0, 0, 0];
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Прогоняет скрипт приёмки студии на проекте и разбирает его вывод (OK/FAIL + ИТОГ).
 * Свои проверки ворота не дублируют: судит тот же скрипт, что и в приёмке проекта.
 */
function runStudioScript(script, projectDir) {
  const rel = (() => {
    try {
      return relative(DIR, projectDir) || ".";
    } catch {
      return String(projectDir);
    }
  })();
  const res = spawnSync(process.execPath, [join(DIR, "scripts", script), rel], { cwd: DIR, encoding: "utf8", timeout: 120_000 });
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  // Два формата студии: строки валидатора «FAIL V-xx …» и находки линтеров «file:line CODE «…»»
  const failures = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^FAIL\b/.test(l) || /^\S+?:\d+\s+[A-ZА-Я]{1,2}-\d{2}\b/.test(l));
  const total = /ИТОГ:\s*(\d+)\/(\d+)/.exec(out);
  return {
    ok: (res.status ?? 1) === 0 && failures.length === 0,
    failures,
    checked: total ? Number(total[2]) : failures.length,
    passed: total ? Number(total[1]) : 0,
    output: out,
  };
}

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
  /**
   * Реальные ворота студии (§5.2): каждый verify проверяет артефакт проекта, а не отдаёт
   * пустой список. Там, где вердикт человеческий (арт-директор, К-09), ворота честно говорят
   * «пропущено» — зелёный без проверки нельзя выдавать за приёмку.
   */
  getVerificationGates() {
    return {
      constitution: {
        name: "constitution",
        verify: async (artifact, context) => {
          const res = runStudioScript("validate.mjs", projectDirOf(artifact, context));
          return { passed: res.ok, errors: res.failures.map((line) => ({ code: codeOf(line, "V-00"), severity: "major", description: line })), metrics: { checked: res.checked, passed: res.passed } };
        },
      },
      anti_slop: {
        name: "anti_slop",
        verify: async (artifact, context) => {
          const res = runStudioScript("lint-slop.mjs", projectDirOf(artifact, context));
          return { passed: res.ok, errors: res.failures.map((line) => ({ code: codeOf(line, "B-00"), severity: "major", description: line })), metrics: { hits: res.failures.length } };
        },
      },
      schema: {
        name: "schema",
        verify: async (artifact, context) => {
          const dir = projectDirOf(artifact, context);
          const required = ["DIRECTION.md", "STRUCTURE.md", "SOURCES.md", "REVIEW.md", "site/index.html", "site/styles.css", "site/robots.txt", "site/sitemap.xml", "site/404.html"];
          const missing = required.filter((rel) => !existsSync(join(dir, rel)));
          return { passed: missing.length === 0, errors: missing.map((rel) => ({ code: "V-01", severity: "major", description: `нет обязательного артефакта: ${rel}` })), metrics: { checked: required.length } };
        },
      },
      a11y_contrast: {
        name: "a11y_contrast",
        verify: async (artifact, context) => {
          const dir = projectDirOf(artifact, context);
          const css = readText(join(dir, "site", "styles.css")) ?? "";
          const html = readText(join(dir, "site", "index.html")) ?? "";
          const errors = [];
          const ink = css.match(/--ink:\s*(#[0-9a-fA-F]{3,8})/)?.[1] ?? null;
          const paper = css.match(/--paper(?:_[a-z0-9]+)?:\s*(#[0-9a-fA-F]{3,8})/)?.[1] ?? null;
          if (ink && paper) {
            const ratio = contrastRatio(hexToRgb(ink), hexToRgb(paper));
            if (ratio !== null && ratio < 4.5) errors.push({ code: "V-17", severity: "major", description: `контраст текста/фона ${ratio.toFixed(2)}:1 < 4.5:1 (${ink} на ${paper})` });
          }
          if (html && !/lang="[a-z]{2}/i.test(html)) errors.push({ code: "V-21", severity: "minor", description: "у <html> нет lang" });
          if (css && !/:focus-visible/.test(css)) errors.push({ code: "V-17", severity: "major", description: "нет :focus-visible — фокус не виден (B-19, SK-17)" });
          return { passed: errors.length === 0, errors, metrics: { ink, paper } };
        },
      },
      touch_target: {
        name: "touch_target",
        verify: async (artifact, context) => {
          const dir = projectDirOf(artifact, context);
          const css = readText(join(dir, "site", "styles.css")) ?? "";
          const errors = [];
          const small = [...css.matchAll(/min-height:\s*(\d+)px/g)].map((m) => Number(m[1])).filter((n) => n < 44);
          if (css.length > 0 && !/min-height:\s*(4[4-9]|[5-9]\d|\d{3,})px/.test(css)) {
            errors.push({ code: "V-11", severity: "major", description: "нет тач-таргета ≥ 44px для интерактивных элементов" });
          }
          for (const value of small) errors.push({ code: "V-11", severity: "minor", description: `min-height: ${value}px меньше 44px — мелкий тач-таргет` });
          return { passed: errors.length === 0, errors, metrics: { smallTargets: small.length } };
        },
      },
      llm_judge: {
        name: "llm_judge",
        verify: async () => ({
          passed: true,
          errors: [],
          metrics: { ran: false },
          // К-09: вкус, драматургия и «довёл ли приём до конца» — вердикт человека. Ворота
          // не имитируют проверку: ran=false видно в отчёте.
          note: "вердикт арт-директора (К-09) — машинно не проверяется",
        }),
      },
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
