import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SendInput = { conversationId: string };

export const notifyPeer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendInput) => {
    if (!input || typeof input.conversationId !== "string") throw new Error("bad input");
    return input;
  })
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");

    // Find peer subscriptions (everyone except the sender).
    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .neq("user_id", context.userId);
    if (error) throw error;
    if (!subs || subs.length === 0) return { sent: 0 };

    const vapid = {
      subject: process.env.VAPID_SUBJECT || "mailto:notify@marketminds.academy",
      publicKey: process.env.VAPID_PUBLIC_KEY!,
      privateKey: process.env.VAPID_PRIVATE_KEY!,
    };

    const payload = {
      data: {
        title: "MarketMinds Academy",
        body: "New course update available",
      },
      options: { ttl: 60, urgency: "high" as const },
    };

    let sent = 0;
    const staleIds: string[] = [];

    await Promise.all(
      subs.map(async (s) => {
        const subscription = {
          endpoint: s.endpoint,
          expirationTime: null,
          keys: { p256dh: s.p256dh!, auth: s.auth! },
        };
        try {
          const req = await buildPushPayload(payload, subscription, vapid);
          const res = await fetch(s.endpoint, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.body.buffer.slice(
              req.body.byteOffset,
              req.body.byteOffset + req.body.byteLength,
            ) as ArrayBuffer,
          });
          if (res.status === 404 || res.status === 410) {
            staleIds.push(s.id);
          } else if (res.ok || res.status === 201 || res.status === 202) {
            sent++;
          } else {
            console.warn("[push] provider responded", res.status, await res.text().catch(() => ""));
          }
        } catch (err) {
          console.warn("[push] send failed", err);
        }
      }),
    );

    if (staleIds.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", staleIds);
    }
    return { sent, cleaned: staleIds.length };
  });
