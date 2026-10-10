#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — core/gate.mjs
   Платформенный гейт (CI-слой К-15): прогоняет цикл приёмки по КАЖДОЙ вертикали
   verticals/<name>/ и каждому её проекту projects/<name>/, без сети и ключей (mock/dry-run).

   Отличие от ядра core/loop-engine/gate.mjs: тот — веб-специфичен (проект обязан иметь site/,
   валидатор жёстко ceh_project). Здесь валидатор — vertical_project (свой scripts/validate.mjs
   у каждой студии), поэтому гейт работает по всем 7 вертикалям (§7, §15 ТЗ).

   Использование:
     node core/gate.mjs                       # все вертикали, все проекты
     node core/gate.mjs --vertical web_studio # одна вертикаль
     node core/gate.mjs --json                # машиночитаемый отчёт
     node core/gate.mjs --clean               # не оставлять workspace после прогона
   Выход: 0 — все проекты прошли цикл; 1 — есть провалы/ошибки.
*/

import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSimpleYaml } from "./loop-engine/config.mjs";
import { createLogger, silentLogger } from "./loop-engine/logger.mjs";
import { buildRunnerFromConfig, saveResult } from "./loop-engine/registry.mjs";
import { VERTICAL_CHECKS } from "./loop-engine/validators/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PLATFORM_ROOT = resolve(HERE, "..");
export const VERTICALS_DIR = join(PLATFORM_ROOT, "verticals");
const PROJECTS_IN_VERTICAL = "projects";
const EVIDENCE_FILE = "loop-result.json";

/** @typedef {{ name: string, dir: string, title: string, checks: string[], deliverable: string }} VerticalMeta */
/** @typedef {{ name: string, dir: string, status: "ok"|"fail"|"error"|"skipped", codes: string[], errors: string[], iterations: number, ms: number, evidence: string|null }} ProjectEntry */

const HELP = `ЦЕХ · платформенный гейт метаплатформы

  node core/gate.mjs [опции]

Опции
  --vertical <имя>   только одна вертикаль (verticals/<имя>)
  --json             машиночитаемый отчёт (JSON)
  --clean            удалить workspace после прогона (по умолчанию сохраняется)
  --quiet            только итог
  --log-level <l>    silent|error|warn|info|debug
  --help, -h         эта справка
`;

/** @param {string[]} argv */
export function parsePlatformArgs(argv = []) {
  const args = argv.map(String);
  const opts = { vertical: null, json: false, clean: false, quiet: false, logLevel: null, help: false, unknown: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") { opts.help = true; continue; }
    if (arg === "--json") { opts.json = true; continue; }
    if (arg === "--clean") { opts.clean = true; continue; }
    if (arg === "--quiet") { opts.quiet = true; continue; }
    if (arg === "--vertical" || arg === "--log-level") {
      const value = args[i + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`опция ${arg} требует значение`);
      if (arg === "--vertical") opts.vertical = value.trim();
      else opts.logLevel = value.trim();
      i += 1;
      continue;
    }
    opts.unknown.push(arg);
  }
  if (opts.unknown.length > 0) {
    throw new Error(`неизвестные опции: ${opts.unknown.join(", ")}. Доступны: --vertical, --json, --clean, --quiet, --log-level, --help`);
  }
  return opts;
}

/** Все вертикали: каталоги verticals/<name>/ с файлом vertical.yaml. */
export function listVerticals(verticalsDir = VERTICALS_DIR) {
  if (!existsSync(verticalsDir)) return [];
  return readdirSync(verticalsDir)
    .filter((name) => !name.startsWith("_"))
    .map((name) => join(verticalsDir, name))
    .filter((dir) => statSync(dir).isDirectory() && existsSync(join(dir, "vertical.yaml")))
    .sort();
}

