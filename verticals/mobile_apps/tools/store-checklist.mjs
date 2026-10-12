#!/usr/bin/env node
/* tools/store-checklist.mjs — реальная утилита студии «Студия мобильных приложений».
   Проверка «готовности к сторам» (К-20, V-20, §9.7 ТЗ): набор файлов стора в проекте.

     • assets/icon-1024.png       — валидный PNG ровно 1024×1024;
     • screenshots/6.5in.png      — PNG 1290×2796 (6.5" iPhone);
     • screenshots/5.5in.png      — PNG 1242×2208 (5.5" iPhone);
     • screenshots/manifest.json  — объявляет те же файлы с размерами;
     • store.json                 — icon/screenshots/description (описание ≥ 50 знаков).

   Читает бинарные заголовки PNG (magic + IHDR), а не просто существование файла.
   Печатает строки «OK/FAIL …» и «ИТОГ: N/N · exit 0» — контракт §15 ТЗ.

   Использование: node tools/store-checklist.mjs projects/<имя>   (cwd — каталог студии)
*/

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT = resolve(process.cwd(), String(process.argv[2] ?? "projects/notes-app"));
const rel = (p) => p.replace(`${resolve(process.cwd())}/`, "");

/** Читает ширину/высоту PNG из бинарных байт; null, если файл не PNG. */
export function pngSize(file) {
  try {
    const buf = readFileSync(file);
    const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buf.length < 24 || !magic.every((b, i) => buf[i] === b)) return null;
    if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch {
    return null;
  }
}

/** @returns {Array<{ code: string, title: string, test: () => { ok: boolean, detail: string } }>} */
function buildChecks(projectDir) {
  const at = (p) => resolve(projectDir, p);
  const expectPng = (file, width, height) => {
    const info = pngSize(at(file));
    if (!info) return { ok: false, detail: `нет валидного PNG: ${file}` };
    const match = info.width === width && info.height === height;
    return { ok: match, detail: `${file} ${info.width}×${info.height}${match ? "" : ` (ожидается ${width}×${height})`}` };
  };
  const readJson = (p) => {
    try {
      return JSON.parse(readFileSync(at(p), "utf8"));
    } catch {
      return null;
    }
  };

  return [
    { code: "C-20.1", title: "Иконка 1024×1024 (apps/assets/icon-1024.png)", test: () => expectPng("app/assets/icon-1024.png", 1024, 1024) },
    { code: "C-20.2", title: "Скриншот 6.5\" (1290×2796)", test: () => expectPng("app/screenshots/6.5in.png", 1290, 2796) },
    { code: "C-20.3", title: "Скриншот 5.5\" (1242×2208)", test: () => expectPng("app/screenshots/5.5in.png", 1242, 2208) },
    {
      code: "C-20.4",
      title: "Манифест скриншотов (screenshots/manifest.json)",
      test: () => {
        const manifest = readJson("app/screenshots/manifest.json");
        if (!manifest || !Array.isArray(manifest.screenshots)) return { ok: false, detail: "manifest.json без поля screenshots[]" };
        const files = manifest.screenshots.map((s) => s.file ?? "").sort();
        const expected = ["screenshots/5.5in.png", "screenshots/6.5in.png"];
        const ok = JSON.stringify(files) === JSON.stringify(expected);
        return { ok, detail: ok ? "объявлены 6.5in и 5.5in" : `ожидались ${expected.join(", ")}; есть ${files.join(", ") || "—"}` };
      },
    },
    {
      code: "C-20.5",
      title: "store.json: описание и ссылки на ассеты",
      test: () => {
        const store = readJson("app/store.json");
        if (!store || typeof store !== "object") return { ok: false, detail: "нет валидного store.json" };
        const issues = [];
        if (!store.icon) issues.push("icon");
        if (!Array.isArray(store.screenshots) || store.screenshots.length < 2) issues.push("screenshots");
        if (typeof store.description !== "string" || store.description.length < 50) issues.push("description (≥50 знаков)");
        const ok = issues.length === 0;
        return { ok, detail: ok ? "icon/screenshots/description на месте" : `нет/короткие поля: ${issues.join(", ")}` };
      },
    },
  ];
}

const checks = buildChecks(PROJECT);
const rows = checks.map((c) => {
  const res = c.test();
  return { ...c, ...res };
});
let passed = 0;
for (const row of rows) {
  const ok = row.ok;
  if (ok) passed += 1;
  process.stdout.write(`${ok ? "OK  " : "FAIL"} ${row.code} ${row.title} · ${row.detail}\n`);
}
process.stdout.write("─".repeat(56) + "\n");
process.stdout.write(`ИТОГ: ${passed}/${rows.length} · exit ${passed === rows.length ? 0 : 1}\n`);
process.exitCode = passed === rows.length ? 0 : 1;