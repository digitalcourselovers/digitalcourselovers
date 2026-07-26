
-- Restrict SECURITY DEFINER trigger function from being called through the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten message update: only allow marking messages read (not editing others' content)
DROP POLICY "authed update read state" ON public.messages;
CREATE POLICY "recipient marks read" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() <> sender_id)
  WITH CHECK (auth.uid() <> sender_id);

-- Storage policies for chat-media bucket
CREATE POLICY "authed read chat media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');
CREATE POLICY "authed upload own chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "authed delete own chat media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
