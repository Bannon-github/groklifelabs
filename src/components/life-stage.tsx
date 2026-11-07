import { forwardRef, useEffect, useImperativeHandle, useRef, type MutableRefObject } from "react";
import { FIELD_COLS, FIELD_ROWS, type Simulation } from "@/game/sim";

const ZOOMS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 28, 40, 56];
const BG = "#0c0d0c";
const FIELD = "#b7c9be";
const SHADE = "#070908";
const HAIR = "#d7e3db";
const LIVE = ["#8ea79c", "#a9bdb3", "#c5d4cb", "#e3ece7", "#f4f7f5"];

export type Tool = "paint" | "erase" | "pan";
export type SpaceState = { down: boolean; dragged: boolean };

export type StageHandle = {
  zoom: (dir: 1 | -1) => void;
  fit: () => void;
};

type Cam = { cell: number; panX: number; panY: number; dpr: number };

type Props = {
  sim: Simulation;
  runningRef: MutableRefObject<boolean>;
  spaceRef: MutableRefObject<SpaceState>;
  tool: Tool;
  brush: number;
  showGrid: boolean;
  fitToken: number;
};

export const LifeStage = forwardRef<StageHandle, Props>(function LifeStage(
  { sim, runningRef, spaceRef, tool, brush, showGrid, fitToken },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLSpanElement>(null);
  const camRef = useRef<Cam>({ cell: 8, panX: 0, panY: 0, dpr: 1 });
  const toolRef = useRef(tool);
  const brushRef = useRef(brush);
  const gridRef = useRef(showGrid);
  const drawRef = useRef<() => void>(() => {});
  toolRef.current = tool;
  brushRef.current = brush;
  gridRef.current = showGrid;

  const frameGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const viewW = Math.max(1, Math.round(rect.width * dpr));
    const viewH = Math.max(1, Math.round(rect.height * dpr));
    const cam = camRef.current;
    cam.dpr = dpr;
    const choices = [10, 12, 8, 14, 6, 4, 3, 2];
    let cell = 4;
    for (const z of choices) {
      if (viewW / z >= 22 && viewH / z >= 14) {
        cell = z;
        break;
      }
    }
    cam.cell = cell;
    cam.panX = Math.round((viewW - sim.cols * cell) / 2);
    cam.panY = Math.round((viewH - sim.rows * cell) / 2);
    syncZoom();
  };

  const fit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const viewW = Math.max(1, Math.round(rect.width * dpr));
    const viewH = Math.max(1, Math.round(rect.height * dpr));
    const cam = camRef.current;
    cam.dpr = dpr;
    let cell = ZOOMS[0];
    for (const z of ZOOMS) {
      if (z * sim.cols <= viewW - 12 && z * sim.rows <= viewH - 12) cell = z;
    }
    cam.cell = cell;
    cam.panX = Math.round((viewW - sim.cols * cell) / 2);
    cam.panY = Math.round((viewH - sim.rows * cell) / 2);
    syncZoom();
  };

  const syncZoom = () => {
    const cam = camRef.current;
    const css = cam.cell / (cam.dpr || 1);
    if (zoomRef.current) {
      zoomRef.current.textContent = `${Number.isInteger(css) ? css.toFixed(0) : css.toFixed(1)} px`;
    }
  };

  useImperativeHandle(ref, () => ({
    zoom: (dir) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      zoomAt(camRef.current, canvas.width / 2, canvas.height / 2, dir);
      clampPan(camRef.current, canvas.width, canvas.height, sim.cols, sim.rows);
      syncZoom();
      drawRef.current();
    },
    fit: () => {
      fit();
      drawRef.current();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cam = camRef.current;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hover: { col: number; row: number } | null = null;
    let painting = false;
    let panning = false;
    let erase = false;
    let lastCol = -1;
    let lastRow = -1;
    let undoArmed = false;
    let panOrigin = { x: 0, y: 0, panX: 0, panY: 0 };
    let wheelAcc = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { dist: number; midX: number; midY: number; panX: number; panY: number; cell: number } | null = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (cam.dpr && Math.abs(dpr - cam.dpr) > 0.01) {
        const k = dpr / cam.dpr;
        cam.cell = Math.max(1, Math.round(cam.cell * k));
        cam.panX = Math.round(cam.panX * k);
        cam.panY = Math.round(cam.panY * k);
      }
      cam.dpr = dpr;
      const bw = Math.max(1, Math.round(rect.width * dpr));
      const bh = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      return { bw, bh };
    };

    const draw = () => {
      const { bw, bh } = resize();
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, bw, bh);
      const cell = Math.max(1, cam.cell);
      const { panX, panY } = cam;
      const cols = sim.cols;
      const rows = sim.rows;
      const c0 = Math.max(0, Math.floor(-panX / cell) - 1);
      const r0 = Math.max(0, Math.floor(-panY / cell) - 1);
      const c1 = Math.min(cols, Math.ceil((bw - panX) / cell) + 1);
      const r1 = Math.min(rows, Math.ceil((bh - panY) / cell) + 1);
      const gap = gridRef.current && cell >= 6 ? 1 : 0;

      if (sim.fieldActive) {
        const sx = cols / FIELD_COLS;
        const sy = rows / FIELD_ROWS;
        for (let fy = 0; fy < FIELD_ROWS; fy += 1) {
          const y = panY + fy * sy * cell;
          const h = Math.max(1, Math.ceil(sy * cell));
          if (y + h < 0 || y > bh) continue;
          for (let fx = 0; fx < FIELD_COLS; fx += 1) {
            const v = sim.field[fy * FIELD_COLS + fx] ?? 0;
            if (v < 0.08 && v > -0.08) continue;
            const x = panX + fx * sx * cell;
            const w = Math.max(1, Math.ceil(sx * cell));
            if (x + w < 0 || x > bw) continue;
            if (v > 0) {
              ctx.globalAlpha = Math.min(0.22, v * 0.16);
              ctx.fillStyle = FIELD;
            } else {
              ctx.globalAlpha = Math.min(0.4, -v * 0.22);
              ctx.fillStyle = SHADE;
            }
            ctx.fillRect(x, y, w, h);
          }
        }
        ctx.globalAlpha = 1;
      }

      let bucket = -1;
      const cells = sim.cells;
      for (let r = r0; r < r1; r += 1) {
        const row = r * cols;
        const y = panY + r * cell;
        for (let c = c0; c < c1; c += 1) {
          if (!cells[row + c]) continue;
          let b = 4;
          if (sim.fieldActive) {
            const v = sim.sampleFieldAt(c, r);
            b = v < -0.6 ? 0 : v < -0.25 ? 1 : v < 0.2 ? 2 : v < 0.55 ? 3 : 4;
          }
          if (b !== bucket) {
            ctx.fillStyle = LIVE[b] ?? LIVE[4];
            bucket = b;
          }
          ctx.fillRect(panX + c * cell, y, Math.max(1, cell - gap), Math.max(1, cell - gap));
        }
      }

      if (hover && hover.col >= 0 && hover.row >= 0 && hover.col < cols && hover.row < rows && toolRef.current !== "pan") {
        const radius = Math.max(0, (brushRef.current - 1) >> 1);
        const x = panX + (hover.col - radius) * cell;
        const y = panY + (hover.row - radius) * cell;
        const size = (radius * 2 + 1) * cell;
        ctx.strokeStyle = HAIR;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, size - 1), Math.max(1, size - 1));
      }
    };
    drawRef.current = draw;

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (runningRef.current) {
        acc += dt;
        const stepDt = 1 / Math.max(1, sim.speed);
        let guard = 0;
        while (acc >= stepDt && guard < 5) {
          sim.step();
          acc -= stepDt;
          guard += 1;
        }
        if (guard >= 5) acc = 0;
      } else {
        acc = 0;
      }
      draw();
      raf = requestAnimationFrame(frame);
    };

    const worldOf = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
      const y = ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;
      return {
        x,
        y,
        col: Math.floor((x - cam.panX) / cam.cell),
        row: Math.floor((y - cam.panY) / cam.cell),
      };
    };

    const showCoord = (col: number, row: number) => {
      if (!coordRef.current) return;
      if (col < 0 || row < 0 || col >= sim.cols || row >= sim.rows) coordRef.current.textContent = "—";
      else coordRef.current.textContent = `${col}, ${row}`;
    };

    const beginPan = (x: number, y: number) => {
      panning = true;
      painting = false;
      panOrigin = { x, y, panX: cam.panX, panY: cam.panY };
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const p = worldOf(e.clientX, e.clientY);
      pointers.set(e.pointerId, { x: p.x, y: p.y });
      if (pointers.size >= 2) {
        const pts = [...pointers.values()];
        const a = pts[0];
        const b = pts[1];
        if (!a || !b) return;
        pinch = {
          dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          midX: (a.x + b.x) / 2,
          midY: (a.y + b.y) / 2,
          panX: cam.panX,
          panY: cam.panY,
          cell: cam.cell,
        };
        painting = false;
        panning = false;
        return;
      }
      const wantsPan = e.button === 1 || toolRef.current === "pan" || spaceRef.current.down;
      if (wantsPan) {
        beginPan(p.x, p.y);
        return;
      }
      painting = true;
      erase = e.button === 2 || toolRef.current === "erase";
      if (!undoArmed) {
        sim.pushUndo();
        undoArmed = true;
      }
      lastCol = p.col;
      lastRow = p.row;
      sim.paintDot(p.col, p.row, !erase, brushRef.current);
      draw();
    };

    const onMove = (e: PointerEvent) => {
      const p = worldOf(e.clientX, e.clientY);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: p.x, y: p.y });
      hover = { col: p.col, row: p.row };
      showCoord(p.col, p.row);

      if (pinch && pointers.size >= 2) {
        const pts = [...pointers.values()];
        const a = pts[0];
        const b = pts[1];
        if (!a || !b) return;
        const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const ratio = dist / pinch.dist;
        const wanted = pinch.cell * ratio;
        let next = ZOOMS[0];
        for (const z of ZOOMS) if (Math.abs(z - wanted) < Math.abs(next - wanted)) next = z;
        const wx = (pinch.midX - pinch.panX) / pinch.cell;
        const wy = (pinch.midY - pinch.panY) / pinch.cell;
        cam.cell = next;
        cam.panX = Math.round(midX - wx * next + (midX - pinch.midX));
        cam.panY = Math.round(midY - wy * next + (midY - pinch.midY));
        clampPan(cam, canvas.width, canvas.height, sim.cols, sim.rows);
        syncZoom();
        spaceRef.current.dragged = true;
        return;
      }

      if (panning || (spaceRef.current.down && e.buttons)) {
        if (!panning) beginPan(p.x, p.y);
        cam.panX = Math.round(panOrigin.panX + (p.x - panOrigin.x));
        cam.panY = Math.round(panOrigin.panY + (p.y - panOrigin.y));
        clampPan(cam, canvas.width, canvas.height, sim.cols, sim.rows);
        spaceRef.current.dragged = true;
        return;
      }
      if (!painting) return;
      const list = e.getCoalescedEvents?.() ?? [e];
      for (const ev of list) {
        const q = worldOf(ev.clientX, ev.clientY);
        if (lastCol >= 0) sim.paintAt(lastCol, lastRow, q.col, q.row, !erase, brushRef.current);
        else sim.paintDot(q.col, q.row, !erase, brushRef.current);
        lastCol = q.col;
        lastRow = q.row;
      }
    };

    const endPointer = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) {
        const was = painting;
        painting = false;
        panning = false;
        undoArmed = false;
        lastCol = -1;
        lastRow = -1;
        if (was) sim.publish(true);
      }
    };

    const onLeave = () => {
      hover = null;
      if (coordRef.current) coordRef.current.textContent = "—";
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = worldOf(e.clientX, e.clientY);
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > 0.5) {
        cam.panX -= e.deltaX;
        cam.panY -= e.deltaY;
        clampPan(cam, canvas.width, canvas.height, sim.cols, sim.rows);
        return;
      }
      wheelAcc += e.deltaY;
      const steps = wheelAcc > 0 ? Math.floor(wheelAcc / 70) : Math.ceil(wheelAcc / 70);
      if (steps === 0) return;
      wheelAcc -= steps * 70;
      const dir = steps > 0 ? -1 : 1;
      for (let i = 0; i < Math.min(4, Math.abs(steps)); i += 1) zoomAt(cam, p.x, p.y, dir);
      clampPan(cam, canvas.width, canvas.height, sim.cols, sim.rows);
      syncZoom();
    };

    const onMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onMenu);

    const boot = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) {
        raf = requestAnimationFrame(boot);
        return;
      }
      frameGrid();
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    boot();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onMenu);
    };
    // The loop closes over a stable sim instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  const framed = useRef(false);
  useEffect(() => {
    if (!framed.current) {
      framed.current = true;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || canvas.getBoundingClientRect().width < 8) return;
    frameGrid();
    drawRef.current();
    // fitToken is the explicit signal that the grid size changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

  const cursor = tool === "pan" ? "cursor-grab" : "cursor-crosshair";

  return (
    <div className="relative min-h-0 flex-1 bg-bg">
      <canvas
        ref={canvasRef}
        className={`h-full w-full touch-none ${cursor}`}
        aria-label="Conway grid. Drag to paint living cells."
      />
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 font-mono text-xs text-muted">
        <span ref={coordRef}>—</span>
        <span ref={zoomRef}>—</span>
      </div>
    </div>
  );
});

function zoomAt(cam: Cam, x: number, y: number, dir: 1 | -1) {
  let index = ZOOMS.indexOf(cam.cell);
  if (index < 0) {
    index = 0;
    for (let i = 0; i < ZOOMS.length; i += 1) if ((ZOOMS[i] ?? 1) <= cam.cell) index = i;
  }
  const next = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, index + dir))];
  if (!next || next === cam.cell) return;
  const wx = (x - cam.panX) / cam.cell;
  const wy = (y - cam.panY) / cam.cell;
  cam.cell = next;
  cam.panX = Math.round(x - wx * next);
  cam.panY = Math.round(y - wy * next);
}

function clampPan(cam: Cam, viewW: number, viewH: number, cols: number, rows: number) {
  const worldW = cols * cam.cell;
  const worldH = rows * cam.cell;
  const margin = cam.cell * 2;
  if (worldW <= viewW) cam.panX = Math.round((viewW - worldW) / 2);
  else cam.panX = Math.round(Math.min(viewW - margin, Math.max(margin - worldW, cam.panX)));
  if (worldH <= viewH) cam.panY = Math.round((viewH - worldH) / 2);
  else cam.panY = Math.round(Math.min(viewH - margin, Math.max(margin - worldH, cam.panY)));
}
