const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Production: Thymia Sentinel API for medical-grade voice biomarkers
const THYMIA_URL = "https://api.thymia.ai/v1/sentinel/analyze";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const THYMIA_API_KEY = Deno.env.get("THYMIA_API_KEY");
    if (!THYMIA_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "THYMIA_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const formIn = await req.formData();
    const audio = formIn.get("audio");
    if (!(audio instanceof File)) {
      return new Response(
        JSON.stringify({ ok: false, error: "audio file required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append("audio", audio, audio.name || "voice.webm");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let upstream: Response;
    try {
      upstream = await fetch(THYMIA_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${THYMIA_API_KEY}` },
        body: upstreamForm,
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      console.warn("Thymia request failed/timeout", e);
      return new Response(
        JSON.stringify({ ok: false, error: "thymia_unavailable" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    clearTimeout(timeout);

    if (!upstream.ok) {
      const body = await upstream.text();
      console.warn("Thymia non-OK", upstream.status, body);
      return new Response(
        JSON.stringify({ ok: false, error: "thymia_error", status: upstream.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await upstream.json();

    const to100 = (v: unknown) =>
      typeof v === "number" ? Math.max(0, Math.min(100, Math.round(v * 100))) : null;

    // Thymia returns 0-1 scores; map to our 0-100 gauges.
    const distress = to100(data?.distress);
    const stress = to100(data?.stress) ?? distress ?? 50;
    const burnout = to100(data?.burnout);
    const fatigue = to100(data?.fatigue) ?? burnout ?? 50;
    // Derive energy/focus from inverse of fatigue/distress as a sane default.
    const energy = 100 - fatigue;
    const focus = 100 - (distress ?? Math.round((stress + fatigue) / 2));

    return new Response(
      JSON.stringify({
        ok: true,
        biomarkers: {
          stress: Math.max(15, Math.min(95, stress)),
          fatigue: Math.max(15, Math.min(95, fatigue)),
          energy: Math.max(15, Math.min(95, energy)),
          focus: Math.max(15, Math.min(95, focus)),
        },
        raw: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("analyze-biomarkers error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
