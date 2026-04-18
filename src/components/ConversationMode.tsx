import { useEffect, useRef, useState } from "react";
import type { Biomarkers } from "@/lib/analyzeBiomarkers";
import type { Action } from "@/lib/generatePlan";
import type { CalendarEvent } from "@/services/calendarClient";
import { fetchTomorrowEvents } from "@/services/calendarClient";
import { buildOpener, buildReply, detectIntent } from "@/lib/conversationReply";

type Msg = { role: "user" | "agent"; text: string; id: number };
type Status = "speaking" | "listening" | "idle";

interface Props {
  biomarkers: Biomarkers;
  actions: Action[];
  active: boolean;
  onExit: () => void;
}

export const ConversationMode = ({ biomarkers, actions, active, onExit }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [eventsCache, setEventsCache] = useState<CalendarEvent[]>([]);
  const recognitionRef = useRef<any>(null);
  const idRef = useRef(0);
  const startedRef = useRef(false);
  const stoppedRef = useRef(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  const nextId = () => ++idRef.current;

  const append = (m: Omit<Msg, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: nextId() }]);
  };

  // Auto-scroll
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, status]);

  // Preload tomorrow's events for the affirm branch
  useEffect(() => {
    if (!active) return;
    fetchTomorrowEvents().then(setEventsCache).catch(() => setEventsCache([]));
  }, [active]);

  const stopRecognition = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
  };

  const startListening = () => {
    if (stoppedRef.current) return;
    const SR =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setStatus("idle");
      return;
    }
    try {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      let captured = "";
      rec.onresult = (e: any) => {
        for (let i = 0; i < e.results.length; i++) {
          captured += e.results[i][0].transcript;
        }
      };
      rec.onerror = () => {
        setStatus("idle");
      };
      rec.onend = () => {
        recognitionRef.current = null;
        const text = captured.trim();
        if (stoppedRef.current) return;
        if (!text) {
          // Nothing heard, listen again
          if (active) startListening();
          return;
        }
        handleUserUtterance(text);
      };
      rec.start();
      recognitionRef.current = rec;
      setStatus("listening");
    } catch {
      setStatus("idle");
    }
  };

  const speak = (text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    setStatus("speaking");
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const utts = sentences.map((s) => {
      const u = new SpeechSynthesisUtterance(s.trim());
      u.rate = 1.02;
      u.pitch = 1;
      return u;
    });
    if (utts.length > 0) {
      utts[utts.length - 1].onend = () => {
        if (stoppedRef.current) {
          setStatus("idle");
          return;
        }
        onDone?.();
      };
    }
    utts.forEach((u) => window.speechSynthesis.speak(u));
  };

  const handleUserUtterance = (text: string) => {
    append({ role: "user", text });
    const intent = detectIntent(text);
    const reply = buildReply(intent, {
      biomarkers,
      actions,
      events: eventsCache,
    });
    append({ role: "agent", text: reply });
    speak(reply, () => {
      if (intent === "farewell") {
        setStatus("idle");
        stoppedRef.current = true;
        onExit();
        return;
      }
      startListening();
    });
  };

  // Kick off opener once
  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    stoppedRef.current = false;
    const opener = buildOpener(biomarkers);
    append({ role: "agent", text: opener });
    // Slight delay so the message is visible before TTS starts
    const t = window.setTimeout(() => {
      speak(opener, () => startListening());
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      stopRecognition();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleStop = () => {
    stoppedRef.current = true;
    stopRecognition();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setStatus("idle");
    onExit();
  };

  if (!active) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium text-zinc-200">in conversation</span>
          {status === "listening" && (
            <span className="text-xs text-green-400 tracking-wide">listening...</span>
          )}
          {status === "speaking" && (
            <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-0.5 bg-green-400 rounded-full animate-tts-bar"
                  style={{ height: "100%", animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          )}
        </div>
        <button
          onClick={handleStop}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Stop conversation
        </button>
      </div>

      {/* Chat log */}
      <div
        ref={logRef}
        className="space-y-3 max-h-[360px] overflow-y-auto pr-2"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex animate-fade-up ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-zinc-800 text-white"
                  : "bg-green-500/10 border border-green-500/20 text-green-300"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[10px] text-zinc-600 text-center">
        speaks via your browser, no API key
      </div>
    </div>
  );
};
