import { Mic, MicOff, Phone, Video, VideoOff, SwitchCamera } from "lucide-react";

export function CallControls({
  kind,
  muted,
  camOff,
  canSwitch,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onHangup,
}: {
  kind: "voice" | "video";
  muted: boolean;
  camOff: boolean;
  canSwitch: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onHangup: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-5">
      <CircleBtn
        label={muted ? "Unmute" : "Mute"}
        onClick={onToggleMute}
        tone={muted ? "on" : "default"}
      >
        {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </CircleBtn>

      {kind === "video" && (
        <CircleBtn
          label={camOff ? "Turn camera on" : "Turn camera off"}
          onClick={onToggleCamera}
          tone={camOff ? "on" : "default"}
        >
          {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </CircleBtn>
      )}

      {kind === "video" && canSwitch && (
        <CircleBtn label="Switch camera" onClick={onSwitchCamera}>
          <SwitchCamera className="h-5 w-5" />
        </CircleBtn>
      )}

      <button
        type="button"
        onClick={onHangup}
        aria-label="End call"
        className="grid h-14 w-14 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-black/40 transition hover:bg-red-500 active:scale-95"
      >
        <Phone className="h-6 w-6 rotate-[135deg]" />
      </button>
    </div>
  );
}

function CircleBtn({
  children,
  label,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "on";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-12 w-12 place-items-center rounded-full transition active:scale-95 ${
        tone === "on"
          ? "bg-white text-slate-900 hover:bg-slate-200"
          : "bg-white/10 text-slate-100 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}
