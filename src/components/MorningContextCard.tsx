export const morningContext = {
  whatsapp: [
    { from: "Gary", message: "Did you finish the investor deck?", time: "11:34 PM" },
    { from: "Yusuf", message: "China factory samples arriving Thursday", time: "8:12 AM" },
    { from: "Founders Group", message: "3 new messages about Series B benchmarks", time: "7:45 AM" },
  ],
  calendar: [
    { event: "Daily Standup", time: "10:00", duration: "30min" },
    { event: "Investor Call - Balderton", time: "14:00", duration: "60min" },
    { event: "Team Sync", time: "16:00", duration: "45min" },
  ],
  unreadNewsletters: 2,
  unreadEmails: 7,
};

export const MorningContextCard = ({ delayMs }: { delayMs: number }) => (
  <div
    className="opacity-0 animate-fade-up rounded-xl border border-white/[0.06] bg-[#111113] p-4"
    style={{ animationDelay: `${delayMs}ms` }}
  >
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
      <span><span className="font-bold text-green-400">{morningContext.whatsapp.length}</span> WhatsApp</span>
      <span className="text-zinc-700">•</span>
      <span><span className="font-bold text-green-400">{morningContext.calendar.length}</span> calendar events</span>
      <span className="text-zinc-700">•</span>
      <span><span className="font-bold text-green-400">{morningContext.unreadNewsletters}</span> newsletters</span>
      <span className="text-zinc-700">•</span>
      <span><span className="font-bold text-green-400">{morningContext.unreadEmails}</span> emails</span>
    </div>
    <div className="mt-2 text-[11px] text-zinc-600 leading-relaxed">
      Gary asked about the investor deck • Morning Brew covers UK funding spike • Balderton call at 14:00
    </div>
  </div>
);
