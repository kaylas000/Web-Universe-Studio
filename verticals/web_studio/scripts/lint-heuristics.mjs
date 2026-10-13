#!/usr/bin/env node
/* ЦЕХ · web_studio lint-heuristics.mjs — эвристики юзабилити NN/g (К-25).
   Node ≥18, 0 npm-зависимостей, exit 0/1.
   Запуск: node scripts/lint-heuristics.mjs projects/<имя>
   Проверяет по site/ (рекурсивно) детерминированное ядро эвристик Нильсена:
     H2  — <html lang="…"> (язык пользователя, соответствие реальному миру);
     H3  — якорная навигация href="#…" (переход внутри страницы);
     H4  — единая дизайн-система: :root + CSS-переменные --*;
     H6  — распознавание: нет пустых <a></a>, у каждого <img> есть alt;
     H10 — помощь: канал связи tel:/mailto:/форма на index.html.
   Карта всех 10 эвристик — HEURISTICS.md. Прокси: статический скан HTML/CSS;
   реальное взаимодействие проверяет артдиректор на G4. */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/pcpolimer";
const dir = join(root, project);
const siteDir = join(dir, "site");

if (!existsSync(siteDir)) {
  console.error(`lint-heuristics: нет каталога site/ в ${project}`);
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
const rel = (p) => p.replace(root + "/", "");

const indexHtml = htmlFiles.find((p) => p.endsWith("/index.html"));

if (!indexHtml) {
  violations.push("нет site/index.html — нечего проверять");
} else {
  const idx = readFileSync(indexHtml, "utf8");
  /* H2 — язык страницы (NN/g: соответствие системы реальному миру). */
  if (!/<html[^>]*\blang=["'][a-zA-Z-]+["']/.test(idx)) {
    violations.push(`${rel(indexHtml)} · H2: нет атрибута lang у <html>`);
  }
  /* H3 — свобода и контроль: якорная навигация внутри страницы. */
  if (!/href="#/.test(idx)) {
    violations.push(`${rel(indexHtml)} · H3: нет якорной навигации href="#…"`);
  }
  /* H10 — справка и помощь: канал связи (tel:/mailto:/форма). */
  if (!/tel:|mailto:|<form/.test(idx)) {
    violations.push(`${rel(indexHtml)} · H10: нет канала связи (tel:/mailto:/форма)`);
  }
}

/* H6 — распознавание вместо припоминания: подписи ссылок и alt у изображений. */
let emptyAnchors = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  emptyAnchors += [...html.matchAll(/<a\b[^>]*>\s*<\/a>/gi)].length;
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/alt=["'][^"']+["']/.test(tag)) {
      violations.push(`${rel(file)} · H6: <img> без текста alt`);
    }
  }
}
if (emptyAnchors > 0) {
  violations.push(`H6: ${emptyAnchors} пустых ссылок <a></a> (нет подписи)`);
}

/* H4 — консистентность и стандарты: единая дизайн-система (:root + --*). */
let hasDesignSystem = false;
for (const file of cssFiles) {
  const css = readFileSync(file, "utf8");
  if (/:root\s*\{/.test(css) && /--[a-zA-Z-]+\s*:/.test(css)) {
    hasDesignSystem = true;
    break;
  }
}
if (!hasDesignSystem) {
  violations.push(`H4: нет единой дизайн-системы (:root + CSS-переменные --*) в site/`);
}

if (violations.length > 0) {
  console.log(violations.join("\n"));
  console.log(`\n[lint-heuristics] Нарушений эвристик NN/g: ${violations.length}`);
  process.exit(1);
} else {
  console.log(`[lint-heuristics] Эвристики NN/g в норме (${htmlFiles.length} html, ${cssFiles.length} css)`);
  process.exit(0);
}