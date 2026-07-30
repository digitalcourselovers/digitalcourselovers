import { Phone, PhoneOff, Video } from "lucide-react";
import { useRingtone } from "./useRingtone";

export function IncomingCall({
  peerName,
  peerInitial,
  gradient,
  kind,
  onAccept,
  onDecline,
}: {
  peerName: string;
  peerInitial: string;
  gradient: string;
  kind: "voice" | "video";
  onAccept: () => void;
  onDecline: () => void;
}) {
  useRingtone(true, "incoming");

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-between bg-[#0a0a0a] px-6 py-14 text-slate-100">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <div
          className={`grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br ${gradient} text-4xl font-bold text-white shadow-2xl`}
        >
          {peerInitial}
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold tracking-tight">{peerName}</div>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-400">
            {kind === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            <span>Incoming {kind === "video" ? "video" : "voice"} call</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="flex w-full max-w-xs items-center justify-between">
        <button
          type="button"
          onClick={onDecline}
          aria-label="Decline call"
          className="flex flex-col items-center gap-2"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-500 active:scale-95">
            <PhoneOff className="h-7 w-7" />
          </span>
          <span className="text-xs text-slate-400">Decline</span>
        </button>
        <button
          type="button"
          onClick={onAccept}
          aria-label="Accept call"
          className="flex flex-col items-center gap-2"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-400 active:scale-95">
            {kind === "video" ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
          </span>
          <span className="text-xs text-slate-400">Accept</span>
        </button>
      </div>
    </div>
  );
}
