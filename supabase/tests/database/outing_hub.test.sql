-- ============================================================
-- pgTAP tests: outing hub (feature/outing-creation-rework)
-- Run: npm run db:test  (supabase test db, local stack required)
--
-- Seed accounts: Alice 1111… (organizer), Bob 2222… (accepted friend of Alice),
-- Charlie 3333… (pending friend request from Alice).
-- Outing c2222… (Alice) : date on +5, days today+5/6/7, Alice slots on +5 and +6, Bob invited,
--   activities f1111… / f2222… on day +5, Alice voted for f1111….
-- Outing c4444… (Alice) : one day today+3 = chosen date, Bob and Charlie accepted,
--   retained activity Karting (f5555…) placed as a step on that day.
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
-- 1. create_outing_with_invites: days are optional
-- ============================================================
SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT lives_ok(
  $$ SELECT public.create_outing_with_invites('Sortie hub', ARRAY[]::DATE[], '[]'::jsonb,
       ARRAY[]::UUID[]) $$,
  'create : an outing can be created with its name only'
);

SELECT is(
  (SELECT count(*)::INT FROM public.outing_days d
   JOIN public.outings o ON o.id = d.outing_id
   WHERE o.title = 'Sortie hub'),
  0,
  'create : the outing has no candidate day yet'
);

SELECT is(
  (SELECT p.status::TEXT FROM public.outing_participants p
   JOIN public.outings o ON o.id = p.outing_id
   WHERE o.title = 'Sortie hub' AND p.user_id = '11111111-1111-1111-1111-111111111111'),
  'accepted',
  'create : the organizer attends the outing'
);

-- ============================================================
-- 2. set_outing_days
-- ============================================================
SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob

SELECT throws_ok(
  format($$ SELECT public.set_outing_days('c2222222-2222-2222-2222-222222222222',
       ARRAY['%s']::DATE[]) $$, CURRENT_DATE + 9),
  '42501', NULL, 'days : only the organizer changes the days'
);

SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT throws_ok(
  format($$ SELECT public.set_outing_days('c2222222-2222-2222-2222-222222222222',
       ARRAY['%s', '%s']::DATE[]) $$, CURRENT_DATE + 5, CURRENT_DATE - 1),
  '22023', NULL, 'days : a new day cannot be in the past'
);

SELECT throws_ok(
  format($$ SELECT public.set_outing_days('c4444444-4444-4444-4444-444444444444',
       ARRAY['%s']::DATE[]) $$, CURRENT_DATE + 4),
  '22023', NULL, 'days : a day cannot be removed while a day is chosen'
);

SELECT throws_ok(
  format($$ SELECT public.set_outing_days('c4444444-4444-4444-4444-444444444444',
       ARRAY['%s', '%s']::DATE[]) $$, CURRENT_DATE + 3, CURRENT_DATE + 4),
  '22023', NULL, 'days : a day cannot be added while a day is chosen'
);

UPDATE public.outings SET start_date = NULL WHERE id = 'c4444444-4444-4444-4444-444444444444';

SELECT throws_ok(
  format($$ SELECT public.set_outing_days('c4444444-4444-4444-4444-444444444444',
       ARRAY['%s']::DATE[]) $$, CURRENT_DATE + 4),
  '22023', NULL, 'days : a day with an activity placed in the planning cannot be removed'
);

-- « Retirer la date » first: the seed date of c2222… is on day +5.
UPDATE public.outings SET start_date = NULL WHERE id = 'c2222222-2222-2222-2222-222222222222';

SELECT lives_ok(
  format($$ SELECT public.set_outing_days('c2222222-2222-2222-2222-222222222222',
       ARRAY['%s', '%s']::DATE[]) $$, CURRENT_DATE + 6, CURRENT_DATE + 8),
  'days : the organizer replaces the days'
);

SELECT is(
  ARRAY(SELECT day FROM public.outing_days
        WHERE outing_id = 'c2222222-2222-2222-2222-222222222222' ORDER BY day),
  ARRAY[CURRENT_DATE + 6, CURRENT_DATE + 8],
  'days : removed days are deleted, new days are added'
);

