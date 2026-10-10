/* validators/constitution.mjs — тот же набор правил, что в scripts/validate.mjs,
   но как ESM-модуль: ядро может спросить студию о нарушениях из кода. */

import { readFileSync } from "node:fs";
import { evalRule } from "../../../core/vertical-kit/index.mjs";

const RULES = JSON.parse(readFileSync(new URL("../scripts/rules.json", import.meta.url), "utf8")).rules;

export const constitution = { rules: RULES };

/** @param {string} projectDir @returns {{ ok: boolean, failures: string[] }} */
export function validate(projectDir) {
  const failures = RULES.filter((rule) => !evalRule(projectDir, rule)).map((r) => `${r.code} ${r.title}`);
  return { ok: failures.length === 0, failures };
}

export default constitution;
