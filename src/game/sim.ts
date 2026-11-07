import {
  asNum,
  emptyScope,
  evaluate,
  isFn,
  type FnVal,
  type Namespace,
  type Scope,
  type Value,
} from "./expr";
import {
  compileEngine,
  initialNumber,
  type CompiledEngine,
  type EngineDef,
} from "./engines";
import {
  LIFE_RULE,
  countLive,
  formatRule,
  paintCell,
  paintLine,
  ruleFromCounts,
  stepLife,
  type Rule,
} from "./life";
import { patternById, type Pattern } from "./patterns";
import { useHud, type Readout } from "./hud-store";

type Runtime = {
  signature: string;
  compiled: CompiledEngine;
  varValues: Record<string, number>;
  latch: boolean;
  history: number[];
  namespace: Namespace;
  error: string | null;
};

const FIELD_COLS = 48;
const FIELD_ROWS = 30;

export { FIELD_COLS, FIELD_ROWS };

export class Simulation {
  cols = 160;
  rows = 100;
  cells: Uint8Array;
  next: Uint8Array;
  generation = 0;
  population = 0;
  rule: Rule = { ...LIFE_RULE };
  baseRule: Rule = { ...LIFE_RULE };
  wrap = true;
  baseSpeed = 12;
  speed = 12;
  ruleMode: "manual" | "engine" = "manual";
  density = 0.28;
  defs: EngineDef[] = [];
  field = new Float32Array(FIELD_COLS * FIELD_ROWS);
  fieldActive = false;
  private runtimes = new Map<string, Runtime>();
  private undoStack: Uint8Array[] = [];
  private namespaces = new Map<string, Namespace>();

  constructor() {
    this.cells = new Uint8Array(this.cols * this.rows);
    this.next = new Uint8Array(this.cols * this.rows);
  }

  resize(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Uint8Array(cols * rows);
    this.next = new Uint8Array(cols * rows);
    this.generation = 0;
    this.population = 0;
    this.undoStack = [];
    this.fieldActive = false;
    this.field.fill(0);
  }

  pushUndo() {
    this.undoStack.push(this.cells.slice());
    if (this.undoStack.length > 30) this.undoStack.shift();
  }

  undo() {
    const prev = this.undoStack.pop();
    if (!prev || prev.length !== this.cells.length) return;
    this.cells.set(prev);
    this.population = countLive(this.cells);
    this.publish(true);
  }

  setDefs(defs: EngineDef[]) {
    this.defs = defs;
    const live = new Set(defs.map((d) => d.id));
    for (const id of this.runtimes.keys()) {
      if (!live.has(id)) {
        this.runtimes.delete(id);
        this.namespaces.delete(id);
      }
    }
    for (const def of defs) {
      const signature = JSON.stringify(def);
      let rt = this.runtimes.get(def.id);
      if (!rt || rt.signature !== signature) {
        const prevVars = rt?.varValues ?? {};
        const compiled = compileEngine(def);
        const varValues: Record<string, number> = {};
        for (const v of compiled.variables) {
          varValues[v.id] = prevVars[v.id] ?? initialNumber(def.variables.find((d) => d.id === v.id)?.initial ?? "0");
        }
        rt = {
          signature,
          compiled,
          varValues,
          latch: rt?.latch ?? false,
          history: rt?.history ?? [],
          namespace: {
            __ns: true,
            name: def.name,
            members: {},
          },
          error: compiled.error,
        };
        this.runtimes.set(def.id, rt);
        this.namespaces.set(def.id, rt.namespace);
      }
    }
    const done = this.evaluate(false);
    this.applyScalar(done);
    this.publish(true);
  }

  resetEngine(id: string) {
    const def = this.defs.find((d) => d.id === id);
    const rt = this.runtimes.get(id);
    if (!def || !rt) return;
    for (const v of def.variables) rt.varValues[v.id] = initialNumber(v.initial);
    rt.latch = false;
    rt.history = [];
    const done = this.evaluate(false);
    this.applyScalar(done);
    this.publish(true);
  }

