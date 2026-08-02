import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { isGateUnlocked } from "@/lib/gate.functions";
import { supabase } from "@/integrations/supabase/client";

const CONVERSATION_ID = "00000000-0000-0000-0000-000000000001";

export const Route = createFileRoute("/_authenticated/portal/chat")({
  beforeLoad: async () => {
    try {
      const res = await isGateUnlocked();
      if (!res.unlocked) {
        throw redirect({ to: "/portal/entry" });
      }
      // Only the two conversation participants may open the chat.
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw redirect({ to: "/portal/entry" });
      const { data: member } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", CONVERSATION_ID)
        .eq("user_id", uid)
        .maybeSingle();
      if (!member) throw redirect({ to: "/" });
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
