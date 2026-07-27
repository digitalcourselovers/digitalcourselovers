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

export async function searchKlipyGifs(input: GifSearchInput): Promise<{ items: GifSearchItem[] }> {
  const apiKey = process.env.KLIPY_API_KEY;
  if (!apiKey) throw new Error("KLIPY_API_KEY is not configured");

  const endpoint = input.q.trim() ? "search" : "trending";
  const params = new URLSearchParams({
    customer_id: input.customerId,
    page: String(input.page),
    per_page: "24",
  });
  if (input.q.trim()) params.set("q", input.q.trim());

  const response = await fetch(
    `https://api.klipy.com/api/v1/${encodeURIComponent(apiKey)}/gifs/${endpoint}?${params}`,
    { headers: { accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(`KLIPY request failed [${response.status}]: ${await response.text()}`);
  }

  const payload = (await response.json()) as KlipyApiResponse;
  if (payload.result === false) throw new Error("KLIPY returned an unsuccessful response");

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

  const items = normalizeItems(payload)
    .map((item) => {
      const file = item.file ?? {};
      const preview = firstUrl(file, previewPaths);
      const full = firstUrl(file, fullPaths) ?? preview;
      return preview && full
        ? { id: String(item.id), title: item.title ?? "GIF", preview, full }
        : null;
    })
    .filter((item): item is GifSearchItem => item !== null);

  return { items };
}