-- ============================================================
-- Migration V2: Status-Spalte für Rechnungen + Entwurf-Support
-- Führe dieses Skript im Supabase SQL-Editor aus.
-- ============================================================

-- 1. Status-Spalte hinzufügen (Standard: 'offen' für alle bestehenden)
ALTER TABLE rechnungen
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'offen';

-- 2. Rechnungsnummer nullable machen (Entwürfe haben noch keine Nummer)
ALTER TABLE rechnungen
  ALTER COLUMN nummer DROP NOT NULL;

-- 3. Bestehende gebuchte Rechnungen explizit auf 'offen' setzen
UPDATE rechnungen SET status = 'offen' WHERE status = 'offen';

-- Status-Werte: 'entwurf' | 'offen' | 'versendet' | 'bezahlt' | 'storniert'