  resetAllEngines() {
    this.generation = 0;
    for (const def of this.defs) {
      const rt = this.runtimes.get(def.id);
      if (!rt) continue;
      for (const v of def.variables) rt.varValues[v.id] = initialNumber(v.initial);
      rt.latch = false;
      rt.history = [];
    }
    const done = this.evaluate(false);
    this.applyScalar(done);
    this.publish(true);
  }

  clearBoard() {
    this.pushUndo();
    this.cells.fill(0);
    this.population = 0;
    this.generation = 0;
    this.field.fill(0);
    this.fieldActive = false;
    this.publish(true);
  }

  randomize() {
    this.pushUndo();
    const p = this.density;
    for (let i = 0; i < this.cells.length; i += 1) this.cells[i] = Math.random() < p ? 1 : 0;
    this.population = countLive(this.cells);
    this.generation = 0;
    this.publish(true);
  }

  stamp(pattern: Pattern, clear: boolean) {
    this.pushUndo();
    if (clear) this.cells.fill(0);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const cell of pattern.cells) {
      if (cell.x < minX) minX = cell.x;
      if (cell.y < minY) minY = cell.y;
      if (cell.x > maxX) maxX = cell.x;
      if (cell.y > maxY) maxY = cell.y;
    }
    if (!Number.isFinite(minX)) return;
    const ox = Math.floor((this.cols - (maxX - minX + 1)) / 2) - minX;
    const oy = Math.floor((this.rows - (maxY - minY + 1)) / 2) - minY;
    this.blit(pattern, ox, oy, false);
    this.population = countLive(this.cells);
    if (clear) this.generation = 0;
    this.publish(true);
  }

  inject(patternId: string, x: number, y: number) {
    const pattern = patternById(patternId) ?? patternById("glider");
    if (!pattern) return;
    this.blit(pattern, Math.round(x), Math.round(y), true);
  }

  private blit(pattern: Pattern, ox: number, oy: number, respectWrap: boolean) {
    for (const cell of pattern.cells) {
      let x = ox + cell.x;
      let y = oy + cell.y;
      if (this.wrap && respectWrap) {
        x = ((x % this.cols) + this.cols) % this.cols;
        y = ((y % this.rows) + this.rows) % this.rows;
      } else if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
      else if (this.wrap) {
        x = ((x % this.cols) + this.cols) % this.cols;
        y = ((y % this.rows) + this.rows) % this.rows;
      }
      this.cells[y * this.cols + x] = 1;
    }
  }

  paintAt(x0: number, y0: number, x1: number, y1: number, alive: boolean, brush: number) {
    paintLine(this.cells, this.cols, this.rows, x0, y0, x1, y1, alive, brush, this.wrap);
    this.population = countLive(this.cells);
  }

  paintDot(x: number, y: number, alive: boolean, brush: number) {
    paintCell(this.cells, this.cols, this.rows, x, y, alive, brush, this.wrap);
    this.population = countLive(this.cells);
  }

  step() {
    this.generation += 1;
    const outputs = this.evaluate(true);
    this.applyScalar(outputs);
    this.population = stepLife(this.cells, this.next, this.cols, this.rows, this.rule, this.wrap);
    const swap = this.cells;
    this.cells = this.next;
    this.next = swap;
    this.applySpatial(outputs);
    this.population = countLive(this.cells);
    this.publish(false);
  }

  private evaluate(advance: boolean) {
    const done = new Map<string, Namespace>();
    const order = topo(this.defs);
    for (const def of order) {
      const rt = this.runtimes.get(def.id);
      if (!rt) continue;
      if (!def.enabled) {
        done.set(def.id, rt.namespace);
        continue;
      }
      try {
        if (advance) this.advanceVariables(def, rt, done);
        this.rebuildNamespace(def, rt, true, done, advance);
        rt.error = rt.compiled.error;
        done.set(def.id, rt.namespace);
      } catch (err) {
        rt.error = err instanceof Error ? err.message : "Engine failed";
        done.set(def.id, rt.namespace);
      }
    }
    return done;
  }

  private advanceVariables(def: EngineDef, rt: Runtime, done: Map<string, Namespace>) {
    const prev: Record<string, number> = { ...rt.varValues };
    const scope = this.makeScope(def, rt, prev, done, {});
    for (const variable of rt.compiled.variables) {
      if (!variable.update) continue;
      const value = variable.update.eval(scope);
      const n = asNum(value, variable.name);
      if (Number.isFinite(n)) rt.varValues[variable.id] = n;
    }
  }

  private rebuildNamespace(
    def: EngineDef,
    rt: Runtime,
    computeValues: boolean,
    done: Map<string, Namespace> = new Map(),
    recordHistory = false,
  ) {
    const locals: Record<string, Value> = {};
    const scope: Scope = {
      get: (name) => {
        if (name in locals) return locals[name];
        return this.lookupOuter(def, name, done);
      },
    };
    for (const arr of rt.compiled.arrays) locals[arr.name] = arr.data;
    for (const fn of rt.compiled.functions) {
      const fv: FnVal = { __fn: true, params: fn.params, body: fn.body, scope };
      locals[fn.name] = fv;
    }
    for (const variable of rt.compiled.variables) {
      locals[variable.name] = rt.varValues[variable.id] ?? 0;
    }
    const valueLocals: Record<string, number> = {};
    if (computeValues && !rt.compiled.error) {
      const valueScope: Scope = {
        get: (name) => {
          if (name in valueLocals) return valueLocals[name];
          return scope.get(name);
        },
      };
      for (const index of rt.compiled.valueOrder) {
        const value = rt.compiled.values[index];
        if (!value) continue;
        const result = value.prog.eval(valueScope);
        const n = asNum(result, value.name);
        valueLocals[value.name] = Number.isFinite(n) ? n : 0;
        locals[value.name] = valueLocals[value.name];
      }
    } else {
      for (const value of def.values) {
        if (!(value.name in locals)) locals[value.name] = 0;
      }
    }
    rt.namespace = { __ns: true, name: def.name, members: { ...locals } };
    this.namespaces.set(def.id, rt.namespace);
    if (recordHistory && computeValues) {
      const primary =
        def.values[0] ? (locals[def.values[0].name] as number) : def.variables[0] ? rt.varValues[def.variables[0].id] : 0;
      if (typeof primary === "number" && Number.isFinite(primary)) {
        rt.history.push(primary);
        if (rt.history.length > 48) rt.history.shift();
      }
    }
  }

  private lookupOuter(def: EngineDef, name: string, done: Map<string, Namespace>): Value | undefined {
    for (const id of def.reads) {
      const other = this.defs.find((e) => e.id === id);
      if (other?.name === name) {
        return done.get(id) ?? this.namespaces.get(id);
      }
    }
    if (name === "t") return this.generation;
    if (name === "pop") return this.population;
    if (name === "w") return this.cols;
    if (name === "h") return this.rows;
    return emptyScope().get(name);
  }

  private makeScope(
    def: EngineDef,
    rt: Runtime,
    varSnapshot: Record<string, number>,
    done: Map<string, Namespace>,
    extra: Record<string, Value>,
  ): Scope {
    const locals: Record<string, Value> = { ...extra };
    for (const arr of rt.compiled.arrays) locals[arr.name] = arr.data;
    for (const variable of rt.compiled.variables) locals[variable.name] = varSnapshot[variable.id] ?? 0;
    const scope: Scope = {
      get: (name) => {
        if (name in locals) return locals[name];
        return this.lookupOuter(def, name, done);
      },
    };
    for (const fn of rt.compiled.functions) {
      locals[fn.name] = { __fn: true, params: fn.params, body: fn.body, scope };
    }
    return scope;
  }

  private applyScalar(done: Map<string, Namespace>) {
    let speed = this.baseSpeed;
    let speedSource: string | null = null;
    let rule = this.baseRule;
    let ruleSource: string | null = null;
    for (const def of this.defs) {
      if (!def.enabled) continue;
      const ns = done.get(def.id);
      if (!ns) continue;
      const effect = def.effect;
      if (effect.type === "speed") {
        const n = memberNum(ns, effect.source);
        if (n !== null) {
          speed = Math.min(40, Math.max(1, n));
          speedSource = def.name;
        }
      }
      if (effect.type === "rule" && this.ruleMode === "engine") {
        const birth = effect.birth ? memberArr(ns, effect.birth) : null;
        const survive = effect.survive ? memberArr(ns, effect.survive) : null;
        rule = ruleFromCounts(birth ?? countsFromMask(this.baseRule.birth), survive ?? countsFromMask(this.baseRule.survive));
        ruleSource = def.name;
      }
    }
    this.speed = speed;
    this.rule = rule;
    this.speedSource = speedSource;
    this.ruleSource = ruleSource;
  }

  speedSource: string | null = null;
  ruleSource: string | null = null;

  private applySpatial(done: Map<string, Namespace>) {
    let spatial = false;
    for (const def of this.defs) {
      if (!def.enabled) continue;
      const ns = done.get(def.id);
      const rt = this.runtimes.get(def.id);
      if (!ns || !rt) continue;
      const effect = def.effect;
      if (effect.type === "tint" || effect.type === "nudge") {
        const fn = ns.members[effect.source];
        if (!isFn(fn)) {
          rt.error = `No function "${effect.source}"`;
          continue;
        }
        const err = this.sampleField(fn);
        if (err) {
          rt.error = err;
          continue;
        }
        spatial = true;
        if (effect.type === "nudge") this.nudgeFromField();
      } else if (effect.type === "inject") {
        const level = memberNum(ns, effect.source);
        const hot = level !== null && level > 0.5;
        if (hot && !rt.latch) {
          const px = memberNum(ns, "px") ?? Math.floor(this.cols / 2);
          const py = memberNum(ns, "py") ?? Math.floor(this.rows / 2);
          this.inject(effect.pattern, px, py);
        }
        rt.latch = hot;
      } else if (effect.type === "seed") {
        const expected = memberNum(ns, effect.source);
        if (expected !== null && expected > 0) this.seed(Math.min(40, expected));
      }
    }
    if (!spatial) {
      this.fieldActive = false;
      this.field.fill(0);
    }
  }

  private sampleField(fn: FnVal): string | null {
    try {
      callFn(fn, [0, 0]);
    } catch (err) {
      this.fieldActive = false;
      return err instanceof Error ? err.message : "Field failed";
    }
    this.fieldActive = true;
    const sx = this.cols / FIELD_COLS;
    const sy = this.rows / FIELD_ROWS;
    try {
      for (let y = 0; y < FIELD_ROWS; y += 1) {
        for (let x = 0; x < FIELD_COLS; x += 1) {
          this.field[y * FIELD_COLS + x] = callFn(fn, [(x + 0.5) * sx, (y + 0.5) * sy]);
        }
      }
    } catch (err) {
      this.fieldActive = false;
      this.field.fill(0);
      return err instanceof Error ? err.message : "Field failed";
    }
    return null;
  }

  private nudgeFromField() {
    const sx = this.cols / FIELD_COLS;
    const sy = this.rows / FIELD_ROWS;
    for (let y = 0; y < FIELD_ROWS; y += 1) {
      for (let x = 0; x < FIELD_COLS; x += 1) {
        const v = this.field[y * FIELD_COLS + x];
        if (v < 0.72 && v > -0.72) continue;
        const alive = v >= 0.72 ? 1 : 0;
        const x0 = Math.floor(x * sx);
        const x1 = Math.min(this.cols, Math.floor((x + 1) * sx));
        const y0 = Math.floor(y * sy);
        const y1 = Math.min(this.rows, Math.floor((y + 1) * sy));
        for (let cy = y0; cy < y1; cy += 1) {
          const row = cy * this.cols;
          for (let cx = x0; cx < x1; cx += 1) this.cells[row + cx] = alive;
        }
      }
    }
  }

  private seed(expected: number) {
    const whole = Math.floor(expected);
    const extra = Math.random() < expected - whole ? 1 : 0;
    const n = whole + extra;
    for (let i = 0; i < n; i += 1) {
      const x = (Math.random() * this.cols) | 0;
      const y = (Math.random() * this.rows) | 0;
      this.cells[y * this.cols + x] = 1;
    }
  }

  sampleFieldAt(col: number, row: number): number {
    if (!this.fieldActive) return 0;
    const x = Math.min(FIELD_COLS - 1, Math.max(0, (col / this.cols) * FIELD_COLS));
    const y = Math.min(FIELD_ROWS - 1, Math.max(0, (row / this.rows) * FIELD_ROWS));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(FIELD_COLS - 1, x0 + 1);
    const y1 = Math.min(FIELD_ROWS - 1, y0 + 1);
    const tx = x - x0;
    const ty = y - y0;
    const a = this.field[y0 * FIELD_COLS + x0];
    const b = this.field[y0 * FIELD_COLS + x1];
    const c = this.field[y1 * FIELD_COLS + x0];
    const d = this.field[y1 * FIELD_COLS + x1];
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
  }

  publish(forceHistory: boolean) {
    const readouts: Record<string, Readout> = {};
    for (const def of this.defs) {
      const rt = this.runtimes.get(def.id);
      if (!rt) continue;
      const numbers: { name: string; value: number }[] = [];
      for (const variable of def.variables) {
        numbers.push({ name: variable.name, value: rt.varValues[variable.id] ?? 0 });
      }
      for (const value of def.values) {
        const member = rt.namespace.members[value.name];
        numbers.push({ name: value.name, value: typeof member === "number" ? member : 0 });
      }
      readouts[def.id] = {
        numbers,
        error: def.enabled ? rt.error : null,
        history: rt.history.slice(),
        paused: !def.enabled,
      };
      void forceHistory;
    }
    useHud.setState({
      generation: this.generation,
      population: this.population,
      speed: this.speed,
      speedSource: this.speedSource,
      rule: formatRule(this.rule),
      ruleSource: this.ruleMode === "engine" ? this.ruleSource : null,
      readouts,
    });
  }
}

