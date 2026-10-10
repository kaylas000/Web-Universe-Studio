#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — scripts/index_references.mjs
   Сборка RAG-индекса архива референсов (§12.2, §4.7 ТЗ). Провайдер по умолчанию — local:
   кладём лексический индекс в `verticals/<name>/references/.index.json`, чтобы
   KnowledgeRetriever работал без внешней БД.

   Запись без takeaway в индекс не попадает (К-04): решение обязано опираться на источник.

   Использование:
     node scripts/index_references.mjs                 # все вертикали
     node scripts/index_references.mjs web_studio      # одна вертикаль
     node scripts/index_references.mjs --check         # проверка: индекс покрывает архив
   Выход: 0 — индекс собран/актуален; 1 — ошибка.
*/

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildIndex, documentsFromDirectory } from "../core/knowledge/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PLATFORM_ROOT = resolve(HERE, "..");
const VERTICALS_DIR = join(PLATFORM_ROOT, "verticals");

/** @returns {string[]} */
export function listVerticalDirs(only = null) {
  if (!existsSync(VERTICALS_DIR)) return [];
  return readdirSync(VERTICALS_DIR)
    .filter((n) => !n.startsWith("_"))
    .map((n) => join(VERTICALS_DIR, n))
    .filter((d) => statSync(d).isDirectory() && existsSync(join(d, "vertical.yaml")))
    .filter((d) => !only || basename(d) === only)
    .sort();
}

/** @returns {{ vertical: string, documents: number, terms: number, sources: string[] }} */
export function indexVertical(verticalDir, { write = true } = {}) {
  const name = basename(verticalDir);
  const refsDir = join(verticalDir, "references");
  const documents = existsSync(refsDir) ? documentsFromDirectory(refsDir, { kind: "reference" }) : [];
  const index = buildIndex(documents);
  const payload = {
    provider: "local",
    vertical: name,
    built_at: new Date().toISOString(),
    documents: index.documents,
    df: [...index.df.entries()],
    avgLen: index.avgLen,
    terms: index.terms,
  };
  if (write) {
    mkdirSync(refsDir, { recursive: true });
    writeFileSync(join(refsDir, ".index.json"), `${JSON.stringify(payload, null, 2)}\n`);
  }
  return { vertical: name, documents: documents.length, terms: index.terms.length, sources: documents.map((d) => d.source) };
}

function main(argv) {
  const check = argv.includes("--check");
  const only = argv.find((a) => !a.startsWith("--")) ?? null;
  const dirs = listVerticalDirs(only);
  if (dirs.length === 0) {
    process.stderr.write(`нет вертикалей для индексации (only=${only ?? "-"})\n`);
    return 1;
  }
  let total = 0;
  for (const dir of dirs) {
    const report = indexVertical(dir, { write: !check });
    total += report.documents;
    process.stdout.write(`${report.vertical}: документов ${report.documents}, термов ${report.terms}${check ? " (--check: не записан)" : ` → references/.index.json`}\n`);
  }
  process.stdout.write(`ИТОГ: ${dirs.length} вертикалей, ${total} документов в индексе\n`);
  return 0;
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default indexVertical;
