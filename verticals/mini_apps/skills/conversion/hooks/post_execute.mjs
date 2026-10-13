/* Крючок после исполнения: принимает только экран с одной конверсионной целью
   (V-23, К-23). Проверяет статически — без сети и рендера. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default async function postExecute(ctx = {}) {
  const appDir = ctx.artifact_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app");
  const violations = [];
  const read = (rel) => {
    try { return readFileSync(join(appDir, rel), "utf8"); } catch { violations.push(`нет ${rel}`); return ""; }
  };

  const js = read("app.js");
  const html = read("index.html");
  const calls = [...js.matchAll(/MainButton\.setText\(/g)];
  const duplicate = /MainButton\.setText\([^)]*\)[\s\S]{0,300}MainButton\.setText/.test(js);

  if (calls.length === 0) violations.push("нет первичной цели: MainButton.setText не вызывается (V-23)");
  if (calls.length > 1 || (calls.length > 0 && duplicate)) violations.push(`дубль цели: MainButton.setText ${calls.length} раз(а) в окне 300 символов (V-23)`);
  if (!/\b\d{1,4}\b/.test(html)) violations.push("нет конкретики: на экране нет числа (V-23)");

  return { ...ctx, done: true, conversion_violations: violations, conversion_ok: violations.length === 0 };
}