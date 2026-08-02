DROP POLICY IF EXISTS "Authenticated users can view chat settings" ON public.chat_settings;
DROP POLICY IF EXISTS "Authenticated users can create chat settings" ON public.chat_settings;
DROP POLICY IF EXISTS "Authenticated users can update chat settings" ON public.chat_settings;

CREATE POLICY "participants read chat settings"
ON public.chat_settings FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "participants insert chat settings"
ON public.chat_settings FOR INSERT TO authenticated
WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "participants update chat settings"
ON public.chat_settings FOR UPDATE TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()))
WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()));