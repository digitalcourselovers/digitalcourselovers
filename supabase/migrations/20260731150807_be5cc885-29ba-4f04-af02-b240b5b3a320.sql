CREATE TABLE public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_attempts_lookup_idx ON public.auth_attempts (kind, ip_hash, created_at DESC);

GRANT ALL ON public.auth_attempts TO service_role;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Tighten profile visibility: only yourself and people you share a conversation with.
DROP POLICY IF EXISTS "authed users read profiles" ON public.profiles;
CREATE POLICY "read shared profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_conversation_with(auth.uid(), id));