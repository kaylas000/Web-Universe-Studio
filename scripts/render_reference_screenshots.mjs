#!/usr/bin/env node
/* ЦЕХ · Метаплатформа — scripts/render_reference_screenshots.mjs
   Снимки дизайнов из архива референсов (К-04, К-11, §12 ТЗ).

   Что делает для каждой студии:
     1. читает meta.yaml всех референсов (палитра, стили, приёмы, takeaway);
     2. собирает по ним образец дизайна — самодостаточную HTML-страницу,
        которая показывает приёмы именно этого референса;
     3. снимает образец в PNG (headless Chromium) либо, если браузера нет,
        рисует карточку референса нулевыми зависимостями (node:zlib);
     4. прописывает в meta.yaml пути screenshot/specimen, обновляет INDEX.md
        и собирает витрину references/GALLERY.md + gallery.html.

   Запуск:
     node scripts/render_reference_screenshots.mjs                 # все студии
     node scripts/render_reference_screenshots.mjs web_studio       # одна студия
     node scripts/render_reference_screenshots.mjs --engine=card    # без браузера
     node scripts/render_reference_screenshots.mjs --check          # только проверка архива
     node scripts/render_reference_screenshots.mjs --no-capture     # пересобрать HTML/индекс

   Выход: 0 — у каждого референса есть снимок и образец; 1 — есть пробелы.
*/

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSimpleYaml } from "../core/loop-engine/config.mjs";
import { indexVertical } from "./index_references.mjs";
import { openBrowser, shootHtml } from "./shots/capture.mjs";
import { renderCard } from "./shots/card.mjs";
import { PLATFORM_PALETTE, STUDIO_SHOTS } from "./shots/refspecs.mjs";
import { renderAppSpecimen } from "./shots/app-specimens.mjs";
import { renderWebSpecimen } from "./shots/web-specimens.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const VERTICALS = join(ROOT, "verticals");

/* ————————————————————— чтение архива ————————————————————— */

/** Собирает пути meta.yaml студии (веб — по каталогам стилей, приложения — в metadata/). */
function metaFiles(studioDir, spec) {
  const refsDir = join(studioDir, "references");
  if (!existsSync(refsDir)) return [];
  if (spec.layout === "metadata-dir") {
    const dir = join(refsDir, "metadata");
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .sort()
      .map((f) => join(dir, f));
  }
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(refsDir).sort()) {
    const dir = join(refsDir, name);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir).sort()) {
      if (file.endsWith(".meta.yaml")) out.push(join(dir, file));
    }
  }
  return out;
}

