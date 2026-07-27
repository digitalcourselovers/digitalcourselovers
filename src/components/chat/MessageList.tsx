import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  media_path: string | null;
  media_kind: string | null;
  voice_path: string | null;
  voice_duration_ms: number | null;
  reply_to_id: string | null;
  read_at: string | null;
  created_at: string;
};

type Profile = { id: string; display_name: string; avatar_url: string | null };

export function MessageList({
  messages,
  currentUserId,
  profiles,
  onHideMessage,
}: {
  messages: ChatMessage[];
  currentUserId: string | null;
  profiles: Record<string, Profile>;
  onHideMessage?: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);
  const startPress = (id: string) => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      setMenuId(id);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 450);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const [showJump, setShowJump] = useState(false);

  function isNearBottom() {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function scrollToBottom(smooth = true) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  useEffect(() => {
    if (isNearBottom()) scrollToBottom(true);
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowJump(!isNearBottom());
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={scrollRef} className="chat-scroll h-full overflow-y-auto px-3 py-4 sm:px-4">

      <div className="mx-auto flex w-full flex-col gap-2">
        {messages.map((m, i) => {
          const mine = m.sender_id === currentUserId;
          const prev = messages[i - 1];
          const showDay = !prev || dayStr(prev.created_at) !== dayStr(m.created_at);
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-4 flex items-center justify-center">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-400">
                    {friendlyDay(m.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuId(m.id);
                  }}
                  onPointerDown={() => startPress(m.id)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onTouchMove={cancelPress}
                  className={`max-w-[75%] select-none rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                    mine
                      ? "rounded-br-md bg-rose-500 text-white"
                      : "rounded-bl-md bg-[#1f1f1f] text-slate-100"
                  }`}
                >
                  <Bubble msg={m} />
                  <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-rose-100/80" : "text-slate-400"}`}>
                    <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {mine && (
                      <span aria-label={m.read_at ? "read" : "sent"}>
                        {m.read_at ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="mt-20 text-center text-sm text-slate-500">Say something.</div>
        )}
      </div>
      {/* touch profiles so tsc doesn't drop it */}
      <span className="hidden">{Object.keys(profiles).length}</span>
      </div>
      {menuId && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => setMenuId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mb-4 w-[calc(100%-2rem)] max-w-xs overflow-hidden rounded-2xl bg-[#1f1f1f] shadow-2xl ring-1 ring-white/10"
          >
            <button
              type="button"
              onClick={() => {
                const id = menuId;
                setMenuId(null);
                if (id) onHideMessage?.(id);
              }}
              className="block w-full px-4 py-3 text-left text-sm font-medium text-rose-400 hover:bg-white/5"
            >
              Delete for me
            </button>
            <button
              type="button"
              onClick={() => setMenuId(null)}
              className="block w-full border-t border-white/5 px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {showJump && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to latest"
          className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-black/40 transition hover:bg-rose-400"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}


function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.media_kind === "gif" && msg.body) {
    return <img src={msg.body} alt="gif" className="h-40 w-40 rounded-lg object-cover sm:h-44 sm:w-44" />;
  }
  if (msg.media_path) return <MediaBubble path={msg.media_path} kind={msg.media_kind} body={msg.body} />;
  if (msg.voice_path) return <VoiceBubble path={msg.voice_path} durationMs={msg.voice_duration_ms} />;
  return <span className="whitespace-pre-wrap break-words">{msg.body}</span>;
}

function MediaBubble({ path, kind, body }: { path: string; kind: string | null; body: string | null }) {
  const url = useSignedUrl(path);
  if (!url) return <span className="text-xs opacity-70">loading…</span>;
  const isImage = kind?.startsWith("image/");
  const isVideo = kind?.startsWith("video/");
  return (
    <div className="space-y-1">
      {isImage ? (
        <img src={url} alt="attachment" className="max-h-72 rounded-lg" />
      ) : isVideo ? (
        <video src={url} controls className="max-h-72 rounded-lg" />
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="underline">
          Download file
        </a>
      )}
      {body && <div className="whitespace-pre-wrap break-words">{body}</div>}
    </div>
  );
}

function VoiceBubble({ path, durationMs }: { path: string; durationMs: number | null }) {
  const url = useSignedUrl(path);
  if (!url) return <span className="text-xs opacity-70">loading…</span>;
  return (
    <div className="flex items-center gap-2">
      <audio src={url} controls className="h-8 max-w-[220px]" />
      {durationMs != null && <span className="text-[10px] opacity-70">{Math.round(durationMs / 1000)}s</span>}
    </div>
  );
}

function useSignedUrl(path: string) {
  const [url, setUrl] = useState<string | null>(() => signedUrlCache.get(path) ?? null);
  useEffect(() => {
    if (signedUrlCache.has(path)) {
      setUrl(signedUrlCache.get(path)!);
      return;
    }
    let mounted = true;
    supabase.storage
      .from("chat-media")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.signedUrl) {
          signedUrlCache.set(path, data.signedUrl);
          setUrl(data.signedUrl);
        }
      });
    return () => {
      mounted = false;
    };
  }, [path]);
  return url;
}
const signedUrlCache = new Map<string, string>();

function dayStr(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function friendlyDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (dayStr(iso) === dayStr(today.toISOString())) return "Today";
  if (dayStr(iso) === dayStr(yest.toISOString())) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}
