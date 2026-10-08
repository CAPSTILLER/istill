import { TILE, type PropKind } from "./levels";
import type { Sim } from "./sim";
import type { Sprites } from "./sprites";

const INK = "#5d00b1";
const WALL = "#f6f6f3";
const WALL_EDGE = "#c5cdd8";
const WALL_PENCIL = "rgba(70, 110, 170, 0.35)";

const PROP_CELL: Record<PropKind, [number, number]> = {
  chair: [0, 0],
  table: [1, 0],
  crate: [0, 1],
  plant: [1, 1],
};

type Camera = { scale: number; ox: number; oy: number };

export function fitCamera(viewW: number, viewH: number, cols: number, rows: number): Camera {
  const worldW = cols * TILE;
  const worldH = rows * TILE;
  const scale = Math.min(viewW / (worldW + 24), viewH / (worldH + 24));
  return {
    scale,
    ox: (viewW - worldW * scale) / 2,
    oy: (viewH - worldH * scale) / 2,
  };
}

function applyCam(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  shakeX: number,
  shakeY: number,
  dpr: number,
) {
  ctx.setTransform(
    cam.scale * dpr,
    0,
    0,
    cam.scale * dpr,
    (cam.ox + shakeX) * dpr,
    (cam.oy + shakeY) * dpr,
  );
}

