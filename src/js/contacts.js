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
      strasse: r.strasse || '',
      ort:     r.ort     || '',
      namen:   [r.name],
      _id:     r.id,
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
    grp.label = `${loc.strasse}, ${loc.ort}`;
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
  document.getElementById(F.EMP_NAME).value    = loc.namen[ni];
  document.getElementById(F.EMP_STRASSE).value = loc.strasse;
  document.getElementById(F.EMP_ORT).value     = loc.ort;
  render();
}

export async function loadCompanies() {
  companies = [];
  if (isConfigured()) {
    const rows = await fetchAbsender();
    companies = rows.map(r => ({
      name:             r.name             || '',
      header_name:      r.header_name      || r.name || '',
      header_email:     r.header_email     || '',
      absender_name:    r.name             || '',
      absender_strasse: r.strasse          || '',
      absender_ort:     r.ort              || '',
      bank_name:        r.bank_name        || '',
      bank_strasse:     r.bank_strasse     || '',
      bank_ort:         r.bank_ort         || '',
      iban:             r.iban             || '',
      start_nummer:     r.start_nummer     || 1,
      _id:              r.id,
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
  document.getElementById(F.COMPANY).value       = c.header_name;
  document.getElementById(F.EMAIL).value         = c.header_email;
  document.getElementById(F.STELL_NAME).value    = c.absender_name;
  document.getElementById(F.STELL_ADRESSE).value = c.absender_strasse;
  document.getElementById(F.STELL_ORT).value     = c.absender_ort;
  document.getElementById(F.BANK_NAME).value     = c.bank_name;
  document.getElementById(F.BANK_ADRESSE).value  = c.bank_strasse;
  document.getElementById(F.BANK_STRASSE).value  = c.bank_ort;
  document.getElementById(F.IBAN).value          = c.iban;
  const startNrEl = document.getElementById(F.STELL_START_NR);
  if (startNrEl && c.start_nummer) startNrEl.value = c.start_nummer;
  render();
}

export async function saveCurrentAbsender() {
  const record = {
    name:         document.getElementById(F.STELL_NAME)?.value?.trim(),
    strasse:      document.getElementById(F.STELL_ADRESSE)?.value?.trim(),
    ort:          document.getElementById(F.STELL_ORT)?.value?.trim(),
    header_name:  document.getElementById(F.COMPANY)?.value?.trim() || '',
    header_email: document.getElementById(F.EMAIL)?.value?.trim() || '',
    bank_name:    document.getElementById(F.BANK_NAME)?.value?.trim() || '',
    bank_strasse: document.getElementById(F.BANK_ADRESSE)?.value?.trim() || '',
    bank_ort:     document.getElementById(F.BANK_STRASSE)?.value?.trim() || '',
    iban:         document.getElementById(F.IBAN)?.value?.trim() || '',
    start_nummer: parseInt(document.getElementById(F.STELL_START_NR)?.value || '1', 10),
  };
  if (!record.name) { window.showToast?.('Bitte Absender-Name eingeben.', 'warning'); return; }
  const ok = await saveAbsenderRecord(record);
  if (ok) { window.showToast?.('Absender gespeichert.', 'success'); await loadCompanies(); }
  else window.showToast?.('Fehler beim Speichern.', 'error');
}

export async function saveCurrentEmpfaenger() {
  const record = {
    name:    document.getElementById(F.EMP_NAME)?.value?.trim(),
    strasse: document.getElementById(F.EMP_STRASSE)?.value?.trim() || '',
    ort:     document.getElementById(F.EMP_ORT)?.value?.trim() || '',
  };
  if (!record.name) { window.showToast?.('Bitte Empfänger-Name eingeben.', 'warning'); return; }
  const ok = await saveEmpfaengerRecord(record);
  if (ok) { window.showToast?.('Empfänger gespeichert.', 'success'); await loadContacts(); }
  else window.showToast?.('Fehler beim Speichern.', 'error');
}
