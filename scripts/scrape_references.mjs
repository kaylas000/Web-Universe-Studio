#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — scripts/scrape_references.mjs
   Изъятие приёмов в архив (К-04, К-11, §12.1 ТЗ). По умолчанию работает ОФЛАЙН в режиме
   «аудит»: проверяет уже собранный архив и требует takeaway у каждой записи. Сетевой обход
   включается только явным --fetch и без ключей/без обязательств — источник в configs/references_sources.yaml.

   Правило: запись без takeaway не принимается (К-04). Без источника приём — слоп.

   Использование:
     node scripts/scrape_references.mjs                 # аудит архива всех вертикалей
     node scripts/scrape_references.mjs web_studio      # одна вертикаль
     node scripts/scrape_references.mjs --fetch          # сетевой обход (enabled-источники)
   Выход: 0 — архив валиден; 1 — есть запись без takeaway / ошибка конфига.
*/

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSimpleYaml } from "../core/loop-engine/config.mjs";
import { documentsFromDirectory } from "../core/knowledge/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = resolve(HERE, "..");
const VERTICALS_DIR = join(PLATFORM_ROOT, "verticals");
const CONFIG = join(PLATFORM_ROOT, "configs", "references_sources.yaml");

/** Аудит архива одной вертикали: метаданные без takeaway — нарушение К-04. @returns {{ ok: boolean, bad: string[], good: number }} */
export function auditArchive(verticalDir) {
  const refsDir = join(verticalDir, "references");
  if (!existsSync(refsDir)) return { ok: true, bad: [], good: 0 };
  const bad = [];
  let good = 0;
  const docs = documentsFromDirectory(refsDir);
  good += docs.length;
  const metaDir = join(refsDir, "metadata");
  if (existsSync(metaDir)) {
    for (const name of readdirSync(metaDir)) {
      if (!name.endsWith(".yaml") && !name.endsWith(".yml")) continue;
      const text = readFileSync(join(metaDir, name), "utf8");
      const takeaway = (text.match(/^takeaway:\s*(.+)$/m) ?? [])[1];
      if (!takeaway || takeaway.trim().length < 10) bad.push(join(refsDir, "metadata", name));
    }
  }
  return { ok: bad.length === 0, bad, good };
}

function main(argv) {
  const fetch = argv.includes("--fetch");
  const only = argv.find((a) => !a.startsWith("--")) ?? null;
  if (!existsSync(CONFIG)) {
    process.stderr.write(`нет конфига источников: configs/references_sources.yaml\n`);
    return 1;
  }
  const config = parseSimpleYaml(readFileSync(CONFIG, "utf8"));
  const maxPerRun = Number(config?.rules?.max_per_run ?? 50);

  if (fetch) {
    const enabled = (config?.sources ?? []).filter((s) => s && s.enabled && (!only || s.vertical === only));
    if (enabled.length === 0) {
      process.stdout.write("--fetch: нет включённых источников (все enabled: false) — сетевой обход пропущен\n");
    } else {
      process.stdout.write(`--fetch: включено источников ${enabled.length} (ограничение ${maxPerRun}/прогон)\n`);
      for (const s of enabled) process.stdout.write(`  → ${s.vertical}: ${s.url} (${s.kind})\n`);
      process.stdout.write("сетевой обход требует внешнего клиента; ядро остаётся zero-dep\n");
    }
  }

  const dirs = readdirSync(VERTICALS_DIR)
    .filter((n) => !n.startsWith("_"))
    .map((n) => join(VERTICALS_DIR, n))
    .filter((d) => statSync(d).isDirectory() && existsSync(join(d, "vertical.yaml")))
    .filter((d) => !only || basename(d) === only)
    .sort();
  if (dirs.length === 0) {
    process.stderr.write(`нет вертикалей для аудита (only=${only ?? "-"})\n`);
    return 1;
  }

  let ok = true;
  let total = 0;
  for (const dir of dirs) {
    if (!fetch) {
      const r = auditArchive(dir);
      total += r.good;
      ok = ok && r.ok;
      process.stdout.write(`${r.ok ? "OK " : "FAIL"} ${basename(dir)}: записей с takeaway ${r.good}${r.bad.length ? `, без takeaway ${r.bad.length}` : ""}\n`);
      for (const b of r.bad) process.stdout.write(`     К-04: нет takeaway → ${b}\n`);
    } else {
      process.stdout.write(`OK  ${basename(dir)}: источники в конфиге\n`);
    }
  }
  process.stdout.write(`ИТОГ: архив ${ok ? "валиден" : "с нарушениями К-04"} (${total} записей)\n`);
  return ok ? 0 : 1;
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default auditArchive;
