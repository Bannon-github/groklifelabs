import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  STARTER_ENGINES,
  blankEngine,
  effectLabel,
  engineIssues,
  parseParams,
  rewriteRefs,
  uid,
  type ArrayDef,
  type EffectDef,
  type EngineDef,
  type FnDef,
  type VarDef,
} from "@/game/engines";
import { isIdent } from "@/game/expr";
import { PATTERNS } from "@/game/patterns";
import { useHud } from "@/game/hud-store";

type Props = {
  engines: EngineDef[];
  onChange: (engines: EngineDef[]) => void;
  onReset: (id: string) => void;
  onResetAll: () => void;
  ruleMode: "manual" | "engine";
  mobileOpen: boolean;
  onMobileOpen: (open: boolean) => void;
};

export function EngineBay(props: Props) {
  const { engines, mobileOpen } = props;
  return (
    <>
      <div className="px-3 pb-3 lg:hidden">
        <button type="button" className="btn btn-ghost w-full" onClick={() => props.onMobileOpen(!mobileOpen)}>
          {mobileOpen ? "Hide engines" : `Engines · ${engines.length}`}
        </button>
      </div>
      <aside
        className={
          mobileOpen
            ? "flex max-h-[48dvh] min-h-0 w-full shrink-0 flex-col border-t border-line bg-surface lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l"
            : "hidden min-h-0 w-96 shrink-0 flex-col border-l border-line bg-surface lg:flex"
        }
      >
        <BayBody {...props} />
      </aside>
    </>
  );
}

function BayBody({ engines, onChange, onReset, onResetAll, ruleMode }: Props) {
  const [openId, setOpenId] = useState<string | null>(engines[0]?.id ?? null);
  const cycle = hasCycle(engines);

  const patch = (id: string, next: EngineDef) => {
    onChange(engines.map((engine) => (engine.id === id ? next : engine)));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div>
          <h2 className="text-base font-medium tracking-tight">Engines</h2>
          <p className="text-xs text-muted">Data that can drive the grid</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const next = blankEngine(engines);
            onChange([...engines, next]);
            setOpenId(next.id);
          }}
        >
          <Plus className="size-4" aria-hidden />
          New
        </button>
      </div>
      <details className="mx-4 mb-3 rounded-lg border border-line px-3 py-2 text-sm text-muted">
        <summary className="cursor-pointer font-medium text-fg">How a connection works</summary>
        <p className="pt-2 leading-normal">
          Variables remember a number. Values and functions recompute every generation. Arrays stay fixed.
          Read another engine by name, as in Clock.swing, then bind an effect to speed, color, cells, or the rule.
        </p>
      </details>
      {cycle ? (
        <p className="mx-4 mb-3 text-xs text-muted">A read cycle uses the previous generation for the loop.</p>
      ) : null}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {engines.length === 0 ? (
          <p className="rounded-lg border border-line bg-bg px-3 py-4 text-sm text-muted">
            No engines yet. Create one to generate data and wire it into the simulation.
          </p>
        ) : null}
        {engines.map((engine) => (
          <EngineCard
            key={engine.id}
            engine={engine}
            engines={engines}
            open={openId === engine.id}
            ruleMode={ruleMode}
            onToggle={() => setOpenId((id) => (id === engine.id ? null : engine.id))}
            onChange={(next) => patch(engine.id, next)}
            onDelete={() => onChange(engines.filter((item) => item.id !== engine.id))}
            onDuplicate={() => {
              const copy: EngineDef = {
                ...structuredClone(engine),
                id: uid("eng"),
                name: uniqueName(`${engine.name}Copy`, engines),
                enabled: false,
              };
              onChange([...engines, copy]);
              setOpenId(copy.id);
            }}
            onReset={() => onReset(engine.id)}
            onRename={(from, to) => onChange(rewriteRefs(engines, from, to))}
          />
        ))}
        <button type="button" className="btn btn-ghost w-full" onClick={onResetAll}>
          <RotateCcw className="size-4" aria-hidden />
          Reset engine state
        </button>
        <button
          type="button"
          className="btn btn-ghost w-full"
          onClick={() => {
            onChange(structuredClone(STARTER_ENGINES));
            setOpenId("eng_clock");
          }}
        >
          Restore examples
        </button>
      </div>
    </div>
  );
}

