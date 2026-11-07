import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eraser, Hand, Minus, Paintbrush, Pause, Play, Plus, RotateCcw, Shuffle, SkipForward, Trash2 } from "lucide-react";
import { STARTER_ENGINES, type EngineDef } from "@/game/engines";
import { LIFE_RULE, RULE_PRESETS, formatRule, parseRule } from "@/game/life";
import { PATTERNS, patternById } from "@/game/patterns";
import { Simulation } from "@/game/sim";
import { useHud } from "@/game/hud-store";
import { EngineBay } from "@/components/engine-bay";
import { LifeStage, type SpaceState, type StageHandle, type Tool } from "@/components/life-stage";

const KEY = "life-lab-v1";

const GRIDS = [
  { label: "100×64", cols: 100, rows: 64 },
  { label: "160×100", cols: 160, rows: 100 },
  { label: "220×140", cols: 220, rows: 140 },
];

type Settings = {
  wrap: boolean;
  showGrid: boolean;
  baseSpeed: number;
  ruleMode: "manual" | "engine";
  ruleText: string;
  cols: number;
  rows: number;
  density: number;
  tool: Tool;
  brush: number;
  keepBoard: boolean;
};

const DEFAULTS: Settings = {
  wrap: true,
  showGrid: true,
  baseSpeed: 12,
  ruleMode: "manual",
  ruleText: "B3/S23",
  cols: 160,
  rows: 100,
  density: 0.28,
  tool: "paint",
  brush: 1,
  keepBoard: false,
};

