/* Крючок после исполнения: принимает только разметку с явной типографикой
   (V-24, К-24). Проверяет статически — без сети и рендера. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default async function postExecute(ctx = {}) {
  const appDir = ctx.artifact_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app");
  const violations = [];
  let src = "";
  try { src = readFileSync(join(appDir, "src", "App.mjs"), "utf8"); } catch { violations.push("app/src/App.mjs недоступен"); }

  const sizes = [...src.matchAll(/fontSize=\s*\{\s*(\d+)\s*\}/g)].map((m) => Number(m[1]));
  const heights = [...src.matchAll(/lineHeight=\s*\{\s*(\d+)\s*\}/g)].map((m) => Number(m[1]));

  if (sizes.length < 2) violations.push("типографика не задана явно: минимум два fontSize (V-24)");
  if (!sizes.some((n) => n >= 16)) violations.push("нет базового кегля ≥16 (V-24)");
  if (sizes.some((n) => n < 14)) violations.push(`мелкий кегль fontSize {${Math.min(...sizes)}} <14 (V-24)`);
  if (heights.length < 2) violations.push("нет интерлиньяжа минимум на двух элементах (V-24)");
  if (heights.some((n) => n < 20)) violations.push(`удушающий lineHeight {${Math.min(...heights)}} <20 (V-24)`);

  return { ...ctx, done: true, typography_violations: violations, typography_ok: violations.length === 0 };
}