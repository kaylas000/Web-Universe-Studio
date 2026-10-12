/* scripts/quotas.mjs — исполнитель квот студии (Q-01…Q-05).
   Общая часть для scripts/lint-quotas.mjs (CLI) и registry.mjs (ворота «quotas»).

   Квоты декларативны (scripts/quotas.json); все kinds исполняет core/vertical-kit
   (evalRule): sentencesMaxWords, regexAtLeast, regexCount, allOf, fileExists.
   Доменных предикатов нет — закон студии, как и приёмка, остаётся данными.
   Формат отчёта — как у validate.mjs (§15 ТЗ): строки «OK/FAIL Q-xx …» + «ИТОГ». */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evalRule } from "../../../core/vertical-kit/index.mjs";

/** Исполняет одну квоту. @param {string} projectDir @param {Record<string, any>} quota */
export function evalQuota(projectDir, quota) {
  const ok = evalRule(projectDir, quota);
  return { ok, detail: ok ? String(quota.ok ?? "выполнено") : String(quota.fail ?? "не выполнено") };
}

/** Прогон всех квот по каталогу проекта; печать отчёта «Q-xx» + «ИТОГ». @returns {boolean} */
export function runQuotaSpec(vertical, quotasUrl, argv = process.argv.slice(2)) {
  const spec = JSON.parse(readFileSync(quotasUrl, "utf8"));
  const dir = resolve(process.cwd(), String(argv[0] ?? "."));
  if (!existsSync(dir)) {
    process.stderr.write(`каталог проекта недоступен: ${dir}\n`);
    process.exitCode = 1;
    return false;
  }
  const rows = (spec.quotas ?? []).map((quota) => {
    const res = evalQuota(dir, quota);
    return { code: quota.code, title: quota.title, ok: res.ok, detail: String(res.detail ?? "") };
  });
  const passed = rows.filter((r) => r.ok).length;
  const lines = rows.map((r) => `${r.ok ? "OK " : "FAIL"} ${r.code} ${r.title} · ${r.detail}`);
  lines.push("─".repeat(48));
  lines.push(`ИТОГ: ${passed}/${rows.length} · exit ${passed === rows.length ? 0 : 1}`);
  process.stdout.write(`${vertical ? `${vertical} · квоты\n` : ""}${lines.join("\n")}\n`);
  process.exitCode = passed === rows.length ? 0 : 1;
  return passed === rows.length;
}

export default { evalQuota, runQuotaSpec };