export type Rule = { birth: number; survive: number };

export const RULE_PRESETS: { id: string; name: string; text: string }[] = [
  { id: "life", name: "Life", text: "B3/S23" },
  { id: "highlife", name: "HighLife", text: "B36/S23" },
  { id: "daynight", name: "Day & Night", text: "B3678/S34678" },
  { id: "seeds", name: "Seeds", text: "B2/S" },
  { id: "maze", name: "Maze", text: "B3/S12345" },
  { id: "coral", name: "Coral", text: "B3/S45678" },
  { id: "diamoeba", name: "Diamoeba", text: "B35678/S5678" },
  { id: "2x2", name: "2x2", text: "B36/S125" },
];

export function maskFromDigits(digits: string): number {
  let mask = 0;
  for (const ch of digits) {
    const n = ch.charCodeAt(0) - 48;
    if (n >= 0 && n <= 8) mask |= 1 << n;
  }
  return mask;
}

export function parseRule(text: string): Rule | null {
  const m = /^B([0-8]*)\/S([0-8]*)$/i.exec(text.replace(/\s/g, ""));
  if (!m) return null;
  return { birth: maskFromDigits(m[1]), survive: maskFromDigits(m[2]) };
}

export function formatRule(rule: Rule): string {
  const digits = (mask: number) => {
    let s = "";
    for (let n = 0; n <= 8; n += 1) if (mask & (1 << n)) s += String(n);
    return s;
  };
  return `B${digits(rule.birth)}/S${digits(rule.survive)}`;
}

export function ruleFromCounts(birth: number[], survive: number[]): Rule {
  let b = 0;
  let s = 0;
  for (const n of birth) {
    const i = Math.trunc(n);
    if (i >= 0 && i <= 8) b |= 1 << i;
  }
  for (const n of survive) {
    const i = Math.trunc(n);
    if (i >= 0 && i <= 8) s |= 1 << i;
  }
  return { birth: b, survive: s };
}

export const LIFE_RULE: Rule = { birth: 1 << 3, survive: (1 << 2) | (1 << 3) };

export function stepLife(
  src: Uint8Array,
  dst: Uint8Array,
  cols: number,
  rows: number,
  rule: Rule,
  wrap: boolean,
): number {
  let pop = 0;
  for (let y = 0; y < rows; y += 1) {
    const yUp = wrap ? (y === 0 ? rows - 1 : y - 1) : y - 1;
    const yDn = wrap ? (y === rows - 1 ? 0 : y + 1) : y + 1;
    const row = y * cols;
    const rowUp = yUp * cols;
    const rowDn = yDn * cols;
    const upOk = yUp >= 0;
    const dnOk = yDn >= 0 && yDn < rows;
    for (let x = 0; x < cols; x += 1) {
      const xL = wrap ? (x === 0 ? cols - 1 : x - 1) : x - 1;
      const xR = wrap ? (x === cols - 1 ? 0 : x + 1) : x + 1;
      let n = 0;
      if (upOk) {
        if (xL >= 0) n += src[rowUp + xL];
        n += src[rowUp + x];
        if (xR < cols) n += src[rowUp + xR];
      }
      if (xL >= 0) n += src[row + xL];
      if (xR < cols) n += src[row + xR];
      if (dnOk) {
        if (xL >= 0) n += src[rowDn + xL];
        n += src[rowDn + x];
        if (xR < cols) n += src[rowDn + xR];
      }
      const alive = src[row + x] === 1;
      const bit = 1 << n;
      const out = alive ? (rule.survive & bit) !== 0 : (rule.birth & bit) !== 0;
      dst[row + x] = out ? 1 : 0;
      if (out) pop += 1;
    }
  }
  return pop;
}

export function countLive(cells: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < cells.length; i += 1) if (cells[i]) n += 1;
  return n;
}

export function paintCell(
  cells: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  alive: boolean,
  brush: number,
  wrap: boolean,
) {
  const r = Math.max(0, (brush - 1) >> 1);
  const v = alive ? 1 : 0;
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      let cx = x + dx;
      let cy = y + dy;
      if (wrap) {
        cx = ((cx % cols) + cols) % cols;
        cy = ((cy % rows) + rows) % rows;
      } else if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) {
        continue;
      }
      cells[cy * cols + cx] = v;
    }
  }
}

export function paintLine(
  cells: Uint8Array,
  cols: number,
  rows: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  alive: boolean,
  brush: number,
  wrap: boolean,
) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    paintCell(cells, cols, rows, x, y, alive, brush, wrap);
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
