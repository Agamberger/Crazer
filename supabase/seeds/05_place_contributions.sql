-- ============================================================
-- CRAZER SEED: 05_PLACE_CONTRIBUTIONS.SQL
-- Contributions des utilisateurs (phase 2) : avis et horaires.
-- Aucune photo : elles demandent des fichiers dans Storage (bucket place-photos).
-- ============================================================

-- Avis : Alice et Bob sur le Burger Gourmet, Charlie sur la Tour Eiffel (lieu Google)
INSERT INTO public.place_reviews (id, place_id, author_id, rating, comment)
VALUES
  ('a1a1a1a1-0000-4000-8000-000000000001', 'b1111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111', 5, 'Les meilleurs burgers du quartier'),
  ('a1a1a1a1-0000-4000-8000-000000000002', 'b1111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 4, NULL),
  ('a1a1a1a1-0000-4000-8000-000000000003', 'b4444444-4444-4444-4444-444444444444',
   '33333333-3333-3333-3333-333333333333', 5, 'Pique-nique parfait au pied de la tour')
ON CONFLICT (id) DO NOTHING;

-- Horaires du Bowling : proposés par Alice, confirmés par Bob et Charlie
INSERT INTO public.place_hours_proposals (id, place_id, proposed_by, periods, status, yes_count, no_count)
VALUES (
  'a2a2a2a2-0000-4000-8000-000000000001',
  'b2222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '[{"day":0,"open":"14:00","close":"23:00"},{"day":1,"open":"14:00","close":"23:00"},
    {"day":2,"open":"14:00","close":"23:00"},{"day":3,"open":"14:00","close":"23:00"},
    {"day":4,"open":"14:00","close":"02:00"},{"day":5,"open":"10:00","close":"02:00"},
    {"day":6,"open":"10:00","close":"23:00"}]',
  'confirmed', 2, 0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.place_hours_votes (proposal_id, voter_id, is_correct)
VALUES
  ('a2a2a2a2-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', true),
  ('a2a2a2a2-0000-4000-8000-000000000001', '33333333-3333-3333-3333-333333333333', true)
ON CONFLICT DO NOTHING;
