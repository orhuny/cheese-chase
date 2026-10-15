import { ell } from '../render/draw';
import type { MouseSkin } from './MouseSkin';
import { CLASSIC_PALETTE, drawBackEar, drawFeet, drawHead, drawTail } from './parts';

const P = { ...CLASSIC_PALETTE, fur: '#9a8a7c', furBack: '#857668', outline: '#5f5246', belly: '#e3d8cc' };

/** A brown mouse in a striped shirt, with a tricorn hat, eye patch and gold earring. */
export const pirateMouse: MouseSkin = {
  id: 'pirate',
  name: 'Pirate Mouse',
  draw(ctx, pose) {
    drawTail(ctx, pose, P.tail);
    drawFeet(ctx, pose, '#4a3626'); // boots
    drawBackEar(ctx, P);

    // striped shirt
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, 23, 13, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#f6f1e7'; ctx.fillRect(-24, -14, 48, 28);
    ctx.fillStyle = '#d8433a';
    for (let x = -22; x < 24; x += 8) ctx.fillRect(x, -14, 4, 28);
    ctx.restore();
    ctx.strokeStyle = P.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 23, 13, 0, 0, Math.PI * 2); ctx.stroke();
    // belt with buckle
    ctx.fillStyle = '#3b2a1e'; ctx.fillRect(-23, 4, 46, 4);
    ctx.fillStyle = '#e0b33a'; ctx.fillRect(4, 3.5, 5, 5);

    drawHead(ctx, P, { eye: false });

    // eye patch and strap
    ctx.strokeStyle = '#1d1a18'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(12, -14); ctx.lineTo(29, -5); ctx.stroke();
    ctx.fillStyle = '#1d1a18'; ell(ctx, 21, -8, 4.6, 4.2);

    // gold earring
    ctx.strokeStyle = '#e0b33a'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(12, -6, 2.8, 0, Math.PI * 2); ctx.stroke();

    // tricorn hat with skull
    ctx.fillStyle = '#2a2320'; ctx.strokeStyle = '#e0b33a'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-1, -16);
    ctx.quadraticCurveTo(16, -22, 33, -15);
    ctx.quadraticCurveTo(31, -27, 25, -26);
    ctx.quadraticCurveTo(17, -40, 9, -27);
    ctx.quadraticCurveTo(1, -28, -1, -16);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ell(ctx, 17, -26, 3, 2.7);
    ctx.fillStyle = '#2a2320'; ell(ctx, 16, -26.3, 0.8, 0.8); ell(ctx, 18, -26.3, 0.8, 0.8);
  },
};
