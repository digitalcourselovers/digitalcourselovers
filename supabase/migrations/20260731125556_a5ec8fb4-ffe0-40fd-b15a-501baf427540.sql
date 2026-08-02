CREATE TABLE public.chat_settings (
  conversation_id UUID NOT NULL PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'midnight',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.chat_settings TO authenticated;
GRANT ALL ON public.chat_settings TO service_role;

ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chat settings"
ON public.chat_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create chat settings"
ON public.chat_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update chat settings"
ON public.chat_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.chat_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_settings;

INSERT INTO public.chat_settings (conversation_id, theme)
VALUES ('00000000-0000-0000-0000-000000000001', 'midnight')
ON CONFLICT (conversation_id) DO NOTHING;