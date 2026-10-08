const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Escape",
  "KeyP",
  "Space",
  "Enter",
  "KeyM",
]);

export type InputState = {
  moveX: number;
  moveY: number;
  pause: boolean;
  confirm: boolean;
  mute: boolean;
};

export function createInput() {
  const keys = new Set<string>();
  let injected: string[] | null = null;
  let stickX = 0;
  let stickY = 0;
  let prevPause = false;
  let prevConfirm = false;
  let prevMute = false;

  function onKeyDown(e: KeyboardEvent) {
    if (GAME_CODES.has(e.code)) e.preventDefault();
    keys.add(e.code);
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function onBlur() {
    keys.clear();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) keys.clear();
  });

  function down(code: string) {
    if (injected) return injected.includes(code);
    return keys.has(code);
  }

  function radialDeadzone(x: number, y: number, dz = 0.18) {
    const m = Math.hypot(x, y);
    if (m < dz) return { x: 0, y: 0 };
    const scale = (m - dz) / (1 - dz) / m;
    return { x: x * scale, y: y * scale };
  }

  function poll(): InputState & { pausePressed: boolean; confirmPressed: boolean; mutePressed: boolean } {
    let x = 0;
    let y = 0;
    if (down("KeyA") || down("ArrowLeft")) x -= 1;
    if (down("KeyD") || down("ArrowRight")) x += 1;
    if (down("KeyW") || down("ArrowUp")) y -= 1;
    if (down("KeyS") || down("ArrowDown")) y += 1;
    x += stickX;
    y += stickY;

    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() ?? [] : [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      const dz = radialDeadzone(ax, ay);
      x += dz.x;
      y += dz.y;
      if (pad.buttons[12]?.pressed) y -= 1;
      if (pad.buttons[13]?.pressed) y += 1;
      if (pad.buttons[14]?.pressed) x -= 1;
      if (pad.buttons[15]?.pressed) x += 1;
    }

    const mag = Math.hypot(x, y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }

    const pause = down("Escape") || down("KeyP");
    const confirm = down("Space") || down("Enter");
    const mute = down("KeyM");
    const pausePressed = pause && !prevPause;
    const confirmPressed = confirm && !prevConfirm;
    const mutePressed = mute && !prevMute;
    prevPause = pause;
    prevConfirm = confirm;
    prevMute = mute;

    return {
      moveX: x,
      moveY: y,
      pause,
      confirm,
      mute,
      pausePressed,
      confirmPressed,
      mutePressed,
    };
  }

  return {
    poll,
    setStick(x: number, y: number) {
      stickX = x;
      stickY = y;
    },
    setKeys(codes: string[]) {
      injected = codes;
    },
    clearInjected() {
      injected = null;
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}

export type InputController = ReturnType<typeof createInput>;
