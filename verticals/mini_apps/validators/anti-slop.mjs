/* validators/anti-slop.mjs — детерминированный анти-слоп студии «Студия мини-приложений».
   Сканирует каталог проекта по запретам scripts/slop.json (B-01…B-05) и возвращает
   список попаданий «файл:строка B-xx», совместимый с scripts/lint-slop.mjs. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const SPEC = JSON.parse(readFileSync(new URL("../scripts/slop.json", import.meta.url), "utf8"));

/** @param {string} projectDir @param {string} [subdir] @returns {Array<{ file: string, line: number, code: string, message: string }>} */
export function scan(projectDir, subdir) {
  const scanDirs = (SPEC.scan ?? ["."]).map((s) => join(projectDir, subdir ? join(subdir, s) : s));
  const extensions = SPEC.extensions ?? [".html", ".js", ".css", ".md"];
  /** @type {Array<{ file: string, line: number, code: string, message: string }>} */
  const hits = [];

  const walk = (dir) => {
    if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return;
    for (const name of readdirSync(dir)) {
      if (name === "workspace" || name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (!extensions.includes(extname(name))) continue;
      readFileSync(full, "utf8").split("\n").forEach((line, i) => {
        for (const rule of SPEC.rules) {
          if (new RegExp(rule.pattern).test(line)) hits.push({ file: relative(projectDir, full), line: i + 1, code: rule.code, message: rule.message });
        }
      });
    }
  };

  for (const dir of scanDirs) walk(dir);
  return hits;
}

/** @param {string} projectDir @param {string} [subdir] @returns {{ ok: boolean, hits: Array<{ file: string, line: number, code: string, message: string }> }} */
export function check(projectDir, subdir) {
  const hits = scan(projectDir, subdir);
  return { ok: hits.length === 0, hits };
}

export default { scan, check };