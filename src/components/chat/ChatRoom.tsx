import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Phone, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lockGate } from "@/lib/gate.functions";
import { deleteConversationMessages, deleteMessageById } from "@/lib/messages.functions";
import { forgetMedia } from "@/lib/media-cache";

import { notifyPeer } from "@/lib/push.functions";
import { pingPartner } from "@/lib/telegram.functions";

import { QuickExit } from "./QuickExit";
import { MessageList, type ChatMessage, type Reaction, type CallLog } from "./MessageList";
import { Composer, type ReplyTarget } from "./Composer";
import { ChatList } from "./ChatList";
import { subscribeToPush } from "@/lib/push-client";
import { useCall, type CallSignal } from "@/lib/webrtc/useCall";
import { CallOverlay } from "./call/CallOverlay";
import { ThemePicker } from "./ThemePicker";
import { themeByKey, themeVars } from "@/lib/chat-theme";
import { decryptText, encryptText, isEncrypted, useE2eeKey } from "@/lib/e2ee";
import { useLockBodyScroll, useViewportMetrics } from "@/hooks/use-viewport-height";


const CONVERSATION_ID = "00000000-0000-0000-0000-000000000001";
const HIDDEN_KEY = "chat.hidden.ids";

type Profile = { id: string; display_name: string; avatar_url: string | null; last_seen_at?: string | null };

function formatLastSeen(iso: string | null): string {
  if (!iso) return "last seen recently";
  const date = new Date(iso);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `last seen at ${hh}:${mm}`;
}

const PAGE_SIZE = 60;

/** Newest page of messages (ascending order in the returned array). */
async function fetchRecentMessages(retry = 0): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", CONVERSATION_ID)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) {
    if (retry < 2) {
      await supabase.auth.refreshSession().catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
      return fetchRecentMessages(retry + 1);
    }
    return [];
  }
  return ((data ?? []) as ChatMessage[]).slice().reverse();
}

/** Older page, strictly before `beforeIso` (ascending order). */
async function fetchOlderMessages(beforeIso: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", CONVERSATION_ID)
    .lt("created_at", beforeIso)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) return [];
  return ((data ?? []) as ChatMessage[]).slice().reverse();
}

/**
 * Safety net: pulls anything newer than what we already hold, so a dropped
 * realtime packet can never make a new message disappear.
 */
async function fetchNewerMessages(afterIso: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", CONVERSATION_ID)
    .gte("created_at", afterIso)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return [];
  return (data ?? []) as ChatMessage[];
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  let changed = false;
  for (const m of incoming) {
    const existing = map.get(m.id);
    if (!existing || existing.edited_at !== m.edited_at || existing.read_at !== m.read_at) changed = true;
    map.set(m.id, m);
  }
  if (!changed) return prev;
  return Array.from(map.values()).sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );
}




