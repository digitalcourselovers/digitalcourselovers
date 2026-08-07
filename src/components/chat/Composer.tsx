import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "./VoiceRecorder";
import { StickerPicker } from "./StickerPicker";
import { notifyPeer } from "@/lib/push.functions";
import { createUploadUrl } from "@/lib/r2.functions";
import { ENC_FILE_SUFFIX, encryptBlob, encryptText, useE2eeKey } from "@/lib/e2ee";

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

  /** Uploads encrypted bytes straight to Cloudflare R2 via a signed URL. */
  async function putToR2(path: string, sealed: Blob) {
    const { url } = await getUploadUrl({ data: { key: path } });
    const res = await fetch(url, {
      method: "PUT",
      body: sealed,
      headers: { "Content-Type": "application/octet-stream" },
    });
    if (!res.ok) throw new Error(`R2 upload failed (${res.status})`);
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
    setBusy(true);
    const safeName = (file.name || `paste-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${currentUserId}/${crypto.randomUUID()}-${safeName}${ENC_FILE_SUFFIX}`;
    const sealed = await encryptBlob(key, file);
    try {
      await putToR2(path, sealed);
    } catch (e) {
      setBusy(false);
      alert("Upload failed: " + (e as Error).message);
      return;
    }
    const caption = text.trim();
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      media_path: path,
      media_kind: file.type,
      body: caption ? await encryptText(key, caption) : null,
      reply_to_id: replyTarget?.id ?? null,
    });
    clearEditor();
    onClearReply();
    setBusy(false);
    ping();
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
    setBusy(true);
    const ext = blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${currentUserId}/voice-${crypto.randomUUID()}.${ext}${ENC_FILE_SUFFIX}`;
    const sealed = await encryptBlob(key, blob);
    try {
      await putToR2(path, sealed);
    } catch {
      setBusy(false);
      alert("Voice upload failed");
      return;
    }
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      voice_path: path,
      voice_duration_ms: durationMs,
      media_kind: blob.type || "audio/wav",
      reply_to_id: replyTarget?.id ?? null,
    });
    onClearReply();
    setBusy(false);
    ping();
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