/** @returns {VerticalMeta} */
export function readVerticalMeta(verticalDir) {
  const raw = parseSimpleYaml(/* yaml */ readText(join(verticalDir, "vertical.yaml")));
  const meta = raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {};
  const name = String(raw.name ?? meta.name ?? raw.slug ?? basename(verticalDir)).trim() || basename(verticalDir);
  const title = String(raw.title ?? meta.displayName ?? name);
  const checksRaw = raw.checks ?? meta.checks ?? raw.validator_checks ?? "validate,lint-slop";
  const checks = Array.isArray(checksRaw)
    ? checksRaw.map((s) => String(s).trim()).filter(Boolean)
    : String(checksRaw).split(",").map((s) => s.trim()).filter(Boolean);
  const deliverable = String(raw.deliverable ?? meta.deliverable ?? "");
  return { name, dir: verticalDir, title, checks, deliverable };
}

/** Проекты вертикали: каталоги projects/<name>/ без «_», содержащие маркер-артефакт студии. */
export function listProjects(verticalDir, deliverable = "") {
  const projectsRoot = join(verticalDir, PROJECTS_IN_VERTICAL);
  if (!existsSync(projectsRoot)) return [];
  return readdirSync(projectsRoot)
    .filter((name) => !name.startsWith("_"))
    .map((name) => join(projectsRoot, name))
    .filter((dir) => statSync(dir).isDirectory())
    .filter((dir) => !deliverable || existsSync(join(dir, deliverable)))
    .sort();
}

/** Конфиг проекта: loop.config.yaml рядом с проектом → берём его; иначе — дефолт вертикали. */
export function projectConfig(vertical, projectName, checks) {
  const projectDir = join(vertical.dir, PROJECTS_IN_VERTICAL, projectName);
  const configPath = join(projectDir, "loop.config.yaml");
  if (existsSync(configPath)) return { config: parseSimpleYaml(readText(configPath)), configPath };
  return {
    configPath: null,
    config: {
      project_name: projectName,
      task: `приёмка проекта «${projectName}» вертикали ${vertical.name}`,
      loop: { max_iterations: 1 },
      generator: { type: "mock" },
      context_builder: { type: "studio_default" },
      validator: { type: "vertical_project", checks },
    },
  };
}

/** Прогон цикла по одному проекту. @returns {Promise<ProjectEntry>} */
export async function runProject(vertical, projectName, { logger = silentLogger, clean = false } = {}) {
  const projectDir = join(vertical.dir, PROJECTS_IN_VERTICAL, projectName);
  const label = `${vertical.name}/${projectName}`;
  const workspaceDir = join(projectDir, "workspace");
  const workspacePreexisting = existsSync(workspaceDir);
  const checks = vertical.checks.filter((c) => c === "validate" || existsSync(join(vertical.dir, VERTICAL_CHECKS[c]?.script ?? "\u0000")));

  const { config, configPath } = projectConfig(vertical, projectName, checks);
  const task = String(config.task ?? `приёмка проекта «${projectName}»`);
  const startedAt = Date.now();

  /** @type {ProjectEntry} */
  const entry = { name: label, dir: relative(PLATFORM_ROOT, projectDir), status: "error", codes: [], errors: [], iterations: 0, ms: 0, evidence: null };

  let runner;
  try {
    runner = buildRunnerFromConfig(config, vertical.dir, {
      projectDir,
      configPath,
      logger,
      overrides: { dryRun: true, validator: "vertical_project", checks, iterations: 1 },
    });
  } catch (error) {
    entry.codes = [String(error?.code ?? "E-GATE-RUNNER")];
    entry.errors = [String(error?.message ?? error)];
    entry.ms = Date.now() - startedAt;
    return entry;
  }

  let result;
  try {
    result = await runner.run(task, vertical.dir, projectName);
  } catch (error) {
    entry.codes = [String(error?.code ?? "E-GATE-RUN")];
    entry.errors = [String(error?.message ?? error)];
    entry.ms = Date.now() - startedAt;
    return entry;
  }

  const feedback = result.feedback ?? null;
  const codes = (feedback?.codes ?? []).map(String).filter((c) => c && c !== "OK");
  const hardFail = codes.length === 1 && ["E-CHECK-RUN", "E-CONFIG-CHECK", "E-CHECK-MISSING"].includes(codes[0]);
  entry.status = result.ok ? "ok" : hardFail ? "error" : "fail";
  entry.codes = entry.status === "ok" ? [] : [...new Set(codes)];
  entry.errors = entry.status === "ok" ? [] : [...new Set((feedback?.errors ?? []).map(String))].slice(0, 8);
  entry.iterations = Number(result.iterations ?? 0);
  entry.ms = Number(result.elapsedMs ?? Date.now() - startedAt);

  try {
    saveResult(result, { projectDir, config, logger });
  } catch (error) {
    logger.warn?.("evidence прогона не сохранён", { project: label, error: String(error?.message ?? error) });
  }
  const evidencePath = join(workspaceDir, EVIDENCE_FILE);
  if (existsSync(evidencePath)) entry.evidence = relative(PLATFORM_ROOT, evidencePath);

  if (clean && !workspacePreexisting) rmSync(workspaceDir, { recursive: true, force: true });
  return entry;
}

