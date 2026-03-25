-- ============================================================
-- Rechnungsgenerator — Supabase Schema
-- Führe dieses Skript im Supabase SQL-Editor aus.
-- ============================================================

-- Vorlagen (bestehend, Anpassung: user_id ergänzen)
CREATE TABLE IF NOT EXISTS vorlagen (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  data       JSONB NOT NULL,
  user_id    UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Absender / Firmen
CREATE TABLE IF NOT EXISTS absender (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  header_name  TEXT,
  header_email TEXT,
  strasse      TEXT,
  ort          TEXT,
  bank_name    TEXT,
  bank_strasse TEXT,
  bank_ort     TEXT,
  iban         TEXT,
  start_nummer INT  NOT NULL DEFAULT 1,
  user_id      UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, user_id)
);

-- Empfänger / Kontakte
CREATE TABLE IF NOT EXISTS empfaenger (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  strasse    TEXT,
  ort        TEXT,
  user_id    UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, user_id)
);

-- Rechnungszähler (atomare Nummerierung pro Absender)
CREATE TABLE IF NOT EXISTS rechnungs_counter (
  absender_name TEXT NOT NULL,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  aktuell       INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (absender_name, user_id)
);

-- Rechnungsarchiv
CREATE TABLE IF NOT EXISTS rechnungen (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nummer          INT  NOT NULL,
  absender_name   TEXT,
  empfaenger_name TEXT,
  betrag          NUMERIC(10,2),
  waehrung        TEXT DEFAULT 'CHF',
  daten           JSONB NOT NULL,
  user_id         UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (absender_name, nummer, user_id)
);

-- ============================================================
-- Funktion: Atomare Rechnungsnummer pro Absender
-- ============================================================
CREATE OR REPLACE FUNCTION naechste_rechnungsnummer(p_absender TEXT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  next_num   INT;
  start_val  INT;
BEGIN
  -- Startwert aus absender-Tabelle holen (des aktuellen Users)
  SELECT COALESCE(start_nummer, 1)
    INTO start_val
    FROM absender
   WHERE name = p_absender
     AND user_id = auth.uid()
   LIMIT 1;

  IF start_val IS NULL THEN
    start_val := 1;
  END IF;

  -- First call: inserts with aktuell = start_val (no conflict) → returns start_val.
  -- Subsequent calls: conflict triggers aktuell + 1 → returns incremented value.
  INSERT INTO rechnungs_counter (absender_name, user_id, aktuell)
    VALUES (p_absender, auth.uid(), start_val)
    ON CONFLICT (absender_name, user_id)
    DO UPDATE SET aktuell = rechnungs_counter.aktuell + 1
    RETURNING aktuell INTO next_num;

  RETURN next_num;
END;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE vorlagen          ENABLE ROW LEVEL SECURITY;
ALTER TABLE absender          ENABLE ROW LEVEL SECURITY;
ALTER TABLE empfaenger        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rechnungs_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE rechnungen        ENABLE ROW LEVEL SECURITY;

-- Vorlagen: öffentlich lesbar (bestehende Logik), schreiben nur auth
DROP POLICY IF EXISTS "public_access" ON vorlagen;
CREATE POLICY "vorlagen_auth" ON vorlagen FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "absender_auth"          ON absender          FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "empfaenger_auth"        ON empfaenger        FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "rechnungs_counter_auth" ON rechnungs_counter FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "rechnungen_auth"        ON rechnungen        FOR ALL USING (auth.uid() IS NOT NULL);
