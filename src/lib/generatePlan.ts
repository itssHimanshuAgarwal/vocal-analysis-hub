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
  opts: { morning?: boolean } = {},
): Action[] {
  const drafts: { text: string; difficulty: Action["difficulty"]; minutes: number; fixedTime?: string }[] = [];
  const morning = !!opts.morning;
  const stressed = bio.stress > 65;
  const fatigued = bio.fatigue > 70;

  if (morning) {
    // Pinned calendar slot: standup
    drafts.push({ text: "Daily Standup, keep to 15 min, defer detail to Slack", difficulty: "low", minutes: 30, fixedTime: "10:00–10:30" });

    // Reply to Gary about deck (WhatsApp pending)
    drafts.push({ text: "Reply to Gary on WhatsApp, send the v3 investor deck + 1-line context", difficulty: "low", minutes: 30 });

    // Investor call prep timing depends on biomarkers
    if (fatigued) {
      drafts.push({ text: "Investor call prep moved to 10:45, cortisol peak window for sharper recall", difficulty: "high", minutes: 60 });
    } else {
      drafts.push({ text: "Deep prep for Balderton call, refine narrative + Series B benchmarks", difficulty: "high", minutes: 90 });
    }

    drafts.push({ text: "Investor Call, Balderton", difficulty: "high", minutes: 60, fixedTime: "14:00–15:00" });

    // Stress + packed calendar → cancel team sync
    if (stressed) {
      drafts.push({ text: "Cancel 4pm Team Sync, send async Loom update instead, protect recovery window", difficulty: "low", minutes: 45, fixedTime: "16:00–16:45" });
    } else {
      drafts.push({ text: "Team Sync, keep agenda tight, 3 items max", difficulty: "medium", minutes: 45, fixedTime: "16:00–16:45" });
    }
    return finalize(drafts.slice(0, 5), bio, signalPool);
  }

  // Default (non-morning) plan
  if (bio.energy < 40) {
    drafts.push({ text: "10-min walk + coffee, reset before deep work", difficulty: "low", minutes: 30 });
  }
  if (stressed) {
    drafts.push({ text: "Cancel one meeting, send async update instead", difficulty: "low", minutes: 30 });
  }
  if (bio.focus < 40) {
    drafts.push({ text: "Single-task mode: notifications off, one tab, 60-min focus block on most-important deck", difficulty: "medium", minutes: 60 });
  } else {
    drafts.push({ text: "Deep work: investor deck, narrative + Series B benchmarks", difficulty: "high", minutes: 90 });
  }
  drafts.push({ text: "30-min outbound: 3 warm intros to founders for hiring + investor signal", difficulty: "medium", minutes: 60 });
  if (fatigued) {
    drafts.push({ text: "Light review of team async updates, defer hard decisions to tomorrow AM", difficulty: "low", minutes: 60 });
  } else {
    drafts.push({ text: "Founder evening: AI Founders drinks, 2 conversations, 0 pitching", difficulty: "medium", minutes: 90 });
  }

  const chosen = drafts.slice(0, 5);
  while (chosen.length < 5) {
    chosen.push({ text: "Reflect + plan tomorrow's top 3 in one paragraph", difficulty: "low", minutes: 30 });
  }
  return finalize(chosen, bio, signalPool);
}

function finalize(
  chosen: { text: string; difficulty: Action["difficulty"]; minutes: number; fixedTime?: string }[],
  bio: Biomarkers,
  signalPool: Signal[],
): Action[] {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  let cursor = 0;
  const used = new Set<number>();

  return chosen.map((d) => {
    let time: string;
    if (d.fixedTime) {
      time = d.fixedTime;
    } else {
      time = slot(start, cursor, d.minutes);
      cursor += d.minutes;
    }
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
