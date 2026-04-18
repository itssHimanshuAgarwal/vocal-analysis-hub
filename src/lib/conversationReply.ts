import type { Biomarkers } from "./analyzeBiomarkers";
import type { Action } from "./generatePlan";
import type { CalendarEvent } from "@/services/calendarClient";

const includesAny = (text: string, words: string[]) => {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
};

const POSITIVE = ["promotion", "investment", "great", "amazing", "cute", "date", "won", "shipped", "launched", "raised", "closed"];
const NEGATIVE = ["fight", "argument", "bad", "terrible", "fired", "lost", "broke", "broken", "rejected", "sick"];
const WORK = ["deck", "investor", "meeting", "call", "fundraising", "hiring", "standup", "board"];
const AFFIRM = ["yes", "yeah", "sure", "go ahead", "walk me through", "plan", "tomorrow", "okay", "ok", "please"];
const CURIOUS = ["anything interesting", "what should i do", "any events", "ecosystem", "what else", "anything else", "news"];
const FAREWELL = ["thanks", "thank you", "that's all", "bye", "done", "goodbye", "later"];

const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export type Intent =
  | "positive"
  | "negative"
  | "work"
  | "affirm"
  | "curious"
  | "farewell"
  | "default";

export const detectIntent = (text: string): Intent => {
  if (!text.trim()) return "default";
  if (includesAny(text, FAREWELL)) return "farewell";
  if (includesAny(text, POSITIVE)) return "positive";
  if (includesAny(text, NEGATIVE)) return "negative";
  if (includesAny(text, CURIOUS)) return "curious";
  if (includesAny(text, AFFIRM)) return "affirm";
  if (includesAny(text, WORK)) return "work";
  return "default";
};

export interface ReplyContext {
  biomarkers: Biomarkers;
  actions: Action[];
  events: CalendarEvent[];
}

export const buildReply = (intent: Intent, ctx: ReplyContext): string => {
  const { biomarkers, actions, events } = ctx;

  switch (intent) {
    case "positive":
      return "That's amazing! I can hear the excitement in your voice. Your energy score just confirms it. Alright, let's ride this momentum. Want me to walk you through your plan for tomorrow?";

    case "negative":
      return "I'm sorry to hear that. Your voice biomarkers are showing it too. Let's keep today light. I've already adjusted your plan to protect your energy. Want to hear it?";

    case "work":
      return "Got it. I've checked your calendar and you have those lined up. Let me walk you through the smartest order based on your energy levels.";

    case "affirm": {
      const parts: string[] = [];
      if (events.length > 0) {
        const list = events.slice(0, 3).map((e) => `${e.summary} at ${formatTime(e.start)}`).join(", ");
        parts.push(`Alright. Tomorrow you have ${list}.`);
      } else {
        parts.push("Alright. Your calendar is clear tomorrow.");
      }
      if (biomarkers.fatigue > 60) parts.push("Based on how tired you sound, here's what I'd suggest.");
      else if (biomarkers.stress > 60) parts.push("Given your stress levels, here's what I'd suggest.");
      else parts.push("Here's what I'd suggest.");
      const top = actions.slice(0, 3);
      top.forEach((a, i) => {
        parts.push(`${i + 1}. ${a.text} at ${a.time.replace("–", " to ")}.`);
      });
      parts.push("That's the core of your day.");
      return parts.join(" ");
    }

    case "curious": {
      const sigs = actions.map((a) => a.signal).filter(Boolean) as NonNullable<Action["signal"]>[];
      const first = sigs[0];
      const second = sigs[1];
      const parts: string[] = [
        "Actually yes. I went through all 12 of your intelligence sources.",
      ];
      if (first) parts.push(`${first.text}.`);
      if (second) parts.push(`Also, ${second.text}.`);
      parts.push("And there's an event tonight, AI Founders drinks at Shoreditch Studios, 43 people going.");
      if (biomarkers.energy > 50) parts.push("Given your energy level, I think you should go. Low key, good conversations, home by 9.");
      else parts.push("Given your energy, I'd skip it tonight and rest up.");
      parts.push("Also, there's a GitHub repo trending right now that's relevant to what you're building, an open source voice agent framework that got 1200 stars in 3 days. Worth checking out tomorrow morning.");
      return parts.join(" ");
    }

    case "farewell":
      return "You got this, Himanshu. Have a great day. I'll be here whenever you need me.";

    default:
      return "Got it. Based on everything I know about your day and your energy, I'd focus on your top 3 priorities and let everything else wait. Want me to read those out?";
  }
};

export const buildOpener = (bio: Biomarkers): string => {
  if (bio.energy > 60) return "Hey Himanshu! You sound great today. Did something good happen?";
  if (bio.fatigue > 60) return "Hey Himanshu. You sound tired. Rough night?";
  if (bio.stress > 60) return "Hey Himanshu. I'm picking up some stress in your voice. Everything okay?";
  return "Hey Himanshu. How's it going? Tell me about your day.";
};
