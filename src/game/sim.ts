import { TILE, type RoomDef, type EyeDef, type PropDef } from "./levels";

export const PLAYER_SPEED = 92;
export const PLAYER_RADIUS = 9;
export const MOVE_THRESHOLD = 16;
export const START_GRACE = 0.85;

export type EyeState = EyeDef & {
  x: number;
  y: number;
  open: number;
  facingNow: number;
  seeing: boolean;
  canCatch: boolean;
  warning: boolean;
  wasOpen: boolean;
};

export type ShardState = { x: number; y: number; taken: boolean; pulse: number };
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

export type Sim = {
  room: RoomDef;
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    dir: 0 | 1 | 2 | 3;
    anim: number;
    spawnX: number;
    spawnY: number;
  };
  eyes: EyeState[];
  shards: ShardState[];
  door: { x: number; y: number };
  time: number;
  grace: number;
  watched: boolean;
  warning: boolean;
  caught: boolean;
  doorReady: boolean;
  roomClear: boolean;
  particles: Particle[];
  trauma: number;
  hitstop: number;
  flash: number;
};

export type SimEvents = {
  onShard?: () => void;
  onCaught?: () => void;
  onDoor?: () => void;
  onEyeOpen?: () => void;
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function wrapAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function eyeOpenAmount(t: number, e: EyeDef) {
  const period = e.closed + e.trans + e.open + e.trans;
  let u = ((t + e.offset) % period + period) % period;
  if (u < e.closed) return 0;
  u -= e.closed;
  if (u < e.trans) return u / e.trans;
  u -= e.trans;
  if (u < e.open) return 1;
  u -= e.open;
  return 1 - u / e.trans;
}

function blocked(room: RoomDef, tx: number, ty: number) {
  if (ty < 0 || tx < 0 || ty >= room.rows || tx >= room.cols) return true;
  return room.solid[ty]![tx]!;
}

function losBlocked(room: RoomDef, tx: number, ty: number) {
  if (ty < 0 || tx < 0 || ty >= room.rows || tx >= room.cols) return true;
  return room.solid[ty]![tx]!;
}

function circleHits(room: RoomDef, x: number, y: number, r: number) {
  const minC = Math.floor((x - r) / TILE);
  const maxC = Math.floor((x + r) / TILE);
  const minR = Math.floor((y - r) / TILE);
  const maxR = Math.floor((y + r) / TILE);
  for (let ty = minR; ty <= maxR; ty++) {
    for (let tx = minC; tx <= maxC; tx++) {
      if (!blocked(room, tx, ty)) continue;
      const rx = tx * TILE;
      const ry = ty * TILE;
      const cx = clamp(x, rx, rx + TILE);
      const cy = clamp(y, ry, ry + TILE);
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

function hasLos(room: RoomDef, x0: number, y0: number, x1: number, y1: number) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(6, Math.ceil(dist / (TILE * 0.35)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (losBlocked(room, tx, ty)) return false;
  }
  return true;
}

function spawnBurst(sim: Sim, x: number, y: number, color: string, n: number, speed: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random());
    sim.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.4 + Math.random() * 0.5,
      max: 0.9,
      size: 1.2 + Math.random() * 2.2,
      color,
    });
  }
}

export function makeSim(room: RoomDef): Sim {
  const eyes: EyeState[] = room.eyes.map((e) => {
    const facing = e.facing;
    return {
      ...e,
      x: (e.tx + 0.5) * TILE + Math.cos(facing) * TILE * 0.42,
      y: (e.ty + 0.5) * TILE + Math.sin(facing) * TILE * 0.42,
      open: 0,
      facingNow: facing,
      seeing: false,
      canCatch: false,
      warning: false,
      wasOpen: false,
    };
  });
  return {
    room,
    player: {
      x: room.player.x,
      y: room.player.y,
      vx: 0,
      vy: 0,
      dir: 0,
      anim: 0,
      spawnX: room.player.x,
      spawnY: room.player.y,
    },
    eyes,
    shards: room.shards.map((s) => ({ ...s, taken: false, pulse: Math.random() * Math.PI * 2 })),
    door: { ...room.door },
    time: 0,
    grace: START_GRACE,
    watched: false,
    warning: false,
    caught: false,
    doorReady: false,
    roomClear: false,
    particles: [],
    trauma: 0,
    hitstop: 0,
    flash: 0,
  };
}

