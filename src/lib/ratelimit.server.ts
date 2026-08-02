import { createHash } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";

export type LimitKind = "gate" | "login";

const RULES: Record<LimitKind, { max: number; windowMs: number }> = {
  gate: { max: 5, windowMs: 15 * 60 * 1000 },
  login: { max: 8, windowMs: 15 * 60 * 1000 },
};

export function clientIpHash(): string {
  let ip = "unknown";
  try {
    const req = getRequest();
    const h = req?.headers;
    ip =
      h?.get("cf-connecting-ip") ||
      h?.get("x-real-ip") ||
      h?.get("x-forwarded-for")?.split(",")[0].trim() ||
      "unknown";
  } catch {
    ip = "unknown";
  }
  return createHash("sha256")
    .update(`${ip}|${process.env.SESSION_SECRET ?? "salt"}`)
    .digest("hex");
}

/** Constant-ish response delay so failures don't leak timing information. */
export async function pace(ms = 350) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Returns how long the caller must wait, in seconds (0 = allowed).
 * Backoff grows with the number of recent failures beyond the limit.
 */
export async function checkLimit(kind: LimitKind): Promise<number> {
  const rule = RULES[kind];
  const ipHash = clientIpHash();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - rule.windowMs).toISOString();
    const { count } = await supabaseAdmin
      .from("auth_attempts")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind)
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    const fails = count ?? 0;
    if (fails < rule.max) return 0;
    const over = fails - rule.max + 1;
    return Math.min(15 * 60, 30 * Math.pow(2, Math.min(over, 5)));
  } catch {
    return 0;
  }
}

export async function recordFailure(kind: LimitKind) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("auth_attempts").insert({ kind, ip_hash: clientIpHash() });
  } catch {
    /* never block on logging */
  }
}

export async function clearFailures(kind: LimitKind) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("auth_attempts").delete().eq("kind", kind).eq("ip_hash", clientIpHash());
  } catch {
    /* ignore */
  }
}

/** Housekeeping: drop attempt rows older than a day. */
export async function pruneOldAttempts() {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("auth_attempts")
      .delete()
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  } catch {
    /* ignore */
  }
}
