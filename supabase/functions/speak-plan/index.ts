const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRADIUM_URL = "https://api.gradium.ai/api/tts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GRADIUM_API_KEY = Deno.env.get("GRADIUM_API_KEY");
    if (!GRADIUM_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "GRADIUM_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { text } = await req.json().catch(() => ({}));
    if (!text || typeof text !== "string" || text.length > 4000) {
      return new Response(
        JSON.stringify({ ok: false, error: "text required (max 4000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let upstream: Response;
    try {
      upstream = await fetch(GRADIUM_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GRADIUM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice_id: "YTpq7expH9539ERJ",
          language: "en",
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      console.warn("gradium request failed/timeout", e);
      return new Response(
        JSON.stringify({ ok: false, error: "gradium_unavailable" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    clearTimeout(timeout);

    if (!upstream.ok) {
      const body = await upstream.text();
      console.warn("gradium non-OK", upstream.status, body);
      return new Response(
        JSON.stringify({ ok: false, error: "gradium_error", status: upstream.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = upstream.headers.get("Content-Type") ?? "audio/mpeg";
    const audioBuf = await upstream.arrayBuffer();

    return new Response(audioBuf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("speak-plan error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
