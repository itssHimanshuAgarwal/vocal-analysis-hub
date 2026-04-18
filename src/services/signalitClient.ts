import { createClient } from "@supabase/supabase-js";
import type { Signal } from "@/lib/signals";

const signalitDb = createClient(
  "https://luyninnhnqcjamumrcsx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1eW5pbm5obnFjamFtdW1yY3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzY5MzIsImV4cCI6MjA4ODA1MjkzMn0.G6_h2SPkaIIAKlJQyuEyj-s_xn3y2bep8y77DEd81m0",
);

export default signalitDb;

const safe = async <T,>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T[]> => {
  try {
    const { data, error } = await p;
    if (error || !data) return [];
    return Array.isArray(data) ? (data as unknown as T[]) : [];
  } catch {
    return [];
  }
};

const truncate = (s: string, n = 140) => {
  const t = (s || "").trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

const tokenize = (s: string): string[] =>
  (s || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3)
    .slice(0, 8);

export type LiveSignal = Signal & { live: true };

export async function fetchAllSignals(): Promise<{ signals: LiveSignal[]; sources: Set<string> }> {
  const [
    newsletters,
    twitter,
    linkedin,
    reddit,
    podcast,
    luma,
    discord,
    whatsapp,
  ] = await Promise.all([
    safe<any>(
      signalitDb
        .from("newsletter_stories")
        .select("title, source_name, summary, signal_strength")
        .order("created_at", { ascending: false })
        .limit(3),
    ),
    safe<any>(
      signalitDb
        .from("twitter_signals")
        .select("content, username, category, signal_strength")
        .order("created_at", { ascending: false })
        .limit(3),
    ),
    safe<any>(
      signalitDb
        .from("linkedin_signals")
        .select("content, author_name, category, signal_strength")
        .order("created_at", { ascending: false })
        .limit(3),
    ),
    safe<any>(
      signalitDb
        .from("reddit_signals")
        .select("title, subreddit, sentiment_score")
        .order("created_at", { ascending: false })
        .limit(3),
    ),
    safe<any>(
      signalitDb
        .from("podcast_episodes")
        .select("title, show_name, crux, key_insights")
        .order("created_at", { ascending: false })
        .limit(3),
    ),
    safe<any>(
      signalitDb
        .from("luma_events")
        .select("name, start_date, venue_name, rsvp_count, relevance_score")
        .order("start_date", { ascending: true })
        .limit(3),
    ),
    safe<any>(
      signalitDb
        .from("discord_signals")
        .select("content, channel_name, ai_signal, ai_theme")
        .order("created_at", { ascending: false })
        .limit(3),
    ),
    safe<any>(
      signalitDb
        .from("whatsapp_signals")
        .select("content, signal_type, source_group")
        .order("created_at", { ascending: false })
        .limit(3),
    ),
  ]);

  const sources = new Set<string>();
  const signals: LiveSignal[] = [];

  for (const r of newsletters) {
    sources.add("NEWSLETTER");
    signals.push({
      text: `${r.source_name ?? "Newsletter"}: ${truncate(r.title || r.summary || "")}`,
      source: "NEWSLETTER",
      topics: [...tokenize(r.title), ...tokenize(r.summary)],
      live: true,
    });
  }
  for (const r of twitter) {
    sources.add("TWITTER");
    signals.push({
      text: `@${r.username ?? "x"}: ${truncate(r.content || "")}`,
      source: "TWITTER",
      topics: [...tokenize(r.content), ...(r.category ? [String(r.category).toLowerCase()] : [])],
      live: true,
    });
  }
  for (const r of linkedin) {
    sources.add("LINKEDIN");
    signals.push({
      text: `${r.author_name ?? "LinkedIn"}: ${truncate(r.content || "")}`,
      source: "LINKEDIN",
      topics: [...tokenize(r.content), ...(r.category ? [String(r.category).toLowerCase()] : [])],
      live: true,
    });
  }
  for (const r of reddit) {
    sources.add("REDDIT");
    signals.push({
      text: `r/${r.subreddit ?? "reddit"}: ${truncate(r.title || "")}`,
      source: "REDDIT",
      topics: tokenize(r.title),
      live: true,
    });
  }
  for (const r of podcast) {
    sources.add("PODCAST");
    signals.push({
      text: `${r.show_name ?? "Podcast"}: ${truncate(r.crux || r.title || "")}`,
      source: "PODCAST",
      topics: [...tokenize(r.title), ...tokenize(r.crux), ...tokenize(Array.isArray(r.key_insights) ? r.key_insights.join(" ") : r.key_insights || "")],
      live: true,
    });
  }
  for (const r of luma) {
    sources.add("LUMA");
    const when = r.start_date ? new Date(r.start_date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    signals.push({
      text: `${truncate(r.name || "Event")} — ${r.venue_name ?? ""} ${when}${r.rsvp_count ? ` · ${r.rsvp_count} RSVPs` : ""}`,
      source: "LUMA",
      topics: ["event", "networking", ...tokenize(r.name), ...tokenize(r.venue_name)],
      live: true,
    });
  }
  for (const r of discord) {
    sources.add("DISCORD");
    signals.push({
      text: `#${r.channel_name ?? "discord"}: ${truncate(r.ai_signal || r.content || "")}`,
      source: "DISCORD",
      topics: [...tokenize(r.content), ...(r.ai_theme ? [String(r.ai_theme).toLowerCase()] : [])],
      live: true,
    });
  }
  for (const r of whatsapp) {
    sources.add("WHATSAPP");
    signals.push({
      text: `${r.source_group ?? "WhatsApp"}: ${truncate(r.content || "")}`,
      source: "WHATSAPP",
      topics: [...tokenize(r.content), ...(r.signal_type ? [String(r.signal_type).toLowerCase()] : [])],
      live: true,
    });
  }

  return { signals, sources };
}
