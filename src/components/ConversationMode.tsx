import { useEffect, useRef, useState } from "react";
import type { Biomarkers } from "@/lib/analyzeBiomarkers";
import type { Action } from "@/lib/generatePlan";
import type { CalendarEvent } from "@/services/calendarClient";
import { fetchTomorrowEvents } from "@/services/calendarClient";
import { buildReply, detectIntent } from "@/lib/conversationReply";
import { supabase } from "@/integrations/supabase/client";

type ChatTurn = { role: "user" | "assistant"; content: string };

type Msg = { role: "user" | "agent"; text: string; id: number };
type Status = "speaking" | "listening" | "idle";
type ScriptStep = "opener" | "biomarker" | "followup" | "free";

interface Props {
  biomarkers: Biomarkers;
  actions: Action[];
  active: boolean;
  onExit: () => void;
}

const POSITIVE_WORDS = ["good", "great", "amazing", "awesome", "fantastic", "promotion", "won", "closed", "raised", "launched", "shipped", "love", "happy", "excited"];
const NEGATIVE_WORDS = ["bad", "terrible", "awful", "fight", "fired", "lost", "broke", "rejected", "sick", "tired", "stressed", "sad", "angry", "frustrated"];
const PLAN_WORDS = ["plan", "tomorrow", "calendar", "schedule", "meeting", "events"];

const includesAny = (text: string, words: string[]) => {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
};

export const ConversationMode = ({ biomarkers, actions, active, onExit }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [eventsCache, setEventsCache] = useState<CalendarEvent[]>([]);
  const recognitionRef = useRef<any>(null);
  const idRef = useRef(0);
  const startedRef = useRef(false);
  const stoppedRef = useRef(false);
  const logRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<ChatTurn[]>([]);
  const stepRef = useRef<ScriptStep>("opener");

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

  // Preload tomorrow's events
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

  const cancelSpeech = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
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

  const fetchAiReply = async (userMessage: string): Promise<string | null> => {
    try {
      const signals = actions
        .map((a) => a.signal)
        .filter(Boolean)
        .map((s) => ({ text: (s as NonNullable<Action["signal"]>).text }));

      let events = eventsCache;
      if (events.length === 0) {
        try {
          events = await fetchTomorrowEvents();
          setEventsCache(events);
        } catch {
          events = [];
        }
      }

      const calendarEvents = events.map((e) => {
        const d = new Date(e.start);
        const startTime = isNaN(d.getTime())
          ? ""
          : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        return { summary: e.summary, startTime };
      });
      const { data, error } = await supabase.functions.invoke("chat-conversation", {
        body: {
          userMessage,
          biomarkers,
          calendarEvents,
          signals,
          history: historyRef.current.slice(-12),
        },
      });
      if (error) {
        console.warn("chat-conversation error", error);
        return null;
      }
      if (!data?.ok || typeof data?.reply !== "string" || !data.reply.trim()) {
        return null;
      }
      return data.reply.trim();
    } catch (e) {
      console.warn("chat-conversation invoke failed", e);
      return null;
    }
  };

  // Scripted replies driven by stepRef
  const scriptedReply = (userText: string): string | null => {
    const step = stepRef.current;

    if (step === "opener") {
      // After "How has your day been" - reference biomarkers
      stepRef.current = "biomarker";
      const { energy, stress, fatigue, happiness } = biomarkers;
      if (energy > 70) {
        return `I can tell! Your energy is at ${Math.round(energy)} and happiness is at ${Math.round(happiness)}. Something good must have happened. What's the highlight?`;
      }
      if (stress > 50) {
        return `Hmm, I'm picking up some tension. Your stress is at ${Math.round(stress)}. Want to talk about it?`;
      }
      if (fatigue > 50) {
        return `You sound a bit tired. Fatigue is showing at ${Math.round(fatigue)}. Rough night?`;
      }
      return `Got it. Your energy looks solid at ${Math.round(energy)}. Let's make the most of today.`;
    }

    if (step === "biomarker") {
      stepRef.current = "followup";
      if (includesAny(userText, PLAN_WORDS)) {
        // Jump straight to plan
        return planReadout();
      }
      if (includesAny(userText, POSITIVE_WORDS)) {
        return "That's amazing, congrats! Alright, want me to walk you through tomorrow's plan?";
      }
      if (includesAny(userText, NEGATIVE_WORDS)) {
        return "Sorry to hear that. Let's keep things light today. Want me to look at your schedule?";
      }
      return "Nice. Want me to check your plan and signals for tomorrow?";
    }

    return null;
  };

  const planReadout = (): string => {
    if (eventsCache.length === 0) {
      return "Tomorrow you have a packed day: gym at 7, tennis at 11, lunch at 1, call with mom at 2, sales pitch work at 2:30, meeting Greg for seed funding at 4, talking to Lisa about hiring a product lead at 6, and groceries at 7:30. Want me to break any of these down?";
    }
    const list = eventsCache
      .slice(0, 6)
      .map((e) => {
        const d = new Date(e.start);
        const time = isNaN(d.getTime())
          ? ""
          : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        return `${e.summary} at ${time}`;
      })
      .join(", ");
    return `Here's tomorrow: ${list}. Want me to break any of these down?`;
  };

  const handleUserUtterance = async (text: string) => {
    append({ role: "user", text });
    historyRef.current.push({ role: "user", content: text });

    let reply: string | null = scriptedReply(text);

    if (!reply) {
      // Free-form: use GPT, fall back to local intent
      stepRef.current = "free";
      reply = await fetchAiReply(text);
      if (!reply) {
        const intent = detectIntent(text);
        reply = buildReply(intent, {
          biomarkers,
          actions,
          events: eventsCache,
        });
      }
    }

    append({ role: "agent", text: reply });
    historyRef.current.push({ role: "assistant", content: reply });

    const intent = detectIntent(text);
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

  // Kick off scripted opener
  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    stoppedRef.current = false;
    stepRef.current = "opener";
    const opener = "Hey Himanshu! How has your day been today?";
    append({ role: "agent", text: opener });
    historyRef.current.push({ role: "assistant", content: opener });
    const t = window.setTimeout(() => {
      speak(opener, () => startListening());
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Cleanup
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      stopRecognition();
      cancelSpeech();
    };
  }, []);

  const handleStop = () => {
    stoppedRef.current = true;
    stopRecognition();
    cancelSpeech();
    setStatus("idle");
    onExit();
  };

  // Tap-to-interrupt: cancel speech and start listening immediately
  const handleInterrupt = () => {
    if (status !== "speaking") return;
    cancelSpeech();
    startListening();
  };

  if (!active) return null;

  return (
    <>
      <div
        className="rounded-2xl border border-white/[0.06] bg-[#111113] p-5 cursor-pointer"
        onClick={handleInterrupt}
        title={status === "speaking" ? "Tap to interrupt" : undefined}
      >
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
              <>
                <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-green-400 rounded-full animate-tts-bar"
                      style={{ height: "100%", animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </span>
                <span className="text-xs text-zinc-500">tap to interrupt</span>
              </>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStop();
            }}
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
      </div>

      {/* Floating Stop button while speaking */}
      {status === "speaking" && (
        <button
          onClick={handleStop}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-red-500 hover:bg-red-400 text-white font-semibold px-8 py-4 rounded-full text-lg shadow-lg shadow-red-500/20 inline-flex items-center gap-3 animate-fade-up"
          aria-label="Stop"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          Stop
        </button>
      )}
    </>
  );
};
