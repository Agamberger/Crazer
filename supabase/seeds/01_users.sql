-- ============================================================
-- CRAZER SEED: 01_USERS.SQL
-- Utilisateurs de test, identités GoTrue et profils
-- ============================================================

-- Identifiants et mot de passe par défaut :
--   - alice@crazer.app / Password
--   - bob@crazer.app / Password
--   - charlie@crazer.app / Password

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'alice@crazer.app',
  crypt('Password', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Alice Dupont"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
),
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'bob@crazer.app',
  crypt('Password', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Bob Martin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
),
(
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'charlie@crazer.app',
  crypt('Password', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Charlie Moreau"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Insertion dans auth.identities (requis par GoTrue)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@crazer.app"}'::jsonb,
  'email',
  'alice@crazer.app',
  NOW(),
  NOW(),
  NOW()
),
(
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  '{"sub":"22222222-2222-2222-2222-222222222222","email":"bob@crazer.app"}'::jsonb,
  'email',
  'bob@crazer.app',
  NOW(),
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  '{"sub":"33333333-3333-3333-3333-333333333333","email":"charlie@crazer.app"}'::jsonb,
  'email',
  'charlie@crazer.app',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Mettre à jour les profils
UPDATE public.profiles
SET full_name = 'Alice Dupont', avatar_url = 'https://i.pravatar.cc/150?u=alice'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE public.profiles
SET full_name = 'Bob Martin', avatar_url = 'https://i.pravatar.cc/150?u=bob'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE public.profiles
SET full_name = 'Charlie Moreau', avatar_url = 'https://i.pravatar.cc/150?u=charlie'
WHERE id = '33333333-3333-3333-3333-333333333333';
