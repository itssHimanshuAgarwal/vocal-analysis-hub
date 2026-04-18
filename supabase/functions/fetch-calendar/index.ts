// Fetches a public Google Calendar ICS feed and returns parsed events for tomorrow.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const ICS_URL =
  "https://calendar.google.com/calendar/ical/agarwal.himanshuramesh%40gmail.com/public/basic.ics";

type Event = {
  summary: string;
  start: string; // ISO
  end: string;   // ISO
  location?: string;
  description?: string;
};

function unfold(text: string): string {
  // RFC5545 line unfolding: lines starting with space/tab continue prev line.
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseIcsDate(v: string): Date | null {
  // Forms: 20250420T140000Z | 20250420T140000 | 20250420
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (!hh) return new Date(`${y}-${mo}-${d}T00:00:00Z`);
  const iso = `${y}-${mo}-${d}T${hh}:${mm}:${ss}${z ? "Z" : ""}`;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}

function parseIcs(ics: string): Event[] {
  const text = unfold(ics);
  const lines = text.split(/\r?\n/);
  const events: Event[] = [];
  let cur: Partial<Event> & { _start?: Date; _end?: Date } | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur && cur._start && cur.summary) {
        events.push({
          summary: cur.summary,
          start: cur._start.toISOString(),
          end: (cur._end ?? cur._start).toISOString(),
          location: cur.location,
          description: cur.description,
        });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const keyRaw = line.slice(0, idx);
      const val = line.slice(idx + 1);
      const key = keyRaw.split(";")[0];
      if (key === "SUMMARY") cur.summary = val;
      else if (key === "LOCATION") cur.location = val;
      else if (key === "DESCRIPTION") cur.description = val.replace(/\\n/g, " ");
      else if (key === "DTSTART") cur._start = parseIcsDate(val) ?? undefined;
      else if (key === "DTEND") cur._end = parseIcsDate(val) ?? undefined;
    }
  }
  return events;
}

function tomorrowRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);
  return { start, end };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const icsUrl = url.searchParams.get("url") || ICS_URL;

    const res = await fetch(icsUrl, { headers: { "User-Agent": "lovable-cal/1.0" } });
    if (!res.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `ICS fetch failed: ${res.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const ics = await res.text();
    const all = parseIcs(ics);
    const { start, end } = tomorrowRange();
    const events = all
      .filter((e) => {
        const s = new Date(e.start).getTime();
        return s >= start.getTime() && s < end.getTime();
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return new Response(
      JSON.stringify({ ok: true, events, count: events.length, total: all.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
