#!/usr/bin/env node
/* ЦЕХ · Universal Loop Engine — gates-cli.mjs
   Прогон стадий цикла (G1…G4) по конкретному артефакту.

   Чек-листы стадий лежат в `verticals/<студия>/gates/G*.md` и рядом с каждым пунктом
   называют машинную реализацию: `` `@check kind параметры` ``. Этот CLI — тонкая
   оболочка над `gates.mjs`: он не знает ни одного правила сам, только печатает исход
   трёхзначной проверки (true — выполнено, false — нарушено, null — судит человек).

   Использование:
     node cli/main.mjs gates G1 --studio web_studio --project dezobrabotka
     node cli/main.mjs gates all --studio web_studio --project verticals/web_studio/projects/pcpolimer
     node cli/main.mjs gates --studio web_studio --project ивакуатор --json
   Выход: 0 — все прогоняемые стадии пройдены, 1 — есть провал или ошибка вызова.
*/

import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describeGate, loadGates, runGates } from "./gates.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");

const HELP = `ЦЕХ · стадии цикла студии

  node cli/main.mjs gates [G1|G2|G3|G4|all] --studio <студия> --project <имя|путь> [--json]

  --studio   имя студии (verticals/<имя>) или путь к ней; по умолчанию web_studio
  --project  имя проекта в <студия>/projects/<имя> либо путь к каталогу проекта (обязателен)
  --json     машинный отчёт целиком
  --quiet    только итог и провалы
`;

function parseArgs(argv) {
  const opts = { only: [], studio: "web_studio", project: null, json: false, quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--json") {
      opts.json = true;
      continue;
    }
    if (arg === "--quiet") {
      opts.quiet = true;
      continue;
    }
    if (arg === "--studio") {
      opts.studio = argv[++i] ?? opts.studio;
      continue;
    }
    if (arg === "--project") {
      opts.project = argv[++i] ?? null;
      continue;
    }
    if (/^(G[1-9]\d*)$/.test(arg)) {
      opts.only.push(arg);
      continue;
    }
    if (arg === "all" || arg === "--all") continue;
    return { error: `неизвестный аргумент «${arg}»` };
  }
  return opts;
}

function studioRootOf(name) {
  if (name.includes("/")) return resolve(name);
  return join(ROOT, "verticals", name);
}

function projectDirOf(studioRoot, project) {
  if (!project) return null;
  if (isAbsolute(project)) return project;
  if (project.includes("/") || project.includes("\\")) return resolve(project);
  return join(studioRoot, "projects", project);
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (opts.error) {
    process.stderr.write(`${opts.error}\n\n${HELP}`);
    return 1;
  }
  const studioRoot = studioRootOf(opts.studio);
  if (!existsSync(studioRoot)) {
    process.stderr.write(`нет студии ${studioRoot}\n`);
    return 1;
  }
  const projectDir = projectDirOf(studioRoot, opts.project);
  if (!projectDir || !existsSync(projectDir)) {
    process.stderr.write(`укажите существующий проект: --project <имя|путь>\n\n${HELP}`);
    return 1;
  }

  const loaded = loadGates(studioRoot);
  const known = loaded.gates.map((gate) => gate.id);
  const unknown = opts.only.filter((id) => !known.includes(id));
  if (unknown.length > 0) {
    process.stderr.write(`нет стадии ${unknown.join(", ")} (есть: ${known.join(", ")})\n`);
    return 1;
  }

  return runGates(studioRoot, projectDir, { only: opts.only.length > 0 ? opts.only : null }).then((report) => {
    if (opts.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return report.passed ? 0 : 1;
    }
    const lines = [`ЦЕХ · стадии цикла · ${report.vertical} / ${report.project}`];
    for (const gate of report.gates) {
      const failed = gate.checks.filter((check) => check.ok === false);
      const human = gate.checks.filter((check) => check.ok === null);
      const mark = gate.passed ? "OK  " : "FAIL";
      const described = describeGate(loaded.gates.find((item) => item.id === gate.id));
      lines.push(`${mark} ${described} · провалов ${failed.length} · человеку ${human.length}`);
      if (!opts.quiet || failed.length > 0) {
        for (const check of gate.checks) {
          if (check.ok === true && opts.quiet) continue;
          const state = check.ok === false ? "✗" : check.ok === null ? "…" : "·";
          const codes = check.codes.length > 0 ? ` [${check.codes.join(", ")}]` : "";
          lines.push(`   ${state} ${check.n}. ${check.text.slice(0, 110)}${codes}`);
          if (check.ok === false && check.detail) lines.push(`      → ${check.detail}`);
          if (check.ok === null && check.detail) lines.push(`      → ${check.detail}`);
        }
      }
    }
    lines.push("─".repeat(60));
    lines.push(report.passed ? `ИТОГ: стадии пройдены (машинных провалов нет) · exit 0` : `ИТОГ: провал на кодах ${report.codes.join(", ") || "—"} · exit 1`);
    process.stdout.write(`${lines.join("\n")}\n`);
    return report.passed ? 0 : 1;
  });
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) {
  // main возвращает промис в ветке прогона — дожидаемся его и выходим по коду
  Promise.resolve(main(process.argv.slice(2)))
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`стадии упали: ${String(error?.message ?? error)}\n`);
      process.exit(1);
    });
}

export default main;
