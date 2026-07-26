import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

const sessionConfig = () => ({
  password: process.env.SESSION_SECRET!,
  name: "mm-portal",
  maxAge: 60 * 60 * 8, // 8 hours
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
  },
});

function equalHash(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export const verifyGateCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.SITE_SECRET_CODE;
    if (!expected) return { ok: false as const };
    if (!equalHash(data.code.trim(), expected)) {
      return { ok: false as const };
    }
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const isGateUnlocked = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useSession<GateSession>(sessionConfig());
    return { unlocked: !!session.data.unlocked };
  },
);

export const lockGate = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
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
    if (!expected || !equalHash(data.code.trim(), expected)) {
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
