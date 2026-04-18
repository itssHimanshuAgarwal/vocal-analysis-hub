import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeBiomarkers, type Biomarkers } from "@/lib/analyzeBiomarkers";
import { BiomarkerCard } from "@/components/BiomarkerCard";
import { TranscriptCard } from "@/components/TranscriptCard";

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
  const [fallbackText, setFallbackText] = useState("");

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
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);

  const cleanupRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    try {
      mediaRecorderRef.current?.state !== "inactive" &&
        mediaRecorderRef.current?.stop();
    } catch {}
    try {
      recognitionRef.current?.stop();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => cleanupRecording(), []);

  const finishRecording = () => {
    cleanupRecording();
    setPhase("scanning");
    window.setTimeout(() => setPhase("results"), 2500);
  };

  const startRecording = async () => {
    setTranscript("");
    setCountdown(15);
    setPhase("recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
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

    autoStopRef.current = window.setTimeout(finishRecording, 15000);
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
              <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-10 text-center">
                <p className="text-zinc-600">your results will appear here</p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
};

export default Index;