/** @returns {Record<string, any>} */
function readMeta(file) {
  try {
    return parseSimpleYaml(readFileSync(file, "utf8")) ?? {};
  } catch {
    return {};
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return String(value)
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((v) => v.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/**
 * Собирает референсы студии: id, стили, палитра, takeaway, архетип образца.
 * @returns {Array<{id: string, metaPath: string, dir: string, style: string[], palette: string[], techniques: string[], motion: string[], takeaway: string, source: string, archetype: string, platform: string, kind: string}>}
 */
export function collectReferences(vertical, { root = ROOT } = {}) {
  const spec = STUDIO_SHOTS[vertical];
  if (!spec) throw new Error(`неизвестная студия: ${vertical}`);
  const studioDir = join(root, "verticals", vertical);
  const refs = [];
  for (const metaPath of metaFiles(studioDir, spec)) {
    const meta = readMeta(metaPath);
    const id = String(meta.id ?? basename(metaPath).replace(/\.meta\.yaml$/, "").replace(/\.yaml$/, ""));
    const design = spec.specs[id];
    if (!design) continue; // референс без архетипа не снимаем, но и не выдумываем ему вид
    const platform = design.platform ?? "tg";
    const palette = asArray(meta.palette);
    refs.push({
      id,
      metaPath,
      dir: dirname(metaPath),
      style: asArray(meta.style),
      techniques: asArray(meta.techniques),
      motion: asArray(meta.motion),
      takeaway: String(meta.takeaway ?? "").trim(),
      source: String(meta.source ?? "").trim(),
      archetype: design.archetype,
      platform,
      kind: spec.kind,
      palette: palette.length > 0 ? palette : (design.palette ?? PLATFORM_PALETTE[platform] ?? PLATFORM_PALETTE.tg),
    });
  }
  return refs;
}

/* ————————————————————— сборка образцов ————————————————————— */

/**
 * Рисует образец референса.
 * @returns {{html: string, title: string}}
 */
export function specimenFor(ref) {
  return ref.kind === "web" ? renderWebSpecimen(ref) : renderAppSpecimen(ref);
}

/** Прописывает в meta.yaml пути образца и снимка (идемпотентно). */
function updateMetaFile(ref, { specimenName, pngName }) {
  const text = readFileSync(ref.metaPath, "utf8");
  const lines = text.split("\n").filter((line) => !/^(screenshot|specimen):\s*/.test(line));
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  lines.push(`specimen: ${specimenName}`, `screenshot: ${pngName}`);
  writeFileSync(ref.metaPath, `${lines.join("\n")}\n`, "utf8");
}

/* ————————————————————— индекс и витрина ————————————————————— */

/**
 * Пересобирает RAG-индекс студии тем же прогоном, что правит meta.yaml.
 * Индекс — производный артефакт: если его обновлять руками, он «протухает» и тесты платформы
 * падают на устаревшем архиве. Поэтому обновление встроено в единственную точку записи.
 */
function refreshIndex(vertical) {
  try {
    const indexed = indexVertical(join(ROOT, "verticals", vertical));
    process.stdout.write(`[${vertical}] RAG-индекс: документов ${indexed.documents} · терминов ${indexed.terms}\n`);
  } catch (error) {
    process.stderr.write(`[${vertical}] индекс не пересобран: ${String(error?.message ?? error)}\n`);
  }
}

/** Обновляет таблицу INDEX.md студии (добавляет колонку со снимком). */
function updateIndex(vertical, refs) {
  const indexPath = join(VERTICALS, vertical, "references", "INDEX.md");
  if (!existsSync(indexPath)) return { path: indexPath, updated: false };
  const original = readFileSync(indexPath, "utf8");
  const lines = original.split("\n");

  // пересобираем только строки таблицы: первый столбец — id референса
  const byId = new Map(refs.map((r) => [r.id, r]));
  let changed = false;
  const out = lines.map((line) => {
    const m = /^\|\s*(REF-\d{2}|ref-\d{2})\s*\|/.exec(line);
    if (!m) return line;
    const ref = byId.get(m[1]);
    if (!ref) return line;
    const relPng = relative(join(VERTICALS, vertical, "references"), join(ref.dir, `${ref.id}.png`)).split("\\").join("/");
    const cells = line.split("|");
    // последняя ячейка перед закрывающим пустым элементом — снимок
    const body = cells.slice(1, -1).map((c) => c.trim());
    if (body.length > 4) {
      body[body.length - 1] = `[${ref.id}.png](${relPng})`;
    } else {
      body.push(`[${ref.id}.png](${relPng})`);
    }
    const rebuilt = `| ${body.join(" | ")} |`;
    if (rebuilt !== line) changed = true;
    return rebuilt;
  });

  // заголовок и разделитель таблицы: добавляем колонку «снимок», если её ещё нет
  const finalLines = out.map((line) => {
    if (!/^\|\s*id\s*\|/i.test(line)) return line;
    if (/\|\s*(снимок|snapshot)\s*\|/i.test(line)) return line;
    changed = true;
    return `${line.trimEnd()} Снимок |`;
  });
  const headerFix = finalLines.map((line, i) => {
    const prev = finalLines[i - 1];
    if (!prev || !/^\|\s*id\s*\|/i.test(prev)) return line;
    if (!/^\|[\s:|-]+\|$/.test(line.trim())) return line;
    const target = prev.trim().split("|").length - 2;
    const cells = ["---"];
    while (cells.length < target) cells.push("---");
    changed = true;
    return `| ${cells.join(" | ")} |`;
  });

  writeFileSync(indexPath, `${headerFix.join("\n").replace(/\n+$/, "")}\n`, "utf8");
  return { path: indexPath, updated: changed };
}

/** Витрина архива: GALLERY.md (в git) и gallery.html (для просмотра в браузере). */
function writeGallery(vertical, refs, spec) {
  const refsDir = join(VERTICALS, vertical, "references");
  const sorted = [...refs].sort((a, b) => a.id.localeCompare(b.id, "ru"));
  const relPng = (ref) => relative(refsDir, join(ref.dir, `${ref.id}.png`)).split("\\").join("/");

  const md = [
    `# GALLERY — витрина архива референсов студии «${spec.title}»`,
    "",
    "Снимки собраны командой `node scripts/render_reference_screenshots.mjs` из meta.yaml:",
    "палитра и приёмы референса → образец дизайна → PNG. Образец лежит рядом (`<id>.specimen.html`).",
    "",
    ...sorted.map((ref) =>
      [
        `## ${ref.id} · ${ref.style.join(", ") || "—"}`,
        "",
        `![${ref.id}](${relPng(ref)})`,
        "",
        `- takeaway: ${ref.takeaway || "—"}`,
        `- источник: ${ref.source || "—"}`,
        `- архетип образца: \`${ref.archetype}\``,
        `- образец: [${ref.id}.specimen.html](${relPng(ref).replace(/\.png$/, ".specimen.html")})`,
        "",
      ].join("\n"),
    ),
  ].join("\n");
  writeFileSync(join(refsDir, "GALLERY.md"), md, "utf8");

  const cards = sorted
    .map(
      (ref) => `  <figure>
    <a href="${relPng(ref)}"><img src="${relPng(ref)}" alt="${ref.id}: ${escapeHtml(ref.takeaway)}" loading="lazy"></a>
    <figcaption><b>${ref.id}</b> · ${escapeHtml(ref.style.join(", "))}<span>${escapeHtml(ref.takeaway)}</span>
      <a class="spec" href="${relPng(ref).replace(/\.png$/, ".specimen.html")}">образец ↗</a></figcaption>
  </figure>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Архив референсов · ${escapeHtml(spec.title)}</title>
<style>
:root{--bg:#f6f5f2;--ink:#141414;--line:#dcd9d2}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
header{padding:44px 6vw 18px;border-bottom:1px solid var(--line)}
h1{margin:0 0 8px;font-size:34px;letter-spacing:-.02em}
header p{margin:0;color:#5c5c5c;max-width:70ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:26px;padding:30px 6vw 60px}
figure{margin:0;background:#fff;border:1px solid var(--line);display:flex;flex-direction:column}
figure img{width:100%;height:auto;display:block;border-bottom:1px solid var(--line)}
figcaption{padding:14px 16px;font-size:13px;display:flex;flex-direction:column;gap:6px}
figcaption b{font-size:14px}
figcaption span{color:#5c5c5c;line-height:1.45}
.spec{align-self:flex-start;color:#141414;text-decoration:none;border-bottom:1px solid #141414}
.count{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#6b6b6b;padding-top:6px}
</style></head>
<body>
<header><h1>Архив референсов · ${escapeHtml(spec.title)}</h1>
<p>Каждый снимок собран из meta.yaml референса: палитра, приёмы и takeaway превращаются в образец дизайна,
который студия открывает рядом с исходником.</p>
<p class="count">референсов: ${sorted.length} · генератор: scripts/render_reference_screenshots.mjs</p></header>
<main class="grid">
${cards}
</main>
</body></html>
`;
  writeFileSync(join(refsDir, "gallery.html"), html, "utf8");
  return { gallery: join(refsDir, "GALLERY.md"), html: join(refsDir, "gallery.html"), count: sorted.length };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ————————————————————— проверка архива ————————————————————— */

/**
 * Проверяет, что у каждого референса есть образец и снимок.
 * @returns {{ok: boolean, missing: Array<{vertical: string, id: string, what: string}>}}
 */
export function verifyArchive({ root = ROOT, verticals = Object.keys(STUDIO_SHOTS) } = {}) {
  const missing = [];
  for (const vertical of verticals) {
    for (const ref of collectReferences(vertical, { root })) {
      const png = join(ref.dir, `${ref.id}.png`);
      const html = join(ref.dir, `${ref.id}.specimen.html`);
      if (!existsSync(png)) missing.push({ vertical, id: ref.id, what: "png" });
      else if (statSync(png).size < 2048) missing.push({ vertical, id: ref.id, what: "png-too-small" });
      if (!existsSync(html)) missing.push({ vertical, id: ref.id, what: "specimen" });
    }
  }
  return { ok: missing.length === 0, missing };
}

/* ————————————————————— CLI ————————————————————— */

function parseArgs(argv) {
  /** @type {Record<string, any>} */
  const opts = { _: [] };
  for (const raw of argv) {
    const arg = String(raw);
    if (!arg.startsWith("--")) {
      opts._.push(arg);
      continue;
    }
    const [key, value] = arg.replace(/^--/, "").split("=");
    opts[key.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())] = value === undefined ? true : value;
  }
  return opts;
}

function main(argv) {
  const opts = parseArgs(argv);
  const only = String(opts._[0] ?? "");
  const verticals = only ? [only] : Object.keys(STUDIO_SHOTS);
  const engine = String(opts.engine ?? "auto");
  const check = opts.check === true;
  const capture = !check && opts.noCapture !== true;

  if (only && !STUDIO_SHOTS[only]) {
    process.stderr.write(`неизвестная студия «${only}»; доступны: ${Object.keys(STUDIO_SHOTS).join(", ")}\n`);
    return 1;
  }

  if (check) {
    const res = verifyArchive({ verticals });
    if (res.ok) {
      process.stdout.write(`архив снимков полон: у каждого референса есть PNG и образец\n`);
      return 0;
    }
    process.stdout.write(`пробелы в архиве снимков (${res.missing.length}):\n`);
    for (const item of res.missing.slice(0, 40)) process.stdout.write(`  ${item.vertical}/${item.id}: нет ${item.what}\n`);
    return 1;
  }

  return runCapture({ verticals, engine, capture }).then((code) => code);
}

async function runCapture({ verticals, engine, capture }) {
  let handle = null;
  let activeEngine = "card";
  if (capture && engine !== "card") {
    try {
      handle = await openBrowser({});
    } catch (error) {
      process.stdout.write(`браузер недоступен (${String(error?.message ?? error)})\n`);
      handle = null;
    }
    if (handle) activeEngine = "browser";
    else if (engine === "browser") {
      process.stderr.write("--engine=browser: браузер не найден. Установите дорожку: node scripts/shots/install-browser.mjs\n");
      return 1;
    }
  }

  let total = 0;
  let captured = 0;
  try {
    for (const vertical of verticals) {
      const spec = STUDIO_SHOTS[vertical];
      const refs = collectReferences(vertical);
      if (refs.length === 0) {
        process.stdout.write(`[${vertical}] референсов не найдено\n`);
        continue;
      }
      for (const ref of refs) {
        const { html } = specimenFor(ref);
        const htmlPath = join(ref.dir, `${ref.id}.specimen.html`);
        writeFileSync(htmlPath, html, "utf8");

        const pngPath = join(ref.dir, `${ref.id}.png`);
        if (capture) {
          if (handle) {
            await shootHtml(handle, html, {
              outPath: pngPath,
              width: spec.viewport.width,
              height: spec.viewport.height,
              deviceScaleFactor: spec.viewport.deviceScaleFactor ?? 1,
              waitMs: 40,
            });
          } else {
            writeFileSync(pngPath, renderCard(ref, { width: spec.cardWidth, height: spec.cardHeight }));
          }
          captured += 1;
        }
        updateMetaFile(ref, { specimenName: `${ref.id}.specimen.html`, pngName: `${ref.id}.png` });
        total += 1;
      }
      const gallery = writeGallery(vertical, refs, spec);
      const index = updateIndex(vertical, refs);
      process.stdout.write(
        `[${vertical}] референсов ${refs.length} · снимков ${capture ? refs.length : 0} (${activeEngine}) · ` +
          `витрина ${relative(ROOT, gallery.gallery)}${index.updated ? " · INDEX.md обновлён" : ""}\n`,
      );
      refreshIndex(vertical);
    }
  } finally {
    if (handle) await handle.close();
  }

  const res = verifyArchive({ verticals });
  process.stdout.write(
    `ИТОГ: образцов ${total}, снимков ${captured}, движок ${capture ? activeEngine : "—"} · архив ${res.ok ? "полон" : `неполон (${res.missing.length})`}\n`,
  );
  return res.ok ? 0 : 1;
}

const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (invokedDirectly) process.exit(await main(process.argv.slice(2)));

export default { collectReferences, specimenFor, verifyArchive, main };
