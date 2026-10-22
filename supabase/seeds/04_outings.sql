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
