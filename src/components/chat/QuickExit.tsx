import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lockGate } from "@/lib/gate.functions";

export function QuickExit() {
  const [going, setGoing] = useState(false);
  const lock = useServerFn(lockGate);

  function exit() {
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
        className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-red-500 active:scale-95 transition sm:px-6 sm:py-3 sm:text-base"
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

