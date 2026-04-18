import { useEffect, useMemo, useState } from "react";
import type { Action } from "@/lib/generatePlan";
import type { Biomarkers } from "@/lib/analyzeBiomarkers";
import { ActionPlan } from "@/components/ActionPlan";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchTopSignals,
  fetchWhatsappRecent,
  fetchLumaUpcoming,
  type TopSignal,
  type WhatsappPreview,
  type LumaPreview,
} from "@/services/signalitClient";
import { SOURCE_FROM_SIGNAL, type SourceKey } from "@/components/SourcesStrip";

type TabId = "plan" | "signals" | "context";

interface Props {
  actions: Action[];
  biomarkers: Biomarkers;
  delayMs: number;
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
  sourceFilter: SourceKey | null;
  onClearFilter: () => void;
}

const SOURCE_BADGE: Record<string, string> = {
  NEWSLETTER: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PODCAST: "bg-green-500/15 text-green-400 border-green-500/30",
  TWITTER: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  REDDIT: "bg-red-500/15 text-red-400 border-red-500/30",
  LINKEDIN: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  LUMA: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  WHATSAPP: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  DISCORD: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  YOUTUBE: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "plan", label: "Your Plan" },
  { id: "signals", label: "Your Signals" },
  { id: "context", label: "Your Context" },
];

const timeAgo = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FALLBACK_WHATSAPP: WhatsappPreview[] = [
  { sender: "Gary", content: "Investor deck — final version?", created_at: null },
  { sender: "Yusuf", content: "China factory samples arrive Thursday 👀", created_at: null },
  { sender: "Founders Group", content: "3 new messages", created_at: null },
];

const FALLBACK_LUMA: LumaPreview[] = [
  { name: "AI Founders Drinks", venue_name: "Shoreditch Studios", start_date: null, rsvp_count: 43 },
  { name: "Voice AI Meetup", venue_name: "Kings Cross", start_date: null, rsvp_count: 67 },
];

