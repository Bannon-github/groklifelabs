import { create } from "zustand";

export type Readout = {
  numbers: { name: string; value: number }[];
  error: string | null;
  history: number[];
  paused: boolean;
};

type HudState = {
  generation: number;
  population: number;
  speed: number;
  speedSource: string | null;
  rule: string;
  ruleSource: string | null;
  readouts: Record<string, Readout>;
};

export const useHud = create<HudState>(() => ({
  generation: 0,
  population: 0,
  speed: 12,
  speedSource: null,
  rule: "B3/S23",
  ruleSource: null,
  readouts: {},
}));
