/* validators/constitution.mjs — исполнение статей К-xx студии «Студия мини-приложений».
   Тот же набор правил, что в scripts/validate.mjs (scripts/rules.json), но как ESM-модуль:
   ядро/гейты могут спросить студию о нарушениях из кода, без запуска подпроцесса.
   Правила гоняются штатным декларативным движком core/vertical-kit (evalRule). */

import { readFileSync } from "node:fs";
import { evalRule } from "../../../core/vertical-kit/index.mjs";

const RULES = JSON.parse(readFileSync(new URL("../scripts/rules.json", import.meta.url), "utf8")).rules;

export const constitution = { rules: RULES };

/**
 * @param {string} projectDir
 * @returns {{ ok: boolean, failures: Array<{ code: string, title: string, detail: string }> }}
 */
export function validate(projectDir) {
  const failures = [];
  for (const rule of RULES) {
    let ok = false;
    try {
      ok = evalRule(projectDir, rule);
    } catch {
      ok = false;
    }
    if (!ok) failures.push({ code: rule.code, title: rule.title, detail: String(rule.fail ?? "не выполнено") });
  }
  return { ok: failures.length === 0, failures };
}

/** Имена правил, которое требует наличие файла-отчёта (для schema.mjs). */
export function reportPaths() {
  return [...new Set(RULES.filter((r) => /\.json$/.test(String(r.path ?? ""))).map((r) => r.path))];
}

export default constitution;