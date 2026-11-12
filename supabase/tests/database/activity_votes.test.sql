-- ============================================================
-- pgTAP tests: activity proposals and votes (feature/activity-votes)
-- Run: npm run db:test  (supabase test db, local stack required)
--
-- Seed accounts: Alice 1111… (organizer), Bob 2222… (invited), Charlie 3333… (not a member)
-- Outing c2222… : candidate days today+5..7, activities f1111… and f2222… on today+5.
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(21);

CREATE FUNCTION pg_temp.login(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  SELECT set_config('role', 'authenticated', true);
$$;

-- ============================================================
-- 1. Visibility
-- ============================================================
SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT is(
  (SELECT count(*)::int FROM public.outing_activities
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'),
  2, 'activities : the organizer sees the proposals'
);

SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob (invited)

SELECT is(
  (SELECT count(*)::int FROM public.outing_activities
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'),
  2, 'activities : an invited member sees the proposals'
);

SELECT pg_temp.login('33333333-3333-3333-3333-333333333333'); -- Charlie

SELECT is_empty(
  $$ SELECT id FROM public.outing_activities
     WHERE outing_id = 'c2222222-2222-2222-2222-222222222222' $$,
  'activities : invisible to a non-member'
);
SELECT is_empty(
  $$ SELECT id FROM public.outing_activity_votes
     WHERE outing_id = 'c2222222-2222-2222-2222-222222222222' $$,
  'votes : invisible to a non-member'
);

-- ============================================================
-- 2. Proposals
-- ============================================================
SELECT throws_ok(
  $$ INSERT INTO public.outing_activities (outing_id, day, title, proposed_by)
     VALUES ('c2222222-2222-2222-2222-222222222222', NULL, 'Intrus',
             '33333333-3333-3333-3333-333333333333') $$,
  '42501', NULL, 'activities : a non-member cannot propose'
);

SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob, still only invited

SELECT throws_ok(
  $$ INSERT INTO public.outing_activities (outing_id, day, title, proposed_by)
     VALUES ('c2222222-2222-2222-2222-222222222222', NULL, 'Trop tôt',
             '22222222-2222-2222-2222-222222222222') $$,
  '42501', NULL, 'activities : a member who has not joined yet cannot propose'
);

SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT lives_ok(
  $$ INSERT INTO public.outing_activities (outing_id, day, title, proposed_by)
     VALUES ('c2222222-2222-2222-2222-222222222222', NULL, 'Cinéma',
             '11111111-1111-1111-1111-111111111111') $$,
  'activities : an attendee proposes an activity without day'
);

SELECT lives_ok(
  $$ INSERT INTO public.outing_activities (id, outing_id, day, title, proposed_by, place_id)
     VALUES ('f3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222',
             NULL, 'Burger', '11111111-1111-1111-1111-111111111111',
             'b1111111-1111-1111-1111-111111111111') $$,
  'activities : an activity can be linked to a saved place'
);

SELECT throws_ok(
  $$ INSERT INTO public.outing_activities (outing_id, day, title, proposed_by, place_id)
     VALUES ('c2222222-2222-2222-2222-222222222222', NULL, 'Lieu inconnu',
             '11111111-1111-1111-1111-111111111111',
             'deadbeef-dead-beef-dead-beefdeadbeef') $$,
  '23503', NULL, 'activities : the place must exist'
);

SELECT throws_ok(
  $$ INSERT INTO public.outing_activities (outing_id, day, title, proposed_by)
     VALUES ('c2222222-2222-2222-2222-222222222222', CURRENT_DATE + 30, 'Hors jours',
             '11111111-1111-1111-1111-111111111111') $$,
  '23503', NULL, 'activities : the day must be a candidate day'
);

SELECT throws_ok(
  $$ INSERT INTO public.outing_activities (outing_id, day, title, proposed_by, chosen)
     VALUES ('c2222222-2222-2222-2222-222222222222', NULL, 'Déjà choisi',
             '11111111-1111-1111-1111-111111111111', TRUE) $$,
  '42501', NULL, 'activities : cannot be created already chosen'
);

SELECT throws_ok(
  $$ UPDATE public.outing_activities SET chosen = TRUE
     WHERE id = 'f2222222-2222-2222-2222-222222222222' $$,
  '42501', NULL, 'activities : chosen cannot be written directly'
);

-- ============================================================
-- 3. Votes
-- ============================================================
SELECT lives_ok(
  $$ INSERT INTO public.outing_activity_votes (activity_id, outing_id, user_id, vote)
     VALUES ('f2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222',
             '11111111-1111-1111-1111-111111111111', 'maybe') $$,
  'votes : an attendee votes'
);

SELECT throws_ok(
  $$ INSERT INTO public.outing_activity_votes (activity_id, outing_id, user_id, vote)
     VALUES ('f2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222',
             '11111111-1111-1111-1111-111111111111', 'accepted') $$,
  '23505', NULL, 'votes : one vote per member and activity'
);

SELECT throws_ok(
  $$ INSERT INTO public.outing_activity_votes (activity_id, outing_id, user_id, vote)
     VALUES ('f2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
             '11111111-1111-1111-1111-111111111111', 'accepted') $$,
  NULL, NULL, 'votes : outing_id must match the activity'
);

SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob, only invited

SELECT throws_ok(
  $$ INSERT INTO public.outing_activity_votes (activity_id, outing_id, user_id, vote)
     VALUES ('f1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222',
             '22222222-2222-2222-2222-222222222222', 'accepted') $$,
  '42501', NULL, 'votes : an invited member cannot vote before joining'
);

-- ============================================================
-- 4. Organizer RPCs
-- ============================================================
SELECT throws_ok(
  $$ SELECT public.choose_outing_activity('f1111111-1111-1111-1111-111111111111') $$,
  '42501', NULL, 'choose : refused to a non-organizer'
);
SELECT throws_ok(
  $$ SELECT public.draw_outing_activity('c2222222-2222-2222-2222-222222222222', CURRENT_DATE + 5) $$,
  '42501', NULL, 'draw : refused to a non-organizer'
);

SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

-- Alice voted accepted (2) on f1111… and maybe (1) on f2222…: f1111… leads the draw.
SELECT is(
  public.draw_outing_activity('c2222222-2222-2222-2222-222222222222', CURRENT_DATE + 5),
  'f1111111-1111-1111-1111-111111111111'::uuid,
  'draw : picks among the best scored activities'
);

SELECT public.choose_outing_activity('f2222222-2222-2222-2222-222222222222');
SELECT is(
  (SELECT array_agg(id ORDER BY id) FROM public.outing_activities WHERE chosen
     AND outing_id = 'c2222222-2222-2222-2222-222222222222' AND day = CURRENT_DATE + 5),
  ARRAY['f2222222-2222-2222-2222-222222222222']::uuid[],
  'choose : exactly one chosen activity per day'
);

SELECT public.reopen_outing_activities('c2222222-2222-2222-2222-222222222222', CURRENT_DATE + 5);
SELECT is(
  (SELECT count(*)::int FROM public.outing_activities WHERE chosen
     AND outing_id = 'c2222222-2222-2222-2222-222222222222'),
  0, 'reopen : no activity chosen any more'
);

SELECT * FROM finish();
ROLLBACK;
