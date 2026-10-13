/* Крючок после исполнения: фиксирует артефакт студии «Студия мобильных приложений»
   и принимает только «зелёный» a11y-скан: все пары текст/фон в app/theme.json
   проходят WCAG AA ≥ 4.5:1 (V-22). */

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
    const theme = JSON.parse(readFileSync(join(appDir, "theme.json"), "utf8"));
    const themes = Object.values(theme.themes ?? {});
    const pairs = theme.contrast ?? theme.pairs ?? [];
    for (const t of themes) {
      for (const p of pairs) {
        const fg = hexToRgb(t[p.fg]);
        const bg = hexToRgb(t[p.bg]);
        if (fg === null || bg === null) {
          violations.push(`theme.json V-22 (не hex: ${p.fg}/${p.bg})`);
          continue;
        }
        const r = ratio(fg, bg);
        if (r < Number(p.min ?? 4.5)) violations.push(`theme.json V-22 (${p.fg}/${p.bg} = ${r.toFixed(2)}:1 < 4.5:1)`);
      }
    }
  } catch {
    violations.push("theme.json недоступен (V-22)");
  }
  return { ...ctx, done: true, a11y_violations: violations, a11y_ok: violations.length === 0 };
}
