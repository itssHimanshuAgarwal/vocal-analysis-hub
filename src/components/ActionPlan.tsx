import type { Action } from "@/lib/generatePlan";

export const ActionPlan = ({
  actions,
  delayMs,
}: {
  actions: Action[];
  delayMs: number;
}) => {
  return (
    <div
      className="opacity-0 animate-fade-up"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-4 font-medium">
        YOUR PLAN
      </div>
      <div className="text-xs text-zinc-600 mb-6">
        restructured around your biology × intelligence feeds
      </div>

      <div className="flex flex-col gap-3">
        {actions.map((a, i) => (
          <div
            key={i}
            className="opacity-0 animate-fade-up rounded-2xl border border-white/[0.06] bg-[#111113] hover:bg-[#18181B] p-5 transition-all duration-300 ease-out hover:scale-[1.01]"
            style={{ animationDelay: `${delayMs + 200 + i * 120}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-green-400">
                {a.time}
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  a.energyMatch
                    ? "bg-green-400 shadow-[0_0_8px_rgba(0,212,126,0.7)]"
                    : "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                }`}
                aria-label={a.energyMatch ? "energy match" : "energy mismatch"}
              />
            </div>
            <div className="mt-2 text-base font-medium text-white leading-snug">
              {a.text}
            </div>
            {a.signal && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-purple-500/10 bg-purple-500/[0.05] p-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                <div className="flex-1 text-xs text-purple-300 leading-relaxed">
                  {a.signal.text}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {a.signal.live && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,212,126,0.8)] animate-pulse" />
                      Live
                    </span>
                  )}
                  <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-purple-300">
                    {a.signal.source}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
