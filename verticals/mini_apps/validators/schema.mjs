/* validators/schema.mjs — проверка структуры артефакта: обязательные файлы студии. */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const RULES = JSON.parse(readFileSync(new URL("../scripts/rules.json", import.meta.url), "utf8")).rules;

/** @param {string} projectDir @returns {string[]} список отсутствующих обязательных файлов */
export function missing(projectDir) {
  return RULES.filter((r) => r.kind === "fileExists" && !existsSync(join(projectDir, r.path))).map((r) => r.path);
}

export default { missing };
