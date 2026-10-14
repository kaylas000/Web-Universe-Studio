/* ЦЕХ · Метаплатформа — scripts/shots/card.mjs
   Карточка референса без браузера: палитра, wireframe архетипа и служебные подписи.
   Нужна, когда headless Chromium недоступен (CI, офлайн): архив всё равно получает
   визуальную карточку рядом с meta.yaml, а не строку «screenshot: pending».

   Содержимое карточки — не украшение: палитра берётся из meta.yaml, wireframe кодирует
   архетип (плотность, сетку, типографику) того же референса, что и HTML-образец.
*/

import { writeFileSync } from "node:fs";

import { luminance, mix } from "./kit.mjs";
import { Canvas, rgbOf } from "./png.mjs";

/** Семейство wireframe по имени архетипа (где живёт референс в композиции). */
const FAMILY = [
  [/index|ledger|heuristics|form|passport/, "rows"],
  [/catalog|concept|components|specimen/, "grid"],
  [/poster|minimal|premium/, "poster"],
  [/^tma-|^mob-/, "phone"],
  [/.*/, "hero"],
];

function familyOf(archetype) {
  return FAMILY.find(([re]) => re.test(String(archetype)))?.[1] ?? "hero";
}

function wireframe(canvas, archetype, x, y, w, h, colors) {
  const { ink, accent, bg } = colors;
  const pad = Math.round(w * 0.035);
  const family = familyOf(archetype);
  canvas.stroke(x, y, w, h, ink, 0.24);

  if (family === "rows") {
    const rows = 7;
    const rowH = Math.floor((h - pad * 2) / rows);
    for (let i = 0; i < rows; i += 1) {
      const ry = y + pad + i * rowH;
      canvas.rect(x + pad, ry + rowH - 2, w - pad * 2, 1, ink, 0.16);
      canvas.rect(x + pad, ry + Math.round(rowH * 0.28), Math.round(w * 0.06), Math.round(rowH * 0.34), accent, i === 2 ? 1 : 0.5);
      canvas.rect(x + pad + Math.round(w * 0.1), ry + Math.round(rowH * 0.3), Math.round(w * (0.34 + (i % 3) * 0.06)), Math.round(rowH * 0.3), ink, 0.62);
      canvas.rect(x + w - pad - Math.round(w * 0.16), ry + Math.round(rowH * 0.34), Math.round(w * 0.16), Math.round(rowH * 0.22), ink, 0.22);
    }
    return;
  }

  if (family === "grid") {
    const cols = 4;
    const rows = 2;
    const gap = Math.round(pad * 0.6);
    const cw = Math.floor((w - pad * 2 - gap * (cols - 1)) / cols);
    const ch = Math.floor((h - pad * 2 - gap * (rows - 1)) / rows);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cx = x + pad + c * (cw + gap);
        const cy = y + pad + r * (ch + gap);
        canvas.rect(cx, cy, cw, Math.round(ch * 0.6), c === 1 && r === 0 ? accent : ink, c === 1 && r === 0 ? 1 : 0.12);
        canvas.rect(cx, cy + Math.round(ch * 0.68), Math.round(cw * 0.7), Math.round(ch * 0.12), ink, 0.5);
        canvas.rect(cx, cy + Math.round(ch * 0.86), Math.round(cw * 0.4), Math.round(ch * 0.1), ink, 0.24);
      }
    }
    return;
  }

  if (family === "poster") {
    const bigH = Math.round(h * 0.16);
    canvas.rect(x + pad, y + Math.round(h * 0.2), Math.round(w * 0.74), bigH, ink, 0.85);
    canvas.rect(x + pad, y + Math.round(h * 0.2) + bigH + Math.round(h * 0.04), Math.round(w * 0.56), bigH, accent, 1);
    canvas.rect(x + pad, y + Math.round(h * 0.66), Math.round(w * 0.42), Math.round(h * 0.03), ink, 0.4);
    canvas.rect(x + pad, y + Math.round(h * 0.74), Math.round(w * 0.32), Math.round(h * 0.03), ink, 0.24);
    canvas.rect(x + w - pad - Math.round(w * 0.2), y + Math.round(h * 0.66), Math.round(w * 0.2), Math.round(h * 0.11), ink, 0.12);
    return;
  }

  if (family === "phone") {
    const phoneW = Math.round(w * 0.34);
    const phoneH = Math.round(h * 0.82);
    const px = x + Math.round((w - phoneW) / 2);
    const py = y + Math.round((h - phoneH) / 2);
    canvas.rect(px, py, phoneW, phoneH, ink, 0.07);
    canvas.stroke(px, py, phoneW, phoneH, ink, 0.5);
    canvas.rect(px, py, phoneW, Math.round(phoneH * 0.08), ink, 0.24);
    canvas.rect(px + Math.round(phoneW * 0.08), py + Math.round(phoneH * 0.14), Math.round(phoneW * 0.84), Math.round(phoneH * 0.16), accent, 0.9);
    for (let i = 0; i < 4; i += 1) {
      canvas.rect(px + Math.round(phoneW * 0.08), py + Math.round(phoneH * (0.36 + i * 0.1)), Math.round(phoneW * (0.84 - (i % 2) * 0.2)), Math.round(phoneH * 0.05), ink, 0.18);
    }
    canvas.rect(px + Math.round(phoneW * 0.08), py + Math.round(phoneH * 0.86), Math.round(phoneW * 0.84), Math.round(phoneH * 0.07), ink, 0.75);
    return;
  }

  // hero: крупный блок + полоса метрик + нижние карточки
  canvas.rect(x + pad, y + Math.round(h * 0.12), Math.round(w * 0.62), Math.round(h * 0.11), ink, 0.8);
  canvas.rect(x + pad, y + Math.round(h * 0.28), Math.round(w * 0.44), Math.round(h * 0.07), ink, 0.3);
  canvas.rect(x + w - pad - Math.round(w * 0.3), y + Math.round(h * 0.12), Math.round(w * 0.3), Math.round(h * 0.26), accent, 0.85);
  const gap = Math.round(pad * 0.5);
  const cw = Math.floor((w - pad * 2 - gap * 3) / 4);
  for (let i = 0; i < 4; i += 1) {
    canvas.rect(x + pad + i * (cw + gap), y + Math.round(h * 0.62), cw, Math.round(h * 0.26), ink, 0.12);
    canvas.rect(x + pad + i * (cw + gap), y + Math.round(h * 0.72), Math.round(cw * 0.6), Math.round(h * 0.04), ink, 0.45);
  }
  return;
}

