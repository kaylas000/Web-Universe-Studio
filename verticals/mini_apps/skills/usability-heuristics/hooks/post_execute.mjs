/* Крючок после исполнения: принимает только экран, где пять прокси-эвристик
   V-22 выполнены (К-22). Проверяет артефакт статически — без сети и рендера. */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const matches = (text, re) => typeof text === "string" && re.test(text);

export default async function postExecute(ctx = {}) {
  const appDir = ctx.artifact_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app");
  const violations = [];
  let html = "";
  let js = "";
  try { html = readFileSync(join(appDir, "index.html"), "utf8"); } catch { violations.push("index.html недоступен"); }
  try { js = readFileSync(join(appDir, "app.js"), "utf8"); } catch { violations.push("app.js недоступен"); }

  if (html && !matches(html, /role="status"|aria-live/)) violations.push('H1 системный статус: нет role="status"/aria-live (V-22)');
  if (js && !matches(js, /BackButton/)) violations.push("H3 свобода выхода: нет BackButton (V-22)");
  if (html && !matches(html, /<label|<button[^>]*>[^<]+<\/button>/)) violations.push("H6 распознавание: нет подписей <label>/текстовых кнопок (V-22)");
  if (js && !matches(js, /HapticFeedback/)) violations.push("H7 отклик: нет HapticFeedback (V-22)");
  if (js && !matches(js, /openDocs|openHelp|openLink/)) violations.push("H10 справка: нет входа в справку (openDocs/openHelp/openLink) (V-22)");

  return { ...ctx, done: true, heuristics_violations: violations, heuristics_ok: violations.length === 0 };
}
