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
const CURIOUS = ["anything interesting", "what should i do", "any events", "ecosystem", "what else", "anything else", "news", "next steps", "next step", "recommend"];
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
      return "Okay, here's what I'd recommend. First, before your call with Greg tomorrow, listen to the 20VC episode on closing a Series B. Harry Stebbings covers exactly what you need. Second, reply to Gary right now, just two lines saying the deck will be ready by noon tomorrow. Third, there's a Founders Gatherings event in San Francisco hosted by Kyosuke Togami and MindPal, small curated room of founders. I think you should request to join, structured founder rounds, no awkward small talk. Fourth, there's a voice agent framework trending on GitHub with 1200 stars. Worth bookmarking for your build. And fifth, Morning Brew says UK funding hit a 3-year high. Drop that stat into your deck. That's it. Want me to go deeper on any of these?";
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
