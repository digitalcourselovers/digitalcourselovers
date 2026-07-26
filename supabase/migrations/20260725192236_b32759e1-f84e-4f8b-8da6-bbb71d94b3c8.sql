DO $$
DECLARE
  bf_id uuid;
  gf_id uuid;
BEGIN
  SELECT id INTO bf_id FROM auth.users WHERE email = 'bf@gmail.com';
  SELECT id INTO gf_id FROM auth.users WHERE email = 'gf@gmail.com';

  IF bf_id IS NULL THEN
    RAISE EXCEPTION 'User bf@gmail.com not found';
  END IF;

  IF gf_id IS NULL THEN
    RAISE EXCEPTION 'User gf@gmail.com not found';
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (bf_id, 'BF')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, display_name)
  VALUES (gf_id, 'GF')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.conversations (id)
  VALUES ('00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;
END $$;