export function LifeApp() {
  const simRef = useRef<Simulation | null>(null);
  if (simRef.current === null) simRef.current = new Simulation();
  const sim = simRef.current;

  const [engines, setEngines] = useState<EngineDef[]>(() => structuredClone(STARTER_ENGINES));
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [running, setRunning] = useState(false);
  const [booted, setBooted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fitToken, setFitToken] = useState(0);
  const runningRef = useRef(false);
  const spaceRef = useRef<SpaceState>({ down: false, dragged: false });
  const stageRef = useRef<StageHandle>(null);
  runningRef.current = running;

  useEffect(() => {
    const saved = loadSave();
    const nextEngines = saved?.engines ?? structuredClone(STARTER_ENGINES);
    const nextSettings = saved?.settings ?? DEFAULTS;
    if (nextSettings.cols !== sim.cols || nextSettings.rows !== sim.rows) {
      sim.resize(nextSettings.cols, nextSettings.rows);
    }
    applySettings(sim, nextSettings);
    sim.setDefs(nextEngines);
    const gun = patternById("gosper");
    if (gun) sim.stamp(gun, true);
    setEngines(nextEngines);
    setSettings(nextSettings);
    if (nextSettings.cols !== 160 || nextSettings.rows !== 100) setFitToken((token) => token + 1);
    setBooted(true);
    setRunning(true);
    (window as unknown as { __life?: Simulation }).__life = sim;
  }, [sim]);

  useEffect(() => {
    if (!booted) return;
    applySettings(sim, settings);
  }, [booted, settings, sim]);

  useEffect(() => {
    if (!booted) return;
    sim.setDefs(engines);
  }, [booted, engines, sim]);

  useEffect(() => {
    if (!booted) return;
    const id = window.setTimeout(() => {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, engines, settings }));
    }, 250);
    return () => window.clearTimeout(id);
  }, [booted, engines, settings]);

  useEffect(() => {
    const typing = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el?.closest?.("input, textarea, select, button, a");
    };
    const onDown = (event: KeyboardEvent) => {
      if (typing(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (event.repeat) return;
        spaceRef.current.down = true;
        spaceRef.current.dragged = false;
        return;
      }
      if (event.code === "ArrowRight" || event.code === "Period") {
        event.preventDefault();
        sim.step();
        return;
      }
      if (event.key === "[") setSettings((s) => ({ ...s, baseSpeed: Math.max(1, s.baseSpeed - 1) }));
      if (event.key === "]") setSettings((s) => ({ ...s, baseSpeed: Math.min(40, s.baseSpeed + 1) }));
      if (event.key === "-" || event.key === "_") stageRef.current?.zoom(-1);
      if (event.key === "=" || event.key === "+") stageRef.current?.zoom(1);
      if (event.key === "0") stageRef.current?.fit();
      if ((event.key === "z" || event.key === "Z") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        sim.undo();
      }
      if (event.key === "g" || event.key === "G") setSettings((s) => ({ ...s, showGrid: !s.showGrid }));
      if (event.key === "w" || event.key === "W") setSettings((s) => ({ ...s, wrap: !s.wrap }));
      if (event.key === "1") setSettings((s) => ({ ...s, tool: "paint" }));
      if (event.key === "2") setSettings((s) => ({ ...s, tool: "erase" }));
      if (event.key === "3") setSettings((s) => ({ ...s, tool: "pan" }));
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (typing(event.target)) return;
      const dragged = spaceRef.current.dragged;
      spaceRef.current.down = false;
      spaceRef.current.dragged = false;
      if (!dragged) setRunning((value) => !value);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [sim]);

  const place = (id: string) => {
    const pattern = patternById(id);
    if (!pattern) return;
    sim.stamp(pattern, !settings.keepBoard);
  };

  const setRule = (text: string) => {
    const rule = parseRule(text);
    if (!rule) return;
    setSettings((s) => ({ ...s, ruleText: formatRule(rule), ruleMode: "manual" }));
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="flex h-14 shrink-0 items-center gap-3 overflow-hidden border-b border-line px-4">
        <div className="min-w-0 shrink-0">
          <p className="text-xs text-muted">Conway</p>
          <h1 className="text-lg font-medium tracking-tight">Life Lab</h1>
        </div>
        <Status />
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-2 border-b border-line px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-primary" onClick={() => setRunning((value) => !value)} aria-pressed={running}>
                {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                {running ? "Pause" : "Play"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => sim.step()}>
                <SkipForward className="size-4" aria-hidden />
                Step
              </button>
              <SpeedControl
                base={settings.baseSpeed}
                onChange={(baseSpeed) => setSettings((s) => ({ ...s, baseSpeed }))}
              />
              <button type="button" className="btn btn-ghost w-11 px-0" aria-label="Zoom out" onClick={() => stageRef.current?.zoom(-1)}>
                <Minus className="size-4" aria-hidden />
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => stageRef.current?.fit()}>
                Fit
              </button>
              <button type="button" className="btn btn-ghost w-11 px-0" aria-label="Zoom in" onClick={() => stageRef.current?.zoom(1)}>
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
            <div className="scroll-row">
              <ToolButton
                on={settings.tool === "paint"}
                label="Paint"
                onClick={() => setSettings((s) => ({ ...s, tool: "paint" }))}
                icon={<Paintbrush className="size-4" aria-hidden />}
              />
              <ToolButton
                on={settings.tool === "erase"}
                label="Erase"
                onClick={() => setSettings((s) => ({ ...s, tool: "erase" }))}
                icon={<Eraser className="size-4" aria-hidden />}
              />
              <ToolButton
                on={settings.tool === "pan"}
                label="Move"
                onClick={() => setSettings((s) => ({ ...s, tool: "pan" }))}
                icon={<Hand className="size-4" aria-hidden />}
              />
              {([1, 3, 5] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  className="chip"
                  data-on={settings.brush === size ? "true" : "false"}
                  aria-pressed={settings.brush === size}
                  onClick={() => setSettings((s) => ({ ...s, brush: size }))}
                >
                  Brush {size}
                </button>
              ))}
              <button type="button" className="chip" onClick={() => sim.clearBoard()}>
                <Trash2 className="mr-2 size-4" aria-hidden />
                Clear
              </button>
              <button type="button" className="chip" onClick={() => sim.randomize()}>
                <Shuffle className="mr-2 size-4" aria-hidden />
                Random {Math.round(settings.density * 100)}%
              </button>
              <label className="flex h-11 items-center gap-2 rounded-full border border-line px-3 text-sm">
                <span className="text-muted">Density</span>
                <input
                  type="range"
                  min={5}
                  max={70}
                  value={Math.round(settings.density * 100)}
                  aria-label="Random density"
                  onChange={(e) => setSettings((s) => ({ ...s, density: Number(e.target.value) / 100 }))}
                />
              </label>
              <button type="button" className="chip" onClick={() => sim.undo()}>
                <RotateCcw className="mr-2 size-4" aria-hidden />
                Undo
              </button>
              <button
                type="button"
                className="chip"
                data-on={settings.wrap ? "true" : "false"}
                aria-pressed={settings.wrap}
                onClick={() => setSettings((s) => ({ ...s, wrap: !s.wrap }))}
              >
                Wrap
              </button>
              <button
                type="button"
                className="chip"
                data-on={settings.showGrid ? "true" : "false"}
                aria-pressed={settings.showGrid}
                onClick={() => setSettings((s) => ({ ...s, showGrid: !s.showGrid }))}
              >
                Grid
              </button>
              <button
                type="button"
                className="chip"
                data-on={settings.keepBoard ? "true" : "false"}
                aria-pressed={settings.keepBoard}
                onClick={() => setSettings((s) => ({ ...s, keepBoard: !s.keepBoard }))}
              >
                Stamp over
              </button>
            </div>
            <div className="scroll-row">
              {PATTERNS.map((pattern) => (
                <button key={pattern.id} type="button" className="chip" onClick={() => place(pattern.id)}>
                  {pattern.name}
                </button>
              ))}
            </div>
            <div className="scroll-row">
              {RULE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="chip"
                  data-on={settings.ruleMode === "manual" && settings.ruleText === preset.text ? "true" : "false"}
                  aria-pressed={settings.ruleMode === "manual" && settings.ruleText === preset.text}
                  onClick={() => setRule(preset.text)}
                >
                  {preset.name}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                data-on={settings.ruleMode === "engine" ? "true" : "false"}
                aria-pressed={settings.ruleMode === "engine"}
                onClick={() => setSettings((s) => ({ ...s, ruleMode: s.ruleMode === "engine" ? "manual" : "engine" }))}
              >
                Rule from engines
              </button>
              {GRIDS.map((grid) => (
                <button
                  key={grid.label}
                  type="button"
                  className="chip"
                  data-on={settings.cols === grid.cols && settings.rows === grid.rows ? "true" : "false"}
                  onClick={() => {
                    if (settings.cols === grid.cols && settings.rows === grid.rows) return;
                    sim.resize(grid.cols, grid.rows);
                    setSettings((s) => ({ ...s, cols: grid.cols, rows: grid.rows }));
                    setFitToken((token) => token + 1);
                  }}
                >
                  {grid.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-subtle">Drag to paint. Right-drag erases. Scroll zooms. Space plays. Right arrow steps.</p>
          </div>
          <LifeStage
            ref={stageRef}
            sim={sim}
            runningRef={runningRef}
            spaceRef={spaceRef}
            tool={settings.tool}
            brush={settings.brush}
            showGrid={settings.showGrid}
            fitToken={fitToken}
          />
        </div>
        <EngineBay
          engines={engines}
          onChange={setEngines}
          onReset={(id) => sim.resetEngine(id)}
          onResetAll={() => sim.resetAllEngines()}
          ruleMode={settings.ruleMode}
          mobileOpen={mobileOpen}
          onMobileOpen={setMobileOpen}
        />
      </div>
    </div>
  );
}

function Status() {
  const generation = useHud((s) => s.generation);
  const population = useHud((s) => s.population);
  const rule = useHud((s) => s.rule);
  const ruleSource = useHud((s) => s.ruleSource);
  return (
    <div className="ml-auto flex items-center gap-3 font-mono text-xs tabular-nums sm:gap-4 sm:text-sm">
      <Stat label="Generation" value={generation.toLocaleString("en-US")} />
      <Stat label="Population" value={population.toLocaleString("en-US")} />
      <div className="hidden md:block">
        <Stat label="Rule" value={ruleSource ? `${rule} · ${ruleSource}` : rule} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-xs text-muted">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function SpeedControl({ base, onChange }: { base: number; onChange: (speed: number) => void }) {
  const speed = useHud((s) => s.speed);
  const source = useHud((s) => s.speedSource);
  const shown = Math.round(source ? speed : base);
  return (
    <label className="flex min-w-44 flex-1 items-center gap-3">
      <input
        type="range"
        min={1}
        max={40}
        step={1}
        value={shown}
        aria-label="Speed"
        disabled={!!source}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="shrink-0 font-mono text-xs whitespace-nowrap text-muted tabular-nums">
        {shown} gen/s{source ? ` · ${source}` : ""}
      </span>
    </label>
  );
}

function ToolButton({
  on,
  label,
  onClick,
  icon,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button type="button" className="chip" data-on={on ? "true" : "false"} aria-pressed={on} onClick={onClick}>
      <span className="mr-2 inline-flex">{icon}</span>
      {label}
    </button>
  );
}

function applySettings(sim: Simulation, settings: Settings) {
  sim.wrap = settings.wrap;
  sim.baseSpeed = clamp(settings.baseSpeed, 1, 40);
  sim.ruleMode = settings.ruleMode;
  sim.density = clamp(settings.density, 0.05, 0.7);
  const rule = parseRule(settings.ruleText) ?? LIFE_RULE;
  sim.baseRule = rule;
  if (settings.ruleMode === "manual") sim.rule = rule;
  if (!sim.speedSource) sim.speed = sim.baseSpeed;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function loadSave(): { engines: EngineDef[]; settings: Settings } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { engines?: unknown; settings?: Partial<Settings> };
    if (!Array.isArray(data.engines) || !data.engines.every(isEngine)) return null;
    const settings = { ...DEFAULTS, ...(data.settings ?? {}) };
    settings.baseSpeed = clamp(Number(settings.baseSpeed) || DEFAULTS.baseSpeed, 1, 40);
    settings.density = clamp(Number(settings.density) || DEFAULTS.density, 0.05, 0.7);
    settings.cols = clamp(Number(settings.cols) || DEFAULTS.cols, 20, 400);
    settings.rows = clamp(Number(settings.rows) || DEFAULTS.rows, 20, 300);
    settings.brush = [1, 3, 5].includes(settings.brush) ? settings.brush : 1;
    if (settings.tool !== "paint" && settings.tool !== "erase" && settings.tool !== "pan") settings.tool = "paint";
    if (settings.ruleMode !== "engine") settings.ruleMode = "manual";
    if (!parseRule(settings.ruleText)) settings.ruleText = DEFAULTS.ruleText;
    return { engines: data.engines, settings };
  } catch {
    return null;
  }
}

function isEngine(value: unknown): value is EngineDef {
  if (!value || typeof value !== "object") return false;
  const engine = value as EngineDef;
  return (
    typeof engine.id === "string" &&
    typeof engine.name === "string" &&
    typeof engine.enabled === "boolean" &&
    Array.isArray(engine.reads) &&
    Array.isArray(engine.variables) &&
    Array.isArray(engine.values) &&
    Array.isArray(engine.functions) &&
    Array.isArray(engine.arrays) &&
    !!engine.effect &&
    typeof engine.effect === "object"
  );
}
