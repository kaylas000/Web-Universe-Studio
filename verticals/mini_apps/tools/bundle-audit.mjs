#!/usr/bin/env node
/* tools/bundle-audit.mjs — вес бандла мини-приложения (К-08, Q-01).

   Читает app/bundle-size.json (gzip_kb) и ДОПОЛНИТЕЛЬНО считает фактический gzip
   артефакта сам (node:zlib — ноль npm-зависимостей): app/index.html + app/app.js +
   app/style.css, сжатые gzipSync. Проверяет лимит 300KB gzip и печатает отчёт.

   CLI: node tools/bundle-audit.mjs [<projectDir>] [--limit-kb 300]
         (по умолчанию projectDir = ".", лимит = 300KB)
   Выход: 0 — бандл в лимите; 1 — превышен; 2 — нет аргумента/артефакта.

   ESM-API: auditBundle(projectDir, { limitKb }) → { ok, declared, computed, limitKb, files }
*/

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

/** Файлы оболочки для фактического замера gzip (как в sw.js). */
const SHELL_FILES = ["index.html", "style.css", "app.js"];

/**
 * @param {string} projectDir
 * @param {{ limitKb?: number }} [opts]
 * @returns {{ ok: boolean, declared: number|null, computed: number, limitKb: number, files: string[] }}
 */
export function auditBundle(projectDir, opts = {}) {
  const limitKb = Number(opts.limitKb ?? 300);
  const appDir = join(projectDir, "app");
  const reportPath = join(appDir, "bundle-size.json");

  // декларативный вес (Q-01: app/bundle-size.json → gzip_kb)
  let declared = null;
  if (existsSync(reportPath)) {
    try {
      const data = JSON.parse(readFileSync(reportPath, "utf8"));
      declared = typeof data.gzip_kb === "number" ? data.gzip_kb : null;
    } catch {
      declared = null;
    }
  }

  // фактический вес: gzip(index.html + app.js + style.css) в KB
  const files = [];
  const chunks = [];
  for (const name of SHELL_FILES) {
    const full = join(appDir, name);
    if (existsSync(full) && statSync(full).isFile()) {
      files.push(name);
      chunks.push(readFileSync(full));
    }
  }
  const computed = chunks.length > 0 ? gzipSync(Buffer.concat(chunks)).length / 1024 : 0;

  const overDeclared = declared !== null && declared > limitKb;
  const overComputed = computed > limitKb;
  return { ok: !overDeclared && !overComputed, declared, computed, limitKb, files };
}

function main(argv) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const limitArg = (argv.find((a) => a.startsWith("--limit-kb=")) ?? "").split("=")[1];
  const target = positional[0] ?? ".";
  const projectDir = resolve(target);
  const limitKb = limitArg ? Number(limitArg) : 300;

  if (!existsSync(join(projectDir, "app"))) {
    process.stderr.write(`нет артефакта app/ в «${target}»: node tools/bundle-audit.mjs <projectDir> [--limit-kb 300]\n`);
    return 2;
  }

  const res = auditBundle(projectDir, { limitKb });
  process.stdout.write(`бандл ${target}/app\n`);
  process.stdout.write(`  лимит:        ${res.limitKb} KB gzip (Q-01, К-08)\n`);
  process.stdout.write(`  декларируем:  ${res.declared === null ? "— (нет app/bundle-size.json)" : `${res.declared} KB gzip`}\n`);
  process.stdout.write(`  фактический:  ${res.computed.toFixed(1)} KB gzip (${res.files.join(" + ") || "нет файлов оболочки"})\n`);
  if (res.ok) {
    process.stdout.write("ИТОГ: бандл в лимите · exit 0\n");
    return 0;
  }
  const reasons = [];
  if (res.declared !== null && res.declared > res.limitKb) reasons.push(`декларативный вес ${res.declared} KB > ${res.limitKb} KB`);
  if (res.computed > res.limitKb) reasons.push(`фактический gzip ${res.computed.toFixed(1)} KB > ${res.limitKb} KB`);
  process.stdout.write(`FAIL ${reasons.join("; ")}\n`);
  process.stdout.write("ИТОГ: бандл превышает лимит · exit 1\n");
  return 1;
}

const invokedDirectly = process.argv[1] ? process.argv[1].endsWith("bundle-audit.mjs") : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { auditBundle };