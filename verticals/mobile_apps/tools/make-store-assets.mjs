#!/usr/bin/env node
/* tools/make-store-assets.mjs — генератор ассетов стора (К-20, навык store-assets §9.7).
   Создаёт настоящие PNG-файлы (zlib, ноль зависимостей):
     • app/assets/icon-1024.png      — 1024×1024;
     • app/screenshots/6.5in.png     — 1290×2796;
     • app/screenshots/5.5in.png     — 1242×2208.
   Сплошной фирменный цвет + цветовая маркировка «6.5"/5.5"» полосой — чтобы файлы
   различались визуально при просмотре и по байтам (для diff'ов в приёмке).

   Использование: node tools/make-store-assets.mjs projects/<имя> [RRGGBB]
*/

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

const PROJECT = resolve(process.cwd(), String(process.argv[2] ?? "projects/notes-app"));
const COLOR = Number.parseInt(process.argv[3] ?? "2878C8", 16);

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const head = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head, data])));
  return Buffer.concat([len, head, data, crc]);
}

/** Строит PNG заданного размера; полоса marker-цвета сверху отделяет варианты. */
export function makePng(width, height, color = COLOR, marker = null) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0; // filter: none
    const band = marker !== null && y < Math.round(height * 0.08);
    const r = band ? ((marker >> 16) & 0xff) : ((color >> 16) & 0xff);
    const g = band ? ((marker >> 8) & 0xff) : ((color >> 8) & 0xff);
    const b = band ? (marker & 0xff) : (color & 0xff);
    for (let x = 0; x < width; x += 1) {
      const off = y * stride + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** @param {string} rel @param {Buffer} buf */
function write(rel, buf) {
  const dest = resolve(PROJECT, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  process.stdout.write(`генерирую ${rel} (${buf.length} байт, ${dirname(dest).split("/").pop()})\n`);
}

const six = 0xd94f30; // 6.5" — тёплый
const five = 0x4f6fd9; // 5.5" — холодный
write("app/assets/icon-1024.png", makePng(1024, 1024, COLOR));
write("app/screenshots/6.5in.png", makePng(1290, 2796, COLOR, six));
write("app/screenshots/5.5in.png", makePng(1242, 2208, COLOR, five));
process.stdout.write("готово: icon-1024.png, 6.5in.png, 5.5in.png\n");