export function ChatRoom() {
  const lock = useServerFn(lockGate);
  const deleteAll = useServerFn(deleteConversationMessages);
  const deleteOne = useServerFn(deleteMessageById);
  const notify = useServerFn(notifyPeer);
  const ping = useServerFn(pingPartner);


  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(HIDDEN_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  });
  const [themeKey, setThemeKey] = useState("midnight");
  const [themeOpen, setThemeOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const peerId = useMemo(
    () => Object.keys(profiles).find((id) => id !== user?.id) ?? null,
    [profiles, user],
  );

  const sendSignal = useCallback((signal: CallSignal) => {
    channelRef.current?.send({ type: "broadcast", event: "call", payload: signal });
  }, []);

  const call = useCall({
    userId: user?.id ?? null,
    peerId,
    conversationId: CONVERSATION_ID,
    sendSignal,
    onIncomingPing: () => {
      notify({ data: { conversationId: CONVERSATION_ID } }).catch(() => {});
    },
  });

  const callSignalRef = useRef(call.handleSignal);
  callSignalRef.current = call.handleSignal;
  const callActiveRef = useRef(call.active);
  callActiveRef.current = call.active;


  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const loadingOlderRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const applyMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => mergeMessages(prev, incoming));
  }, []);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreOlder) return;
    const oldest = messagesRef.current[0]?.created_at;
    if (!oldest) return;
    loadingOlderRef.current = true;
    try {
      const older = await fetchOlderMessages(oldest);
      if (older.length < PAGE_SIZE) setHasMoreOlder(false);
      if (older.length) applyMessages(older);
    } finally {
      loadingOlderRef.current = false;
    }
  }, [applyMessages, hasMoreOlder]);

  const syncNewer = useCallback(async () => {
    const list = messagesRef.current;
    const newest = list[list.length - 1]?.created_at;
    if (!newest) {
      applyMessages(await fetchRecentMessages());
      return;
    }
    applyMessages(await fetchNewerMessages(newest));
  }, [applyMessages]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data.user ?? null);

      const [{ data: profs }, msgs, { data: rx }, { data: callRows }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, last_seen_at"),
        fetchRecentMessages(),
        supabase.from("message_reactions").select("id, message_id, user_id, emoji"),
        supabase
          .from("calls")
          .select("id, caller_id, callee_id, kind, status, started_at, answered_at, ended_at, duration_ms")
          .eq("conversation_id", CONVERSATION_ID)
          .order("started_at", { ascending: false })
          .limit(200),
        supabase
          .from("chat_settings")
          .select("theme")
          .eq("conversation_id", CONVERSATION_ID)
          .maybeSingle(),
      ]);
      if (!mounted) return;
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: Profile) => (map[p.id] = p as Profile));
      setProfiles(map);
      const peer = (profs ?? []).find((p: Profile) => p.id !== data.user?.id) as Profile | undefined;
      if (peer?.last_seen_at) setPeerLastSeen(peer.last_seen_at);
      setMessages(msgs);
      if (msgs.length < PAGE_SIZE) setHasMoreOlder(false);
      setReactions((rx ?? []) as Reaction[]);
      setCalls(((callRows ?? []) as CallLog[]).slice().reverse());
      if (settings?.theme) setThemeKey(settings.theme);
      setReady(true);

      if (data.user) {
        subscribeToPush(data.user.id).catch(() => {});
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Poll for anything realtime may have missed (dropped socket, sleeping tab).
  useEffect(() => {
    if (!ready) return;
    const t = window.setInterval(() => {
      syncNewer().catch(() => {});
    }, 10_000);
    const onFocus = () => {
      syncNewer().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, syncNewer]);


  useEffect(() => {
    function autoExit() {
      // Never bail out of an active call when the tab is hidden/minimised.
      if (callActiveRef.current) return;
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
            fetchRecentMessages().then((rows) => setMessages(rows));

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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `conversation_id=eq.${CONVERSATION_ID}` },
        (payload) => {
          const c = payload.new as CallLog;
          setCalls((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `conversation_id=eq.${CONVERSATION_ID}` },
        (payload) => {
          const c = payload.new as CallLog;
          setCalls((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "calls" },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (!oldId) {
            setCalls([]);
            return;
          }
          setCalls((prev) => prev.filter((x) => x.id !== oldId));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_settings" },
        (payload) => {
          const next = (payload.new as { theme?: string } | null)?.theme;
          if (next) setThemeKey(next);
        },
      )
      .on("broadcast", { event: "call" }, (payload) => {
        const signal = payload.payload as CallSignal | undefined;
        if (signal?.type) void callSignalRef.current(signal);
      })
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

  // Decrypt message bodies locally. Ciphertext never leaves the DB decrypted.
  const encKey = useE2eeKey();
  const [plainBodies, setPlainBodies] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!encKey) return;
    const todo = messages.filter((m) => isEncrypted(m.body) && plainBodies[m.id] === undefined);
    if (todo.length === 0) return;
    let mounted = true;
    (async () => {
      const entries = await Promise.all(
        todo.map(
          async (m) =>
            [m.id, (await decryptText(encKey, m.body as string)) ?? "🔒 Unable to decrypt"] as const,
        ),
      );
      if (mounted) setPlainBodies((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
    return () => {
      mounted = false;
    };
  }, [messages, encKey, plainBodies]);

  const decryptedMessages = useMemo(
    () =>
      messages.map((m) =>
        isEncrypted(m.body) ? { ...m, body: plainBodies[m.id] ?? "…" } : m,
      ),
    [messages, plainBodies],
  );

  const lastMsg = decryptedMessages[decryptedMessages.length - 1];
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

  const activeCallId = call.state.callId;
  const visibleMessages = useMemo(
    () => decryptedMessages.filter((m) => !hiddenIds.includes(m.id)),
    [decryptedMessages, hiddenIds],
  );

  const visibleCalls = useMemo(
    () => calls.filter((c) => c.id !== activeCallId && !hiddenIds.includes(c.id)),
    [calls, activeCallId, hiddenIds],
  );

  function hideLocally(id: string) {
    setHiddenIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function onClearChat() {
    if (typeof window === "undefined") return;
    if (!window.confirm("Delete the entire chat for both of you? This cannot be undone.")) return;
    try {
      const res = await deleteAll({ data: { conversationId: CONVERSATION_ID } });
      await forgetMedia(res?.removedMedia ?? []);
      setMessages([]);
      setReactions([]);
      setCalls([]);
    } catch (e) {
      console.error(e);
      alert("Failed to delete chat. Try again.");
    }
  }

  function onDeleteMessageForMe(m: ChatMessage) {
    hideLocally(m.id);
  }

  function onDeleteCallForMe(c: CallLog) {
    hideLocally(c.id);
  }

  async function onDeleteCall(c: CallLog) {
    if (typeof window === "undefined") return;
    if (!window.confirm("Delete this call log for everyone?")) return;
    setCalls((prev) => prev.filter((x) => x.id !== c.id));
    try {
      const { error } = await supabase.from("calls").delete().eq("id", c.id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("Failed to delete call log.");
    }
  }

  async function onDeleteMessage(m: ChatMessage) {
    if (typeof window === "undefined") return;
    if (!window.confirm("Delete this message for everyone?")) return;
    // Optimistic remove
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    setReactions((prev) => prev.filter((r) => r.message_id !== m.id));
    try {
      // Always via the server fn: it removes the row *and* the stored media file.
      const res = await deleteOne({ data: { messageId: m.id } });
      await forgetMedia(res?.removedMedia ?? []);
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
    if (!encKey) {
      alert("Secure session expired. Re-enter your access code to continue.");
      return;
    }
    const next = window.prompt("Edit message", m.body ?? "");
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === (m.body ?? "")) return;
    const nowIso = new Date().toISOString();
    const sealed = await encryptText(encKey, trimmed);
    setPlainBodies((prev) => ({ ...prev, [m.id]: trimmed }));
    setMessages((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, body: sealed, edited_at: nowIso } : x)),
    );
    const { error } = await supabase
      .from("messages")
      .update({ body: sealed, edited_at: nowIso })
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

  const theme = themeByKey(themeKey);
  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useViewportMetrics();
  useLockBodyScroll();

  async function onSelectTheme(key: string) {
    setThemeKey(key);
    setThemeOpen(false);
    const { error } = await supabase
      .from("chat_settings")
      .upsert(
        { conversation_id: CONVERSATION_ID, theme: key, updated_at: new Date().toISOString() },
        { onConflict: "conversation_id" },
      );
    if (error) console.error(error);
  }

  function startCallWithPing(kind: "voice" | "video") {
    void call.startCall(kind);
    notify({ data: { conversationId: CONVERSATION_ID } }).catch(() => {});
  }

  return (
    <div
      className="fixed left-0 right-0 flex w-full overflow-hidden bg-[#0a0a0a] text-slate-100"
      style={{
        ...themeVars(theme),
        top: viewportOffsetTop,
        height: viewportHeight ? `${viewportHeight}px` : "100dvh",
      }}
    >
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

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#0f0f0f]">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 bg-[#171717] px-2.5 py-3 sm:px-4 sm:py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${gradient} text-base font-bold text-white shadow`}>
              {assistantInitial}
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setThemeOpen(true)}
                title="Change chat theme"
                className="block max-w-full truncate text-left text-[13px] font-semibold leading-tight tracking-tight transition hover:opacity-80 sm:text-sm"
              >
                {assistantName}
              </button>
              <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px] leading-tight text-slate-400">
                {peerTyping ? (
                  <span className="text-rose-300">typing…</span>
                ) : peerOnline ? (
                  <>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>Online</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                    <span>{formatLastSeen(peerLastSeen)}</span>
                    <span className="hidden">{nowTick}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            <button
              type="button"
              onClick={() => startCallWithPing("voice")}
              disabled={!peerId || call.active}
              aria-label="Voice call"
              title="Voice call"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-emerald-300 active:scale-95 disabled:opacity-40 sm:h-10 sm:w-10"
            >
              <Phone className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={() => startCallWithPing("video")}
              disabled={!peerId || call.active}
              aria-label="Video call"
              title="Video call"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-emerald-300 active:scale-95 disabled:opacity-40 sm:h-10 sm:w-10"
            >
              <Video className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={onClearChat}
              aria-label="Delete entire chat"
              title="Delete entire chat"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-rose-300 active:scale-95 sm:h-10 sm:w-10"
            >
              <Trash2 className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            </button>
            <QuickExit onBeforeExit={() => call.hangup()} />
          </div>
        </header>


        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-[880px]">
            <MessageList
              messages={visibleMessages}
              calls={visibleCalls}
              currentUserId={user?.id ?? null}
              profiles={profiles}
              reactions={reactions}
              onReply={onReply}
              onDelete={onDeleteMessage}
              onDeleteForMe={onDeleteMessageForMe}
              onDeleteCall={onDeleteCall}
              onDeleteCallForMe={onDeleteCallForMe}
              onEdit={onEditMessage}
              onToggleReaction={onToggleReaction}
              hasMoreOlder={hasMoreOlder}
              onLoadOlder={loadOlder}

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

      <ThemePicker
        open={themeOpen}
        current={theme}
        onClose={() => setThemeOpen(false)}
        onSelect={onSelectTheme}
        canPing={email.toLowerCase().startsWith("gf@")}
        onPing={async () => {
          try {
            const res = await ping();
            return res.ok === true;
          } catch {
            return false;
          }
        }}
      />


      <CallOverlay
        state={call.state}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        hasMultipleCameras={call.hasMultipleCameras}
        facing={call.facing}
        peerName={assistantName}
        peerInitial={assistantInitial}
        gradient={gradient}
        onAccept={call.accept}
        onDecline={call.decline}
        onHangup={call.hangup}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
        onSwitchCamera={call.switchCamera}
        onClearError={call.clearError}
      />
    </div>

  );
}
