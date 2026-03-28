import { render } from './render.js';
import { isConfigured, fetchAbsender, fetchEmpfaenger, saveAbsenderRecord, saveEmpfaengerRecord, deleteAbsenderRecord, deleteEmpfaengerRecord } from './supabase.js';
import { F } from './field-ids.js';

let contacts  = [];
let companies = [];

export async function loadContacts() {
  contacts = [];
  if (isConfigured()) {
    const rows = await fetchEmpfaenger();
    contacts = rows.map(r => ({
      strasse:    r.strasse    || '',
      hausnummer: r.hausnummer || '',
      plz:        r.plz        || '',
      ort:        r.ort        || '',
      namen:      [r.name],
      _id:        r.id,
    }));
  }
  buildContactPicker();
}

export function buildContactPicker() {
  const wrap = document.getElementById('contact-picker-wrap');
  const sel  = document.getElementById('contact-select');
  if (!wrap || !sel) return;
  // Clear existing options before rebuilding
  sel.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '\u2014 Empf\u00E4nger w\u00E4hlen \u2014';
  sel.appendChild(placeholder);
  wrap.style.display = contacts.length ? 'flex' : 'none';
  contacts.forEach((loc, li) => {
    const grp = document.createElement('optgroup');
    const streetLine = [loc.strasse, loc.hausnummer].filter(Boolean).join(' ');
    const ortLine    = [loc.plz, loc.ort].filter(Boolean).join(' ');
    grp.label = [streetLine, ortLine].filter(Boolean).join(', ');
    loc.namen.forEach((name, ni) => {
      const opt = document.createElement('option');
      opt.value = `${li},${ni}`; opt.textContent = name;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  });
  // Force simple editor to re-sync on next fillSimpleEditor()
  const seSel = document.getElementById('se-contact-select');
  if (seSel) seSel.replaceChildren();
}

export function applyContact() {
  const sel = document.getElementById('contact-select');
  if (!sel.value) return;
  const [li, ni] = sel.value.split(',').map(Number);
  const loc = contacts[li];
  document.getElementById(F.EMP_NAME).value      = loc.namen[ni];
  document.getElementById(F.EMP_STRASSE).value   = loc.strasse;
  document.getElementById(F.EMP_HAUSNUMMER).value = loc.hausnummer;
  document.getElementById(F.EMP_PLZ).value       = loc.plz;
  document.getElementById(F.EMP_ORT).value       = loc.ort;
  render();
}

export async function loadCompanies() {
  companies = [];
  if (isConfigured()) {
    const rows = await fetchAbsender();
    companies = rows.map(r => ({
      name:                r.name             || '',
      header_name:         r.header_name      || r.name || '',
      header_email:        r.header_email     || '',
      absender_name:       r.name             || '',
      absender_strasse:    r.strasse          || '',
      absender_hausnummer: r.hausnummer       || '',
      absender_plz:        r.plz              || '',
      absender_ort:        r.ort              || '',
      bank_name:           r.bank_name        || '',
      bank_strasse:        r.bank_strasse     || '',
      bank_hausnummer:     r.bank_hausnummer  || '',
      bank_plz:            r.bank_plz         || '',
      bank_ort:            r.bank_ort         || '',
      iban:                r.iban             || '',
      start_nummer:        r.start_nummer     || 1,
      _id:                 r.id,
    }));
  }
  buildCompanyPicker();
}

export function buildCompanyPicker() {
  const wrap = document.getElementById('company-picker-wrap');
  const sel  = document.getElementById('company-select');
  if (!wrap || !sel) return;
  // Clear existing options before rebuilding
  sel.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '\u2014 Absender w\u00E4hlen \u2014';
  sel.appendChild(placeholder);
  wrap.style.display = companies.length ? 'flex' : 'none';
  companies.forEach((c, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = c.name;
    sel.appendChild(opt);
  });
  if (companies.length) {
    sel.value = '0';
    applyCompany();
  }
  // Force simple editor to re-sync on next fillSimpleEditor()
  const seSel = document.getElementById('se-company-select');
  if (seSel) seSel.replaceChildren();
}

export function applyCompany() {
  const sel = document.getElementById('company-select');
  if (sel.value === '') return;
  const c = companies[Number(sel.value)];
  document.getElementById(F.COMPANY).value          = c.header_name;
  document.getElementById(F.EMAIL).value            = c.header_email;
  document.getElementById(F.STELL_NAME).value       = c.absender_name;
  document.getElementById(F.STELL_ADRESSE).value    = c.absender_strasse;
  document.getElementById(F.STELL_HAUSNUMMER).value = c.absender_hausnummer;
  document.getElementById(F.STELL_PLZ).value        = c.absender_plz;
  document.getElementById(F.STELL_ORT).value        = c.absender_ort;
  document.getElementById(F.BANK_NAME).value        = c.bank_name;
  document.getElementById(F.BANK_ADRESSE).value     = c.bank_strasse;
  document.getElementById(F.BANK_HAUSNUMMER).value  = c.bank_hausnummer;
  document.getElementById(F.BANK_PLZ).value         = c.bank_plz;
  document.getElementById(F.BANK_ORT).value         = c.bank_ort;
  document.getElementById(F.IBAN).value             = c.iban;
  const startNrEl = document.getElementById(F.STELL_START_NR);
  if (startNrEl && c.start_nummer) startNrEl.value = c.start_nummer;
  render();
}

export async function saveCurrentAbsender() {
  const record = {
    name:            document.getElementById(F.STELL_NAME)?.value?.trim(),
    strasse:         document.getElementById(F.STELL_ADRESSE)?.value?.trim(),
    hausnummer:      document.getElementById(F.STELL_HAUSNUMMER)?.value?.trim() || '',
    plz:             document.getElementById(F.STELL_PLZ)?.value?.trim() || '',
    ort:             document.getElementById(F.STELL_ORT)?.value?.trim() || '',
    header_name:     document.getElementById(F.COMPANY)?.value?.trim() || '',
    header_email:    document.getElementById(F.EMAIL)?.value?.trim() || '',
    bank_name:       document.getElementById(F.BANK_NAME)?.value?.trim() || '',
    bank_strasse:    document.getElementById(F.BANK_ADRESSE)?.value?.trim() || '',
    bank_hausnummer: document.getElementById(F.BANK_HAUSNUMMER)?.value?.trim() || '',
    bank_plz:        document.getElementById(F.BANK_PLZ)?.value?.trim() || '',
    bank_ort:        document.getElementById(F.BANK_ORT)?.value?.trim() || '',
    iban:            document.getElementById(F.IBAN)?.value?.trim() || '',
    start_nummer:    parseInt(document.getElementById(F.STELL_START_NR)?.value || '1', 10),
  };
  if (!record.name) { window.showToast?.('Bitte Absender-Name eingeben.', 'warning'); return; }
  const result = await saveAbsenderRecord(record);
  if (result.ok) { window.showToast?.('Absender gespeichert.', 'success'); await loadCompanies(); }
  else if (result.duplicate) window.showToast?.('Ein Absender mit diesem Namen existiert bereits.', 'warning');
  else window.showToast?.('Fehler beim Speichern.', 'error');
}

export async function saveCurrentEmpfaenger() {
  const record = {
    name:       document.getElementById(F.EMP_NAME)?.value?.trim(),
    strasse:    document.getElementById(F.EMP_STRASSE)?.value?.trim() || '',
    hausnummer: document.getElementById(F.EMP_HAUSNUMMER)?.value?.trim() || '',
    plz:        document.getElementById(F.EMP_PLZ)?.value?.trim() || '',
    ort:        document.getElementById(F.EMP_ORT)?.value?.trim() || '',
  };
  if (!record.name) { window.showToast?.('Bitte Empf\u00E4nger-Name eingeben.', 'warning'); return; }
  const result = await saveEmpfaengerRecord(record);
  if (result.ok) { window.showToast?.('Empf\u00E4nger gespeichert.', 'success'); await loadContacts(); }
  else if (result.duplicate) window.showToast?.('Ein Empf\u00E4nger mit diesem Namen existiert bereits.', 'warning');
  else window.showToast?.('Fehler beim Speichern.', 'error');
}
