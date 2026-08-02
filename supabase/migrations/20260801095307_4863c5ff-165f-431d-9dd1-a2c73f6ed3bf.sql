-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Visitors
CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key text NOT NULL UNIQUE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  total_page_views integer NOT NULL DEFAULT 0,
  total_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.visitors TO service_role;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read visitors" ON public.visitors
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL UNIQUE,
  visitor_id uuid NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  total_seconds integer NOT NULL DEFAULT 0,
  page_count integer NOT NULL DEFAULT 0,
  current_path text,
  ip_hash text,
  country text,
  region text,
  city text,
  isp text,
  timezone text,
  browser text,
  os text,
  device_type text,
  screen text,
  language text,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.visitor_sessions TO service_role;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read sessions" ON public.visitor_sessions
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX visitor_sessions_last_seen_idx ON public.visitor_sessions (last_seen_at DESC);
CREATE INDEX visitor_sessions_visitor_idx ON public.visitor_sessions (visitor_id);

CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.visitor_sessions(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  path text NOT NULL,
  title text,
  entered_at timestamptz NOT NULL DEFAULT now(),
  seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read page views" ON public.page_views
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX page_views_session_idx ON public.page_views (session_id, entered_at);
CREATE INDEX page_views_path_idx ON public.page_views (path);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER visitors_updated_at BEFORE UPDATE ON public.visitors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER visitor_sessions_updated_at BEFORE UPDATE ON public.visitor_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER page_views_updated_at BEFORE UPDATE ON public.page_views
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_sessions;