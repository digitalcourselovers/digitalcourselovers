
-- Create the two lover accounts if they don't already exist
DO $$
DECLARE
  bf_id uuid;
  gf_id uuid;
BEGIN
  -- BF account
  SELECT id INTO bf_id FROM auth.users WHERE email = 'bf@gmail.com';
  IF bf_id IS NULL THEN
    bf_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', bf_id, 'authenticated', 'authenticated',
      'bf@gmail.com', crypt('bf@gmail.com', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"BF"}'::jsonb, now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), bf_id,
      jsonb_build_object('sub', bf_id::text, 'email', 'bf@gmail.com', 'email_verified', true),
      'email', bf_id::text, now(), now(), now());
  END IF;

  -- GF account
  SELECT id INTO gf_id FROM auth.users WHERE email = 'gf@gmail.com';
  IF gf_id IS NULL THEN
    gf_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gf_id, 'authenticated', 'authenticated',
      'gf@gmail.com', crypt('gf@gmail.com', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"GF"}'::jsonb, now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), gf_id,
      jsonb_build_object('sub', gf_id::text, 'email', 'gf@gmail.com', 'email_verified', true),
      'email', gf_id::text, now(), now(), now());
  END IF;

  -- Ensure profiles exist
  INSERT INTO public.profiles (id, display_name)
  VALUES (bf_id, 'BF') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, display_name)
  VALUES (gf_id, 'GF') ON CONFLICT (id) DO NOTHING;

  -- Ensure the shared conversation exists
  INSERT INTO public.conversations (id) VALUES ('00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;
END $$;
