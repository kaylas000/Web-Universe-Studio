#!/usr/bin/env node
/* ЦЕХ · web_studio lint-typography.mjs — минимальные типографические лимиты (К-23).
   Node ≥18, 0 npm-зависимостей, exit 0/1.
   Запуск: node scripts/lint-typography.mjs projects/<имя>
   Проверяет по site/ (рекурсивно, *.css):
     — базовый кегль html/body: явный font-size ≥ 16px (если не задан — браузерный дефолт 16px);
     — интерлиньяж html/body: явный line-height ≥ 1.4 (если задан);
     — контентные теги p/li/td/th/label/button/a: явный font-size ≥ 14px;
       шапки таблиц (th) и декоративные псевдо-подписи (::before/::after) — допускаемый
       мелкий набор, порог 11px.
   Мелкие кикеры (классы .meta/.label/.top и т.п.) — допустимый дизайн: выборка идёт
   по тегам контента, а не по классам. rem/em считаются от корня 16px. */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/pcpolimer";
const dir = join(root, project);
const siteDir = join(dir, "site");

if (!existsSync(siteDir)) {
  console.error(`lint-typography: нет каталога site/ в ${project}`);
  process.exit(1);
}

const px = (v, unit) => (unit === "px" ? v : v * 16);
const REMOVE_COMMENTS = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Минимальный кегль для селектора: для html/body/base — 16px, для контентных тегов — 14px. */
function minSizeFor(selector, kind) {
  if (kind === "base") return 16;
  return 14;
}

function walk(dir, exts, out = []) {
  const list = readdirSync(dir);
  for (const item of list) {
    const p = join(dir, item);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      walk(p, exts, out);
    } else if (exts.some((e) => item.endsWith(e))) out.push(p);
  }
  return out;
}

const cssFiles = existsSync(siteDir) ? walk(siteDir, [".css"]) : [];
let violations = 0;

for (const file of cssFiles) {
  const css = REMOVE_COMMENTS(readFileSync(file, "utf8"));
  const rel = file.replace(root + "/", "");

  /* Разбор правил: селекторы { объявления } (вложенные @media обрабатываются тем же проходом). */
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const [, selectorRaw, bodyRaw] of blocks) {
    const selector = selectorRaw.trim();
    if (selector.startsWith("@") && !selector.startsWith("@media") && !selector.startsWith("@layer")) continue;
    if (!/@media|@layer/.test(selector) && selector.startsWith("@")) continue;
    const isBase = /(^|[,>\s])(html|:root|body)\b/.test(selector);
    const isContent = /\b(p|li|td|th|label|button|a)\b/.test(selector);
    if (!isBase && !isContent) continue;
    /* Шапки таблиц (th) и декоративные псевдо-подписи (::before/::after) — допускаемый мелкий набор: порог 11px. */
    const tabular = /(\bth\b)|::(?:before|after)/.test(selector);
    const minContent = tabular ? 11 : 14;

    const fs = bodyRaw.match(/font-size:\s*([\d.]+)\s*(px|rem|em)/i);
    if (isBase && fs) {
      const size = parseFloat(fs[1]);
      const valuePx = px(size, fs[2]);
      if (valuePx < minSizeFor(selector, "base")) {
        console.log(`${rel} · базовый кегль ${size}${fs[2]} = ${Math.round(valuePx)}px < 16px (${selector})`);
        violations++;
      }
    }
    if (isBase) {
      const lh = bodyRaw.match(/line-height:\s*([\d.]+)\s*(px|rem|em|%)?/i);
      if (lh) {
        const v = parseFloat(lh[1]);
        const unit = lh[2] ?? "";
        const ok = unit === "px" ? v >= 22.4 : unit === "rem" || unit === "em" ? v >= 1.4 : unit === "%" ? v >= 140 : v >= 1.4;
        if (!ok) {
          console.log(`${rel} · интерлиньяж ${lh[1]}${unit} < 1.4 (${selector})`);
          violations++;
        }
      }
    }
    if (isContent && fs) {
      const size = parseFloat(fs[1]);
      const valuePx = px(size, fs[2]);
      if (valuePx < minContent) {
        console.log(`${rel} · контентный кегль ${size}${fs[2]} = ${Math.round(valuePx)}px < ${minContent}px (${selector})`);
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.log(`\n[lint-typography] Нарушений минимумов: ${violations}`);
  process.exit(1);
} else {
  console.log(`[lint-typography] Типографика в норме (${cssFiles.length} css-файлов)`);
  process.exit(0);
}