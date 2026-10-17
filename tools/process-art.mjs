// Turns the AI-generated images in art/source/ into game sprites in src/assets/sprites/.
//   npm run art
// - removes the flat magenta background (and the pink fringe JPEG leaves around edges)
// - makes the astronaut's helmet see-through glass
// - trims empty space, scales down, and writes sprites.json (sizes/offsets the game uses to line sprites up)
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const SRC = 'art/source';
const OUT = 'src/assets/sprites';

/**
 * kind: 'sprite'   = cut out from magenta, trimmed
 *       'strip'    = cut out from magenta, cropped to ONE repeat (`period`, measured by `npm run art`)
 *                    so it tiles seamlessly left-right; only the empty top is trimmed
 *       'tile'     = a texture cropped to one repeat in both directions
 *       'backdrop' = kept as a JPEG
 * `crop` (optional) = the part of the original image to use.
 */
const JOBS = [
  { id: 'bg_hills_far', kind: 'strip', maxW: 1032 },
  { id: 'bg_hills_near', kind: 'strip', maxW: 1034 },
  { id: 'ground_edge', kind: 'strip', maxW: 1464, crop: { y: 0, h: 250 }, groundLineY: 145 },
  { id: 'ground_fill', kind: 'tile', maxW: 512 },
  { id: 'mouse_classic', kind: 'sprite', maxW: 512 },
  { id: 'mouse_ninja', kind: 'sprite', maxW: 512 },
  { id: 'mouse_chef', kind: 'sprite', maxW: 512 },
  { id: 'mouse_pirate', kind: 'sprite', maxW: 512 },
  { id: 'mouse_astronaut', kind: 'sprite', maxW: 512, glass: true },
  { id: 'cat_run_a', kind: 'sprite', maxW: 768 },
  // Caught scene: dust cloud (two boiling frames), flying dust puffs, the cat's head popping out.
  { id: 'fight_cloud_a', kind: 'sprite', maxW: 768 },
  { id: 'fight_cloud_b', kind: 'sprite', maxW: 768 },
  { id: 'dust_puff', kind: 'sprite', maxW: 192 },
  { id: 'cat_head_peek', kind: 'sprite', maxW: 384 },
  { id: 'bg_sky', kind: 'backdrop', maxW: 1456 },
];

const BG_CONNECTED = 120;   // colour distance: background reachable from the image border
const BG_POCKET = 70;       // colour distance: enclosed pure-magenta gaps (e.g. between legs)
const OPAQUE_AT = 260;      // colour distance at which an edge pixel counts as fully solid

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Finds how wide one repeat of a horizontally repeating picture is (smallest difference between columns x and x+p). */
async function findPeriod(file, minP, maxP) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let best = [Infinity, 0];
  for (let p = minP; p <= Math.min(maxP, w - 50); p++) {
    let s = 0, n = 0;
    for (let x = 0; x + p < w; x += 3) for (let y = 0; y < h; y += 4) {
      const i = (y * w + x) * c, j = (y * w + x + p) * c;
      s += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]); n++;
    }
    if (s / n < best[0]) best = [s / n, p];
  }
  return best[1];
}

