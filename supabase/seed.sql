-- ── Seed data ────────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor to populate initial data.
-- Safe to re-run: uses conflict handling / existence checks.

-- ── Vorlagen ──────────────────────────────────────────────────────────────────
INSERT INTO vorlagen (name, data) VALUES
(
  'Leere Rechnnung',
  $template1${
    "fields": {
      "f-company": "G INVESTMENTS & REAL ESTATES AG",
      "f-email": "ADMIN@G-INVESTMENTS-REALESTATES.CH",
      "f-heading": "RECHNUNG",
      "f-emp-name": "Name Empfänger",
      "f-emp-strasse": "Strasse Empfänger",
      "f-emp-ort": "PLZ / ORT Empfänger",
      "f-stell-name": "G Investments & Real Estates AG",
      "f-stell-adresse": "Stygweg 21",
      "f-stell-ort": "3504 Oberhünigen",
      "f-titel": "TITEL",
      "f-currency": "CHF",
      "f-col-pos": "POSITION",
      "f-col-preis": "PREIS",
      "f-col-menge": "MENGE",
      "f-col-total": "TOTAL",
      "f-col-extra5": "",
      "f-col-extra6": "",
      "f-col-extra7": "",
      "f-col-extra8": "",
      "f-bank-name": "Spar+Leihkasse Riggisberg AG",
      "f-bank-adresse": "Grabenstrasse 7",
      "f-iban": "CH93 0637 4730 0382 2750 4",
      "f-bank-strasse": "3132 Riggisberg"
    },
    "meta": [
      {"show": true,  "label": "DATUM",       "value": ""},
      {"show": false, "label": "ZEITRAUM",    "value": ""},
      {"show": false, "label": "ZAHLBAR BIS", "value": ""},
      {"show": false, "label": "REFERENZ",    "value": ""},
      {"show": false, "label": "KUNDEN-NR.",  "value": ""}
    ],
    "visibility": {
      "header": true, "heading": true, "empfaenger": true, "steller": true,
      "meta": true, "titel": true, "textblock": false, "positionen": true,
      "textblock2": false, "bank": true,
      "col1": true, "col2": true, "col3": true, "col4": true,
      "col5": false, "col6": false, "col7": false, "col8": false
    },
    "colAlign": {"1":"l","2":"r","3":"r","4":"r","5":"l","6":"l","7":"l","8":"l"},
    "positions": [],
    "textblock": "",
    "textblock2": "",
    "qtyTotal": false
  }$template1$::jsonb
),
(
  'Leeres Dokument',
  $template2${
    "fields": {
      "f-company": "G INVESTMENTS & REAL ESTATES AG",
      "f-email": "ADMIN@G-INVESTMENTS-REALESTATES.CH",
      "f-heading": "",
      "f-emp-name": "Name Empfänger",
      "f-emp-strasse": "Strasse Empfänger",
      "f-emp-ort": "PLZ / ORT Empfänger",
      "f-stell-name": "G Investments & Real Estates AG",
      "f-stell-adresse": "Stygweg 21",
      "f-stell-ort": "3504 Oberhünigen",
      "f-titel": "TITEL",
      "f-currency": "CHF",
      "f-col-pos": "POSITION",
      "f-col-preis": "PREIS",
      "f-col-menge": "MENGE",
      "f-col-total": "TOTAL",
      "f-col-extra5": "",
      "f-col-extra6": "",
      "f-col-extra7": "",
      "f-col-extra8": "",
      "f-bank-name": "",
      "f-bank-adresse": "",
      "f-iban": "",
      "f-bank-strasse": ""
    },
    "meta": [
      {"show": true,  "label": "DATUM",       "value": ""},
      {"show": false, "label": "ZEITRAUM",    "value": ""},
      {"show": false, "label": "ZAHLBAR BIS", "value": ""},
      {"show": false, "label": "REFERENZ",    "value": ""},
      {"show": false, "label": "KUNDEN-NR.",  "value": ""}
    ],
    "visibility": {
      "header": true, "heading": true, "empfaenger": true, "steller": true,
      "meta": true, "titel": true, "textblock": true, "positionen": false,
      "textblock2": false, "bank": true,
      "col1": true, "col2": true, "col3": true, "col4": true,
      "col5": false, "col6": false, "col7": false, "col8": false
    },
    "colAlign": {"1":"l","2":"r","3":"r","4":"r","5":"l","6":"l","7":"l","8":"l"},
    "positions": [],
    "textblock": "Sehr geehrte Damen und Herren<br><br>1.\u00a0",
    "textblock2": "",
    "qtyTotal": false
  }$template2$::jsonb
),
(
  'Stromrechnung 2025',
  $template3${
    "fields": {
      "f-company": "G INVESTMENTS & REAL ESTATES AG",
      "f-email": "ADMIN@G-INVESTMENTS-REALESTATES.CH",
      "f-heading": "RECHNUNG",
      "f-emp-name": "Name Empfänger",
      "f-emp-strasse": "Strasse Empfänger",
      "f-emp-ort": "PLZ Ort Empfänger",
      "f-stell-name": "G Investments & Real Estates AG",
      "f-stell-adresse": "Stygweg 21",
      "f-stell-ort": "3504 Oberhünigen",
      "f-titel": "Stromabrechnung 2025",
      "f-currency": "CHF",
      "f-col-pos": "Beschreibung",
      "f-col-preis": "PREIS CHF",
      "f-col-menge": "MENGE",
      "f-col-total": "TOTAL",
      "f-col-extra5": "01.01.25",
      "f-col-extra6": "31.12.25",
      "f-col-extra7": "",
      "f-col-extra8": "",
      "f-bank-name": "Spar+Leihkasse Riggisberg AG",
      "f-bank-adresse": "Grabenstrasse 7",
      "f-iban": "CH93 0637 4730 0382 2750 4",
      "f-bank-strasse": "3132 Riggisberg"
    },
    "meta": [
      {"show": true,  "label": "DATUM",        "value": ""},
      {"show": false, "label": "ZEITRAUM",     "value": ""},
      {"show": true,  "label": "ZAHLBAR bis",  "value": ""},
      {"show": false, "label": "REFERENZ",     "value": ""},
      {"show": false, "label": "KUNDEN-NR.",   "value": ""}
    ],
    "visibility": {
      "header": true, "heading": true, "empfaenger": true, "steller": true,
      "meta": true, "titel": true, "textblock": false, "positionen": true,
      "textblock2": true, "bank": true,
      "col1": true, "col2": true, "col3": true, "col4": true,
      "col5": true, "col6": true, "col7": false, "col8": true
    },
    "colAlign": {"1":"l","2":"r","3":"r","4":"r","5":"r","6":"r","7":"l","8":"l"},
    "positions": [
      {"id": 0, "desc": "Zählerstand / Strombezug kWh", "price": 0.23, "qty": 8713, "col5": "0",    "col6": "8713", "col7": "", "col8": "kWh"},
      {"id": 2, "desc": "Zählermiete / Monat",          "price": 7,    "qty": 12,   "col5": "",     "col6": "",     "col7": "", "col8": "Mte"},
      {"id": 1, "desc": "Abzug akonto",                 "price": 800,  "qty": -1,   "col5": "",     "col6": "",     "col7": "", "col8": ""}
    ],
    "textblock": "",
    "textblock2": "<p><br></p><p>- Einsparung auf eigenproduzierten Strom: 20%</p><p>- Einsparung Zähler: CHF 3.- / Monat</p>",
    "qtyTotal": false
  }$template3$::jsonb
)
ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data;