function screen(ctx: CanvasRenderingContext2D, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawSheet(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cols: number,
  rows: number,
  col: number,
  row: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const cw = img.width / cols;
  const ch = img.height / rows;
  ctx.drawImage(img, col * cw, row * ch, cw, ch, dx, dy, dw, dh);
}

function drawFloor(ctx: CanvasRenderingContext2D, sim: Sim, floor: HTMLImageElement | null) {
  const w = sim.room.cols * TILE;
  const h = sim.room.rows * TILE;
  ctx.fillStyle = "#c9c7c3";
  ctx.fillRect(0, 0, w, h);
  if (floor) {
    ctx.save();
    const s = 0.22;
    ctx.scale(s, s);
    const pat = ctx.createPattern(floor, "repeat");
    if (pat) {
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w / s, h / s);
    }
    ctx.restore();
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, sim: Sim) {
  for (let ty = 0; ty < sim.room.rows; ty++) {
    for (let tx = 0; tx < sim.room.cols; tx++) {
      if (!sim.room.walls[ty]![tx]) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      ctx.fillStyle = WALL;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = WALL_EDGE;
      ctx.fillRect(x, y, TILE, 2);
      ctx.strokeStyle = WALL_PENCIL;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      ctx.fillStyle = "rgba(180, 190, 205, 0.35)";
      ctx.fillRect(x, y + TILE - 3, TILE, 3);
    }
  }
}

function doorVisual(sim: Sim, _door: HTMLImageElement | null) {
  const visW = TILE * 2;
  const visH = TILE * 3;
  return {
    visX: (sim.room.cols - 1) * TILE - visW,
    visY: TILE,
    visW,
    visH,
  };
}

function drawMoths(
  ctx: CanvasRenderingContext2D,
  moth: HTMLImageElement,
  visX: number,
  visY: number,
  visW: number,
  visH: number,
  time: number,
  ready: boolean,
) {
  const holeX = visX + visW * 0.5;
  const holeY = visY + visH * 0.36;
  const n = ready ? 11 : 8;
  for (let i = 0; i < n; i++) {
    const t = time * (0.85 + i * 0.09) + i * 1.9;
    const rx = visW * (0.16 + (i % 4) * 0.045);
    const ry = visH * (0.12 + (i % 3) * 0.04);
    const x = holeX + Math.sin(t) * rx;
    const y = holeY + Math.cos(t * 1.35 + i) * ry;
    const frame = Math.floor(t * 7 + i) % 4;
    const col = frame % 2;
    const row = Math.floor(frame / 2);
    const s = 11 + (i % 4) * 3;
    ctx.globalAlpha = ready ? 0.95 : 0.78;
    drawSheet(ctx, moth, 2, 2, col, row, x - s / 2, y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  light: CanvasRenderingContext2D,
  sim: Sim,
  sprites: Sprites | null,
  viewW: number,
  viewH: number,
  reduced: boolean,
  dpr: number,
) {
  screen(ctx, dpr);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, viewW, viewH);

  const cam = fitCamera(viewW, viewH, sim.room.cols, sim.room.rows);
  const shakeMag = reduced ? 0 : sim.trauma * sim.trauma * 7;
  const shakeX = (Math.random() * 2 - 1) * shakeMag;
  const shakeY = (Math.random() * 2 - 1) * shakeMag;

  applyCam(ctx, cam, shakeX, shakeY, dpr);
  ctx.imageSmoothingEnabled = true;
  drawFloor(ctx, sim, sprites?.floor ?? null);
  drawWalls(ctx, sim);

  if (sprites) {
    for (const prop of sim.room.props) {
      const [col, row] = PROP_CELL[prop.kind];
      const x = prop.tx * TILE;
      const y = prop.ty * TILE - 6;
      drawSheet(ctx, sprites.props, 2, 2, col, row, x - 2, y - 4, TILE + 4, TILE + 10);
    }
  }

  const { visX, visY, visW, visH } = doorVisual(sim, sprites?.door ?? null);
  const doorGlow = sim.doorReady ? 0.55 + Math.sin(sim.time * 4) * 0.2 : 0.18;
  if (sprites) {
    ctx.save();
    ctx.beginPath();
    for (let ty = 0; ty < sim.room.rows; ty++) {
      for (let tx = 0; tx < sim.room.cols; tx++) {
        if (!sim.room.walls[ty]![tx]) ctx.rect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    ctx.clip();
    const hx = visX + visW / 2;
    const hy = visY + visH * 0.36;
    const g = ctx.createRadialGradient(hx, hy, 4, hx, hy, visW * 0.55);
    g.addColorStop(0, `rgba(255,210,110,${0.22 + doorGlow * 0.5})`);
    g.addColorStop(1, "rgba(255,180,60,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, visW * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(sprites.door, visX, visY, visW, visH);
    ctx.restore();
    drawMoths(ctx, sprites.moth, visX, visY, visW, visH, sim.time, sim.doorReady);
  } else {
    ctx.fillStyle = "#2a2118";
    ctx.fillRect(visX, visY, visW, visH);
  }

  for (const shard of sim.shards) {
    if (shard.taken) continue;
    const bob = Math.sin(shard.pulse) * 3;
    if (sprites) {
      const frame = Math.floor(shard.pulse * 1.5) % 4;
      const col = frame % 2;
      const row = Math.floor(frame / 2);
      drawSheet(ctx, sprites.shard, 2, 2, col, row, shard.x - 18, shard.y - 18 + bob, 36, 36);
    } else {
      ctx.fillStyle = "#d4b45a";
      ctx.beginPath();
      ctx.arc(shard.x, shard.y + bob, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const p = sim.player;
  if (sprites) {
    const moving = Math.hypot(p.vx, p.vy) > 8;
    const pw = 42;
    const ph = 48;
    if (moving) {
      const frame = Math.floor(p.anim) % 4;
      drawSheet(ctx, sprites.playerWalk, 4, 4, frame, p.dir, p.x - pw / 2, p.y - ph + 6, pw, ph);
    } else {
      const frame = Math.floor(p.anim * 0.6) % 4;
      const col = frame % 2;
      const row = Math.floor(frame / 2);
      drawSheet(ctx, sprites.playerIdle, 2, 2, col, row, p.x - pw / 2, p.y - ph + 6, pw, ph);
    }
  } else {
    ctx.fillStyle = "#e8e4dc";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 10, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const eye of sim.eyes) {
    if (!sprites) continue;
    let frame = 0;
    if (eye.open < 0.28) {
      frame = 0;
    } else if (eye.open < 0.55) {
      frame = 1;
    } else {
      frame = 2 + (Math.floor(sim.time * 3) % 2);
    }
    const col = frame % 2;
    const row = Math.floor(frame / 2);
    const sizeW = 54;
    const sizeH = 62;
    ctx.save();
    ctx.translate(eye.x, eye.y);
    const facingLeft = Math.cos(eye.facingNow) < -0.3;
    if (facingLeft) ctx.scale(-1, 1);
    if (eye.open > 0.4) {
      const g = ctx.createRadialGradient(0, -8, 2, 0, -8, 28);
      g.addColorStop(0, `rgba(255,210,90,${0.35 + eye.open * 0.35})`);
      g.addColorStop(1, "rgba(255,180,60,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -8, 28, 0, Math.PI * 2);
      ctx.fill();
    }
    drawSheet(ctx, sprites.eye, 2, 2, col, row, -sizeW / 2, -sizeH / 2, sizeW, sizeH);
    ctx.restore();
  }

  for (const q of sim.particles) {
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x, q.y, q.size, q.size);
  }
  ctx.globalAlpha = 1;

  screen(light, dpr);
  light.clearRect(0, 0, viewW, viewH);
  applyCam(light, cam, shakeX, shakeY, dpr);
  const lw = sim.room.cols * TILE;
  const lh = sim.room.rows * TILE;
  light.fillStyle = sim.watched ? "rgba(0,0,0,0.94)" : "rgba(5,0,12,0.88)";
  light.fillRect(-20, -20, lw + 40, lh + 40);
  light.globalCompositeOperation = "destination-out";

  const punch = (x: number, y: number, r: number, inner: number) => {
    const g = light.createRadialGradient(x, y, inner, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    light.fillStyle = g;
    light.beginPath();
    light.arc(x, y, r, 0, Math.PI * 2);
    light.fill();
  };
  punch(p.x, p.y - 10, 148, 8);
  for (const shard of sim.shards) {
    if (!shard.taken) punch(shard.x, shard.y, 56, 5);
  }
  punch(visX + visW / 2, visY + visH * 0.36, sim.doorReady ? 88 : 62, 7);
  for (const eye of sim.eyes) {
    if (eye.open < 0.2) continue;
    punch(eye.x, eye.y - 6, 56 + eye.open * 24, 8);
    light.save();
    light.translate(eye.x, eye.y);
    light.rotate(eye.facingNow);
    light.beginPath();
    light.moveTo(0, 0);
    light.arc(0, 0, eye.range * 0.92, -eye.cone / 2, eye.cone / 2);
    light.closePath();
    light.fillStyle = `rgba(0,0,0,${0.35 + eye.open * 0.35})`;
    light.fill();
    light.restore();
  }
  light.globalCompositeOperation = "source-over";

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(light.canvas, 0, 0);

  applyCam(ctx, cam, shakeX, shakeY, dpr);
  ctx.globalCompositeOperation = "lighter";
  for (const eye of sim.eyes) {
    if (eye.open < 0.15) continue;
    ctx.save();
    ctx.translate(eye.x, eye.y);
    ctx.rotate(eye.facingNow);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, eye.range * 0.88, -eye.cone / 2, eye.cone / 2);
    ctx.closePath();
    const a = eye.canCatch ? 0.2 : eye.seeing ? 0.13 : 0.06;
    ctx.fillStyle = `rgba(255,186,74,${a * eye.open})`;
    ctx.fill();
    ctx.restore();
  }
  for (const shard of sim.shards) {
    if (shard.taken) continue;
    const g = ctx.createRadialGradient(shard.x, shard.y, 0, shard.x, shard.y, 26);
    g.addColorStop(0, "rgba(212,180,90,0.32)");
    g.addColorStop(1, "rgba(212,180,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  screen(ctx, dpr);
  if (sim.flash > 0) {
    ctx.fillStyle = `rgba(255,186,74,${sim.flash * 0.28})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  const vig = ctx.createRadialGradient(
    viewW / 2,
    viewH / 2,
    Math.min(viewW, viewH) * 0.25,
    viewW / 2,
    viewH / 2,
    Math.max(viewW, viewH) * 0.82,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, viewW, viewH);
}
