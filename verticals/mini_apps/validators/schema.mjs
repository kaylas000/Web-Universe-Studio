/* validators/schema.mjs — проверка структуры артефакта студии «Студия мини-приложений».
   Гарантирует скелет проекта: маркер цикла (loop.config.yaml или DIRECTION.md),
   каталог артефакта app/, обязательные файлы приёмки (index.html, app.js, style.css,
   sw.js, server.mjs) и машиночитаемые отчёты приёмки (bundle-size.json, lighthouse.json,
   devices-report.json — прокси V-04/V-08/V-17). */

import { existsSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_APP = ["index.html", "app.js", "style.css", "sw.js", "server.mjs"];
const REQUIRED_REPORTS = ["bundle-size.json", "lighthouse.json", "devices-report.json"];

/** @param {string} projectDir @returns {string[]} список пропущенных элементов структуры */
export function missing(projectDir) {
  const absent = [];
  if (!existsSync(join(projectDir, "loop.config.yaml")) && !existsSync(join(projectDir, "DIRECTION.md"))) absent.push("loop.config.yaml | DIRECTION.md");
  const appDir = join(projectDir, "app");
  if (!existsSync(appDir)) return [...absent, "app/"];
  for (const file of REQUIRED_APP) if (!existsSync(join(appDir, file))) absent.push(`app/${file}`);
  for (const report of REQUIRED_REPORTS) if (!existsSync(join(appDir, report))) absent.push(`app/${report}`);
  if (!existsSync(join(projectDir, "README.md"))) absent.push("README.md");
  return absent;
}

/** @param {string} projectDir @returns {{ ok: boolean, missing: string[] }} */
export function check(projectDir) {
  const list = missing(projectDir);
  return { ok: list.length === 0, missing: list };
}

export default { missing, check };