import { TUNING } from '../config/tuning';
import type { Camera } from '../core/camera';
import { reduceMotion } from '../core/canvas';
import { clamp } from '../core/math';
import type { CaughtScene } from '../game/Game';
import { MOUSE_RIG, MOUSE_TAIL, MOUSE_UNITS_PER_PX } from '../skins/spriteSkin';
import type { MouseSkin } from '../skins/MouseSkin';
import { CAT_LENGTH, CAT_RIG, CAT_TAIL } from './catSprite';
import { FONT, star } from './draw';
import { cutPart, drawPart, legPart, type Part } from './rig';
import { getSprite } from './sprites';

const C = TUNING.caught;
const INK = '#3b1d1c';

/** Cloud size in game units (before the sprite scale). */
const CLOUD_W = 250;
/** A new paw, foot or tail pokes out of the cloud this often (seconds)... */
const LIMB_EVERY = 0.075;
/** ...and stays out this long. */
const LIMB_LIFE = 0.26;
const SYMBOL_EVERY = 0.13;
const SYMBOL_LIFE = 0.3;
const PUFF_EVERY = 0.05;
const PUFF_LIFE = 0.5;
const SYMBOLS = ['#', '@', '!', '%', '★', '$', '?!'];

/** Same pseudo-random number in 0..1 for the same inputs, so the scene needs no state of its own. */
function hash(i: number, salt: number): number {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Springy grow from 0 to 1 (overshoots a little). */
function popIn(x: number): number {
  if (x >= 1) return 1;
  const c = 2.2;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
}

/** Limbs poking out are drawn this much bigger than on the characters (cartoon exaggeration). */
const LIMB_SCALE = 1.9;

interface Limb { part: Part; u: number; }

/** The paws, feet and tails that poke out: the cat's from its picture, the mouse's from the selected skin's picture. */
function limbs(skin: MouseSkin): Limb[] {
  const out: Limb[] = [];
  const cat = getSprite('cat_run_a');
  if (cat) {
    const u = CAT_LENGTH / cat.trimW;
    out.push({ part: legPart(cat, CAT_RIG, 0), u }, { part: legPart(cat, CAT_RIG, 2), u });
    out.push({ part: cutPart(cat, 'tail', CAT_TAIL.outline, CAT_TAIL.anchor), u });
  }
  const mouse = skin.spriteId ? getSprite(skin.spriteId) : undefined;
  if (mouse) {
    const u = MOUSE_UNITS_PER_PX * 1.1 * 1.3; // the mouse is drawn 1.1x (see mouseSprite.ts); its small feet a bit bigger still
    out.push({ part: legPart(mouse, MOUSE_RIG, 2), u }, { part: legPart(mouse, MOUSE_RIG, 3), u });
    out.push({ part: cutPart(mouse, 'tail', MOUSE_TAIL.outline, MOUSE_TAIL.anchor), u });
  }
  return out;
}

/** True while the cloud hides the cat and mouse (they reappear as it clears). */
export function caughtSceneHidesCharacters(sc: CaughtScene | null): boolean {
  return !!sc && sc.t < C.sceneDuration - C.clearTime;
}

/** Screen shake for the whole world while they scuffle. */
export function caughtSceneShake(sc: CaughtScene | null): [number, number] {
  if (!sc || reduceMotion || !caughtSceneHidesCharacters(sc)) return [0, 0];
  const a = 4 * (1 - sc.t / C.sceneDuration);
  return [Math.sin(sc.t * 71) * a, Math.cos(sc.t * 53) * a];
}

/**
 * The scuffle: a boiling dust cloud with paws, feet and tails poking out, the cat's head popping up,
 * comic symbols and flying dust puffs. Then the cloud puffs away.
 */
export function drawCaughtScene(ctx: CanvasRenderingContext2D, cam: Camera, sc: CaughtScene, skin: MouseSkin): void {
  const { t } = sc;
  if (t >= C.sceneDuration) return;
  const cloudA = getSprite('fight_cloud_a'), cloudB = getSprite('fight_cloud_b');
  if (!cloudA || !cloudB) return;
  const k = cam.spriteScale();
  const w = CLOUD_W * k, h = w * cloudA.trimH / cloudA.trimW;
  const clearAt = C.sceneDuration - C.clearTime;
  const clearing = clamp((t - clearAt) / C.clearTime, 0, 1);
  const grow = popIn(clamp(t / 0.16, 0, 1));
  const still = reduceMotion;

  // Cloud centre: sits on the ground, bounces and jitters while they fight.
  const bounce = still || clearing > 0 ? 0 : Math.abs(Math.sin(t * 15)) * 7 * k;
  const cx = cam.toSX(sc.x) + (still ? 0 : Math.sin(t * 23) * 4 * k);
  const cy = cam.toSY(sc.y) - h * 0.42 - bounce;
  const rx = w * 0.47, ry = h * 0.45; // where the cloud's edge is, roughly

  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  if (clearing === 0) {
    // Behind the cloud: limbs poking out around the edge, and the cat's head popping up.
    const all = limbs(skin);
    if (all.length) {
      const first = Math.max(0, Math.floor((t - LIMB_LIFE) / LIMB_EVERY) + 1);
      for (let i = first; i * LIMB_EVERY <= t; i++) {
        const age = t - i * LIMB_EVERY;
        if (age < 0.12 && i * LIMB_EVERY < 0.12) continue; // let the cloud appear first
        const limb = all[Math.floor(hash(i, 1) * all.length)];
        // Anywhere around the edge except straight up (that's where the head pops out).
        const a = -Math.PI / 2 + 0.6 + hash(i, 2) * (Math.PI * 2 - 1.2);
        const out = Math.sin(Math.PI * clamp(age / LIMB_LIFE, 0, 1)); // slides out, then back in
        // Fully out, the attachment sits just inside the cloud's edge; fully in, the whole limb is hidden.
        const u = limb.u * k * LIMB_SCALE;
        const back = (limb.part.length * u * 0.9) * (1 - out);
        const ex = Math.cos(a) * (rx * 0.9 - back), ey = Math.sin(a) * (ry * 0.9 - back);
        ctx.save();
        ctx.translate(ex, ey);
        drawPart(ctx, limb.part, a + Math.sin(age * 40) * 0.25, u);
        ctx.restore();
      }
    }
    drawCatHead(ctx, t, h, k);
  }

  // The cloud: two frames swapped quickly so it boils, wobbling; it grows in and puffs away at the end.
  const frame = still ? cloudA : Math.floor(t / 0.08) % 2 ? cloudB : cloudA;
  const sx = grow * (1 + (still ? 0 : 0.05 * Math.sin(t * 31))) * (1 + clearing * 0.35);
  const sy = grow * (1 + (still ? 0 : 0.05 * Math.cos(t * 27))) * (1 + clearing * 0.2);
  ctx.save();
  ctx.globalAlpha = 1 - clearing;
  ctx.scale(sx, sy);
  ctx.drawImage(frame.img, -w / 2, -h / 2, w, h);
  ctx.restore();

  // In front: comic symbols and stars flashing around the top of the cloud.
  if (clearing === 0 && t > 0.15) {
    const first = Math.max(0, Math.floor((t - SYMBOL_LIFE) / SYMBOL_EVERY) + 1);
    for (let i = first; i * SYMBOL_EVERY <= t; i++) {
      const age = t - i * SYMBOL_EVERY;
      const life = clamp(age / SYMBOL_LIFE, 0, 1);
      const a = -Math.PI / 2 + (hash(i, 4) - 0.5) * Math.PI * 1.3;
      const x = Math.cos(a) * rx * (0.75 + life * 0.35), y = Math.sin(a) * ry * (0.8 + life * 0.4);
      const size = (26 + hash(i, 5) * 14) * k * popIn(clamp(age / 0.08, 0, 1));
      ctx.save();
      ctx.globalAlpha = 1 - Math.max(0, life - 0.6) / 0.4;
      ctx.translate(x, y); ctx.rotate((hash(i, 6) - 0.5) * 0.8);
      const sym = SYMBOLS[Math.floor(hash(i, 7) * SYMBOLS.length)];
      if (sym === '★') {
        ctx.fillStyle = INK; star(ctx, 0, 0, size * 0.7);
        ctx.fillStyle = '#ffd23f'; star(ctx, 0, 0, size * 0.55);
      } else {
        ctx.font = `700 ${Math.round(size)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = size * 0.22; ctx.strokeStyle = INK; ctx.strokeText(sym, 0, 0);
        ctx.fillStyle = hash(i, 8) < 0.5 ? '#ff4b3a' : '#ffffff'; ctx.fillText(sym, 0, 0);
      }
      ctx.restore();
    }
  }
  ctx.restore();

  drawPuffs(ctx, t, cx, cy, rx, ry, k, clearAt);
}

/** The cat's head pops up from behind the top of the cloud, twice. */
function drawCatHead(ctx: CanvasRenderingContext2D, t: number, h: number, k: number): void {
  const head = getSprite('cat_head_peek');
  if (!head) return;
  for (const [start, side] of [[0.4, 1], [0.95, -1]] as const) {
    const age = t - start;
    if (age < 0 || age > 0.32) continue;
    const up = Math.sin(Math.PI * age / 0.32);
    const hw = 62 * k, hh = hw * head.trimH / head.trimW;
    ctx.save();
    ctx.translate(side * h * 0.32, -h * 0.28 - up * hh * 0.55);
    ctx.rotate(side * 0.15 + Math.sin(age * 30) * 0.06);
    ctx.scale(side, 1); // the second time it faces the other way
    ctx.drawImage(head.img, -hw / 2, -hh / 2, hw, hh);
    ctx.restore();
  }
}

/** Dust puffs flying out of the cloud while they fight, and a ring of them when it clears. */
function drawPuffs(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number, rx: number, ry: number, k: number, clearAt: number): void {
  const puff = getSprite('dust_puff');
  if (!puff || reduceMotion) return;
  const one = (i: number, born: number, speed: number, size: number) => {
    const age = t - born;
    if (age < 0 || age > PUFF_LIFE) return;
    const life = age / PUFF_LIFE;
    const a = hash(i, 9) * Math.PI * 2;
    const d = 0.7 + life * speed;
    const s = size * k * (1 - life * 0.6);
    ctx.save();
    ctx.globalAlpha = 1 - life;
    ctx.translate(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d - life * 30 * k);
    ctx.rotate(hash(i, 10) * 6 + life * 2);
    ctx.drawImage(puff.img, -s / 2, -s * 0.44, s, s * 0.88);
    ctx.restore();
  };
  for (let i = 0; i * PUFF_EVERY < clearAt; i++) one(i, i * PUFF_EVERY, 0.6 + hash(i, 11) * 0.5, 26 + hash(i, 12) * 18);
  for (let i = 0; i < 14; i++) one(1000 + i, clearAt, 1.2 + hash(i, 13) * 0.6, 40 + hash(i, 14) * 20);
}
