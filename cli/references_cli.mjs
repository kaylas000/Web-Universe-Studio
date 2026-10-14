#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — cli/references_cli.mjs
   Поиск по архиву референсов через KnowledgeRetriever (§4.7, §12.2 ТЗ). Провайдер local:
   лексический BM25 по `verticals/<name>/references/.index.json` (+ живой сбор, если индекса нет).

   Использование:
     node cli/references_cli.mjs search "вертикальный ритм заголовка"
     node cli/references_cli.mjs search "дизайн лендинга" --vertical web_studio --top 3
     node cli/references_cli.mjs stats
   Выход: 0 — поиск выполнен; 1 — ошибка/нет результатов не является ошибкой (пустой список → 0).
*/

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { KnowledgeRetriever, buildIndex, documentsFromDirectory } from "../core/knowledge/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = resolve(HERE, "..");
const VERTICALS_DIR = join(PLATFORM_ROOT, "verticals");

function readIndex(verticalDir) {
  const indexPath = join(verticalDir, "references", ".index.json");
  if (existsSync(indexPath)) {
    const data = JSON.parse(readFileSync(indexPath, "utf8"));
    return { index: { documents: data.documents, df: new Map(data.df ?? []), avgLen: data.avgLen ?? 1, terms: data.terms ?? [] }, provider: data.provider ?? "local" };
  }
  const docs = documentsFromDirectory(join(verticalDir, "references"));
  const index = buildIndex(docs);
  return { index, provider: "local" };
}

function verticalDirs(only) {
  if (!existsSync(VERTICALS_DIR)) return [];
  return readdirSync(VERTICALS_DIR)
    .filter((n) => !n.startsWith("_"))
    .map((n) => join(VERTICALS_DIR, n))
    .filter((d) => existsSync(join(d, "vertical.yaml")))
    .filter((d) => !only || basename(d) === only)
    .sort();
}

function main(argv) {
  const cmd = argv[0] ?? "help";
  const rest = argv.slice(1);
  const verticalIdx = rest.indexOf("--vertical");
  const only = verticalIdx >= 0 ? rest[verticalIdx + 1] : null;
  const topIdx = rest.indexOf("--top");
  const topK = topIdx >= 0 ? Number(rest[topIdx + 1]) || 5 : 5;
  const query = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--vertical" && rest[i - 1] !== "--top").join(" ").trim();

  const dirs = verticalDirs(only);
  if (dirs.length === 0) {
    process.stderr.write(`нет вертикалей (only=${only ?? "-"})\n`);
    return 1;
  }

  if (cmd === "stats") {
    let total = 0;
    for (const dir of dirs) {
      const { index } = readIndex(dir);
      total += index.documents.length;
      process.stdout.write(`${basename(dir)}: документов ${index.documents.length}, термов ${index.terms.length}\n`);
    }
    process.stdout.write(`ИТОГ: ${total} документов в архиве\n`);
    return 0;
  }

  if (cmd !== "search") {
    process.stdout.write("cli/references_cli.mjs — поиск по архиву референсов\n\n  search \"<запрос>\" [--vertical <name>] [--top N]\n  stats\n");
    return cmd === "help" ? 0 : 1;
  }
  if (!query) {
    process.stderr.write("укажите запрос: references_cli.mjs search \"...\"\n");
    return 1;
  }

  const hits = [];
  for (const dir of dirs) {
    const { index } = readIndex(dir);
    const retriever = new KnowledgeRetriever({ index });
    for (const hit of retriever.search(query, { topK })) hits.push({ vertical: basename(dir), ...hit });
  }
  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, topK);
  if (top.length === 0) {
    process.stdout.write(`по запросу «${query}» ничего не найдено\n`);
    return 0;
  }
  process.stdout.write(`найдено ${hits.length}, показываю ${top.length}:\n`);
  for (const h of top) process.stdout.write(`  [${h.score.toFixed(2)}] ${h.vertical} · ${h.id} → ${h.takeaway}\n`);
  return 0;
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default main;
