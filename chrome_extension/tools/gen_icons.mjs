/*
 * Generates the extension PNG icons (icons/icon{16,32,48,128}.png).
 * Pure Node — no image libraries. Draws at 4x supersampling and box-downsamples:
 * an indigo→violet rounded square, a light "banner" strip across the top and
 * three ascending white bars (revision bars).
 *
 * Run:  node tools/gen_icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'icons');

// ---- PNG encoding ---------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(w, h, pixels) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0; // filter: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * w * 4, w * 4).copy(raw, y * stride + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- drawing --------------------------------------------------------------
function hex(h) {
  const v = parseInt(h.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
const lerp = (a, b, t) => a + (b - a) * t;

function drawIcon(S) {
  const SS = 4;
  const W = S * SS;
  const top = hex('#4f46e5');
  const bot = hex('#7c3aed');
  const img = new Uint8ClampedArray(W * W * 4);
  const rad = 0.24 * W;
  const stripY0 = 0.09 * W, stripY1 = 0.25 * W, stripX0 = 0.13 * W, stripX1 = 0.87 * W;
  const barW = 0.13 * W;
  const centers = [0.30 * W, 0.50 * W, 0.70 * W];
  const heights = [0.24 * W, 0.38 * W, 0.52 * W];
  const baseY = 0.84 * W;

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const qx = Math.min(x, W - 1 - x);
      const qy = Math.min(y, W - 1 - y);
      let inside = true;
      if (qx < rad && qy < rad) {
        const dx = rad - qx, dy = rad - qy;
        if (dx * dx + dy * dy > rad * rad) inside = false;
      }
      const i = (y * W + x) * 4;
      if (!inside) { img[i + 3] = 0; continue; }
      const t = y / (W - 1);
      let r = lerp(top.r, bot.r, t);
      let g = lerp(top.g, bot.g, t);
      let b = lerp(top.b, bot.b, t);
      if (y > stripY0 && y < stripY1 && x > stripX0 && x < stripX1) {
        const k = 0.6;
        r = lerp(r, 255, k); g = lerp(g, 255, k); b = lerp(b, 255, k);
      }
      for (let bi = 0; bi < 3; bi++) {
        const x0 = centers[bi] - barW / 2, x1 = centers[bi] + barW / 2;
        const y0 = baseY - heights[bi];
        if (x >= x0 && x <= x1 && y >= y0 && y <= baseY) { r = g = b = 255; break; }
      }
      img[i] = r; img[i + 1] = g; img[i + 2] = b; img[i + 3] = 255;
    }
  }

  // box downsample SS×SS → 1px
  const out = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const i = ((y * SS + dy) * W + (x * SS + dx)) * 4;
          const al = img[i + 3] / 255;
          r += img[i] * al; g += img[i + 1] * al; b += img[i + 2] * al; a += al;
        }
      }
      const n = SS * SS;
      const i2 = (y * S + x) * 4;
      out[i2] = a ? r / a : 0;
      out[i2 + 1] = a ? g / a : 0;
      out[i2 + 2] = a ? b / a : 0;
      out[i2 + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

mkdirSync(outDir, { recursive: true });
for (const S of [16, 32, 48, 128]) {
  const png = encodePNG(S, S, drawIcon(S));
  const p = join(outDir, 'icon' + S + '.png');
  writeFileSync(p, png);
  console.log('wrote', p, png.length, 'bytes');
}
console.log('done');
