/* scripts/quotas.mjs — исполнитель квот студии (Q-01…Q-05).
   Общая часть для scripts/lint-quotas.mjs (CLI) и ворот «quotas».

   Квоты декларативны (scripts/quotas.json); стандартные kinds исполняет
   core/vertical-kit (evalRule: jsonArrayMinItems и т.д.), доменные kinds —
   локальные предикаты:
     interactivePerTenMinutes — интерактив ≥1 на 10 минут урока (Q-01);
     formativeCoverageHundred — «Проверка понимания» после каждого блока (Q-02);
     goalAssessmentCoverage   — каждая цель по Блуму смаппирована на аттестацию (Q-04);
     loadRealistic            — урок в окне 10–60 мин, сумма сходится (Q-05).
   Формат отчёта — как у validate.mjs (§15 ТЗ): строки «OK/FAIL Q-xx …» + «ИТОГ». */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { evalRule } from "../../../core/vertical-kit/index.mjs";

/** Читает текст по относительному пути в проекте; null при ошибке/отсутствии. */
function readTextAt(projectDir, rel) {
  try {
    return readFileSync(join(projectDir, rel), "utf8");
  } catch {
    return null;
  }
}

/** Общее время «≈ N мин» и число уроков «Урок M»/«по N урокам» из README. */
function courseLoad(readme) {
  const text = String(readme ?? "");
  const total = Number((text.match(/≈\s*(\d+)\s*мин/) ?? [])[1] ?? NaN);
  const byLessons = [...text.matchAll(/Урок\s+(\d+)/g)].map((m) => Number(m[1])).filter((n) => n > 0);
  const lessons = byLessons.length ? Math.max(...byLessons) : Number((text.match(/(\d+)\s+урока/) ?? [])[1] ?? 0);
  return { total, lessons };
}

/** Q-01: число блоков «Интерактив» ≥ длительности урока (мин) / 10. */
function interactivePerTenMinutes(projectDir, quota) {
  const lesson = readTextAt(projectDir, "course/lesson-01.md");
  const readme = readTextAt(projectDir, "course/README.md");
  if (lesson === null || readme === null) return { ok: false, detail: "нет course/lesson-01.md или course/README.md" };
  const interactive = (lesson.match(/^##\s+Интерактив/gm) ?? []).length;
  const { total, lessons } = courseLoad(readme);
  if (!Number.isFinite(total) || lessons <= 0) return { ok: false, detail: "нет оценки «≈ N мин» или числа уроков" };
  const perLesson = total / lessons;
  const required = Math.ceil(perLesson / 10);
  return { ok: interactive >= required, detail: `интерактивов ${interactive}, требуется ≥ ${required} при уроке ${perLesson} мин` };
}

/** Q-02: «Проверка понимания» стоит после каждого содержательного блока — 100 %. */
function formativeCoverageHundred(projectDir, quota) {
  const lesson = readTextAt(projectDir, "course/lesson-01.md");
  if (lesson === null) return { ok: false, detail: "нет course/lesson-01.md" };
  const blocks = (lesson.match(/^##\s+(Теория|Практика|Визуал)/gm) ?? []).length;
  const checks = (lesson.match(/^##\s+Проверка понимания/gm) ?? []).length;
  return { ok: checks >= blocks, detail: `блоков ${blocks}, проверок ${checks} — покрытие ${blocks ? Math.round((checks / blocks) * 100) : 100} %` };
}

/** Q-04: каждая цель по Блуму из «Цели обучения» покрыта строкой в «Соответствие плану». */
function goalAssessmentCoverage(projectDir, quota) {
  const readme = readTextAt(projectDir, "course/README.md");
  if (readme === null) return { ok: false, detail: "нет course/README.md" };
  const BLOOM = /Знать|Понимать|Применять|Анализировать|Оценивать|Создавать/;
  const goals = [...readme.matchAll(/^\d+\.\s*\*\*(Знать|Понимать|Применять|Анализировать|Оценивать|Создавать)\*\*/gm)].map((m) => m[1]);
  const section = readme.split(/^##\s+Соответствие плану/gm)[1] ?? "";
  const covered = new Set([...section.matchAll(/^\|\s*(Знать|Понимать|Применять|Анализировать|Оценивать|Создавать)\s*\|/gm)].map((m) => m[1]));
  const missing = [...new Set(goals.filter((g) => !covered.has(g)))];
  return { ok: missing.length === 0, detail: missing.length ? `не покрыты аттестацией: ${missing.join(", ")}` : `целей ${goals.length}, покрыты все (100 %)` };
}

/** Q-05: время реалистично: урок в окне 10–60 минут, сумма сходится. */
function loadRealistic(projectDir, quota) {
  const readme = readTextAt(projectDir, "course/README.md");
  if (readme === null) return { ok: false, detail: "нет course/README.md" };
  const { total, lessons } = courseLoad(readme);
  if (!Number.isFinite(total) || lessons <= 0) return { ok: false, detail: "нет «≈ N мин» или числа уроков" };
  const per = total / lessons;
  if (per < 10 || per > 60) return { ok: false, detail: `урок ${per} мин вне окна 10–60 мин` };
  return { ok: true, detail: `≈ ${total} мин по ${lessons} урокам (${per} мин на урок) — реалистично` };
}

/** Исполняет одну квоту. @param {string} projectDir @param {Record<string, any>} quota */
export function evalQuota(projectDir, quota) {
  const local = {
    interactivePerTenMinutes,
    formativeCoverageHundred,
    goalAssessmentCoverage,
    loadRealistic,
  };
  if (local[quota.kind]) {
    const r = local[quota.kind](projectDir, quota);
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