-- ── Absender ──────────────────────────────────────────────────────────────────
INSERT INTO absender (name, header_name, header_email, strasse, ort, bank_name, bank_strasse, bank_ort, iban, start_nummer)
SELECT 'G Investments & Real Estates AG', 'G INVESTMENTS & REAL ESTATES AG', 'ADMIN@G-INVESTMENTS-REALESTATES.CH',
       'Stygweg 21', '3504 Oberhünigen',
       'Spar+Leihkasse Riggisberg AG', 'Grabenstrasse 7', '3132 Riggisberg',
       'CH93 0637 4730 0382 2750 4', 1
WHERE NOT EXISTS (
  SELECT 1 FROM absender WHERE name = 'G Investments & Real Estates AG' AND user_id IS NULL
);

INSERT INTO absender (name, header_name, header_email, strasse, ort, bank_name, bank_strasse, bank_ort, iban, start_nummer)
SELECT 'J&B Invest AG', 'J&B INVEST AG', 'IMMO@JOELGEISSBUEHLER.CH',
       'Bahnhofstrasse 1', '3506 Grosshöchstetten',
       'Spar+Leihkasse Riggisberg AG', 'Grabenstrasse 7', '3132 Riggisberg',
       'CH44 0637 4730 0502 5192 4', 1
