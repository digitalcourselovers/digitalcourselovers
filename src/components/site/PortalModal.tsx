import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

type Tab = "student" | "instructor";

export function PortalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("student");
  const [showInstructor, setShowInstructor] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setTab("student");
      setShowInstructor(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Portal access</h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "student" ? "bg-white text-slate-900 shadow" : "text-slate-600"
            }`}
            onClick={() => setTab("student")}
          >
            Student
          </button>
          <button
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "instructor" ? "bg-white text-slate-900 shadow" : "text-slate-600"
            }`}
            onClick={() => setTab("instructor")}
          >
            Instructor
          </button>
        </div>

        {tab === "student" && (
          <div className="mt-5 space-y-3">
            <input
              placeholder="Student ID"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Sign in
            </button>
            <p className="text-center text-xs text-slate-500">
              Enrollment closed for this term.{" "}
              <button
                type="button"
                onClick={() => setShowInstructor(true)}
                className="text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700"
              >
                Instructor sign-in
              </button>
            </p>
          </div>
        )}

        {tab === "instructor" && (
          <div className="mt-5 space-y-3">
            <input
              placeholder="Instructor email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Sign in
            </button>
            <p className="text-center text-xs text-slate-500">
              Contact registrar for support.{" "}
              <button
                type="button"
                onClick={() => setShowInstructor(true)}
                className="text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700"
              >
                Faculty access
              </button>
            </p>
          </div>
        )}

        {showInstructor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4" onClick={() => setShowInstructor(false)}>
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-slate-900">Faculty access</h3>
              <p className="mt-1 text-xs text-slate-500">Enter your access token to continue.</p>
              <button
                onClick={() => {
                  onClose();
                  navigate({ to: "/portal/entry" });
                }}
                className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
