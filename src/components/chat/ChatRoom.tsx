import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lockGate } from "@/lib/gate.functions";
import { deleteConversationMessages, deleteMessageById } from "@/lib/messages.functions";
import { QuickExit } from "./QuickExit";
import { MessageList, type ChatMessage, type Reaction } from "./MessageList";
import { Composer, type ReplyTarget } from "./Composer";
import { ChatList } from "./ChatList";
import { subscribeToPush } from "@/lib/push-client";

const CONVERSATION_ID = "00000000-0000-0000-0000-000000000001";

type Profile = { id: string; display_name: string; avatar_url: string | null; last_seen_at?: string | null };

function formatLastSeen(iso: string | null): string {
  if (!iso) return "last seen recently";
  const date = new Date(iso);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `last seen at ${hh}:${mm}`;
}

export function ChatRoom() {
  const lock = useServerFn(lockGate);
  const deleteAll = useServerFn(deleteConversationMessages);
  const deleteOne = useServerFn(deleteMessageById);

  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [ready, setReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data.user ?? null);

      async function loadMessages(retry = 0): Promise<ChatMessage[]> {
        const { data: msgs, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", CONVERSATION_ID)
          .order("created_at", { ascending: true })
          .limit(500);
        if (error) {
          if (retry < 2) {
            await supabase.auth.refreshSession().catch(() => {});
            await new Promise((r) => setTimeout(r, 400));
            return loadMessages(retry + 1);
          }
          return [];
        }
        return (msgs ?? []) as ChatMessage[];
      }

      const [{ data: profs }, msgs, { data: rx }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, last_seen_at"),
        loadMessages(),
        supabase.from("message_reactions").select("id, message_id, user_id, emoji"),
      ]);
      if (!mounted) return;
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p) => (map[p.id] = p as Profile));
      setProfiles(map);
      const peer = (profs ?? []).find((p) => p.id !== data.user?.id) as Profile | undefined;
      if (peer?.last_seen_at) setPeerLastSeen(peer.last_seen_at);
      setMessages(msgs);
      setReactions((rx ?? []) as Reaction[]);
      setReady(true);

      if (data.user) {
        subscribeToPush(data.user.id).catch(() => {});
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function autoExit() {
      lock().catch(() => {});
      window.location.replace("/");
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") autoExit();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", autoExit);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", autoExit);
    };
  }, [lock]);

  useEffect(() => {
    const t = window.setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    const beat = () => {
      supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id)
        .then(() => {});
    };
    beat();
    const t = window.setInterval(beat, 30_000);
    return () => window.clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`room:${CONVERSATION_ID}`, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${CONVERSATION_ID}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as ChatMessage;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${CONVERSATION_ID}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${CONVERSATION_ID}` },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (!oldId) {
            // Full clear or missing id: refetch
            supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", CONVERSATION_ID)
              .order("created_at", { ascending: true })
              .limit(500)
              .then(({ data }) => setMessages((data ?? []) as ChatMessage[]));
            return;
          }
          setMessages((prev) => prev.filter((x) => x.id !== oldId));
          setReactions((prev) => prev.filter((r) => r.message_id !== oldId));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const r = payload.new as Reaction;
          setReactions((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (!oldId) {
            supabase
              .from("message_reactions")
              .select("id, message_id, user_id, emoji")
              .then(({ data }) => setReactions((data ?? []) as Reaction[]));
            return;
          }
          setReactions((prev) => prev.filter((r) => r.id !== oldId));
        },
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId && payload.payload.userId !== user.id) {
          setPeerTyping(true);
          window.clearTimeout((channel as any)._typingTimer);
          (channel as any)._typingTimer = window.setTimeout(() => setPeerTyping(false), 2500);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, Array<{ userId?: string }>>;
        const others = Object.keys(state).filter((k) => k !== user.id);
        setPeerOnline(others.length > 0);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (key !== user.id) setPeerOnline(true);
      })
      .on("presence", { event: "leave" }, async ({ key }) => {
        if (key === user.id) return;
        setPeerOnline(false);
        const { data } = await supabase
          .from("profiles")
          .select("last_seen_at")
          .eq("id", key)
          .maybeSingle();
        if (data?.last_seen_at) setPeerLastSeen(data.last_seen_at);
        else setPeerLastSeen(new Date().toISOString());
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: user.id, lastSeen: new Date().toISOString() });
        }
      });

    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", CONVERSATION_ID)
      .neq("sender_id", user.id)
      .is("read_at", null)
      .then(() => {});

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (!user || messages.length === 0) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at);
    if (unread.length === 0) return;
    const ids = unread.map((m) => m.id);
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .then(() => {});
  }, [messages, user]);

  const email = user?.email ?? "";
  const assistantName = email.startsWith("bf@") ? "GPT Assistant" : "Gemini Assistant";
  const assistantInitial = email.startsWith("bf@") ? "G" : "G";
  const gradient = email.startsWith("bf@")
    ? "from-emerald-400 to-teal-500"
    : "from-blue-400 via-purple-500 to-pink-500";

  const lastMsg = messages[messages.length - 1];
  const lastMessagePreview = lastMsg
    ? lastMsg.voice_path
      ? "🎤 Voice message"
      : lastMsg.media_path
        ? lastMsg.media_kind?.startsWith("video/")
          ? "🎬 Video"
          : "📷 Photo"
        : (lastMsg.body ?? "")
    : "Say hi 👋";
  const lastMessageTime = lastMsg
    ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const unreadCount = user
    ? messages.filter((m) => m.sender_id !== user.id && !m.read_at).length
    : 0;

  async function onClearChat() {
    if (typeof window === "undefined") return;
    if (!window.confirm("Delete the entire chat for both of you? This cannot be undone.")) return;
    try {
      await deleteAll({ data: { conversationId: CONVERSATION_ID } });
      setMessages([]);
      setReactions([]);
    } catch (e) {
      console.error(e);
      alert("Failed to delete chat. Try again.");
    }
  }

  async function onDeleteMessage(m: ChatMessage) {
    if (typeof window === "undefined") return;
    if (!window.confirm("Delete this message for everyone?")) return;
    // Optimistic remove
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    setReactions((prev) => prev.filter((r) => r.message_id !== m.id));
    try {
      if (user && m.sender_id === user.id) {
        const { error } = await supabase.from("messages").delete().eq("id", m.id);
        if (error) throw error;
      } else {
        await deleteOne({ data: { messageId: m.id } });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete message.");
    }
  }

  function onReply(m: ChatMessage) {
    const senderName = profiles[m.sender_id]?.display_name ?? "Message";
    let preview = "";
    if (m.media_kind === "gif") preview = "GIF";
    else if (m.voice_path) preview = "🎤 Voice message";
    else if (m.media_path) preview = m.media_kind?.startsWith("video/") ? "🎬 Video" : "📷 Photo";
    else preview = m.body ?? "";
    setReplyTarget({ id: m.id, senderName, preview });
  }

  async function onEditMessage(m: ChatMessage) {
    if (typeof window === "undefined" || !user) return;
    if (m.sender_id !== user.id) return;
    if (m.media_path || m.voice_path || m.media_kind === "gif") return;
    const next = window.prompt("Edit message", m.body ?? "");
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === (m.body ?? "")) return;
    const nowIso = new Date().toISOString();
    setMessages((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, body: trimmed, edited_at: nowIso } : x)),
    );
    const { error } = await supabase
      .from("messages")
      .update({ body: trimmed, edited_at: nowIso })
      .eq("id", m.id);
    if (error) {
      console.error(error);
      alert("Failed to edit message.");
    }
  }



  async function onToggleReaction(messageId: string, emoji: string) {
    if (!user) return;
    const existing = reactions.find(
      (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji,
    );
    if (existing) {
      setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      const optimistic: Reaction = {
        id: `tmp-${crypto.randomUUID()}`,
        message_id: messageId,
        user_id: user.id,
        emoji,
      };
      setReactions((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select("id, message_id, user_id, emoji")
        .single();
      if (error) {
        setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
      } else if (data) {
        setReactions((prev) => prev.map((r) => (r.id === optimistic.id ? (data as Reaction) : r)));
      }
    }
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#0a0a0a] text-slate-100">
      {!ready && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a]" aria-hidden="true" />
      )}
      <ChatList
        peerName={assistantName}
        peerInitial={assistantInitial}
        gradient={gradient}
        peerOnline={peerOnline}
        lastMessagePreview={lastMessagePreview}
        lastMessageTime={lastMessageTime}
        unreadCount={unreadCount}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col bg-[#0f0f0f]">
        <header className="flex items-center justify-between border-b border-white/5 bg-[#171717] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow`}>
              {assistantInitial}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">{assistantName}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                {peerTyping ? (
                  <span className="text-rose-300">typing…</span>
                ) : peerOnline ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Online</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    <span className="truncate">{formatLastSeen(peerLastSeen)}</span>
                    <span className="hidden">{nowTick}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearChat}
              aria-label="Delete entire chat"
              title="Delete entire chat"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-rose-300 active:scale-95"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
            <QuickExit />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-[880px]">
            <MessageList
              messages={messages}
              currentUserId={user?.id ?? null}
              profiles={profiles}
              reactions={reactions}
              onReply={onReply}
              onDelete={onDeleteMessage}
              onEdit={onEditMessage}
              onToggleReaction={onToggleReaction}
            />

            <Composer
              currentUserId={user?.id ?? null}
              conversationId={CONVERSATION_ID}
              onTyping={() => {
                channelRef.current?.send({
                  type: "broadcast",
                  event: "typing",
                  payload: { userId: user?.id },
                });
              }}
              replyTarget={replyTarget}
              onClearReply={() => setReplyTarget(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
