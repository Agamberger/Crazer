-- ============================================================
-- CRAZER SEED: 04_OUTINGS.SQL
-- Sorties de test, participants et étapes planifiées
-- ============================================================

-- 1. SORTIES (public.outings)
INSERT INTO public.outings (id, title, description, start_date, created_by, status)
VALUES
(
  'c1111111-1111-1111-1111-111111111111',
  'Soirée Burger & Bowling',
  'Une soirée détente entre amis après les cours !',
  NOW() + INTERVAL '2 days',
  '11111111-1111-1111-1111-111111111111',
  'planned'
),
(
  'c2222222-2222-2222-2222-222222222222',
  'Apéro Rooftop Bastille',
  'Venez prendre un verre au coucher du soleil.',
  NOW() + INTERVAL '5 days',
  '11111111-1111-1111-1111-111111111111',
  'draft'
),
(
  'c3333333-3333-3333-3333-333333333333',
  'Session Escape Game',
  'Chrono 60 minutes pour sortir du labyrinthe.',
  NOW() + INTERVAL '10 days',
  '22222222-2222-2222-2222-222222222222',
  'planned'
)
ON CONFLICT (id) DO NOTHING;

-- 2. PARTICIPANTS AUX SORTIES (public.outing_participants)
INSERT INTO public.outing_participants (id, outing_id, user_id, status)
VALUES
(
  'd1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'accepted'
),
(
  'd2222222-2222-2222-2222-222222222222',
  'c1111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'accepted'
),
(
  'd3333333-3333-3333-3333-333333333333',
  'c2222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'accepted'
)
ON CONFLICT (id) DO NOTHING;

-- 3. ÉTAPES PLANIFIÉES (public.planned_outings)
INSERT INTO public.planned_outings (id, outing_id, place_id, title, notes, scheduled_for, duration_min, created_by)
VALUES
(
  'e1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'b1111111-1111-1111-1111-111111111111',
  'Repas au Burger Gourmet',
  'Réservation sous le nom d Alice',
  NOW() + INTERVAL '2 days',
  90,
  '11111111-1111-1111-1111-111111111111'
),
(
  'e2222222-2222-2222-2222-222222222222',
  'c1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'Partie de Bowling',
  'Pistes 3 et 4 réservées',
  NOW() + INTERVAL '2 days' + INTERVAL '1 hour 30 minutes',
  120,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

-- 4. INVITATION EN ATTENTE (Bob invité par Alice à l'apéro rooftop)
INSERT INTO public.outing_participants (id, outing_id, user_id, status)
VALUES
(
  'd4444444-4444-4444-4444-444444444444',
  'c2222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'invited'
)
ON CONFLICT (id) DO NOTHING;

-- 5. JOURS CANDIDATS (public.outing_days)
INSERT INTO public.outing_days (outing_id, day)
VALUES
  ('c2222222-2222-2222-2222-222222222222', CURRENT_DATE + 5),
  ('c2222222-2222-2222-2222-222222222222', CURRENT_DATE + 6),
  ('c2222222-2222-2222-2222-222222222222', CURRENT_DATE + 7)
ON CONFLICT (outing_id, day) DO NOTHING;

-- 6. DISPONIBILITÉS D'ALICE (public.outing_availabilities)
INSERT INTO public.outing_availabilities (outing_id, user_id, day, start_time, end_time)
VALUES
  ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   CURRENT_DATE + 5, '12:00', '21:00'),
  ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   CURRENT_DATE + 6, '18:00', '23:00')
ON CONFLICT (outing_id, user_id, day) DO NOTHING;

-- 7. TYPE DE SORTIE ET RÉPONSES GUIDÉES (étape 4)
-- Apéro rooftop : sortie précise ; Alice a déjà répondu, Bob non.
UPDATE public.outings
SET outing_type = 'precise'
WHERE id = 'c2222222-2222-2222-2222-222222222222' AND outing_type IS NULL;

INSERT INTO public.outing_answers (
  outing_id, user_id, activity_type, place_wish, preferred_time, eat_before
)
VALUES (
  'c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
  'drinks', 'Vue sur Paris', '19:30', FALSE
)
ON CONFLICT (outing_id, user_id) DO NOTHING;

-- 8. ACTIVITÉS PROPOSÉES ET VOTES (étape 5)
-- Apéro rooftop : deux propositions pour le premier jour, Alice vote pour la première.
INSERT INTO public.outing_activities (id, outing_id, day, title, note, proposed_by, place_id)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222',
   CURRENT_DATE + 5, 'Rooftop avec vue', 'Réservation possible à 19h',
   '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111'),
  ('f2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222',
   CURRENT_DATE + 5, 'Bar à jeux', NULL,
   '11111111-1111-1111-1111-111111111111', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.outing_activity_votes (activity_id, outing_id, user_id, vote)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111', 'accepted')
ON CONFLICT (activity_id, user_id) DO NOTHING;
