import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { z } from "zod";

const bodySchema = z.object({
  event: z.enum(["view", "beat", "leave"]).default("view"),
  visitorKey: z.string().min(8).max(64),
  sessionKey: z.string().min(8).max(64),
  path: z.string().max(300).default("/"),
  title: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  language: z.string().max(40).optional(),
  screen: z.string().max(40).optional(),
  timezone: z.string().max(80).optional(),
  // Client-side network lookup (kept as fallback for edge headers).
  ip: z.string().max(60).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  isp: z.string().max(200).optional(),
});

function clientIp(request: Request): string {
  const h = request.headers;
  const candidates = [
    h.get("cf-connecting-ip"),
    h.get("true-client-ip"),
    h.get("x-real-ip"),
    h.get("x-client-ip"),
    h.get("fly-client-ip"),
    h.get("x-vercel-forwarded-for")?.split(",")[0],
    h.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return "unknown";
}

function hashIp(ip: string) {
  return createHash("sha256")
    .update(`${ip}|${process.env["SESSION_SECRET"] ?? "salt"}`)
    .digest("hex")
    .slice(0, 32);
}

function isPrivate(ip: string) {
  return (
    ip === "unknown" ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.")
  );
}

function parseUa(ua: string) {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Other";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";
  const deviceType = /iPad|Tablet/.test(ua)
    ? "tablet"
    : /Mobi|Android|iPhone/.test(ua)
      ? "mobile"
      : "desktop";
  return { browser, os, deviceType };
}

async function lookupGeo(ip: string, request: Request) {
  const fallback = {
    country: request.headers.get("cf-ipcountry") ?? null,
    region: null as string | null,
    city: null as string | null,
    isp: null as string | null,
  };
  if (isPrivate(ip)) return fallback;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return fallback;
    const j = (await res.json()) as Record<string, any>;
    if (!j["success"]) return fallback;
    return {
      country: (j["country"] as string) || fallback.country,
      region: (j["region"] as string) || null,
      city: (j["city"] as string) || null,
      isp: (j["connection"]?.["isp"] as string) || (j["connection"]?.["org"] as string) || null,
    };
  } catch {
    return fallback;
  }
}

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof bodySchema>;
        try {
          const raw = await request.text();
          if (raw.length > 4000) return new Response("too large", { status: 413 });
          parsed = bodySchema.parse(JSON.parse(raw));
        } catch {
          return new Response("bad request", { status: 400 });
        }

        // Never record the private area.
        if (parsed.path.startsWith("/portal") || parsed.path.startsWith("/instructor-signin")) {
          return Response.json({ ok: true });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const now = new Date().toISOString();

          // Visitor
          const { data: visitor } = await supabaseAdmin
            .from("visitors")
            .upsert(
              { visitor_key: parsed.visitorKey, last_seen_at: now },
              { onConflict: "visitor_key" },
            )
            .select("id")
            .single();
          if (!visitor) return Response.json({ ok: false });

          // Session
          const { data: existing } = await supabaseAdmin
            .from("visitor_sessions")
            .select("id, ip, city")
            .eq("session_key", parsed.sessionKey)
            .maybeSingle();

          const headerIp = clientIp(request);
          const resolvedIp = !isPrivate(headerIp) ? headerIp : (parsed.ip ?? null);

          let sessionId = existing?.id;
          if (!sessionId) {
            const ua = request.headers.get("user-agent") ?? "";
            const geo = await lookupGeo(resolvedIp ?? "unknown", request);
            const { browser, os, deviceType } = parseUa(ua);
            const { data: created } = await supabaseAdmin
              .from("visitor_sessions")
              .insert({
                session_key: parsed.sessionKey,
                visitor_id: visitor.id,
                ip_hash: hashIp(resolvedIp ?? "unknown"),
                ip: resolvedIp,
                current_path: parsed.path,
                browser,
                os,
                device_type: deviceType,
                screen: parsed.screen ?? null,
                language: parsed.language ?? null,
                referrer: parsed.referrer ?? null,
                timezone: parsed.timezone ?? null,
                user_agent: ua.slice(0, 400),
                country: geo.country ?? parsed.country ?? null,
                region: geo.region ?? parsed.region ?? null,
                city: geo.city ?? parsed.city ?? null,
                isp: geo.isp ?? parsed.isp ?? null,
              })
              .select("id")
              .single();
            if (!created) return Response.json({ ok: false });
            sessionId = created.id;
          } else if ((!existing?.ip && resolvedIp) || (!existing?.city && parsed.city)) {
            // Backfill details once the client-side lookup arrives.
            await supabaseAdmin
              .from("visitor_sessions")
              .update({
                ...(existing?.ip ? {} : resolvedIp ? { ip: resolvedIp } : {}),
                ...(existing?.city
                  ? {}
                  : {
                      city: parsed.city ?? null,
                      region: parsed.region ?? null,
                      country: parsed.country ?? null,
                      isp: parsed.isp ?? null,
                    }),
              })
              .eq("id", sessionId);
          }

          const { data: pv } = await supabaseAdmin
            .from("page_views")
            .insert({
              session_id: sessionId,
              visitor_id: visitor.id,
              path: parsed.path,
              title: parsed.title ?? null,
            })
            .select("id")
            .single();

          await supabaseAdmin
            .from("visitor_sessions")
            .update({ last_seen_at: now, current_path: parsed.path })
            .eq("id", sessionId);

          return Response.json({ ok: true, pageViewId: pv?.id ?? null });
        } catch {
          return Response.json({ ok: false });
        }
      },
    },
  },
});
