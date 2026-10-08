const KEY = "i-still-save-v1";
const VERSION = 1;

export type SaveData = {
  version: number;
  bestCaught: number | null;
  muted: boolean;
  lastRoom: number;
};

const defaults: SaveData = {
  version: VERSION,
  bestCaught: null,
  muted: false,
  lastRoom: 0,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...defaults,
      ...parsed,
      version: VERSION,
    };
  } catch {
    return { ...defaults };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: VERSION }));
  } catch {
    /* private mode / quota */
  }
}

export function recordRun(caughtCount: number, save: SaveData): SaveData {
  const best =
    save.bestCaught == null ? caughtCount : Math.min(save.bestCaught, caughtCount);
  const next = { ...save, bestCaught: best, lastRoom: 0 };
  writeSave(next);
  return next;
}
