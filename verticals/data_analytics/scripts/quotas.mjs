/* scripts/quotas.mjs — исполнитель квот студии (Q-01…Q-05).
   Общая часть для scripts/lint-quotas.mjs (CLI) и registry.mjs (ворота «quotas»).

   Квоты декларативны (scripts/quotas.json); стандартные kinds исполняет
   core/vertical-kit (evalRule), доменные kinds — локальные предикаты:
     pythonDocstringEveryDef — каждый def в etl.py имеет докстринг (Q-03);
     resultDuplicatesZero   — уникальные имена метрик + 0 дублей ключевых полей (Q-04);
     nullsUnderThreshold    — доля null по полям профиля под порогом (Q-05).
   Формат отчёта — как у validate.mjs (§15 ТЗ): строки «OK/FAIL Q-xx …» + «ИТОГ». */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { evalRule, projectDirFromArgv } from "../../../core/vertical-kit/index.mjs";

/** Читает JSON по относительному пути в проекте; null при ошибке/отсутствии. */
function readJsonAt(projectDir, rel) {
  try {
    return JSON.parse(readFileSync(join(projectDir, rel), "utf8"));
  } catch {
    return null;
  }
}

/** Q-03: каждый непубличный блок (def) обязан иметь докстринг назначения. */
function pythonDocstringEveryDef(projectDir, quota) {
  const text = readFileSync(join(projectDir, quota.path), "utf8");
  const lines = String(text).split("\n");
  const defRe = /^\s*def\s+(\w+)\s*\(/;
  const docRe = /^\s*(?:"""|''')/;
  const nextDefRe = /^\s*def\s+\w+\s*\(/;
  let currentDef = null;
  let failed = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (nextDefRe.test(line)) {
      if (currentDef && !currentDef.doc) failed.push(currentDef.name);
      currentDef = { name: line.match(/def\s+(\w+)/)[1], doc: false, window: 12 };
      continue;
    }
    if (currentDef && currentDef.window > 0) {
      currentDef.window -= 1;
      if (!currentDef.doc && docRe.test(line)) currentDef.doc = true;
    }
  }
  if (currentDef && !currentDef.doc) failed.push(currentDef.name);
  return { ok: failed.length === 0, detail: failed.length ? `без докстринга: ${failed.join(", ")}` : null };
}

/** Q-04: дубликаты в результате — 0 (уникальные имена метрик, ключевые поля профиля). */
function resultDuplicatesZero(projectDir, quota) {
  const problems = [];
  const metrics = readJsonAt(projectDir, "analysis/metrics.json");
  if (!metrics || !Array.isArray(metrics.metrics) || metrics.metrics.length === 0) {
    problems.push("metrics.json: нет массива metrics");
  } else {
    const names = metrics.metrics.map((m) => String(m.name ?? "")).filter(Boolean);
    if (new Set(names).size !== names.length) problems.push("metrics.json: повторяются имена метрик");
  }
  const profile = readJsonAt(projectDir, "analysis/profile.json");
  if (!profile || typeof profile.duplicates !== "object") {
    problems.push("profile.json: нет блока duplicates");
  } else {
    for (const [key, value] of Object.entries(profile.duplicates)) {
      if (Number(value) !== 0) problems.push(`profile.json: дубликаты по полю ${key} = ${value}`);
    }
  }
  return { ok: problems.length === 0, detail: problems.length ? problems.join("; ") : null };
}

/** Q-05: доля null в ключевых полях profile.json под порогом. */
function nullsUnderThreshold(projectDir, quota) {
  const profile = readJsonAt(projectDir, quota.path);
  const rows = Number(profile?.row_count ?? 0);
  if (!profile || typeof profile.nulls !== "object" || rows <= 0) {
    return { ok: false, detail: "profile.json: нет nulls/row_count" };
  }
  const maxRatio = Number(quota.maxNullRatio ?? 0.05);
  const over = [];
  for (const [field, count] of Object.entries(profile.nulls)) {
    if (Number(count) / rows > maxRatio) over.push(`${field}=${count}/${rows}`);
  }
  return { ok: over.length === 0, detail: over.length ? `выше порога: ${over.join(", ")}` : null };
}

/** Исполняет одну квоту. @param {string} projectDir @param {Record<string, any>} quota */
export function evalQuota(projectDir, quota) {
  if (quota.kind === "pythonDocstringEveryDef") {
    const r = pythonDocstringEveryDef(projectDir, quota);
    return { ok: r.ok, detail: r.ok ? String(quota.ok ?? "выполнено") : String(r.detail ?? quota.fail ?? "не выполнено") };
  }
  if (quota.kind === "resultDuplicatesZero") {
    const r = resultDuplicatesZero(projectDir, quota);
    return { ok: r.ok, detail: r.ok ? String(quota.ok ?? "выполнено") : String(r.detail ?? quota.fail ?? "не выполнено") };
  }
  if (quota.kind === "nullsUnderThreshold") {
    const r = nullsUnderThreshold(projectDir, quota);
    return { ok: r.ok, detail: r.ok ? String(quota.ok ?? "выполнено") : String(r.detail ?? quota.fail ?? "не выполнено") };
  }
  return { ok: evalRule(projectDir, quota), detail: quota.ok ?? "выполнено" };
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