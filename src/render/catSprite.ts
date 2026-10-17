import type { Camera } from '../core/camera';
import type { View } from '../core/canvas';
import { clamp } from '../core/math';
import type { Game } from '../game/Game';
import { ell, ellS, FONT } from './draw';
import { drawRigged, type Rig } from './rig';
import { getSprite, type Sprite } from './sprites';

function catLeg(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, fill: string): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ellS(ctx, 0, 12, 8, 15, 0, fill);
  ctx.fillStyle = '#fde1bf'; ell(ctx, 0, 25, 7, 4);
  ctx.restore();
}

/** Whole cat (tail tip to front paw), in game units. */
export const CAT_LENGTH = 185;
/** The picture's right edge (front paw) sits this far ahead of cat.x; the cat catches the mouse at +70. */
const CAT_FRONT_X = 95;
/** Paws sink this much into the grass so the cat doesn't float. */
const CAT_FEET_Y = 3;

/**
 * The cat's own legs, cut out of art/source/cat_run_a.jpg (original pixels) and swung in a gallop:
 * the hind pair and the front pair half a stride apart, the two legs of each pair slightly offset.
 */
export const CAT_RIG: Rig = {
  legs: [
    { // front leg reaching forward
      piece: [[930, 552], [960, 546], [1000, 535], [1010, 512], [1016, 490], [1030, 500], [1115, 522], [1216, 560], [1218, 634], [1150, 632], [1110, 622], [1000, 613], [975, 606], [930, 582]],
      seam: [[1020, 492], [974, 603]], hip: [975, 560], base: 0.15, swing: 0.4, phase: Math.PI + 0.45, air: -0.2,
    },
    { // hind leg under the belly
      piece: [[318, 532], [402, 552], [400, 600], [366, 688], [264, 694], [264, 622], [316, 572]],
      seam: [[330, 571], [398, 599]], hip: [362, 548], base: -0.1, swing: 0.45, phase: 0.45, air: 0.25,
    },
    { // hind leg stretched back
      piece: [[294, 462], [296, 546], [274, 554], [212, 640], [128, 640], [128, 560], [210, 470], [250, 448]],
      seam: [[257, 468], [266, 543]], hip: [288, 505], base: -0.2, swing: 0.45, phase: 0, air: 0.3,
    },
    { // front leg reaching down
      piece: [[778, 545], [880, 518], [962, 560], [975, 606], [1000, 613], [1112, 644], [1116, 740], [1000, 740], [896, 684], [778, 604]],
      seam: [[788, 562], [970, 602]], hip: [880, 542], base: 0.1, swing: 0.4, phase: Math.PI, air: -0.15,
    },
  ],
};

/** The cat's tail (original pixels), and where it joins the body. */
export const CAT_TAIL = {
  outline: [[40, 150], [120, 105], [205, 112], [272, 148], [335, 228], [405, 268], [400, 326], [384, 336], [315, 318], [255, 266], [205, 230], [120, 224], [55, 206], [36, 180]],
  anchor: [400, 300],
} as const;

/** The cat picture with galloping legs, hop and rock made in code. */
export function drawCatPicture(ctx: CanvasRenderingContext2D, pic: Sprite, x: number, y: number, slope: number, k: number, run: number): void {
  const u = CAT_LENGTH / pic.trimW; // game units per original image pixel
  const h = pic.trimH * u;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(slope); ctx.scale(k, k);
  ctx.translate(0, -Math.abs(Math.sin(run)) * 5);          // hop on every stride
  ctx.translate(0, -h / 2); ctx.rotate(Math.sin(run) * 0.04); ctx.translate(0, h / 2); // rock back and forth
  // Draw in original-image pixels: the picture's right/bottom edges land on CAT_FRONT_X / CAT_FEET_Y.
  ctx.translate(CAT_FRONT_X - (pic.trimX + pic.trimW) * u, CAT_FEET_Y - (pic.trimY + pic.trimH) * u);
  ctx.scale(u, u);
  drawRigged(ctx, pic, CAT_RIG, run);
  ctx.restore();
}

