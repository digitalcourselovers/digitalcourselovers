import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const pingPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { GF_EMAIL, PARTNER_PING_TEXT, sendTelegramMessage, throttled } = await import(
      "@/lib/telegram.server"
    );

    // Never trust the client: verify the caller's own identity server-side.
    const { data, error } = await context.supabase.auth.getUser();
    const email = data?.user?.email?.toLowerCase() ?? "";
    if (error || email !== GF_EMAIL) {
      return { ok: false as const, reason: "not_allowed" as const };
    }

    if (throttled(context.userId)) {
      return { ok: false as const, reason: "throttled" as const };
    }

    const sent = await sendTelegramMessage(PARTNER_PING_TEXT);
    return sent ? { ok: true as const } : { ok: false as const, reason: "failed" as const };
  });
