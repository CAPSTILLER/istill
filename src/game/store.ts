import { create } from "zustand";

export type GamePhase =
  | "boot"
  | "title"
  | "playing"
  | "paused"
  | "caught"
  | "roomclear"
  | "ending";

export type HudState = {
  phase: GamePhase;
  assetsReady: boolean;
  roomIndex: number;
  roomCount: number;
  line: string;
  hint: string;
  shardsLeft: number;
  shardTotal: number;
  relicsCollected: number;
  watched: boolean;
  warning: boolean;
  doorReady: boolean;
  caughtCount: number;
  bestCaught: number | null;
  muted: boolean;
};

const initial: HudState = {
  phase: "boot",
  assetsReady: false,
  roomIndex: 0,
  roomCount: 0,
  line: "I still.",
  hint: "",
  shardsLeft: 0,
  shardTotal: 0,
  relicsCollected: 0,
  watched: false,
  warning: false,
  doorReady: false,
  caughtCount: 0,
  bestCaught: null,
  muted: false,
};

type Store = HudState & {
  patch: (partial: Partial<HudState>) => void;
};

export const useGameStore = create<Store>((set) => ({
  ...initial,
  patch: (partial) => set(partial),
}));
