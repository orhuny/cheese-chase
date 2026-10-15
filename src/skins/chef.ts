import { ell, ellS } from '../render/draw';
import type { MouseSkin } from './MouseSkin';
import { CLASSIC_PALETTE, drawBackEar, drawBody, drawFeet, drawHead, drawTail } from './parts';

const P = { ...CLASSIC_PALETTE, fur: '#c7a27c', furBack: '#b08b66', outline: '#7f5f42', belly: '#ecdcc8' };

/** A tan mouse in a white chef's coat and tall hat, with a curly moustache. */
export const chefMouse: MouseSkin = {
  id: 'chef',
  name: 'Chef Mouse',
  draw(ctx, pose) {
    drawTail(ctx, pose, P.tail);
    drawFeet(ctx, pose, P.feet);
    drawBackEar(ctx, P);
    // white chef's coat with two rows of buttons
    drawBody(ctx, P, '#fbfaf6', null);
    ctx.fillStyle = '#c8c2b6';
    for (const [x, y] of [[2, -5], [2, 2], [9, -4], [9, 3]]) ell(ctx, x, y, 1.4, 1.4);

    drawHead(ctx, P);

    // red neckerchief
    ctx.fillStyle = '#d9473b';
    ctx.beginPath(); ctx.moveTo(6, 2); ctx.quadraticCurveTo(13, 7, 21, 4); ctx.lineTo(14, 13); ctx.closePath(); ctx.fill();

    // curly moustache under the nose
    ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(32, 1); ctx.quadraticCurveTo(28, 5, 24, 2); ctx.quadraticCurveTo(23, 0, 25, -0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 1); ctx.quadraticCurveTo(37, 5, 40, 1.5); ctx.quadraticCurveTo(41, -0.5, 39.5, -1); ctx.stroke();

    // tall chef's hat
    ctx.strokeStyle = '#c9c4ba'; ctx.lineWidth = 1.6;
    ellS(ctx, 10, -29, 7.5, 7.5, 0, '#ffffff');
    ellS(ctx, 24, -29, 7.5, 7.5, 0, '#ffffff');
    ellS(ctx, 17, -34, 9, 9, 0, '#ffffff');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.rect(8, -28, 18, 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -26); ctx.lineTo(8, -15); ctx.moveTo(26, -26); ctx.lineTo(26, -15); ctx.stroke();
    ctx.beginPath(); ctx.rect(7, -18, 20, 5); ctx.fill(); ctx.stroke();
  },
};
