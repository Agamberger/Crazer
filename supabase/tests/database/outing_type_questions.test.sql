-- ============================================================
-- pgTAP tests: outing type and guided questions (feature/outing-type-questions)
-- Run: npm run db:test  (supabase test db, local stack required)
--
-- Seed accounts: Alice 1111… (organizer), Bob 2222… (invited), Charlie 3333… (not a member)
-- Outing c2222… : precise, Alice already answered, Bob invited.
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(16);

CREATE FUNCTION pg_temp.login(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  SELECT set_config('role', 'authenticated', true);
$$;

-- ============================================================
-- 1. outing_type
-- ============================================================
SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob

SELECT is(
  (SELECT outing_type::text FROM public.outings WHERE id = 'c2222222-2222-2222-2222-222222222222'),
  'precise',
  'outings : un invité voit le type de la sortie'
);

UPDATE public.outings SET outing_type = 'holidays'
WHERE id = 'c2222222-2222-2222-2222-222222222222';

SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT is(
  (SELECT outing_type::text FROM public.outings WHERE id = 'c2222222-2222-2222-2222-222222222222'),
  'precise',
  'outings : un invité ne peut pas changer le type de la sortie'
);

SELECT lives_ok(
  $$ UPDATE public.outings SET outing_type = 'one_day'
     WHERE id = 'c2222222-2222-2222-2222-222222222222' $$,
  'outings : l''organisateur peut changer le type de la sortie'
);

SELECT throws_ok(
  $$ UPDATE public.outings SET outing_type = 'weekend'
     WHERE id = 'c2222222-2222-2222-2222-222222222222' $$,
  '22P02', NULL,
  'outings : un type inconnu est refusé'
);

-- ============================================================
-- 2. outing_answers visibility
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.outing_answers
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'),
  1,
  'outing_answers : l''organisateur voit ses réponses'
);

SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob

SELECT is(
  (SELECT count(*)::int FROM public.outing_answers
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'),
  1,
  'outing_answers : un invité voit les réponses de la sortie'
);

SELECT pg_temp.login('33333333-3333-3333-3333-333333333333'); -- Charlie

SELECT is_empty(
  $$ SELECT id FROM public.outing_answers
     WHERE outing_id = 'c2222222-2222-2222-2222-222222222222' $$,
  'outing_answers : invisibles pour un non-membre'
);

SELECT throws_ok(
  $$ INSERT INTO public.outing_answers (outing_id, user_id, eat_before)
     VALUES ('c2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', TRUE) $$,
  '42501', NULL,
  'outing_answers : un non-membre ne peut pas répondre'
);

-- ============================================================
-- 3. Writing answers
-- ============================================================
SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob

SELECT lives_ok(
  $$ INSERT INTO public.outing_answers (outing_id, user_id, eat_before, preferred_time)
     VALUES ('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
             TRUE, '20:00') $$,
  'outing_answers : un membre enregistre ses réponses'
);

SELECT throws_ok(
  $$ INSERT INTO public.outing_answers (outing_id, user_id, eat_before)
     VALUES ('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', TRUE) $$,
  '23505', NULL,
  'outing_answers : une seule ligne par membre et par sortie'
);

SELECT throws_ok(
  $$ UPDATE public.outing_answers SET period_start = '2030-02-10', period_end = '2030-02-01'
     WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'
       AND user_id = '22222222-2222-2222-2222-222222222222' $$,
  '23514', NULL,
  'outing_answers : la période doit finir après son début'
);

-- Bob tries to alter Alice's answers: RLS filters the row out.
UPDATE public.outing_answers SET eat_before = TRUE
WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'
  AND user_id = '11111111-1111-1111-1111-111111111111';

SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT is(
  (SELECT eat_before FROM public.outing_answers
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'
     AND user_id = '11111111-1111-1111-1111-111111111111'),
  FALSE,
  'outing_answers : on ne peut pas modifier les réponses d''un autre membre'
);

-- ============================================================
-- 4. Validation and declined members
-- ============================================================
SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT throws_ok(
  $$ UPDATE public.outing_answers SET wishes = ARRAY['teleportation']
     WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'
       AND user_id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', NULL,
  'outing_answers : une envie inconnue est refusée'
);

SELECT lives_ok(
  $$ SELECT public.create_outing_with_invites(
       'Vacances', ARRAY[CURRENT_DATE + 30], '[]'::jsonb, ARRAY[]::UUID[], 'holidays') $$,
  'create_outing_with_invites : accepte le type de sortie'
);

SELECT is(
  (SELECT outing_type::text FROM public.outings WHERE title = 'Vacances'),
  'holidays',
  'create_outing_with_invites : le type choisi est enregistré avec la sortie'
);

SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob
SELECT public.respond_to_outing_invitation(
  'c2222222-2222-2222-2222-222222222222', 'declined', '[]'::jsonb);

SELECT throws_ok(
  $$ UPDATE public.outing_answers SET eat_before = FALSE
     WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'
       AND user_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', NULL,
  'outing_answers : un membre qui a refusé ne peut plus répondre'
);

SELECT * FROM finish();
ROLLBACK;
