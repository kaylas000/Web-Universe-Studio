#!/usr/bin/env node
/* ЦЕХ · web_studio lint-form.mjs — формы и состояния динамики (К-26).
   Node ≥18, 0 npm-зависимостей, exit 0/1.
   Запуск: node scripts/lint-form.mjs projects/<имя>
   Проверяет по site/ (рекурсивно) каждую <form> (и страницы с формами):
     1. точка JS-подключения: у формы есть id="…" или data-form;
     2. отправляемость: у каждого <input|select|textarea> есть name="…";
     3. конверсия (К-16): кнопка type="submit" с data-analytics-event;
     4. статус (H1 / C-COMMON-01): на странице с формой есть role="status"/
        aria-live + маркер состояний data-state/data-form-state (Error/Loading/
        Success — SK-07; статус может жить в панели вывода рядом с формой);
     5. обработка без перезагрузки: в site/*.js есть preventDefault()
        и слушатель submit.
   Если форм на сайте нет — правило вакантно (exit 0). */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const project = process.argv[2] ?? "projects/pcpolimer";
const dir = join(root, project);
const siteDir = join(dir, "site");

if (!existsSync(siteDir)) {
  console.error(`lint-form: нет каталога site/ в ${project}`);
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
const jsFiles = walk(siteDir, [".js"]);
const violations = [];
const rel = (p) => p.replace(root + "/", "");
let formsTotal = 0;

/* Условие 5 — обработчик отправки в JS (один на сайт). */
const anyJs = jsFiles.map((f) => readFileSync(f, "utf8")).join("\n");
const hasSubmitHandler = /addEventListener\s*\(\s*["']submit["']/.test(anyJs) && /preventDefault\(\)/.test(anyJs);

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const forms = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/gi)];
  if (forms.length === 0) continue;

  /* Условие 4 — статус и состояния динамики на странице с формой. */
  if (!/role="status"|aria-live/.test(html) || !/data-state|data-form-state/.test(html)) {
    violations.push(`${rel(file)} · нет role="status"/aria-live + data-state (H1/состояния) на странице с формой`);
  }

  for (const m of forms) {
    const form = m[0];
    const inner = m[1];
    formsTotal++;

    if (!/\bid=["'][^"']+["']/.test(form) && !/\bdata-form\b/.test(form)) {
      violations.push(`${rel(file)} · форма №${formsTotal}: нет id="…"/data-form (точка JS-подключения)`);
    }

    const controls = [...inner.matchAll(/<(\binput|\bselect|\btextarea)\b[^>]*>/gi)].map((x) => x[0]);
    const bad = controls.filter((c) => !/\bname=["'][^"']+["']/.test(c));
    if (bad.length > 0) {
      violations.push(`${rel(file)} · форма №${formsTotal}: ${bad.length} поле(й) без name="…" (не отправить)`);
    }

    if (!/type=["']submit["']/.test(form) || !/data-analytics-event/.test(form)) {
      violations.push(`${rel(file)} · форма №${formsTotal}: нет кнопки type="submit" с data-analytics-event (К-16)`);
    }
  }
}

if (formsTotal > 0 && !hasSubmitHandler) {
  violations.push(`нет обработчика submit в site/*.js (preventDefault + addEventListener("submit"))`);
}

if (violations.length > 0) {
  console.log(violations.join("\n"));
  console.log(`\n[lint-form] Нарушений форм/состояний: ${violations.length}`);
  process.exit(1);
}

console.log(
  formsTotal > 0
    ? `[lint-form] Формы и состояния динамики в норме: ${formsTotal} форм, обработчик submit в JS есть (${jsFiles.length} js)`
    : `[lint-form] Форм нет — правило вакантно (0 форм) · в норме`
);
process.exit(0);