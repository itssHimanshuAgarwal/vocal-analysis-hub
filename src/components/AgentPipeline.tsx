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

type NodeKind = "voice" | "speechmatics" | "thymia" | "tinyfish" | "gpt" | "plan";

const NODE_STYLES: Record<NodeKind, { base: string; lit: string; label: string; sublabel: string }> = {
  voice: {
    base: "bg-zinc-800 border border-zinc-700",
    lit: "border-green-500/60 shadow-[0_0_18px_-4px_rgba(0,212,126,0.7)]",
    label: "text-white",
    sublabel: "text-zinc-500",
  },
  speechmatics: {
    base: "bg-amber-500/10 border border-amber-500/20",
    lit: "border-amber-400/60 shadow-[0_0_18px_-4px_rgba(245,158,11,0.6)]",
    label: "text-amber-400",
    sublabel: "text-zinc-500",
  },
  thymia: {
    base: "bg-purple-500/10 border border-purple-500/20",
    lit: "border-purple-400/60 shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)]",
    label: "text-purple-400",
    sublabel: "text-zinc-500",
  },
  tinyfish: {
    base: "bg-blue-500/10 border border-blue-500/20",
    lit: "border-blue-400/60 shadow-[0_0_18px_-4px_rgba(59,130,246,0.6)]",
    label: "text-blue-400",
    sublabel: "text-zinc-500",
  },
  gpt: {
    base: "bg-zinc-700 border border-zinc-600",
    lit: "border-green-500/50 shadow-[0_0_18px_-4px_rgba(0,212,126,0.5)]",
    label: "text-white",
    sublabel: "text-zinc-500",
  },
  plan: {
    base: "bg-green-500/10 border border-green-500/20",
    lit: "border-green-400/70 shadow-[0_0_24px_-4px_rgba(0,212,126,0.8)]",
    label: "text-green-400",
    sublabel: "text-zinc-500",
  },
};

type NodeData = {
  kind: NodeKind;
  label: string;
  sublabel: string;
  lit: boolean;
  pulse?: boolean;
};

const PipelineNode = ({ data }: NodeProps<NodeData>) => {
  const s = NODE_STYLES[data.kind];
  return (
    <div
      className={`rounded-xl px-4 py-3 transition-all duration-500 ${s.base} ${
        data.lit ? `opacity-100 ${s.lit}` : "opacity-40"
      } ${data.pulse ? "animate-pulse" : ""}`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className={`text-xs font-medium ${s.label}`}>{data.label}</div>
      <div className={`text-[10px] ${s.sublabel}`}>{data.sublabel}</div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
};

const nodeTypes = { pipe: PipelineNode };

interface Props {
  phase: Phase;
}

export const AgentPipeline = ({ phase }: Props) => {
  // step: -1 = none lit, 0..6 progressive
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (phase === "idle") {
      setStep(-1);
      return;
    }
    if (phase === "recording") {
      setStep(0); // voice node lit + pulsing
      return;
    }
    if (phase === "scanning") {
      // Animate progressively over ~3s
      setStep(0);
      const timers: number[] = [];
      const schedule: Array<[number, number]> = [
        [500, 1],
        [1000, 2],
        [1500, 3],
        [2000, 4],
        [2500, 5],
        [3000, 6],
      ];
      schedule.forEach(([ms, s]) => {
        timers.push(window.setTimeout(() => setStep(s), ms));
      });
      return () => timers.forEach(clearTimeout);
    }
    if (phase === "results") {
      setStep(6);
    }
  }, [phase]);

  const nodes: Node<NodeData>[] = useMemo(() => {
    const litVoice = step >= 0;
    const litStt = step >= 2;
    const litThymia = step >= 2;
    const litTiny = step >= 4;
    const litGpt = step >= 4;
    const litPlan = step >= 6;
    return [
      {
        id: "voice",
        type: "pipe",
        position: { x: 0, y: 100 },
        data: {
          kind: "voice",
          label: "Your Voice",
          sublabel: "15 sec check-in",
          lit: litVoice,
          pulse: phase === "recording",
        },
      },
      {
        id: "stt",
        type: "pipe",
        position: { x: 200, y: 40 },
        data: { kind: "speechmatics", label: "Speechmatics", sublabel: "transcription", lit: litStt },
      },
      {
        id: "thymia",
        type: "pipe",
        position: { x: 200, y: 160 },
        data: { kind: "thymia", label: "Thymia Sentinel", sublabel: "voice biomarkers", lit: litThymia },
      },
      {
        id: "tinyfish",
        type: "pipe",
        position: { x: 420, y: 40 },
        data: { kind: "tinyfish", label: "TinyFish", sublabel: "web intelligence", lit: litTiny },
      },
      {
        id: "gpt",
        type: "pipe",
        position: { x: 420, y: 160 },
        data: { kind: "gpt", label: "GPT-4o", sublabel: "reasoning engine", lit: litGpt },
      },
      {
        id: "plan",
        type: "pipe",
        position: { x: 640, y: 100 },
        data: { kind: "plan", label: "Your Plan", sublabel: "5 actions", lit: litPlan, pulse: litPlan && phase === "results" },
      },
    ];
  }, [step, phase]);

  const edges: Edge[] = useMemo(() => {
    const dim = "rgba(255,255,255,0.15)";
    const lit = "rgba(0,212,126,0.7)";
    const make = (id: string, source: string, target: string, label: string, isLit: boolean): Edge => ({
      id,
      source,
      target,
      label,
      animated: true,
      style: { stroke: isLit ? lit : dim, strokeWidth: 2 },
      labelStyle: { fill: "#52525b", fontSize: 9 },
      labelBgStyle: { fill: "#111113" },
      labelBgPadding: [3, 2],
    });
    return [
      make("e1", "voice", "stt", "audio", step >= 1),
      make("e2", "voice", "thymia", "audio", step >= 1),
      make("e3", "stt", "tinyfish", "topics", step >= 3),
      make("e4", "stt", "gpt", "transcript", step >= 3),
      make("e5", "thymia", "gpt", "biomarkers", step >= 3),
      make("e6", "tinyfish", "gpt", "signals", step >= 3),
      make("e7", "gpt", "plan", "actions", step >= 5),
    ];
  }, [step]);

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-4 font-medium">
        AGENT PIPELINE
      </div>
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-2 h-[280px] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
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
