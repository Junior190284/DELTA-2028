-- DELTA-047: Idempotent and additive cleanup for pack_definitions
-- Ensures canonical theme and cards_count for standard_pack and matchday_booster
-- Does not alter drop rates, economy, or existing unopened user inventory.

UPDATE pack_definitions
SET 
  theme = 'standard',
  cards_count = 3
WHERE id = 'standard_pack' AND (theme IS DISTINCT FROM 'standard' OR cards_count IS DISTINCT FROM 3);

UPDATE pack_definitions
SET 
  theme = 'matchday',
  cards_count = 4
WHERE id = 'matchday_booster' AND (theme IS DISTINCT FROM 'matchday' OR cards_count IS DISTINCT FROM 4);

UPDATE pack_definitions
SET 
  theme = 'gold',
  cards_count = 5
WHERE id = 'gold_booster' AND (theme IS DISTINCT FROM 'gold' OR cards_count IS DISTINCT FROM 5);

UPDATE pack_definitions
SET 
  theme = 'inferno',
  cards_count = 5
WHERE id = 'inferno_booster' AND (theme IS DISTINCT FROM 'inferno' OR cards_count IS DISTINCT FROM 5);

UPDATE pack_definitions
SET 
  theme = 'legend',
  cards_count = 6
WHERE (id = 'legend_pack' OR id = 'legend_booster') AND (theme IS DISTINCT FROM 'legend' OR cards_count IS DISTINCT FROM 6);
