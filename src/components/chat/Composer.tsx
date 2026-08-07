import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "./VoiceRecorder";
import { StickerPicker } from "./StickerPicker";
import { notifyPeer } from "@/lib/push.functions";
import { createUploadUrl } from "@/lib/r2.functions";
import { ENC_FILE_SUFFIX, encryptBlob, encryptText, useE2eeKey } from "@/lib/e2ee";
import { addPending, removePending, updatePending } from "@/lib/pending-uploads";

class UploadAborted extends Error {}


export type ReplyTarget = {
  id: string;
  senderName: string;
  preview: string;
};

export function Composer({
  currentUserId,
  conversationId,
  onTyping,
  replyTarget,
  onClearReply,
}: {
  currentUserId: string | null;
  conversationId: string;
  onTyping: () => void;
  replyTarget: ReplyTarget | null;
  onClearReply: () => void;
}) {
  const [text, setText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const notify = useServerFn(notifyPeer);
  const getUploadUrl = useServerFn(createUploadUrl);
  const encKey = useE2eeKey();
  const ping = () => {
    notify({ data: { conversationId } }).catch(() => {});
  };

  /**
   * Uploads encrypted bytes straight to Cloudflare R2 via a signed URL.
   * Uses XHR so real byte progress is reported and the transfer can be aborted.
   */
  async function putToR2(
    path: string,
    sealed: Blob,
    onProgress?: (fraction: number | null) => void,
    registerAbort?: (abort: () => void) => void,
  ) {
    const { url } = await getUploadUrl({ data: { key: path } });
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      registerAbort?.(() => xhr.abort());
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        onProgress?.(e.lengthComputable ? e.loaded / e.total : null);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`R2 upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("R2 upload failed"));
      xhr.onabort = () => reject(new UploadAborted());
      xhr.send(sealed);
    });
  }



  useEffect(() => {
    if (replyTarget) textareaRef.current?.focus();
  }, [replyTarget]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  useEffect(() => {
    autoGrow();
  }, [text]);

  function clearEditor() {
    setText("");
    const el = textareaRef.current;
    if (el) {
      el.value = "";
      el.style.height = "auto";
    }
  }

  function requireKey() {
    if (!encKey) {
      alert("Secure session expired. Re-enter your access code to continue.");
      return null;
    }
    return encKey;
  }

  async function send() {
    if (!currentUserId) return;
    const body = text.trim();
    if (!body) return;
    const key = requireKey();
    if (!key) return;
    // Clear immediately so the field empties without waiting on the network,
    // and never re-focus afterwards (that is what made the keyboard flicker).
    clearEditor();
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: await encryptText(key, body),
      reply_to_id: replyTarget?.id ?? null,
    });
    setBusy(false);
    if (error) {
      setText(body);
      return;
    }
    onClearReply();
    ping();
  }

  async function uploadAndSend(file: File) {
    if (!currentUserId) return;
    const key = requireKey();
    if (!key) return;
    const caption = text.trim();
    const replyId = replyTarget?.id ?? null;
    // Show the bubble immediately, then clear the editor like WhatsApp does.
    clearEditor();
    onClearReply();

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const pendingId = crypto.randomUUID();
    const previewUrl = isImage || isVideo ? URL.createObjectURL(file) : null;
    let abort: (() => void) | null = null;

    const run = async () => {
      updatePending(pendingId, { status: "uploading", progress: 0 });
      const safeName = (file.name || `paste-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${currentUserId}/${crypto.randomUUID()}-${safeName}${ENC_FILE_SUFFIX}`;
      try {
        const sealed = await encryptBlob(key, file);
        await putToR2(
          path,
          sealed,
          (p) => updatePending(pendingId, { progress: p }),
          (a) => {
            abort = a;
          },
        );
      } catch (e) {
        if (e instanceof UploadAborted) return;
        updatePending(pendingId, { status: "error", progress: null });
        return;
      }
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        media_path: path,
        media_kind: file.type,
        body: caption ? await encryptText(key, caption) : null,
        reply_to_id: replyId,
      });
      if (error) {
        updatePending(pendingId, { status: "error", progress: null });
        return;
      }
      removePending(pendingId);
      ping();
    };

    addPending({
      id: pendingId,
      kind: isImage ? "image" : isVideo ? "video" : "file",
      previewUrl,
      caption: caption || null,
      durationMs: null,
      progress: 0,
      status: "uploading",
      createdAt: new Date().toISOString(),
      cancel: () => {
        abort?.();
        removePending(pendingId);
      },
      retry: () => {
        void run();
      },
    });

    await run();
  }


  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndSend(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Pasted image/video (e.g. long-press a GIF in the keyboard → Copy, or a screenshot). */
  async function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const dt = e.clipboardData;
    if (!dt) return;
    const files = Array.from(dt.files ?? []).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );
    if (files.length === 0) return;
    e.preventDefault();
    for (const f of files) await uploadAndSend(f);
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    const next = text + emoji;
    setText(next);
    if (el) {
      el.value = next;
      el.focus();
      el.setSelectionRange(next.length, next.length);
    }
  }

  async function sendVoice(blob: Blob, durationMs: number) {
    if (!currentUserId) return;
    const key = requireKey();
    if (!key) return;
    const replyId = replyTarget?.id ?? null;
    onClearReply();
    const pendingId = crypto.randomUUID();
    let abort: (() => void) | null = null;

    const run = async () => {
      updatePending(pendingId, { status: "uploading", progress: 0 });
      const ext = blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") ? "mp4" : "webm";
      const path = `${currentUserId}/voice-${crypto.randomUUID()}.${ext}${ENC_FILE_SUFFIX}`;
      try {
        const sealed = await encryptBlob(key, blob);
        await putToR2(
          path,
          sealed,
          (p) => updatePending(pendingId, { progress: p }),
          (a) => {
            abort = a;
          },
        );
      } catch (e) {
        if (e instanceof UploadAborted) return;
        updatePending(pendingId, { status: "error", progress: null });
        return;
      }
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        voice_path: path,
        voice_duration_ms: durationMs,
        media_kind: blob.type || "audio/wav",
        reply_to_id: replyId,
      });
      if (error) {
        updatePending(pendingId, { status: "error", progress: null });
        return;
      }
      removePending(pendingId);
      ping();
    };

    addPending({
      id: pendingId,
      kind: "voice",
      previewUrl: null,
      caption: null,
      durationMs,
      progress: 0,
      status: "uploading",
      createdAt: new Date().toISOString(),
      cancel: () => {
        abort?.();
        removePending(pendingId);
      },
      retry: () => {
        void run();
      },
    });

    await run();

  }

  async function sendGif(url: string) {
    if (!currentUserId) return;
    const key = requireKey();
    if (!key) return;
    setShowPicker(false);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: await encryptText(key, url),
      media_kind: "gif",
      reply_to_id: replyTarget?.id ?? null,
    });

    onClearReply();
    ping();
  }

  return (
    <div className="shrink-0 border-t border-white/5 bg-[#171717] px-4 py-3">
      {replyTarget && (
        <div className="mx-auto mb-2 flex w-full items-start gap-2 rounded-lg border-l-2 border-rose-400 bg-white/5 px-3 py-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-rose-300">
              Replying to {replyTarget.senderName}
            </div>
            <div className="truncate text-xs text-slate-300">{replyTarget.preview}</div>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            aria-label="Cancel reply"
            className="rounded p-1 text-slate-400 hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="relative mx-auto flex w-full items-end gap-2">
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPicker((s) => !s)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-slate-300 hover:bg-white/10"
          aria-label="Emoji and GIF"
        >
          😊
        </button>
        <input ref={fileRef} type="file" hidden onChange={onFile} accept="image/*,video/*" />
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-300 hover:bg-white/10"
          aria-label="Attach"
        >
          📎
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          placeholder="Message"
          aria-label="Message"
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          onPaste={onPaste}
          className="chat-scroll max-h-36 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-white/10 bg-[#0f0f0f] px-4 py-2.5 text-[15px] leading-6 text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
        />
        {text.trim() || busy ? (
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={send}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500 text-white hover:bg-rose-400"
            aria-label="Send"
          >
            ➤
          </button>
        ) : (
          <VoiceRecorder onSend={sendVoice} disabled={busy} />
        )}
        {showPicker && currentUserId && (
          <StickerPicker
            customerId={currentUserId}
            onEmoji={(e) => insertEmoji(e)}
            onGif={(url) => sendGif(url)}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
