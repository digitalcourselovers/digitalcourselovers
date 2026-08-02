import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { equalGateCode, getGateSession } from "./gate.server";
import {
  checkLimit,
  clearFailures,
  pace,
  pruneOldAttempts,
  recordFailure,
} from "./ratelimit.server";

export const verifyGateCode = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ code: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const wait = await checkLimit("gate");
    if (wait > 0) {
      await pace();
      return { ok: false as const, retryAfter: wait };
    }
    const expected = process.env.SITE_SECRET_CODE;
    if (!expected || !equalGateCode(data.code.trim(), expected)) {
      await recordFailure("gate");
      await pace();
      return { ok: false as const, retryAfter: 0 };
    }
    const session = await getGateSession();
    await session.update({ unlocked: true });
    await clearFailures("gate");
    void pruneOldAttempts();
    return { ok: true as const, retryAfter: 0 };
  });

/**
 * Password sign-in behind the same IP rate limiter. Tokens are returned to the
 * browser, which installs them with supabase.auth.setSession().
 */
export const portalSignIn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const gate = await getGateSession();
    if (!gate.data.unlocked) {
      await pace();
      return { ok: false as const, retryAfter: 0 };
    }
    const wait = await checkLimit("login");
    if (wait > 0) {
      await pace();
      return { ok: false as const, retryAfter: wait };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
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
    await clearFailures("login");
    return {
      ok: true as const,
      retryAfter: 0,
      accessToken: res.session.access_token,
      refreshToken: res.session.refresh_token,
    };
  });


export const isGateUnlocked = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getGateSession();
    return { unlocked: !!session.data.unlocked };
  },
);

export const lockGate = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getGateSession();
  await session.clear();
  return { ok: true as const };
});

// One-time setup: create the two accounts. Only runs while zero profiles exist.
export const setupTwoAccounts = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      code: string;
      a: { email: string; password: string; displayName: string };
      b: { email: string; password: string; displayName: string };
    }) => data,
  )
  .handler(async ({ data }) => {
    const expected = process.env.SITE_SECRET_CODE;
    if (!expected || !equalGateCode(data.code.trim(), expected)) {
      return { ok: false as const, error: "Invalid setup code" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Only allow setup if no profiles exist yet
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      return { ok: false as const, error: "Already set up" };
    }
    for (const p of [data.a, data.b]) {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: p.email,
        password: p.password,
        email_confirm: true,
        user_metadata: { display_name: p.displayName },
      });
      if (error) return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

export const isSetupComplete = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    return { complete: (count ?? 0) >= 2 };
  },
);
