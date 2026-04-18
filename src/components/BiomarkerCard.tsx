import { useEffect, useState } from "react";

type Kind = "stress" | "fatigue" | "energy" | "focus";

const config: Record<
  Kind,
  { label: string; color: string; gradient: string; glow: string }
> = {
  stress: {
    label: "STRESS",
    color: "text-red-400",
    gradient: "bg-gradient-to-r from-red-600 to-red-400",
    glow: "rgba(239,68,68,0.6)",
  },
  fatigue: {
    label: "FATIGUE",
    color: "text-orange-400",
    gradient: "bg-gradient-to-r from-orange-600 to-orange-400",
    glow: "rgba(249,115,22,0.6)",
  },
  energy: {
    label: "ENERGY",
    color: "text-green-400",
    gradient: "bg-gradient-to-r from-green-600 to-green-400",
    glow: "rgba(0,212,126,0.6)",
  },
  focus: {
    label: "FOCUS",
    color: "text-purple-400",
    gradient: "bg-gradient-to-r from-purple-600 to-purple-400",
    glow: "rgba(124,58,237,0.6)",
  },
};

const insightFor = (kind: Kind, score: number): string | null => {
  if (kind === "stress" && score > 60)
    return "elevated, consider reducing cognitive load";
  if (kind === "fatigue" && score > 60)
    return "your voice shows signs of exhaustion";
  if (kind === "energy" && score < 40)
    return "low reserves, protect your peak hours";
  if (kind === "focus" && score < 40)
    return "scattered, single-task mode recommended";
  return null;
};

export const BiomarkerCard = ({
  kind,
  score,
  delayMs,
}: {
  kind: Kind;
  score: number;
  delayMs: number;
}) => {
  const cfg = config[kind];
  const insight = insightFor(kind, score);
  const [fillWidth, setFillWidth] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setFillWidth(score), delayMs + 200);
    return () => clearTimeout(t);
  }, [score, delayMs]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111113] p-5 opacity-0 animate-fade-up transition-all duration-500 ease-out hover:scale-[1.02]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
          opacity: 0.08,
        }}
      />

      <div className="relative flex justify-between items-baseline">
        <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
          {cfg.label}
        </span>
        <span className={`text-3xl font-black ${cfg.color}`}>{score}</span>
      </div>

      <div className="relative mt-4 h-3 rounded-full bg-zinc-800/50 overflow-hidden">
        <div
          className={`relative h-full rounded-full ${cfg.gradient} transition-all ease-out`}
          style={{
            width: `${fillWidth}%`,
            transitionDuration: "1500ms",
            transitionDelay: `${delayMs}ms`,
          }}
        >
          <span
            className="absolute inset-y-0 left-0 w-1/3 animate-shimmer"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
              animationDelay: `${delayMs + 1700}ms`,
            }}
          />
        </div>
      </div>

      <div className="mt-2 h-4 text-[10px] text-zinc-600">
        {insight ?? <span className="opacity-0">.</span>}
      </div>
    </div>
  );
};
