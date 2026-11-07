-- ============================================================
-- Tests pgTAP : durcissement RLS (fix/rls-security)
-- Lancement : npm run db:test  (supabase test db, stack locale requise)
--
-- Comptes des seeds :
--   Alice   11111111-1111-1111-1111-111111111111
--   Bob     22222222-2222-2222-2222-222222222222  (ami accepté d'Alice)
--   Charlie 33333333-3333-3333-3333-333333333333  (demande en attente Alice → Charlie)
-- Sorties : c1111… et c2222… appartiennent à Alice, c3333… à Bob.
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(24);

-- ── Données de test (insérées en superuser, annulées au ROLLBACK) ────────────
INSERT INTO public.places (id, name, location, source, source_id, created_by)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Lieu Google de Bob', 'POINT(2.35 48.85)',
   'google', 'test_place_bob', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Lieu perso d''Alice', 'POINT(2.36 48.86)',
   'custom', NULL, '11111111-1111-1111-1111-111111111111');

INSERT INTO public.outing_participants (id, outing_id, user_id, status)
VALUES ('dddddddd-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333', 'invited');

INSERT INTO public.planned_outings (id, outing_id, title, scheduled_for, created_by)
SELECT 'eeeeeeee-0000-0000-0000-000000000001', o.id, 'Étape test', o.start_date + INTERVAL '1 hour',
       '11111111-1111-1111-1111-111111111111'
FROM public.outings o WHERE o.id = 'c1111111-1111-1111-1111-111111111111';

-- Helper : se connecter en tant qu'utilisateur authentifié
CREATE FUNCTION pg_temp.login(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  SELECT set_config('role', 'authenticated', true);
$$;

-- ============================================================
-- 1. friendships
-- ============================================================
SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

DELETE FROM public.friendships WHERE id = 'a2222222-2222-2222-2222-222222222222';
SELECT throws_ok(
  $$ INSERT INTO public.friendships (user_id, friend_id, status)
     VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'accepted') $$,
  '42501', NULL,
  'friendships : impossible de créer une amitié directement acceptée'
);

SELECT throws_ok(
  $$ INSERT INTO public.friendships (user_id, friend_id, status)
     VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'pending') $$,
  NULL, NULL,
  'friendships : impossible de se demander soi-même en ami'
);

SELECT lives_ok(
  $$ INSERT INTO public.friendships (id, user_id, friend_id, status)
     VALUES ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
             '33333333-3333-3333-3333-333333333333', 'pending') $$,
  'friendships : une demande pending reste possible'
);

SELECT is_empty(
  $$ UPDATE public.friendships SET status = 'accepted'
     WHERE id = 'a2222222-2222-2222-2222-222222222222' RETURNING id $$,
  'friendships : l''émetteur ne peut pas accepter sa propre demande'
);

SELECT pg_temp.login('33333333-3333-3333-3333-333333333333'); -- Charlie

SELECT throws_ok(
  $$ INSERT INTO public.friendships (user_id, friend_id, status)
     VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'pending') $$,
  '42501', NULL,
  'friendships : pas de demande en sens inverse si une relation existe déjà'
);

SELECT throws_ok(
  $$ UPDATE public.friendships SET user_id = '22222222-2222-2222-2222-222222222222'
     WHERE id = 'a2222222-2222-2222-2222-222222222222' $$,
  '42501', NULL,
  'friendships : le destinataire ne peut pas réécrire user_id'
);

SELECT isnt_empty(
  $$ UPDATE public.friendships SET status = 'accepted', updated_at = now()
     WHERE id = 'a2222222-2222-2222-2222-222222222222' RETURNING id $$,
  'friendships : le destinataire peut accepter la demande'
);

-- ============================================================
-- 2. outing_participants / planned_outings
-- ============================================================
SELECT throws_ok(
  $$ UPDATE public.outing_participants SET outing_id = 'c3333333-3333-3333-3333-333333333333'
     WHERE id = 'dddddddd-0000-0000-0000-000000000001' $$,
  '42501', NULL,
  'outing_participants : un invité ne peut pas déplacer sa ligne vers une autre sortie'
);

