import { ell, ellS, roundRectPath } from '../render/draw';
import type { MouseSkin } from './MouseSkin';
import { CLASSIC_PALETTE, drawEye, drawFeet, drawTail, drawWhiskers } from './parts';

const P = CLASSIC_PALETTE;
const SUIT = '#f3f5f9';
const SUIT_LINE = '#9aa3b5';

/** A mouse in a white space suit with a glass bubble helmet and backpack. */
export const astronautMouse: MouseSkin = {
  id: 'astronaut',
  name: 'Astronaut Mouse',
  draw(ctx, pose) {
    const { time } = pose;
    drawTail(ctx, pose, P.tail);
    drawFeet(ctx, pose, '#d5dae4');

    // backpack
    ctx.strokeStyle = SUIT_LINE; ctx.lineWidth = 2;
    ctx.fillStyle = '#cfd5e0';
    roundRectPath(ctx, -26, -16, 14, 22, 4); ctx.fill(); ctx.stroke();

    // suit
    ellS(ctx, 0, 0, 23, 13, 0, SUIT);
    ctx.fillStyle = '#dfe4ee'; ell(ctx, 4, 5, 13, 5.5);
    // chest panel lights
    ctx.fillStyle = '#ff6b5b'; ell(ctx, -2, -3, 2, 2);
    ctx.fillStyle = '#4aa8ec'; ell(ctx, 4, -4, 2, 2);
    ctx.fillStyle = '#ffd23f'; ell(ctx, 10, -3, 2, 2);

    // mouse head inside the helmet (small ear so it fits)
    ctx.strokeStyle = P.outline; ctx.lineWidth = 2;
    ellS(ctx, 17, -6, 11, 9.5, 0, P.fur);
    ellS(ctx, 10, -17, 7, 8, 0.2, P.fur);
    ctx.fillStyle = P.earInner; ell(ctx, 10, -17, 4.5, 5, 0.2);
    ctx.fillStyle = P.fur; ell(ctx, 26, -4, 7.5, 5);
    ctx.fillStyle = P.nose; ell(ctx, 33, -5, 3, 2.7);
    ctx.save(); ctx.translate(-1, -2); drawEye(ctx, P); ctx.restore();
    ctx.save(); ctx.translate(-2, -2); drawWhiskers(ctx, 6); ctx.restore();

    // helmet collar
    ctx.strokeStyle = SUIT_LINE; ctx.lineWidth = 2;
    ellS(ctx, 17, 9, 12, 4, 0, '#d5dae4');

    // glass bubble with a moving glint
    ctx.fillStyle = 'rgba(170,220,255,0.25)';
    ctx.strokeStyle = '#c3cede'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(18, -8, 21, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(18, -8, 16, -2.6, -1.9); ctx.stroke();

    // antenna with a blinking light
    ctx.strokeStyle = SUIT_LINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(14, -29); ctx.lineTo(11, -37); ctx.stroke();
    ctx.fillStyle = Math.sin(time * 6) > 0 ? '#ff6b5b' : '#ffb3aa'; ell(ctx, 11, -38, 2.6, 2.6);
  },
};
