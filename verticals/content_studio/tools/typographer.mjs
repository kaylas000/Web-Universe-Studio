#!/usr/bin/env node
/* tools/typographer.mjs — типографика текста (К-13 редполитика).

   Приводит markdown/текст к правилам студии «Контент-студия»:
     • кавычки: только типографские «ёлочки» (прямые "..." и лапки „…" → «…»);
     • длинное тире — вместо дефис-минуса с пробелами (" - " → " — ");
     • неразрывные пробелы после коротких предлогов/союзов — убирает висячие
       предлоги в конце строк;
     • ё: сохраняется всегда (никогда не снимается); опция --yo дополнительно
       ставит ё в безопасных словоформах (ещё, берёза, ковёр).

   HTML-теги (например `<button data-analytics-event="cta">`), fenced-код и
   инлайн-`код` не трогает — кавычки атрибутов и кода остаются как есть.

   CLI: node tools/typographer.mjs <файл.md> [--yo] [--write]
     --yo     — ёфикация безопасных словоформ;
     --write  — записать исправленный текст обратно в файл.
   Выводит исправленный текст в stdout, счётчик замен — в stderr.
   Выход: 0 — ок; 1 — файл не прочитан/не записан; 2 — нет аргумента.
*/

import { readFileSync, writeFileSync } from "node:fs";

export const PREPOSITIONS = [
  "об", "из", "от", "до", "по", "за", "на", "при", "для", "со", "во", "ко",
  "же", "ли", "бы", "чем", "лишь", "как", "что",
  "в", "к", "с", "у", "о", "и", "а", "но", "да", "не", "ни", "без", "то",
];

/** Один пробел между предлогом и следующим словом (regex с unicode-границами). */
const HANGING_RE = new RegExp(
  `(?<=^|[^\\p{L}\\p{N}])(${PREPOSITIONS.join("|")})\\s+(?=[\\p{L}«])`,
  "giu",
);

/** Фрагменты, которые типографика не должна трогать: код и HTML-теги. */
const GUARD_RE = /```[\s\S]*?```|<[^>]+>|`[^`\n]*`/g;

/** Словоформы, где ё предпочтительна и нет омографа без неё. */
export const YO_WORDS = Object.freeze({
  еще: "ещё",
  береза: "берёза",
  березка: "берёзка",
  березовый: "берёзовый",
  ковер: "ковёр",
});

/**
 * Приводит текст к типографике студии.
 * @param {string} text
 * @param {{ yo?: boolean }} [opts]
 * @returns {{ text: string, counts: Record<string, number> }}
 */
export function typograph(text, opts = {}) {
  const counts = { quotes: 0, dash: 0, nbsp: 0, yo: 0 };
  const guards = [];

  // 0. Защита: код и HTML-теги выносятся в плейсхолдеры, их кавычки не трогаем.
  const body = String(text ?? "").replace(GUARD_RE, (match) => {
    const key = guards.length;
    guards.push(match);
    return `\uE000${key}\uE001`;
  });

  // 1. Типографские кавычки: лапки „…“ и прямые "…" → ёлочки «…».
  let out = body.replace(/„([^„"]{1,200})“/g, (_, inner) => {
    counts.quotes += 1;
    return `«${inner}»`;
  });
  out = out.replace(/"([^"\n]{1,200})"/g, (_, inner) => {
    counts.quotes += 1;
    return `«${inner}»`;
  });

  // 2. Длинное тире: двойной дефис и дефис-минус с пробелами → «—».
  out = out.replace(/(\s)--(\s|$)/g, (_, sp, tail) => {
    counts.dash += 1;
    return `${sp}—${tail}`;
  });
  out = out.replace(/\s+-\s+/g, () => {
    counts.dash += 1;
    return " — ";
  });

  // 3. Неразрывные пробелы после предлогов/союзов (убирает висячие предлоги).
  out = out.replace(HANGING_RE, (match, word) => {
    counts.nbsp += 1;
    return `${word}\u00A0`;
  });

  // 4. Ёфикация безопасных словоформ (опция; ё и так никогда не снимается).
  if (opts.yo) {
    const yoRe = new RegExp(
      `(?<![\\p{L}\\p{N}])(${Object.keys(YO_WORDS).join("|")})(?![\\p{L}\\p{N}])`,
      "giu",
    );
    out = out.replace(yoRe, (_match, word) => {
      counts.yo += 1;
      return YO_WORDS[word.toLowerCase()] ?? _match;
    });
  }

  // 5. Восстановление защищённых фрагментов.
  for (let i = 0; i < guards.length; i += 1) {
    out = out.split(`\uE000${i}\uE001`).join(guards[i]);
  }

  return { text: out, counts };
}

function main(argv) {
  const only = argv.find((a) => !a.startsWith("--"));
  if (!only) {
    process.stderr.write("укажите путь к .md: node tools/typographer.mjs <файл.md> [--yo] [--write]\n");
    return 2;
  }
  let source;
  try {
    source = readFileSync(only, "utf8");
  } catch (error) {
    process.stderr.write(`не прочитан файл «${only}»: ${error?.message ?? error}\n`);
    return 1;
  }
  const yo = argv.includes("--yo");
  const write = argv.includes("--write");
  const { text, counts } = typograph(source, { yo });
  if (write) {
    try {
      writeFileSync(only, text);
    } catch (error) {
      process.stderr.write(`не записан файл «${only}»: ${error?.message ?? error}\n`);
      return 1;
    }
  }
  const total = counts.quotes + counts.dash + counts.nbsp + counts.yo;
  const detail = `кавычки: ${counts.quotes} · тире: ${counts.dash} · неразрывные пробелы: ${counts.nbsp} · ё: ${counts.yo}`;
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
  process.stderr.write(`замен: ${total} (${detail})${write ? " · файл записан" : ""}\n`);
  return 0;
}

const invokedDirectly = process.argv[1] ? process.argv[1].endsWith("typographer.mjs") : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { typograph, PREPOSITIONS, YO_WORDS };