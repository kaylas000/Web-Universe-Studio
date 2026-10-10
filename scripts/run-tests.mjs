#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — scripts/run-tests.mjs
   Рекурсивный запуск node:test по каталогам. Нужен потому, что `node --test <каталог>`
   в Node ≥22 трактует каталог как модуль — здесь мы собираем файлы *.test.mjs сами.

   Использование:
     node scripts/run-tests.mjs tests
     node scripts/run-tests.mjs verticals
     node scripts/run-tests.mjs tests verticals
   Выход: 0 — все тесты зелёные; 1 — есть падения или тестов не найдено.
*/

import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const roots = process.argv.slice(2).map((r) => resolve(r));
if (roots.length === 0) {
  process.stderr.write("укажите каталоги с тестами: node scripts/run-tests.mjs <dir> [...]\n");
  process.exit(1);
}

/** @type {string[]} */
const files = [];
const walk = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === "workspace" || name.startsWith(".") || name.startsWith("_")) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full);
    else if (name.endsWith(".test.mjs")) files.push(full);
  }
};
for (const root of roots) walk(root);

if (files.length === 0) {
  process.stderr.write(`нет тестов *.test.mjs в: ${roots.join(", ")}\n`);
  process.exit(1);
}

files.sort();
process.stdout.write(`ЦЕХ · тесты: ${files.length} файл(ов) из ${roots.map((r) => r.split("/").pop()).join(", ")}\n`);
const res = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(res.status ?? 1);
