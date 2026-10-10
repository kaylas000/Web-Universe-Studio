/* validators/anti-slop.mjs — детерминированный анти-слоп как ESM-модуль.
   Тот же набор запретов, что в scripts/lint-slop.mjs, для вызова из ядра. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SPEC = JSON.parse(readFileSync(new URL("../scripts/slop.json", import.meta.url), "utf8"));

/** @param {string} projectDir @returns {Array<{ file: string, line: number, code: string }>} */
export function scan(projectDir, subdir) {
  const root = subdir ? join(projectDir, subdir) : projectDir;
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === "workspace" || name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!SPEC.extensions.some((ext) => name.endsWith(ext))) continue;
      readFileSync(full, "utf8").split("\n").forEach((line, i) => {
        for (const rule of SPEC.rules) if (new RegExp(rule.pattern).test(line)) hits.push({ file: full, line: i + 1, code: rule.code });
      });
    }
  };
  walk(root);
  return hits;
}

export default { scan };
