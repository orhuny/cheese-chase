import { TUNING } from '../config/tuning';
import { Camera } from '../core/camera';
import type { View } from '../core/canvas';
import { Emitter } from '../core/events';
import type { Input } from '../input/input';
import { Effects } from './effects';
import { createCat, updateCat, type Cat } from './entities/cat';
import { collectCheese, type Cheese } from './entities/cheese';
import { createMouse, speedOf, type Mouse } from './entities/mouse';
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
  bonk: void;
  cheese: void;
  snap: void;
  gameOver: RunResult;
}

const T = TUNING.terrain;

/** One chase: the world, its rules, and its state. Knows nothing about screens, stores, or ads. */
export class Game {
  state: GameState = 'menu';
  cheese: Cheese[] = [];
  traps: Trap[] = [];
  mouse: Mouse = createMouse();
  cat: Cat = createCat();
  elapsed = 0;
  cheeseCount = 0;
  trapsJumped = 0;
  runId = 0;
  /** How many times this run was continued after being caught. */
  continues = 0;

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
    m.stun = Math.max(0, m.stun - dt);

    // Keep the world just big enough around the mouse.
    this.terrain.ensure(this.camera.x + this.view.W / this.camera.scale + T.generateAhead);
    this.terrain.cull(m.x - T.keepBehind);
    const behind = m.x - T.itemsKeepBehind;
    if (this.cheese.length && this.cheese[0].x < behind) this.cheese = this.cheese.filter(f => f.x > behind);
    if (this.traps.length && this.traps[0].x < behind) this.traps = this.traps.filter(t => t.x > behind);

    collectCheese(this);
    updateTraps(this);
    if (updateCat(this.cat, m, this.elapsed, dt)) this.gameOver();

    this.fx.trail(m);
    this.camera.update(m.x, m.y, dt);
  }

  private gameOver(): void {
    if (this.state !== 'play') return;
    this.state = 'over';
    this.overAt = performance.now();
    this.input.clear();
    this.events.emit('gameOver', { runId: this.runId, distance: this.distance(), cheese: this.cheeseCount, trapsJumped: this.trapsJumped });
  }
}
