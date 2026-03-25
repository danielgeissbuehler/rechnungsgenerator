import { SwissQRBill } from 'swissqrbill/svg';

/**
 * Parse a combined "PLZ ORT" string into { zip, city }.
 * Handles formats like "3504 Oberhünigen" or "3504 Oberhünigen BE".
 */
function parseZipCity(str) {
  const s = (str || '').trim();
  const match = s.match(/^(\d{4,5})\s+(.+)$/);
  if (match) {
    return { zip: match[1], city: match[2] };
  }
  // fallback: use full string as city with placeholder zip
  return { zip: '0000', city: s || 'Unbekannt' };
}

/**
 * Build a QR Bill page for a Swiss invoice.
 *
 * @param {number} total - The invoice total amount (already rounded).
 * @returns {Promise<string|null>} HTML string for the QR page, or null if IBAN is missing.
 */
export async function buildQRPage(total) {
  const iban = document.getElementById('f-iban')?.value?.trim();
  if (!iban) return null;

  const creditorName    = document.getElementById('f-stell-name')?.value?.trim()    || '';
  const creditorAddress = document.getElementById('f-stell-adresse')?.value?.trim() || '';
  const creditorOrt     = document.getElementById('f-stell-ort')?.value?.trim()     || '';

  const debtorName    = document.getElementById('f-emp-name')?.value?.trim()    || '';
  const debtorAddress = document.getElementById('f-emp-strasse')?.value?.trim() || '';
  const debtorOrt     = document.getElementById('f-emp-ort')?.value?.trim()     || '';

  const currency = document.getElementById('f-currency')?.value?.trim() || 'CHF';

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

  const creditorZipCity = parseZipCity(creditorOrt);

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
  if (debtorName && debtorAddress && debtorOrt) {
    const debtorZipCity = parseZipCity(debtorOrt);
    data.debtor = {
      name:    debtorName.slice(0, 70),
      address: debtorAddress.slice(0, 70),
      zip:     debtorZipCity.zip,
      city:    debtorZipCity.city.slice(0, 35),
      country: 'CH',
    };
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
