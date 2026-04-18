import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

type Phase = "idle" | "recording" | "scanning" | "results";

type ColorKey =
  | "green" | "amber" | "purple" | "sky" | "blue" | "orange"
  | "red" | "emerald" | "pink" | "indigo" | "violet" | "zinc";

const COLORS: Record<ColorKey, { base: string; lit: string; label: string }> = {
  green: {
    base: "bg-green-500/10 border border-green-500/20",
    lit: "border-green-400/70 shadow-[0_0_18px_-4px_rgba(0,212,126,0.7)]",
    label: "text-green-400",
  },
  amber: {
    base: "bg-amber-500/10 border border-amber-500/20",
    lit: "border-amber-400/70 shadow-[0_0_18px_-4px_rgba(245,158,11,0.6)]",
    label: "text-amber-400",
  },
  purple: {
    base: "bg-purple-500/10 border border-purple-500/20",
    lit: "border-purple-400/70 shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)]",
    label: "text-purple-400",
  },
  sky: {
    base: "bg-sky-500/10 border border-sky-500/20",
    lit: "border-sky-400/70 shadow-[0_0_18px_-4px_rgba(56,189,248,0.6)]",
    label: "text-sky-400",
  },
  blue: {
    base: "bg-blue-500/10 border border-blue-500/20",
    lit: "border-blue-400/70 shadow-[0_0_18px_-4px_rgba(59,130,246,0.6)]",
    label: "text-blue-400",
  },
  orange: {
    base: "bg-orange-500/10 border border-orange-500/20",
    lit: "border-orange-400/70 shadow-[0_0_18px_-4px_rgba(249,115,22,0.6)]",
    label: "text-orange-400",
  },
  red: {
    base: "bg-red-500/10 border border-red-500/20",
    lit: "border-red-400/70 shadow-[0_0_18px_-4px_rgba(239,68,68,0.6)]",
    label: "text-red-400",
  },
  emerald: {
    base: "bg-emerald-500/10 border border-emerald-500/20",
    lit: "border-emerald-400/70 shadow-[0_0_18px_-4px_rgba(16,185,129,0.6)]",
    label: "text-emerald-400",
  },
  pink: {
    base: "bg-pink-500/10 border border-pink-500/20",
    lit: "border-pink-400/70 shadow-[0_0_18px_-4px_rgba(236,72,153,0.6)]",
    label: "text-pink-400",
  },
  indigo: {
    base: "bg-indigo-500/10 border border-indigo-500/20",
    lit: "border-indigo-400/70 shadow-[0_0_18px_-4px_rgba(99,102,241,0.6)]",
    label: "text-indigo-400",
  },
  violet: {
    base: "bg-violet-500/10 border border-violet-500/20",
    lit: "border-violet-400/70 shadow-[0_0_18px_-4px_rgba(139,92,246,0.6)]",
    label: "text-violet-400",
  },
  zinc: {
    base: "bg-zinc-700 border border-zinc-600",
    lit: "border-green-500/50 shadow-[0_0_18px_-4px_rgba(0,212,126,0.5)]",
    label: "text-white",
  },
};

type NodeData = {
  color: ColorKey;
  label: string;
  sublabel: string;
  lit: boolean;
  pulse?: boolean;
  small?: boolean;
};