WHERE NOT EXISTS (
  SELECT 1 FROM absender WHERE name = 'J&B Invest AG' AND user_id IS NULL
);


-- ── Empfänger ─────────────────────────────────────────────────────────────────
-- Gerbestrasse 22, 3550 Langnau i. E.
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Pneu Service Heinz Gerber',          'Gerbestrasse 22', '3550 Langnau i. E.' WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Pneu Service Heinz Gerber'          AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Herr Daniel Burkhalter',             'Gerbestrasse 22', '3550 Langnau i. E.' WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Herr Daniel Burkhalter'             AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Herr Novotny Leos',                  'Gerbestrasse 22', '3550 Langnau i. E.' WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Herr Novotny Leos'                  AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Krisztian und Marietta Gombas',      'Gerbestrasse 22', '3550 Langnau i. E.' WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Krisztian und Marietta Gombas'      AND user_id IS NULL);

-- Herrengässli 1, 3532 Zäziwil
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Frau Annemarie Kammermann',          'Herrengässli 1',  '3532 Zäziwil'       WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Frau Annemarie Kammermann'          AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Laura und Andreas Mumenthaler',      'Herrengässli 1',  '3532 Zäziwil'       WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Laura und Andreas Mumenthaler'      AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Herr Andreas Minder',                'Herrengässli 1',  '3532 Zäziwil'       WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Herr Andreas Minder'                AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Herr Markus Gehri',                  'Herrengässli 1',  '3532 Zäziwil'       WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Herr Markus Gehri'                  AND user_id IS NULL);

-- Gotthelfstrasse 12, 3432 Lützelflüh
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Herr Patrick Neuhaus',               'Gotthelfstrasse 12', '3432 Lützelflüh' WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Herr Patrick Neuhaus'               AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Frau Selina Schär, Herr Tim Rothenbühler', 'Gotthelfstrasse 12', '3432 Lützelflüh' WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Frau Selina Schär, Herr Tim Rothenbühler' AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Jakob GmbH',                         'Gotthelfstrasse 12', '3432 Lützelflüh' WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Jakob GmbH'                         AND user_id IS NULL);

-- Hausmattweg 3, 3323 Bäriswil
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Herr Filipe Machado',                'Hausmattweg 3',   '3323 Bäriswil'      WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Herr Filipe Machado'                AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Nick und Georgia Neuhaus',           'Hausmattweg 3',   '3323 Bäriswil'      WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Nick und Georgia Neuhaus'           AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Frau Narissara Chiankrathok',        'Hausmattweg 3',   '3323 Bäriswil'      WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Frau Narissara Chiankrathok'        AND user_id IS NULL);
INSERT INTO empfaenger (name, strasse, ort) SELECT 'Frau Rachel Schumacher, Herr Philip Erard', 'Hausmattweg 3', '3323 Bäriswil' WHERE NOT EXISTS (SELECT 1 FROM empfaenger WHERE name = 'Frau Rachel Schumacher, Herr Philip Erard' AND user_id IS NULL);
