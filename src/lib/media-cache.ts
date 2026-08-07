/**
 * Media URL/byte caching for chat attachments.
 *
 * - Signed storage URLs are memoized in memory with their expiry so we don't
 *   ask Supabase for a new signature every time a bubble mounts.
 * - Encrypted payloads are cached in the browser Cache Storage so a reload
 *   doesn't re-download the same bytes (decryption still happens in memory).
 */

const CACHE_NAME = "chat-media-v1";
const SIGNED_TTL_MS = 60 * 60 * 1000;
// Refresh slightly before expiry so an in-flight load never uses a dead URL.
const SIGNED_SAFETY_MS = 5 * 60 * 1000;

type Entry = { url: string; expiresAt: number };

const signedCache = new Map<string, Entry>();
const objectUrlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

export function getCachedSignedUrl(path: string): string | null {
  const hit = signedCache.get(path);
  if (!hit) return null;
  if (hit.expiresAt - SIGNED_SAFETY_MS <= Date.now()) {
    signedCache.delete(path);
    return null;
  }
  return hit.url;
}

export function setCachedSignedUrl(path: string, url: string) {
  signedCache.set(path, { url, expiresAt: Date.now() + SIGNED_TTL_MS });
}

export function getCachedObjectUrl(path: string): string | null {
  return objectUrlCache.get(path) ?? null;
}

export function setCachedObjectUrl(path: string, url: string) {
  objectUrlCache.set(path, url);
}

/** De-dupes concurrent resolutions for the same storage path. */
export function dedupe(path: string, run: () => Promise<string | null>): Promise<string | null> {
  const existing = inflight.get(path);
  if (existing) return existing;
  const p = run().finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

/** Fetches encrypted bytes, serving from Cache Storage when available. */
export async function fetchCachedBytes(
  cacheKey: string,
  signedUrl: string,
  onProgress?: (fraction: number | null) => void,
): Promise<ArrayBuffer> {
  const key = `https://chat-media.local/${encodeURIComponent(cacheKey)}`;
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(key);
      if (hit) {
        onProgress?.(1);
        return await hit.arrayBuffer();
      }
      const buf = await download(signedUrl, onProgress);
      await cache.put(key, new Response(buf.slice(0)));
      return buf;
    } catch {
      /* fall through to a plain fetch */
    }
  }
  return await download(signedUrl, onProgress);
}

/** Streams a response so download progress can be reported when possible. */
async function download(
  url: string,
  onProgress?: (fraction: number | null) => void,
): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`media fetch failed: ${res.status}`);
  const total = Number(res.headers.get("content-length") || 0);
  if (!res.body || !total || !onProgress) {
    onProgress?.(null);
    const buf = await res.arrayBuffer();
    onProgress?.(1);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      onProgress(Math.min(received / total, 1));
    }
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  onProgress(1);
  return out.buffer;
}


/** Drops cached copies of a deleted attachment. */
export async function forgetMedia(paths: string[]) {
  for (const path of paths) {
    signedCache.delete(path);
    const obj = objectUrlCache.get(path);
    if (obj) {
      try {
        URL.revokeObjectURL(obj);
      } catch {
        /* ignore */
      }
      objectUrlCache.delete(path);
    }
    if (typeof caches !== "undefined") {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(`https://chat-media.local/${encodeURIComponent(path)}`);
      } catch {
        /* ignore */
      }
    }
  }
}
