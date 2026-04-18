import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import signalitDb from "@/services/signalitClient";
import type { SourceKey } from "./SourcesStrip";

interface SourcePanelProps {
  sourceKey: SourceKey | null;
  onClose: () => void;
}

const timeAgo = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CATEGORY_COLOR: Record<string, string> = {
  funding: "bg-green-500/15 text-green-400 border-green-500/30",
  market_trend: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  product_launch: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  hiring: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  insight: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  trending: "bg-green-500/15 text-green-400 border-green-500/30",
  hot_take: "bg-red-500/15 text-red-400 border-red-500/30",
  industry_insight: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const STAGE_COLOR: Record<string, string> = {
  seed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "series a": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "series b": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "series c": "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const LANG_COLOR: Record<string, string> = {
  typescript: "bg-blue-400",
  javascript: "bg-yellow-400",
  python: "bg-green-400",
  rust: "bg-orange-500",
  go: "bg-cyan-400",
  java: "bg-red-400",
  ruby: "bg-red-500",
  swift: "bg-orange-400",
  cpp: "bg-pink-400",
  "c++": "bg-pink-400",
};

const Pill = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${className}`}>
    {children}
  </span>
);

const Avatar = ({ text, src }: { text: string; src?: string | null }) => {
  const letter = (text || "?").trim().charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-9 h-9 rounded-full object-cover border border-white/[0.08]"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/[0.08] flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
      {letter}
    </div>
  );
};

const Header = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-5">
    <h2 className="text-xl font-bold text-white">{title}</h2>
    {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
  </div>
);

const Empty = ({ msg = "No data yet" }: { msg?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3 opacity-50">
      <span className="text-xl">○</span>
    </div>
    <p className="text-sm">{msg}</p>
  </div>
);

const LoadingCards = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-24 rounded-xl bg-[#111113]" />
    ))}
  </div>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#111113] p-4 rounded-xl border border-white/[0.06] mb-3 hover:border-white/[0.12] transition-colors">
    {children}
  </div>
);

// Per-source renderers
const renderNewsletters = (rows: any[]) => (
  <>
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {r.category && (
            <Pill className={CATEGORY_COLOR[String(r.category).toLowerCase()] || "bg-zinc-800 text-zinc-400 border-zinc-700"}>
              {String(r.category).replace(/_/g, " ")}
            </Pill>
          )}
          <span className="text-xs text-zinc-500">{r.source_name}</span>
          <span className="text-xs text-zinc-600 ml-auto">{timeAgo(r.created_at)}</span>
        </div>
        <div className="text-sm font-medium text-white mb-1">{r.title}</div>
        {r.summary && <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{r.summary}</p>}
        {Array.isArray(r.companies_mentioned) && r.companies_mentioned.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {r.companies_mentioned.slice(0, 5).map((c: string, idx: number) => (
              <span key={idx} className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded">
                {c}
              </span>
            ))}
          </div>
        )}
      </Card>
    ))}
  </>
);

const renderYouTube = (rows: any[]) => (
  <>
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-center gap-3">
          <Avatar text={r.channel_name} src={r.thumbnail_url} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{r.channel_name}</div>
            <div className="text-xs text-zinc-500">
              {r.subscriber_count ? `${Number(r.subscriber_count).toLocaleString()} subscribers` : "Channel"}
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,212,126,0.8)]" />
        </div>
      </Card>
    ))}
  </>
);

const renderPodcasts = (rows: any[]) => (
  <>
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-start gap-3">
          <Avatar text={r.show_name || r.title} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white">{r.title}</div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
              <span>{r.show_name}</span>
              {r.duration && <span>· {r.duration}</span>}
            </div>
            {r.crux && <p className="text-xs text-zinc-400 line-clamp-2 mt-2">{r.crux}</p>}
          </div>
        </div>
      </Card>
    ))}
  </>
);

const renderLinkedIn = (rows: any[]) => (
  <>
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-sm font-medium text-white">{r.author_name || "LinkedIn"}</span>
          {r.category && (
            <Pill className={CATEGORY_COLOR[String(r.category).toLowerCase()] || "bg-zinc-800 text-zinc-400 border-zinc-700"}>
              {String(r.category).replace(/_/g, " ")}
            </Pill>
          )}
          <span className="text-xs text-zinc-600 ml-auto">{timeAgo(r.created_at)}</span>
        </div>
        <p className="text-xs text-zinc-400 line-clamp-3">{r.content}</p>
        <div className="text-[10px] text-blue-400 mt-2 cursor-pointer hover:underline">View on LinkedIn →</div>
      </Card>
    ))}
  </>
);

const renderTwitter = (rows: any[]) => (
  <>
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-sm font-medium text-white">@{r.username}</span>
          {r.category && (
            <Pill className={CATEGORY_COLOR[String(r.category).toLowerCase()] || "bg-zinc-800 text-zinc-400 border-zinc-700"}>
              {String(r.category).replace(/_/g, " ")}
            </Pill>
          )}
          <span className="text-xs text-zinc-600 ml-auto">{timeAgo(r.created_at)}</span>
        </div>
        <p className="text-xs text-zinc-300 line-clamp-4">{r.content}</p>
      </Card>
    ))}
  </>
);

const renderGithub = (rows: any[]) => (
  <>
    {rows.map((r, i) => {
      const lang = String(r.language || "").toLowerCase();
      return (
        <Card key={i}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="text-sm font-medium text-white">{r.full_name || r.name}</div>
            {r.stars_today != null && (
              <Pill className="bg-green-500/15 text-green-400 border-green-500/30">
                +{Number(r.stars_today).toLocaleString()}
              </Pill>
            )}
          </div>
          {r.description && <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{r.description}</p>}
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {r.language && (
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${LANG_COLOR[lang] || "bg-zinc-500"}`} />
                {r.language}
              </span>
            )}
            {r.total_stars != null && <span>★ {Number(r.total_stars).toLocaleString()}</span>}
          </div>
        </Card>
      );
    })}
  </>
);

