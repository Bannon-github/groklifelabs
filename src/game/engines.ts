import { RESERVED, evalNumber, isIdent, lintExpr, tryCompile, type Program } from "./expr";

export type VarDef = { id: string; name: string; initial: string; update: string };
export type ValueDef = { id: string; name: string; expr: string };
export type FnDef = { id: string; name: string; params: string; expr: string };
export type ArrayDef = { id: string; name: string; values: string };

export type EffectDef =
  | { type: "none" }
  | { type: "speed"; source: string }
  | { type: "tint"; source: string }
  | { type: "nudge"; source: string }
  | { type: "inject"; source: string; pattern: string }
  | { type: "seed"; source: string }
  | { type: "rule"; birth: string; survive: string };

export type EngineDef = {
  id: string;
  name: string;
  enabled: boolean;
  reads: string[];
  variables: VarDef[];
  values: ValueDef[];
  functions: FnDef[];
  arrays: ArrayDef[];
  effect: EffectDef;
};

export type FieldError = { field: string; message: string };

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${(Date.now() + seq).toString(36)}_${seq.toString(36)}`;
}

export function blankEngine(existing: EngineDef[]): EngineDef {
  const names = new Set(existing.map((e) => e.name));
  let name = "Engine";
  let n = existing.length + 1;
  while (names.has(name) || RESERVED.has(name)) {
    n += 1;
    name = `Engine${n}`;
  }
  return {
    id: uid("eng"),
    name,
    enabled: true,
    reads: [],
    variables: [{ id: uid("var"), name: "n", initial: "0", update: "n + 1" }],
    values: [{ id: uid("val"), name: "out", expr: "sin(n / 8)" }],
    functions: [{ id: uid("fn"), name: "field", params: "x, y", expr: "sin(x * 0.2 + n * 0.05) * sin(y * 0.2)" }],
    arrays: [{ id: uid("arr"), name: "seq", values: "1, 2, 3" }],
    effect: { type: "none" },
  };
}

export const STARTER_ENGINES: EngineDef[] = [
  {
    id: "eng_clock",
    name: "Clock",
    enabled: true,
    reads: [],
    variables: [{ id: "var_phase", name: "phase", initial: "0", update: "mod(phase + 0.05, tau)" }],
    values: [{ id: "val_swing", name: "swing", expr: "sin(phase)" }],
    functions: [
      {
        id: "fn_tide",
        name: "tide",
        params: "x, y",
        expr: "sin(x * 0.15 + phase) * cos(y * 0.12 - phase * 0.5)",
      },
    ],
    arrays: [],
    effect: { type: "tint", source: "tide" },
  },
  {
    id: "eng_season",
    name: "Season",
    enabled: true,
    reads: ["eng_clock"],
    variables: [],
    values: [{ id: "val_rate", name: "rate", expr: "clamp(8 + 6 * Clock.swing, 2, 22)" }],
    functions: [],
    arrays: [],
    effect: { type: "speed", source: "rate" },
  },
  {
    id: "eng_courier",
    name: "Courier",
    enabled: true,
    reads: ["eng_clock"],
    variables: [],
    values: [
      { id: "val_go", name: "go", expr: "Clock.swing > 0.97" },
      { id: "val_px", name: "px", expr: "mod(12 + t * 0.4, w - 20)" },
      { id: "val_py", name: "py", expr: "h * 0.72 + 6 * Clock.swing" },
    ],
    functions: [],
    arrays: [],
    effect: { type: "inject", source: "go", pattern: "glider" },
  },
  {
    id: "eng_ash",
    name: "Ash",
    enabled: false,
    reads: ["eng_clock"],
    variables: [],
    values: [{ id: "val_p", name: "births", expr: "0.35 + 0.45 * (Clock.swing * 0.5 + 0.5)" }],
    functions: [],
    arrays: [],
    effect: { type: "seed", source: "births" },
  },
  {
    id: "eng_highlife",
    name: "HighLifeRule",
    enabled: false,
    reads: [],
    variables: [],
    values: [],
    functions: [],
    arrays: [
      { id: "arr_birth", name: "birth", values: "3, 6" },
      { id: "arr_survive", name: "survive", values: "2, 3" },
    ],
    effect: { type: "rule", birth: "birth", survive: "survive" },
  },
];

export function parseNumberList(text: string): { values: number[]; error: string | null } {
  const parts = text
    .split(/[, ]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return { values: [], error: "Add at least one number" };
  const values: number[] = [];
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isFinite(n)) return { values: [], error: `"${part}" is not a number` };
    values.push(n);
  }
  return { values, error: null };
}

export function parseParams(text: string): { params: string[]; error: string | null } {
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  for (const part of parts) {
    if (!isIdent(part)) return { params: [], error: `"${part}" is not a valid parameter` };
    if (seen.has(part)) return { params: [], error: `Duplicate parameter "${part}"` };
    seen.add(part);
  }
  return { params: parts, error: null };
}

function knownNames(engine: EngineDef, engines: EngineDef[]): Set<string> {
  const known = new Set<string>();
  for (const v of engine.variables) if (isIdent(v.name)) known.add(v.name);
  for (const v of engine.values) if (isIdent(v.name)) known.add(v.name);
  for (const f of engine.functions) if (isIdent(f.name)) known.add(f.name);
  for (const a of engine.arrays) if (isIdent(a.name)) known.add(a.name);
  for (const id of engine.reads) {
    const other = engines.find((e) => e.id === id);
    if (other && isIdent(other.name)) known.add(other.name);
  }
  return known;
}

export function engineIssues(engine: EngineDef, engines: EngineDef[]): FieldError[] {
  const issues: FieldError[] = [];
  if (!isIdent(engine.name)) issues.push({ field: "name", message: "Use a name like Clock or Drift" });
  else if (RESERVED.has(engine.name)) issues.push({ field: "name", message: "That name is reserved" });
  else if (engines.some((e) => e.id !== engine.id && e.name === engine.name)) {
    issues.push({ field: "name", message: "Another engine already uses this name" });
  }

  const names = new Map<string, string>();
  const claim = (kind: string, id: string, name: string) => {
    if (!name.trim()) {
      issues.push({ field: id, message: "Name required" });
      return;
    }
    if (!isIdent(name)) {
      issues.push({ field: id, message: "Letters, numbers, and underscore only" });
      return;
    }
    if (RESERVED.has(name)) {
      issues.push({ field: id, message: `"${name}" is reserved` });
      return;
    }
    const prev = names.get(name);
    if (prev) issues.push({ field: id, message: `"${name}" is already used in this engine` });
    else names.set(name, kind);
  };

  for (const v of engine.variables) claim("var", v.id, v.name);
  for (const v of engine.values) claim("val", v.id, v.name);
  for (const f of engine.functions) claim("fn", f.id, f.name);
  for (const a of engine.arrays) claim("arr", a.id, a.name);

  const known = knownNames(engine, engines);

  for (const v of engine.variables) {
    if (!v.initial.trim()) issues.push({ field: `${v.id}:initial`, message: "Initial value required" });
    else {
      const err = lintExpr(v.initial, new Set());
      if (err) issues.push({ field: `${v.id}:initial`, message: err });
    }
    if (v.update.trim()) {
      const err = lintExpr(v.update, known);
      if (err) issues.push({ field: `${v.id}:update`, message: err });
    }
  }
  for (const v of engine.values) {
    const err = v.expr.trim() ? lintExpr(v.expr, known) : "Empty expression";
    if (err) issues.push({ field: v.id, message: err });
  }
  for (const f of engine.functions) {
    const params = parseParams(f.params);
    if (params.error) issues.push({ field: `${f.id}:params`, message: params.error });
    const err = f.expr.trim() ? lintExpr(f.expr, known, params.params) : "Empty expression";
    if (err) issues.push({ field: f.id, message: err });
  }
  for (const a of engine.arrays) {
    const parsed = parseNumberList(a.values);
    if (parsed.error) issues.push({ field: a.id, message: parsed.error });
  }

  const effect = engine.effect;
  if (effect.type === "speed" || effect.type === "seed" || effect.type === "inject") {
    if (!effect.source) issues.push({ field: "effect", message: "Choose a value to drive this effect" });
  }
  if (effect.type === "tint" || effect.type === "nudge") {
    if (!effect.source) issues.push({ field: "effect", message: "Choose a function" });
    else if (!engine.functions.some((f) => f.name === effect.source)) {
      issues.push({ field: "effect", message: `No function named "${effect.source}"` });
    }
  }
  if (effect.type === "rule") {
    if (!effect.birth && !effect.survive) issues.push({ field: "effect", message: "Choose a birth or survive array" });
  }
  return issues;
}

export type CompiledFn = { name: string; params: string[]; body: Program["ast"] };
export type CompiledEngine = {
  variables: { id: string; name: string; initial: Program; update: Program | null }[];
  values: { id: string; name: string; prog: Program }[];
  valueOrder: number[];
  functions: CompiledFn[];
  arrays: { name: string; data: number[] }[];
  error: string | null;
};

export function compileEngine(engine: EngineDef): CompiledEngine {
  const issues = engineIssues(engine, [engine]);
  const hard = issues.find((i) => i.field === "name" || engine.variables.some((v) => v.id === i.field));
  try {
    const variables = engine.variables.map((v) => ({
      id: v.id,
      name: v.name,
      initial: tryCompile(v.initial || "0").program ?? compileSafe("0"),
      update: v.update.trim() ? tryCompile(v.update).program : null,
    }));
    const values = engine.values.map((v) => {
      const compiled = tryCompile(v.expr);
      return { id: v.id, name: v.name, prog: compiled.program ?? compileSafe("0"), bad: compiled.error };
    });
    const functions: CompiledFn[] = [];
    for (const f of engine.functions) {
      const params = parseParams(f.params);
      const compiled = tryCompile(f.expr || "0");
      if (!compiled.program || params.error) continue;
      functions.push({ name: f.name, params: params.params, body: compiled.program.ast });
    }
    const arrays = engine.arrays.map((a) => ({
      name: a.name,
      data: parseNumberList(a.values).values,
    }));
    const valueOrder = orderValues(values.map((v) => v.name), values.map((v) => v.prog.refs));
    const badValue = values.find((v) => v.bad);
    return {
      variables: variables.map((v) => ({ id: v.id, name: v.name, initial: v.initial, update: v.update })),
      values: values.map((v) => ({ id: v.id, name: v.name, prog: v.prog })),
      valueOrder,
      functions,
      arrays,
      error: badValue?.bad ?? (valueOrder.length < values.length ? "Values depend on each other in a cycle" : null) ??
        (hard ? hard.message : null),
    };
  } catch (err) {
    return {
      variables: [],
      values: [],
      valueOrder: [],
      functions: [],
      arrays: [],
      error: err instanceof Error ? err.message : "Could not compile engine",
    };
  }
}

function compileSafe(source: string): Program {
  const compiled = tryCompile(source);
  if (!compiled.program) throw new Error(compiled.error ?? "compile failed");
  return compiled.program;
}

function orderValues(names: string[], refs: string[][]): number[] {
  const index = new Map(names.map((name, i) => [name, i]));
  const indeg = names.map(() => 0);
  const edges: number[][] = names.map(() => []);
  names.forEach((name, i) => {
    for (const ref of refs[i] ?? []) {
      if (ref === name) continue;
      const from = index.get(ref);
      if (from === undefined) continue;
      edges[from].push(i);
      indeg[i] += 1;
    }
  });
  const queue = indeg.map((d, i) => (d === 0 ? i : -1)).filter((i) => i >= 0);
  const order: number[] = [];
  for (let q = 0; q < queue.length; q += 1) {
    const i = queue[q];
    order.push(i);
    for (const j of edges[i]) {
      indeg[j] -= 1;
      if (indeg[j] === 0) queue.push(j);
    }
  }
  return order.length === names.length ? order : order;
}

export function rewriteRefs(engines: EngineDef[], from: string, to: string): EngineDef[] {
  if (!isIdent(from) || !isIdent(to) || from === to) return engines;
  const re = new RegExp(`\\b${from}\\.`, "g");
  const swap = (s: string) => s.replace(re, `${to}.`);
  return engines.map((e) => ({
    ...e,
    variables: e.variables.map((v) => ({ ...v, initial: swap(v.initial), update: swap(v.update) })),
    values: e.values.map((v) => ({ ...v, expr: swap(v.expr) })),
    functions: e.functions.map((f) => ({ ...f, expr: swap(f.expr) })),
  }));
}

export function effectLabel(effect: EffectDef): string {
  switch (effect.type) {
    case "none":
      return "Data only";
    case "speed":
      return "Drives speed";
    case "tint":
      return "Tints the field";
    case "nudge":
      return "Nudges cells";
    case "inject":
      return "Injects pattern";
    case "seed":
      return "Seeds cells";
    case "rule":
      return "Replaces rule";
  }
}

export function initialNumber(source: string): number {
  try {
    const n = evalNumber(source || "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
