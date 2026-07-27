import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/klipy";

export const searchGifs = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        q: z.string().optional().default(""),
        customerId: z.string().min(1),
        page: z.number().int().min(1).optional().default(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const klipyKey = process.env.KLIPY_API_KEY;
    if (!lovableKey || !klipyKey) throw new Error("KLIPY not configured");

    const endpoint = data.q.trim() ? "search" : "trending";
    const params = new URLSearchParams({
      customer_id: data.customerId,
      page: String(data.page),
      per_page: "24",
    });
    if (data.q.trim()) params.set("q", data.q.trim());

    const res = await fetch(`${GATEWAY}/gifs/${endpoint}?${params}`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": klipyKey,
      },
    });
    if (!res.ok) throw new Error(`KLIPY ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      result: boolean;
      data?: { data?: Array<{ id: number | string; file?: any; title?: string }> };
    };
    if (!json.result) throw new Error("KLIPY error");
    const items = (json.data?.data ?? []).map((it) => {
      const f = it.file ?? {};
      const preview =
        f?.md?.gif?.url ?? f?.sm?.gif?.url ?? f?.xs?.gif?.url ?? f?.["320"]?.gif?.url ?? f?.["240"]?.gif?.url ?? null;
      const full = f?.hd?.gif?.url ?? f?.md?.gif?.url ?? preview;
      return { id: String(it.id), title: it.title ?? "", preview, full };
    }).filter((x) => x.preview && x.full);
    return { items };
  });
