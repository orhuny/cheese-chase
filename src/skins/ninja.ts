import { ell } from '../render/draw';
import type { MouseSkin } from './MouseSkin';
import { CLASSIC_PALETTE, drawBackEar, drawBody, drawEye, drawFeet, drawHead, drawTail, drawWhiskers, type MousePalette } from './parts';

const SUIT: MousePalette = {
  ...CLASSIC_PALETTE,
  fur: '#2f3850',
  furBack: '#252c40',
  outline: '#171c2a',
  belly: '#3c4762',
  feet: '#2f3850',
};

/** A grey mouse in a dark ninja suit and hood, with a red headband fluttering behind. */
export const ninjaMouse: MouseSkin = {
  id: 'ninja',
  name: 'Ninja Mouse',
  draw(ctx, pose) {
    const { time } = pose;
    drawTail(ctx, pose, CLASSIC_PALETTE.tail);
    drawFeet(ctx, pose, SUIT.feet);

    // headband tails, flapping in the wind (behind everything else)
    ctx.strokeStyle = '#d93a3a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(4, -12);
    ctx.quadraticCurveTo(-8, -18 + Math.sin(time * 14) * 3, -20, -14 + Math.sin(time * 14 + 1) * 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -11);
    ctx.quadraticCurveTo(-6, -8 + Math.sin(time * 12 + 2) * 3, -17, -5 + Math.sin(time * 12 + 3) * 5); ctx.stroke();

    drawBackEar(ctx, { ...CLASSIC_PALETTE, outline: SUIT.outline });
    drawBody(ctx, SUIT);
    // belt
    ctx.fillStyle = '#d93a3a'; ctx.fillRect(-4, -12, 4, 24);

    // hooded head with grey snout showing
    drawHead(ctx, SUIT, { eye: false, whiskers: false, ear: false });
    ctx.strokeStyle = CLASSIC_PALETTE.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(8, -19, 11, 12, 0.2, 0, Math.PI * 2); ctx.fillStyle = CLASSIC_PALETTE.fur; ctx.fill(); ctx.stroke();
    ctx.fillStyle = CLASSIC_PALETTE.earInner; ell(ctx, 8, -19, 7, 8, 0.2);
    ctx.fillStyle = CLASSIC_PALETTE.fur; ell(ctx, 28, -2, 8, 5.5);
    ctx.fillStyle = CLASSIC_PALETTE.nose; ell(ctx, 35, -3, 3.4, 3);

    // eye slit
    ctx.fillStyle = '#e8dccb'; ell(ctx, 21, -8, 6, 3.6);
    drawEye(ctx, CLASSIC_PALETTE);
    // angry brow
    ctx.strokeStyle = '#171c2a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(16, -12.5); ctx.lineTo(25, -11); ctx.stroke();

    // headband across the forehead
    ctx.strokeStyle = '#d93a3a'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(5, -12); ctx.quadraticCurveTo(16, -15.5, 27, -12.5); ctx.stroke();
    ctx.fillStyle = '#b02828'; ell(ctx, 4, -11.5, 3, 3);
    drawWhiskers(ctx);
  },
};
