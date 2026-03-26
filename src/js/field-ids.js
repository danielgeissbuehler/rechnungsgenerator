/** Single source of truth for #f-* form field IDs. */
export const F = {
  // Header
  COMPANY:       'f-company',
  EMAIL:         'f-email',
  HEADING:       'f-heading',

  // Empfaenger
  EMP_NAME:      'f-emp-name',
  EMP_STRASSE:   'f-emp-strasse',
  EMP_ORT:       'f-emp-ort',

  // Absender / Steller
  STELL_NAME:    'f-stell-name',
  STELL_ADRESSE: 'f-stell-adresse',
  STELL_ORT:     'f-stell-ort',
  STELL_EMAIL:   'f-stell-email',
  STELL_START_NR:'f-stell-start-nr',

  // Content
  TITEL:         'f-titel',
  CURRENCY:      'f-currency',
  TEXTBLOCK:     'f-textblock',
  TEXTBLOCK2:    'f-textblock2',

  // Table columns
  COL_POS:       'f-col-pos',
  COL_PREIS:     'f-col-preis',
  COL_MENGE:     'f-col-menge',
  COL_TOTAL:     'f-col-total',
  COL_EXTRA5:    'f-col-extra5',
  COL_EXTRA6:    'f-col-extra6',
  COL_EXTRA7:    'f-col-extra7',
  COL_EXTRA8:    'f-col-extra8',

  // Bank
  BANK_NAME:     'f-bank-name',
  BANK_ADRESSE:  'f-bank-adresse',
  BANK_STRASSE:  'f-bank-strasse',
  BANK_ORT:      'f-bank-ort',
  IBAN:          'f-iban',
};

/** All field IDs used for state collection/restore (excludes contenteditable textblocks). */
export const ALL_FIELD_IDS = [
  F.COMPANY, F.EMAIL, F.HEADING,
  F.EMP_NAME, F.EMP_STRASSE, F.EMP_ORT,
  F.STELL_NAME, F.STELL_ADRESSE, F.STELL_ORT,
  F.TITEL, F.CURRENCY,
  F.COL_POS, F.COL_PREIS, F.COL_MENGE, F.COL_TOTAL,
  F.COL_EXTRA5, F.COL_EXTRA6, F.COL_EXTRA7, F.COL_EXTRA8,
  F.BANK_NAME, F.BANK_ADRESSE, F.IBAN, F.BANK_STRASSE,
];
