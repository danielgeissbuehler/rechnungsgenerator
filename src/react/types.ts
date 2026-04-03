// ── Invoice Status ──────────────────────────────────────────────────────────
export type InvoiceStatus = 'entwurf' | 'offen' | 'versendet' | 'bezahlt' | 'storniert';
export type Currency = 'CHF' | 'EUR' | 'USD';
export type ColAlign = 'l' | 'c' | 'r';

// ── Position (line item) ────────────────────────────────────────────────────
export interface Position {
  id: number;
  desc: string;
  price: number;
  qty: number;
  col5?: string;
  col6?: string;
  col7?: string;
  col8?: string;
}

// ── Meta field (Datum, Zahlbar bis, Referenz, etc.) ─────────────────────────
export interface MetaField {
  show: boolean;
  label: string;
  value: string;
}

// ── Invoice snapshot data (stored in daten JSONB) ───────────────────────────
export interface InvoiceData {
  fields: Record<string, string>;
  positions: Position[];
  meta: MetaField[];
  visibility: Record<string, boolean>;
  colAlign: Record<string, ColAlign>;
  textblock?: string;
  textblock2?: string;
  qtyTotal?: boolean;
  qrBill?: boolean;
}

// ── Full invoice record ─────────────────────────────────────────────────────
export interface Invoice {
  id: string;
  nummer: number | null;
  absender_name: string;
  empfaenger_name: string;
  betrag: number;
  waehrung: Currency;
  status: InvoiceStatus;
  created_at: string;
  daten: InvoiceData;
}

// ── Contact / Company (for pickers) ─────────────────────────────────────────
export interface Contact {
  id: string;
  name: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  ort?: string;
}

export interface Company {
  id: string;
  name: string;
  header_name?: string;
  header_email?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  ort?: string;
  bank_name?: string;
  iban?: string;
  start_nummer?: number;
}

// ── Field ID constants ──────────────────────────────────────────────────────
export const F = {
  // Header
  COMPANY: 'f-company',
  EMAIL: 'f-email',
  HEADING: 'f-heading',

  // Empfaenger
  EMP_NAME: 'f-emp-name',
  EMP_STRASSE: 'f-emp-strasse',
  EMP_HAUSNUMMER: 'f-emp-hausnummer',
  EMP_PLZ: 'f-emp-plz',
  EMP_ORT: 'f-emp-ort',

  // Absender / Steller
  STELL_NAME: 'f-stell-name',
  STELL_ADRESSE: 'f-stell-adresse',
  STELL_HAUSNUMMER: 'f-stell-hausnummer',
  STELL_PLZ: 'f-stell-plz',
  STELL_ORT: 'f-stell-ort',
  STELL_EMAIL: 'f-stell-email',
  STELL_START_NR: 'f-stell-start-nr',

  // Content
  TITEL: 'f-titel',
  CURRENCY: 'f-currency',
  TEXTBLOCK: 'f-textblock',
  TEXTBLOCK2: 'f-textblock2',

  // Table columns
  COL_POS: 'f-col-pos',
  COL_PREIS: 'f-col-preis',
  COL_MENGE: 'f-col-menge',
  COL_TOTAL: 'f-col-total',
  COL_EXTRA5: 'f-col-extra5',
  COL_EXTRA6: 'f-col-extra6',
  COL_EXTRA7: 'f-col-extra7',
  COL_EXTRA8: 'f-col-extra8',

  // Bank
  BANK_NAME: 'f-bank-name',
  BANK_ADRESSE: 'f-bank-adresse',
  BANK_HAUSNUMMER: 'f-bank-hausnummer',
  BANK_PLZ: 'f-bank-plz',
  BANK_ORT: 'f-bank-ort',
  BANK_STRASSE: 'f-bank-strasse',
  IBAN: 'f-iban',
} as const;

// ── Sort state ──────────────────────────────────────────────────────────────
export type SortCol = 'nummer' | 'empfaenger_name' | 'betrag' | 'status' | 'created_at';
export type SortDir = 'asc' | 'desc';
