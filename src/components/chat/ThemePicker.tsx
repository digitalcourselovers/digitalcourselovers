import { X, Check, Send } from "lucide-react";
import { useState } from "react";
import { CHAT_THEMES, type ChatTheme } from "@/lib/chat-theme";

type Props = {
  open: boolean;
  current: ChatTheme;
  onClose: () => void;
  onSelect: (key: string) => void;
  canPing?: boolean;
  onPing?: () => Promise<boolean>;
};

export function ThemePicker({ open, current, onClose, onSelect, canPing, onPing }: Props) {
  const [pingState, setPingState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  if (!open) return null;

  async function handlePing() {
    if (!onPing || pingState === "busy" || pingState === "sent") return;
    setPingState("busy");
    const ok = await onPing();
    setPingState(ok ? "sent" : "error");
    if (ok) {
      setTimeout(() => setPingState("idle"), 30_000);
    } else {
      setTimeout(() => setPingState("idle"), 4000);
    }
  }


  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-white/10 bg-[#141414] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">Chat theme</div>
            <div className="text-[11px] text-slate-400">Applies to both of you 💞</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close theme picker"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {canPing && (
          <div className="border-b border-white/5 p-3">
            <button
              type="button"
              onClick={handlePing}
              disabled={pingState === "busy" || pingState === "sent"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {pingState === "sent"
                ? "Sent 💗"
                : pingState === "busy"
                  ? "Sending…"
                  : "Send him a thought 💌"}
            </button>
            <div className="mt-1.5 text-center text-[11px] text-slate-400">
              {pingState === "error" ? "Couldn't send, try again" : "He'll get a little nudge"}
            </div>
          </div>
        )}



        <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto p-3">
          {CHAT_THEMES.map((t) => {
            const active = t.key === current.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onSelect(t.key)}
                className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-white/40 bg-white/[0.06]"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-slate-100">{t.name}</span>
                  {active && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className="ml-auto h-4 w-16 rounded-full rounded-br-sm"
                    style={{ background: t.bubble }}
                  />
                  <span className="h-4 w-12 rounded-full rounded-bl-sm bg-[#1f1f1f]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
