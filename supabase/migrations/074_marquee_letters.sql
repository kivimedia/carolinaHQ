-- Migration 074: Marquee Letter Inventory System
-- Simple letter tracking: sets of letters, date-based bookings, availability checks

-- ============================================================================
-- TABLE: marquee_sets (each physical set of letters)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marquee_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE marquee_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marquee_sets_select" ON marquee_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "marquee_sets_all" ON marquee_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: marquee_letters (individual letters per set)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marquee_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES marquee_sets ON DELETE CASCADE,
  character TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(set_id, character)
);

ALTER TABLE marquee_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marquee_letters_select" ON marquee_letters FOR SELECT TO authenticated USING (true);
CREATE POLICY "marquee_letters_all" ON marquee_letters FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_marquee_letters_set ON marquee_letters(set_id);

-- ============================================================================
-- TABLE: marquee_bookings (date-based letter reservations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marquee_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES marquee_sets ON DELETE CASCADE,
  text TEXT NOT NULL,
  letters_needed JSONB NOT NULL,
  event_date DATE NOT NULL,
  end_date DATE,
  card_id UUID REFERENCES cards ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals ON DELETE SET NULL,
  client_name TEXT,
  event_name TEXT,
  status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'picked_up', 'returned', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE marquee_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marquee_bookings_select" ON marquee_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "marquee_bookings_all" ON marquee_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_marquee_bookings_set ON marquee_bookings(set_id);
CREATE INDEX idx_marquee_bookings_date ON marquee_bookings(event_date);
CREATE INDEX idx_marquee_bookings_status ON marquee_bookings(status) WHERE status NOT IN ('cancelled', 'returned');
CREATE INDEX idx_marquee_bookings_card ON marquee_bookings(card_id) WHERE card_id IS NOT NULL;

-- Auto-update updated_at
CREATE TRIGGER set_marquee_bookings_updated_at
  BEFORE UPDATE ON marquee_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCTION: marquee_availability(check_date, set_id)
-- Returns per-letter availability for a given date and set
-- ============================================================================

CREATE OR REPLACE FUNCTION marquee_availability(check_date DATE, check_set_id UUID)
RETURNS TABLE("character" TEXT, owned INTEGER, booked INTEGER, available INTEGER)
LANGUAGE sql STABLE
AS $$
  SELECT
    ml.character,
    ml.quantity AS owned,
    COALESCE(SUM(
      (mb.letters_needed ->> ml.character)::int
    ), 0)::int AS booked,
    (ml.quantity - COALESCE(SUM(
      (mb.letters_needed ->> ml.character)::int
    ), 0))::int AS available
  FROM marquee_letters ml
  LEFT JOIN marquee_bookings mb ON
    mb.set_id = ml.set_id
    AND mb.letters_needed ? ml.character
    AND mb.status NOT IN ('cancelled', 'returned')
    AND mb.event_date <= check_date
    AND COALESCE(mb.end_date, mb.event_date) >= check_date
  WHERE ml.is_active = true
    AND ml.set_id = check_set_id
  GROUP BY ml.character, ml.quantity
  ORDER BY ml.character;
$$;

-- ============================================================================
-- FUNCTION: marquee_conflicts(check_date, set_id, needed_letters JSONB)
-- Returns bookings that conflict with the requested letters on that date
-- ============================================================================

CREATE OR REPLACE FUNCTION marquee_conflicts(check_date DATE, check_set_id UUID, needed_letters JSONB)
RETURNS TABLE(booking_id UUID, booking_text TEXT, client_name TEXT, event_name TEXT, conflicting_letter TEXT, booked_qty INTEGER)
LANGUAGE sql STABLE
AS $$
  SELECT
    mb.id AS booking_id,
    mb.text AS booking_text,
    mb.client_name,
    mb.event_name,
    key AS conflicting_letter,
    (mb.letters_needed ->> key)::int AS booked_qty
  FROM marquee_bookings mb,
    jsonb_object_keys(needed_letters) AS key
  WHERE mb.set_id = check_set_id
    AND mb.status NOT IN ('cancelled', 'returned')
    AND mb.event_date <= check_date
    AND COALESCE(mb.end_date, mb.event_date) >= check_date
    AND mb.letters_needed ? key
  ORDER BY mb.event_date, key;
$$;

-- ============================================================================
-- SEED DATA: Default letter sets for Halley
-- ============================================================================

DO $$
DECLARE
  marquee_set_id UUID;
  led_set_id UUID;
  chars TEXT[];
  c TEXT;
BEGIN
  -- Set 1: Marquee 4ft
  INSERT INTO marquee_sets (name, description, display_order)
  VALUES ('Marquee 4ft', 'Classic light-up marquee letters, 4 feet tall', 0)
  RETURNING id INTO marquee_set_id;

  -- A-Z with extras for common letters
  chars := ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M',
                  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
                  '0','1','2','3','4','5','6','7','8','9','&','#','!'];

  FOREACH c IN ARRAY chars LOOP
    INSERT INTO marquee_letters (set_id, character, quantity)
    VALUES (
      marquee_set_id,
      c,
      CASE
        WHEN c IN ('E','S','T','A','O') THEN 2  -- common letters get 2
        WHEN c = '1' THEN 2                      -- '1' is common in numbers
        ELSE 1
      END
    );
  END LOOP;

  -- Set 2: LED 3ft
  INSERT INTO marquee_sets (name, description, display_order)
  VALUES ('LED 3ft', 'LED light-up letters, 3 feet tall', 1)
  RETURNING id INTO led_set_id;

  FOREACH c IN ARRAY chars LOOP
    INSERT INTO marquee_letters (set_id, character, quantity)
    VALUES (led_set_id, c, 1);
  END LOOP;
END $$;
