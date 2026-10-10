#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — cli/main.mjs
   Единая точка входа метаплатформы: диспетчер к ядру, гейту, CEO-агенту, API и архиву.
   Ноль зависимостей; дочерние процессы запускаются тем же Node (без shell).

   Использование:
     node cli/main.mjs loop <project> [--validator ceh_project]
     node cli/main.mjs gate [--vertical web_studio] [--json]
     node cli/main.mjs orchestrate <composition.yaml> | --goal "<текст>"
     node cli/main.mjs api [--port 8787]
     node cli/main.mjs references search "<запрос>" | stats
     node cli/main.mjs index-references
     node cli/main.mjs acceptance
     node cli/main.mjs help
*/

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const COMMANDS = {
  loop: { script: "core/loop-engine/cli.mjs", desc: "ручной прогон цикла (К-21)" },
  gate: { script: "core/gate.mjs", desc: "платформенный гейт: все вертикали" },
  "gate:web": { script: "core/loop-engine/gate.mjs", desc: "гейт веб-вертикали (эталон)" },
  orchestrate: { script: "core/orchestrator/cli.mjs", desc: "CEO-агент: композиции (DAG)" },
  api: { script: "core/api/server.mjs", desc: "API Gateway (node:http)" },
  references: { script: "cli/references_cli.mjs", desc: "поиск по архиву референсов (RAG)" },
  "index-references": { script: "scripts/index_references.mjs", desc: "сборка RAG-индекса архива" },
  scrape: { script: "scripts/scrape_references.mjs", desc: "аудит/сбор архива (К-04)" },
};

function help() {
  const lines = [
    "ЦЕХ · метаплатформа — единый CLI",
    "",
    "  node cli/main.mjs <команда> [аргументы]",
    "",
    "Команды:",
  ];
  for (const [name, meta] of Object.entries(COMMANDS)) lines.push(`  ${name.padEnd(18)} ${meta.desc}`);
  lines.push("  acceptance          приёмка платформы (DoD §15)");
  lines.push("  test                тесты движка + платформы + вертикалей");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function run(script, args) {
  const res = spawnSync(process.execPath, [resolve(ROOT, script), ...args], { stdio: "inherit", cwd: ROOT });
  if (res.error) {
    process.stderr.write(`не удалось запустить ${script}: ${res.error.message}\n`);
    return 1;
  }
  return res.status ?? 1;
}

function main(argv) {
  const command = argv[0] ?? "help";
  const rest = argv.slice(1);
  if (command === "help" || command === "-h" || command === "--help") {
    process.stdout.write(help());
    return 0;
  }
  if (command === "acceptance") return run("scripts/acceptance_test.sh", []);
  if (command === "test") {
    let code = run("scripts/run-tests.mjs", ["core/loop-engine/tests", "tests", "verticals"]);
    if (code === 0) code = run("core/loop-engine/cli.mjs", ["--selftest"]);
    return code;
  }
  const meta = COMMANDS[command];
  if (!meta) {
    process.stderr.write(`неизвестная команда «${command}»\n\n${help()}`);
    return 1;
  }
  const script = meta.script.endsWith(".sh") ? meta.script : meta.script;
  if (meta.script.endsWith(".sh")) {
    const res = spawnSync("bash", [resolve(ROOT, meta.script), ...rest], { stdio: "inherit", cwd: ROOT });
    return res.status ?? 1;
  }
  return run(script, rest);
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export default main;
