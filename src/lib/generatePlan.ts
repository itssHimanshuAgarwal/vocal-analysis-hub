import type { Biomarkers } from "./analyzeBiomarkers";
import { HARDCODED_SIGNALS, pickSignalForAction, type Signal } from "./signals";

export type Action = {
  time: string;
  text: string;
  difficulty: "low" | "medium" | "high";
  energyMatch: boolean;
  signal: Signal | null;
};

const fmt = (h: number, m: number) => {
  const hh = ((h % 24) + 24) % 24;
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const slot = (start: Date, offsetMin: number, lengthMin: number) => {
  const s = new Date(start.getTime() + offsetMin * 60_000);
  const e = new Date(s.getTime() + lengthMin * 60_000);
  return `${fmt(s.getHours(), s.getMinutes())}–${fmt(e.getHours(), e.getMinutes())}`;
};

const matches = (energy: number, difficulty: Action["difficulty"]) => {
  if (difficulty === "high") return energy >= 60;
  if (difficulty === "medium") return energy >= 40;
  return true;
};

export function generatePlan(
  _transcript: string,
  bio: Biomarkers,
  signalPool: Signal[] = HARDCODED_SIGNALS,
): Action[] {
  const drafts: { text: string; difficulty: Action["difficulty"]; minutes: number }[] = [];

  // Recovery first if energy low
  if (bio.energy < 40) {
    drafts.push({ text: "10-min walk + coffee — reset before deep work", difficulty: "low", minutes: 30 });
  }

  // Stress relief
  if (bio.stress > 65) {
    drafts.push({ text: "Cancel one meeting, send async update instead", difficulty: "low", minutes: 30 });
  }

  // Focus block
  if (bio.focus < 40) {
    drafts.push({ text: "Single-task mode: notifications off, one tab, 60-min focus block on most-important deck", difficulty: "medium", minutes: 60 });
  } else {
    drafts.push({ text: "Deep work: investor deck — narrative + Series B benchmarks", difficulty: "high", minutes: 90 });
  }

  // Networking / outbound
  drafts.push({ text: "30-min outbound: 3 warm intros to founders for hiring + investor signal", difficulty: "medium", minutes: 60 });

  // Hard tasks pushed later if fatigued
  if (bio.fatigue > 70) {
    drafts.push({ text: "Light review of team async updates — defer hard decisions to tomorrow AM", difficulty: "low", minutes: 60 });
  } else {
    drafts.push({ text: "Founder evening: AI Founders drinks — 2 conversations, 0 pitching", difficulty: "medium", minutes: 90 });
  }

  // Pick exactly 5
  const chosen = drafts.slice(0, 5);
  while (chosen.length < 5) {
    chosen.push({ text: "Reflect + plan tomorrow's top 3 in one paragraph", difficulty: "low", minutes: 30 });
  }

  // Schedule from current hour, rounded to next 15 min
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  let cursor = 0;

  const used = new Set<number>();

  return chosen.map((d) => {
    const time = slot(start, cursor, d.minutes);
    cursor += d.minutes;
    const pick = pickSignalForAction(d.text, signalPool, used);
    if (pick) used.add(pick.index);
    return {
      time,
      text: d.text,
      difficulty: d.difficulty,
      energyMatch: matches(bio.energy, d.difficulty),
      signal: pick?.signal ?? null,
    };
  });
}
