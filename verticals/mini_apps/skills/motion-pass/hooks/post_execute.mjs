/* Крючок после исполнения: принимает только экран с движением, уважающим
   prefers-reduced-motion (V-24, К-24). Проверяет статически — без сети и рендера. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default async function postExecute(ctx = {}) {
  const appDir = ctx.artifact_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app");
  const violations = [];
  const read = (rel) => {
    try { return readFileSync(join(appDir, rel), "utf8"); } catch { violations.push(`нет ${rel}`); return ""; }
  };

  const css = read("style.css");
  const js = read("app.js");

  if (!/@keyframes|transition|animation:/.test(css)) violations.push("нет движения в style.css (transition/@keyframes) (V-24)");
  if (!/@media\s*\(\s*prefers-reduced-motion/.test(css)) violations.push("движение не отключается для prefers-reduced-motion (V-24)");
  if (/setTimeout\([\s\S]{0,120}?[5-9]\d\d\)|setTimeout\([\s\S]{0,120}?\d{4,}\)/.test(js)) violations.push("блокирующий setTimeout ≥ 500 мс в app.js (V-24)");

  return { ...ctx, done: true, motion_violations: violations, motion_ok: violations.length === 0 };
}