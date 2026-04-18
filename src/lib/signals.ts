export type Signal = {
  text: string;
  source: string;
  topics: string[];
  live?: boolean;
};

export const HARDCODED_SIGNALS: Signal[] = [
  { text: "Morning Brew: UK startup funding hit 3-year high in Q1 2026", source: "NEWSLETTER", topics: ["funding", "startup"] },
  { text: "20VC: How to close a Series B in 2 weeks - Harry Stebbings", source: "PODCAST", topics: ["funding", "deck", "investors"] },
  { text: "AI Founders Drinks tonight Shoreditch Studios 7pm, 43 RSVPs", source: "LUMA", topics: ["networking", "event", "evening"] },
  { text: "Naval on X: Best founders build when nobody watches", source: "TWITTER", topics: ["motivation", "founder"] },
  { text: "r/startups: Series B valuation benchmarks, 847 upvotes", source: "REDDIT", topics: ["funding", "valuation"] },
  { text: "Trending: voice agent framework 1.2K GitHub stars in 3 days", source: "GITHUB", topics: ["voice", "ai", "engineering"] },
  { text: "Lenny's Newsletter: Hiring playbook that scaled Figma", source: "NEWSLETTER", topics: ["hiring", "team"] },
  { text: "Balderton partner: live commerce investment thesis", source: "LINKEDIN", topics: ["commerce", "investors"] },
  { text: "Founder WhatsApp: 3 fundraising decks shared this week", source: "WHATSAPP", topics: ["funding", "deck"] },
  { text: "Discord AI builders: MCP integration gaining traction", source: "DISCORD", topics: ["ai", "engineering"] },
  { text: "YC: Biggest Series B mistake founders make, 234K views", source: "YOUTUBE", topics: ["founder", "series b"] },
  { text: "Voice AI Meetup Tue Kings Cross, Speechmatics speakers", source: "LUMA", topics: ["voice", "event"] },
];

export function pickSignalForAction(
  actionText: string,
  pool: Signal[],
  used: Set<number>,
): { signal: Signal; index: number } | null {
  const text = actionText.toLowerCase();
  let best = -1;
  let bestScore = 0;
  pool.forEach((s, i) => {
    if (used.has(i)) return;
    const score = s.topics.reduce((acc, t) => (text.includes(t) ? acc + 2 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  if (best === -1) {
    // fallback: first unused
    for (let i = 0; i < pool.length; i++) {
      if (!used.has(i)) return { signal: pool[i], index: i };
    }
    return null;
  }
  return { signal: pool[best], index: best };
}
