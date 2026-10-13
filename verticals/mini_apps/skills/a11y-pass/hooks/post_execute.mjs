/* Крючок после исполнения: принимает только «зелёный» скан. Проверяет, что в
   артефакте нет :hover без :active (B-01), есть min-height ≥ 44px (V-11 прокси)
   и все пары текст/фон в app/theme.json проходят WCAG AA ≥ 4.5:1 (V-21). */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const hexToRgb = (value) => {
  if (typeof value !== "string") return null;
  let c = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(c)) c = c.split("").map((x) => x + x).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
  const n = parseInt(c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const luminance = ([r, g, b]) => {
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

const ratio = (a, b) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

export default async function postExecute(ctx = {}) {
  const appDir = ctx.artifact_dir ?? join(ctx.projectDir ?? "", ctx.deliverable ?? "app");
  const violations = [];
  try {
    const css = readFileSync(join(appDir, "style.css"), "utf8");
    css.split("\n").forEach((line, i) => {
      if (/:hover(?!.*:active)/.test(line)) violations.push(`style.css:${i + 1} B-01`);
    });
    if (!/min-height:\s*(4[4-9]|[5-9][0-9]|[1-9][0-9]{2,})px/.test(css)) violations.push("style.css V-11 (нет тач-таргета ≥ 44px)");
  } catch {
    violations.push("style.css недоступен");
  }
  try {
    const theme = JSON.parse(readFileSync(join(appDir, "theme.json"), "utf8"));
    const themes = Object.values(theme.themes ?? {});
    const pairs = theme.contrast ?? theme.pairs ?? [];
    for (const t of themes) {
      for (const p of pairs) {
        const fg = hexToRgb(t[p.fg]);
        const bg = hexToRgb(t[p.bg]);
        if (fg === null || bg === null) {
          violations.push(`theme.json V-21 (не hex: ${p.fg}/${p.bg})`);
          continue;
        }
        const r = ratio(fg, bg);
        if (r < Number(p.min ?? 4.5)) violations.push(`theme.json V-21 (${p.fg}/${p.bg} = ${r.toFixed(2)}:1 < 4.5:1)`);
      }
    }
  } catch {
    violations.push("theme.json недоступен (V-21)");
  }
  return { ...ctx, done: true, a11y_violations: violations, a11y_ok: violations.length === 0 };
}
