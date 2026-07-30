import { useEffect, useRef, useState } from "react";
import { MicOff } from "lucide-react";
import type { CallState } from "@/lib/webrtc/useCall";
import { CallControls } from "./CallControls";
import { IncomingCall } from "./IncomingCall";
import { useRingtone } from "./useRingtone";

export function CallOverlay({
  state,
  localStream,
  remoteStream,
  hasMultipleCameras,
  peerName,
  peerInitial,
  gradient,
  onAccept,
  onDecline,
  onHangup,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onClearError,
}: {
  state: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  hasMultipleCameras: boolean;
  peerName: string;
  peerInitial: string;
  gradient: string;
  onAccept: () => void;
  onDecline: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onClearError: () => void;
}) {
  if (state.error) {
    return (
      <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 px-6">
        <div className="w-full max-w-xs rounded-2xl bg-[#1f1f1f] p-5 text-center ring-1 ring-white/10">
          <div className="text-sm text-slate-200">{state.error}</div>
          <button
            type="button"
            onClick={onClearError}
            className="mt-4 w-full rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === "idle") return null;

  if (state.phase === "incoming") {
    return (
      <IncomingCall
        peerName={peerName}
        peerInitial={peerInitial}
        gradient={gradient}
        kind={state.kind}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    );
  }

  return (
    <ActiveCall
      state={state}
      localStream={localStream}
      remoteStream={remoteStream}
      hasMultipleCameras={hasMultipleCameras}
      peerName={peerName}
      peerInitial={peerInitial}
      gradient={gradient}
      onHangup={onHangup}
      onToggleMute={onToggleMute}
      onToggleCamera={onToggleCamera}
      onSwitchCamera={onSwitchCamera}
    />
  );
}

function ActiveCall({
  state,
  localStream,
  remoteStream,
  hasMultipleCameras,
  peerName,
  peerInitial,
  gradient,
  onHangup,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
}: {
  state: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  hasMultipleCameras: boolean;
  peerName: string;
  peerInitial: string;
  gradient: string;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useRingtone(state.phase === "outgoing", "outgoing");

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      void localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      void remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      void remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!state.answeredAt) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - state.answeredAt!) / 1000)));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [state.answeredAt]);

  const isVideo = state.kind === "video";
  const showRemoteVideo = isVideo && !!remoteStream && remoteStream.getVideoTracks().length > 0;
  const statusLine =
    state.phase === "outgoing"
      ? state.status || "Ringing…"
      : state.reconnecting
        ? "Reconnecting…"
        : state.answeredAt
          ? formatDuration(elapsed)
          : state.status || "Connecting…";

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#0a0a0a] text-slate-100">
      {/* remote audio always mounted so voice calls have sound */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="relative flex-1 overflow-hidden">
        {showRemoteVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full bg-black object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-5">
            <div
              className={`grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br ${gradient} text-4xl font-bold text-white shadow-2xl`}
            >
              {peerInitial}
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold tracking-tight">{peerName}</div>
              <div className="mt-1 text-sm text-slate-400">{statusLine}</div>
            </div>
          </div>
        )}

        {/* top status strip */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{peerName}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  state.reconnecting
                    ? "bg-amber-400"
                    : state.answeredAt
                      ? "bg-emerald-400"
                      : "bg-slate-400"
                }`}
              />
              <span>{statusLine}</span>
              {state.muted && <MicOff className="h-3 w-3 text-rose-300" />}
            </div>
          </div>
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
            {isVideo ? "Video" : "Voice"}
          </span>
        </div>

        {/* local preview */}
        {isVideo && localStream && (
          <div className="absolute bottom-4 right-4 h-40 w-28 overflow-hidden rounded-xl bg-black ring-1 ring-white/15 sm:h-48 sm:w-32">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${state.camOff ? "opacity-0" : ""}`}
            />
            {state.camOff && (
              <div className="absolute inset-0 grid place-items-center text-[11px] text-slate-400">
                Camera off
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/5 bg-[#111] px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <CallControls
          kind={state.kind}
          muted={state.muted}
          camOff={state.camOff}
          canSwitch={hasMultipleCameras}
          onToggleMute={onToggleMute}
          onToggleCamera={onToggleCamera}
          onSwitchCamera={onSwitchCamera}
          onHangup={onHangup}
        />
      </div>
    </div>
  );
}

function formatDuration(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
