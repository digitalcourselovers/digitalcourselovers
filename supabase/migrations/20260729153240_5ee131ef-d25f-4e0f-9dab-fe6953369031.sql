
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

DROP POLICY IF EXISTS "sender updates own message" ON public.messages;
CREATE POLICY "sender updates own message"
ON public.messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
