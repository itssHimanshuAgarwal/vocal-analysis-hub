import { STRESS_WORDS, FATIGUE_WORDS } from "@/lib/analyzeBiomarkers";

const STRESS_SET = new Set(STRESS_WORDS.map((w) => w.toLowerCase()));
const FATIGUE_SET = new Set(FATIGUE_WORDS.map((w) => w.toLowerCase()));

const renderHighlighted = (text: string) => {
  const parts = text.split(/(\s+)/);
  return parts.map((part, i) => {
    const clean = part.toLowerCase().replace(/[^a-z]/g, "");
    if (STRESS_SET.has(clean)) {
      return (
        <span
          key={i}
          className="underline decoration-red-500/70 decoration-2 underline-offset-4"
        >
          {part}
        </span>
      );
    }
    if (FATIGUE_SET.has(clean)) {
      return (
        <span
          key={i}
          className="underline decoration-orange-500/70 decoration-2 underline-offset-4"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export const TranscriptCard = ({
  transcript,
  delayMs,
}: {
  transcript: string;
  delayMs: number;
}) => (
  <div
    className="relative rounded-2xl border border-white/[0.06] bg-[#111113] p-6 opacity-0 animate-fade-up"
    style={{ animationDelay: `${delayMs}ms` }}
  >
    <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-3 font-medium">
      WHAT YOU SAID
    </div>
    <p className="text-base text-zinc-300 leading-relaxed">
      {transcript ? (
        renderHighlighted(transcript)
      ) : (
        <span className="text-zinc-600 italic">no speech detected</span>
      )}
    </p>
    <div className="mt-4 flex justify-end text-[10px] text-zinc-600">
      speechmatics
    </div>
  </div>
);
