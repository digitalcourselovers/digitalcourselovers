import { useRef, useState } from "react";

export function VoiceRecorder({
  onSend,
  disabled,
}: {
  onSend: (blob: Blob, durationMs: number) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationMs = Date.now() - startRef.current;
        if (blob.size > 500 && durationMs > 500) onSend(blob, durationMs);
      };
      rec.start();
      startRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed(Date.now() - startRef.current), 200);
    } catch {
      alert("Mic permission denied");
    }
  }

  function stop(cancel = false) {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (cancel && recRef.current) {
      const stream = recRef.current.stream;
      chunksRef.current = [];
      recRef.current.stop();
      stream.getTracks().forEach((t) => t.stop());
    } else {
      recRef.current?.stop();
    }
    setRecording(false);
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => stop(true)}
          className="grid h-9 w-9 place-items-center rounded-full bg-slate-700 text-white hover:bg-slate-600"
          aria-label="Cancel"
        >
          ✕
        </button>
        <span className="text-xs text-red-400">● {Math.floor(elapsed / 1000)}s</span>
        <button
          type="button"
          onClick={() => stop(false)}
          className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white hover:bg-rose-400"
          aria-label="Send voice"
        >
          ➤
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:bg-white/10 disabled:opacity-50"
      aria-label="Record voice"
    >
      🎤
    </button>
  );
}
