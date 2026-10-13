/* Крючок после исполнения: принимает только экран, где пять прокси-эвристик
   V-23 выполнены (К-23). Проверяет артефакт статически — без сети и рендера. */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const matches = (text, re) => typeof text === "string" && re.test(text);

export default async function postExecute(ctx = {}) {
  const appDir = ctx.artifact_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app");
  const violations = [];
  let src = "";
  let ru = "";
  try { src = readFileSync(join(appDir, "src", "App.mjs"), "utf8"); } catch { violations.push("app/src/App.mjs недоступен"); }
  try { ru = readFileSync(join(appDir, "locales", "ru.json"), "utf8"); } catch { violations.push("app/locales/ru.json недоступен"); }

  if (src && !matches(src, /NetInfo|status:/)) violations.push("H1 системный статус: нет NetInfo/status (V-23)");
  if (src && !matches(src, /createNativeStackNavigator|go_router|NavigationStack/)) violations.push("H3 свобода выхода: нет нативного стека навигации (V-23)");
  if (src && !matches(src, /attempts|retry/)) violations.push("H5 предотвращение ошибок: нет retry/attempts (V-23)");
  if (src && !matches(src, /accessibilityLabel|semanticLabel|aria-label/)) violations.push("H6 распознавание: нет accessibilityLabel/semanticLabel (V-23)");
  if (src && !matches(src, /i18n\.t\("help"\)/)) violations.push('H10 справка: нет кнопки с i18n.t("help") (V-23)');
  if (ru && !matches(ru, /"help"/)) violations.push("H10 справка: нет ключа help в locales/ru.json (V-23)");

  return { ...ctx, done: true, heuristics_violations: violations, heuristics_ok: violations.length === 0 };
}