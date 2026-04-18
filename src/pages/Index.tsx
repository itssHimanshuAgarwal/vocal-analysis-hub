import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeBiomarkers, type Biomarkers } from "@/lib/analyzeBiomarkers";
import { BiomarkerCard } from "@/components/BiomarkerCard";
import { TranscriptCard } from "@/components/TranscriptCard";
import { ActionPlan } from "@/components/ActionPlan";
import { SponsorBadges } from "@/components/SponsorBadges";
import { Particles } from "@/components/Particles";
import { generatePlan, type Action } from "@/lib/generatePlan";
import { HARDCODED_SIGNALS, type Signal } from "@/lib/signals";
import { supabase } from "@/integrations/supabase/client";

// Production: Speechmatics API for medical-grade accuracy
// Production: Gradium TTS for natural low-latency voice

const MicIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

type Phase = "idle" | "recording" | "scanning" | "results";

const Waveform = ({ active }: { active: boolean }) => {
  const [bars, setBars] = useState<number[]>(() => Array(40).fill(8));

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setBars(Array.from({ length: 40 }, () => 8 + Math.random() * 24));
    }, 90);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="flex items-end justify-center gap-1 h-10" aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-[#00D47E] transition-all duration-150 ease-out"
          style={{ height: `${h}px`, opacity: 0.6 + (h / 32) * 0.4 }}
        />
      ))}
    </div>
  );
};

