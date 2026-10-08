export const TILE = 40;

export type PropKind = "chair" | "table" | "crate" | "plant";

export type EyeDef = {
  tx: number;
  ty: number;
  facing: number;
  cone: number;
  range: number;
  closed: number;
  open: number;
  trans: number;
  offset: number;
  panAmp: number;
  panSpeed: number;
};

export type PropDef = {
  tx: number;
  ty: number;
  kind: PropKind;
  solid: boolean;
};

export type RoomDef = {
  line: string;
  hint: string;
  cols: number;
  rows: number;
  walls: boolean[][];
  solid: boolean[][];
  player: { x: number; y: number };
  door: { x: number; y: number };
  doorway: { tx: number; ty: number; w: number; h: number };
  shards: { x: number; y: number }[];
  eyes: EyeDef[];
  props: PropDef[];
};

const PROP_MAP: Record<string, { kind: PropKind; solid: boolean }> = {
  c: { kind: "chair", solid: true },
  t: { kind: "table", solid: true },
  k: { kind: "crate", solid: true },
  f: { kind: "plant", solid: false },
};

const FACE: Record<string, number> = {
  ">": 0,
  v: Math.PI / 2,
  "<": Math.PI,
  "^": -Math.PI / 2,
};

type EyeTune = {
  cone?: number;
  range?: number;
  closed?: number;
  open?: number;
  trans?: number;
  offset?: number;
  panAmp?: number;
  panSpeed?: number;
};

function parseRoom(line: string, hint: string, ascii: string, tune: EyeTune[] = []): RoomDef {
  const rows = ascii
    .trim()
    .split("\n")
    .map((r) => r.trimEnd());
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const walls: boolean[][] = [];
  const solid: boolean[][] = [];
  const shards: { x: number; y: number }[] = [];
  const eyes: EyeDef[] = [];
  const props: PropDef[] = [];
  let player = { x: TILE * 2, y: TILE * 2 };
  let door = { x: TILE * (width - 2), y: TILE * (height - 2) };
  let eyeIndex = 0;

  for (let ty = 0; ty < height; ty++) {
    walls[ty] = [];
    solid[ty] = [];
    const row = rows[ty] ?? "";
    for (let tx = 0; tx < width; tx++) {
      const ch = row[tx] ?? "#";
      const isWall = ch === "#";
      walls[ty][tx] = isWall;
      solid[ty][tx] = isWall;
      const cx = (tx + 0.5) * TILE;
      const cy = (ty + 0.5) * TILE;
      if (ch === "P") player = { x: cx, y: cy };
      if (ch === "D") door = { x: cx, y: cy };
      if (ch === "S") shards.push({ x: cx, y: cy });
      if (ch in FACE) {
        const t = tune[eyeIndex] ?? {};
        eyes.push({
          tx,
          ty,
          facing: FACE[ch]!,
          cone: t.cone ?? 1.72,
          range: (t.range ?? 11) * TILE,
          closed: t.closed ?? 2.6,
          open: t.open ?? 1.7,
          trans: t.trans ?? 0.45,
          offset: t.offset ?? 0,
          panAmp: t.panAmp ?? 0,
          panSpeed: t.panSpeed ?? 0.6,
        });
        eyeIndex += 1;
      }
      if (ch in PROP_MAP) {
        const p = PROP_MAP[ch]!;
        props.push({ tx, ty, kind: p.kind, solid: p.solid });
        if (p.solid) solid[ty][tx] = true;
      }
    }
  }

  door.x = (width - 2) * TILE;
  door.y = 2.5 * TILE;
  const doorway = { tx: width - 3, ty: 1, w: 2, h: 3 };

  return {
    line,
    hint,
    cols: width,
    rows: height,
    walls,
    solid,
    player,
    door,
    doorway,
    shards,
    eyes,
    props,
  };
}

export const ROOMS: RoomDef[] = [
  parseRoom(
    "I still wait.",
    "When the eye opens, do not move.",
    `
##############
#...........D#
#.....v......#
#............#
#..S.........#
#.....S......#
#........S...#
#............#
#..P.........#
#............#
##############
`,
    [{ closed: 3.4, open: 1.7, trans: 0.55, cone: 2.05, range: 12 }],
  ),
  parseRoom(
    "I still listen.",
    "Cross in the dark. Freeze in the light.",
    `
################
#.............D#
#..v...........#
#..............#
#.....###......#
#.....###...S..#
#..S...........#
#...........S..#
#..P...........#
#..............#
################
`,
    [{ closed: 2.8, open: 1.8, trans: 0.45, cone: 1.85, range: 12 }],
  ),
  parseRoom(
    "I still hide.",
    "Furniture can break a gaze.",
    `
################
#.............D#
#..v..c..t.....#
#........k.....#
#.....###......#
#..k..###..S...#
#..............#
#..c..S..f.....#
#..P........S..#
#..............#
################
`,
    [{ closed: 2.5, open: 1.9, trans: 0.4, cone: 1.8, range: 12 }],
  ),
  parseRoom(
    "I still remember.",
    "Two gazes. One window.",
    `
##################
#...............D#
#..v.............#
#.............S..#
#.......k........#
#..S.............#
#...........S....#
#..............<.#
#..P.............#
#................#
##################
`,
    [
      { closed: 2.4, open: 1.7, trans: 0.4, offset: 0, cone: 1.7, range: 12 },
      { closed: 2.4, open: 1.7, trans: 0.4, offset: 1.7, cone: 1.7, range: 11 },
    ],
  ),
  parseRoom(
    "I still keep the light.",
    "It looks from side to side.",
    `
################
#.............D#
#S.....v.......#
#..............#
#...##....##...#
#..............#
#...........S..#
#..P...S.......#
#..............#
################
`,
    [{ closed: 2.1, open: 2.2, trans: 0.4, panAmp: 0.72, panSpeed: 0.55, cone: 1.45, range: 13 }],
  ),
  parseRoom(
    "I still hear them.",
    "Three lids. Short dark.",
    `
##################
#...............D#
#..v.............#
#............S...#
#..S....##.......#
#.......##....S..#
#................#
#..............<.#
#..P.............#
#.....^..........#
##################
`,
    [
      { closed: 2.3, open: 1.55, trans: 0.35, offset: 0, cone: 1.6, range: 11 },
      { closed: 2.3, open: 1.55, trans: 0.35, offset: 1.2, cone: 1.6, range: 11 },
      { closed: 2.4, open: 1.5, trans: 0.35, offset: 2.1, cone: 1.65, range: 10 },
    ],
  ),
  parseRoom(
    "I still remain.",
    "Take what is yours. Leave still.",
    `
####################
#.................D#
#..v......S...v....#
#..................#
#..S....k....k...S.#
#..................#
#.....c....t.......#
#..................#
#..P...............#
#........^.........#
####################
`,
    [
      { closed: 2.2, open: 1.6, trans: 0.32, offset: 0, cone: 1.55, range: 11 },
      { closed: 2.2, open: 1.6, trans: 0.32, offset: 1.1, cone: 1.55, range: 11 },
      { closed: 2.3, open: 1.5, trans: 0.32, offset: 2.0, cone: 1.6, range: 11 },
    ],
  ),
];
