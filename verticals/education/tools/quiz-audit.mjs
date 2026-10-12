#!/usr/bin/env node
/* tools/quiz-audit.mjs — аудит теста курса (К-07, Q-03).

   У каждого вопроса: один правильный ответ, ответ входит в варианты ровно один
   раз, варианты уникальны и их ≥ 3, объяснение ≥ 20 символов (B-01 — тест без
   объяснения), формулировка непустая. Вопросов 3–12 на урок (Q-03).

   CLI: node tools/quiz-audit.mjs <course/quiz.json> | <каталог проекта>
   Выход: 0 — тест валиден; 1 — найдены нарушения; 2 — нет аргумента.
*/

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const QUIZ_REL = join("course", "quiz.json");

/** Аудит структуры теста. @returns {{ ok: boolean, problems: string[], total: number }} */
export function auditQuiz(data) {
  const problems = [];
  if (!data || !Array.isArray(data.questions)) {
    return { ok: false, problems: ["нет массива questions"], total: 0 };
  }
  const total = data.questions.length;
  if (total < 3) problems.push(`вопросов ${total} < 3 (Q-03)`);
  if (total > 12) problems.push(`вопросов ${total} > 12 (Q-03)`);
  data.questions.forEach((q, i) => {
    const label = `вопрос ${i + 1}`;
    if (!q || typeof q !== "object") { problems.push(`${label}: не объект`); return; }
    const question = String(q.question ?? "").trim();
    if (question.length < 6) problems.push(`${label}: пустая или слишком короткая формулировка`);
    const answer = String(q.answer ?? "").trim();
    if (!answer) problems.push(`${label}: нет правильного ответа`);
    if (!Array.isArray(q.options)) {
      problems.push(`${label}: нет массива вариантов options`);
      return;
    }
    const opts = q.options.map((o) => String(o ?? "").trim());
    if (opts.some((o) => o.length === 0)) problems.push(`${label}: есть пустой вариант`);
    const unique = [...new Set(opts)];
    if (unique.length !== opts.length) {
      const dupes = unique.filter((o) => opts.filter((x) => x === o).length > 1);
      problems.push(`${label}: дубли вариантов — ${dupes.join(", ")}`);
    }
    const answerCount = opts.filter((o) => o === answer).length;
    if (answerCount !== 1) problems.push(`${label}: правильный ответ должен входить в варианты ровно 1 раз (сейчас ${answerCount})`);
    if (opts.length < 3) problems.push(`${label}: вариантов меньше 3`);
    const explanation = String(q.explanation ?? "").trim();
    if (explanation.length < 20) problems.push(`${label}: объяснение короче 20 символов (B-01)`);
  });
  return { ok: problems.length === 0, problems, total };
}

function main(argv) {
  const target = argv.find((a) => !a.startsWith("--"));
  if (!target) {
    process.stderr.write("укажите путь к тесту: node tools/quiz-audit.mjs <course/quiz.json>\n");
    return 2;
  }
  const file = target.endsWith("quiz.json") ? target : join(target, QUIZ_REL);
  if (!existsSync(file)) {
    process.stderr.write(`не найдено course/quiz.json: ${file}\n`);
    return 2;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    process.stderr.write(`quiz.json не парсится: ${String(error?.message ?? error)}\n`);
    return 1;
  }
  const res = auditQuiz(data);
  if (res.ok) {
    process.stdout.write(`ok: тест валиден, вопросов ${res.total} · exit 0\n`);
    return 0;
  }
  for (const p of res.problems) process.stdout.write(`FAIL ${p}\n`);
  process.stdout.write("ИТОГ: тест нарушает инварианты · exit 1\n");
  return 1;
}

const invokedDirectly = process.argv[1] ? process.argv[1].endsWith("quiz-audit.mjs") : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { auditQuiz };