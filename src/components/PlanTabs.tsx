import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTomorrowEvents, type CalendarEvent } from "@/services/calendarClient";

type TabId = "plan" | "signalit" | "next";

interface Props {
  delayMs: number;
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "plan", label: "Tomorrow's Plan" },
  { id: "next", label: "🚀 Next Steps" },
  { id: "signalit", label: "Signals" },
];

type NextStep = {
  title: string;
  why: string;
  action: string;
  source: "PODCAST" | "LUMA" | "WHATSAPP" | "GITHUB" | "NEWSLETTER";
};

const NEXT_STEPS: NextStep[] = [
  {
    title: "Prep for your investor call with Greg",
    why: "You have 'meet Greg for seed funding' at 4pm tomorrow. Your stress is elevated — preparation will reduce anxiety.",
    action: "Listen to 20VC Episode: 'How to close a Series B in 2 weeks' by Harry Stebbings before the call. Key insight: lead with market size, not product.",
    source: "PODCAST",
  },
  {
    title: "Attend Founders Gatherings (MindPal)",
    why: "Curated room of 5–20 founders, pre-seed to Series A. Your energy is good enough for high-signal networking, and the structured founder rounds mean no awkward small talk.",
    action: "Friday, 4–6pm PT, San Francisco. Hosted by Kyosuke Togami (Transpose Platform) + Chris Parjaszewski (MindPal). Prep: startup in 1 sentence, ICP in 1 sentence, GTM in 2, biggest bottleneck in 15s. Request to join on Luma.",
    source: "LUMA",
  },
  {
    title: "Reply to Gary about the investor deck",
    why: "Gary messaged last night. Unresolved messages increase cognitive load — your focus score is already low.",
    action: "Send a 2-line update: 'Deck is 80% done. Will share tomorrow noon.' Takes 30 seconds, clears your mental queue.",
    source: "WHATSAPP",
  },
  {
    title: "Check this trending GitHub repo",
    why: "An open-source voice agent framework got 1.2K stars in 3 days. Directly relevant to what you're building.",
    action: "Star it tonight. Read the README tomorrow during your rest block. Could save you weeks of infra work.",
    source: "GITHUB",
  },
  {
    title: "Read Morning Brew's UK funding report",
    why: "UK startup funding hit a 3-year high. Use this data point in your investor deck — it validates your timing.",
    action: "2 minute read. Pull the headline stat into slide 3 of your deck.",
    source: "NEWSLETTER",
  },
];

const SOURCE_COLORS: Record<NextStep["source"], string> = {
  PODCAST: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  LUMA: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  WHATSAPP: "bg-green-500/10 text-green-400 border-green-500/20",
  GITHUB: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  NEWSLETTER: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRange = (startIso: string, endIso: string) => {
  const s = formatTime(startIso);
  const e = formatTime(endIso);
  return s && e ? `${s} to ${e}` : s || e;
};

const formatDay = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

export const PlanTabs = ({ delayMs, activeTab, onTabChange }: Props) => {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);

  useEffect(() => {
    if (activeTab === "plan" && events === null) {
      fetchTomorrowEvents()
        .then(setEvents)
        .catch(() => setEvents([]));
    }
  }, [activeTab, events]);

  const renderPlan = () => {
    if (events === null) {
      return (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl bg-[#111113]" />
          ))}
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-sm text-zinc-400">No events scheduled for tomorrow.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Add events to your Google Calendar and they'll appear here.
          </p>
        </div>
      );
    }

    const dayLabel = formatDay(events[0].start);

    return (
      <div className="space-y-3">
        {dayLabel && (
          <div className="text-xs text-zinc-500 mb-2">
            {dayLabel} · {events.length} event{events.length === 1 ? "" : "s"}
          </div>
        )}
        {events.map((e, i) => (
          <div
            key={i}
            className="bg-[#111113] p-4 rounded-xl border border-white/[0.06] flex items-start gap-4 hover:border-white/[0.12] transition-colors"
          >
            <div className="shrink-0 flex flex-col items-start">
              <span className="text-sm font-mono font-semibold text-green-400">
                {formatTime(e.start)}
              </span>
              <span className="text-[10px] font-mono text-zinc-600 mt-0.5">
                {formatTime(e.end)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{e.summary}</div>
              {e.location && (
                <div className="text-xs text-zinc-500 mt-1 truncate">📍 {e.location}</div>
              )}
              <div className="text-[10px] text-zinc-600 mt-1">{formatRange(e.start, e.end)}</div>
            </div>
          </div>
        ))}
        <div className="text-[10px] text-zinc-600 text-center mt-3">
          ● Live from Google Calendar
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
              onClick={() => onTabChange(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                active
                  ? t.id === "signalit"
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : t.id === "next"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-zinc-800/50 text-zinc-500 border border-transparent hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "plan" && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-4 font-medium">
            Tomorrow's Plan
          </div>
          {renderPlan()}
        </div>
      )}
      {activeTab === "signalit" && (
        <div>
          <div className="text-xs text-zinc-500 mb-3">
            Your Intelligence Hub
          </div>
          <iframe
            src="https://signalium-hub.lovable.app"
            title="Signals"
            frameBorder={0}
            allow="*"
            className="w-full h-[600px] rounded-xl border border-white/[0.06] bg-[#09090B]"
          />
          <div className="text-[10px] text-zinc-600 mt-2 text-center">
            powered by Signals
          </div>
        </div>
      )}
      {activeTab === "next" && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-4 font-medium">
            Next Steps
          </div>
          <div>
            {NEXT_STEPS.map((step, i) => (
              <div
                key={i}
                className="bg-[#111113] p-5 rounded-2xl border border-white/[0.06] mb-3"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-medium text-white">{step.title}</h3>
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-medium ${SOURCE_COLORS[step.source]}`}
                  >
                    {step.source}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mb-2">
                  <span className="font-semibold text-zinc-500">WHY: </span>
                  {step.why}
                </div>
                <div className="text-sm text-green-400">
                  <span className="font-semibold text-green-500">ACTION: </span>
                  {step.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
