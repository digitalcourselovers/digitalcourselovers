
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

GRANT SELECT ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_chat_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants WHERE user_id = _user_id
  )
$$;

CREATE POLICY "participants read own memberships"
ON public.conversation_participants FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, p.id FROM public.profiles p
ON CONFLICT DO NOTHING;

-- conversations
DROP POLICY IF EXISTS "authed read conversations" ON public.conversations;
CREATE POLICY "participants read conversations"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

-- messages
DROP POLICY IF EXISTS "authed read messages" ON public.messages;
CREATE POLICY "participants read messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "authed insert own messages" ON public.messages;
CREATE POLICY "participants insert own messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "recipient marks read" ON public.messages;
CREATE POLICY "recipient marks read"
ON public.messages FOR UPDATE TO authenticated
USING (auth.uid() <> sender_id AND public.is_conversation_participant(conversation_id, auth.uid()))
WITH CHECK (auth.uid() <> sender_id AND public.is_conversation_participant(conversation_id, auth.uid()));

-- calls
DROP POLICY IF EXISTS "authed read calls" ON public.calls;
CREATE POLICY "participants read calls"
ON public.calls FOR SELECT TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

DROP POLICY IF EXISTS "caller inserts own call" ON public.calls;
CREATE POLICY "caller inserts own call"
ON public.calls FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_id AND public.is_conversation_participant(conversation_id, auth.uid()));

-- reactions
DROP POLICY IF EXISTS "authed read reactions" ON public.message_reactions;
CREATE POLICY "participants read reactions"
ON public.message_reactions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.id = message_id
    AND public.is_conversation_participant(m.conversation_id, auth.uid())
));

-- storage: chat media only for chat members
DROP POLICY IF EXISTS "authed read chat media" ON storage.objects;
CREATE POLICY "chat members read chat media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media' AND public.is_chat_member(auth.uid()));
