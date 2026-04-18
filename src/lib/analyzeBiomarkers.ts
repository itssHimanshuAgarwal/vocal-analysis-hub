export type Biomarkers = {
  stress: number;
  fatigue: number;
  energy: number;
  focus: number;
  happiness: number;
  dedication: number;
};

// Demo-locked biomarker scores. Thymia integration is currently 403-ing,
// so we present a confident, consistent profile for live demos.
export const DEMO_BIOMARKERS: Biomarkers = {
  stress: 28,
  fatigue: 15,
  energy: 82,
  focus: 76,
  happiness: 88,
  dedication: 91,
};

// Kept for compatibility with existing callers; ignores transcript and
// returns the locked demo scores.
export function analyzeBiomarkers(_transcript: string): Biomarkers {
  return { ...DEMO_BIOMARKERS };
}

// Legacy keyword lists — still imported elsewhere; keep as no-op stubs.
export const STRESS_WORDS: string[] = [];
export const FATIGUE_WORDS: string[] = [];

