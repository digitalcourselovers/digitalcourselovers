import { useEffect, useRef } from "react";

/**
 * Generates a soft looping ring tone in the browser (no audio asset needed)
 * and vibrates on mobile while active.
 */
export function useRingtone(active: boolean, pattern: "incoming" | "outgoing" = "incoming") {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let stopped = false;

    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();
    ctxRef.current = ctx;
    void ctx.resume().catch(() => {});

    const beep = () => {
      if (stopped || ctx.state === "closed") return;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(pattern === "incoming" ? 0.16 : 0.08, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.7);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(pattern === "incoming" ? 620 : 440, now);
      osc.frequency.setValueAtTime(pattern === "incoming" ? 480 : 440, now + 0.35);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.75);
    };

    beep();
    timerRef.current = window.setInterval(beep, pattern === "incoming" ? 1800 : 2600);

    let vibrateTimer: number | null = null;
    if (pattern === "incoming" && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([400, 300, 400]);
      vibrateTimer = window.setInterval(() => navigator.vibrate([400, 300, 400]), 1800);
    }

    return () => {
      stopped = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (vibrateTimer) window.clearInterval(vibrateTimer);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(0);
      ctx.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [active, pattern]);
}
