import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");

mkdirSync(iconsDir, { recursive: true });
writeFileSync(join(iconsDir, "icon-192.png"), createIconPng(192));
writeFileSync(join(iconsDir, "icon-512.png"), createIconPng(512));
writeFileSync(join(iconsDir, "apple-touch-icon.png"), createIconPng(180));

function createIconPng(size) {
  const pixels = Buffer.alloc(size * size * 4, 0);
  const radius = Math.floor(size * 0.18);
  fillRoundedRect(pixels, size, 0, 0, size, size, radius, [239, 47, 47, 255]);
  drawP(pixels, size);

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

function fillRoundedRect(pixels, size, x, y, width, height, radius, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      if (inRoundedRect(px, py, x, y, width, height, radius)) {
        writePixel(pixels, size, px, py, color);
      }
    }
  }
}

function inRoundedRect(px, py, x, y, width, height, radius) {
  const left = px - x;
  const top = py - y;
  const right = x + width - 1 - px;
  const bottom = y + height - 1 - py;
  if (left >= radius && right >= radius) return true;
  if (top >= radius && bottom >= radius) return true;
  const cx = left < radius ? x + radius : x + width - 1 - radius;
  const cy = top < radius ? y + radius : y + height - 1 - radius;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function drawP(pixels, size) {
  const white = [255, 255, 255, 255];
  const stemX = Math.floor(size * 0.32);
  const stemWidth = Math.floor(size * 0.12);
  const top = Math.floor(size * 0.24);
  const bottom = Math.floor(size * 0.76);
  const bowlRight = Math.floor(size * 0.66);
  const bowlBottom = Math.floor(size * 0.54);

  for (let y = top; y <= bottom; y += 1) {
    for (let x = stemX; x < stemX + stemWidth; x += 1) {
      writePixel(pixels, size, x, y, white);
    }
  }
  for (let y = top; y < top + stemWidth; y += 1) {
    for (let x = stemX; x < bowlRight; x += 1) {
      writePixel(pixels, size, x, y, white);
    }
  }
  for (let y = bowlBottom - stemWidth; y < bowlBottom; y += 1) {
    for (let x = stemX; x < bowlRight; x += 1) {
      writePixel(pixels, size, x, y, white);
    }
  }
  for (let y = top; y < bowlBottom; y += 1) {
    for (let x = bowlRight - stemWidth; x < bowlRight; x += 1) {
      writePixel(pixels, size, x, y, white);
    }
  }
}

function writePixel(pixels, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }
  const offset = (y * size + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
