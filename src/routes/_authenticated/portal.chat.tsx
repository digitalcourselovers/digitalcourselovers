import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { isGateUnlocked } from "@/lib/gate.functions";

export const Route = createFileRoute("/_authenticated/portal/chat")({
  beforeLoad: async () => {
    try {
      const res = await isGateUnlocked();
      if (!res.unlocked) {
        throw redirect({ to: "/portal/entry" });
      }
    } catch (e) {
      // Re-throw redirects; on any other error, force gate entry
      if ((e as { isRedirect?: boolean })?.isRedirect) throw e;
      throw redirect({ to: "/portal/entry" });
    }
  },
  head: () => ({
    meta: [
      { title: "Course dashboard" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <ChatRoom />,
});
