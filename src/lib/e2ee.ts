/**
 * End-to-end encryption for chat messages and media.
 *
 * The AES-256-GCM key is derived in the browser from the secret access code
 * with PBKDF2. It is kept in memory and mirrored into sessionStorage so a
 * reload inside the same tab keeps working. The key never leaves the device.
 */

import { useEffect, useState } from "react";

const SALT = "marketminds-e2ee-v1";
const ITERATIONS = 300_000;
const STORE_KEY = "mm.e2ee.k";
export const ENC_PREFIX = "e1:";
export const ENC_FILE_SUFFIX = ".enc";

let cachedKey: CryptoKey | null = null;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function subtle() {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("WebCrypto unavailable");
  }
  return window.crypto.subtle;
}

function b64encode(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64decode(s: string) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importRaw(rawB64: string) {
  return subtle().importKey("raw", b64decode(rawB64) as unknown as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Derive and store the session key from the secret access code. */
export async function unlockWithCode(code: string): Promise<CryptoKey> {
  const material = await subtle().importKey(
    "raw",
    new TextEncoder().encode(code.trim()) as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle().deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(SALT) as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    material,
    256,
  );
  const raw = b64encode(bits);
  cachedRaw = raw;
  cachedKey = await importRaw(raw);
  try {
    window.sessionStorage.setItem(STORE_KEY, raw);
  } catch {
    /* private mode — memory only */
  }
  listeners.forEach((l) => l());
  return cachedKey;
}

export function hasStoredKey() {
  if (cachedKey) return true;
  if (typeof window === "undefined") return false;
  try {
    return !!window.sessionStorage.getItem(STORE_KEY);
  } catch {
    return false;
  }
}

export function clearKey() {
  cachedKey = null;
  cachedRaw = null;
  try {
    window.sessionStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

let pending: Promise<CryptoKey | null> | null = null;

export function getKey(): Promise<CryptoKey | null> {
  if (cachedKey) return Promise.resolve(cachedKey);
  if (typeof window === "undefined") return Promise.resolve(null);
  if (pending) return pending;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(STORE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return Promise.resolve(null);
  pending = importRaw(raw)
    .then((k) => {
      cachedKey = k;
      cachedRaw = raw;
      pending = null;
      return k;
    })
    .catch(() => {
      pending = null;
      return null;
    });
  return pending;
}

/** React hook: the current session key (null while locked/loading). */
export function useE2eeKey() {
  const [key, setKey] = useState<CryptoKey | null>(cachedKey);
  useEffect(() => {
    let mounted = true;
    const sync = () => {
      getKey().then((k) => {
        if (mounted) setKey(k);
      });
    };
    sync();
    listeners.add(sync);
    return () => {
      mounted = false;
      listeners.delete(sync);
    };
  }, []);
  return key;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

export async function encryptText(key: CryptoKey, text: string): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    new TextEncoder().encode(text) as unknown as BufferSource,
  );
  return `${ENC_PREFIX}${b64encode(iv)}:${b64encode(ct)}`;
}

export async function decryptText(key: CryptoKey, payload: string): Promise<string | null> {
  if (!isEncrypted(payload)) return payload;
  const [, ivB64, ctB64] = payload.split(":");
  if (!ivB64 || !ctB64) return null;
  try {
    const pt = await subtle().decrypt(
      { name: "AES-GCM", iv: b64decode(ivB64) as unknown as BufferSource },
      key,
      b64decode(ctB64) as unknown as BufferSource,
    );
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

/** Encrypt a file/blob. Output layout: 12-byte IV followed by ciphertext. */
export async function encryptBlob(key: CryptoKey, blob: Blob): Promise<Blob> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = await blob.arrayBuffer();
  const ct = await subtle().encrypt({ name: "AES-GCM", iv: iv as unknown as BufferSource }, key, data);
  return new Blob([iv as unknown as BlobPart, ct], { type: "application/octet-stream" });
}

export async function decryptToBlob(key: CryptoKey, buf: ArrayBuffer, mime: string): Promise<Blob> {
  const bytes = new Uint8Array(buf);
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const pt = await subtle().decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ct as unknown as BufferSource,
  );
  return new Blob([pt], { type: mime || "application/octet-stream" });
}

export function isEncryptedPath(path: string | null | undefined) {
  return !!path && path.endsWith(ENC_FILE_SUFFIX);
}

/** Unused-var guard for the cached raw value (kept for debugging parity). */
export function keyFingerprint() {
  return cachedRaw ? cachedRaw.slice(0, 6) : null;
}
