#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — scripts/contract.mjs
   Контракт студии как инструмент: аудит, показ, выгрузка и машинная проверка правил.

   Зачем: закон (CONSTITUTION.md), запреты, квоты и правила (rules.json/slop.json/quotas.json)
   должны быть ОДНИМ контрактом, который видит и модель, и валидатор. Этот скрипт отвечает
   на три вопроса инженера и арт-директора:
     1. все ли коды, которые печатают линтеры, объявлены в законе (аудит дрейфа)?
     2. что именно увидит модель в системном промпте (показ контракта)?
     3. какие правила уже нарушены в проекте (машинная проверка до валидатора)?

   Использование:
     node scripts/contract.mjs audit [студия]                 # дрейф и покрытие (все студии)
     node scripts/contract.mjs show <студия> [--codes 40]     # контракт, как его видит модель
     node scripts/contract.mjs check <студия> <проект>        # машинные проверки по проекту
     node scripts/contract.mjs export <студия> <проект>       # contract.json в workspace проекта

   Выход: 0 — контракт согласован / нарушений нет; 1 — есть дрейф или нарушения.
*/

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { auditContractDrift, buildRepairPlan, evaluateCode, loadContract, renderContract } from "../core/loop-engine/contract.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const VERTICALS = join(ROOT, "verticals");

/** Студии платформы: каталоги verticals/<name> с vertical.yaml. */
export function listStudios(root = ROOT) {
  const dir = join(root, "verticals");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith("_") && !name.startsWith("."))
    .filter((name) => {
      try {
        return statSync(join(dir, name)).isDirectory() && existsSync(join(dir, name, "vertical.yaml"));
      } catch {
        return false;
      }
    })
    .sort();
}

function studioRoot(name, root = ROOT) {
  const dir = join(root, "verticals", String(name));
  if (!existsSync(dir)) throw new Error(`студия не найдена: ${name} (доступны: ${listStudios(root).join(", ")})`);
  return dir;
}

/* ————————————————————————— команды ————————————————————————— */

/** Аудит контракта: покрытие, коды без приёма, дрейф линтеров. */
export function audit(root = ROOT, only = null) {
  const studios = only ? [only] : listStudios(root);
  let ok = true;
  const lines = ["ЦЕХ · аудит контрактов студий", "─".repeat(64)];
  for (const name of studios) {
    const dir = studioRoot(name, root);
    const contract = loadContract(dir);
    const drift = auditContractDrift(dir, contract);
    const covered = contract.codes.filter((c) => c.skill).length;
    const pct = contract.stats.codes === 0 ? 0 : Math.round((contract.stats.covered / contract.stats.codes) * 100);
    if (!drift.ok) ok = false; // «призрак» — код линтера, невидимый модели: реальная ошибка контракта
    lines.push(
      `[${name}] статей ${contract.stats.laws} (машинно ${contract.stats.laws - contract.stats.uncovered - contract.stats.humanLaws}, ` +
        `человеку ${contract.stats.humanLaws}) · кодов ${contract.stats.codes} (машинных ${contract.stats.machine}) · ` +
        `приёмов ${contract.stats.skills} · покрытие правил ${contract.stats.covered}/${contract.stats.codes} (${pct}%): ` +
        `приёмом ${covered}, стадией ${contract.stats.withStage}, скриптом ${contract.stats.withScript}`,
    );
    if (drift.phantom.length > 0) {
      lines.push(`   КОДЫ-ПРИЗРАКИ (печатает линтер, нет в законе): ${drift.phantom.map((p) => `${p.code}@${p.source}`).join(", ")}`);
    }
    if (drift.unmapped.length > 0) {
      lines.push(`   СТАТЬИ БЕЗ МАШИННОГО КОДА (проверяет человек): ${drift.unmapped.map((u) => u.id).join(", ")}`);
    }
    if (contract.bare.length > 0) {
      ok = false; // за кодом не стоит ни приём, ни стадия, ни скрипт — это дыра, а не «опишем потом»
      lines.push(`   КОДЫ-СИРОТЫ (нет ни приёма, ни стадии, ни скрипта): ${contract.bare.join(", ")}`);
    }
    if (contract.orphans.length > 0) {
      lines.push(`   БЕЗ ПРИЁМА, НО ПОД НАДЗОРОМ (стадия или скрипт): ${contract.orphans.slice(0, 12).join(", ")}${contract.orphans.length > 12 ? ` … +${contract.orphans.length - 12}` : ""}`);
    }
    if (drift.phantom.length === 0 && drift.unmapped.length === 0) lines.push("   дрейф: нет — каждый код линтера объявлен в законе");
  }
  lines.push("─".repeat(64));
  lines.push(ok ? "ИТОГ: контракты согласованы · exit 0" : "ИТОГ: есть расхождения (см. выше) · exit 1");
  process.stdout.write(`${lines.join("\n")}\n`);
  return ok;
}

/** Показ контракта: ровно тот блок, который уходит в системный промпт модели. */
export function show(name, { maxCodes = 60, root = ROOT } = {}) {
  const dir = studioRoot(name, root);
  const contract = loadContract(dir);
  process.stdout.write(`${renderContract(contract, { maxCodes: Number(maxCodes) })}\n`);
  return true;
}