function topo(defs: EngineDef[]): EngineDef[] {
  const byId = new Map(defs.map((d) => [d.id, d]));
  const indeg = new Map(defs.map((d) => [d.id, 0]));
  const edges = new Map<string, string[]>(defs.map((d) => [d.id, []]));
  for (const def of defs) {
    for (const read of def.reads) {
      if (!byId.has(read)) continue;
      edges.get(read)?.push(def.id);
      indeg.set(def.id, (indeg.get(def.id) ?? 0) + 1);
    }
  }
  const queue = defs.filter((d) => (indeg.get(d.id) ?? 0) === 0);
  const out: EngineDef[] = [];
  for (let i = 0; i < queue.length; i += 1) {
    const def = queue[i];
    out.push(def);
    for (const next of edges.get(def.id) ?? []) {
      const left = (indeg.get(next) ?? 1) - 1;
      indeg.set(next, left);
      if (left === 0) {
        const node = byId.get(next);
        if (node) queue.push(node);
      }
    }
  }
  if (out.length < defs.length) {
    for (const def of defs) if (!out.includes(def)) out.push(def);
  }
  return out;
}

function memberNum(ns: Namespace, name: string): number | null {
  const v = ns.members[name];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function memberArr(ns: Namespace, name: string): number[] | null {
  const v = ns.members[name];
  return Array.isArray(v) ? v : null;
}

function countsFromMask(mask: number): number[] {
  const out: number[] = [];
  for (let n = 0; n <= 8; n += 1) if (mask & (1 << n)) out.push(n);
  return out;
}

function callFn(fn: FnVal, args: number[]): number {
  const locals: Record<string, Value> = {};
  fn.params.forEach((name, i) => {
    locals[name] = args[i] ?? 0;
  });
  const child: Scope = {
    get(name) {
      if (name in locals) return locals[name];
      return fn.scope.get(name);
    },
  };
  const value = evaluate(fn.body, child);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
