/* ЦЕХ · Метаплатформа — scripts/shots/kit.mjs
   Общие кирпичи для образцов дизайна архива референсов: палитра из meta.yaml,
   оболочка страницы, шрифтовые стеки, мелкие утилиты разметки.

   Зачем образец: у каждого референса в meta.yaml есть палитра, приёмы и takeaway.
   Образец превращает их в живую страницу, которую студия может открыть в браузере
   и снять в PNG — так архив становится визуальным, а не текстовым.
*/

/** @param {unknown} value */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Относительная яркость #RRGGBB (WCAG). */
export function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return 0.5;
  const int = parseInt(m[1], 16);
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = channel((int >> 16) & 255);
  const g = channel((int >> 8) & 255);
  const b = channel(int & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Раскладывает палитру референса на роли: фон / чернила / акцент / приглушённый.
 * Тёмные архетипы (dark, brutalist-night, canvas) берут фоном самый тёмный цвет.
 * @param {string[]} palette
 * @param {{dark?: boolean}} [opts]
 */
export function roles(palette, opts = {}) {
  const list = (Array.isArray(palette) ? palette : []).filter((c) => /^#?[0-9a-fA-F]{6}$/.test(String(c)));
  const hex = list.map((c) => (String(c).startsWith("#") ? String(c) : `#${c}`));
  const byLight = [...hex].sort((a, b) => luminance(b) - luminance(a));
  const lights = byLight.filter((c) => luminance(c) > 0.35);
  const darks = byLight.filter((c) => luminance(c) <= 0.35);
  const light = lights[0] ?? "#FFFFFF";
  const deep = darks[0] ?? "#111111";
  const bg = opts.dark ? (darks[0] ?? "#0E1116") : light;
  const ink = opts.dark ? light : deep;
  const accent = hex.find((c) => c !== bg && c !== ink) ?? (opts.dark ? lights[1] : darks[1]) ?? ink;
  // deep/light — абсолютные полюса палитры: тёмная панель остаётся тёмной в любой теме
  return { bg, ink, accent, light, deep, mid: mix(bg, ink, 0.45), faint: mix(bg, ink, 0.16), palette: hex };
}

/** Смешивает два цвета: t=0 → a, t=1 → b. */
export function mix(a, b, t) {
  const pa = parseInt(String(a).replace("#", ""), 16);
  const pb = parseInt(String(b).replace("#", ""), 16);
  const ch = (shift) => {
    const va = (pa >> shift) & 255;
    const vb = (pb >> shift) & 255;
    return Math.round(va + (vb - va) * t);
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

/** Полупрозрачный цвет из hex: rgba(...,a). */
export function alpha(hex, a) {
  const int = parseInt(String(hex).replace("#", ""), 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${a})`;
}

export const FONTS = Object.freeze({
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", "PT Serif", serif',
  mono: '"SF Mono", "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace',
  condensed: '"Arial Narrow", "Liberation Sans Narrow", "Helvetica Neue", Arial, sans-serif',
});

/**
 * Оболочка образца: заголовок, шрифты, CSS переменные ролей.
 * @param {{title: string, css: string, body: string, bg: string, ink: string, accent: string, mid: string, faint: string, lang?: string, extraHead?: string}} spec
 */
export function page(spec) {
  const { title, css, body, bg, ink, accent, mid, faint } = spec;
  const vars = `:root{--bg:${bg};--ink:${ink};--accent:${accent};--deep:${spec.deep ?? ink};--light:${spec.light ?? bg};--mid:${mid};--faint:${faint};
    --ink-87:${alpha(ink, 0.87)};--ink-60:${alpha(ink, 0.6)};--ink-38:${alpha(ink, 0.38)};--ink-12:${alpha(ink, 0.12)};--ink-06:${alpha(ink, 0.06)};}`;
  return `<!doctype html>
<html lang="${esc(spec.lang ?? "ru")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
${vars}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:${FONTS.system};-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
img,svg{display:block;max-width:100%}
${css}
</style>
${spec.extraHead ?? ""}
</head>
<body>
${body}
</body>
</html>`;
}

/** Плашка-подпись образца: идентификатор и takeaway (служебная полоса снизу). */
export function stamp(ref, takeaway, { bg, ink, accent }) {
  return `<footer class="shot-stamp" style="--stamp-bg:${ink};--stamp-ink:${bg};--stamp-accent:${accent}">
  <span class="shot-stamp__id">${esc(ref)}</span>
  <span class="shot-stamp__text">${esc(takeaway)}</span>
</footer>`;
}

export const STAMP_CSS = `
.shot-stamp{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:baseline;gap:14px;
  padding:10px 22px;background:var(--stamp-bg);color:var(--stamp-ink);font-family:${FONTS.mono};
  font-size:12px;letter-spacing:.04em;z-index:99}
.shot-stamp__id{font-weight:700;color:var(--stamp-accent);letter-spacing:.1em}
.shot-stamp__text{opacity:.82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body{padding-bottom:44px}`;

/** Повторяет строку n раз. */
export function times(n, fn) {
  return Array.from({ length: Math.max(0, Number(n) || 0) }, (_v, i) => fn(i)).join("");
}

/** Детерминированный псевдослучайный генератор (образцы должны быть воспроизводимы). */
export function seeded(seedText) {
  let h = 2166136261;
  for (const ch of String(seedText)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

export default { esc, luminance, roles, mix, alpha, page, stamp, STAMP_CSS, times, seeded, FONTS };
