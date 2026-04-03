import type { Currency, InvoiceData } from './types';

/** Format amount with currency prefix: "CHF 4'200.00" (de-CH locale). */
export function formatCHF(betrag: number, waehrung: Currency = 'CHF'): string {
  const num = parseFloat(String(betrag)) || 0;
  const formatted = num.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${waehrung}\u00A0${formatted}`;
}

/** Format ISO date string → "29.03.2026" (de-CH locale). */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('de-CH');
}

/** Format number with de-CH locale and 2 decimal places. */
export function fmt(n: number): string {
  return Number(n).toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Safely read a field from invoice daten.fields. */
export function field(daten: InvoiceData | undefined | null, key: string): string {
  return (daten?.fields?.[key]) || '';
}

/** Find a meta field value by partial label match. */
export function findMeta(daten: InvoiceData | undefined | null, labelPart: string): string {
  const meta = daten?.meta || [];
  const found = meta.find(
    (m) => m.show && m.label && m.label.toLowerCase().includes(labelPart)
  );
  return found?.value || '';
}

/** Format invoice number: "#001" or "Entwurf". */
export function formatNummer(nummer: number | null): string {
  if (nummer == null) return 'Entwurf';
  return '#' + String(nummer).padStart(3, '0');
}

/** Build address string from parts. */
export function buildAddress(
  strasse?: string,
  hausnummer?: string,
  plz?: string,
  ort?: string
): string {
  const line1 = [strasse, hausnummer].filter(Boolean).join(' ');
  const line2 = [plz, ort].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}

/** Convert Swiss date (TT.MM.JJJJ) to ISO (YYYY-MM-DD) for input[type=date]. */
export function swissToIso(swiss: string): string {
  const parts = swiss.split('.');
  if (parts.length !== 3) return swiss;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/** Convert ISO (YYYY-MM-DD) to Swiss date (TT.MM.JJJJ). */
export function isoToSwiss(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}
