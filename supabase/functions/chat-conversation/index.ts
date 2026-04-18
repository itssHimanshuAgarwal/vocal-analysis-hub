// Edge function: chat-conversation
// Uses OpenAI GPT-4o-mini to generate conversational responses for Locked In.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Biomarkers {
  stress: number;
  fatigue: number;
  energy: number;
  focus: number;
  happiness?: number;
  dedication?: number;
}

interface CalEvent {
  summary: string;
  startTime: string;
}

interface Sig {
  text: string;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface Body {
  userMessage: string;
  biomarkers: Biomarkers;
  calendarEvents: CalEvent[];
  signals: Sig[];
  history: ChatTurn[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    const { userMessage, biomarkers, calendarEvents, signals, history } = body;

    if (!userMessage || !biomarkers) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing userMessage or biomarkers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const FALLBACK_CAL =
      "pack gym bag at 6am, gym at 7am, back home at 8:30am, rest and breakfast at 9am, play tennis at 11am, lunch at 1pm, call mom at 2pm, work on sales pitch at 2:30pm, transfer at 3:30pm, meet Greg for seed funding at 4pm, talk to Lisa for hiring product lead at 6pm, grab groceries at 7:30pm";

    const calendarLine = (calendarEvents ?? []).length > 0
      ? (calendarEvents ?? [])
          .slice(0, 12)
          .map((e) => `${e.summary} at ${e.startTime}`)
          .join(", ")
      : FALLBACK_CAL;
    const signalLine = (signals ?? [])
      .slice(0, 3)
      .map((s) => s.text)
      .join(". ") || "no fresh signals";

    const happiness = (biomarkers as any).happiness ?? 88;
    const dedication = (biomarkers as any).dedication ?? 91;

    const systemPrompt = `You are Locked In, a personal voice productivity assistant for Himanshu. You speak naturally like a caring friend, not a robot. Keep responses under 3 sentences. Be warm and direct.

You know:
- His voice biomarkers: stress ${biomarkers.stress}/100, fatigue ${biomarkers.fatigue}/100, energy ${biomarkers.energy}/100, focus ${biomarkers.focus}/100, happiness ${happiness}/100, dedication ${dedication}/100
- His calendar tomorrow: ${calendarLine}
- His intelligence signals: ${signalLine}
- His WhatsApp: Gary asked about investor deck, Yusuf says China samples Thursday, Founders group has 3 new messages
- Events nearby: Founders Gatherings hosted by Kyosuke Togami and MindPal in San Francisco, Voice AI Meetup Tuesday Kings Cross

Rules:
- Reference his biomarkers naturally: "you sound energized" not "your energy score is 82"
- When he asks about his plan, calendar, schedule, or tomorrow, you MUST list the actual calendar events above. Never say "no events", if events are listed, walk through them in order.
- Suggest specific actions based on his energy: if tired, suggest rest. If energized, suggest hard tasks.
- When he asks about events or what to do, pull from the signals and events you know about
- If he shares good news, celebrate briefly then offer to help plan
- If he shares bad news, acknowledge it, then gently suggest protecting his energy
- Always end with a question or offer to keep the conversation going
- Never say "as an AI" or "I don't have feelings"`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history ?? []).slice(-12),
          { role: "user", content: userMessage },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error", openaiRes.status, errText);
      return new Response(
        JSON.stringify({ ok: false, error: `openai_${openaiRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await openaiRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      return new Response(
        JSON.stringify({ ok: false, error: "empty_reply" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-conversation crashed", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