async function cutOut(job) {
  let input = sharp(`${SRC}/${job.id}.jpg`);
  let cropX = 0, cropY = 0;
  if (job.kind === 'strip') {
    const meta = await input.metadata();
    const y = job.crop?.y ?? 0, h = job.crop?.h ?? meta.height;
    const banded = await sharp(`${SRC}/${job.id}.jpg`).extract({ left: 0, top: y, width: meta.width, height: h }).png().toBuffer();
    const period = await findPeriod(banded, Math.round(meta.width * 0.3), Math.round(meta.width * 0.7));
    input = sharp(banded).extract({ left: 0, top: 0, width: period, height: h });
    cropY = y;
  }
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x, y) => (y * w + x) * 4;

  // Background colour = average of the top row (always magenta; strips have grass along the bottom).
  let kr = 0, kg = 0, kb = 0, n = 0;
  for (let x = 0; x < w; x++) for (const y of [0, 1, 2]) { const i = px(x, y); kr += data[i]; kg += data[i + 1]; kb += data[i + 2]; n++; }
  const key = [kr / n, kg / n, kb / n];
  const dist = i => Math.hypot(data[i] - key[0], data[i + 1] - key[1], data[i + 2] - key[2]);

  // 1. Flood-fill the background from the border.
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => { const k = y * w + x; if (!bg[k] && dist(k * 4) < BG_CONNECTED) { bg[k] = 1; stack.push(k); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const k = stack.pop(), x = k % w, y = (k / w) | 0;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
  }
  // 2. Enclosed pockets of pure magenta (not for the astronaut: its glass is magenta-tinted).
  if (!job.glass) for (let k = 0; k < w * h; k++) if (!bg[k] && dist(k * 4) < BG_POCKET) bg[k] = 1;

  // 3. Alpha + remove the magenta fringe on edges; glass recolour.
  const nearBg = k => { const x = k % w, y = (k / w) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && bg[yy * w + xx]) return true; }
    return false; };
  for (let k = 0; k < w * h; k++) {
    const i = k * 4;
    if (bg[k]) { data[i + 3] = 0; continue; }
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (job.glass && r > 140 && b > 140 && g < 0.8 * Math.min(r, b) && Math.abs(r - b) < 45) {
      // Magenta seen through the helmet → light blue glass with a little transparency.
      const t = clamp((g - 60) / 140, 0, 1);
      data[i] = Math.round(150 + 105 * t); data[i + 1] = Math.round(205 + 50 * t); data[i + 2] = Math.round(250 + 5 * t);
      data[i + 3] = Math.round(255 * (0.28 + 0.6 * t));
      continue;
    }
    if (job.glass && Math.abs(r - b) < 40 && g < Math.min(r, b) - 20 && r > 180) {
      // Lavender shine spots on the glass → white-blue shine.
      data[i] = 228; data[i + 1] = 242; data[i + 2] = 255; data[i + 3] = 200;
      continue;
    }
    if (nearBg(k)) {
      const a = clamp(dist(i) / OPAQUE_AT, 0, 1);
      if (a < 0.08) { data[i + 3] = 0; continue; }
      for (let c = 0; c < 3; c++) data[i + c] = clamp(Math.round((data[i + c] - (1 - a) * key[c]) / a), 0, 255);
      data[i + 3] = Math.round(255 * a);
    }
  }

  // 4. Trim to the visible pixels (+2 px margin).
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[px(x, y) + 3] > 8) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  // Strips keep their full width (one exact repeat) and bottom; only the empty sky above is trimmed.
  const strip = job.kind === 'strip';
  const trimX = strip ? 0 : Math.max(0, minX - 2), trimY = Math.max(0, minY - 2);
  const trimW = strip ? w : Math.min(w, maxX + 3) - trimX, trimH = strip ? h - trimY : Math.min(h, maxY + 3) - trimY;
  const outW = Math.min(job.maxW, trimW), outH = Math.round(trimH * outW / trimW);

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: trimX, top: trimY, width: trimW, height: trimH })
    .resize(outW, outH, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${job.id}.png`);
  const result = { file: `${job.id}.png`, srcW: w, srcH: h, trimX: trimX + cropX, trimY: trimY + cropY, trimW, trimH, outW, outH };
  if (strip) {
    // Colour of the bottom row, used to fill the screen below the strip.
    const i = ((h - 2) * w + Math.floor(w / 2)) * 4;
    result.bottomColor = '#' + [data[i], data[i + 1], data[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
    // Where the ground surface is inside the strip (0 = top, 1 = bottom), for the grass edge.
    if (job.groundLineY !== undefined) result.groundLine = +((job.groundLineY - cropY - trimY) / trimH).toFixed(4);
  }
  return result;
}

async function tile(job) {
  const file = `${SRC}/${job.id}.jpg`;
  const m = await sharp(file).metadata();
  const p = await findPeriod(file, Math.round(m.width * 0.2), Math.round(m.width * 0.7));
  const outW = Math.min(job.maxW, p);
  await sharp(file).extract({ left: 0, top: 0, width: p, height: p }).resize(outW, outW).jpeg({ quality: 88, mozjpeg: true }).toFile(`${OUT}/${job.id}.jpg`);
  return { file: `${job.id}.jpg`, srcW: m.width, srcH: m.height, trimX: 0, trimY: 0, trimW: p, trimH: p, outW, outH: outW };
}

async function backdrop(job) {
  const img = sharp(`${SRC}/${job.id}.jpg`);
  const m = await img.metadata();
  const outW = Math.min(job.maxW, m.width), outH = Math.round(m.height * outW / m.width);
  await img.resize(outW, outH).jpeg({ quality: 86, mozjpeg: true }).toFile(`${OUT}/${job.id}.jpg`);
  return { file: `${job.id}.jpg`, srcW: m.width, srcH: m.height, trimX: 0, trimY: 0, trimW: m.width, trimH: m.height, outW, outH };
}

mkdirSync(OUT, { recursive: true });
const manifest = {};
for (const job of JOBS) {
  manifest[job.id] = job.kind === 'backdrop' ? await backdrop(job) : job.kind === 'tile' ? await tile(job) : await cutOut(job);
  const m = manifest[job.id];
  console.log(`${job.id.padEnd(16)} ${m.trimW}x${m.trimH} at (${m.trimX},${m.trimY}) → ${m.file} ${m.outW}x${m.outH}`);
}
writeFileSync(`${OUT}/sprites.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${OUT}/sprites.json`);
