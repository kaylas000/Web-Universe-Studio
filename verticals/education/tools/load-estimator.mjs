#!/usr/bin/env node
/* tools/load-estimator.mjs — калькулятор нагрузки курса (К-11, Q-05).

   Считает суммарное время из «минут на урок» и числа уроков и сверяет с оценкой
   «≈ N мин» в course/README.md (V-11). Инвариант Q-05: урок занимает 10–60 минут,
   сумма сходится с числом уроков.

   CLI:
     node tools/load-estimator.mjs 30 3
       → «≈ 90 мин по 3 урокам (по 30 мин на урок)»
     node tools/load-estimator.mjs --course projects/osnovy-analitiki
       → читает course/README.md, проверяет согласованность оценки «≈ N мин»
   Выход: 0 — оценка сходится и реалистична; 1 — расхождение; 2 — нет аргументов.
*/

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LESSON_MIN = 10;
const LESSON_MAX = 60;

/** @param {{ minutes?: number, lessons?: number }} input */
export function estimateLoad({ minutes, lessons }) {
  const perLesson = Number(minutes ?? 0);
  const count = Number(lessons ?? 0);
  const findings = [];
  if (!Number.isFinite(perLesson) || perLesson <= 0) findings.push("нет минут на урок");
  if (!Number.isFinite(count) || count <= 0) findings.push("нет числа уроков");
  if (perLesson > 0 && (perLesson < LESSON_MIN || perLesson > LESSON_MAX)) {
    findings.push(`урок ${perLesson} мин вне реалистичного окна ${LESSON_MIN}–${LESSON_MAX} (Q-05)`);
  }
  return { totalMinutes: perLesson * count, lessons: count, perLesson, ok: findings.length === 0, findings };
}

/** Общая оценка «N мин» и разбивка на уроки из текста README. */
export function readCourseLoad(readmeText) {
  const text = String(readmeText ?? "");
  const total = Number((text.match(/≈\s*(\d+)\s*мин/) ?? [])[1] ?? NaN);
  const byLessons = [...text.matchAll(/Урок\s+(\d+)/g)].map((m) => Number(m[1])).filter((n) => n > 0);
  const lessons = byLessons.length ? Math.max(...byLessons) : Number((text.match(/(\d+)\s+урока/) ?? [])[1] ?? 0);
  const perLesson = Number((text.match(/по\s+(\d+)\s+мин/) ?? [])[1] ?? NaN);
  return { total, lessons, perLesson };
}

/** Сверяет заявленную в README нагрузку с расчётом. */
export function auditCourse(readmeText) {
  const { total, lessons, perLesson } = readCourseLoad(readmeText);
  const calc = estimateLoad({ minutes: perLesson, lessons });
  const findings = [...calc.findings];
  if (!Number.isFinite(total)) findings.push("нет оценки «≈ N мин» в README (V-11)");
  if (calc.ok && Number.isFinite(total) && total !== calc.totalMinutes) {
    findings.push(`не сходится: заявлено ≈ ${total} мин, вычислено ≈ ${calc.totalMinutes} мин`);
  }
  return {
    total,
    lessons,
    perLesson,
    totalMinutes: calc.totalMinutes,
    ok: findings.length === 0,
    findings,
  };
}

function main(argv) {
  const courseArg = argv.find((a) => a === "--course" || a.startsWith("--course="));
  if (courseArg) {
    const raw = courseArg === "--course" ? argv[argv.indexOf("--course") + 1] : courseArg.split("=")[1];
    if (!raw) {
      process.stderr.write("укажите каталог проекта после --course\n");
      return 2;
    }
    const readme = join(raw, "course", "README.md");
    const direct = raw.endsWith("README.md") ? raw : readme;
    if (!existsSync(direct)) {
      process.stderr.write(`нет course/README.md: ${direct}\n`);
      return 2;
    }
    const res = auditCourse(readFileSync(direct, "utf8"));
    process.stdout.write(`курс: ≈ ${res.totalMinutes} мин по ${res.lessons} урокам (по ${res.perLesson} мин на урок)\n`);
    if (res.ok) {
      process.stdout.write("ИТОГ: нагрузка сходится и реалистична · exit 0\n");
      return 0;
    }
    for (const f of res.findings) process.stdout.write(`FAIL ${f}\n`);
    process.stdout.write("ИТОГ: оценка нагрузки нарушена · exit 1\n");
    return 1;
  }

  const [minutes, lessons] = argv.map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(lessons)) {
    process.stderr.write("укажите минуты на урок и число уроков: node tools/load-estimator.mjs 30 3\n");
    return 2;
  }
  const res = estimateLoad({ minutes, lessons });
  process.stdout.write(`≈ ${res.totalMinutes} мин по ${res.lessons} урокам (по ${res.perLesson} мин на урок)\n`);
  if (res.ok) {
    process.stdout.write("ИТОГ: нагрузка реалистична · exit 0\n");
    return 0;
  }
  for (const f of res.findings) process.stdout.write(`FAIL ${f}\n`);
  process.stdout.write("ИТОГ: оценка нагрузки нарушена · exit 1\n");
  return 1;
}

const invokedDirectly = process.argv[1] ? process.argv[1].endsWith("load-estimator.mjs") : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { estimateLoad, readCourseLoad, auditCourse };