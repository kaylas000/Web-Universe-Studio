/* Крючок после исполнения: принимает только экран с анимациями на нативном
   драйвере (V-25, К-25). Проверяет статически — без сети и рендера. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default async function postExecute(ctx = {}) {
  const appDir = ctx.artifact_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app");
  const violations = [];
  let src = "";
  try { src = readFileSync(join(appDir, "src", "App.mjs"), "utf8"); } catch { violations.push("app/src/App.mjs недоступен"); }

  if (!/Animated\.(timing|spring|parallel|sequence|event)\(/.test(src)) violations.push("нет декларации анимации Animated.* (V-25)");
  if (!/useNativeDriver:\s*true/.test(src)) violations.push("анимация без нативного драйвера useNativeDriver: true (V-25)");
  if (!/requestAnimationFrame|Easing\./.test(src)) violations.push("нет кадровой модели rAF/Easing (V-25)");
  if (/setTimeout\([\s\S]{0,120}?[5-9]\d\d\)|setTimeout\([\s\S]{0,120}?\d{4,}\)/.test(src)) violations.push("блокирующий setTimeout ≥ 500 мс на главном потоке (V-25)");

  return { ...ctx, done: true, animation_violations: violations, animation_ok: violations.length === 0 };
}