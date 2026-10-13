#!/usr/bin/env node
/* ЦЕХ · web_studio lint-performance.mjs — перфоманс-бюджеты страниц (К-24).
   Node ≥18, 0 npm-зависимостей, exit 0/1.
   Запуск: node scripts/lint-performance.mjs projects/<имя>
   Проверяет по site/ (рекурсивно):
     — каждый <img> имеет width и height (CLS); изображения после первого — loading="lazy";
     — внешние шрифты: @font-face с font-display: swap, либо Google Fonts URL с display=swap;
     — запрещён document.write() (синхронный блокирующий скрипт).
   Прокси: статический скан HTML/CSS; реальные LCP/TTI меряет Lighthouse на сборке. */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/pcpolimer";
const dir = join(root, project);
const siteDir = join(dir, "site");

if (!existsSync(siteDir)) {
  console.error(`lint-performance: нет каталога site/ в ${project}`);
  process.exit(1);
}

function walk(dir, exts, out = []) {
  for (const item of readdirSync(dir)) {
    const p = join(dir, item);
    const stat = statSync(p);
    if (stat.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => item.endsWith(e))) out.push(p);
  }
  return out;
}

const htmlFiles = walk(siteDir, [".html"]);
const cssFiles = walk(siteDir, [".css"]);
const violations = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const rel = file.replace(root + "/", "");
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];

  imgs.forEach((m, idx) => {
    const tag = m[0];
    const hasWidth = /\swidth=["']?[\d.]+/.test(tag);
    const hasHeight = /\sheight=["']?[\d.]+/.test(tag);
    if (!hasWidth || !hasHeight) {
      violations.push(`${rel} · <img> без width/height (idx ${idx}) — CLS`);
    }
    if (idx > 0 && !/loading=["']lazy["']/.test(tag)) {
      violations.push(`${rel} · <img> не первого экрана без loading="lazy" (idx ${idx})`);
    }
  });

  if (/document\.write\s*\(/.test(html)) {
    violations.push(`${rel} · document.write() запрещён`);
  }
}

for (const file of cssFiles) {
  const css = readFileSync(file, "utf8");
  const rel = file.replace(root + "/", "");
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/gi)];
  for (const face of faces) {
    if (!/font-display:\s*swap/.test(face[1])) {
      violations.push(`${rel} · @font-face без font-display: swap`);
    }
  }
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const rel = file.replace(root + "/", "");
  for (const link of html.matchAll(/<link[^>]+href=["']([^"']*fonts(?:\.[^"']*)?\.googleapis\.com\/css2[^"']*)["'][^>]*>/gi)) {
    if (!/display=swap/i.test(link[1])) {
      violations.push(`${rel} · Google Fonts без display=swap`);
    }
  }
}

if (violations.length > 0) {
  console.log(violations.join("\n"));
  console.log(`\n[lint-performance] Нарушений бюджетов: ${violations.length}`);
  process.exit(1);
} else {
  console.log(`[lint-performance] Бюджеты в норме (${htmlFiles.length} html, ${cssFiles.length} css)`);
  process.exit(0);
}