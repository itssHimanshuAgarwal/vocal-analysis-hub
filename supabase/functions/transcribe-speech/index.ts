import { corsHeaders } from "@supabase/supabase-js/cors";

const SM_BASE = "https://asr.api.speechmatics.com/v2";

async function pollJob(jobId: string, key: string, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`${SM_BASE}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) {
      await r.text();
      throw new Error(`speechmatics status ${r.status}`);
    }
    const data = await r.json();
    const status = data?.job?.status;
    if (status === "done") return jobId;
    if (status === "rejected" || status === "deleted") {
      throw new Error(`speechmatics job ${status}`);
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error("speechmatics poll timeout");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SPEECHMATICS_API_KEY = Deno.env.get("SPEECHMATICS_API_KEY");
    if (!SPEECHMATICS_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "SPEECHMATICS_API_KEY not configured" }),
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

    const config = {
      type: "transcription",
      transcription_config: {
        language: "en",
        operating_point: "enhanced",
      },
    };

    const upForm = new FormData();
    upForm.append("data_file", audio, audio.name || "voice.webm");
    upForm.append("config", JSON.stringify(config));

    // Submit job
    const submit = await fetch(`${SM_BASE}/jobs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SPEECHMATICS_API_KEY}` },
      body: upForm,
    });
    if (!submit.ok) {
      const body = await submit.text();
      console.warn("speechmatics submit failed", submit.status, body);
      return new Response(
        JSON.stringify({ ok: false, error: "speechmatics_submit_failed", status: submit.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const submitData = await submit.json();
    const jobId: string | undefined = submitData?.id;
    if (!jobId) {
      return new Response(
        JSON.stringify({ ok: false, error: "no job id returned" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    try {
      await pollJob(jobId, SPEECHMATICS_API_KEY);
    } catch (e) {
      console.warn("poll error", e);
      return new Response(
        JSON.stringify({ ok: false, error: "speechmatics_poll_failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const transcriptR = await fetch(
      `${SM_BASE}/jobs/${jobId}/transcript?format=txt`,
      { headers: { Authorization: `Bearer ${SPEECHMATICS_API_KEY}` } },
    );
    if (!transcriptR.ok) {
      const body = await transcriptR.text();
      console.warn("transcript fetch failed", transcriptR.status, body);
      return new Response(
        JSON.stringify({ ok: false, error: "speechmatics_transcript_failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const transcript = (await transcriptR.text()).trim();

    return new Response(
      JSON.stringify({ ok: true, transcript }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("transcribe-speech error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