export const PlanTabs = ({
  actions,
  biomarkers,
  delayMs,
  activeTab,
  onTabChange,
  sourceFilter,
  onClearFilter,
}: Props) => {
  const [signals, setSignals] = useState<TopSignal[] | null>(null);
  const [signalsErrored, setSignalsErrored] = useState(false);
  const [wa, setWa] = useState<WhatsappPreview[] | null>(null);
  const [luma, setLuma] = useState<LumaPreview[] | null>(null);

  // Fetch signals lazily when first needed
  useEffect(() => {
    if ((activeTab === "signals" || sourceFilter) && signals === null) {
      fetchTopSignals(20)
        .then((r) => {
          setSignals(r);
          if (r.length === 0) setSignalsErrored(true);
        })
        .catch(() => setSignalsErrored(true));
    }
  }, [activeTab, sourceFilter, signals]);

  useEffect(() => {
    if (activeTab === "context") {
      if (wa === null) fetchWhatsappRecent(3).then(setWa).catch(() => setWa([]));
      if (luma === null) fetchLumaUpcoming(2).then(setLuma).catch(() => setLuma([]));
    }
  }, [activeTab, wa, luma]);

  const filterKey = sourceFilter;
  const filterSourceName = useMemo(() => {
    if (!filterKey) return null;
    const entry = Object.entries(SOURCE_FROM_SIGNAL).find(([, k]) => k === filterKey);
    return entry?.[0] ?? null;
  }, [filterKey]);

  const visibleSignals = useMemo(() => {
    if (!signals) return null;
    if (!filterSourceName) return signals;
    return signals.filter((s) => s.source.toUpperCase() === filterSourceName);
  }, [signals, filterSourceName]);

  const renderSignals = () => {
    if (visibleSignals === null) {
      return (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-[#111113]" />
          ))}
        </div>
      );
    }
    if (visibleSignals.length === 0) {
      return (
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-6 text-center">
          <p className="text-sm text-zinc-400">
            {filterKey ? "No live signals from this source yet." : "No signals available."}
          </p>
          <p className="text-xs text-zinc-600 mt-1">Showing cached intelligence below.</p>
        </div>
      );
    }
    const isLive = !signalsErrored;
    return (
      <div className="space-y-2">
        {visibleSignals.map((s, i) => {
          const badge = SOURCE_BADGE[s.source.toUpperCase()] ||
            "bg-zinc-800 text-zinc-300 border-zinc-700";
          return (
            <div
              key={i}
              className="bg-[#111113] p-4 rounded-xl border border-white/[0.06] flex items-start gap-3 hover:border-white/[0.12] transition-colors"
            >
              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${badge}`}>
                {s.source}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{s.title}</div>
                <div className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{s.summary}</div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-xs font-bold text-green-400">{Math.round(s.strength)}</span>
                {isLive ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-green-400">
                    <span className="h-1 w-1 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                ) : (
                  <span className="rounded-full border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-zinc-500">
                    Cached
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContext = () => {
    const fatigueHigh = biomarkers.fatigue > 60;
    const waList = (wa && wa.length > 0) ? wa : FALLBACK_WHATSAPP;
    const lumaList = (luma && luma.length > 0) ? luma : FALLBACK_LUMA;

    return (
      <div className="space-y-3">
        {/* Calendar */}
        <div className="bg-[#111113] p-5 rounded-xl border border-white/[0.06]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-medium mb-3">
            Today's Calendar
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
              <span className="text-xs font-mono text-zinc-500 w-12">10:00</span>
              <span className="text-sm text-white">Daily Standup</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-green-400 shrink-0 shadow-[0_0_8px_rgba(0,212,126,0.7)]" />
              <span className="text-xs font-mono text-zinc-500 w-12">14:00</span>
              <span className="text-sm text-white">Investor Call: Balderton Capital</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
              <span className="text-xs font-mono text-zinc-500 w-12">16:00</span>
              <span className={`text-sm ${fatigueHigh ? "line-through text-zinc-500" : "text-white"}`}>
                Team Sync
              </span>
              {fatigueHigh && (
                <span className="text-xs text-red-400 italic">(cancelled — fatigue too high)</span>
              )}
            </div>
          </div>
        </div>

        {/* Unread */}
        <div className="bg-[#111113] p-5 rounded-xl border border-white/[0.06]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-medium mb-3">
            Unread Messages
          </div>
          {wa === null ? (
            <div className="space-y-2">
              <Skeleton className="h-10 bg-zinc-900" />
              <Skeleton className="h-10 bg-zinc-900" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {waList.map((m, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="h-7 w-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                    {(m.sender || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-white">{m.sender}</span>
                      {m.created_at && <span className="text-[10px] text-zinc-600">{timeAgo(m.created_at)}</span>}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tonight & Tomorrow */}
        <div className="bg-[#111113] p-5 rounded-xl border border-white/[0.06]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-medium mb-3">
            Tonight & Tomorrow
          </div>
          {luma === null ? (
            <div className="space-y-2">
              <Skeleton className="h-12 bg-zinc-900" />
              <Skeleton className="h-12 bg-zinc-900" />
            </div>
          ) : (
            <div className="space-y-3">
              {lumaList.map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="h-2 w-2 rounded-full bg-pink-400 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">{e.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {[formatDate(e.start_date) || "Tonight 7pm", e.venue_name].filter(Boolean).join(" · ")}
                      {e.rsvp_count != null && ` · ${e.rsvp_count} RSVPs`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="opacity-0 animate-fade-up"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                onTabChange(t.id);
                if (t.id !== "signals") onClearFilter();
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                active
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-zinc-800/50 text-zinc-500 border border-transparent hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          );
        })}
        {activeTab === "signals" && filterKey && (
          <button
            onClick={onClearFilter}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] bg-zinc-800/60 text-zinc-300 border border-white/[0.08] hover:bg-zinc-700/60 transition-colors"
          >
            Filter: {filterKey} ✕
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "plan" && <ActionPlan actions={actions} delayMs={0} />}
      {activeTab === "signals" && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-4 font-medium">
            Top Signals
          </div>
          {renderSignals()}
        </div>
      )}
      {activeTab === "context" && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-4 font-medium">
            Your Context
          </div>
          {renderContext()}
        </div>
      )}
    </div>
  );
};
