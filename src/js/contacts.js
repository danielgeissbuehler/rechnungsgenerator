import { render } from './render.js';
import { isConfigured, fetchAbsender, fetchEmpfaenger, saveAbsenderRecord, saveEmpfaengerRecord, deleteAbsenderRecord, deleteEmpfaengerRecord } from './supabase.js';
import { F } from './field-ids.js';
import { createSearchableSelect } from './searchable-select.js';

let contacts  = [];
let companies = [];

/** @type {ReturnType<typeof createSearchableSelect>|null} */
let contactPicker = null;
/** @type {ReturnType<typeof createSearchableSelect>|null} */
let companyPicker = null;
/** @type {ReturnType<typeof createSearchableSelect>|null} */
let seContactPicker = null;
/** @type {ReturnType<typeof createSearchableSelect>|null} */
let seCompanyPicker = null;

// ── Helpers ──

function contactItems() {
  return contacts.map((loc, li) => {
    const streetLine = [loc.strasse, loc.hausnummer].filter(Boolean).join(' ');
    const ortLine    = [loc.plz, loc.ort].filter(Boolean).join(' ');
    return {
      value: `${li},0`,
      label: loc.namen[0],
      subtitle: [streetLine, ortLine].filter(Boolean).join(', '),
    };
  });
}

function companyItems() {
  return companies.map((c, i) => {
    const streetLine = [c.absender_strasse, c.absender_hausnummer].filter(Boolean).join(' ');
    const ortLine    = [c.absender_plz, c.absender_ort].filter(Boolean).join(' ');
    return {
      value: String(i),
      label: c.name,
      subtitle: [streetLine, ortLine].filter(Boolean).join(', '),
    };
  });
}

// ── Contact (Empfänger) ──

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
  if (!wrap) return;

  const items = contactItems();
  wrap.style.display = items.length ? 'flex' : 'none';

  const container = document.getElementById('contact-select');
  if (!container) return;

  if (contactPicker) {
    contactPicker.update(items, '');
  } else {
    contactPicker = createSearchableSelect(container, {
      placeholder: '— Empfänger wählen —',
      items,
      onSelect: (v) => {
        applyContact(v);
        // Sync simple editor picker
        if (seContactPicker) seContactPicker.setValue(v);
      },
    });
  }

  // Force simple editor to rebuild
  if (seContactPicker) {
    seContactPicker.update(items, contactPicker.getValue());
  }
}

export function applyContact(val) {
  const v = val ?? contactPicker?.getValue();
  if (!v) return;
  const [li] = v.split(',').map(Number);
  const loc = contacts[li];
  if (!loc) return;
  document.getElementById(F.EMP_NAME).value      = loc.namen[0];
  document.getElementById(F.EMP_STRASSE).value   = loc.strasse;
  document.getElementById(F.EMP_HAUSNUMMER).value = loc.hausnummer;
  document.getElementById(F.EMP_PLZ).value       = loc.plz;
  document.getElementById(F.EMP_ORT).value       = loc.ort;
  render();
}

// ── Company (Absender) ──

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
  if (!wrap) return;

  const items = companyItems();
  wrap.style.display = items.length ? 'flex' : 'none';

  const container = document.getElementById('company-select');
  if (!container) return;

  if (companyPicker) {
    companyPicker.update(items, companies.length ? '0' : '');
  } else {
    companyPicker = createSearchableSelect(container, {
      placeholder: '— Absender wählen —',
      items,
      selectedValue: companies.length ? '0' : '',
      onSelect: (v) => {
        applyCompany(v);
        // Sync simple editor picker
        if (seCompanyPicker) seCompanyPicker.setValue(v);
      },
    });
  }

  if (companies.length) {
    applyCompany('0');
  }

  // Force simple editor to rebuild
  if (seCompanyPicker) {
    seCompanyPicker.update(items, companyPicker.getValue());
  }
}

export function applyCompany(val) {
  const v = val ?? companyPicker?.getValue();
  if (v === '' || v == null) return;
  const c = companies[Number(v)];
  if (!c) return;
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

// ── Simple editor pickers (created on first sync) ──

export function initSimpleContactPicker() {
  const container = document.getElementById('se-contact-select');
  if (!container || seContactPicker) return;
  seContactPicker = createSearchableSelect(container, {
    placeholder: '— Empfänger wählen —',
    items: contactItems(),
    selectedValue: contactPicker?.getValue() || '',
    onSelect: (v) => {
      // Mirror to main picker
      if (contactPicker) contactPicker.setValue(v);
      applyContact(v);
      window._refreshEmpfaengerDisplay?.();
    },
  });
}

export function initSimpleCompanyPicker() {
  const container = document.getElementById('se-company-select');
  if (!container || seCompanyPicker) return;
  seCompanyPicker = createSearchableSelect(container, {
    placeholder: '— Absender wählen —',
    items: companyItems(),
    selectedValue: companyPicker?.getValue() || '',
    onSelect: (v) => {
      if (companyPicker) companyPicker.setValue(v);
      applyCompany(v);
      window._refreshAbsenderDisplay?.();
      // Bank readonly-Felder nachführen
      const seBankName = document.getElementById('se-bank-name');
      const seIban     = document.getElementById('se-iban');
      if (seBankName) seBankName.value = document.getElementById(F.BANK_NAME)?.value || '';
      if (seIban)     seIban.value     = document.getElementById(F.IBAN)?.value || '';
    },
  });
}

export function syncSimpleContactValue() {
  if (seContactPicker && contactPicker) {
    seContactPicker.update(contactItems(), contactPicker.getValue());
  }
}

export function syncSimpleCompanyValue() {
  if (seCompanyPicker && companyPicker) {
    seCompanyPicker.update(companyItems(), companyPicker.getValue());
  }
}

export function getContactPickerValue() {
  return contactPicker?.getValue() || '';
}

export function getCompanyPickerValue() {
  return companyPicker?.getValue() || '';
}

export function setContactPickerValue(v) {
  contactPicker?.setValue(v);
  if (seContactPicker) seContactPicker.setValue(v);
}

export function setCompanyPickerValue(v) {
  companyPicker?.setValue(v);
  if (seCompanyPicker) seCompanyPicker.setValue(v);
}

// ── Save ──

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
  if (!record.name) { window.showToast?.('Bitte Empfänger-Name eingeben.', 'warning'); return; }
  const result = await saveEmpfaengerRecord(record);
  if (result.ok) { window.showToast?.('Empfänger gespeichert.', 'success'); await loadContacts(); }
  else if (result.duplicate) window.showToast?.('Ein Empfänger mit diesem Namen existiert bereits.', 'warning');
  else window.showToast?.('Fehler beim Speichern.', 'error');
}
