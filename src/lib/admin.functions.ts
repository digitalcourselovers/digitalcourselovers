import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { equalGateCode } from "./gate.server";
import { checkLimit, clearFailures, pace, recordFailure } from "./ratelimit.server";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/** Admin sign-in, rate limited by IP. Returns tokens for supabase.auth.setSession(). */
export const adminSignIn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const wait = await checkLimit("login");
    if (wait > 0) {
      await pace();
      return { ok: false as const, retryAfter: wait };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: res, error } = await client.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error || !res.session) {
      await recordFailure("login");
      await pace();
      return { ok: false as const, retryAfter: 0 };
    }
    // Only admins may use this door.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", res.user!.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      await recordFailure("login");
      await pace();
      return { ok: false as const, retryAfter: 0 };
    }
    await clearFailures("login");
    return {
      ok: true as const,
      retryAfter: 0,
      accessToken: res.session.access_token,
      refreshToken: res.session.refresh_token,
    };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

/** One-time bootstrap: create the admin account, gated by the site access code. */
export const createFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        code: z.string().min(1).max(200),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const expected = process.env["SITE_SECRET_CODE"];
    if (!expected || !equalGateCode(data.code.trim(), expected)) {
      await pace();
      return { ok: false as const, error: "Invalid credentials" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { ok: false as const, error: "Already configured" };

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: "Instructor admin" },
    });
    if (error || !created.user) {
      return { ok: false as const, error: error?.message ?? "Could not create account" };
    }
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    if (roleErr) return { ok: false as const, error: roleErr.message };
    return { ok: true as const, error: "" };
  });

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: !!data };
  });

export type AdminUser = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  lastSeenAt: string | null;
  banned: boolean;
  isAdmin: boolean;
};

export const listAuthUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) throw new Error(error.message);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, display_name, last_seen_at");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const admins = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      displayName: byId.get(u.id)?.display_name ?? (u.user_metadata?.["display_name"] as string) ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      lastSeenAt: byId.get(u.id)?.last_seen_at ?? null,
      banned: !!(u as { banned_until?: string }).banned_until,
      isAdmin: admins.has(u.id),
    }));
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8).max(200) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: "" };
  });

export const setUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), banned: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.banned ? "876000h" : "none",
    } as { ban_duration: string });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: "" };
  });

export type SessionRow = {
  id: string;
  visitorId: string;
  startedAt: string;
  lastSeenAt: string;
  totalSeconds: number;
  pageCount: number;
  currentPath: string | null;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
  timezone: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  screen: string | null;
  language: string | null;
  referrer: string | null;
};

function mapSession(s: Record<string, any>): SessionRow {
  return {
    id: s["id"],
    visitorId: s["visitor_id"],
    startedAt: s["started_at"],
    lastSeenAt: s["last_seen_at"],
    totalSeconds: s["total_seconds"] ?? 0,
    pageCount: s["page_count"] ?? 0,
    currentPath: s["current_path"] ?? null,
    ip: s["ip"] ?? null,
    country: s["country"] ?? null,
    region: s["region"] ?? null,
    city: s["city"] ?? null,
    isp: s["isp"] ?? null,
    timezone: s["timezone"] ?? null,
    browser: s["browser"] ?? null,
    os: s["os"] ?? null,
    deviceType: s["device_type"] ?? null,
    screen: s["screen"] ?? null,
    language: s["language"] ?? null,
    referrer: s["referrer"] ?? null,
  };
}

export const listVisitorSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionRow[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("visitor_sessions")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSession);
  });

export const listSessionPageViews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("page_views")
      .select("id, path, title, entered_at, seconds")
      .eq("session_id", data.sessionId)
      .order("entered_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: Record<string, any>) => ({
      id: r["id"] as string,
      path: r["path"] as string,
      title: (r["title"] as string) ?? null,
      enteredAt: r["entered_at"] as string,
      seconds: (r["seconds"] as number) ?? 0,
    }));
  });

export type ActivityRow = {
  id: string;
  sessionId: string;
  visitorId: string;
  path: string;
  title: string | null;
  enteredAt: string;
  seconds: number;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  isp: string | null;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
  referrer: string | null;
  online: boolean;
};

/** Newest page opens across the site, each stamped with who did it (IP + city). */
export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityRow[]> => {
    await assertAdmin(context);
    const { data: views, error } = await context.supabase
      .from("page_views")
      .select("id, session_id, visitor_id, path, title, entered_at, seconds")
      .order("entered_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const rows = views ?? [];
    const sessionIds = [...new Set(rows.map((r: Record<string, any>) => r["session_id"] as string))];
    const { data: sessions } = sessionIds.length
      ? await context.supabase.from("visitor_sessions").select("*").in("id", sessionIds)
      : { data: [] as Record<string, any>[] };
    const byId = new Map((sessions ?? []).map((s: Record<string, any>) => [s["id"], s]));

    return rows.map((r: Record<string, any>) => {
      const s = byId.get(r["session_id"]) ?? {};
      const lastSeen = s["last_seen_at"] ? new Date(s["last_seen_at"]).getTime() : 0;
      return {
        id: r["id"] as string,
        sessionId: r["session_id"] as string,
        visitorId: r["visitor_id"] as string,
        path: r["path"] as string,
        title: (r["title"] as string) ?? null,
        enteredAt: r["entered_at"] as string,
        seconds: (r["seconds"] as number) ?? 0,
        ip: s["ip"] ?? null,
        city: s["city"] ?? null,
        region: s["region"] ?? null,
        country: s["country"] ?? null,
        isp: s["isp"] ?? null,
        deviceType: s["device_type"] ?? null,
        os: s["os"] ?? null,
        browser: s["browser"] ?? null,
        referrer: s["referrer"] ?? null,
        online: Date.now() - lastSeen < 60_000,
      };
    });
  });