SELECT is_empty(
  $$ SELECT id FROM public.outings WHERE id = 'c3333333-3333-3333-3333-333333333333' $$,
  'outings : la sortie de Bob reste invisible pour Charlie'
);

SELECT isnt_empty(
  $$ UPDATE public.outing_participants SET status = 'accepted', responded_at = now()
     WHERE id = 'dddddddd-0000-0000-0000-000000000001' RETURNING id $$,
  'outing_participants : un invité peut répondre à son invitation'
);

SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT throws_ok(
  $$ INSERT INTO public.outing_participants (outing_id, user_id, status)
     VALUES ('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'accepted') $$,
  '42501', NULL,
  'outing_participants : l''organisateur ne peut pas forcer le statut accepted d''un invité'
);

SELECT throws_ok(
  $$ UPDATE public.planned_outings SET outing_id = 'c3333333-3333-3333-3333-333333333333'
     WHERE id = 'eeeeeeee-0000-0000-0000-000000000001' $$,
  '42501', NULL,
  'planned_outings : impossible de déplacer une étape vers une autre sortie'
);

SELECT isnt_empty(
  $$ UPDATE public.planned_outings SET title = 'Étape renommée', duration_min = 90
     WHERE id = 'eeeeeeee-0000-0000-0000-000000000001' RETURNING id $$,
  'planned_outings : le créateur peut toujours modifier son étape'
);

-- ============================================================
-- 3. places
-- ============================================================
SELECT is_empty(
  $$ UPDATE public.places SET website = 'https://evil.example'
     WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001' RETURNING id $$,
  'places : impossible de modifier un lieu externe importé par un autre utilisateur'
);

SELECT isnt_empty(
  $$ UPDATE public.places SET description = 'Mon spot'
     WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002' RETURNING id $$,
  'places : le propriétaire peut modifier son lieu'
);

-- ============================================================
-- 4. profiles : emails masqués
-- ============================================================
SELECT throws_ok(
  $$ SELECT email FROM public.profiles $$,
  '42501', NULL,
  'profiles : la colonne email n''est plus lisible directement'
);

SELECT isnt_empty(
  $$ SELECT id, full_name, avatar_url FROM public.profiles
     WHERE id = '22222222-2222-2222-2222-222222222222' $$,
  'profiles : nom et avatar restent lisibles'
);

SELECT throws_ok(
  $$ UPDATE public.profiles SET email = 'bob@crazer.app'
     WHERE id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', NULL,
  'profiles : impossible de réécrire son email public'
);

SELECT is(
  (SELECT email FROM public.search_profiles('bob@crazer.app')
   WHERE id = '22222222-2222-2222-2222-222222222222'),
  'bob@crazer.app',
  'search_profiles : un email exact trouve l''utilisateur, email visible pour un ami'
);

SELECT is_empty(
  $$ SELECT id FROM public.search_profiles('crazer.app') $$,
  'search_profiles : pas de recherche par fragment d''email'
);

SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob

SELECT is(
  (SELECT email FROM public.search_profiles('Charlie')
   WHERE id = '33333333-3333-3333-3333-333333333333'),
  NULL,
  'search_profiles : email masqué pour un non-ami trouvé par son nom'
);

SELECT is(
  (SELECT count(*)::int FROM public.search_profiles('a%')),
  0,
  'search_profiles : les jokers LIKE de la saisie sont échappés'
);

-- ============================================================
-- 5. Rôle anon
-- ============================================================
SELECT set_config('role', 'anon', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
  $$ SELECT id FROM public.outings $$,
  '42501', NULL,
  'anon : aucun accès à la table outings'
);

SELECT throws_ok(
  $$ SELECT public.is_outing_participant('c1111111-1111-1111-1111-111111111111',
                                          '11111111-1111-1111-1111-111111111111') $$,
  '42501', NULL,
  'anon : ne peut pas sonder l''appartenance aux sorties'
);

SELECT * FROM finish();
ROLLBACK;
