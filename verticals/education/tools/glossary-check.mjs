#!/usr/bin/env node
/* tools/glossary-check.mjs — проверка раздела «Термины» урока (К-10).

   Инвариант: каждый термин, встречающийся в теле урока, определён в разделе
   «Термины»; определение стоит раньше первого употребления; определение не
   короче 8 символов; раздел содержит не меньше двух определений (V-10).

   CLI: node tools/glossary-check.mjs <course/lesson-01.md>
   Выход: 0 — ok: термины определены; 1 — список неопределённых; 2 — нет аргумента.
*/

import { existsSync, readFileSync } from "node:fs";

const BOLD = /\*\*([^*]+)\*\*/g;

/** Разбор урока: раздел «Термины» и употребления терминов в теле. */
export function parseLesson(text) {
  const lines = String(text ?? "").split("\n");
  const termIdx = lines.findIndex((l) => /^##\s+Термины/.test(l));
  const definitions = [];
  const bodyTerms = [];
  let end = lines.length;
  if (termIdx !== -1) {
    for (let i = termIdx + 1; i < lines.length; i += 1) {
      if (/^##\s+/.test(lines[i])) { end = i; break; }
    }
    for (let i = termIdx + 1; i < end; i += 1) {
      const m = lines[i].match(/^-\s*\*\*([^*]+)\*\*\s*[—–-]\s*(.+)$/);
      if (m) definitions.push({ term: m[1].trim(), def: m[2].trim(), line: i + 1 });
    }
  }
  for (let i = 0; i < lines.length; i += 1) {
    if (termIdx !== -1 && i >= termIdx + 1 && i < end) continue; // сам раздел «Термины»
    BOLD.lastIndex = 0;
    let m;
    while ((m = BOLD.exec(lines[i]))) {
      const term = m[1].trim();
      if (term.length > 0) bodyTerms.push({ term, line: i + 1 });
    }
  }
  return { termIdx, end, definitions, bodyTerms };
}

/** Лёгкая лемматизация существительных: срезает типичное окончание (без внешних зависимостей). */
const SUFFIXES = ["ами", "ями", "ого", "его", "ому", "ему", "ыми", "ых", "ам", "ям", "ах", "ях", "ая", "ую", "юю", "ов", "ев", "ой", "ей", "а", "я", "у", "ю", "е", "ы", "и", "о", "ь"];
export function termBase(term) {
  let t = String(term).trim().toLowerCase().replace(/ё/g, "е");
  for (const s of SUFFIXES) {
    if (t.length - s.length >= 3 && t.endsWith(s)) return t.slice(0, -s.length);
  }
  return t;
}

/** Аудит: что не так с терминами урока. @returns {{ ok: boolean, problems: string[], terms: string[] }} */
export function auditGlossary(text) {
  const { termIdx, definitions, bodyTerms } = parseLesson(text);
  const problems = [];
  if (termIdx === -1) return { ok: false, problems: ["нет раздела «Термины» (V-10)"], terms: [] };
  const defByTerm = new Map(definitions.map((d) => [termBase(d.term), d]));
  const seen = new Set();
  for (const { term, line } of bodyTerms) {
    const key = termBase(term);
    if (seen.has(key)) continue; // интересует первое употребление
    seen.add(key);
    const def = defByTerm.get(key);
    if (!def) {
      problems.push(`«${term}» не определён в разделе «Термины» (первое употребление — строка ${line})`);
      continue;
    }
    if (def.def.length < 8) problems.push(`определение «${term}» короче 8 символов (строка ${def.line})`);
    if (def.line > line) problems.push(`«${term}» использован на строке ${line} раньше определения (строка ${def.line})`);
  }
  if (definitions.length < 2) problems.push(`в разделе «Термины» меньше двух определений (V-10)`);
  return { ok: problems.length === 0, problems, terms: definitions.map((d) => d.term) };
}

function main(argv) {
  const target = argv.find((a) => !a.startsWith("--"));
  if (!target) {
    process.stderr.write("укажите путь к уроку: node tools/glossary-check.mjs <course/lesson-01.md>\n");
    return 2;
  }
  if (!existsSync(target)) {
    process.stderr.write(`файл недоступен: ${target}\n`);
    return 2;
  }
  const res = auditGlossary(readFileSync(target, "utf8"));
  if (res.ok) {
    process.stdout.write(`ok: термины определены (${res.terms.length}: ${res.terms.join(", ")}) · exit 0\n`);
    return 0;
  }
  for (const p of res.problems) process.stdout.write(`FAIL ${p}\n`);
  process.stdout.write("ИТОГ: есть неопределённые термины · exit 1\n");
  return 1;
}

const invokedDirectly = process.argv[1] ? process.argv[1].endsWith("glossary-check.mjs") : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { parseLesson, auditGlossary };