/* Крючок после исполнения: принимает только «зелёный» скан. Проверяет, что в
   артефакте нет :hover без :active (B-01) и есть min-height ≥ 44px (V-11 прокси). */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export default async function postExecute(ctx = {}) {
  const cssPath = ctx.artifact_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app", "style.css");
  let violations = [];
  try {
    const css = readFileSync(cssPath, "utf8");
    const lines = css.split("\n");
    lines.forEach((line, i) => {
      if (/:hover(?!.*:active)/.test(line)) violations.push(`style.css:${i + 1} B-01`);
    });
    if (!/min-height:\s*(4[4-9]|[5-9][0-9]|[1-9][0-9]{2,})px/.test(css)) violations.push("style.css V-11 (нет тач-таргета ≥ 44px)");
  } catch {
    violations.push("style.css недоступен");
  }
  return { ...ctx, done: true, a11y_violations: violations, a11y_ok: violations.length === 0 };
}