/** The orange cat, or an arrow at the left edge when it's off screen. */
export function drawCat(ctx: CanvasRenderingContext2D, { H }: View, cam: Camera, g: Game, time: number): void {
  const k = cam.spriteScale();
  const ssx = cam.toSX(g.cat.x);
  if (ssx < -80 * k) {
    const [gy0] = g.terrain.ground(cam.x + 20 / cam.scale);
    const iy = clamp(cam.toSY(gy0) - 45, 70, H - 120);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.moveTo(8, iy); ctx.lineTo(24, iy - 13); ctx.lineTo(24, iy + 13); ctx.closePath(); ctx.fill();
    ctx.font = `600 24px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText('🐱', 28, iy + 9);
    return;
  }
  const [gy, s] = g.terrain.ground(g.cat.x);
  const run = g.state === 'play' ? time * 13 : 0; // stands still once the run is over
  const pic = getSprite('cat_run_a');
  if (pic) {
    drawCatPicture(ctx, pic, ssx, cam.toSY(gy), -Math.atan(s), k, run);
    return;
  }
  ctx.save();
  ctx.translate(ssx, cam.toSY(gy)); ctx.rotate(-Math.atan(s)); ctx.scale(k * 1.15, k * 1.15);
  ctx.translate(0, -38 - Math.abs(Math.sin(run)) * 7);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // tail
  ctx.strokeStyle = '#b8631c'; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(-44, -6);
  ctx.quadraticCurveTo(-70, -10 + Math.sin(run * 0.5) * 6, -66, -42 + Math.cos(run * 0.5) * 6); ctx.stroke();
  ctx.strokeStyle = '#f29a3a'; ctx.lineWidth = 8; ctx.stroke();
  // back legs, body, stripes, front legs
  ctx.strokeStyle = '#b8631c'; ctx.lineWidth = 2.5;
  catLeg(ctx, -28, 12, Math.sin(run) * 0.75, '#e0832a');
  catLeg(ctx, 26, 12, -Math.sin(run) * 0.75, '#e0832a');
  ellS(ctx, 0, 0, 47, 23, 0, '#f29a3a');
  ctx.fillStyle = '#fde1bf'; ell(ctx, 4, 10, 36, 10);
  ctx.strokeStyle = '#c9691c'; ctx.lineWidth = 4;
  for (const xx of [-24, -8, 8]) { ctx.beginPath(); ctx.moveTo(xx, -22); ctx.quadraticCurveTo(xx + 5, -12, xx + 1, -4); ctx.stroke(); }
  ctx.strokeStyle = '#b8631c'; ctx.lineWidth = 2.5;
  catLeg(ctx, -18, 14, -Math.sin(run) * 0.75, '#f29a3a');
  catLeg(ctx, 32, 14, Math.sin(run) * 0.75, '#f29a3a');
  // ears
  ctx.fillStyle = '#f29a3a';
  ctx.beginPath(); ctx.moveTo(36, -28); ctx.lineTo(39, -50); ctx.lineTo(52, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(52, -34); ctx.lineTo(64, -50); ctx.lineTo(67, -28); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f7b8c4';
  ctx.beginPath(); ctx.moveTo(40, -32); ctx.lineTo(41, -44); ctx.lineTo(48, -35); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(56, -35); ctx.lineTo(62, -44); ctx.lineTo(63, -32); ctx.closePath(); ctx.fill();
  // head
  ellS(ctx, 52, -16, 21, 18, 0, '#f29a3a');
  ctx.fillStyle = '#fde1bf'; ell(ctx, 62, -8, 11, 8);
  ctx.fillStyle = '#9be36a'; ell(ctx, 59, -21, 4.5, 4.5);
  ctx.fillStyle = '#1c2233'; ell(ctx, 59.5, -21, 1.3, 3.6);
  ctx.strokeStyle = '#1c2233'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(53, -29); ctx.lineTo(64, -26); ctx.stroke();
  ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.moveTo(69, -12); ctx.lineTo(75, -12); ctx.lineTo(72, -8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a2b3a'; ell(ctx, 66, -1, 6, 2.5 + Math.abs(Math.sin(run * 0.5)) * 2.5);
  ctx.strokeStyle = 'rgba(60,40,30,0.7)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(68, -8); ctx.lineTo(84, -12); ctx.moveTo(68, -6); ctx.lineTo(84, -4); ctx.stroke();
  // collar + bell
  ctx.strokeStyle = '#2f6fd6'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(36, -12); ctx.quadraticCurveTo(40, 2, 46, 4); ctx.stroke();
  ctx.fillStyle = '#ffc93a'; ctx.strokeStyle = '#c99410'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(45 + Math.sin(run) * 1.5, 9, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