/**
 * Рисует карточку референса (PNG-буфер).
 * @param {{id: string, style: string[], palette: string[], archetype: string, takeaway: string, source: string}} ref
 * @param {{width?: number, height?: number}} [opts]
 */
export function renderCard(ref, opts = {}) {
  const width = Number(opts.width ?? 1600);
  const height = Number(opts.height ?? 1000);
  const palette = (ref.palette ?? []).filter((c) => /^#?[0-9a-f]{6}$/i.test(String(c))).map((c) => (c.startsWith("#") ? c : `#${c}`));
  const sorted = [...palette].sort((a, b) => luminance(b) - luminance(a));
  const bg = sorted[0] ?? "#f4f2ed";
  const ink = sorted[sorted.length - 1] ?? "#111111";
  const accent = palette.find((c) => c !== bg && c !== ink) ?? mix(ink, bg, 0.4);
  const colors = { bg, ink, accent };

  const canvas = new Canvas(width, height, bg);
  const pad = Math.round(width * 0.035);
  const scale = Math.max(2, Math.round(width / 460));

  // шапка: id референса и стили
  canvas.rect(0, 0, width, Math.round(height * 0.11), ink, 1);
  canvas.text(ref.id, pad, Math.round(height * 0.032), { scale, color: bg });
  canvas.text((ref.style ?? []).join(" · "), pad + canvas.textWidth(ref.id, scale) + pad, Math.round(height * 0.032), {
    scale: Math.max(2, scale - 1),
    color: accent,
  });
  canvas.text("ЦЕХ", width - pad - 3 * (5 + 1) * scale, Math.round(height * 0.032), { scale, color: mix(ink, bg, 0.35) });

  // wireframe архетипа
  const frameX = pad;
  const frameY = Math.round(height * 0.15);
  const frameW = Math.round(width * 0.56);
  const frameH = Math.round(height * 0.6);
  wireframe(canvas, ref.archetype, frameX, frameY, frameW, frameH, colors);

  // палитра
  const swX = frameX + frameW + pad;
  const swW = width - swX - pad;
  const swH = Math.floor((frameH - pad * (palette.length - 1)) / Math.max(1, palette.length));
  palette.forEach((color, i) => {
    const y = frameY + i * (swH + pad);
    canvas.rect(swX, y, swW, swH, color, 1);
    canvas.stroke(swX, y, swW, swH, ink, 0.25);
    const onDark = luminance(color) < 0.45;
    canvas.text(color.toUpperCase(), swX + pad / 2, y + Math.round(swH / 2) - scale * 3, {
      scale: Math.max(2, Math.round(scale * 0.8)),
      color: onDark ? "#ffffff" : "#000000",
    });
  });

  // подвал: источник и служебная строка
  const footY = frameY + frameH + pad;
  canvas.rect(pad, footY, width - pad * 2, 1, ink, 0.25);
  const small = Math.max(2, Math.round(scale * 0.75));
  canvas.text(`АРХЕТИП: ${ref.archetype}`, pad, footY + pad, { scale: small, color: mix(ink, bg, 0.35) });
  canvas.text("СНИМОК БЕЗ БРАУЗЕРА · КАРТОЧКА РЕФЕРЕНСА", pad, footY + pad + small * 9, { scale: small, color: mix(ink, bg, 0.35) });
  const source = String(ref.source ?? "").replace(/^https?:\/\//, "").slice(0, 40);
  canvas.text(source, width - pad - canvas.textWidth(source, small), footY + pad, { scale: small, color: mix(ink, bg, 0.45) });

  return canvas.toPng();
}

/** Пишет карточку референса в файл. */
export function writeCard(ref, outPath, opts = {}) {
  const buf = renderCard(ref, opts);
  writeFileSync(outPath, buf);
  return { outPath, bytes: buf.length, rgb: rgbOf("#000000") && undefined };
}

export default { renderCard, writeCard };
