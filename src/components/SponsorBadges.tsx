type Sponsor = {
  name: string;
  active: string;
  featured?: boolean;
};

const SPONSORS: Sponsor[] = [
  {
    name: "Gradium",
    active: "bg-green-500/15 text-green-400 border border-green-500/30 shadow-[0_0_20px_-4px_rgba(0,212,126,0.4)]",
    featured: true,
  },
  { name: "TinyFish", active: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  { name: "Thymia", active: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  { name: "Speechmatics", active: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
];

export const SponsorBadges = ({ activated }: { activated: boolean }) => (
  <div className="flex flex-wrap items-center gap-2">
    {SPONSORS.map((s, i) => (
      <span
        key={s.name}
        style={{ transitionDelay: activated ? `${i * 200}ms` : "0ms" }}
        className={`${s.featured ? "px-4 py-2 text-[11px]" : "px-3 py-1.5 text-[10px]"} rounded-full font-medium uppercase tracking-wider transition-all duration-500 ease-out ${
          activated ? s.active : "bg-zinc-800/50 text-zinc-600"
        }`}
      >
        {s.name}
      </span>
    ))}
  </div>
);
