// Animation preview: open http://localhost:5173/tools/anim.html while `npm run dev` is running.
// Each row shows one character at 6 moments of its stride; the right column runs live.
import { drawCatPicture } from '../src/render/catSprite';
import { getSprite, loadSprites } from '../src/render/sprites';
import { SKINS } from '../src/skins/registry';

const FRAMES = 6, CELL_W = 210, CELL_H = 150, ROWS = SKINS.length + 1;
const c = document.getElementById('c') as HTMLCanvasElement;
const dpr = window.devicePixelRatio || 1;
const W = CELL_W * (FRAMES + 1), H = CELL_H * ROWS;
c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
const ctx = c.getContext('2d')!;

function cell(col: number, row: number, draw: () => void): void {
  ctx.save();
  ctx.beginPath(); ctx.rect(col * CELL_W, row * CELL_H, CELL_W, CELL_H); ctx.clip();
  ctx.fillStyle = col === FRAMES ? '#c9ecff' : (col + row) % 2 ? '#b3e2fb' : '#a6dcf8';
  ctx.fillRect(col * CELL_W, row * CELL_H, CELL_W, CELL_H);
  ctx.fillStyle = '#5fb246'; ctx.fillRect(col * CELL_W, row * CELL_H + CELL_H - 28, CELL_W, 28);
  draw();
  ctx.restore();
}

function frame(now: number): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const t = now / 1000;
  SKINS.forEach((skin, row) => {
    for (let col = 0; col <= FRAMES; col++) {
      // Mouse stride = time * 22 (see spriteSkin.ts); each column is 1/6 of a stride.
      const time = col < FRAMES ? (col / FRAMES) * (Math.PI * 2) / 22 : t;
      cell(col, row, () => {
        ctx.translate(col * CELL_W + CELL_W / 2 - 6, row * CELL_H + CELL_H - 28);
        ctx.scale(1.6, 1.6); ctx.translate(0, -15);
        skin.draw(ctx, { time, onGround: true, stunned: false, zooming: false });
      });
    }
  });
  const cat = getSprite('cat_run_a');
  for (let col = 0; col <= FRAMES; col++) {
    const run = col < FRAMES ? (col / FRAMES) * Math.PI * 2 : t * 13;
    cell(col, SKINS.length, () => {
      if (cat) drawCatPicture(ctx, cat, col * CELL_W + 82, SKINS.length * CELL_H + CELL_H - 28, 0, 0.75, run);
    });
  }
  ctx.fillStyle = '#123'; ctx.font = '600 12px system-ui';
  ctx.fillText('live →', FRAMES * CELL_W + 6, 14);
  requestAnimationFrame(frame);
}

void loadSprites().then(() => { document.title = 'ready'; requestAnimationFrame(frame); });
