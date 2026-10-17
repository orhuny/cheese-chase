import { TUNING } from '../config/tuning';
import { Camera } from '../core/camera';
import type { View } from '../core/canvas';
import { Emitter } from '../core/events';
import type { Input } from '../input/input';
import { Effects } from './effects';
import { createCat, updateCat, type Cat } from './entities/cat';
import { collectCheese, type Cheese } from './entities/cheese';
import { boostSpeed, createMouse, speedOf, type Mouse } from './entities/mouse';
import { updateTraps, type Trap } from './entities/trap';
import { physicsStep } from './physics';
import { spawnAtKeypoint } from './spawner';
import { Terrain } from './terrain';

export type GameState = 'menu' | 'play' | 'over';

export interface RunResult {
  runId: number;    // same id if the run was continued and ended again
  distance: number; // metres
  cheese: number;
  trapsJumped: number;
}

/** Everything other systems (audio, haptics, UI) may want to react to. */
export interface GameEvents {
  jump: void;
  perfect: { streak: number };
  zoom: void;
  boost: void;
  bonk: void;
  cheese: void;
  snap: void;
  gameOver: RunResult;
}

const T = TUNING.terrain;

/** The dust-cloud scuffle after being caught: where it is (world, cloud bottom centre) and how long it has played. */
export interface CaughtScene { x: number; y: number; t: number; }

/** One chase: the world, its rules, and its state. Knows nothing about screens, stores, or ads. */
export class Game {
  state: GameState = 'menu';
  cheese: Cheese[] = [];
  traps: Trap[] = [];
  mouse: Mouse = createMouse();
  cat: Cat = createCat();
  elapsed = 0;
  cheeseCount = 0;
  /** Cheese eaten in quick succession (see TUNING.cheese.comboWindow), and when the last one was. */
  cheeseCombo = 0;
  lastCheeseAt = -Infinity;
  trapsJumped = 0;
  runId = 0;
  /** How many times this run was continued after being caught. */
  continues = 0;
  /** Set while (and after) the cat and mouse scuffle; null during a run. */
  caught: CaughtScene | null = null;

  readonly terrain = new Terrain((p, high, d) => spawnAtKeypoint(p, high, d, this.cheese, this.traps));
  readonly fx = new Effects();
  readonly camera: Camera;
  readonly events = new Emitter<GameEvents>();
  private overAt = 0;

  constructor(private readonly view: View, readonly input: Input) {
    this.camera = new Camera(view);
  }

  reset(): void {
    this.cheese = []; this.traps = [];
    this.terrain.reset();
    this.mouse = createMouse();
    this.cat = createCat();
    this.elapsed = 0; this.cheeseCount = 0; this.trapsJumped = 0;
    this.cheeseCombo = 0; this.lastCheeseAt = -Infinity;
    this.caught = null;
    this.fx.reset();
    this.input.jumpBuffer = 0;
    this.camera.reset(this.mouse.x);
  }

  start(): void {
    this.reset();
    this.runId++;
    this.continues = 0;
    this.state = 'play';
    this.input.clear();
  }

  /** Second chance after being caught: the cat drops back and the run goes on. */
  continueRun(): void {
    if (this.state !== 'over') return;
    const m = this.mouse;
    this.continues++;
    this.caught = null;
    this.cat.x = m.x - TUNING.continueRun.catPushBack;
    m.stun = 0;
    if (speedOf(m) < TUNING.start.mouseSpeed) {
      m.vx = TUNING.start.mouseSpeed * m.tx;
      m.vy = TUNING.start.mouseSpeed * m.ty;
    }
    this.fx.popup('Go!', '#ffd23f');
    this.state = 'play';
    this.input.clear();
  }

  /** A Boost can start while running, but not while one is still going. */
  canBoost(): boolean {
    return this.state === 'play' && this.mouse.boost <= 0;
  }

  /** Starts a shop Boost. The caller pays for it (Economy.useBoost) first. */
  boost(): void {
    if (!this.canBoost()) return;
    const m = this.mouse;
    m.boost = TUNING.boost.duration;
    m.stun = 0;
    boostSpeed(m, TUNING.boost.speedKick);
    this.fx.impact('Boost!', '#2f8cff', '#ffd23f', '#fff6cf');
    this.fx.burst(m.x, m.y + 12, 18, ['#7fd3ff', '#ffffff', '#ffd23f'], 300, m.vx);
    this.events.emit('boost', undefined);
  }

  canStart(): boolean {
    return this.state === 'menu' || (this.state === 'over' && performance.now() - this.overAt > TUNING.flow.restartLockMs);
  }

  /** Distance in metres. */
  distance(): number {
    return Math.max(0, Math.floor(this.mouse.x / TUNING.world.unitsPerMeter));
  }

  /** How far behind the cat is, in metres. */
  catGap(): number {
    return Math.max(0, Math.floor((this.mouse.x - this.cat.x - TUNING.cat.catchDistance) / TUNING.world.unitsPerMeter));
  }

  update(dt: number): void {
    const m = this.mouse;
    this.elapsed += dt;
    this.input.jumpBuffer = Math.max(0, this.input.jumpBuffer - dt);

    const sub = TUNING.physics.substeps, h = dt / sub;
    for (let i = 0; i < sub; i++) physicsStep(this, h);
    m.fever = Math.max(0, m.fever - dt);
    m.boost = Math.max(0, m.boost - dt);
    m.chomp = Math.max(0, m.chomp - dt);
    m.stun = Math.max(0, m.stun - dt);

    // Keep the world just big enough around the mouse.
    this.terrain.ensure(this.camera.x + this.view.W / this.camera.scale + T.generateAhead);
    this.terrain.cull(m.x - T.keepBehind);
    const behind = m.x - T.itemsKeepBehind;
    if (this.cheese.length && this.cheese[0].x < behind) this.cheese = this.cheese.filter(f => f.x > behind);
    if (this.traps.length && this.traps[0].x < behind) this.traps = this.traps.filter(t => t.x > behind);

    collectCheese(this, dt);
    updateTraps(this);
    if (updateCat(this.cat, m, this.elapsed, dt)) this.gameOver();

    this.fx.trail(m);
    this.camera.update(m.x, m.y, dt);
  }

  /** Advances the caught scene (called every frame while the run is over). */
  updateOver(dt: number): void {
    if (this.caught) this.caught.t += dt;
  }

  private gameOver(): void {
    if (this.state !== 'play') return;
    this.state = 'over';
    // The scuffle happens where they meet; afterwards the mouse sits dizzy on the ground and the cat stands behind it.
    const m = this.mouse;
    const [gy] = this.terrain.ground(m.x - TUNING.cat.catchDistance / 2);
    this.caught = { x: m.x - TUNING.cat.catchDistance / 2, y: gy, t: 0 };
    const [my, s] = this.terrain.ground(m.x);
    const len = Math.hypot(1, s);
    m.y = my; m.onGround = true; m.tx = 1 / len; m.ty = s / len; m.vx = m.tx; m.vy = m.ty;
    m.stun = Infinity; m.fever = 0; m.boost = 0;
    this.cat.x = m.x - TUNING.cat.catchDistance - TUNING.caught.catSitsBehind;
    this.overAt = performance.now();
    this.input.clear();
    this.events.emit('gameOver', { runId: this.runId, distance: this.distance(), cheese: this.cheeseCount, trapsJumped: this.trapsJumped });
  }
}
