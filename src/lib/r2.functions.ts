import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Signed upload target for an encrypted attachment. */
export const createUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        key: z.string().min(3).max(300),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Keys are always namespaced by the uploader's user id.
    if (!data.key.startsWith(`${context.userId}/`) || data.key.includes("..")) {
      throw new Error("Invalid object key");
    }
    const { signPutUrl } = await import("./r2.server");
    return { url: await signPutUrl(data.key), key: data.key };
  });

/** Short-lived read URL for a stored attachment. */
export const createReadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ key: z.string().min(3).max(300) }).parse(data))
  .handler(async ({ data }) => {
    if (data.key.includes("..")) throw new Error("Invalid object key");
    const { r2Configured, signGetUrl } = await import("./r2.server");
    if (!r2Configured()) return { url: null as string | null };
    return { url: await signGetUrl(data.key) };
  });
