import { useState } from "react";

interface Props {
  speaking: boolean;
  onAsk: (question: string) => void;
}

export const BriefingBar = ({ speaking, onAsk }: Props) => {
  const [text, setText] = useState("");

  const submit = () => {
    const q = text.trim();
    if (!q) return;
    onAsk(q);
    setText("");
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-5">
      <div className="flex items-center gap-3">
        <span className="flex items-end gap-1 h-6" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`w-1 rounded-full bg-green-400 ${
                speaking ? "animate-tts-bar" : "opacity-40"
              }`}
              style={{
                height: speaking ? "100%" : "8px",
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </span>
        <span className="text-sm text-zinc-300 font-medium">
          {speaking ? "Locked In is speaking..." : "briefing complete"}
        </span>
      </div>

      {!speaking && (
        <div className="mt-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="ask a follow-up..."
            className="flex-1 rounded-full border border-white/[0.06] bg-[#0c0c0e] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-green-400/40 focus:ring-2 focus:ring-green-400/20 transition-all"
          />
          <button
            onClick={submit}
            className="rounded-full bg-green-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-400 transition-colors"
          >
            ask
          </button>
        </div>
      )}
    </div>
  );
};
