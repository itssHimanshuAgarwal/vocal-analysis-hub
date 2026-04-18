import type { IconType } from "react-icons";
import {
  SiYoutube,
  SiSubstack,
  SiSpotify,
  SiLinkedin as SiLinkedinIcon,
  SiX,
  SiGithub,
  SiReddit,
  SiWhatsapp,
  SiDiscord,
} from "react-icons/si";
import { Calendar, BookOpen, DollarSign } from "lucide-react";

export type SourceKey =
  | "YT" | "NL" | "SP" | "LI" | "TW" | "GH"
  | "RD" | "WA" | "LU" | "DC" | "BK" | "FN";

export const SOURCES: { key: SourceKey; label: string; Icon: IconType | typeof Calendar; brand: string }[] = [
  { key: "YT", label: "YouTube", Icon: SiYoutube, brand: "#FF0000" },
  { key: "NL", label: "Newsletters", Icon: SiSubstack, brand: "#FF6719" },
  { key: "SP", label: "Spotify", Icon: SiSpotify, brand: "#1DB954" },
  { key: "LI", label: "LinkedIn", Icon: SiLinkedin, brand: "#0A66C2" },
  { key: "TW", label: "Twitter", Icon: SiX, brand: "#FFFFFF" },
  { key: "GH", label: "GitHub", Icon: SiGithub, brand: "#FFFFFF" },
  { key: "RD", label: "Reddit", Icon: SiReddit, brand: "#FF4500" },
  { key: "WA", label: "WhatsApp", Icon: SiWhatsapp, brand: "#25D366" },
  { key: "LU", label: "Luma", Icon: Calendar, brand: "#EC4899" },
  { key: "DC", label: "Discord", Icon: SiDiscord, brand: "#5865F2" },
  { key: "BK", label: "Books", Icon: BookOpen, brand: "#A78BFA" },
  { key: "FN", label: "Funding", Icon: DollarSign, brand: "#00D47E" },
];

// Map signal source string → source key
export const SOURCE_FROM_SIGNAL: Record<string, SourceKey> = {
  YOUTUBE: "YT",
  NEWSLETTER: "NL",
  PODCAST: "SP",
  SPOTIFY: "SP",
  LINKEDIN: "LI",
  TWITTER: "TW",
  X: "TW",
  GITHUB: "GH",
  REDDIT: "RD",
  WHATSAPP: "WA",
  LUMA: "LU",
  DISCORD: "DC",
  BOOK: "BK",
  BOOKS: "BK",
  FUNDING: "FN",
};

interface SourcesStripProps {
  active: Set<SourceKey>;
  onSelect?: (key: SourceKey) => void;
  ringSource?: SourceKey | null;
}

export const SourcesStrip = ({ active, onSelect, ringSource }: SourcesStripProps) => (
  <section
    className="opacity-0 animate-fade-up"
    style={{ animationDelay: "100ms" }}
    aria-label="Connected sources"
  >
    <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-3 font-medium">
      YOUR SOURCES
    </div>
    <div className="flex gap-3 overflow-x-auto py-4 -mx-1 px-1 scrollbar-thin">
      {SOURCES.map((s) => {
        const isOn = active.has(s.key);
        const isRinging = ringSource === s.key;
        const Icon = s.Icon;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect?.(s.key)}
            className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none"
            aria-label={`Show ${s.label} signals`}
          >
            <div
              className={`relative w-10 h-10 rounded-full bg-[#18181B] border flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-hover:border-white/20 cursor-pointer ${
                isOn
                  ? "border-green-500/50 shadow-[0_0_14px_-2px_rgba(0,212,126,0.6)]"
                  : "border-white/[0.06]"
              }`}
            >
              <Icon
                className="w-5 h-5 transition-transform"
                style={{ color: isOn ? s.brand : "#a1a1aa" }}
              />
              {isOn && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(0,212,126,0.8)]" />
              )}
              {isRinging && (
                <>
                  <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-green-400/70 animate-ring-pulse" />
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-green-400/50 animate-ring-pulse"
                    style={{ animationDelay: "0.4s" }}
                  />
                </>
              )}
            </div>
            <span className="text-[9px] text-zinc-600 group-hover:text-zinc-400 transition-colors">{s.label}</span>
          </button>
        );
      })}
    </div>
  </section>
);
