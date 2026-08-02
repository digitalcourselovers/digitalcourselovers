
CREATE OR REPLACE FUNCTION public.shares_conversation_with(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _a = _b OR EXISTS (
    SELECT 1
    FROM public.conversation_participants p1
    JOIN public.conversation_participants p2
      ON p1.conversation_id = p2.conversation_id
    WHERE p1.user_id = _a AND p2.user_id = _b
  )
$$;

REVOKE EXECUTE ON FUNCTION public.shares_conversation_with(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.shares_conversation_with(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "chat members read chat media" ON storage.objects;
CREATE POLICY "chat members read chat media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND public.shares_conversation_with(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);
