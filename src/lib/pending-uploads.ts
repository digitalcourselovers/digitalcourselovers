/**
 * Local-only queue of attachments that are still uploading.
 *
 * Entries live in memory (never in the database) so the sender sees the bubble
 * with a WhatsApp-style progress ring the instant they pick a file. Once the
 * upload finishes the real message row arrives through realtime and the pending
 * entry is dropped.
 */

import { useEffect, useState } from "react";

export type PendingKind = "image" | "video" | "file" | "voice";

export type PendingUpload = {
  id: string;
  kind: PendingKind;
  /** Object URL for the local preview (images/videos only). */
  previewUrl: string | null;
  caption: string | null;
  durationMs: number | null;
  /** 0..1, or null when the size is unknown. */
  progress: number | null;
  status: "uploading" | "error";
  createdAt: string;
  cancel: () => void;
  retry: () => void;
};

let items: PendingUpload[] = [];
const listeners = new Set<() => void>();

function emit() {
  items = [...items];
  listeners.forEach((l) => l());
}

export function addPending(entry: PendingUpload) {
  items.push(entry);
  emit();
}

export function updatePending(id: string, patch: Partial<PendingUpload>) {
  items = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
  emit();
}

export function removePending(id: string) {
  const found = items.find((it) => it.id === id);
  if (found?.previewUrl) {
    try {
      URL.revokeObjectURL(found.previewUrl);
    } catch {
      /* ignore */
    }
  }
  items = items.filter((it) => it.id !== id);
  emit();
}

export function clearPending() {
  for (const it of items) {
    if (it.previewUrl) {
      try {
        URL.revokeObjectURL(it.previewUrl);
      } catch {
        /* ignore */
      }
    }
  }
  items = [];
  emit();
}

export function usePendingUploads() {
  const [list, setList] = useState<PendingUpload[]>(items);
  useEffect(() => {
    const sync = () => setList(items);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return list;
}
