#!/usr/bin/env node
/* tools/check-requisites.mjs — алиас на tools/requisites-check.mjs (имя из К-05 CONSTITUTION).
   Оба имени работают: node tools/check-requisites.mjs <файл.md> ≡ tools/requisites-check.mjs. */

import requisitesCheck from "./requisites-check.mjs";
import { readFileSync } from "node:fs";

const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!only) {
  process.stderr.write("укажите путь к документу: node tools/check-requisites.mjs <файл.md>\n");
  process.exit(2);
}
try {
  const { inn, ogrn, invalid } = requisitesCheck.checkRequisites(readFileSync(only, "utf8"));
  process.stdout.write(`ИНН: ${inn.length} · ОГРН/ОГРНИП: ${ogrn.length}\n`);
  for (const r of inn) process.stdout.write(`  ИНН ${r.value} — ${r.ok ? "валиден" : "НЕ ВАЛИДЕН (B-08)"}\n`);
  for (const r of ogrn) process.stdout.write(`  ОГРН ${r.value} — ${r.ok ? "валиден" : "НЕ ВАЛИДЕН (B-08)"}\n`);
  if (invalid.length === 0) {
    process.stdout.write(`ИТОГ: ${inn.length + ogrn.length} реквизитов, все по контрольным суммам · exit 0\n`);
    process.exit(0);
  }
  process.stdout.write(`ИТОГ: невалидные реквизиты: ${[...new Set(invalid)].join(", ")} · exit 1\n`);
  process.exit(1);
} catch (error) {
  process.stderr.write(`файл не читается: ${only} (${error?.message ?? error})\n`);
  process.exit(2);
}