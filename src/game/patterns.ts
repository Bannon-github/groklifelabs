export type Pattern = {
  id: string;
  name: string;
  rle: string;
  cells: { x: number; y: number }[];
  w: number;
  h: number;
};

function decodeRle(rle: string): { w: number; h: number; cells: { x: number; y: number }[] } {
  const body = rle
    .split("\n")
    .filter((line) => !line.startsWith("x") && !line.startsWith("#"))
    .join("")
    .replace(/\s/g, "");
  const cells: { x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  let n = 0;
  let maxX = 0;
  for (const ch of body) {
    if (ch >= "0" && ch <= "9") {
      n = n * 10 + (ch.charCodeAt(0) - 48);
      continue;
    }
    const count = n || 1;
    n = 0;
    if (ch === "b") x += count;
    else if (ch === "o") {
      for (let i = 0; i < count; i += 1) cells.push({ x: x + i, y });
      x += count;
      if (x > maxX) maxX = x;
    } else if (ch === "$") {
      if (x > maxX) maxX = x;
      y += count;
      x = 0;
    } else if (ch === "!") {
      if (x > maxX) maxX = x;
      break;
    }
  }
  return { w: maxX, h: y + (x > 0 ? 1 : 0), cells };
}

function pattern(id: string, name: string, rle: string): Pattern {
  const decoded = decodeRle(rle);
  return { id, name, rle, ...decoded };
}

export const PATTERNS: Pattern[] = [
  pattern("glider", "Glider", "bo$2bo$3o!"),
  pattern(
    "gosper",
    "Gosper gun",
    "24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!",
  ),
  pattern("lwss", "LWSS", "bo2bo$o4b$o3bo$4o!"),
  pattern(
    "pulsar",
    "Pulsar",
    "2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2b2$2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o2b!",
  ),
  pattern("penta", "Pentadecathlon", "2bo4bo$2ob4ob2o$2bo4bo!"),
  pattern("acorn", "Acorn", "bo5b$3bo$2o2b3o!"),
  pattern("rpent", "R-pentomino", "b2o$2o$bo!"),
  pattern("diehard", "Diehard", "6bo$2o$bo3b3o!"),
  pattern("toad", "Toad", "b3o$3o!"),
  pattern("beacon", "Beacon", "2o2b$2o$2b2o$2b2o!"),
  pattern("blinker", "Blinker", "3o!"),
  pattern("block", "Block", "2o$2o!"),
];

export function patternById(id: string): Pattern | undefined {
  return PATTERNS.find((p) => p.id === id);
}
