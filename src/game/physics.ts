import { TUNING } from '../config/tuning';
import { clamp } from '../core/math';
import { DUST } from './effects';
import type { Game } from './Game';

const P = TUNING.physics;
const J = TUNING.jump;
const L = TUNING.landing;
const D = TUNING.dive;

/** Jump along the ground normal (perpendicular to the slope). */
function doJump(g: Game): void {
  const m = g.mouse;
  m.vx += -m.ty * J.strength; m.vy += m.tx * J.strength;
  m.y += J.liftOff; m.onGround = false; m.air = 0; m.coyote = 0;
  g.input.jumpBuffer = 0;
  g.fx.burst(m.x, m.y, 6, DUST, 120, m.vx);
  g.events.emit('jump', undefined);
}

/** Judge a landing: Perfect (smooth, on a downhill), Bonk (crash), or neither. Returns the new speed along the slope. */
function land(g: Game, gy: number, tx: number, ty: number, vt: number): number {
  const m = g.mouse;
  if (m.air > L.minAirTime) {
    const diff = Math.abs(Math.atan2(m.vy, m.vx) - Math.atan2(ty, tx));
    if (diff < L.perfectMaxAngle && ty < -L.perfectMinDownslope) {
      m.streak++;
      vt = vt * L.perfectSpeedMult + L.perfectSpeedBonus;
      if (m.streak >= L.zoomStreak) {
        m.fever = L.zoomDuration;
        g.fx.popup('Zoom!', '#ffd23f');
        g.events.emit('zoom', undefined);
      } else {
        g.fx.popup(m.streak > 1 ? 'Perfect x' + m.streak : 'Perfect!', '#ffffff');
        g.events.emit('perfect', { streak: m.streak });
      }
      g.fx.burst(m.x, gy, 16, ['#ffffff', '#fff1b8', '#ffd23f'], 260, m.vx);
    } else if (diff > L.bonkMinAngle) {
      m.streak = 0;
      g.fx.popup('Bonk!', '#f3e6d6');
      g.fx.burst(m.x, gy, 8, DUST, 160, m.vx);
      g.events.emit('bonk', undefined);
    }
  }
  m.air = 0;
  return vt;
}

/** One small physics step of h seconds. */
export function physicsStep(g: Game, h: number): void {
  const m = g.mouse;
  if (g.input.jumpBuffer > 0 && m.stun <= 0 && (m.onGround || m.coyote > 0)) doJump(g);

  const diving = g.input.diving() && m.stun <= 0;
  const mult = diving ? (m.onGround ? D.gravityMultGround : D.gravityMultAir) : 1;
  m.vy -= P.gravity * mult * h;
  if (m.fever > 0) {
    const sp = Math.hypot(m.vx, m.vy) || 1;
    m.vx += m.vx / sp * L.zoomAccel * h; m.vy += m.vy / sp * L.zoomAccel * h;
  }
  m.x += m.vx * h; m.y += m.vy * h;

  const [gy, s] = g.terrain.ground(m.x);
  if (m.y <= gy) {
    // On (or below) the ground: slide along the slope.
    const len = Math.hypot(1, s), tx = 1 / len, ty = s / len;
    let vt = m.vx * tx + m.vy * ty;
    if (!m.onGround) vt = land(g, gy, tx, ty, vt);
    vt *= (1 - P.groundFriction * h);
    vt = clamp(vt, P.minGroundSpeed, P.maxGroundSpeed);
    m.vx = vt * tx; m.vy = vt * ty; m.y = gy; m.onGround = true;
    m.tx = tx; m.ty = ty; m.coyote = J.coyoteTime;
  } else {
    if (m.y > gy + P.groundSnap) m.onGround = false;
    if (!m.onGround) { m.air += h; m.coyote -= h; }
  }
}
