import { useState } from "react";

export function ChatList({
  peerName,
  peerInitial,
  gradient,
  peerOnline,
  lastMessagePreview,
  lastMessageTime,
  unreadCount,
}: {
  peerName: string;
  peerInitial: string;
  gradient: string;
  peerOnline: boolean;
  lastMessagePreview: string;
  lastMessageTime: string;
  unreadCount: number;
}) {
  const [q, setQ] = useState("");
  const matches = peerName.toLowerCase().includes(q.trim().toLowerCase());

  return (
    <aside className="hidden h-full w-[320px] shrink-0 flex-col border-r border-white/5 bg-[#0f0f0f] md:flex lg:w-[360px]">
      <div className="border-b border-white/5 bg-[#171717] px-4 py-3">
        <div className="mb-2 text-sm font-semibold tracking-tight text-slate-100">Chats</div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full border border-white/5 bg-[#0f0f0f] py-1.5 pl-8 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-rose-500/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="chat-scroll flex-1 overflow-y-auto py-1">
        {matches ? (
          <button
            type="button"
            className="flex w-full items-center gap-3 border-l-2 border-rose-500 bg-white/[0.03] px-3 py-3 text-left transition hover:bg-white/[0.05]"
          >
            <div className="relative shrink-0">
              <div className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow`}>
                {peerInitial}
              </div>
              {peerOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0f0f0f] bg-emerald-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-100">{peerName}</span>
                <span className="shrink-0 text-[10px] text-slate-500">{lastMessageTime}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-slate-400">{lastMessagePreview}</span>
                {unreadCount > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ) : (
          <div className="px-4 py-8 text-center text-xs text-slate-500">No chats found</div>
        )}
      </div>
    </aside>
  );
}
