-- ============================================================
-- Migration: Adressfelder aufteilen
-- Strasse → strasse + hausnummer
-- PLZ/Ort  → plz + ort
-- Gilt für: absender, empfaenger
-- ============================================================
-- Hinweis: Hausnummer = letztes Token nach dem letzten Leerzeichen
--          PLZ        = führende Ziffernfolge (CH: 4-stellig)
--          Ort        = alles nach der PLZ inkl. mehrteilige Namen ("La Chaux-de-Fonds")
-- Dieses Skript ist IDEMPOTENT (IF NOT EXISTS / CASE WHEN).
-- ============================================================

-- ── absender ─────────────────────────────────────────────────────────────────

ALTER TABLE absender
  ADD COLUMN IF NOT EXISTS hausnummer     TEXT,
  ADD COLUMN IF NOT EXISTS plz            TEXT,
  ADD COLUMN IF NOT EXISTS bank_hausnummer TEXT,
  ADD COLUMN IF NOT EXISTS bank_plz       TEXT;

-- strasse → strasse (alles vor letztem Leerzeichen) + hausnummer (letztes Token)
UPDATE absender
SET
  hausnummer = CASE
    WHEN strasse LIKE '% %' THEN regexp_replace(strasse, '^.*\s+', '')
    ELSE NULL
  END,
  strasse = CASE
    WHEN strasse LIKE '% %' THEN regexp_replace(strasse, '\s+\S+$', '')
    ELSE strasse
  END
WHERE strasse IS NOT NULL AND hausnummer IS NULL;

-- ort → plz (führende Ziffern) + ort (Rest nach PLZ)
UPDATE absender
SET
  plz = (regexp_match(ort, '^\d+'))[1],
  ort = NULLIF(trim(regexp_replace(ort, '^\d+\s*', '')), '')
WHERE ort IS NOT NULL AND plz IS NULL;

-- bank_strasse → bank_strasse + bank_hausnummer
UPDATE absender
SET
  bank_hausnummer = CASE
    WHEN bank_strasse LIKE '% %' THEN regexp_replace(bank_strasse, '^.*\s+', '')
    ELSE NULL
  END,
  bank_strasse = CASE
    WHEN bank_strasse LIKE '% %' THEN regexp_replace(bank_strasse, '\s+\S+$', '')
    ELSE bank_strasse
  END
WHERE bank_strasse IS NOT NULL AND bank_hausnummer IS NULL;

-- bank_ort → bank_plz + bank_ort (nur Ortsname)
UPDATE absender
SET
  bank_plz = (regexp_match(bank_ort, '^\d+'))[1],
  bank_ort = NULLIF(trim(regexp_replace(bank_ort, '^\d+\s*', '')), '')
WHERE bank_ort IS NOT NULL AND bank_plz IS NULL;

-- ── empfaenger ────────────────────────────────────────────────────────────────

ALTER TABLE empfaenger
  ADD COLUMN IF NOT EXISTS hausnummer TEXT,
  ADD COLUMN IF NOT EXISTS plz        TEXT;

-- strasse → strasse + hausnummer
UPDATE empfaenger
SET
  hausnummer = CASE
    WHEN strasse LIKE '% %' THEN regexp_replace(strasse, '^.*\s+', '')
    ELSE NULL
  END,
  strasse = CASE
    WHEN strasse LIKE '% %' THEN regexp_replace(strasse, '\s+\S+$', '')
    ELSE strasse
  END
WHERE strasse IS NOT NULL AND hausnummer IS NULL;

-- ort → plz + ort
UPDATE empfaenger
SET
  plz = (regexp_match(ort, '^\d+'))[1],
  ort = NULLIF(trim(regexp_replace(ort, '^\d+\s*', '')), '')
WHERE ort IS NOT NULL AND plz IS NULL;
