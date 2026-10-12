#!/usr/bin/env node
/* tools/requisites-check.mjs — контрольные суммы реквизитов (К-05, B-08).

   Находит в тексте документа все ИНН (10/12 знаков) и ОГРН/ОГРНИП (13/15 знаков)
   и проверяет каждый по контрольной сумме: ИНН — модуль 11 (isValidInn),
   ОГРН — модуль 11/13 (isValidOgrn). Те же функции, что у V-05 в scripts/rules.json.

   CLI: node tools/requisites-check.mjs <путь-к-файлу>
   Выход: 0 — все найденные реквизиты валидны; 1 — есть невалидные (B-08);
          2 — нет аргумента или файл не читается.
   ESM-API: checkRequisites(text) → { inn: [], ogrn: [], invalid: [] }.
*/

import { readFileSync } from "node:fs";

import { isValidInn, isValidOgrn } from "../../../core/vertical-kit/index.mjs";

const INN_RE = /(?<!\d)(\d{10}|\d{12})(?!\d)/g;
const OGRN_RE = /(?<!\d)(\d{13}|\d{15})(?!\d)/g;

/** @param {string} text @returns {{ inn: Array<{ value: string, ok: boolean }>, ogrn: Array<{ value: string, ok: boolean }>, invalid: string[] }} */
export function checkRequisites(text) {
  const inn = [...String(text ?? "").matchAll(INN_RE)].map((m) => ({ value: m[1], ok: isValidInn(m[1]) }));
  const ogrn = [...String(text ?? "").matchAll(OGRN_RE)].map((m) => ({ value: m[1], ok: isValidOgrn(m[1]) }));
  const invalid = [...inn, ...ogrn].filter((r) => !r.ok).map((r) => r.value);
  return { inn, ogrn, invalid };
}

function main(argv) {
  const only = argv.find((a) => !a.startsWith("--"));
  if (!only) {
    process.stderr.write("укажите путь к документу: node tools/requisites-check.mjs <файл.md>\n");
    return 2;
  }
  let text;
  try {
    text = readFileSync(only, "utf8");
  } catch (error) {
    process.stderr.write(`файл не читается: ${only} (${error?.message ?? error})\n`);
    return 2;
  }
  const { inn, ogrn, invalid } = checkRequisites(text);
  process.stdout.write(`ИНН: ${inn.length} · ОГРН/ОГРНИП: ${ogrn.length}\n`);
  for (const r of inn) process.stdout.write(`  ИНН ${r.value} — ${r.ok ? "валиден" : "НЕ ВАЛИДЕН (B-08)"}\n`);
  for (const r of ogrn) process.stdout.write(`  ОГРН ${r.value} — ${r.ok ? "валиден" : "НЕ ВАЛИДЕН (B-08)"}\n`);
  if (invalid.length === 0) {
    process.stdout.write(`ИТОГ: ${inn.length + ogrn.length} реквизитов, все по контрольным суммам · exit 0\n`);
    return 0;
  }
  process.stdout.write(`ИТОГ: невалидные реквизиты: ${[...new Set(invalid)].join(", ")} · exit 1\n`);
  return 1;
}

const invokedDirectly = process.argv[1] ? process.argv[1].endsWith("requisites-check.mjs") : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { checkRequisites };