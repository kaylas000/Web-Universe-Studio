#!/usr/bin/env node
/* scripts/lint-quotas.mjs — квоты студии «Студия мини-приложений» (§15 ТЗ, формат итога — контракт).
   Q-01…Q-05 декларативны (scripts/quotas.json). Виды правил:
     jsonNumberMax / regexCount — те же, что в core/vertical-kit (evalRule);
     assetSizeMaxKb             — вес самого тяжёлого растрового файла app/** ≤ max KB.
   Финальная строка — «ИТОГ: N/N · exit 0|1», как у validate.mjs. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

import { evalRule, projectDirFromArgv } from "../../../core/vertical-kit/index.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./quotas.json", import.meta.url), "utf8"));

/** Квота «самое тяжёлое растровое изображение ≤ max KB». */
function assetSizeOk(projectDir, rule) {
  const root = join(projectDir, rule.path ?? "app");
  const exts = rule.extensions ?? [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  let worst = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === "workspace" || name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (exts.includes(extname(name).toLowerCase())) worst = Math.max(worst, statSync(full).size);
    }
  };
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) return true;
  walk(root);
  return worst / 1024 <= Number(rule.max ?? 100);
}

function evalQuota(projectDir, rule) {
  if (rule.kind === "assetSizeMaxKb") return assetSizeOk(projectDir, rule);
  return evalRule(projectDir, rule);
}

const projectDir = projectDirFromArgv();
/** @type {Array<{ code: string, title: string, ok: boolean, detail: string }>} */
const rows = [];
for (const rule of SPEC.rules) {
  let ok;
  try {
    ok = evalQuota(projectDir, rule);
  } catch {
    ok = false;
  }
  rows.push({ code: rule.code, title: rule.title, ok, detail: ok ? String(rule.ok ?? "в квоте") : String(rule.fail ?? "квота превышена") });
}

for (const row of rows) process.stdout.write(`${row.ok ? "OK " : "FAIL"} ${row.code} ${row.title} · ${row.detail}\n`);
process.stdout.write("─".repeat(48) + "\n");
const passed = rows.filter((r) => r.ok).length;
process.stdout.write(`ИТОГ: ${passed}/${rows.length} · exit ${passed === rows.length ? 0 : 1}\n`);
process.exitCode = passed === rows.length ? 0 : 1;