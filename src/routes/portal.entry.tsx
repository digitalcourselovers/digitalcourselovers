import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { unlockWithCode } from "@/lib/e2ee";
import {
  isSetupComplete,
  portalSignIn,
  setupTwoAccounts,
  verifyGateCode,
} from "@/lib/gate.functions";


export const Route = createFileRoute("/portal/entry")({
  head: () => ({
    meta: [
      { title: "Faculty portal — MarketMinds Academy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalEntry,
});

type Step = "code" | "setup" | "login";

function PortalEntry() {
  const navigate = useNavigate();
  const verify = useServerFn(verifyGateCode);
  const checkSetup = useServerFn(isSetupComplete);
  const runSetup = useServerFn(setupTwoAccounts);
  const signIn = useServerFn(portalSignIn);


  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Setup form
  const [nameA, setNameA] = useState("");
  const [emailA, setEmailA] = useState("");
  const [passA, setPassA] = useState("");
  const [nameB, setNameB] = useState("");
  const [emailB, setEmailB] = useState("");
  const [passB, setPassB] = useState("");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await verify({ data: { code } });
    if (!res.ok) {
      setBusy(false);
      setError(
        res.retryAfter > 0
          ? `Too many attempts. Try again in ${Math.ceil(res.retryAfter / 60)} min.`
          : "Invalid credentials",
      );
      return;
    }
    // Derive the end-to-end encryption key locally from the code. It never
    // leaves this device.
    try {
      await unlockWithCode(code);
    } catch {
      setBusy(false);
      setError("This browser does not support secure messaging.");
      return;
    }
    // If a Supabase session already exists on this device AND it belongs to one
    // of the two chat participants, skip login. Otherwise (e.g. an admin
    // session) drop it and ask for credentials.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      const uid = sessionData.session.user.id;
      const { data: member } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", "00000000-0000-0000-0000-000000000001")
        .eq("user_id", uid)
        .maybeSingle();
      if (member) {
        navigate({ to: "/portal/chat" });
        return;
      }
      await supabase.auth.signOut();
    }
    const setup = await checkSetup();
    setBusy(false);
    setStep(setup.complete ? "login" : "setup");
  }


  async function submitSetup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await runSetup({
      data: {
        code,
        a: { displayName: nameA, email: emailA, password: passA },
        b: { displayName: nameB, email: emailB, password: passB },
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStep("login");
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn({ data: { email: loginEmail, password: loginPass } });
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
    navigate({ to: "/portal/chat" });
  }


  useEffect(() => {
    // Preload known state
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">M</div>
          <span className="font-semibold text-slate-900">Faculty portal</span>
        </div>

        {step === "code" && (
          <form onSubmit={submitCode} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Access token</label>
            <input
              type="password"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="••••••••"
            />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <button
              disabled={busy || !code}
              className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Continue
            </button>
          </form>
        )}

        {step === "setup" && (
          <form onSubmit={submitSetup} className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">First-time setup</div>
              <p className="mt-1 text-xs text-slate-500">Create the two accounts. This runs once.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-600">Account A</div>
              <input required placeholder="Display name" value={nameA} onChange={(e) => setNameA(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input required type="email" placeholder="Email" value={emailA} onChange={(e) => setEmailA(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input required type="password" placeholder="Password (min 8)" minLength={8} value={passA} onChange={(e) => setPassA(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-600">Account B</div>
              <input required placeholder="Display name" value={nameB} onChange={(e) => setNameB(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input required type="email" placeholder="Email" value={emailB} onChange={(e) => setEmailB(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input required type="password" placeholder="Password (min 8)" minLength={8} value={passB} onChange={(e) => setPassB(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            <button disabled={busy} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              Create accounts
            </button>
          </form>
        )}

        {step === "login" && (
          <form onSubmit={submitLogin} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Sign in</label>
            <input required type="email" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            <input required type="password" placeholder="Password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <button disabled={busy} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              Enter
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
