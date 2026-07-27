import { useEffect, useRef, useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "./VoiceRecorder";
import { GifPicker } from "./GifPicker";
import { notifyPeer } from "@/lib/push.functions";

export function Composer({
  currentUserId,
  conversationId,
  onTyping,
}: {
  currentUserId: string | null;
  conversationId: string;
  onTyping: () => void;
}) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
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

  async function send() {
    if (!currentUserId) return;
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body,
    });
    setBusy(false);
    if (!error) {
      setText("");
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
    });
    setText("");
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    ping();
  }

  async function sendVoice(blob: Blob, durationMs: number) {
    if (!currentUserId) return;
    setBusy(true);
    const path = `${currentUserId}/voice-${crypto.randomUUID()}.webm`;
    const { error: upErr } = await supabase.storage.from("chat-media").upload(path, blob, {
      contentType: blob.type || "audio/webm",
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
    });
    setBusy(false);
    ping();
  }

  async function sendGif(url: string) {
    if (!currentUserId) return;
    setShowGif(false);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: url,
      media_kind: "gif",
    });
    ping();
  }


  return (
    <div className="border-t border-white/5 bg-[#171717] px-4 py-3">
      <div className="relative mx-auto flex w-full items-end gap-2">
        <button
          type="button"
          onClick={() => {
            setShowEmoji((s) => !s);
            setShowGif(false);
          }}
          className="grid h-9 w-9 place-items-center rounded-full text-lg text-slate-300 hover:bg-white/10"
          aria-label="Emoji"
        >
          😊
        </button>
        <button
          type="button"
          onClick={() => {
            setShowGif((s) => !s);
            setShowEmoji(false);
          }}
          className="grid h-9 w-9 place-items-center rounded-full text-[10px] font-bold text-slate-300 hover:bg-white/10"
          aria-label="GIF"
        >
          GIF
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
        {showEmoji && (
          <div className="absolute bottom-14 left-0 z-10">
            <Picker
              data={data}
              theme="dark"
              onEmojiSelect={(e: { native: string }) => {
                setText((t) => t + e.native);
                setShowEmoji(false);
                textareaRef.current?.focus();
              }}
            />
          </div>
        )}
        {showGif && currentUserId && (
          <GifPicker
            customerId={currentUserId}
            onPick={(url) => sendGif(url)}
            onClose={() => setShowGif(false)}
          />
        )}
      </div>
    </div>
  );
}