const renderReddit = (rows: any[], tickers: any[]) => (
  <>
    {tickers.length > 0 && (
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Trending Tickers</div>
        <div className="grid grid-cols-2 gap-2">
          {tickers.slice(0, 6).map((t, i) => {
            const change = Number(t.price_change_pct ?? 0);
            return (
              <div key={i} className="bg-[#111113] border border-white/[0.06] rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">${t.ticker}</div>
                    {t.company_name && <div className="text-[10px] text-zinc-500 truncate">{t.company_name}</div>}
                  </div>
                  <div className={`text-xs font-medium ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-orange-400 font-medium">r/{r.subreddit}</span>
          <span className="text-xs text-zinc-600 ml-auto">{timeAgo(r.created_at)}</span>
        </div>
        <div className="text-sm text-white">{r.title}</div>
        {r.sentiment_score != null && (
          <div className="text-[10px] text-zinc-500 mt-1">sentiment: {Number(r.sentiment_score).toFixed(2)}</div>
        )}
      </Card>
    ))}
  </>
);

const renderWhatsApp = (rows: any[]) => (
  <>
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {r.signal_type && (
            <Pill className="bg-green-500/15 text-green-400 border-green-500/30">
              {String(r.signal_type).replace(/_/g, " ")}
            </Pill>
          )}
          <span className="text-xs text-zinc-500">{r.source_group}</span>
          <span className="text-xs text-zinc-600 ml-auto">{timeAgo(r.created_at)}</span>
        </div>
        <p className="text-xs text-zinc-300 line-clamp-3">{r.content}</p>
      </Card>
    ))}
  </>
);

const renderLuma = (rows: any[]) => (
  <>
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="text-sm font-medium text-white flex-1">{r.name}</div>
          {r.city && <Pill className="bg-zinc-800 text-zinc-300 border-zinc-700">{r.city}</Pill>}
        </div>
        <div className="text-xs text-zinc-400 mt-1">{formatDate(r.start_date)}</div>
        {r.venue_name && <div className="text-xs text-zinc-500 mt-0.5">{r.venue_name}</div>}
        <div className="flex items-center justify-between mt-2">
          {r.rsvp_count != null && (
            <span className="text-[10px] text-zinc-500">{r.rsvp_count} RSVPs</span>
          )}
          <span className="text-[10px] text-green-400 cursor-pointer hover:underline ml-auto">Register →</span>
        </div>
      </Card>
    ))}
  </>
);

const renderDiscord = (rows: any[]) => (
  <>
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-indigo-400 font-medium">#{r.channel_name}</span>
          {r.ai_theme && (
            <Pill className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30">{r.ai_theme}</Pill>
          )}
          <span className="text-xs text-zinc-600 ml-auto">{timeAgo(r.created_at)}</span>
        </div>
        <p className="text-xs text-zinc-300 line-clamp-3 mb-1">{r.content}</p>
        {r.ai_signal && <p className="text-[10px] text-zinc-500 italic">→ {r.ai_signal}</p>}
      </Card>
    ))}
  </>
);

const renderBooks = (rows: any[]) => (
  <>
    {rows.map((r, i) => (
      <Card key={i}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <div className="text-sm font-medium text-white">{r.title}</div>
            <div className="text-xs text-zinc-500">{r.author}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {r.difficulty && (
              <Pill className="bg-purple-500/15 text-purple-400 border-purple-500/30">{r.difficulty}</Pill>
            )}
            {r.read_time && <span className="text-[10px] text-zinc-500">{r.read_time}</span>}
          </div>
        </div>
        {r.summary && <p className="text-xs text-zinc-400 line-clamp-3 mt-2">{r.summary}</p>}
      </Card>
    ))}
  </>
);

const renderFunding = (rows: any[]) => (
  <>
    {rows.map((r, i) => {
      const stage = String(r.stage || "").toLowerCase();
      return (
        <Card key={i}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="text-sm font-medium text-white">{r.company}</div>
              {r.focus && <div className="text-xs text-zinc-500">{r.focus}</div>}
            </div>
            {r.stage && (
              <Pill className={STAGE_COLOR[stage] || "bg-zinc-800 text-zinc-300 border-zinc-700"}>{r.stage}</Pill>
            )}
          </div>
          {r.funding_amount && (
            <div className="text-base font-bold text-green-400 mt-1">{r.funding_amount}</div>
          )}
          {Array.isArray(r.investors) && r.investors.length > 0 && (
            <div className="text-xs text-zinc-400 mt-1 line-clamp-1">
              {r.investors.slice(0, 4).join(" · ")}
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-2">
            {r.market && <span>{r.market}</span>}
            {r.location && <span>· {r.location}</span>}
          </div>
        </Card>
      );
    })}
  </>
);

const TITLES: Record<SourceKey, { title: string; sub?: string }> = {
  NL: { title: "Newsletter Signals" },
  YT: { title: "YouTube Intelligence" },
  SP: { title: "Podcast Intelligence" },
  LI: { title: "LinkedIn Signals" },
  TW: { title: "Twitter / X Intelligence" },
  GH: { title: "GitHub Trending" },
  RD: { title: "Reddit Signals" },
  WA: { title: "WhatsApp Intelligence" },
  LU: { title: "Luma Events" },
  DC: { title: "Discord Intelligence" },
  BK: { title: "Books Intelligence" },
  FN: { title: "Funding Intelligence" },
};

export const SourcePanel = ({ sourceKey, onClose }: SourcePanelProps) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [extra, setExtra] = useState<any[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!sourceKey) return;
    let cancelled = false;
    setLoading(true);
    setRows([]);
    setExtra([]);
    setCount(null);
    setErrored(false);

    const run = async () => {
      try {
        let mainQ: any = null;
        let countQ: any = null;
        let extraQ: any = null;

        switch (sourceKey) {
          case "NL":
            mainQ = signalitDb.from("newsletter_stories")
              .select("title, source_name, summary, signal_strength, category, companies_mentioned, created_at")
              .order("created_at", { ascending: false }).limit(10);
            countQ = signalitDb.from("newsletter_stories").select("id", { count: "exact", head: true });
            break;
          case "YT":
            mainQ = signalitDb.from("channels").select("channel_name, subscriber_count, thumbnail_url").limit(10);
            break;
          case "SP":
            mainQ = signalitDb.from("podcast_episodes")
              .select("title, show_name, crux, key_insights, duration, created_at")
              .order("created_at", { ascending: false }).limit(10);
            break;
          case "LI":
            mainQ = signalitDb.from("linkedin_signals")
              .select("content, author_name, category, signal_strength, created_at")
              .order("created_at", { ascending: false }).limit(10);
            break;
          case "TW":
            mainQ = signalitDb.from("twitter_signals")
              .select("content, username, category, signal_strength, created_at")
              .order("created_at", { ascending: false }).limit(10);
            break;
          case "GH":
            mainQ = signalitDb.from("github_trending")
              .select("name, full_name, description, language, stars_today, total_stars")
              .order("stars_today", { ascending: false }).limit(10);
            break;
          case "RD":
            mainQ = signalitDb.from("reddit_signals")
              .select("title, subreddit, sentiment_score, created_at")
              .order("created_at", { ascending: false }).limit(10);
            extraQ = signalitDb.from("trending_tickers")
              .select("ticker, company_name, buzz_score, price, price_change_pct")
              .order("buzz_score", { ascending: false }).limit(10);
            break;
          case "WA":
            mainQ = signalitDb.from("whatsapp_signals")
              .select("content, signal_type, source_group, created_at")
              .order("created_at", { ascending: false }).limit(10);
            countQ = signalitDb.from("whatsapp_messages").select("id", { count: "exact", head: true });
            break;
          case "LU":
            mainQ = signalitDb.from("luma_events")
              .select("name, start_date, venue_name, rsvp_count, city, relevance_score")
              .order("start_date", { ascending: true }).limit(10);
            break;
          case "DC":
            mainQ = signalitDb.from("discord_signals")
              .select("content, channel_name, ai_signal, ai_theme, created_at")
              .order("created_at", { ascending: false }).limit(10);
            break;
          case "BK":
            mainQ = signalitDb.from("books_reading_list")
              .select("title, author, summary, key_takeaways, difficulty, read_time").limit(10);
            break;
          case "FN":
            mainQ = signalitDb.from("funding_rounds")
              .select("company, focus, funding_amount, stage, investors, market, location")
              .order("created_at", { ascending: false }).limit(10);
            break;
        }

        const [m, c, e] = await Promise.all([
          mainQ ? mainQ : Promise.resolve({ data: [], error: null }),
          countQ ? countQ : Promise.resolve({ count: null, error: null }),
          extraQ ? extraQ : Promise.resolve({ data: [], error: null }),
        ]);

        if (cancelled) return;
        if (m?.error) {
          setErrored(true);
        } else {
          setRows(Array.isArray(m?.data) ? m.data : []);
        }
        if (c && typeof c.count === "number") setCount(c.count);
        if (e?.data && Array.isArray(e.data)) setExtra(e.data);
      } catch {
        if (!cancelled) setErrored(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [sourceKey]);

  if (!sourceKey) return null;
  const meta = TITLES[sourceKey];

  const subheader = (() => {
    if (count != null) {
      if (sourceKey === "NL") return `${count.toLocaleString()} stories tracked`;
      if (sourceKey === "WA") return `${count.toLocaleString()} messages tracked`;
    }
    if (sourceKey === "YT" && rows.length) return `${rows.length} channels active`;
    if (rows.length) return `${rows.length} recent signals`;
    return undefined;
  })();

  const renderBody = () => {
    if (loading) return <LoadingCards />;
    if (errored) {
      return (
        <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-6 text-center">
          <p className="text-sm text-zinc-400">Connect this source in SignalIT</p>
          <p className="text-xs text-zinc-600 mt-1">No data available right now.</p>
        </div>
      );
    }
    if (!rows.length && !extra.length) return <Empty />;

    switch (sourceKey) {
      case "NL": return renderNewsletters(rows);
      case "YT": return renderYouTube(rows);
      case "SP": return renderPodcasts(rows);
      case "LI": return renderLinkedIn(rows);
      case "TW": return renderTwitter(rows);
      case "GH": return renderGithub(rows);
      case "RD": return renderReddit(rows, extra);
      case "WA": return renderWhatsApp(rows);
      case "LU": return renderLuma(rows);
      case "DC": return renderDiscord(rows);
      case "BK": return renderBooks(rows);
      case "FN": return renderFunding(rows);
      default: return <Empty />;
    }
  };

  return (
    <Sheet open={!!sourceKey} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[500px] sm:max-w-[500px] bg-[#09090B] border-l border-white/[0.06] p-6 overflow-y-auto"
      >
        <Header title={meta.title} sub={subheader} />
        <div className="mt-2">{renderBody()}</div>
      </SheetContent>
    </Sheet>
  );
};

export default SourcePanel;
