#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — core/orchestrator/cli.mjs
   CLI CEO-агента (§13.2 ТЗ): запустить композицию по файлу или спланировать её из цели.

   Использование:
     node core/orchestrator/cli.mjs compositions/<name>/composition.yaml
     node core/orchestrator/cli.mjs --goal "лендинг запуска + договор"
     node core/orchestrator/cli.mjs --plan-only --goal "три поста и дашборд продаж"
     node core/orchestrator/cli.mjs <файл> --accept-hitl      # вердикт человека (G4)
     node core/orchestrator/cli.mjs <файл> --mode best_effort
     node core/orchestrator/cli.mjs <файл> --json
   Выход: 0 — композиция принята; 1 — есть провалы/незакрытый HITL/ошибка схемы.
*/

import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createLogger, silentLogger } from "../loop-engine/logger.mjs";
import { CeoAgent } from "./ceo.mjs";
import { loadComposition, validateComposition } from "./composition.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = resolve(HERE, "..", "..");

const HELP = `ЦЕХ · CEO-агент метаплатформы

  node core/orchestrator/cli.mjs <composition.yaml | --goal "<текст>"> [опции]

Опции
  --goal <текст>        спланировать композицию из цели (Plan/Route)
  --plan-only           только показать план, не запускать
  --accept-hitl         считать HITL-задачи принятыми человеком (G4, К-09)
  --mode <m>            агрегация: all | best_effort | quorum (по умолчанию — из композиции)
  --json                машиночитаемый отчёт
  --quiet               только итог
  --help, -h            эта справка
`;

/** @param {string[]} argv */
export function parseArgs(argv = []) {
  const args = argv.map(String);
  const opts = { file: null, goal: null, planOnly: false, acceptHitl: false, mode: null, json: false, quiet: false, help: false };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "--plan-only") opts.planOnly = true;
    else if (a === "--accept-hitl") opts.acceptHitl = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--quiet") opts.quiet = true;
    else if (a === "--goal" || a === "--mode") {
      const v = args[i + 1];
      if (v === undefined || v.startsWith("--")) throw new Error(`опция ${a} требует значение`);
      if (a === "--goal") opts.goal = v;
      else opts.mode = v;
      i += 1;
    } else if (!a.startsWith("--")) opts.file = a;
    else throw new Error(`неизвестная опция: ${a}`);
  }
  return opts;
}

/** @param {{ ok: boolean, mode: string, total: number, passed: number, hitl_pending: string[], results: any[], codes: string[] }} report */
export function formatReport(report, { quiet = false } = {}) {
  const lines = [];
  if (!quiet) {
    lines.push("ЦЕХ · CEO-агент — отчёт по композиции");
    lines.push("─".repeat(56));
    for (const r of report.results) {
      const mark = r.status === "ok" ? "OK " : r.status === "hitl_pending" ? "HITL" : "FAIL";
      const codes = r.codes?.length ? `  ${r.codes.join(",")}` : "";
      const hitl = r.hitl ? " [человек]" : "";
      lines.push(`  ${mark} ${r.id} → ${r.vertical} · ${r.gate}${hitl}  (${r.iterations} итерац., ${r.ms}ms)${codes}`);
    }
    lines.push("─".repeat(56));
  }
  const extra = report.hitl_pending?.length ? ` · HITL ждёт: ${report.hitl_pending.join(", ")}` : "";
  lines.push(`ИТОГ: ${report.ok ? "OK" : "FAIL"} ${report.passed}/${report.total} задач · режим ${report.mode}${extra} · exit ${report.ok ? 0 : 1}`);
  return `${lines.join("\n")}\n`;
}

/** @param {string[]} argv */
export async function main(argv = process.argv.slice(2)) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  const logger = opts.quiet ? silentLogger : createLogger({ name: "ceo", level: process.env.LOOP_ENGINE_LOG ?? "warn" });
  const agent = new CeoAgent({ logger });

  let composition;
  try {
    if (opts.file) {
      const path = isAbsolute(opts.file) ? opts.file : resolve(process.cwd(), opts.file);
      composition = loadComposition(path);
      const check = validateComposition(composition, { knownVerticals: agent.knownNames() });
      if (!check.ok) {
        process.stderr.write(`схема композиции: ${check.errors.map((e) => `${e.code} ${e.description}`).join("; ")}\n`);
        return 1;
      }
    } else if (opts.goal) {
      composition = agent.plan(opts.goal);
    } else {
      process.stderr.write(`${HELP}`);
      return 1;
    }
  } catch (error) {
    process.stderr.write(`${error.code ?? "E-SCHEMA"}: ${error.message}\n`);
    return 1;
  }

  if (opts.planOnly) {
    const plan = { name: composition.metadata.name, goal: composition.metadata.goal, tasks: composition.tasks, aggregate: composition.aggregate };
    process.stdout.write(opts.json ? `${JSON.stringify(plan, null, 2)}\n` : `план: ${composition.metadata.name}\n${composition.tasks.map((t) => `  - ${t.id} → ${t.vertical} · ${t.gate}${t.hitl ? " [человек]" : ""}${t.needs.length ? ` (needs: ${t.needs.join(",")})` : ""}`).join("\n")}\n`);
    return 0;
  }

  const report = await agent.run(composition, { acceptedHitl: opts.acceptHitl, mode: opts.mode ?? undefined });
  if (opts.json) process.stdout.write(`${JSON.stringify({ composition: basename(composition.dir ?? composition.metadata.name), ...report }, null, 2)}\n`);
  else process.stdout.write(formatReport(report, { quiet: opts.quiet }));
  return report.ok ? 0 : 1;
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) main().then((code) => process.exit(code));
