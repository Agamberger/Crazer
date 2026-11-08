-- ============================================================
-- pgTAP tests: outing scheduling (feature/outing-creation-invitations)
-- Run: npm run db:test  (supabase test db, local stack required)
--
-- Seed accounts:
--   Alice   11111111-1111-1111-1111-111111111111
--   Bob     22222222-2222-2222-2222-222222222222  (accepted friend of Alice)
--   Charlie 33333333-3333-3333-3333-333333333333  (pending request Alice → Charlie)
-- Outing c2222… (Alice, draft): days CURRENT_DATE + 5/6/7, Bob invited.
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(22);

CREATE FUNCTION pg_temp.login(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  SELECT set_config('role', 'authenticated', true);
$$;

-- ============================================================
-- 1. Visibility
-- ============================================================
SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob (invited)

SELECT is(
  (SELECT count(*)::int FROM public.outing_participants
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'),
  2,
  'outing_participants : un invité voit tous les participants de la sortie'
);

SELECT is(
  (SELECT count(*)::int FROM public.outing_days
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'),
  3,
  'outing_days : un invité voit les jours candidats'
);

SELECT is(
  (SELECT count(*)::int FROM public.outing_availabilities
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'),
  2,
  'outing_availabilities : un invité voit les dispos de l''organisateur'
);

SELECT pg_temp.login('33333333-3333-3333-3333-333333333333'); -- Charlie (not a member)

SELECT is_empty(
  $$ SELECT id FROM public.outing_days WHERE outing_id = 'c2222222-2222-2222-2222-222222222222' $$,
  'outing_days : invisibles pour un non-membre'
);

SELECT is_empty(
  $$ SELECT id FROM public.outing_availabilities
     WHERE outing_id = 'c2222222-2222-2222-2222-222222222222' $$,
  'outing_availabilities : invisibles pour un non-membre'
);

SELECT throws_ok(
  $$ SELECT public.respond_to_outing_invitation(
       'c2222222-2222-2222-2222-222222222222', 'accepted', '[]'::jsonb) $$,
  '42501', NULL,
  'respond_to_outing_invitation : refusé pour un non-invité'
);

-- ============================================================
-- 2. Writing availabilities
-- ============================================================
SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob

SELECT throws_ok(
  format(
    $$ INSERT INTO public.outing_availabilities (outing_id, user_id, day, start_time, end_time)
       VALUES ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
               %L, '10:00', '11:00') $$,
    CURRENT_DATE + 7),
  '42501', NULL,
  'outing_availabilities : impossible d''écrire les dispos de quelqu''un d''autre'
);

SELECT throws_ok(
  format(
    $$ SELECT public.respond_to_outing_invitation('c2222222-2222-2222-2222-222222222222',
         'accepted', '[{"day": "%s", "start": "19:00", "end": "22:00"}]'::jsonb) $$,
    CURRENT_DATE + 30),
  '22023', NULL,
  'respond_to_outing_invitation : un jour hors des jours candidats est refusé'
);

SELECT throws_ok(
  format(
    $$ SELECT public.respond_to_outing_invitation('c2222222-2222-2222-2222-222222222222',
         'accepted', '[{"day": "%s", "start": "22:00", "end": "19:00"}]'::jsonb) $$,
    CURRENT_DATE + 6),
  '23514', NULL,
  'respond_to_outing_invitation : un créneau dont la fin précède le début est refusé'
);

SELECT lives_ok(
  format(
    $$ SELECT public.respond_to_outing_invitation('c2222222-2222-2222-2222-222222222222',
         'accepted', '[{"day": "%s", "start": "19:00", "end": "22:00"}]'::jsonb) $$,
    CURRENT_DATE + 6),
  'respond_to_outing_invitation : un invité rejoint avec ses dispos'
);

SELECT is(
  (SELECT status::text FROM public.outing_participants
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'
     AND user_id = '22222222-2222-2222-2222-222222222222'),
  'accepted',
  'respond_to_outing_invitation : le statut passe à accepted'
);

SELECT lives_ok(
  $$ SELECT public.respond_to_outing_invitation(
       'c2222222-2222-2222-2222-222222222222', 'declined', NULL) $$,
  'respond_to_outing_invitation : un invité peut refuser'
);

SELECT is_empty(
  $$ SELECT id FROM public.outing_availabilities
     WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'
       AND user_id = '22222222-2222-2222-2222-222222222222' $$,
  'respond_to_outing_invitation : refuser supprime ses dispos'
);

-- ============================================================
-- 3. create_outing_with_invites
-- ============================================================
SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT throws_ok(
  format(
    $$ SELECT public.create_outing_with_invites('Sortie refusée', ARRAY[%L]::date[],
         '[]'::jsonb, ARRAY['33333333-3333-3333-3333-333333333333']::uuid[]) $$,
    CURRENT_DATE + 3),
  '42501', NULL,
  'create_outing_with_invites : impossible d''inviter un non-ami'
);

SELECT is_empty(
  $$ SELECT id FROM public.outings WHERE title = 'Sortie refusée' $$,
  'create_outing_with_invites : rien n''est créé quand une invitation est refusée'
);

SELECT public.create_outing_with_invites(
  'Glouglou', ARRAY[CURRENT_DATE + 3, CURRENT_DATE + 4]::date[],
  jsonb_build_array(jsonb_build_object('day', CURRENT_DATE + 3, 'start', '12:00', 'end', '21:00')),
  ARRAY['22222222-2222-2222-2222-222222222222']::uuid[]);

SELECT is(
  (SELECT count(*)::int FROM public.outing_participants op
   JOIN public.outings o ON o.id = op.outing_id
   WHERE o.title = 'Glouglou'),
  2,
  'create_outing_with_invites : organisateur accepté + ami invité'
);

SELECT is(
  (SELECT start_date FROM public.outings WHERE title = 'Glouglou'),
  NULL::timestamptz,
  'create_outing_with_invites : la sortie est créée sans date (start_date NULL)'
);

SELECT is(
  (SELECT status::text FROM public.outings WHERE title = 'Glouglou'),
  'draft',
  'create_outing_with_invites : la sortie sans date est un brouillon'
);

-- ============================================================
-- 4. Planned steps on undated / dated outings
-- ============================================================
SELECT lives_ok(
  $$ INSERT INTO public.planned_outings (outing_id, title, scheduled_for, created_by)
     SELECT id, 'Étape sans date', now() - INTERVAL '3 days', '11111111-1111-1111-1111-111111111111'
     FROM public.outings WHERE title = 'Glouglou' $$,
  'planned_outings : une étape peut être ajoutée à une sortie sans date'
);

SELECT lives_ok(
  $$ UPDATE public.outings SET start_date = now() + INTERVAL '10 days' WHERE title = 'Glouglou' $$,
  'outings : l''organisateur peut fixer une date plus tard'
);

SELECT cmp_ok(
  (SELECT p.scheduled_for FROM public.planned_outings p
   JOIN public.outings o ON o.id = p.outing_id
   WHERE o.title = 'Glouglou' AND p.title = 'Étape sans date'),
  '>=',
  (SELECT start_date FROM public.outings WHERE title = 'Glouglou'),
  'outings : fixer une date aligne les étapes antérieures sur cette date'
);

SELECT throws_ok(
  $$ INSERT INTO public.planned_outings (outing_id, title, scheduled_for, created_by)
     SELECT id, 'Trop tôt', now(), '11111111-1111-1111-1111-111111111111'
     FROM public.outings WHERE title = 'Glouglou' $$,
  'P0001', NULL,
  'planned_outings : une étape antérieure à la date fixée reste refusée'
);

SELECT * FROM finish();
ROLLBACK;
