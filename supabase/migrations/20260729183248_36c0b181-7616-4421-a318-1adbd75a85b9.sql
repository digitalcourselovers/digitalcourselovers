CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'voice',
  status text NOT NULL DEFAULT 'ringing',
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authed read calls" ON public.calls
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "caller inserts own call" ON public.calls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "participants update call" ON public.calls
  FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "participants delete call" ON public.calls
  FOR DELETE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;