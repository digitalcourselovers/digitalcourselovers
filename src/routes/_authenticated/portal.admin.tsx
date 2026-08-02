import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock,
  Globe2,
  Laptop,
  MapPin,
  Monitor,
  Search,
  Signal,
  Smartphone,
  Tablet,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  amIAdmin,
  listActivity,
  listAuthUsers,
  listSessionPageViews,
  listVisitorSessions,
  setUserBanned,
  setUserPassword,
  type ActivityRow,
  type SessionRow,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/portal/admin")({
  head: () => ({
    meta: [
      { title: "Admin — MarketMinds Academy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPanel,
});

/* ---------- helpers ---------- */

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function place(o: { city?: string | null; region?: string | null; country?: string | null }) {
  return [o.city, o.region, o.country].filter(Boolean).join(", ") || "Location pending";
}


function DeviceIcon({ type, className = "h-4 w-4" }: { type: string | null; className?: string }) {
  if (type === "mobile") return <Smartphone className={className} />;
  if (type === "tablet") return <Tablet className={className} />;
  if (type === "desktop") return <Monitor className={className} />;
  return <Laptop className={className} />;
}

function pageLabel(path: string) {
  if (path === "/") return "Home";
  const parts = path.replace(/^\//, "").split("/");
  const last = parts[parts.length - 1] ?? path;
  return last.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/* ---------- shell ---------- */

function AdminPanel() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"activity" | "visitors" | "users">("activity");

  useEffect(() => {
    void checkAdmin()
      .then((r) => setAllowed(r.admin))
      .catch(() => setAllowed(false));
  }, [checkAdmin]);

  useEffect(() => {
    if (allowed === false) navigate({ to: "/" });
  }, [allowed, navigate]);

  // Auto sign-out whenever the admin leaves the console (navigation, tab close
  // or refresh) so the admin session never lingers on the device.
  useEffect(() => {
    const bye = () => {
      void supabase.auth.signOut();
    };
    window.addEventListener("pagehide", bye);
    return () => {
      window.removeEventListener("pagehide", bye);
      bye();
    };
  }, []);

  if (allowed !== true) return <div className="min-h-screen bg-slate-950" />;

  const tabs = [
    { key: "activity" as const, label: "Activity", icon: Activity },
    { key: "visitors" as const, label: "Visitors", icon: Users },
    { key: "users" as const, label: "Accounts", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-500/20 text-indigo-300">
              <Signal className="h-4 w-4" />
            </span>
            Console
          </div>
          <nav className="order-3 flex w-full gap-1 text-sm sm:order-none sm:w-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 transition sm:flex-none ${
                  tab === t.key
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </nav>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/", replace: true });
            }}
            className="ml-auto rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {tab === "activity" && <ActivityTab />}
        {tab === "visitors" && <VisitorsTab />}
        {tab === "users" && <UsersTab />}
      </main>
    </div>
  );
}

/* ---------- activity: who opened which page ---------- */

function ActivityTab() {
  const fetchActivity = useServerFn(listActivity);
  const activity = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => fetchActivity(),
    refetchInterval: 10000,
  });
  const [q, setQ] = useState("");
  const [openSession, setOpenSession] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = activity.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((r) =>
      [r.ip, r.city, r.country, r.isp, r.path, r.os, r.browser]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [activity.data, q]);

  const groups = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    for (const r of rows) {
      const list = map.get(r.sessionId) ?? [];
      list.push(r);
      map.set(r.sessionId, list);
    }
    return [...map.values()].sort(
      (a, b) => new Date(b[0]!.enteredAt).getTime() - new Date(a[0]!.enteredAt).getTime(),
    );
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by IP, city, page, device…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
        />
        {q && (
          <button onClick={() => setQ("")} className="text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {groups.length === 0 && (
        <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-500">
          No activity recorded yet.
        </p>
      )}

      {groups.map((views) => {
        const head = views[0]!;
        return (
          <section
            key={head.sessionId}
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-800 bg-slate-900/70 px-4 py-3">
              <span className="flex items-center gap-1.5 rounded-full bg-slate-800/70 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                <Clock className="h-3 w-3" />
                {fmtTime(head.enteredAt)}
              </span>

              <span className="flex items-center gap-1.5 font-mono text-sm text-slate-200">
                <Wifi className="h-3.5 w-3.5 text-slate-500" />
                {head.ip ?? "IP pending"}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-rose-400" />
                {place(head)}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <DeviceIcon type={head.deviceType} className="h-3.5 w-3.5" />
                {[head.os, head.browser].filter(Boolean).join(" · ") || "Unknown device"}
              </span>
              {head.isp && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Globe2 className="h-3.5 w-3.5" />
                  {head.isp}
                </span>
              )}
              <button
                onClick={() => setOpenSession(head.sessionId)}
                className="ml-auto rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                Full journey
              </button>
            </div>

            <ol className="divide-y divide-slate-800/70">
              {views.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-100">{pageLabel(v.path)}</span>
                    <span className="block truncate font-mono text-[11px] text-slate-500">
                      {v.path}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[11px] text-slate-400">
                    <span className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      {fmtTime(v.enteredAt)}
                    </span>
                  </span>

                </li>
              ))}
            </ol>
          </section>
        );
      })}

      {openSession && (
        <JourneyModal sessionId={openSession} onClose={() => setOpenSession(null)} />
      )}
    </div>
  );
}

function JourneyModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const fetchViews = useServerFn(listSessionPageViews);
  const views = useQuery({
    queryKey: ["admin", "views", sessionId],
    queryFn: () => fetchViews({ data: { sessionId } }),
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Page-by-page journey</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="mt-4 space-y-2 text-sm">
          {(views.data ?? []).map((v, i) => (
            <li
              key={v.id}
              className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
            >
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-800 text-[10px] text-slate-400">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-200">{pageLabel(v.path)}</span>
                <span className="block truncate font-mono text-[11px] text-slate-500">{v.path}</span>
                {v.title && (
                  <span className="block truncate text-[11px] text-slate-600">{v.title}</span>
                )}
              </span>
              <span className="shrink-0 text-right text-[11px] text-slate-400">
                {fmtTime(v.enteredAt)}
              </span>

            </li>
          ))}
        </ol>
        {(views.data ?? []).length === 0 && (
          <p className="mt-4 text-sm text-slate-500">No pages recorded.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- visitors: one card per person ---------- */

function VisitorsTab() {
  const fetchSessions = useServerFn(listVisitorSessions);
  const sessions = useQuery({
    queryKey: ["admin", "sessions"],
    queryFn: () => fetchSessions(),
    refetchInterval: 15000,
  });
  const [open, setOpen] = useState<SessionRow | null>(null);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const all = sessions.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((s) =>
      [s.ip, s.city, s.region, s.country, s.isp, s.os, s.browser, s.currentPath]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [sessions.data, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search visitors by IP or city…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((s) => {
          return (
            <button
              key={s.id}
              onClick={() => setOpen(s)}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-left transition hover:border-slate-700 hover:bg-slate-900"
            >
              <div className="flex items-center gap-2">
                <Wifi className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-mono text-sm text-slate-100">{s.ip ?? "IP pending"}</span>
                <span className="ml-auto text-[11px] text-slate-400">{fmtTime(s.lastSeenAt)}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-rose-400" />
                {place(s)}
              </div>
              {s.isp && <div className="mt-0.5 text-xs text-slate-500">{s.isp}</div>}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <DeviceIcon type={s.deviceType} className="h-3 w-3" />
                  {[s.os, s.browser].filter(Boolean).join(" · ")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  first seen {fmtTime(s.startedAt)}
                </span>
                {s.timezone && <span>{s.timezone}</span>}
              </div>

              <div className="mt-3 rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-xs">
                <span className="text-slate-500">Last page </span>
                <span className="font-mono text-slate-300">{s.currentPath ?? "/"}</span>
              </div>
              <div className="mt-2 truncate text-[11px] text-slate-600">
                Came from {s.referrer ?? "direct visit"}
              </div>
            </button>
          );
        })}
      </div>

      {rows.length === 0 && (
        <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-500">
          No visitors recorded yet.
        </p>
      )}

      {open && <JourneyModal sessionId={open.id} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ---------- accounts ---------- */

function UsersTab() {
  const fetchUsers = useServerFn(listAuthUsers);
  const changePassword = useServerFn(setUserPassword);
  const changeBan = useServerFn(setUserBanned);
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => fetchUsers() });

  const [editing, setEditing] = useState<string | null>(null);
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50">
      <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Accounts</h2>
      {msg && <div className="px-4 pt-3 text-xs text-slate-400">{msg}</div>}
      <ul className="divide-y divide-slate-800">
        {(users.data ?? []).map((u) => (
          <li key={u.id} className="px-4 py-4 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-medium">{u.email}</span>
              {u.isAdmin && (
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                  admin
                </span>
              )}
              {u.banned && (
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
                  disabled
                </span>
              )}
              <span className="ml-auto flex gap-2">
                <button
                  onClick={() => {
                    setEditing(editing === u.id ? null : u.id);
                    setPass("");
                    setMsg(null);
                  }}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Change password
                </button>
                <button
                  onClick={async () => {
                    const res = await changeBan({ data: { userId: u.id, banned: !u.banned } });
                    setMsg(res.ok ? "Updated." : res.error);
                    void users.refetch();
                  }}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  {u.banned ? "Enable" : "Disable"}
                </button>
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {u.displayName ? `${u.displayName} · ` : ""}created {fmtTime(u.createdAt)}
              {u.lastSignInAt ? ` · last sign in ${fmtTime(u.lastSignInAt)}` : ""}
            </div>
            {editing === u.id && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await changePassword({ data: { userId: u.id, password: pass } });
                  setMsg(res.ok ? "Password updated." : res.error);
                  if (res.ok) {
                    setEditing(null);
                    setPass("");
                  }
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  type="text"
                  required
                  minLength={8}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="New password (min 8)"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                />
                <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900">
                  Save
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {(users.data ?? []).length === 0 && (
        <p className="px-4 py-6 text-sm text-slate-500">Loading accounts…</p>
      )}
    </section>
  );
}
