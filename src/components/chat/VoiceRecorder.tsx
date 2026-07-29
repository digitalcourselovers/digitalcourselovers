import { useRef, useState } from "react";

// Encode Float32 PCM chunks into a mono 16-bit WAV Blob.
// WAV is fully decoded on every browser including iOS Safari, and the header
// carries a correct duration so <audio> shows real time (not Infinity/wrong).
function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  let length = 0;
  for (const c of chunks) length += c.length;
  const pcm = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    pcm.set(c, offset);
    offset += c.length;
  }

  // Downsample to 16 kHz to shrink upload
  const targetRate = 16000;
  const ratio = sampleRate / targetRate;
  const outLen = Math.floor(pcm.length / ratio);
  const down = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = Math.floor(i * ratio);
    down[i] = pcm[idx];
  }

  const buffer = new ArrayBuffer(44 + down.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + down.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, down.length * 2, true);

  let o = 44;
  for (let i = 0; i < down.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, down[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function VoiceRecorder({
  onSend,
  disabled,
}: {
  onSend: (blob: Blob, durationMs: number) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  async function start() {
    try {
      cancelledRef.current = false;
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;
      proc.onaudioprocess = (e) => {
        const ch = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(ch));
      };
      source.connect(proc);
      proc.connect(ctx.destination);
      startRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(
        () => setElapsed(Date.now() - startRef.current),
        200,
      );
    } catch {
      alert("Mic permission denied");
    }
  }

  async function finish(cancel: boolean) {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    cancelledRef.current = cancel;
    setRecording(false);

    const durationMs = Date.now() - startRef.current;
    const chunks = chunksRef.current;
    const ctx = ctxRef.current;
    const sampleRate = ctx?.sampleRate ?? 44100;

    // Tear down
    try {
      procRef.current?.disconnect();
      sourceRef.current?.disconnect();
    } catch {
      /* noop */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      await ctx?.close();
    } catch {
      /* noop */
    }
    procRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    chunksRef.current = [];

    if (cancel) return;
    if (!chunks.length || durationMs < 500) return;
    const blob = encodeWav(chunks, sampleRate);
    if (blob.size < 2048) return;
    onSend(blob, durationMs);
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => finish(true)}
          className="grid h-9 w-9 place-items-center rounded-full bg-slate-700 text-white hover:bg-slate-600"
          aria-label="Cancel"
        >
          ✕
        </button>
        <span className="text-xs text-red-400">● {Math.floor(elapsed / 1000)}s</span>
        <button
          type="button"
          onClick={() => finish(false)}
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
