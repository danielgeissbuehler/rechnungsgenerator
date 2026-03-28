import { SwissQRBill } from 'swissqrbill/svg';
import { F } from './field-ids.js';

/**
 * Fallback: parse a combined "PLZ ORT" string into { zip, city }.
 * Only used for old archived invoices that still have the combined format.
 */
function parseZipCity(str) {
  const s = (str || '').trim();
  const match = s.match(/^(\d{4,5})\s+(.+)$/);
  if (match) {
    return { zip: match[1], city: match[2] };
  }
  return { zip: '0000', city: s || 'Unbekannt' };
}

function getZipCity(plzFieldId, ortFieldId) {
  const plz = document.getElementById(plzFieldId)?.value?.trim() || '';
  const ort = document.getElementById(ortFieldId)?.value?.trim() || '';
  if (plz && ort) return { zip: plz, city: ort };
  // Backward compat: combined PLZ/Ort not yet split
  return parseZipCity([plz, ort].filter(Boolean).join(' '));
}

/**
 * Build a QR Bill page for a Swiss invoice.
 *
 * @param {number} total - The invoice total amount (already rounded).
 * @returns {Promise<string|null>} HTML string for the QR page, or null if IBAN is missing.
 */
export async function buildQRPage(total) {
  const iban = document.getElementById(F.IBAN)?.value?.trim();
  if (!iban) return null;

  const creditorName        = document.getElementById(F.STELL_NAME)?.value?.trim()        || '';
  const creditorStrasse     = document.getElementById(F.STELL_ADRESSE)?.value?.trim()     || '';
  const creditorHausnummer  = document.getElementById(F.STELL_HAUSNUMMER)?.value?.trim()  || '';
  const creditorAddress     = [creditorStrasse, creditorHausnummer].filter(Boolean).join(' ');

  const debtorName          = document.getElementById(F.EMP_NAME)?.value?.trim()          || '';
  const debtorStrasse       = document.getElementById(F.EMP_STRASSE)?.value?.trim()       || '';
  const debtorHausnummer    = document.getElementById(F.EMP_HAUSNUMMER)?.value?.trim()    || '';
  const debtorAddress       = [debtorStrasse, debtorHausnummer].filter(Boolean).join(' ');

  const currency = document.getElementById(F.CURRENCY)?.value?.trim() || 'CHF';

  // Try to find a reference value from the meta fields (label contains "REFERENZ")
  let reference;
  for (let i = 0; i < 5; i++) {
    const labelEl = document.getElementById(`mf-label-${i}`);
    const valueEl = document.getElementById(`mf-value-${i}`);
    if (labelEl && /referenz/i.test(labelEl.value) && valueEl?.value?.trim()) {
      reference = valueEl.value.trim();
      break;
    }
  }

  if (!creditorName || !creditorAddress) return null;

  const creditorZipCity = getZipCity(F.STELL_PLZ, F.STELL_ORT);

  const data = {
    currency,
    creditor: {
      account:  iban.replace(/\s/g, ''),
      name:     creditorName.slice(0, 70),
      address:  creditorAddress.slice(0, 70),
      zip:      creditorZipCity.zip,
      city:     creditorZipCity.city.slice(0, 35),
      country:  'CH',
    },
  };

  // Swiss QR standard: amount must be >= 0.01; omit for open-amount invoices
  if (typeof total === 'number' && isFinite(total) && total >= 0.01) {
    data.amount = Math.round(total * 100) / 100;
  }

  // Include debtor if we have enough data
  if (debtorName && debtorAddress) {
    const debtorZipCity = getZipCity(F.EMP_PLZ, F.EMP_ORT);
    if (debtorZipCity.zip !== '0000') {
      data.debtor = {
        name:    debtorName.slice(0, 70),
        address: debtorAddress.slice(0, 70),
        zip:     debtorZipCity.zip,
        city:    debtorZipCity.city.slice(0, 35),
        country: 'CH',
      };
    }
  }

  if (reference) {
    data.reference = reference.replace(/\s/g, '');
  }

  try {
    const bill = new SwissQRBill(data, { language: 'DE' });
    const svg  = bill.toString();
    return `<div class="a4-page qr-page">
  <div class="qr-slip-container">
    ${svg}
  </div>
</div>`;
  } catch (err) {
    console.error('QR Bill generation failed:', err);
    return null;
  }
}
