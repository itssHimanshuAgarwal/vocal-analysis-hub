export type Biomarkers = {
  stress: number;
  fatigue: number;
  energy: number;
  focus: number;
};

const countHits = (text: string, words: string[]) =>
  words.reduce((acc, w) => {
    const re = new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "g");
    const m = text.match(re);
    return acc + (m ? m.length : 0);
  }, 0);

const clamp = (n: number, min = 15, max = 95) =>
  Math.max(min, Math.min(max, n));

const jitter = () => Math.floor(Math.random() * 8) - 4;

export const STRESS_WORDS = [
  "stressed", "pressure", "deadline", "worried",
  "anxious", "overwhelmed", "behind", "rush",
];
export const FATIGUE_WORDS = [
  "tired", "exhausted", "sleep", "late night",
  "drained", "heavy", "long day",
];
const ENERGY_POS = [
  "excited", "pumped", "great", "energized",
  "motivated", "ready", "fired up",
];
const ENERGY_NEG = ["tired", "drained", "low", "slow"];
const FOCUS_POS = [
  "focused", "clear", "locked in", "deep work", "flow",
];
const FOCUS_NEG = [
  "distracted", "scattered", "all over", "too many", "meetings",
];
const STRESS_NEG = ["calm", "relaxed", "good", "great"];
const FATIGUE_NEG = ["rested", "fresh", "energized"];

export function analyzeBiomarkers(transcript: string): Biomarkers {
  const t = (transcript || "").toLowerCase();

  const stress =
    45 + countHits(t, STRESS_WORDS) * 8 - countHits(t, STRESS_NEG) * 5;
  const fatigue =
    50 + countHits(t, FATIGUE_WORDS) * 8 - countHits(t, FATIGUE_NEG) * 5;
  const energy =
    50 + countHits(t, ENERGY_POS) * 8 - countHits(t, ENERGY_NEG) * 8;
  const focus =
    50 + countHits(t, FOCUS_POS) * 8 - countHits(t, FOCUS_NEG) * 8;

  return {
    stress: clamp(stress + jitter()),
    fatigue: clamp(fatigue + jitter()),
    energy: clamp(energy + jitter()),
    focus: clamp(focus + jitter()),
  };
}
