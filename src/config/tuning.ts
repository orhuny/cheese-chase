/**
 * ALL gameplay tuning numbers live in this one file.
 *
 * Units:
 *  - Distances are "world units". 40 units = 1 metre on the HUD.
 *  - Times are seconds, speeds are units per second.
 *  - The world's y axis points UP (bigger y = higher on screen).
 *
 * The values below are copied exactly from the original prototype.
 * Change one, save, and the browser reloads with the new feel.
 */
export const TUNING = {
  world: {
    unitsPerMeter: 40,
  },

  start: {
    mouseSpeed: 330,     // horizontal speed at the start of a run
    mouseY: 320,         // must match the last startPoints height below
  },

  physics: {
    gravity: 1500,
    substeps: 5,         // physics steps per frame (more = more precise)
    maxFrameTime: 1 / 30, // a slow frame is never simulated as longer than this
    minGroundSpeed: 150,
    maxGroundSpeed: 2500,
    groundFriction: 0.02, // fraction of speed lost per second while on the ground
    groundSnap: 3,        // leaves the ground when this far above it
  },

  dive: {
    gravityMultGround: 2.3, // gravity multiplier while diving on the ground
    gravityMultAir: 3.4,    // gravity multiplier while diving in the air
  },

  jump: {
    strength: 640,       // push along the ground normal
    bufferTime: 0.15,    // a jump pressed this early before landing still counts
    coyoteTime: 0.1,     // you can still jump this long after leaving the ground
    liftOff: 3,          // tiny upward nudge so the jump leaves the ground
  },

  landing: {
    minAirTime: 0.35,         // shorter hops never count as Perfect or Bonk
    perfectMaxAngle: 0.3,    // radians between flight direction and slope
    perfectMinDownslope: 0.08, // the slope must go at least this much downhill
    perfectSpeedMult: 1.1,
    perfectSpeedBonus: 70,
    bonkMinAngle: 0.75,      // landing this badly resets the streak
    zoomStreak: 3,           // perfect landings in a row for "Zoom!"
    zoomDuration: 2.6,
    zoomAccel: 480,          // extra acceleration per second during Zoom
  },

  cheese: {
    speedBoost: 110,     // instant speed gained per cheese (also cures dizziness)
    pickupRangeX: 55,
    pickupRangeY: 48,
    mouseCenterY: 12,    // the mouse's middle is this high above its feet
    // placement
    valleyHeight: 34,
    secondChance: 0.5,
    secondOffsetX: 70,
    secondHeight: 48,
    arcChance: 0.4,      // chance of a cheese arc after a hill top
    arcCount: 5,
    arcSpacing: 85,
    arcHeight: 150,
    arcBulge: 70,
  },

  traps: {
    firstTrapX: 2500,            // no traps before this point
    chance: 0.4,                 // chance per valley at the start
    extraChanceAtMaxDifficulty: 0.35,
    beforeValleyChance: 0.5,     // otherwise the trap goes after the valley
    beforeMin: 120, beforeMax: 210,
    afterMin: 160, afterMax: 240,
    hitHalfWidth: 24,
    hitHeight: 18,               // mouse must be higher than this to clear it
    stunTime: 0.8,
    speedKept: 0.4,              // fraction of speed kept after a snap
  },

  cat: {
    startX: -1100,
    baseSpeed: 260,
    speedGainPerSecond: 6,       // the cat speeds up the longer the run lasts
    maxSpeed: 1150,
    maxDistanceBehind: 1900,     // the cat is never further back than this
    catchDistance: 70,
  },

  terrain: {
    maxDifficultyDistance: 60000, // difficulty ramps from 0 to 1 over this distance
    segmentMinWidth: 520,
    segmentMaxWidth: 760,
    extraWidthAtMaxDifficulty: 320,
    peakMin: 210, peakMax: 290,
    extraPeakAtMaxDifficulty: 150,
    valleyMin: 30, valleyMax: 90,
    startPoints: [
      { x: -3000, y: 300 },
      { x: -1200, y: 310 },
      { x: 0, y: 320 },
    ],
    initialLength: 6000,
    generateAhead: 1500,  // build hills this far past the right screen edge
    keepBehind: 5000,     // forget hills this far behind the mouse
    itemsKeepBehind: 3000,
  },

  camera: {
    designHeight: 620,     // the world is scaled so this much height fits
    designWidth: 720,
    followX: 0.3,          // mouse sits 30% from the left edge
    highFlyScreenFraction: 0.82,
    highFlyPadding: 200,
    zoomSpeed: 3,
    groundOffset: 40,
    minSpriteScale: 0.55,  // characters never shrink below this when zoomed out
  },

  display: {
    maxPixelRatio: 2,      // cap for high-DPI screens (keeps 60 fps on iPhones)
  },

  continueRun: {
    // Used only by the (disabled) "watch an ad to continue" feature.
    catPushBack: 1200,   // the cat restarts this far behind the mouse (30 m)
  },

  flow: {
    gameOverScreenDelayMs: 450,
    restartLockMs: 800,    // ignore taps this long after being caught
  },
} as const;
