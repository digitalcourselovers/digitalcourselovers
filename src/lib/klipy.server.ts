type KlipyMediaFile = Record<string, unknown>;

type KlipyApiItem = {
  id: number | string;
  title?: string | null;
  file?: KlipyMediaFile | null;
};

type KlipyApiResponse = {
  result?: boolean;
  data?: { data?: KlipyApiItem[] } | KlipyApiItem[];
};

export type GifSearchInput = {
  q: string;
  customerId: string;
  page: number;
};

export type GifSearchItem = {
  id: string;
  title: string;
  preview: string;
  full: string;
};

const getNestedUrl = (source: unknown, path: string[]): string | null => {
  let current = source;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" && current ? current : null;
};

const firstUrl = (file: KlipyMediaFile, paths: string[][]): string | null => {
  for (const path of paths) {
    const url = getNestedUrl(file, path);
    if (url) return url;
  }
  return null;
};

const normalizeItems = (payload: KlipyApiResponse): KlipyApiItem[] => {
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.data)) return payload.data.data;
  return [];
};

async function fetchKlipy(
  apiKey: string,
  endpoint: "search" | "trending",
  q: string,
  safeCustomer: string,
  page: number,
): Promise<GifSearchItem[]> {
  const params = new URLSearchParams({
    customer_id: safeCustomer,
    page: String(page),
    per_page: "24",
  });
  if (q) params.set("q", q);

  const response = await fetch(
    `https://api.klipy.com/api/v1/${encodeURIComponent(apiKey)}/gifs/${endpoint}?${params}`,
    { headers: { accept: "application/json" } },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("[KLIPY] HTTP", response.status, body.slice(0, 300));
    return [];
  }

  const payload = (await response.json()) as KlipyApiResponse & { errors?: unknown };
  if (payload.result === false) {
    console.error("[KLIPY] Unsuccessful response", JSON.stringify(payload.errors));
    return [];
  }

  const previewPaths = [
    ["md", "webp", "url"],
    ["md", "gif", "url"],
    ["sm", "webp", "url"],
    ["sm", "gif", "url"],
    ["xs", "gif", "url"],
    ["320", "gif", "url"],
    ["240", "gif", "url"],
  ];
  const fullPaths = [
    ["md", "gif", "url"],
    ["hd", "gif", "url"],
    ["sm", "gif", "url"],
    ["md", "webp", "url"],
  ];

  return normalizeItems(payload)
    .map((item) => {
      const file = item.file ?? {};
      const preview = firstUrl(file, previewPaths);
      const full = firstUrl(file, fullPaths) ?? preview;
      return preview && full
        ? { id: String(item.id), title: item.title ?? "GIF", preview, full }
        : null;
    })
    .filter((item): item is GifSearchItem => item !== null);
}

export async function searchKlipyGifs(input: GifSearchInput): Promise<{ items: GifSearchItem[] }> {
  const apiKey = process.env.KLIPY_API_KEY;
  if (!apiKey) throw new Error("KLIPY_API_KEY is not configured");

  const query = input.q.trim();
  const safeCustomer =
    (input.customerId || "anon").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "anon";

  if (query) {
    const items = await fetchKlipy(apiKey, "search", query, safeCustomer, input.page);
    return { items };
  }

  // Empty query: try trending first, fall back to a popular search so the tab is never empty.
  let items = await fetchKlipy(apiKey, "trending", "", safeCustomer, input.page);
  if (items.length === 0) {
    items = await fetchKlipy(apiKey, "search", "funny", safeCustomer, 1);
  }
  return { items };
}