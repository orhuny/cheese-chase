// Draws placeholder app icon / splash art with the game's own drawing code.
// Open /tools/art.html?kind=icon or ?kind=splash in `npm run dev`. Replace with real art before release.
import '@fontsource/fredoka/700.css';
import { ell, FONT } from '../src/render/draw';
import { classicMouse } from '../src/skins/classic';

const kind = new URLSearchParams(location.search).get('kind') ?? 'icon';
const size = kind === 'icon' ? 1024 : 2732;
const c = document.getElementById('c') as HTMLCanvasElement;
c.width = c.height = size;
c.style.width = c.style.height = size + 'px';
const ctx = c.getContext('2d')!;

function sky(): void {
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#4aa8ec'); g.addColorStop(0.62, '#9fd6f7'); g.addColorStop(1, '#fdeec4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
}

function hill(y: number, amp: number, color: string, phase: number): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, size);
  const at = (x: number) => y + Math.sin(x / size * Math.PI * 1.4 + phase) * amp;
  for (let x = 0; x < size; x += 8) ctx.lineTo(x, at(x));
  ctx.lineTo(size, at(size));
  ctx.lineTo(size, size); ctx.closePath(); ctx.fill();
}

function cheese(x: number, y: number, k: number, rot: number): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-16, 9); ctx.lineTo(16, 9); ctx.lineTo(16, -3); ctx.lineTo(-16, 3); ctx.closePath();
  ctx.fillStyle = '#ffc93a'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-16, 3); ctx.lineTo(16, -3); ctx.lineTo(16, -8); ctx.closePath();
  ctx.fillStyle = '#ffe27a'; ctx.fill();
  ctx.strokeStyle = '#d9971a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-16, 9); ctx.lineTo(16, 9); ctx.lineTo(16, -8); ctx.lineTo(-16, 3); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = '#e8a817'; ell(ctx, -4, 5, 3, 2.4); ell(ctx, 8, 3, 2.4, 2); ell(ctx, 10, -4, 1.8, 1.4);
  ctx.restore();
}

function mouse(x: number, y: number, k: number, rot: number): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  classicMouse.draw(ctx, { time: 0.05, onGround: true, stunned: false, zooming: false });
  ctx.restore();
}

async function draw(): Promise<void> {
  await document.fonts.load(`700 100px ${FONT}`);
  sky();
  if (kind === 'icon') {
    // sun glow
    const sg = ctx.createRadialGradient(800, 210, 40, 800, 210, 330);
    sg.addColorStop(0, 'rgba(255,240,180,0.95)'); sg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, size, size);
    hill(760, 40, '#93d07a', 1.2);
    hill(840, 60, '#5fb246', 3.4);
    cheese(760, 330, 7.2, -0.18);
    mouse(430, 600, 9.5, -0.12);
  } else {
    // Splash: content stays in the middle band, because iPhones crop the square image to landscape.
    const mid = size / 2;
    hill(mid + 420, 50, '#b6e0a0', 0.6);
    hill(mid + 520, 70, '#93d07a', 2.1);
    hill(mid + 640, 60, '#5fb246', 4.0);
    ctx.font = `700 230px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 26; ctx.strokeStyle = 'rgba(80,50,20,0.35)'; ctx.lineJoin = 'round';
    ctx.strokeText('Cheese Chase', mid, mid - 250);
    ctx.fillStyle = '#ffffff'; ctx.fillText('Cheese Chase', mid, mid - 250);
    cheese(mid + 330, mid + 120, 6, -0.15);
    mouse(mid - 120, mid + 160, 7.5, -0.08);
  }
  document.title = 'ready';
}

void draw();