export function resetPlayer(sim: Sim) {
  sim.player.x = sim.player.spawnX;
  sim.player.y = sim.player.spawnY;
  sim.player.vx = 0;
  sim.player.vy = 0;
  sim.caught = false;
  sim.grace = START_GRACE;
  sim.trauma = 0;
}

export function stepSim(
  sim: Sim,
  moveX: number,
  moveY: number,
  dt: number,
  events: SimEvents,
) {
  if (sim.hitstop > 0) {
    sim.hitstop = Math.max(0, sim.hitstop - dt);
    dt *= 0.15;
  }

  sim.time += dt;
  sim.grace = Math.max(0, sim.grace - dt);
  sim.trauma = Math.max(0, sim.trauma - dt * 1.8);
  sim.flash = Math.max(0, sim.flash - dt * 2.4);

  const p = sim.player;
  p.vx = moveX * PLAYER_SPEED;
  p.vy = moveY * PLAYER_SPEED;
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > 1) {
    if (Math.abs(p.vx) > Math.abs(p.vy)) p.dir = p.vx < 0 ? 1 : 2;
    else p.dir = p.vy < 0 ? 3 : 0;
    p.anim += dt * 7.2;
  } else {
    p.anim += dt * 1.6;
  }

  const nx = p.x + p.vx * dt;
  if (!circleHits(sim.room, nx, p.y, PLAYER_RADIUS)) p.x = nx;
  const ny = p.y + p.vy * dt;
  if (!circleHits(sim.room, p.x, ny, PLAYER_RADIUS)) p.y = ny;

  p.x = clamp(p.x, PLAYER_RADIUS, sim.room.cols * TILE - PLAYER_RADIUS);
  p.y = clamp(p.y, PLAYER_RADIUS, sim.room.rows * TILE - PLAYER_RADIUS);

  let watched = false;
  let warning = false;

  for (const eye of sim.eyes) {
    eye.open = eyeOpenAmount(sim.time, eye);
    eye.facingNow = eye.facing + Math.sin(sim.time * eye.panSpeed + eye.offset) * eye.panAmp;
    const dx = p.x - eye.x;
    const dy = p.y - eye.y;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const delta = Math.abs(wrapAngle(ang - eye.facingNow));
    const inCone = dist <= eye.range && delta <= eye.cone / 2;
    const visible = inCone && hasLos(sim.room, eye.x, eye.y, p.x, p.y);
    eye.seeing = visible && eye.open > 0.32;
    eye.warning = visible && eye.open >= 0.32 && eye.open < 0.8;
    eye.canCatch = visible && eye.open >= 0.8;
    if (eye.seeing) watched = true;
    if (eye.warning) warning = true;
    if (eye.open > 0.55 && !eye.wasOpen) events.onEyeOpen?.();
    eye.wasOpen = eye.open > 0.55;
  }

  sim.watched = watched;
  sim.warning = warning || watched;

  if (!sim.caught && !sim.roomClear && sim.grace <= 0) {
    const moving = speed > MOVE_THRESHOLD;
    if (moving && sim.eyes.some((e) => e.canCatch)) {
      sim.caught = true;
      sim.trauma = 1;
      sim.hitstop = 0.16;
      sim.flash = 1;
      spawnBurst(sim, p.x, p.y, "#c45c4a", 18, 70);
      events.onCaught?.();
    }
  }

  for (const shard of sim.shards) {
    shard.pulse += dt * 3.2;
    if (shard.taken) continue;
    if (Math.hypot(shard.x - p.x, shard.y - p.y) < 20) {
      shard.taken = true;
      spawnBurst(sim, shard.x, shard.y, "#d4b45a", 14, 55);
      events.onShard?.();
    }
  }

  const taken = sim.shards.filter((s) => s.taken).length;
  sim.doorReady = taken >= 1;
  if (
    sim.doorReady &&
    !sim.roomClear &&
    Math.hypot(sim.door.x - p.x, sim.door.y - p.y) < 42
  ) {
    sim.roomClear = true;
    events.onDoor?.();
  }

  for (let i = sim.particles.length - 1; i >= 0; i--) {
    const q = sim.particles[i]!;
    q.life -= dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.92;
    q.vy *= 0.92;
    if (q.life <= 0) sim.particles.splice(i, 1);
  }
  if (sim.particles.length > 90) sim.particles.splice(0, sim.particles.length - 90);
}

export function remainingShards(sim: Sim) {
  return sim.shards.filter((s) => !s.taken).length;
}

export function collectedShards(sim: Sim) {
  return sim.shards.filter((s) => s.taken).length;
}

export type { PropDef };