const PipelineNode = ({ data }: NodeProps<NodeData>) => {
  const c = COLORS[data.color];
  const padding = data.small ? "px-3 py-2" : "px-4 py-3";
  const labelSize = data.small ? "text-[10px]" : "text-xs";
  return (
    <div
      className={`rounded-lg ${padding} transition-all duration-500 ${c.base} ${
        data.lit ? `opacity-100 ${c.lit}` : "opacity-40"
      } ${data.pulse ? "animate-pulse" : ""}`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className={`${labelSize} font-medium ${c.label}`}>{data.label}</div>
      <div className={`text-[9px] text-zinc-500`}>{data.sublabel}</div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
};

const nodeTypes = { pipe: PipelineNode };

interface Props {
  phase: Phase;
}

// Source nodes (Layer 3) — id, label, sublabel, color, y position
const SOURCES: Array<{ id: string; label: string; sublabel: string; color: ColorKey; y: number }> = [
  { id: "src_nl", label: "Newsletters", sublabel: "", color: "orange", y: 0 },
  { id: "src_pod", label: "Podcasts", sublabel: "", color: "green", y: 42 },
  { id: "src_li", label: "LinkedIn", sublabel: "", color: "blue", y: 84 },
  { id: "src_tw", label: "Twitter", sublabel: "", color: "sky", y: 126 },
  { id: "src_rd", label: "Reddit", sublabel: "", color: "red", y: 168 },
  { id: "src_wa", label: "WhatsApp", sublabel: "", color: "emerald", y: 210 },
  { id: "src_lu", label: "Luma", sublabel: "", color: "pink", y: 252 },
  { id: "src_dc", label: "Discord", sublabel: "", color: "indigo", y: 294 },
  { id: "src_yt", label: "YouTube", sublabel: "", color: "red", y: 336 },
];

export const AgentPipeline = ({ phase }: Props) => {
  // Step ladder:
  // 0: Voice
  // 1: Gradium STT (+ edge from voice)
  // 2: Speechmatics, Thymia, Calendar (+ their edges)
  // 3..11: 9 sources cascading (one per 100ms)
  // 12: TinyFish + edges from sources
  // 13: GPT-4o + Mood Tracker + edges
  // 14: Plan + edge
  // 15: Gradium TTS + edge (pulse)
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (phase === "idle") {
      setStep(-1);
      return;
    }
    if (phase === "recording") {
      // Live animation while user is speaking: cascade through steps so the
      // pipeline visibly "works" in real time, then loop the source layer to
      // show continuous activity.
      setStep(0);
      const timers: number[] = [];
      const liveSchedule: Array<[number, number]> = [
        [400, 1],   // Gradium STT
        [800, 2],   // Speechmatics + Thymia + Calendar
        [1200, 3],
        [1400, 4],
        [1600, 5],
        [1800, 6],
        [2000, 7],
        [2200, 8],
        [2400, 9],
        [2600, 10],
        [2800, 11],
        [3100, 12], // TinyFish lights up
        [3500, 13], // GPT + Mood pulse
      ];
      liveSchedule.forEach(([ms, s]) => {
        timers.push(window.setTimeout(() => setStep(s), ms));
      });
      // Heartbeat pulse: nudge step between 12 and 13 to keep edges flowing.
      const beat = window.setInterval(() => {
        setStep((s) => (s >= 13 ? 12 : s));
      }, 1500);
      timers.push(beat as unknown as number);
      return () => {
        timers.forEach(clearTimeout);
        clearInterval(beat);
      };
    }
    if (phase === "scanning" || phase === "results") {
      // Continue from wherever recording left off, finalize the plan + TTS nodes.
      const timers: number[] = [];
      const schedule: Array<[number, number]> = [
        [200, 13],   // GPT + Mood
        [800, 14],   // Plan
        [1400, 15],  // Gradium TTS
      ];
      schedule.forEach(([ms, s]) => {
        timers.push(window.setTimeout(() => setStep(s), ms));
      });
      return () => timers.forEach(clearTimeout);
    }
  }, [phase]);

  const nodes: Node<NodeData>[] = useMemo(() => {
    const litVoice = step >= 0;
    const litGradiumStt = step >= 1;
    const litSpeechmatics = step >= 2;
    const litThymia = step >= 2;
    const litCalendar = step >= 2;
    const litTiny = step >= 12;
    const litGpt = step >= 13;
    const litMood = step >= 13;
    const litPlan = step >= 14;
    const litTts = step >= 15;

    const list: Node<NodeData>[] = [
      {
        id: "voice",
        type: "pipe",
        position: { x: 0, y: 170 },
        data: {
          color: "green",
          label: "Your Voice",
          sublabel: "15 sec check-in",
          lit: litVoice,
          pulse: phase === "recording",
        },
      },
      {
        id: "gradium_stt",
        type: "pipe",
        position: { x: 200, y: 50 },
        data: { color: "green", label: "Gradium STT", sublabel: "voice capture", lit: litGradiumStt },
      },
      {
        id: "speechmatics",
        type: "pipe",
        position: { x: 200, y: 130 },
        data: { color: "amber", label: "Speechmatics", sublabel: "transcription", lit: litSpeechmatics },
      },
      {
        id: "calendar",
        type: "pipe",
        position: { x: 200, y: 210 },
        data: { color: "sky", label: "Google Calendar", sublabel: "3 meetings today", lit: litCalendar },
      },
      {
        id: "thymia",
        type: "pipe",
        position: { x: 200, y: 290 },
        data: { color: "purple", label: "Thymia Sentinel", sublabel: "voice biomarkers", lit: litThymia },
      },
    ];

    SOURCES.forEach((s, idx) => {
      list.push({
        id: s.id,
        type: "pipe",
        position: { x: 420, y: s.y },
        data: {
          color: s.color,
          label: s.label,
          sublabel: s.sublabel,
          lit: step >= 3 + idx,
          small: true,
        },
      });
    });

    list.push(
      {
        id: "tinyfish",
        type: "pipe",
        position: { x: 620, y: 80 },
        data: { color: "blue", label: "TinyFish", sublabel: "web intelligence", lit: litTiny },
      },
      {
        id: "gpt",
        type: "pipe",
        position: { x: 620, y: 200 },
        data: { color: "zinc", label: "GPT-4o", sublabel: "reasoning engine", lit: litGpt },
      },
      {
        id: "mood",
        type: "pipe",
        position: { x: 620, y: 310 },
        data: { color: "violet", label: "Mood Tracker", sublabel: "7-day trend", lit: litMood },
      },
      {
        id: "plan",
        type: "pipe",
        position: { x: 830, y: 150 },
        data: { color: "green", label: "Your Plan", sublabel: "5 actions", lit: litPlan },
      },
      {
        id: "gradium_tts",
        type: "pipe",
        position: { x: 830, y: 270 },
        data: {
          color: "green",
          label: "Gradium TTS",
          sublabel: "speaks your plan",
          lit: litTts,
          pulse: litTts,
        },
      },
    );

    return list;
  }, [step, phase]);

  const edges: Edge[] = useMemo(() => {
    const dim = "rgba(255,255,255,0.15)";
    const lit = "rgba(0,212,126,0.7)";
    const make = (
      id: string,
      source: string,
      target: string,
      label: string | undefined,
      isLit: boolean,
    ): Edge => ({
      id,
      source,
      target,
      label,
      animated: true,
      style: { stroke: isLit ? lit : dim, strokeWidth: 2, strokeDasharray: "4 4" },
      labelStyle: { fill: "#52525b", fontSize: 8 },
      labelBgStyle: { fill: "#111113" },
      labelBgPadding: [3, 2],
    });

    const list: Edge[] = [
      make("e_v_g", "voice", "gradium_stt", "audio stream", step >= 1),
      make("e_g_sm", "gradium_stt", "speechmatics", "enhanced audio", step >= 2),
      make("e_g_th", "gradium_stt", "thymia", "clean audio", step >= 2),
      make("e_v_cal", "voice", "calendar", "context", step >= 2),
      make("e_sm_gpt", "speechmatics", "gpt", "transcript", step >= 13),
      make("e_th_gpt", "thymia", "gpt", "biomarkers", step >= 13),
      make("e_th_mood", "thymia", "mood", "daily scores", step >= 13),
      make("e_cal_gpt", "calendar", "gpt", "meetings", step >= 13),
    ];

    SOURCES.forEach((s, idx) => {
      list.push(make(`e_${s.id}_tf`, s.id, "tinyfish", undefined, step >= 12 && step >= 3 + idx));
    });

    list.push(
      make("e_tf_gpt", "tinyfish", "gpt", "intelligence", step >= 13),
      make("e_mood_gpt", "mood", "gpt", "trends", step >= 13),
      make("e_gpt_plan", "gpt", "plan", "5 actions", step >= 14),
      make("e_plan_tts", "plan", "gradium_tts", "audio out", step >= 15),
    );

    return list;
  }, [step]);

  const status = useMemo(() => {
    if (step < 1) return "capturing voice...";
    if (step < 2) return "analyzing biomarkers...";
    if (step < 3) return "reading calendar...";
    if (step < 12) return "scanning 12 sources...";
    if (step < 14) return "generating your plan...";
    return "ready";
  }, [step]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
          AGENT PIPELINE
        </div>
        <div className={`text-[11px] tracking-wider font-mono ${step >= 15 ? "text-green-400" : "text-zinc-400"}`}>
          {status}
        </div>
      </div>
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-2 h-[400px] overflow-hidden">

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnDrag={false}
          panOnScroll={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="transparent" gap={0} size={0} />
        </ReactFlow>
      </div>
    </div>
  );
};
