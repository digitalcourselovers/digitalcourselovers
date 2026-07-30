import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lockGate } from "@/lib/gate.functions";

export function QuickExit({ onBeforeExit }: { onBeforeExit?: () => void } = {}) {
  const [going, setGoing] = useState(false);
  const lock = useServerFn(lockGate);

  function exit() {
    // Tear down any active call first (stops camera/mic instantly)
    try {
      onBeforeExit?.();
    } catch {
      /* noop */
    }
    // Immediately hide UI
    setGoing(true);
    // Lock the access-code gate (session stays signed in on this device)
    lock().catch(() => {});
    // Redirect to homepage
    setTimeout(() => window.location.replace("/"), 50);
  }

  return (
    <>
      <button
        onClick={exit}
        aria-label="Quick exit"
        className="shrink-0 whitespace-nowrap rounded-2xl bg-red-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-md transition hover:bg-red-500 active:scale-95 sm:px-5 sm:py-2.5 sm:text-[14px]"
      >
        Quick exit
      </button>
      {going && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-white">
          <div className="text-sm text-slate-500">Loading course…</div>
        </div>
      )}
    </>
  );
}

