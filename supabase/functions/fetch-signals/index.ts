import { corsHeaders } from "@supabase/supabase-js/cors";

const TINYFISH_URL = "https://agent.tinyfish.ai/v1/search";

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","of","to","in","on","at","for","with",
  "is","are","was","were","be","been","being","i","im","me","my","you","your",
  "we","our","it","this","that","these","those","so","just","really","very",
  "have","has","had","do","does","did","not","no","yes","about","today",
  "tomorrow","morning","tonight","feel","feeling","kind","like","got","get",
]);

function extractTopics(transcript: string, max = 3): string[] {
  const words = transcript
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

async function searchTopic(topic: string, key: string, signal: AbortSignal) {
  const r = await fetch(TINYFISH_URL, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `${topic} latest news startup founders 2026`,
      max_results: 2,
    }),
    signal,
  });
  if (!r.ok) {
    await r.text();
    throw new Error(`tinyfish ${r.status}`);
  }
  const data = await r.json();
  const results: any[] = data?.results ?? data?.data ?? [];
  return results.slice(0, 2).map((res: any) => ({
    text: res.title || res.snippet || res.summary || `${topic} update`,
    source: (res.source || new URL(res.url ?? "https://web").hostname || "WEB")
      .toString()
      .toUpperCase()
      .slice(0, 12),
    topics: [topic],
    url: res.url,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const TINYFISH_API_KEY = Deno.env.get("TINYFISH_API_KEY");
    if (!TINYFISH_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "TINYFISH_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { transcript = "" } = await req.json().catch(() => ({}));
    if (typeof transcript !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "transcript must be string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const topics = extractTopics(transcript);
    if (topics.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, signals: [], topics: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const settled = await Promise.allSettled(
        topics.map((t) => searchTopic(t, TINYFISH_API_KEY, controller.signal)),
      );
      clearTimeout(timeout);

      const signals = settled
        .filter((s): s is PromiseFulfilledResult<any[]> => s.status === "fulfilled")
        .flatMap((s) => s.value);

      return new Response(
        JSON.stringify({ ok: true, signals, topics }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (e) {
      clearTimeout(timeout);
      console.warn("tinyfish failed/timeout", e);
      return new Response(
        JSON.stringify({ ok: false, error: "tinyfish_unavailable", topics }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    console.error("fetch-signals error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
