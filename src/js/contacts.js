import { render } from './render.js';
import { isConfigured, fetchAbsender, fetchEmpfaenger, saveAbsenderRecord, saveEmpfaengerRecord, deleteAbsenderRecord, deleteEmpfaengerRecord } from './supabase.js';
import { F } from './field-ids.js';

const DEFAULT_CONTACTS = [
  { strasse: "Gerbestrasse 22",    ort: "3550 Langnau i. E.", namen: ["Pneu Service Heinz Gerber","Herr Daniel Burkhalter","Herr Novotny Leos","Herr Krisztian Gombas"] },
  { strasse: "Herrengässli 1",     ort: "3532 Zäziwil",      namen: ["Frau Annemarie Kammermann","Laura und Andreas Mumenthaler","Herr Andreas Minder","Herr Markus Gehri"] },
  { strasse: "Gotthelfstrasse 12", ort: "3432 Lützelflüh",   namen: ["Herr Patrick Neuhaus","Frau Selina Schär, Herr Tim Rothenbühler","Jakob GmbH"] },
  { strasse: "Hausmattweg 3",      ort: "3323 Bäriswil",     namen: ["Herr Filipe Machado","Nick und Georgia Neuhaus","Frau Narissara Chiankrathok","Frau Rachel Schumacher, Herr Philip Erard"] },
];

const DEFAULT_COMPANIES = [
  {
    name: "G Investments & Real Estates AG",
    header_name: "G INVESTMENTS & REAL ESTATES AG",
    header_email: "ADMIN@G-INVESTMENTS-REALESTATES.CH",
    absender_name: "G Investments & Real Estates AG",
    absender_strasse: "Stygweg 21",
    absender_ort: "3504 Oberhünigen",
    bank_name: "Spar+Leihkasse Riggisberg AG",
    bank_strasse: "Grabenstrasse 7",
    bank_ort: "3132 Riggisberg",
    iban: "CH93 0637 4730 0382 2750 4",
  },
];

let contacts  = [];
let companies = [];

export async function loadContacts() {
  if (isConfigured()) {
    const rows = await fetchEmpfaenger();
    if (rows.length) {
      contacts = rows.map(r => ({
        strasse: r.strasse || '',
        ort:     r.ort     || '',
        namen:   [r.name],
        _id:     r.id,
      }));
      buildContactPicker();
      return;
    }
  }
  contacts = DEFAULT_CONTACTS;
  buildContactPicker();
}

export function buildContactPicker() {
  if (!contacts.length) return;
  const wrap = document.getElementById('contact-picker-wrap');
  const sel  = document.getElementById('contact-select');
  wrap.style.display = 'flex';
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
  if (isConfigured()) {
    const rows = await fetchAbsender();
    if (rows.length) {
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
      buildCompanyPicker();
      return;
    }
  }
  companies = DEFAULT_COMPANIES;
  buildCompanyPicker();
}

export function buildCompanyPicker() {
  if (!companies.length) return;
  const wrap = document.getElementById('company-picker-wrap');
  const sel  = document.getElementById('company-select');
  wrap.style.display = 'flex';
  companies.forEach((c, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = c.name;
    sel.appendChild(opt);
  });
  sel.value = '0';
  applyCompany();
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
    header_name:  document.getElementById(F.STELL_NAME)?.value?.trim(),
    header_email: document.getElementById(F.STELL_EMAIL)?.value?.trim() || '',
    bank_name:    document.getElementById(F.BANK_NAME)?.value?.trim() || '',
    bank_strasse: document.getElementById(F.BANK_STRASSE)?.value?.trim() || '',
    bank_ort:     document.getElementById(F.BANK_ORT)?.value?.trim() || '',
    iban:         document.getElementById(F.IBAN)?.value?.trim() || '',
    start_nummer: parseInt(document.getElementById(F.STELL_START_NR)?.value || '1', 10),
  };
  if (!record.name) { alert('Bitte Absender-Name eingeben.'); return; }
  const ok = await saveAbsenderRecord(record);
  if (ok) { alert('Absender gespeichert.'); await loadCompanies(); }
  else alert('Fehler beim Speichern.');
}

export async function saveCurrentEmpfaenger() {
  const record = {
    name:    document.getElementById(F.EMP_NAME)?.value?.trim(),
    strasse: document.getElementById(F.EMP_STRASSE)?.value?.trim() || '',
    ort:     document.getElementById(F.EMP_ORT)?.value?.trim() || '',
  };
  if (!record.name) { alert('Bitte Empfänger-Name eingeben.'); return; }
  const ok = await saveEmpfaengerRecord(record);
  if (ok) { alert('Empfänger gespeichert.'); await loadContacts(); }
  else alert('Fehler beim Speichern.');
}
