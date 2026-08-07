import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MediaRow = { media_path: string | null; voice_path: string | null };

function collectPaths(rows: MediaRow[] | null): string[] {
  const paths = new Set<string>();
  for (const row of rows ?? []) {
    if (row.media_path) paths.add(row.media_path);
    if (row.voice_path) paths.add(row.voice_path);
  }
  return [...paths];
}

export const deleteConversationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ conversationId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Collect attachments first so the storage objects can be purged too.
    const { data: rows } = await supabaseAdmin
      .from("messages")
      .select("media_path, voice_path")
      .eq("conversation_id", data.conversationId);
    const paths = collectPaths(rows);

    const { error } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("conversation_id", data.conversationId);
    if (error) throw new Error(error.message);

    if (paths.length) {
      const { deleteObjects } = await import("./r2.server");
      await deleteObjects(paths);
    }


    // Call history belongs to the same thread — clear it too.
    await supabaseAdmin.from("calls").delete().eq("conversation_id", data.conversationId);
    return { ok: true, by: context.userId, removedMedia: paths };
  });

export const deleteMessageById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ messageId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("messages")
      .select("media_path, voice_path")
      .eq("id", data.messageId)
      .maybeSingle();
    const paths = collectPaths(row ? [row] : []);

    const { error } = await supabaseAdmin.from("messages").delete().eq("id", data.messageId);
    if (error) throw new Error(error.message);

    if (paths.length) {
      const { deleteObjects } = await import("./r2.server");
      await deleteObjects(paths);
    }
    

    return { ok: true, removedMedia: paths };
  });
