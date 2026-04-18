import { useEffect, useState } from "react";

export const Particles = ({ trigger }: { trigger: number }) => {
  const [seed, setSeed] = useState<number | null>(null);

  useEffect(() => {
    if (!trigger) return;
    setSeed(trigger);
    const t = window.setTimeout(() => setSeed(null), 2200);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!seed) return null;

  const dots = Array.from({ length: 15 }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 600;
    const drift = (Math.random() - 0.5) * 40;
    const isGreen = i % 2 === 0;
    return { left, delay, drift, isGreen, key: `${seed}-${i}` };
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {dots.map((d) => (
        <span
          key={d.key}
          className="absolute bottom-0 h-2 w-2 rounded-full"
          style={{
            left: `${d.left}%`,
            background: d.isGreen ? "#00D47E" : "#7C3AED",
            boxShadow: `0 0 8px ${d.isGreen ? "rgba(0,212,126,0.8)" : "rgba(124,58,237,0.8)"}`,
            animation: `particle-rise 2s ease-out ${d.delay}ms forwards`,
            // @ts-expect-error custom prop for keyframes
            "--drift": `${d.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes particle-rise {
          0% { transform: translate(0, 0); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--drift, 0px), -90vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
