import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

const sessionConfig = () => ({
  password: process.env.SESSION_SECRET!,
  name: "mm-portal",
  maxAge: 60 * 60 * 8,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
  },
});

export function equalGateCode(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig());
}