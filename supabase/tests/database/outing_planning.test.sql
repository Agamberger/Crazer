-- ============================================================
-- pgTAP tests: planning of the day (feature/outing-planning)
-- Run: npm run db:test  (supabase test db, local stack required)
--
-- Seed accounts: Alice 1111… (organizer), Bob 2222… and Charlie 3333… (accepted).
-- Outing c4444… « Samedi entre potes » : one candidate day (today+3), start 14:00 Paris,
-- retained activities f5555… (Karting, placed as step e3333…) and f6666… (Restaurant, not placed).
-- Outing c2222… (Alice) : activities f1111… / f2222… not retained, Charlie not a member.
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(27);

CREATE FUNCTION pg_temp.login(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  SELECT set_config('role', 'authenticated', true);
$$;

-- ============================================================
-- 1. place_outing_activity
-- ============================================================
SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob

SELECT throws_ok(
  $$ SELECT public.place_outing_activity('f6666666-6666-6666-6666-666666666666',
       (CURRENT_DATE + 3 + TIME '18:00') AT TIME ZONE 'Europe/Paris', 90) $$,
  '42501', NULL, 'place : only the organizer places an activity'
);

SELECT throws_ok(
  $$ INSERT INTO public.planned_outings (outing_id, activity_id, title, scheduled_for, created_by)
     VALUES ('c4444444-4444-4444-4444-444444444444', 'f6666666-6666-6666-6666-666666666666',
             'Raccourci', now() + INTERVAL '10 days', '22222222-2222-2222-2222-222222222222') $$,
  '42501', NULL, 'place : activity_id cannot be written directly'
);

SELECT lives_ok(
  $$ INSERT INTO public.planned_outings (outing_id, title, scheduled_for, created_by)
     VALUES ('c4444444-4444-4444-4444-444444444444', 'Pause glace',
             now() + INTERVAL '10 days', '22222222-2222-2222-2222-222222222222') $$,
  'place : a member still adds a manual step'
);

SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT throws_ok(
  $$ SELECT public.place_outing_activity('f1111111-1111-1111-1111-111111111111',
       now() + INTERVAL '10 days', 60) $$,
  '22023', NULL, 'place : an activity that is not retained cannot be placed'
);

SELECT throws_ok(
  $$ SELECT public.place_outing_activity('f6666666-6666-6666-6666-666666666666',
       (CURRENT_DATE + 3 + TIME '18:00') AT TIME ZONE 'Europe/Paris', 0) $$,
  '22023', NULL, 'place : the duration must be positive'
);

SELECT throws_ok(
  $$ SELECT public.place_outing_activity('f5555555-5555-5555-5555-555555555555',
       (CURRENT_DATE + 3 + TIME '18:00') AT TIME ZONE 'Europe/Paris', 60) $$,
  '23505', NULL, 'place : an activity is placed only once'
);

SELECT lives_ok(
  $$ SELECT public.place_outing_activity('f6666666-6666-6666-6666-666666666666',
       (CURRENT_DATE + 3 + TIME '20:00') AT TIME ZONE 'Europe/Paris', 90) $$,
  'place : the organizer places a retained activity'
);

SELECT is(
  (SELECT row(title, place_id, duration_min, status)::text FROM public.planned_outings
   WHERE activity_id = 'f6666666-6666-6666-6666-666666666666'),
  row('Restaurant', 'b1111111-1111-1111-1111-111111111111'::uuid, 90,
      'pending'::public.planned_outing_status)::text,
  'place : the step copies the title and place of the activity'
);

DELETE FROM public.outing_activities WHERE id = 'f6666666-6666-6666-6666-666666666666';

SELECT is(
  (SELECT count(*)::int FROM public.planned_outings
   WHERE outing_id = 'c4444444-4444-4444-4444-444444444444'
     AND title = 'Restaurant' AND activity_id IS NULL),
  1, 'place : deleting the activity keeps its step, unlinked'
);

-- ============================================================
-- 2. reschedule_outing_steps
-- ============================================================
SELECT lives_ok(
  $$ SELECT public.reschedule_outing_steps('c4444444-4444-4444-4444-444444444444',
       jsonb_build_array(
         jsonb_build_object('id', 'e3333333-3333-3333-3333-333333333333',
           'scheduled_for', (CURRENT_DATE + 3 + TIME '12:30') AT TIME ZONE 'Europe/Paris',
           'duration_min', 120))) $$,
  'reschedule : the organizer moves a step before the outing start'
);

SELECT is(
  (SELECT start_date FROM public.outings WHERE id = 'c4444444-4444-4444-4444-444444444444'),
  (CURRENT_DATE + 3 + TIME '12:30') AT TIME ZONE 'Europe/Paris',
  'reschedule : the outing start date follows the earliest step'
);

SELECT is(
  (SELECT duration_min FROM public.planned_outings
   WHERE id = 'e3333333-3333-3333-3333-333333333333'),
  120, 'reschedule : the duration is saved'
);

SELECT throws_ok(
  $$ SELECT public.reschedule_outing_steps('c4444444-4444-4444-4444-444444444444',
       jsonb_build_array(jsonb_build_object('id', 'e1111111-1111-1111-1111-111111111111',
         'scheduled_for', now() + INTERVAL '10 days'))) $$,
  '22023', NULL, 'reschedule : a step of another outing is refused'
);

SELECT throws_ok(
  $$ SELECT public.reschedule_outing_steps('c4444444-4444-4444-4444-444444444444',
       jsonb_build_array(jsonb_build_object('id', 'e3333333-3333-3333-3333-333333333333',
         'scheduled_for', now() + INTERVAL '10 days', 'duration_min', -5))) $$,
  '22023', NULL, 'reschedule : a negative duration is refused'
);

SELECT throws_ok(
  $$ SELECT public.place_outing_activity('f5555555-5555-5555-5555-555555555555',
       (CURRENT_DATE + 5 + TIME '14:00') AT TIME ZONE 'Europe/Paris', 60) $$,
  '22023', NULL, 'place : a day-specific activity stays on its day'
);

UPDATE public.planned_outings SET status = 'cancelled'
WHERE id = 'e3333333-3333-3333-3333-333333333333';

SELECT throws_ok(
  $$ SELECT public.apply_outing_planning('c4444444-4444-4444-4444-444444444444',
       jsonb_build_array(jsonb_build_object('id', 'e3333333-3333-3333-3333-333333333333',
         'scheduled_for', (CURRENT_DATE + 3 + TIME '10:00') AT TIME ZONE 'Europe/Paris')),
       jsonb_build_array(jsonb_build_object('activity_id', 'f1111111-1111-1111-1111-111111111111',
         'scheduled_for', now() + INTERVAL '3 days', 'duration_min', 60))) $$,
  '22023', NULL, 'apply : an activity of another outing is refused'
);

SELECT is(
  (SELECT start_date FROM public.outings WHERE id = 'c4444444-4444-4444-4444-444444444444'),
  (CURRENT_DATE + 3 + TIME '12:30') AT TIME ZONE 'Europe/Paris',
  'apply : a failed apply changes nothing (one transaction)'
);

SELECT lives_ok(
  $$ SELECT public.apply_outing_planning('c4444444-4444-4444-4444-444444444444', '[]'::jsonb,
       jsonb_build_array(jsonb_build_object('activity_id', 'f5555555-5555-5555-5555-555555555555',
         'scheduled_for', (CURRENT_DATE + 3 + TIME '15:00') AT TIME ZONE 'Europe/Paris',
         'duration_min', 60))) $$,
  'apply : a cancelled step frees its activity, which is placed again'
);

SELECT is(
  (SELECT count(*)::int FROM public.planned_outings
   WHERE activity_id = 'f5555555-5555-5555-5555-555555555555'),
  2, 'apply : the cancelled step stays, the new step is linked'
);

SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob

SELECT throws_ok(
  $$ SELECT public.reschedule_outing_steps('c4444444-4444-4444-4444-444444444444',
       jsonb_build_array(jsonb_build_object('id', 'e3333333-3333-3333-3333-333333333333',
         'scheduled_for', now() + INTERVAL '10 days'))) $$,
  '42501', NULL, 'reschedule : only the organizer reorders the planning'
);

-- ============================================================
-- 3. set_my_outing_availability (late arrival)
-- ============================================================
SELECT pg_temp.login('33333333-3333-3333-3333-333333333333'); -- Charlie

SELECT lives_ok(
  $$ SELECT public.set_my_outing_availability('c4444444-4444-4444-4444-444444444444',
       CURRENT_DATE + 3, '19:00', '23:00') $$,
  'availability : a member changes their arrival time'
);

SELECT is(
  (SELECT row(start_time, end_time)::text FROM public.outing_availabilities
   WHERE outing_id = 'c4444444-4444-4444-4444-444444444444'
     AND user_id = '33333333-3333-3333-3333-333333333333'),
  row('19:00'::time, '23:00'::time)::text,
  'availability : the slot of the day is replaced'
);

SELECT throws_ok(
  $$ SELECT public.set_my_outing_availability('c4444444-4444-4444-4444-444444444444',
       CURRENT_DATE + 3, '23:00', '19:00') $$,
  '22023', NULL, 'availability : the slot must end after it starts'
);

SELECT throws_ok(
  $$ SELECT public.set_my_outing_availability('c4444444-4444-4444-4444-444444444444',
       CURRENT_DATE + 30, '19:00', '23:00') $$,
  '22023', NULL, 'availability : only a candidate day'
);

SELECT throws_ok(
  $$ SELECT public.set_my_outing_availability('c2222222-2222-2222-2222-222222222222',
       CURRENT_DATE + 5, '19:00', '23:00') $$,
  '42501', NULL, 'availability : a non-member cannot add a slot'
);

-- ============================================================
-- 4. Visibility and realtime
-- ============================================================
SELECT is_empty(
  $$ SELECT id FROM public.planned_outings
     WHERE outing_id = 'c2222222-2222-2222-2222-222222222222' $$,
  'steps : invisible to a non-member'
);

SELECT is(
  (SELECT count(*)::int FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime' AND tablename = 'planned_outings'),
  1, 'realtime : planned_outings is published'
);

SELECT * FROM finish();
ROLLBACK;
