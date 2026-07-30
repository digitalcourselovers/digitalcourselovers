import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteConversationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ conversationId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("conversation_id", data.conversationId);
    if (error) throw new Error(error.message);
    // Call history belongs to the same thread — clear it too.
    await supabaseAdmin.from("calls").delete().eq("conversation_id", data.conversationId);
    return { ok: true, by: context.userId };
  });

export const deleteMessageById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ messageId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("messages").delete().eq("id", data.messageId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
