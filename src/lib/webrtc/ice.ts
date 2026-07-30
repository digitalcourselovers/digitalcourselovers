// ICE configuration for peer-to-peer calls.
// Public STUN servers cover most home / mobile networks.
// Optional TURN relay can be supplied via env vars without any code change.

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun.cloudflare.com:3478",
      ],
    },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(",").map((u) => u.trim()).filter(Boolean),
      username: (import.meta.env.VITE_TURN_USERNAME as string | undefined) ?? undefined,
      credential: (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined) ?? undefined,
    });
  }

  return servers;
}

export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function videoConstraints(facing: "user" | "environment"): MediaTrackConstraints {
  return {
    facingMode: facing,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
}