function EngineCard({
  engine,
  engines,
  open,
  ruleMode,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
  onReset,
  onRename,
}: {
  engine: EngineDef;
  engines: EngineDef[];
  open: boolean;
  ruleMode: "manual" | "engine";
  onToggle: () => void;
  onChange: (engine: EngineDef) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReset: () => void;
  onRename: (from: string, to: string) => void;
}) {
  const issues = engineIssues(engine, engines);
  const committed = useRef(engine.name);
  useEffect(() => {
    committed.current = engine.name;
    // Only when switching cards. Typing updates the name without moving this baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.id]);

  const update = (partial: Partial<EngineDef>) => onChange({ ...engine, ...partial });
  const readers = engines.filter((item) => item.reads.includes(engine.id)).map((item) => item.name);

  return (
    <section className="rounded-lg border border-line bg-bg p-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={engine.enabled}
          aria-label={engine.enabled ? `Pause ${engine.name}` : `Run ${engine.name}`}
          className="flex h-11 w-12 items-center justify-center"
          onClick={() => update({ enabled: !engine.enabled })}
        >
          <span className="flex h-6 w-11 items-center rounded-full border border-line bg-surface-2 p-0.5">
            <span
              className={
                engine.enabled
                  ? "size-5 translate-x-5 rounded-full bg-accent transition-transform"
                  : "size-5 translate-x-0 rounded-full bg-subtle transition-transform"
              }
            />
          </span>
        </button>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onToggle}>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{engine.name}</span>
            <span className="block truncate text-xs text-muted">{effectLabel(engine.effect)}</span>
          </span>
          <ChevronDown className={open ? "size-4 rotate-180 text-muted" : "size-4 text-muted"} aria-hidden />
        </button>
      </div>
      <Readout id={engine.id} />
      {open ? (
        <div className="mt-2 space-y-4 border-t border-line px-1 pt-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">Name</span>
            <input
              className="field"
              value={engine.name}
              aria-label="Engine name"
              onChange={(e) => update({ name: e.target.value })}
              onBlur={() => {
                const next = engine.name.trim();
                if (next !== engine.name) update({ name: next });
                const from = committed.current;
                if (isIdent(from) && isIdent(next) && from !== next) {
                  onRename(from, next);
                  committed.current = next;
                }
              }}
            />
            <FieldError message={msg(issues, "name")} />
          </label>

          <Section
            title="Variables"
            hint="Remembered numbers. The update sees the previous value. Leave update blank to keep a constant."
            onAdd={() =>
              update({
                variables: [...engine.variables, { id: uid("var"), name: fresh("v", taken(engine)), initial: "0", update: "" }],
              })
            }
            addLabel="Add variable"
          >
            {engine.variables.map((variable) => (
              <VarRow
                key={variable.id}
                variable={variable}
                error={msg(issues, variable.id)}
                initialError={msg(issues, `${variable.id}:initial`)}
                updateError={msg(issues, `${variable.id}:update`)}
                onChange={(next) => update({ variables: engine.variables.map((item) => (item.id === variable.id ? next : item)) })}
                onRemove={() => update({ variables: engine.variables.filter((item) => item.id !== variable.id) })}
              />
            ))}
          </Section>

          <Section
            title="Values"
            hint="Fresh results each generation. Other engines read them as Name.value."
            onAdd={() =>
              update({
                values: [...engine.values, { id: uid("val"), name: fresh("out", taken(engine)), expr: "0" }],
              })
            }
            addLabel="Add value"
          >
            {engine.values.map((value) => (
              <ExprRow
                key={value.id}
                name={value.name}
                expr={value.expr}
                nameLabel="Value name"
                exprLabel="Value expression"
                error={msg(issues, value.id)}
                onName={(name) => update({ values: replaceName(engine.values, value.id, name) })}
                onExpr={(expr) => update({ values: engine.values.map((item) => (item.id === value.id ? { ...item, expr } : item)) })}
                onRemove={() => update({ values: engine.values.filter((item) => item.id !== value.id) })}
              />
            ))}
          </Section>

          <Section
            title="Functions"
            hint="Reusable formulas. Use x and y for a field across the grid."
            onAdd={() =>
              update({
                functions: [
                  ...engine.functions,
                  { id: uid("fn"), name: fresh("field", taken(engine)), params: "x, y", expr: "sin(x * 0.2) * sin(y * 0.2)" },
                ],
              })
            }
            addLabel="Add function"
          >
            {engine.functions.map((fn) => (
              <FnRow
                key={fn.id}
                fn={fn}
                error={msg(issues, fn.id)}
                paramError={msg(issues, `${fn.id}:params`)}
                onChange={(next) => update({ functions: engine.functions.map((item) => (item.id === fn.id ? next : item)) })}
                onRemove={() => update({ functions: engine.functions.filter((item) => item.id !== fn.id) })}
              />
            ))}
          </Section>

          <Section
            title="Arrays"
            hint="Fixed lists, separated by commas. Index them with seq[0], or pass one to sum()."
            onAdd={() =>
              update({
                arrays: [...engine.arrays, { id: uid("arr"), name: fresh("seq", taken(engine)), values: "0, 1, 2" }],
              })
            }
            addLabel="Add array"
          >
            {engine.arrays.map((arr) => (
              <ArrayRow
                key={arr.id}
                arr={arr}
                error={msg(issues, arr.id)}
                onChange={(next) => update({ arrays: engine.arrays.map((item) => (item.id === arr.id ? next : item)) })}
                onRemove={() => update({ arrays: engine.arrays.filter((item) => item.id !== arr.id) })}
              />
            ))}
          </Section>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted">Connections</h3>
            <div className="flex flex-wrap gap-2">
              {engines.filter((item) => item.id !== engine.id).length === 0 ? (
                <p className="text-xs text-subtle">Create another engine to read from it.</p>
              ) : null}
              {engines
                .filter((item) => item.id !== engine.id)
                .map((item) => {
                  const on = engine.reads.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="chip"
                      data-on={on ? "true" : "false"}
                      aria-pressed={on}
                      onClick={() =>
                        update({
                          reads: on ? engine.reads.filter((id) => id !== item.id) : [...engine.reads, item.id],
                        })
                      }
                    >
                      {item.name}
                    </button>
                  );
                })}
            </div>
            <p className="text-xs text-subtle">
              {readers.length ? `Read by ${readers.join(", ")}` : "Not read by other engines yet."}
            </p>
          </div>

          <EffectEditor engine={engine} issues={issues} ruleMode={ruleMode} onChange={(effect) => update({ effect })} />

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={onReset}>
              Reset state
            </button>
            <button type="button" className="btn btn-ghost" onClick={onDuplicate}>
              Duplicate
            </button>
            <button type="button" className="btn btn-ghost text-danger" onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Readout({ id }: { id: string }) {
  const readout = useHud((s) => s.readouts[id]);
  if (!readout) return null;
  return (
    <div className="px-2 pt-1">
      {readout.error ? <p className="text-xs text-danger">{readout.error}</p> : null}
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted tabular-nums">
        {readout.numbers.slice(0, 4).map((item) => (
          <span key={item.name}>
            {item.name} {fmt(item.value)}
          </span>
        ))}
        {readout.paused ? <span>paused</span> : null}
      </div>
      <Spark values={readout.history} />
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const shown = values.slice(-36);
  return (
    <div className="mt-2 flex h-8 items-end gap-px" aria-hidden>
      {shown.map((value, index) => (
        <span
          key={`${index}-${shown.length}`}
          className="min-w-px flex-1 bg-fg/70"
          style={{ height: `${12 + ((value - min) / span) * 88}%` }}
        />
      ))}
    </div>
  );
}

function Section({
  title,
  hint,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  hint: string;
  onAdd: () => void;
  addLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted">{title}</h3>
        <button type="button" className="btn btn-ghost px-3 text-xs" onClick={onAdd}>
          <Plus className="size-3.5" aria-hidden />
          {addLabel}
        </button>
      </div>
      <p className="text-xs leading-normal text-subtle">{hint}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function VarRow({
  variable,
  error,
  initialError,
  updateError,
  onChange,
  onRemove,
}: {
  variable: VarDef;
  error: string | null;
  initialError: string | null;
  updateError: string | null;
  onChange: (next: VarDef) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="row-2">
        <input className="field" aria-label="Variable name" value={variable.name} onChange={(e) => onChange({ ...variable, name: e.target.value })} />
        <input
          className="field"
          aria-label="Initial value"
          value={variable.initial}
          onChange={(e) => onChange({ ...variable, initial: e.target.value })}
        />
        <Remove onClick={onRemove} label={`Remove variable ${variable.name}`} />
      </div>
      <input
        className="field"
        aria-label="Update expression"
        placeholder="Update expression"
        value={variable.update}
        onChange={(e) => onChange({ ...variable, update: e.target.value })}
      />
      <FieldError message={error || initialError || updateError} />
    </div>
  );
}

function ExprRow({
  name,
  expr,
  nameLabel,
  exprLabel,
  error,
  onName,
  onExpr,
  onRemove,
}: {
  name: string;
  expr: string;
  nameLabel: string;
  exprLabel: string;
  error: string | null;
  onName: (name: string) => void;
  onExpr: (expr: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="row-3">
        <input className="field" aria-label={nameLabel} value={name} onChange={(e) => onName(e.target.value)} />
        <input className="field" aria-label={exprLabel} value={expr} onChange={(e) => onExpr(e.target.value)} />
        <Remove onClick={onRemove} label={`Remove ${name}`} />
      </div>
      <FieldError message={error} />
    </div>
  );
}

function FnRow({
  fn,
  error,
  paramError,
  onChange,
  onRemove,
}: {
  fn: FnDef;
  error: string | null;
  paramError: string | null;
  onChange: (fn: FnDef) => void;
  onRemove: () => void;
}) {
  const parsed = parseParams(fn.params);
  return (
    <div className="space-y-1">
      <div className="row-3">
        <input className="field" aria-label="Function name" value={fn.name} onChange={(e) => onChange({ ...fn, name: e.target.value })} />
        <input
          className="field"
          aria-label="Parameters"
          value={fn.params}
          onChange={(e) => onChange({ ...fn, params: e.target.value })}
        />
        <Remove onClick={onRemove} label={`Remove function ${fn.name}`} />
      </div>
      <input className="field" aria-label="Function expression" value={fn.expr} onChange={(e) => onChange({ ...fn, expr: e.target.value })} />
      <p className="text-xs text-subtle">{parsed.params.length ? `Call as ${fn.name}(${parsed.params.join(", ")})` : "No parameters"}</p>
      <FieldError message={paramError || error} />
    </div>
  );
}

function ArrayRow({
  arr,
  error,
  onChange,
  onRemove,
}: {
  arr: ArrayDef;
  error: string | null;
  onChange: (arr: ArrayDef) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="row-3">
        <input className="field" aria-label="Array name" value={arr.name} onChange={(e) => onChange({ ...arr, name: e.target.value })} />
        <input className="field" aria-label="Array values" value={arr.values} onChange={(e) => onChange({ ...arr, values: e.target.value })} />
        <Remove onClick={onRemove} label={`Remove array ${arr.name}`} />
      </div>
      <FieldError message={error} />
    </div>
  );
}

function EffectEditor({
  engine,
  issues,
  ruleMode,
  onChange,
}: {
  engine: EngineDef;
  issues: { field: string; message: string }[];
  ruleMode: "manual" | "engine";
  onChange: (effect: EffectDef) => void;
}) {
  const effect = engine.effect;
  const numeric = names([...engine.variables.map((item) => item.name), ...engine.values.map((item) => item.name)]);
  const fns = names(engine.functions.map((item) => item.name));
  const arrays = names(engine.arrays.map((item) => item.name));

  const setType = (type: EffectDef["type"]) => {
    if (type === "none") onChange({ type: "none" });
    else if (type === "tint" || type === "nudge") onChange({ type, source: fns[0] ?? "" });
    else if (type === "rule") onChange({ type: "rule", birth: arrays[0] ?? "", survive: arrays[1] ?? arrays[0] ?? "" });
    else if (type === "inject") onChange({ type: "inject", source: numeric[0] ?? "", pattern: "glider" });
    else onChange({ type, source: numeric[0] ?? "" });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted">Effect</h3>
      <select className="field" aria-label="Effect" value={effect.type} onChange={(e) => setType(e.target.value as EffectDef["type"])}>
        <option value="none">Data only</option>
        <option value="speed">Drive speed</option>
        <option value="tint">Tint the field</option>
        <option value="nudge">Nudge cells</option>
        <option value="inject">Inject a pattern</option>
        <option value="seed">Seed cells</option>
        <option value="rule">Replace the rule</option>
      </select>
      {effect.type === "speed" || effect.type === "seed" || effect.type === "inject" ? (
        <select
          className="field"
          aria-label="Source value"
          value={effect.source}
          onChange={(e) => onChange({ ...effect, source: e.target.value })}
        >
          <option value="">Choose a value</option>
          {numeric.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : null}
      {effect.type === "tint" || effect.type === "nudge" ? (
        <select
          className="field"
          aria-label="Source function"
          value={effect.source}
          onChange={(e) => onChange({ ...effect, source: e.target.value })}
        >
          <option value="">Choose a function</option>
          {fns.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : null}
      {effect.type === "inject" ? (
        <>
          <select
            className="field"
            aria-label="Pattern to inject"
            value={effect.pattern}
            onChange={(e) => onChange({ ...effect, pattern: e.target.value })}
          >
            {PATTERNS.filter((pattern) => ["glider", "blinker", "lwss", "block"].includes(pattern.id)).map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-subtle">Fires on the rising edge. Uses values named px and py when you define them.</p>
        </>
      ) : null}
      {effect.type === "seed" ? (
        <p className="text-xs text-subtle">The value is how many new cells to add each generation.</p>
      ) : null}
      {effect.type === "nudge" ? (
        <p className="text-xs text-subtle">Cells turn on above 0.72 and off below -0.72. Anything between is left alone.</p>
      ) : null}
      {effect.type === "rule" ? (
        <>
          <select className="field" aria-label="Birth array" value={effect.birth} onChange={(e) => onChange({ ...effect, birth: e.target.value })}>
            <option value="">Birth counts</option>
            {arrays.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="field"
            aria-label="Survive array"
            value={effect.survive}
            onChange={(e) => onChange({ ...effect, survive: e.target.value })}
          >
            <option value="">Survive counts</option>
            {arrays.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {ruleMode === "manual" ? (
            <p className="text-xs text-subtle">Switch rule source to Engines before this replaces Life.</p>
          ) : null}
        </>
      ) : null}
      <FieldError message={msg(issues, "effect")} />
    </div>
  );
}

function Remove({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="btn btn-ghost w-11 px-0" aria-label={label} onClick={onClick}>
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-xs text-danger">{message}</p>;
}

function msg(issues: { field: string; message: string }[], field: string): string | null {
  return issues.find((issue) => issue.field === field)?.message ?? null;
}

function names(list: string[]): string[] {
  return list.filter((name) => isIdent(name));
}

function taken(engine: EngineDef): Set<string> {
  return new Set(
    [...engine.variables, ...engine.values, ...engine.functions, ...engine.arrays].map((item) => item.name),
  );
}

function fresh(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

function replaceName<T extends { id: string; name: string }>(list: T[], id: string, name: string): T[] {
  return list.map((item) => (item.id === id ? { ...item, name } : item));
}

function uniqueName(base: string, engines: EngineDef[]): string {
  const used = new Set(engines.map((engine) => engine.name));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 0.001 || abs >= 10000)) return n.toExponential(2);
  return String(Math.round(n * 1000) / 1000);
}

function hasCycle(engines: EngineDef[]): boolean {
  const byId = new Map(engines.map((engine) => [engine.id, engine]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string): boolean => {
    if (visited.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    for (const read of byId.get(id)?.reads ?? []) {
      if (byId.has(read) && walk(read)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return engines.some((engine) => walk(engine.id));
}
