import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "./VoiceRecorder";
import { StickerPicker } from "./StickerPicker";
import { notifyPeer } from "@/lib/push.functions";

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
  const ping = () => {
    notify({ data: { conversationId } }).catch(() => {});
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (replyTarget) textareaRef.current?.focus();
  }, [replyTarget]);

  async function send() {
    if (!currentUserId) return;
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body,
      reply_to_id: replyTarget?.id ?? null,
    });
    setBusy(false);
    if (!error) {
      setText("");
      onClearReply();
      textareaRef.current?.focus();
      ping();
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    setBusy(true);
    const path = `${currentUserId}/${crypto.randomUUID()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file, {
      contentType: file.type,
    });
    if (upErr) {
      setBusy(false);
      alert("Upload failed: " + upErr.message);
      return;
    }
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      media_path: path,
      media_kind: file.type,
      body: text.trim() || null,
      reply_to_id: replyTarget?.id ?? null,
    });
    setText("");
    onClearReply();
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    ping();
  }

  async function sendVoice(blob: Blob, durationMs: number) {
    if (!currentUserId) return;
    setBusy(true);
    const ext = blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${currentUserId}/voice-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-media").upload(path, blob, {
      contentType: blob.type || "audio/wav",
    });
    if (upErr) {
      setBusy(false);
      alert("Voice upload failed");
      return;
    }
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      voice_path: path,
      voice_duration_ms: durationMs,
      reply_to_id: replyTarget?.id ?? null,
    });
    onClearReply();
    setBusy(false);
    ping();
  }

  async function sendGif(url: string) {
    if (!currentUserId) return;
    setShowPicker(false);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: url,
      media_kind: "gif",
      reply_to_id: replyTarget?.id ?? null,
    });
    onClearReply();
    ping();
  }

  return (
    <div className="border-t border-white/5 bg-[#171717] px-4 py-3">
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
          onClick={() => setShowPicker((s) => !s)}
          className="grid h-9 w-9 place-items-center rounded-full text-lg text-slate-300 hover:bg-white/10"
          aria-label="Emoji and GIF"
        >
          😊
        </button>
        <input ref={fileRef} type="file" hidden onChange={onFile} accept="image/*,video/*" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:bg-white/10"
          aria-label="Attach"
        >
          📎
        </button>
        <textarea
          ref={textareaRef}
          value={text}
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
          rows={1}
          placeholder="Message"
          className="max-h-40 flex-1 resize-none rounded-2xl border border-white/10 bg-[#0f0f0f] px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
        />
        {text.trim() ? (
          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white hover:bg-rose-400 disabled:opacity-50"
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
            onEmoji={(e) => {
              setText((t) => t + e);
              textareaRef.current?.focus();
            }}
            onGif={(url) => sendGif(url)}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
