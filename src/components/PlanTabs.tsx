import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTomorrowEvents, type CalendarEvent } from "@/services/calendarClient";

type TabId = "plan" | "signalit";

interface Props {
  delayMs: number;
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "plan", label: "Tomorrow's Plan" },
  { id: "signalit", label: "Signals" },
];

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
    </div>
  );
};