/** Полный прогон: все вертикали × проекты. */
export async function runPlatformGate(opts = {}) {
  const logger = opts.logger ?? silentLogger;
  const verticals = (opts.vertical ? listVerticals().filter((d) => basename(d) === opts.vertical) : listVerticals()).map(readVerticalMeta);
  /** @type {Array<{ name: string, title: string, projects: ProjectEntry[] }>} */
  const report = [];
  for (const vertical of verticals) {
    const projectNames = listProjects(vertical.dir, vertical.deliverable).map((d) => basename(d));
    /** @type {ProjectEntry[]} */
    const projects = [];
    for (const projectName of projectNames) {
      const entry = await runProject(vertical, projectName, { logger, clean: Boolean(opts.clean) });
      projects.push(entry);
      logger.info?.(`${entry.status.toUpperCase()} ${entry.name}`, { codes: entry.codes });
    }
    report.push({ name: vertical.name, title: vertical.title, projects });
  }
  const all = report.flatMap((v) => v.projects);
  const okCount = all.filter((p) => p.status === "ok").length;
  return {
    gate: "platform",
    ok: all.length > 0 && okCount === all.length,
    total: all.length,
    ok_count: okCount,
    failed: all.filter((p) => p.status === "fail" || p.status === "error").length,
    verticals: report,
  };
}

/** @param {Awaited<ReturnType<typeof runPlatformGate>>} report */
export function formatPlatformReport(report, { quiet = false } = {}) {
  const lines = [];
  if (!quiet) {
    lines.push("ЦЕХ · Платформенный гейт метаплатформы");
    lines.push("─".repeat(56));
    for (const vertical of report.verticals) {
      lines.push(`[${vertical.name}] ${vertical.title}`);
      if (vertical.projects.length === 0) lines.push("  (нет демо-проектов)");
      for (const p of vertical.projects) {
        const mark = p.status === "ok" ? "OK " : p.status === "skipped" ? "-- " : "FAIL";
        const codes = p.codes.length > 0 ? `  ${p.codes.join(",")}` : "";
        lines.push(`  ${mark} ${p.name}  (${p.iterations} итерац., ${p.ms}ms)${codes}`);
      }
    }
    lines.push("─".repeat(56));
  }
  lines.push(`ИТОГ: ${report.ok ? "OK" : "FAIL"} ${report.ok_count}/${report.total} проектов прошли цикл · exit ${report.ok ? 0 : 1}`);
  return `${lines.join("\n")}\n`;
}

/** @param {string[]} argv */
export async function main(argv = process.argv.slice(2)) {
  let opts;
  try {
    opts = parsePlatformArgs(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  const logger = opts.quiet ? silentLogger : createLogger({ name: "platform-gate", level: String(opts.logLevel ?? process.env.LOOP_ENGINE_LOG ?? "warn") });
  const report = await runPlatformGate({ ...opts, logger });
  if (opts.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else process.stdout.write(formatPlatformReport(report, { quiet: opts.quiet }));
  return report.ok ? 0 : 1;
}

/* ————————————————————————————— мелочи ————————————————————————————— */

function readText(path) {
  return readFileSync(path, "utf8");
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) {
  main().then((code) => process.exit(code));
}
