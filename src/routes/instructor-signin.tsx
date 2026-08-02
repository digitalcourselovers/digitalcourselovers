import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, adminSignIn, createFirstAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/instructor-signin")({
  head: () => ({
    meta: [
      { title: "Instructor sign in — MarketMinds Academy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InstructorSignIn,
});

function InstructorSignIn() {
  const navigate = useNavigate();
  const signIn = useServerFn(adminSignIn);
  const exists = useServerFn(adminExists);
  const bootstrap = useServerFn(createFirstAdmin);

  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void exists().then((r) => setMode(r.exists ? "login" : "setup"));
  }, [exists]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (mode === "setup") {
      const res = await bootstrap({ data: { code, email, password } });
      setBusy(false);
      if (!res.ok) {
        setError(res.error || "Invalid credentials");
        return;
      }
      setMode("login");
      setCode("");
      setPassword("");
      setError("Account created. Sign in to continue.");
      return;
    }

    const res = await signIn({ data: { email, password } });
    if (!res.ok) {
      setBusy(false);
      setError(
        res.retryAfter > 0
          ? `Too many attempts. Try again in ${Math.ceil(res.retryAfter / 60)} min.`
          : "Invalid credentials",
      );
      return;
    }
    const { error: err } = await supabase.auth.setSession({
      access_token: res.accessToken,
      refresh_token: res.refreshToken,
    });
    setBusy(false);
    if (err) {
      setError("Invalid credentials");
      return;
    }
    navigate({ to: "/portal/admin" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            M
          </div>
          <span className="font-semibold text-slate-900">Instructor sign in</span>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "setup" && (
            <>
              <p className="text-xs text-slate-500">First-time instructor setup.</p>
              <input
                required
                type="password"
                placeholder="Access token"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </>
          )}
          <input
            required
            type="email"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <input
            required
            type="password"
            placeholder="Password"
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {error && <div className="text-xs text-slate-600">{error}</div>}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {mode === "setup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