/** Машинная проверка всех правил контракта по проекту (до валидатора). */
export function check(name, project, { root = ROOT } = {}) {
  const dir = studioRoot(name, root);
  const projectDir = resolve(root, String(project));
  if (!existsSync(projectDir)) {
    process.stderr.write(`проект не найден: ${projectDir}\n`);
    return false;
  }
  const contract = loadContract(dir);
  /** @type {{code: string, status: string, detail: string}[]} */
  const rows = [];
  for (const code of contract.codes) {
    const res = evaluateCode(code, projectDir, contract);
    if (res.status === "skip") continue; // инфраструктурные и «человеческие» правила оставляем валидатору
    rows.push({ code: code.code, status: res.status, detail: code.title || code.kind });
  }
  const failed = rows.filter((r) => r.status === "fail");
  const lines = [`ЦЕХ · машинная проверка контракта «${name}» → ${project}`, "─".repeat(64)];
  for (const row of rows) {
    lines.push(`${row.status === "pass" ? "OK  " : "FAIL"} ${row.code} ${row.detail.slice(0, 90)}`);
  }
  lines.push("─".repeat(64));
  lines.push(`ИТОГ: пройдено ${rows.length - failed.length}/${rows.length} машинных правил · exit ${failed.length === 0 ? 0 : 1}`);
  if (failed.length > 0) {
    const plan = buildRepairPlan({ ok: false, codes: failed.map((f) => f.code), errors: [] }, contract, { projectDir });
    lines.push("", plan.text);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  return failed.length === 0;
}

/** Выгружает контракт в workspace проекта: evidence того, какие правила действовали. */
export function exportContract(name, project, { root = ROOT } = {}) {
  const dir = studioRoot(name, root);
  const projectDir = resolve(root, String(project));
  const contract = loadContract(dir);
  const drift = auditContractDrift(dir, contract);
  const target = join(projectDir, "workspace", "contract.json");
  mkdirSync(dirname(target), { recursive: true });
  const payload = {
    vertical: contract.vertical,
    generatedAt: new Date().toISOString(),
    stats: contract.stats,
    laws: contract.laws,
    codes: contract.codes.map((c) => ({
      code: c.code,
      kind: c.kind,
      title: c.title,
      method: c.method,
      machine: c.machine,
      skill: c.skill,
      law: c.law ?? null,
      target: c.path ?? c.declaredIn ?? null,
      fix: c.fix,
      source: c.source,
    })),
    skills: contract.skills.map((s) => ({ id: s.id, title: s.title, covers: s.covers })),
    orphans: contract.orphans,
    drift: { ok: drift.ok, phantom: drift.phantom, unmapped: drift.unmapped, humanLaws: drift.humanLaws },
  };
  writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`контракт выгружен: ${target}\n  кодов ${payload.codes.length} · приёмов ${payload.skills.length} · дрейф ${drift.ok ? "нет" : "есть"}\n`);
  return true;
}

/** Загрузка контракта из workspace проекта (для внешних инструментов и отчётов). */
export function loadExported(projectDir) {
  const target = join(resolve(String(projectDir)), "workspace", "contract.json");
  if (!existsSync(target)) return null;
  try {
    return JSON.parse(readFileSync(target, "utf8"));
  } catch {
    return null;
  }
}

/* ————————————————————————— CLI ————————————————————————— */

function parseArgs(argv) {
  /** @type {{_: string[], flags: Record<string, string|boolean>}} */
  const out = { _: [], flags: {} };
  for (const raw of argv) {
    const arg = String(raw);
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const [key, value] = arg.replace(/^--/, "").split("=");
    out.flags[key] = value === undefined ? true : value;
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0] ?? "audit";
  try {
    switch (command) {
      case "audit":
        return audit(ROOT, args._[1] ?? null) ? 0 : 1;
      case "show":
        if (!args._[1]) throw new Error("укажите студию: node scripts/contract.mjs show web_studio");
        return show(args._[1], { maxCodes: args.flags.codes ?? 60 }) ? 0 : 1;
      case "check":
        if (!args._[2]) throw new Error("укажите студию и проект: node scripts/contract.mjs check mini_apps verticals/mini_apps/projects/timer-app");
        return check(args._[1], args._[2]) ? 0 : 1;
      case "export":
        if (!args._[2]) throw new Error("укажите студию и проект: node scripts/contract.mjs export web_studio verticals/web_studio/projects/pcpolimer");
        return exportContract(args._[1], args._[2]) ? 0 : 1;
      default:
        process.stderr.write(
          [
            "ЦЕХ · контракт студии",
            "",
            "  node scripts/contract.mjs audit [студия]             дрейф и покрытие правил",
            "  node scripts/contract.mjs show <студия> [--codes N]  контракт, как его видит модель",
            "  node scripts/contract.mjs check <студия> <проект>    машинная проверка правил",
            "  node scripts/contract.mjs export <студия> <проект>   contract.json в workspace проекта",
            "",
          ].join("\n"),
        );
        return 1;
    }
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    return 1;
  }
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default { audit, show, check, exportContract, loadExported, listStudios, main };
