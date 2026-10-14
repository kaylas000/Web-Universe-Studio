/* ЦЕХ · Метаплатформа — scripts/shots/png.mjs
   Кодировщик PNG и минимальный растр на node:zlib — чтобы архив референсов был
   визуальным даже там, где нет браузера (CI, офлайн, чужой ноутбук).

   Ни одной зависимости: только zlib из стандартной библиотеки Node.
*/

import { deflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Кодирует RGB-буфер (w*h*3) в PNG. */
export function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // фильтр none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** #RRGGBB → [r,g,b]. */
export function rgbOf(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return [0, 0, 0];
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/* ————— 5×7 шрифт для служебных подписей (латиница и цифры) ————— */

const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "00110", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "·": ["00000", "00000", "00000", "00100", "00000", "00000", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "°": ["01100", "10010", "01100", "00000", "00000", "00000", "00000"],
  "«": ["00000", "01001", "10010", "00000", "10010", "01001", "00000"],
  "»": ["00000", "10010", "01001", "00000", "01001", "10010", "00000"],
};

/** Растр: RGB-буфер с примитивами и 5×7 текстом. */
export class Canvas {
  /**
   * @param {number} width
   * @param {number} height
   * @param {string} background
   */
  constructor(width, height, background = "#ffffff") {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.data = Buffer.alloc(this.width * this.height * 3);
    this.fill(background);
  }

  set(x, y, [r, g, b], alpha = 1) {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    const idx = (py * this.width + px) * 3;
    if (alpha >= 1) {
      this.data[idx] = r;
      this.data[idx + 1] = g;
      this.data[idx + 2] = b;
      return;
    }
    this.data[idx] = Math.round(this.data[idx] * (1 - alpha) + r * alpha);
    this.data[idx + 1] = Math.round(this.data[idx + 1] * (1 - alpha) + g * alpha);
    this.data[idx + 2] = Math.round(this.data[idx + 2] * (1 - alpha) + b * alpha);
  }

  fill(color) {
    const [r, g, b] = rgbOf(color);
    for (let i = 0; i < this.data.length; i += 3) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
    }
    return this;
  }

  rect(x, y, w, h, color, alpha = 1) {
    const rgb = rgbOf(color);
    for (let py = y; py < y + h; py += 1) for (let px = x; px < x + w; px += 1) this.set(px, py, rgb, alpha);
    return this;
  }

  stroke(x, y, w, h, color, alpha = 1) {
    const th = 1;
    this.rect(x, y, w, th, color, alpha);
    this.rect(x, y + h - th, w, th, color, alpha);
    this.rect(x, y, th, h, color, alpha);
    this.rect(x + w - th, y, th, h, color, alpha);
    return this;
  }

  /** Текст 5×7: масштаб целочисленный, чтобы оставался резким. */
  text(str, x, y, { scale = 2, color = "#000000", letterSpacing = 1, alpha = 1 } = {}) {
    const [r, g, b] = rgbOf(color);
    let cx = x;
    for (const rawChar of String(str).toUpperCase()) {
      const glyph = FONT[rawChar] ?? FONT["?"] ?? FONT["."];
      for (let gy = 0; gy < 7; gy += 1) {
        for (let gx = 0; gx < 5; gx += 1) {
          if (glyph[gy][gx] !== "1") continue;
          for (let sy = 0; sy < scale; sy += 1) {
            for (let sx = 0; sx < scale; sx += 1) {
              this.set(cx + gx * scale + sx, y + gy * scale + sy, [r, g, b], alpha);
            }
          }
        }
      }
      cx += (5 + letterSpacing) * scale;
    }
    return cx - x;
  }

  /** Ширина строки в пикселях при заданном масштабе. */
  textWidth(str, scale = 2, letterSpacing = 1) {
    return String(str).length * (5 + letterSpacing) * scale - letterSpacing * scale;
  }

  toPng() {
    return encodePng(this.width, this.height, this.data);
  }
}

export default { Canvas, encodePng, rgbOf };
