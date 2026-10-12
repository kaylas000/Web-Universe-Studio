/* scripts/quotas.mjs — исполнитель квот студии (Q-01…Q-06).
   Общая часть для scripts/lint-quotas.mjs (CLI) и registry.mjs (ворота «quotas»).

   Квоты декларативны (scripts/quotas.json); стандартные kinds исполняет
   core/vertical-kit (evalRule), доменные kinds — локальные предикаты:
     paragraphSentencesMax — в каждом абзаце не больше N предложений (Q-05);
     imagesAllAlt         — у каждого изображения markdown есть alt (Q-06).
   Формат отчёта — как у validate.mjs (§15 ТЗ): строки «OK/FAIL Q-xx …» + «ИТОГ». */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { evalRule, projectDirFromArgv } from "../../../core/vertical-kit/index.mjs";

/** Читает текст по относительному пути в проекте; null при ошибке/отсутствии. */
function readTextAt(projectDir, rel) {
  try {
    return readFileSync(join(projectDir, rel), "utf8");
  } catch {
    return null;
  }
}

/** Разбивает markdown на абзацы: блоки текста между пустыми строками. */
function paragraphs(text) {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Снимает разметку, которая дробит счет предложений: URL, картинки, сноски, ссылки. */
function proseLine(line) {
  return String(line ?? "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[\^[^\]]*\]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

/** Q-05: в каждом абзаце не больше rule.max предложений. */
function paragraphSentencesMax(projectDir, quota) {
  const text = readTextAt(projectDir, quota.path);
  if (text === null) return { ok: false, detail: `нет файла ${quota.path}` };
  const max = Number(quota.max ?? 5);
  const over = [];
  paragraphs(text).forEach((para, i) => {
    const clean = para.split("\n").map(proseLine).join(" ").trim();
    if (!clean) return;
    const sentences = clean.split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean).length;
    if (sentences > max) over.push(`абзац ${i + 1}: ${sentences} предложений`);
  });
  return { ok: over.length === 0, detail: over.length ? over.join("; ") : null };
}

/** Q-06: у каждого markdown-изображения непустой alt; без изображений — истинно. */
function imagesAllAlt(projectDir, quota) {
  const text = readTextAt(projectDir, quota.path);
  if (text === null) return { ok: false, detail: `нет файла ${quota.path}` };
  const images = [...String(text).matchAll(/!\[([^\]]*)\]\(/g)].map((m) => m[1].trim());
  const without = images.filter((alt) => !alt);
  return { ok: without.length === 0, detail: without.length ? `без alt: ${without.length} изображений` : null };
}

/** Исполняет одну квоту. @param {string} projectDir @param {Record<string, any>} quota */
export function evalQuota(projectDir, quota) {
  if (quota.kind === "paragraphSentencesMax") {
    const r = paragraphSentencesMax(projectDir, quota);
    return { ok: r.ok, detail: r.ok ? String(quota.ok ?? "выполнено") : String(r.detail ?? quota.fail ?? "не выполнено") };
  }
  if (quota.kind === "imagesAllAlt") {
    const r = imagesAllAlt(projectDir, quota);
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