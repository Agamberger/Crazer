-- ============================================================
-- CRAZER SEED: 03_PLACES.SQL
-- Lieux et points d'intérêt (POIs) de test avec géolocalisation PostGIS
-- ============================================================

INSERT INTO public.places (id, name, address, city, location, category, source, source_id)
VALUES
(
  'b1111111-1111-1111-1111-111111111111',
  'Le Burger Gourmet',
  '15 Rue de la Paix',
  'Paris',
  ST_SetSRID(ST_MakePoint(2.3308, 48.8698), 4326)::geography,
  'resto',
  'custom',
  'custom-burger-1'
),
(
  'b2222222-2222-2222-2222-222222222222',
  'Bowling de Montparnasse',
  '25 Rue du Commandant René Mouchotte',
  'Paris',
  ST_SetSRID(ST_MakePoint(2.3211, 48.8402), 4326)::geography,
  'activite',
  'custom',
  'custom-bowling-1'
),
(
  'b3333333-3333-3333-3333-333333333333',
  'Le Rooftop Panoramique',
  '10 Place de la Bastille',
  'Paris',
  ST_SetSRID(ST_MakePoint(2.3691, 48.8530), 4326)::geography,
  'bar',
  'custom',
  'custom-bar-1'
)
ON CONFLICT (id) DO NOTHING;