const Index = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(15);
  const [transcript, setTranscript] = useState("");
  const [biomarkers, setBiomarkers] = useState<Biomarkers | null>(null);
  const [biomarkerSource, setBiomarkerSource] = useState<"live" | "simulated" | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [signalSource, setSignalSource] = useState<"live" | "fallback" | null>(null);
  const [fallbackText, setFallbackText] = useState("");
  const [particleTrigger, setParticleTrigger] = useState(0);

  const speechSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      Boolean(
        (window as any).webkitSpeechRecognition ||
          (window as any).SpeechRecognition
      ),
    []
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);
  const transcriptRef = useRef("");

  const cleanupRecording = (opts: { stopRecorder?: boolean; stopStream?: boolean } = { stopRecorder: true, stopStream: true }) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {}
    if (opts.stopRecorder) {
      try {
        mediaRecorderRef.current?.state !== "inactive" &&
          mediaRecorderRef.current?.stop();
      } catch {}
    }
    if (opts.stopStream) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => () => cleanupRecording(), []);

  const runAnalysis = async (
    finalText: string,
    audioBlob: Blob | null,
  ): Promise<{ bio: Biomarkers; bioSource: "live" | "simulated"; signals: Signal[]; sigSource: "live" | "fallback" }> => {
    const fallbackBio = analyzeBiomarkers(finalText);

    const thymiaP: Promise<{ bio: Biomarkers; source: "live" | "simulated" }> = (async () => {
      if (!audioBlob || audioBlob.size < 100) return { bio: fallbackBio, source: "simulated" as const };
      try {
        const fd = new FormData();
        fd.append("audio", audioBlob, "voice.webm");
        const { data, error } = await supabase.functions.invoke("analyze-biomarkers", { body: fd });
        if (error || !data?.ok || !data?.biomarkers) {
          return { bio: fallbackBio, source: "simulated" as const };
        }
        return { bio: data.biomarkers as Biomarkers, source: "live" as const };
      } catch (e) {
        console.warn("thymia invoke failed", e);
        return { bio: fallbackBio, source: "simulated" as const };
      }
    })();

    const tinyfishP: Promise<{ signals: Signal[]; source: "live" | "fallback" }> = (async () => {
      if (!finalText.trim()) return { signals: HARDCODED_SIGNALS, source: "fallback" as const };
      try {
        const { data, error } = await supabase.functions.invoke("fetch-signals", {
          body: { transcript: finalText },
        });
        if (error || !data?.ok || !Array.isArray(data?.signals) || data.signals.length === 0) {
          return { signals: HARDCODED_SIGNALS, source: "fallback" as const };
        }
        return { signals: [...(data.signals as Signal[]), ...HARDCODED_SIGNALS], source: "live" as const };
      } catch (e) {
        console.warn("tinyfish invoke failed", e);
        return { signals: HARDCODED_SIGNALS, source: "fallback" as const };
      }
    })();

    const [t, f] = await Promise.all([thymiaP, tinyfishP]);
    return { bio: t.bio, bioSource: t.source, signals: f.signals, sigSource: f.source };
  };

  const finishRecording = async (overrideTranscript?: string) => {
    // Stop timers + speech recognition, but keep MediaRecorder alive long enough to capture final blob.
    cleanupRecording({ stopRecorder: false, stopStream: false });
    const finalText = overrideTranscript ?? transcriptRef.current;
    if (overrideTranscript !== undefined) {
      setTranscript(overrideTranscript);
      transcriptRef.current = overrideTranscript;
    }

    setBiomarkers(analyzeBiomarkers(finalText));
    setPhase("scanning");

    const audioBlob = await new Promise<Blob | null>((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") {
        resolve(audioChunksRef.current.length ? new Blob(audioChunksRef.current, { type: "audio/webm" }) : null);
        return;
      }
      mr.addEventListener(
        "stop",
        () => resolve(new Blob(audioChunksRef.current, { type: "audio/webm" })),
        { once: true },
      );
      try { mr.stop(); } catch { resolve(null); }
    });

    const minScan = new Promise((r) => setTimeout(r, 2500));
    const [{ bio, bioSource, signals, sigSource }] = await Promise.all([
      runAnalysis(finalText, audioBlob),
      minScan,
    ]);

    setBiomarkers(bio);
    setBiomarkerSource(bioSource);
    setSignalSource(sigSource);
    setActions(generatePlan(finalText, bio, signals));
    setPhase("results");
    setParticleTrigger(Date.now());
  };

  const startRecording = async () => {
    setTranscript("");
    transcriptRef.current = "";
    setCountdown(15);
    setBiomarkers(null);
    setBiomarkerSource(null);
    setSignalSource(null);
    setActions([]);
    audioChunksRef.current = [];
    setPhase("recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mr;
      mr.start();
    } catch (err) {
      console.warn("Mic permission denied or unavailable", err);
    }

    const SR =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (SR) {
      try {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = (e: any) => {
          let text = "";
          for (let i = 0; i < e.results.length; i++) {
            text += e.results[i][0].transcript;
          }
          transcriptRef.current = text;
          setTranscript(text);
        };
        rec.start();
        recognitionRef.current = rec;
      } catch (err) {
        console.warn("SpeechRecognition failed", err);
      }
    }

    timerRef.current = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    autoStopRef.current = window.setTimeout(() => finishRecording(), 15000);
  };

  const handleFallbackSubmit = () => {
    if (!fallbackText.trim()) return;
    finishRecording(fallbackText.trim());
    setFallbackText("");
  };

  const handleMicClick = () => {
    if (phase === "idle" || phase === "results") startRecording();
    else if (phase === "recording") finishRecording();
  };

  const isRecording = phase === "recording";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090B] text-[#FAFAFA] font-sans antialiased">
      {/* Animated mesh gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/3 -left-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl opacity-[0.18] animate-mesh-drift"
          style={{
            background:
              "radial-gradient(circle at center, #00D47E 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute -bottom-1/3 -right-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl opacity-[0.15] animate-mesh-drift-2"
          style={{
            background:
              "radial-gradient(circle at center, #7C3AED 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-[0.08] animate-mesh-drift"
          style={{
            background:
              "radial-gradient(circle at center, #00D47E 0%, transparent 70%)",
            animationDelay: "-4s",
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        {/* HERO */}
        <section className="flex flex-col items-center justify-center text-center min-h-[80vh]">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white animate-title-glow">
            LOCKED IN
          </h1>
          <p className="mt-4 text-lg text-zinc-500 font-light">
            your voice reveals what your words hide
          </p>

          <div className="h-12" />

          {/* Mic button */}
          <button
            onClick={handleMicClick}
            aria-label={isRecording ? "Stop recording" : "Start check-in"}
            className={`relative w-36 h-36 rounded-full flex items-center justify-center text-white shadow-[0_0_60px_-10px_rgba(0,212,126,0.6)] transition-all duration-500 ease-out hover:scale-[1.02] active:scale-[0.98] ${
              isRecording
                ? "bg-gradient-to-br from-red-500 to-red-600 shadow-[0_0_60px_-10px_rgba(239,68,68,0.7)]"
                : "bg-gradient-to-br from-green-500 to-emerald-600 animate-breathe-scale"
            }`}
          >
            {/* Concentric pulse rings */}
            <span
              className={`pointer-events-none absolute inset-0 rounded-full border ${
                isRecording ? "border-red-500/30" : "border-green-500/20"
              } animate-ring-pulse`}
              style={{ animationDuration: isRecording ? "1.2s" : "2.4s" }}
            />
            <span
              className={`pointer-events-none absolute inset-0 rounded-full border ${
                isRecording ? "border-red-500/30" : "border-green-500/20"
              } animate-ring-pulse`}
              style={{
                animationDelay: "0.5s",
                animationDuration: isRecording ? "1.2s" : "2.4s",
              }}
            />
            <span
              className={`pointer-events-none absolute inset-0 rounded-full border ${
                isRecording ? "border-red-500/30" : "border-green-500/20"
              } animate-ring-pulse`}
              style={{
                animationDelay: "1s",
                animationDuration: isRecording ? "1.2s" : "2.4s",
              }}
            />

            <MicIcon className="w-10 h-10 relative z-10" />
          </button>

          <div className="mt-6 h-6 text-sm">
            {isRecording ? (
              <span className="text-zinc-300 font-medium tracking-wide">
                listening... <span className="text-[#00D47E]">{countdown}</span>
              </span>
            ) : (
              <span className="text-zinc-600 animate-breathe">
                tap to check in
              </span>
            )}
          </div>

          {/* Waveform */}
          <div className="mt-6 h-10 w-full max-w-md">
            {isRecording && <Waveform active={isRecording} />}
          </div>

          {isRecording && transcript && (
            <p className="mt-4 max-w-xl text-sm text-zinc-400 italic">
              "{transcript}"
            </p>
          )}

          {/* Typed fallback when SpeechRecognition isn't supported */}
          {!speechSupported && phase !== "recording" && phase !== "scanning" && (
            <div className="mt-10 w-full max-w-xl">
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-3 text-left">
                speech recognition unavailable — type instead
              </div>
              <div className="flex gap-2">
                <input
                  value={fallbackText}
                  onChange={(e) => setFallbackText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFallbackSubmit()}
                  placeholder="how are you feeling right now?"
                  className="flex-1 rounded-full border border-white/[0.06] bg-[#111113] px-5 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#00D47E]/40 focus:ring-2 focus:ring-[#00D47E]/20 transition-all duration-500"
                />
                <button
                  onClick={handleFallbackSubmit}
                  className="rounded-full bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-500 ease-out hover:scale-[1.02]"
                >
                  analyze
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RESULTS */}
        {(phase === "scanning" || phase === "results") && (
          <section
            key={phase}
            className="mt-16 animate-fade-up"
            aria-live="polite"
          >
            {phase === "scanning" ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111113] p-10">
                <div className="text-zinc-400 text-sm tracking-wide">
                  reading your voice...
                </div>
                <div className="mt-6 h-24 relative overflow-hidden rounded-xl bg-[#0c0c0e] border border-white/[0.04]">
                  <div
                    className="absolute top-0 bottom-0 w-32 animate-scan-sweep"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(0,212,126,0.6), transparent)",
                      boxShadow: "0 0 24px rgba(0,212,126,0.6)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-end gap-1 h-10">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-full bg-[#00D47E]/40"
                          style={{
                            height: `${10 + Math.abs(Math.sin(i * 0.6)) * 24}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              biomarkers && (
                <div className="space-y-8">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-6 font-medium">
                      WHAT YOUR VOICE REVEALS
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <BiomarkerCard kind="stress" score={biomarkers.stress} delayMs={0} />
                      <BiomarkerCard kind="fatigue" score={biomarkers.fatigue} delayMs={150} />
                      <BiomarkerCard kind="energy" score={biomarkers.energy} delayMs={300} />
                      <BiomarkerCard kind="focus" score={biomarkers.focus} delayMs={450} />
                    </div>
                  </div>
                  <TranscriptCard transcript={transcript} delayMs={600} />
                </div>
              )
            )}
          </section>
        )}
      </div>
    </main>
  );
};

export default Index;
