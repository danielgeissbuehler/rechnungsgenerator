-- Migration: Remove 'versendet' status, add versendet_am timestamp
-- Run in Supabase SQL editor

-- 1. Add versendet_am column
ALTER TABLE rechnungen ADD COLUMN IF NOT EXISTS versendet_am TIMESTAMPTZ;

-- 2. Migrate existing 'versendet' rows → status='offen', versendet_am=updated_at
UPDATE rechnungen
SET status = 'offen',
    versendet_am = COALESCE(updated_at, created_at, NOW())
WHERE status = 'versendet';
