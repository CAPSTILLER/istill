import { createAudio } from "./audio";
import { createInput } from "./input";
import { ROOMS } from "./levels";
import { loadSave, recordRun, writeSave, type SaveData } from "./save";
import { makeSim, remainingShards, resetPlayer, stepSim, type Sim } from "./sim";
import { loadSprites, type Sprites } from "./sprites";
import { fitCamera, renderWorld } from "./render";
import { useGameStore, type GamePhase } from "./store";

const STEP = 1 / 60;

export type Engine = {
  destroy: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  restartRoom: () => void;
  goTitle: () => void;
  toggleMute: () => void;
  setStick: (x: number, y: number) => void;
  continueRoom: () => void;
};

export async function createEngine(canvas: HTMLCanvasElement): Promise<Engine> {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas unsupported");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const lightCanvas = document.createElement("canvas");
  const maybeLight = lightCanvas.getContext("2d");
  if (!maybeLight) throw new Error("Canvas unsupported");
  const light: CanvasRenderingContext2D = maybeLight;

  const input = createInput();
  const audio = createAudio();
  let sprites: Sprites | null = null;
  let save: SaveData = loadSave();
  let sim: Sim | null = null;
  let roomIndex = 0;
  let phase: GamePhase = "title";
  let caughtCount = 0;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let running = true;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let caughtAt = 0;
  let lastWatch = false;
  let hudKey = "";
  let relicsCollected = 0;
  let holdWorld: { x: number; y: number } | null = null;
  let holdPointer: number | null = null;

  useGameStore.getState().patch({
    muted: save.muted,
    bestCaught: save.bestCaught,
    roomCount: ROOMS.length,
    phase: "boot",
  });
  audio.setMuted(save.muted);

  try {
    sprites = await loadSprites();
  } catch {
    sprites = null;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    cssW = w;
    cssH = h;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    lightCanvas.width = canvas.width;
    lightCanvas.height = canvas.height;
  }

  function cssToWorld(clientX: number, clientY: number) {
    if (!sim) return null;
    const rect = canvas.getBoundingClientRect();
    const cam = fitCamera(cssW, cssH, sim.room.cols, sim.room.rows);
    return {
      x: (clientX - rect.left - cam.ox) / cam.scale,
      y: (clientY - rect.top - cam.oy) / cam.scale,
    };
  }

  function onPointerDown(e: PointerEvent) {
    if (phase !== "playing" && phase !== "caught") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    holdPointer = e.pointerId;
    holdWorld = cssToWorld(e.clientX, e.clientY);
  }
  function onPointerMove(e: PointerEvent) {
    if (holdPointer !== e.pointerId) return;
    holdWorld = cssToWorld(e.clientX, e.clientY);
  }
  function onPointerUp(e: PointerEvent) {
    if (holdPointer !== e.pointerId) return;
    holdPointer = null;
    holdWorld = null;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("lostpointercapture", onPointerUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  function publish() {
    const left = sim ? remainingShards(sim) : 0;
    const next = [
      phase,
      roomIndex,
      sim?.room.line ?? "",
      left,
      sim?.shards.length ?? 0,
      relicsCollected,
      sim?.watched ? 1 : 0,
      sim?.warning ? 1 : 0,
      sim?.doorReady ? 1 : 0,
      caughtCount,
      save.muted ? 1 : 0,
      save.bestCaught ?? -1,
    ].join("|");
    if (next === hudKey) return;
    hudKey = next;
    useGameStore.getState().patch({
      phase,
      roomIndex,
      line: sim?.room.line ?? "I still.",
      hint: sim?.room.hint ?? "",
      shardsLeft: left,
      shardTotal: sim?.shards.length ?? 0,
      relicsCollected,
      watched: sim?.watched ?? false,
      warning: sim?.warning ?? false,
      doorReady: sim?.doorReady ?? false,
      caughtCount,
      muted: save.muted,
      bestCaught: save.bestCaught,
      roomCount: ROOMS.length,
    });
  }

  function loadRoom(i: number) {
    roomIndex = i;
    sim = makeSim(ROOMS[i]!);
    phase = "playing";
    publish();
  }

  function start() {
    audio.unlock();
    caughtCount = 0;
    relicsCollected = 0;
    loadRoom(0);
  }

  function toggleMute() {
    save = { ...save, muted: !save.muted };
    writeSave(save);
    audio.setMuted(save.muted);
    publish();
  }

  function continueRoom() {
    if (roomIndex >= ROOMS.length - 1) {
      save = recordRun(caughtCount, save);
      phase = "ending";
      audio.win();
      publish();
      return;
    }
    loadRoom(roomIndex + 1);
  }

  function loop(now: number) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const raw = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += raw;
    const poll = input.poll();

    if (phase === "playing" && poll.pausePressed) {
      phase = "paused";
      publish();
    } else if (phase === "paused" && poll.pausePressed) {
      phase = "playing";
      publish();
    }
    if (poll.mutePressed) toggleMute();

    while (acc >= STEP) {
      if (phase === "playing" && sim) {
        let mx = poll.moveX;
        let my = poll.moveY;
        if (holdWorld) {
          const dx = holdWorld.x - sim.player.x;
          const dy = holdWorld.y - sim.player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
            mx = dx / dist;
            my = dy / dist;
          } else {
            mx = 0;
            my = 0;
          }
        }
        stepSim(sim, mx, my, STEP, {
          onShard: () => {
            relicsCollected += 1;
            audio.shard();
            publish();
          },
          onCaught: () => {
            caughtCount += 1;
            caughtAt = performance.now();
            phase = "caught";
            audio.caught();
            publish();
          },
          onDoor: () => {
            phase = "roomclear";
            audio.door();
            publish();
          },
          onEyeOpen: () => {
            if (!lastWatch) audio.eyeOpen();
          },
        });
        lastWatch = sim.watched;
        audio.tick(sim.time, sim.watched, Math.hypot(sim.player.vx, sim.player.vy) > 12);
      }
      acc -= STEP;
    }

    if (phase === "caught" && performance.now() - caughtAt > 1400 && sim) {
      resetPlayer(sim);
      phase = "playing";
      publish();
    }

    if (sim && phase !== "title" && phase !== "boot" && phase !== "ending") {
      renderWorld(ctx, light, sim, sprites, cssW, cssH, reduced, dpr);
      if (phase === "paused") {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "rgba(12,13,16,0.45)";
        ctx.fillRect(0, 0, cssW, cssH);
      }
    }

    publish();
  }

  raf = requestAnimationFrame(loop);

  window.__controlsTest = {
    getYaw: () => (sim ? Math.atan2(sim.player.vy, sim.player.vx || 1) : 0),
    getSpeed: () => (sim ? Math.hypot(sim.player.vx, sim.player.vy) : 0),
    getX: () => sim?.player.x ?? 0,
    getY: () => sim?.player.y ?? 0,
    setKeys: (codes: string[]) => input.setKeys(codes),
    setHold: (x: number | null, y?: number) => {
      holdWorld = x == null || y == null ? null : { x, y };
    },
    debug: () =>
      sim
        ? {
            watched: sim.watched,
            warning: sim.warning,
            open: sim.eyes.map((e) => Number(e.open.toFixed(2))),
            seeing: sim.eyes.map((e) => e.seeing),
            canCatch: sim.eyes.map((e) => e.canCatch),
            phase,
          }
        : null,
  };

  const onVis = () => {
    if (!document.hidden) audio.resume();
  };
  document.addEventListener("visibilitychange", onVis);

  useGameStore.getState().patch({ assetsReady: true, phase: "title" });

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      input.destroy();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("lostpointercapture", onPointerUp);
      document.removeEventListener("visibilitychange", onVis);
      delete window.__controlsTest;
    },
    start,
    pause() {
      if (phase === "playing") {
        phase = "paused";
        publish();
      }
    },
    resume() {
      if (phase === "paused") {
        phase = "playing";
        publish();
      }
    },
    restartRoom() {
      loadRoom(roomIndex);
    },
    goTitle() {
      sim = null;
      phase = "title";
      publish();
    },
    toggleMute,
    setStick: (x, y) => input.setStick(x, y),
    continueRoom,
  };
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX?: () => number;
      getY?: () => number;
      setKeys?: (codes: string[]) => void;
      setHold?: (x: number | null, y?: number) => void;
      debug?: () => unknown;
    };
  }
}
