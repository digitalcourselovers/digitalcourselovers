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
export async function fetchCachedBytes(cacheKey: string, signedUrl: string): Promise<ArrayBuffer> {
  const key = `https://chat-media.local/${encodeURIComponent(cacheKey)}`;
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(key);
      if (hit) return await hit.arrayBuffer();
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error(`media fetch failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      await cache.put(key, new Response(buf.slice(0)));
      return buf;
    } catch {
      /* fall through to a plain fetch */
    }
  }
  const res = await fetch(signedUrl);
  if (!res.ok) throw new Error(`media fetch failed: ${res.status}`);
  return await res.arrayBuffer();
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
