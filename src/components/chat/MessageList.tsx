import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Reply, Copy, Trash2, CornerUpLeft, Pencil, Plus } from "lucide-react";
const EmojiPicker = lazy(() => import("@emoji-mart/react"));
import emojiData from "@emoji-mart/data";
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
  edited_at?: string | null;
  created_at: string;
};

export type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

type Profile = { id: string; display_name: string; avatar_url: string | null };

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

export function MessageList({
  messages,
  currentUserId,
  profiles,
  reactions,
  onReply,
  onDelete,
  onEdit,
  onToggleReaction,
}: {
  messages: ChatMessage[];
  currentUserId: string | null;
  profiles: Record<string, Profile>;
  reactions: Reaction[];
  onReply: (m: ChatMessage) => void;
  onDelete: (m: ChatMessage) => void;
  onEdit: (m: ChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const [showJump, setShowJump] = useState(false);

  // Swipe-to-reply state
  const swipeStateRef = useRef<{ id: string | null; startX: number; startY: number; dx: number; active: boolean }>({
    id: null,
    startX: 0,
    startY: 0,
    dx: 0,
    active: false,
  });
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);

  const messagesById = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    for (const m of messages) map[m.id] = m;
    return map;
  }, [messages]);

  const reactionsByMsg = useMemo(() => {
    const map: Record<string, Reaction[]> = {};
    for (const r of reactions) {
      (map[r.message_id] ||= []).push(r);
    }
    return map;
  }, [reactions]);

  function startPress(id: string) {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      setMenuId(id);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 450);
  }
  function cancelPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

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

  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (!didInitialScroll.current && messages.length > 0) {
      didInitialScroll.current = true;
      // jump instantly to newest on first load
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }
    if (isNearBottom()) scrollToBottom(true);
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowJump(!isNearBottom());
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Swipe handlers on row
  function onRowPointerDown(e: React.PointerEvent, m: ChatMessage) {
    if (e.pointerType === "mouse") return; // desktop uses context menu, not swipe
    swipeStateRef.current = {
      id: m.id,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      active: true,
    };
    startPress(m.id);
  }
  function onRowPointerMove(e: React.PointerEvent, m: ChatMessage) {
    const s = swipeStateRef.current;
    if (!s.active || s.id !== m.id) return;
    const dx = e.clientX - s.startX;
    const dy = Math.abs(e.clientY - s.startY);
    if (Math.abs(dx) > 8 || dy > 8) cancelPress();
    if (dx > 0 && dy < 40) {
      const clamped = Math.min(dx, 80);
      s.dx = clamped;
      setSwipeId(m.id);
      setSwipeDx(clamped);
    }
  }
  function onRowPointerEnd(_e: React.PointerEvent, m: ChatMessage) {
    const s = swipeStateRef.current;
    cancelPress();
    if (s.id === m.id && s.dx > 48) {
      onReply(m);
    }
    swipeStateRef.current = { id: null, startX: 0, startY: 0, dx: 0, active: false };
    setSwipeId(null);
    setSwipeDx(0);
  }

  const activeMenuMsg = menuId ? messagesById[menuId] ?? null : null;

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={scrollRef} className="chat-scroll h-full overflow-y-auto px-3 py-4 sm:px-4">
        <div className="mx-auto flex w-full flex-col gap-2">
          {messages.map((m, i) => {
            const mine = m.sender_id === currentUserId;
            const prev = messages[i - 1];
            const showDay = !prev || dayStr(prev.created_at) !== dayStr(m.created_at);
            const replyTo = m.reply_to_id ? messagesById[m.reply_to_id] : null;
            const rxs = reactionsByMsg[m.id] ?? [];
            const rxGrouped = groupReactions(rxs);
            const dx = swipeId === m.id ? swipeDx : 0;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-4 flex items-center justify-center">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-400">
                      {friendlyDay(m.created_at)}
                    </span>
                  </div>
                )}
                <div className="relative">
                  {/* Reply reveal indicator (mobile swipe) */}
                  {dx > 0 && (
                    <div
                      className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-rose-400"
                      style={{ opacity: Math.min(dx / 60, 1) }}
                    >
                      <CornerUpLeft className="h-5 w-5" />
                    </div>
                  )}
                  <div
                    className={`flex ${mine ? "justify-end" : "justify-start"} transition-transform`}
                    style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuId(m.id);
                    }}
                    onPointerDown={(e) => onRowPointerDown(e, m)}
                    onPointerMove={(e) => onRowPointerMove(e, m)}
                    onPointerUp={(e) => onRowPointerEnd(e, m)}
                    onPointerLeave={(e) => onRowPointerEnd(e, m)}
                    onPointerCancel={(e) => onRowPointerEnd(e, m)}
                  >
                    <div
                      className={`max-w-[75%] select-none rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                        mine
                          ? "rounded-br-md bg-rose-500 text-white"
                          : "rounded-bl-md bg-[#1f1f1f] text-slate-100"
                      }`}
                    >
                      {replyTo && (
                        <div
                          className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-[11px] ${
                            mine
                              ? "border-white/70 bg-white/15 text-rose-50"
                              : "border-rose-400 bg-white/5 text-slate-300"
                          }`}
                        >
                          <div className="font-semibold opacity-90">
                            {profiles[replyTo.sender_id]?.display_name ?? "Message"}
                          </div>
                          <div className="truncate opacity-90">{previewOf(replyTo)}</div>
                        </div>
                      )}
                      <Bubble msg={m} />
                      <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-rose-100/80" : "text-slate-400"}`}>
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {m.edited_at && <span className="italic opacity-80">edited</span>}
                        {mine && (
                          <span aria-label={m.read_at ? "read" : "sent"}>
                            {m.read_at ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                      {rxGrouped.length > 0 && (
                        <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                          {rxGrouped.map((r) => {
                            const mineReact = r.userIds.includes(currentUserId ?? "");
                            return (
                              <button
                                key={r.emoji}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleReaction(m.id, r.emoji);
                                }}
                                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] ${
                                  mineReact
                                    ? "bg-white/25 text-white"
                                    : mine
                                      ? "bg-white/15 text-rose-50"
                                      : "bg-white/10 text-slate-200"
                                }`}
                              >
                                <span>{r.emoji}</span>
                                {r.userIds.length > 1 && <span>{r.userIds.length}</span>}
                              </button>
                            );
                          })}
                        </div>
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
        <span className="hidden">{Object.keys(profiles).length}</span>
      </div>

      {activeMenuMsg && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => {
            setShowEmojiPicker(false);
            setMenuId(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mb-4 w-[calc(100%-2rem)] max-w-xs overflow-hidden rounded-2xl bg-[#1f1f1f] shadow-2xl ring-1 ring-white/10"
          >
            <div className="relative flex items-center justify-around border-b border-white/5 px-2 py-2">
              {QUICK_REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    onToggleReaction(activeMenuMsg.id, e);
                    setMenuId(null);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full text-xl transition hover:bg-white/10 active:scale-95"
                >
                  {e}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                aria-label="More emojis"
                className="grid h-9 w-9 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2">
                  <Suspense fallback={null}>
                    <EmojiPicker
                      data={emojiData}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="none"
                      onEmojiSelect={(em: { native: string }) => {
                        onToggleReaction(activeMenuMsg.id, em.native);
                        setShowEmojiPicker(false);
                        setMenuId(null);
                      }}
                    />
                  </Suspense>
                </div>
              )}
            </div>
            <MenuItem
              icon={<Reply className="h-4 w-4" />}
              label="Reply"
              onClick={() => {
                onReply(activeMenuMsg);
                setMenuId(null);
              }}
            />
            {(activeMenuMsg.body || activeMenuMsg.media_kind === "gif") && (
              <MenuItem
                icon={<Copy className="h-4 w-4" />}
                label="Copy"
                onClick={() => {
                  const t = activeMenuMsg.body ?? "";
                  if (t && navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {});
                  setMenuId(null);
                }}
              />
            )}
            {activeMenuMsg.sender_id === currentUserId &&
              !activeMenuMsg.media_path &&
              !activeMenuMsg.voice_path &&
              activeMenuMsg.media_kind !== "gif" &&
              (activeMenuMsg.body ?? "").trim() && (
                <MenuItem
                  icon={<Pencil className="h-4 w-4" />}
                  label="Edit"
                  onClick={() => {
                    const target = activeMenuMsg;
                    setMenuId(null);
                    onEdit(target);
                  }}
                />
              )}
            <MenuItem
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete"
              danger
              onClick={() => {
                const target = activeMenuMsg;
                setMenuId(null);
                onDelete(target);
              }}
            />
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

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-t border-white/5 px-4 py-3 text-left text-sm hover:bg-white/5 ${
        danger ? "text-rose-400" : "text-slate-200"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function groupReactions(rxs: Reaction[]) {
  const map: Record<string, string[]> = {};
  for (const r of rxs) (map[r.emoji] ||= []).push(r.user_id);
  return Object.entries(map).map(([emoji, userIds]) => ({ emoji, userIds }));
}

function previewOf(m: ChatMessage) {
  if (m.media_kind === "gif") return "GIF";
  if (m.voice_path) return "🎤 Voice message";
  if (m.media_path) return m.media_kind?.startsWith("video/") ? "🎬 Video" : "📷 Photo";
  return m.body ?? "";
}

const URL_RE = /(https?:\/\/[^\s]+)/gi;
function linkify(text: string) {
  const parts = text.split(URL_RE);
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      return (
        <a
          key={i}
          href={p}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
        >
          {p}
        </a>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.media_kind === "gif" && msg.body) {
    return <img src={msg.body} alt="gif" className="h-40 w-40 rounded-lg object-cover sm:h-44 sm:w-44" />;
  }
  if (msg.media_path) return <MediaBubble path={msg.media_path} kind={msg.media_kind} body={msg.body} />;
  if (msg.voice_path) return <VoiceBubble path={msg.voice_path} durationMs={msg.voice_duration_ms} />;
  return <span className="whitespace-pre-wrap break-words">{msg.body ? linkify(msg.body) : null}</span>;
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
      {body && <div className="whitespace-pre-wrap break-words">{linkify(body)}</div>}
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
