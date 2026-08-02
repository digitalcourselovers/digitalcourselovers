import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AUDIO_CONSTRAINTS, getIceServers, videoConstraints } from "./ice";

export type CallKind = "voice" | "video";
export type CallPhase = "idle" | "outgoing" | "incoming" | "connected" | "ended";

export type CallSignal = {
  type: "invite" | "accept" | "decline" | "ice" | "end" | "busy" | "cancel";
  callId: string;
  from: string;
  to: string;
  kind?: CallKind;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  reason?: string;
};

export type CallState = {
  phase: CallPhase;
  kind: CallKind;
  callId: string | null;
  peerId: string | null;
  muted: boolean;
  camOff: boolean;
  status: string;
  answeredAt: number | null;
  error: string | null;
  reconnecting: boolean;
  endedReason: string | null;
};

const RING_TIMEOUT_MS = 45_000;
const RECOVERY_TIMEOUT_MS = 30_000;

const initialState: CallState = {
  phase: "idle",
  kind: "voice",
  callId: null,
  peerId: null,
  muted: false,
  camOff: false,
  status: "",
  answeredAt: null,
  error: null,
  reconnecting: false,
  endedReason: null,
};

export function useCall({
  userId,
  peerId,
  conversationId,
  sendSignal,
  onIncomingPing,
}: {
  userId: string | null;
  peerId: string | null;
  conversationId: string;
  sendSignal: (signal: CallSignal) => void;
  onIncomingPing?: () => void;
}) {
  const [state, setState] = useState<CallState>(initialState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callIdRef = useRef<string | null>(null);
  const kindRef = useRef<CallKind>("voice");
  const isCallerRef = useRef(false);
  const answeredAtRef = useRef<number | null>(null);
  const facingRef = useRef<"user" | "environment">("user");
  const ringTimerRef = useRef<number | null>(null);
  const recoverTimerRef = useRef<number | null>(null);
  const stateRef = useRef<CallState>(initialState);

  stateRef.current = state;

  const clearTimers = useCallback(() => {
    if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
    if (recoverTimerRef.current) window.clearTimeout(recoverTimerRef.current);
    ringTimerRef.current = null;
    recoverTimerRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    clearTimers();
    try {
      pcRef.current?.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch {
          /* noop */
        }
      });
      pcRef.current?.close();
    } catch {
      /* noop */
    }
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* noop */
      }
    });
    localRef.current = null;
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
  }, [clearTimers]);

  const logCall = useCallback(
    async (patch: { status?: string; answered_at?: string | null }) => {
      const id = callIdRef.current;
      if (!id) return;
      await supabase.from("calls").update(patch).eq("id", id);
    },
    [],
  );

  const finish = useCallback(
    (reason: string, persist: boolean) => {
      const id = callIdRef.current;
      const answered = answeredAtRef.current;
      if (persist && id) {
        const duration = answered ? Date.now() - answered : null;
        const patch: {
          status: string;
          ended_at: string;
          answered_at?: string;
          duration_ms?: number | null;
        } = {
          status: answered ? "ended" : reason,
          ended_at: new Date().toISOString(),
        };
        if (answered) {
          patch.answered_at = new Date(answered).toISOString();
          patch.duration_ms = duration;
        }
        supabase
          .from("calls")
          .update(patch)
          .eq("id", id)
          .then(
            () => {},
            () => {},
          );
      }
      teardown();
      callIdRef.current = null;
      answeredAtRef.current = null;
      isCallerRef.current = false;
      setState({ ...initialState, endedReason: reason });
      window.setTimeout(() => {
        setState((s) => (s.phase === "idle" ? { ...s, endedReason: null } : s));
      }, 2500);
    },
    [teardown],
  );

  const getMedia = useCallback(async (kind: CallKind) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: kind === "video" ? videoConstraints(facingRef.current) : false,
    });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const buildPc = useCallback(
    (stream: MediaStream, targetId: string) => {
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const remote = new MediaStream();
      setRemoteStream(remote);

      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((t) => {
          if (!remote.getTracks().some((x) => x.id === t.id)) remote.addTrack(t);
        });
        setRemoteStream(new MediaStream(remote.getTracks()));
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && callIdRef.current && userId) {
          sendSignal({
            type: "ice",
            callId: callIdRef.current,
            from: userId,
            to: targetId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        const cs = pc.connectionState;
        if (cs === "connected") {
          if (recoverTimerRef.current) window.clearTimeout(recoverTimerRef.current);
          recoverTimerRef.current = null;
          setState((s) => ({ ...s, reconnecting: false, status: "Connected" }));
        } else if (cs === "disconnected" || cs === "failed") {
          setState((s) => ({ ...s, reconnecting: true, status: "Reconnecting…" }));
          if (cs === "failed") {
            try {
              pc.restartIce();
            } catch {
              /* noop */
            }
          }
          if (!recoverTimerRef.current) {
            recoverTimerRef.current = window.setTimeout(() => {
              if (pcRef.current && pcRef.current.connectionState !== "connected") {
                if (userId && callIdRef.current && peerId) {
                  sendSignal({
                    type: "end",
                    callId: callIdRef.current,
                    from: userId,
                    to: peerId,
                  });
                }
                finish("failed", true);
              }
            }, RECOVERY_TIMEOUT_MS);
          }
        }
      };

      return pc;
    },
    [finish, peerId, sendSignal, userId],
  );

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queue = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const c of queue) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* noop */
      }
    }
  }, []);

  /* ---------------- outgoing ---------------- */

  const startCall = useCallback(
    async (kind: CallKind) => {
      if (!userId || !peerId || stateRef.current.phase !== "idle") return;
      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      kindRef.current = kind;
      isCallerRef.current = true;
      facingRef.current = "user";
      setState({
        ...initialState,
        phase: "outgoing",
        kind,
        callId,
        peerId,
        status: "Calling…",
      });

      let stream: MediaStream;
      try {
        stream = await getMedia(kind);
      } catch {
        setState({
          ...initialState,
          error:
            kind === "video"
              ? "Camera or microphone access was blocked."
              : "Microphone access was blocked.",
        });
        callIdRef.current = null;
        return;
      }

      await supabase.from("calls").insert({
        id: callId,
        conversation_id: conversationId,
        caller_id: userId,
        callee_id: peerId,
        kind,
        status: "ringing",
      });

      const pc = buildPc(stream, peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({ type: "invite", callId, from: userId, to: peerId, kind, sdp: offer });
      onIncomingPing?.();

      setState((s) => ({ ...s, status: "Ringing…" }));

      ringTimerRef.current = window.setTimeout(() => {
        if (stateRef.current.phase === "outgoing") {
          sendSignal({ type: "cancel", callId, from: userId, to: peerId });
          finish("missed", true);
        }
      }, RING_TIMEOUT_MS);
    },
    [buildPc, conversationId, finish, getMedia, onIncomingPing, peerId, sendSignal, userId],
  );

  /* ---------------- incoming ---------------- */

  const accept = useCallback(async () => {
    const offer = pendingOfferRef.current;
    const callId = callIdRef.current;
    const kind = kindRef.current;
    if (!offer || !callId || !userId || !peerId) return;

    clearTimers();
    setState((s) => ({ ...s, phase: "connected", status: "Connecting…" }));

    let stream: MediaStream;
    try {
      stream = await getMedia(kind);
    } catch {
      sendSignal({ type: "decline", callId, from: userId, to: peerId });
      finish("declined", true);
      setState((s) => ({
        ...s,
        error:
          kind === "video"
            ? "Camera or microphone access was blocked."
            : "Microphone access was blocked.",
      }));
      return;
    }

    const pc = buildPc(stream, peerId);
    await pc.setRemoteDescription(offer);
    await flushIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    answeredAtRef.current = Date.now();
    setState((s) => ({ ...s, answeredAt: answeredAtRef.current }));
    void logCall({ status: "accepted", answered_at: new Date().toISOString() });

    sendSignal({ type: "accept", callId, from: userId, to: peerId, sdp: answer });
  }, [buildPc, clearTimers, finish, flushIce, getMedia, logCall, peerId, sendSignal, userId]);

  const decline = useCallback(() => {
    const callId = callIdRef.current;
    if (callId && userId && peerId) {
      sendSignal({ type: "decline", callId, from: userId, to: peerId });
    }
    finish("declined", true);
  }, [finish, peerId, sendSignal, userId]);

  const hangup = useCallback(() => {
    const phase = stateRef.current.phase;
    if (phase === "idle") return;
    const callId = callIdRef.current;
    if (callId && userId && peerId) {
      sendSignal({ type: phase === "outgoing" ? "cancel" : "end", callId, from: userId, to: peerId });
    }
    if (phase === "outgoing") finish("missed", true);
    else finish(answeredAtRef.current ? "ended" : "missed", true);
  }, [finish, peerId, sendSignal, userId]);

  /* ---------------- signal handling ---------------- */

  const handleSignal = useCallback(
    async (msg: CallSignal) => {
      if (!userId || msg.to !== userId || msg.from === userId) return;
      const phase = stateRef.current.phase;

      if (msg.type === "invite") {
        if (phase !== "idle" || !msg.sdp) {
          sendSignal({ type: "busy", callId: msg.callId, from: userId, to: msg.from });
          return;
        }
        callIdRef.current = msg.callId;
        kindRef.current = msg.kind ?? "voice";
        isCallerRef.current = false;
        pendingOfferRef.current = msg.sdp;
        pendingIceRef.current = [];
        facingRef.current = "user";
        setState({
          ...initialState,
          phase: "incoming",
          kind: msg.kind ?? "voice",
          callId: msg.callId,
          peerId: msg.from,
          status: "Incoming call",
        });
        ringTimerRef.current = window.setTimeout(() => {
          if (stateRef.current.phase === "incoming") finish("missed", true);
        }, RING_TIMEOUT_MS);
        return;
      }

      if (msg.callId !== callIdRef.current) return;

      switch (msg.type) {
        case "accept": {
          if (!msg.sdp || !pcRef.current) return;
          clearTimers();
          await pcRef.current.setRemoteDescription(msg.sdp);
          await flushIce();
          answeredAtRef.current = Date.now();
          setState((s) => ({
            ...s,
            phase: "connected",
            status: "Connecting…",
            answeredAt: answeredAtRef.current,
          }));
          break;
        }
        case "ice": {
          if (!msg.candidate) return;
          if (pcRef.current?.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(msg.candidate);
            } catch {
              /* noop */
            }
          } else {
            pendingIceRef.current.push(msg.candidate);
          }
          break;
        }
        case "decline":
          finish("declined", true);
          break;
        case "busy":
          setState({ ...initialState, error: "User is busy." });
          teardown();
          callIdRef.current = null;
          break;
        case "cancel":
          finish("missed", true);
          break;
        case "end":
          finish(answeredAtRef.current ? "ended" : "missed", true);
          break;
      }
    },
    [clearTimers, finish, flushIce, sendSignal, teardown, userId],
  );

  /* ---------------- controls ---------------- */

  const toggleMute = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !stateRef.current.muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setState((s) => ({ ...s, muted: next }));
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !stateRef.current.camOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setState((s) => ({ ...s, camOff: next }));
  }, []);

  const switchCamera = useCallback(async () => {
    const pc = pcRef.current;
    const stream = localRef.current;
    if (!pc || !stream) return;
    const next = facingRef.current === "user" ? "environment" : "user";
    try {
      let fresh: MediaStream | null = null;
      try {
        fresh = await navigator.mediaDevices.getUserMedia({
          video: { ...videoConstraints(next), facingMode: { exact: next } },
          audio: false,
        });
      } catch {
        // Some devices (desktops / multi-cam phones) don't honour facingMode:
        // fall back to picking the next videoinput device explicitly.
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput");
        const currentId = stream.getVideoTracks()[0]?.getSettings().deviceId;
        const idx = cams.findIndex((c) => c.deviceId === currentId);
        const target = cams[(idx + 1 + cams.length) % cams.length];
        if (target) {
          fresh = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: target.deviceId } },
            audio: false,
          });
        }
      }
      const newTrack = fresh?.getVideoTracks()[0];
      if (!newTrack) return;
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(newTrack);
      stream.getVideoTracks().forEach((t) => {
        stream.removeTrack(t);
        t.stop();
      });
      stream.addTrack(newTrack);
      newTrack.enabled = !stateRef.current.camOff;
      facingRef.current = next;
      setLocalStream(new MediaStream(stream.getTracks()));
    } catch {
      /* noop */
    }
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  /* ---------------- effects ---------------- */

  // Camera list is only fully visible after permission is granted, so re-check
  // whenever the local stream changes; touch devices always get the toggle.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const isTouch =
      navigator.maxTouchPoints > 0 || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isTouch) {
      setHasMultipleCameras(true);
      return;
    }
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        setHasMultipleCameras(devices.filter((d) => d.kind === "videoinput").length > 1);
      })
      .catch(() => {});
  }, [localStream]);


  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  const active = state.phase !== "idle";

  return {
    state,
    active,
    localStream,
    remoteStream,
    hasMultipleCameras,
    startCall,
    accept,
    decline,
    hangup,
    toggleMute,
    toggleCamera,
    switchCamera,
    handleSignal,
    clearError,
  };
}