SELECT is(
  ARRAY(SELECT day FROM public.outing_availabilities
        WHERE outing_id = 'c2222222-2222-2222-2222-222222222222'
          AND user_id = '11111111-1111-1111-1111-111111111111' ORDER BY day),
  ARRAY[CURRENT_DATE + 6],
  'days : slots of a removed day are deleted, the others are kept'
);

SELECT is(
  (SELECT count(*)::INT FROM public.outing_activities
   WHERE outing_id = 'c2222222-2222-2222-2222-222222222222' AND day IS NULL),
  2,
  'days : activities of a removed day move to « Peu importe »'
);

SELECT is(
  (SELECT count(*)::INT FROM public.outing_activity_votes
   WHERE activity_id = 'f1111111-1111-1111-1111-111111111111'),
  1,
  'days : votes of a moved activity are kept'
);

-- ============================================================
-- 3. invite_to_outing
-- ============================================================
SELECT throws_ok(
  $$ SELECT public.invite_to_outing('c2222222-2222-2222-2222-222222222222',
       ARRAY['33333333-3333-3333-3333-333333333333']::UUID[]) $$,
  '42501', NULL, 'invite : only accepted friends can be invited'
);

SELECT is(
  public.invite_to_outing('c2222222-2222-2222-2222-222222222222',
    ARRAY['22222222-2222-2222-2222-222222222222']::UUID[]),
  0,
  'invite : an already invited friend is not counted twice'
);

SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob

SELECT throws_ok(
  $$ SELECT public.invite_to_outing('c4444444-4444-4444-4444-444444444444',
       ARRAY['11111111-1111-1111-1111-111111111111']::UUID[]) $$,
  '42501', NULL, 'invite : only the organizer invites'
);

SELECT lives_ok(
  $$ SELECT public.respond_to_outing_invitation('c2222222-2222-2222-2222-222222222222',
       'declined', '[]'::jsonb) $$,
  'invite : Bob declines the invitation'
);

SELECT pg_temp.login('11111111-1111-1111-1111-111111111111'); -- Alice

SELECT is(
  public.invite_to_outing('c2222222-2222-2222-2222-222222222222',
    ARRAY['22222222-2222-2222-2222-222222222222']::UUID[]),
  1,
  'invite : a friend who declined can be invited again'
);

-- ============================================================
-- 4. set_my_outing_slots
-- ============================================================
SELECT pg_temp.login('22222222-2222-2222-2222-222222222222'); -- Bob, invited again

SELECT throws_ok(
  format($$ SELECT public.set_my_outing_slots('c2222222-2222-2222-2222-222222222222',
       '[{"day": "%s", "start": "19:00", "end": "22:00"}]'::jsonb) $$, CURRENT_DATE + 6),
  '42501', NULL, 'slots : a pending invitee answers the invitation instead'
);

SELECT pg_temp.login('33333333-3333-3333-3333-333333333333'); -- Charlie

SELECT throws_ok(
  format($$ SELECT public.set_my_outing_slots('c4444444-4444-4444-4444-444444444444',
       '[{"day": "%s", "start": "19:00", "end": "22:00"}]'::jsonb) $$, CURRENT_DATE + 30),
  '22023', NULL, 'slots : a day outside the candidate days is refused'
);

SELECT lives_ok(
  format($$ SELECT public.set_my_outing_slots('c4444444-4444-4444-4444-444444444444',
       '[{"day": "%s", "start": "19:00", "end": "23:00"}]'::jsonb) $$, CURRENT_DATE + 3),
  'slots : an attendee replaces their slots'
);

SELECT is(
  (SELECT row(start_time, end_time)::TEXT FROM public.outing_availabilities
   WHERE outing_id = 'c4444444-4444-4444-4444-444444444444'
     AND user_id = '33333333-3333-3333-3333-333333333333'),
  row(TIME '19:00', TIME '23:00')::TEXT,
  'slots : the new slot is saved'
);

SELECT * FROM finish();
ROLLBACK;
