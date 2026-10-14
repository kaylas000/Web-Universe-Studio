/* ЦЕХ · Метаплатформа — scripts/shots/capture.mjs
   Съёмка скриншотов архива референсов: HTML-образец → PNG.

   Две дорожки, обе без обязательных зависимостей репозитория (ядро остаётся zero-dep):
     1. browser  — реальный headless Chromium через puppeteer-core (если он установлен);
                   команда установки — `node scripts/shots/install-browser.mjs`.
     2. card     — растровая отрисовка карточки референса своим PNG-энкодером
                   (node:zlib), без браузера: работает в CI и офлайне.

   Поиск браузера: PUPPETEER_MODULE (путь к каталогу node_modules) → локальный
   scripts/shots/.browser/node_modules → обычный import("puppeteer-core").
   Дополнительные библиотеки al2023 (libnspr4/libnss3) подкладываются в LD_LIBRARY_PATH,
   если рядом с модулем есть распакованный каталог libs — см. install-browser.mjs.
*/

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Каталог, куда install-browser.mjs ставит puppeteer-core/@sparticuz/chromium. */
export const LOCAL_BROWSER_DIR = join(HERE, ".browser");

/** Кандидаты на каталог node_modules с puppeteer-core. */
function moduleRoots() {
  /** @type {string[]} */
  const roots = [];
  if (process.env.PUPPETEER_MODULE) roots.push(resolve(process.env.PUPPETEER_MODULE));
  roots.push(join(LOCAL_BROWSER_DIR, "node_modules"));
  if (process.env.NODE_PATH) roots.push(...String(process.env.NODE_PATH).split(":").filter(Boolean));
  return roots;
}

/** Разрешает точку входа пакета внутри каталога node_modules (уважая exports/main/module). */
function resolvePackageEntry(root, specifier) {
  const nodeModules = root.endsWith("node_modules") ? root : join(root, "node_modules");
  const pkgDir = join(nodeModules, ...String(specifier).split("/"));
  const pkgJson = join(pkgDir, "package.json");
  if (!existsSync(pkgJson)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgJson, "utf8"));
    const exp = pkg.exports?.["."] ?? pkg.exports;
    const fromExports = typeof exp === "string" ? exp : (exp?.import ?? exp?.default ?? exp?.require);
    const entry = typeof fromExports === "string" ? fromExports : (pkg.module ?? pkg.main ?? "index.js");
    const file = join(pkgDir, entry);
    return existsSync(file) ? file : null;
  } catch {
    return null;
  }
}

async function importFrom(root, specifier) {
  const entry = resolvePackageEntry(root, specifier);
  if (!entry) return null;
  try {
    return await import(pathToFileURL(entry).href);
  } catch {
    return null;
  }
}

/**
 * Пытается собрать живой браузер (Chromium). Возвращает null, если браузера нет.
 * @returns {Promise<{launch: () => Promise<any>, close: () => Promise<void>, engine: string, executablePath: string} | null>}
 */
export async function openBrowser({ viewport = { width: 1600, height: 1000 }, deviceScaleFactor = 1 } = {}) {
  let puppeteerMod = null;
  let chromiumMod = null;
  for (const root of moduleRoots()) {
    puppeteerMod ??= await importFrom(root, "puppeteer-core");
    chromiumMod ??= await importFrom(root, "@sparticuz/chromium");
    if (puppeteerMod && chromiumMod) break;
  }
  if (!puppeteerMod) return null;

  const puppeteer = puppeteerMod.default ?? puppeteerMod;

  /** @type {string|undefined} */
  let executablePath = process.env.CHROME_PATH || undefined;
  /** @type {string[]} */
  let args = ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none", "--force-color-profile=srgb"];
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env };

  if (!executablePath && chromiumMod) {
    const chromium = chromiumMod.default ?? chromiumMod;
    executablePath = await chromium.executablePath();
    args = [...chromium.args, ...args];
    // al2023-библиотеки: без них бинарник падает на «libnspr4.so not found»
    for (const libsDir of candidateLibDirs()) {
      if (!existsSync(libsDir)) continue;
      env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH ? `${libsDir}:${env.LD_LIBRARY_PATH}` : libsDir;
      break;
    }
  }
  if (!executablePath || !existsSync(executablePath)) return null;

  const browser = await puppeteer.launch({
    executablePath,
    args,
    env,
    headless: true,
    defaultViewport: { ...viewport, deviceScaleFactor },
  });

  return {
    engine: "browser",
    executablePath,
    browser,
    async close() {
      try {
        await browser.close();
      } catch {
        /* браузер уже закрыт — не мешаем приёмке */
      }
    },
  };
}

/** Каталоги с .so для Chromium (al2023-набор из @sparticuz/chromium). */
function candidateLibDirs() {
  /** @type {string[]} */
  const dirs = [];
  if (process.env.CHROMIUM_LIBS) dirs.push(resolve(process.env.CHROMIUM_LIBS));
  for (const root of moduleRoots()) {
    const pkg = root.endsWith("node_modules") ? join(root, "@sparticuz", "chromium") : join(root, "node_modules", "@sparticuz", "chromium");
    if (!existsSync(pkg)) continue;
    for (const candidate of [join(pkg, "libs"), join(pkg, "al2023", "lib")]) dirs.push(candidate);
    // распакованный набор от install-browser.mjs
    try {
      for (const name of readdirSync(pkg)) {
        if (name === "libs" || name === "al2023" || name.endsWith(".tar")) continue;
        const sub = join(pkg, name);
        if (statSync(sub).isDirectory() && existsSync(join(sub, "lib"))) dirs.push(join(sub, "lib"));
      }
    } catch {
      /* нет каталога — пропускаем */
    }
  }
  return dirs;
}

/**
 * Снимает одну HTML-страницу в PNG.
 * @param {{browser: any}} handle результат openBrowser()
 * @param {string} html полный HTML документа
 * @param {{outPath: string, width?: number, height?: number, deviceScaleFactor?: number, fullPage?: boolean, waitMs?: number, prepare?: (page: any) => Promise<void>}} opts
 */
export async function shootHtml(handle, html, opts) {
  const { outPath } = opts;
  const width = Number(opts.width ?? 1600);
  const height = Number(opts.height ?? 1000);
  const scale = Number(opts.deviceScaleFactor ?? 1);
  mkdirSync(dirname(outPath), { recursive: true });

  const page = await handle.browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: scale });
    await page.setContent(html, { waitUntil: "load" });
    if (opts.prepare) await opts.prepare(page);
    if (opts.waitMs) await new Promise((r) => setTimeout(r, Number(opts.waitMs)));
    await page.screenshot({ path: outPath, fullPage: opts.fullPage === true, type: "png" });
  } finally {
    await page.close();
  }
  return outPath;
}

export default { openBrowser, shootHtml, LOCAL_BROWSER_DIR };
