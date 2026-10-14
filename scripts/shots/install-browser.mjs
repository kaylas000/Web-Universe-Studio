#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — scripts/shots/install-browser.mjs
   Одноразовая подготовка дорожки «browser» для съёмки скриншотов архива.

   Что делает:
     1. ставит puppeteer-core и @sparticuz/chromium в scripts/shots/.browser
        (ядро репозитория остаётся zero-dep: каталог вне git, см. .gitignore);
     2. распаковывает набор системных библиотек al2023 (libnspr4/libnss3 …) рядом
        с пакетом, чтобы Chromium запускался на Debian/Ubuntu без apt;
     3. проверяет запуск: рендерит пробный PNG.

   Запуск: node scripts/shots/install-browser.mjs [--check-only] [--force]
   Выход: 0 — дорожка браузера готова; 1 — не удалось (остаётся дорожка card).
*/

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

import { LOCAL_BROWSER_DIR, openBrowser, shootHtml } from "./capture.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check-only");
const force = argv.includes("--force");

function npm(args, cwd) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(npmCmd, args, { cwd, stdio: "inherit" });
}

/** Распаковывает al2023.tar.br (библиотеки Chromium) в <chromium>/al2023/. */
function extractLibs() {
  const pkgRoot = join(LOCAL_BROWSER_DIR, "node_modules", "@sparticuz", "chromium");
  const brFile = join(pkgRoot, "bin", "al2023.tar.br");
  const outDir = join(pkgRoot, "al2023");
  if (existsSync(join(outDir, "lib", "libnspr4.so")) && !force) return outDir;
  if (!existsSync(brFile)) throw new Error(`нет набора библиотек: ${brFile}`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const tarPath = join(pkgRoot, "bin", "al2023.tar");
  writeFileSync(tarPath, brotliDecompressSync(readFileSync(brFile)));
  execFileSync("tar", ["-xf", tarPath, "-C", outDir], { stdio: "inherit" });
  rmSync(tarPath, { force: true });
  return outDir;
}

async function main() {
  const dir = resolve(LOCAL_BROWSER_DIR);
  mkdirSync(dir, { recursive: true });

  if (!checkOnly && !existsSync(join(dir, "node_modules", "puppeteer-core"))) {
    const pkg = join(dir, "package.json");
    if (!existsSync(pkg)) writeFileSync(pkg, `${JSON.stringify({ name: "ceh-shots-browser", private: true, type: "module" }, null, 2)}\n`);
    process.stdout.write("установка puppeteer-core + @sparticuz/chromium в scripts/shots/.browser …\n");
    npm(["install", "--no-audit", "--no-fund", "puppeteer-core", "@sparticuz/chromium"], dir);
  }

  try {
    const libs = extractLibs();
    process.stdout.write(`библиотеки Chromium: ${libs}\n`);
  } catch (error) {
    process.stderr.write(`не удалось распаковать библиотеки: ${String(error?.message ?? error)}\n`);
    process.stderr.write("останется дорожка card (нулевые зависимости): node scripts/render_reference_screenshots.mjs --engine=card\n");
    return 1;
  }

  const probe = join(HERE, ".browser", "probe.png");
  const handle = await openBrowser({ viewport: { width: 640, height: 320 } });
  if (!handle) {
    process.stderr.write("браузер не запустился — останется дорожка card\n");
    return 1;
  }
  try {
    await shootHtml(handle, "<html><body style='margin:0;background:#111;color:#eee;font:700 28px system-ui'>ЦЕХ · архив референсов</body></html>", {
      outPath: probe,
      width: 640,
      height: 320,
    });
    process.stdout.write(`проверка съёмки: ${probe}\nготово: дорожка browser доступна\n`);
    return 0;
  } finally {
    await handle.close();
  }
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) process.exit(await main());
