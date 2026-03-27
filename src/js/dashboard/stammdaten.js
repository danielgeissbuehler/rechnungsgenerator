/**
 * dashboard/stammdaten.js — Stammdaten table rendering + CRUD for Absender, Empfänger, Vorlagen.
 */

import { escHtml, formatDate } from '../utils.js';
import {
  fetchAbsender, fetchEmpfaenger, fetchCloudTemplateRows,
  saveAbsenderRecord, saveEmpfaengerRecord,
  deleteAbsenderRecord, deleteEmpfaengerRecord,
  deleteCloudTemplate,
} from '../supabase.js';
import { loadTemplatesData, saveTemplatesData, loadTemplateByKey, autoSaveVorlage } from '../templates.js';
import { loadContacts, loadCompanies } from '../contacts.js';
import { loadVorlagen } from '../templates.js';
import { openModal, closeModal } from './modal.js';
import { state } from '../state.js';

// ── SVG icons (small, inline) ───────────────────────────────────────────────
const SVG_EDIT = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
const SVG_DEL  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

// ── Absender ────────────────────────────────────────────────────────────────

export async function renderAbsenderTable() {
  const container = document.getElementById('stamm-absender-table');
  if (!container) return;
  const rows = await fetchAbsender();

  if (!rows.length) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:13px">Keine Absender vorhanden.</div>';
    return;
  }

  const tbody = rows.map(function(r) {
    const sid = escHtml(r.id);
    return '<tr onclick="_editAbsender(\'' + sid + '\')" style="cursor:pointer">'
      + '<td class="td-name">' + escHtml(r.name) + '</td>'
      + '<td>' + escHtml(r.strasse || '\u2014') + '</td>'
      + '<td>' + escHtml(r.ort || '\u2014') + '</td>'
      + '<td>' + escHtml(r.bank_name || '\u2014') + '</td>'
      + '<td>' + escHtml(r.iban || '\u2014') + '</td>'
      + '<td class="td-actions">'
      +   '<button class="row-action-btn" title="Bearbeiten" onclick="event.stopPropagation();_editAbsender(\'' + sid + '\')">' + SVG_EDIT + '</button>'
      +   '<button class="row-action-btn row-action-btn-danger" title="L\u00F6schen" onclick="event.stopPropagation();_deleteAbsender(\'' + sid + '\')">' + SVG_DEL + '</button>'
      + '</td>'
      + '</tr>';
  }).join('');

  container.innerHTML = '<table>'
    + '<thead><tr>'
    + '<th>Name</th><th>Strasse</th><th>Ort</th><th>Bank</th><th>IBAN</th><th></th>'
    + '</tr></thead>'
    + '<tbody>' + tbody + '</tbody>'
    + '</table>';
}

export function openAbsenderModal(record) {
  openModal({
    title: record ? 'Absender bearbeiten' : 'Neuer Absender',
    sections: [
      {
        title: 'Firma',
        columns: 2,
        fields: [
          { key: 'name',         label: 'Firmenname',  required: true, value: record?.name || '', span: 2 },
          { key: 'header_name',  label: 'Anzeigename', value: record?.header_name || '' },
          { key: 'header_email', label: 'E-Mail',      value: record?.header_email || '' },
        ],
      },
      {
        title: 'Adresse',
        columns: 2,
        fields: [
          { key: 'strasse', label: 'Strasse', value: record?.strasse || '' },
          { key: 'ort',     label: 'PLZ / Ort', value: record?.ort || '' },
        ],
      },
      {
        title: 'Bankverbindung',
        columns: 2,
        fields: [
          { key: 'bank_name',    label: 'Bank',         value: record?.bank_name || '', span: 2 },
          { key: 'bank_strasse', label: 'Bank Strasse', value: record?.bank_strasse || '' },
          { key: 'bank_ort',     label: 'Bank Ort',     value: record?.bank_ort || '' },
          { key: 'iban',         label: 'IBAN',         value: record?.iban || '', span: 2 },
        ],
      },
      {
        title: 'Rechnungen',
        columns: 2,
        fields: [
          { key: 'start_nummer', label: 'Start-Nummer', type: 'number', value: String(record?.start_nummer || 1) },
        ],
      },
    ],
    onSave: async function(values) {
      if (record?.id) values.id = record.id;
      values.start_nummer = parseInt(values.start_nummer, 10) || 1;
      const ok = await saveAbsenderRecord(values);
      if (ok) {
        closeModal();
        await renderAbsenderTable();
        loadCompanies();
      } else {
        window.showToast?.('Fehler beim Speichern.', 'error');
      }
    },
  });
}

async function deleteAbsender(id) {
  const ok = await window.showConfirm('Absender l\u00F6schen', 'Diesen Absender wirklich l\u00F6schen?');
  if (!ok) return;
  const success = await deleteAbsenderRecord(id);
  if (success) {
    await renderAbsenderTable();
    loadCompanies();
  } else {
    window.showToast?.('Fehler beim Löschen.', 'error');
  }
}

async function editAbsender(id) {
  const rows = await fetchAbsender();
  const record = rows.find(function(r) { return r.id === id; });
  if (record) openAbsenderModal(record);
}

// ── Empfänger ───────────────────────────────────────────────────────────────

export async function renderEmpfaengerTable() {
  const container = document.getElementById('stamm-empfaenger-table');
  if (!container) return;
  const rows = await fetchEmpfaenger();

  if (!rows.length) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:13px">Keine Empf\u00E4nger vorhanden.</div>';
    return;
  }

  const tbody = rows.map(function(r) {
    const sid = escHtml(r.id);
    return '<tr onclick="_editEmpfaenger(\'' + sid + '\')" style="cursor:pointer">'
      + '<td class="td-name">' + escHtml(r.name) + '</td>'
      + '<td>' + escHtml(r.strasse || '\u2014') + '</td>'
      + '<td>' + escHtml(r.ort || '\u2014') + '</td>'
      + '<td class="td-actions">'
      +   '<button class="row-action-btn" title="Bearbeiten" onclick="event.stopPropagation();_editEmpfaenger(\'' + sid + '\')">' + SVG_EDIT + '</button>'
      +   '<button class="row-action-btn row-action-btn-danger" title="L\u00F6schen" onclick="event.stopPropagation();_deleteEmpfaenger(\'' + sid + '\')">' + SVG_DEL + '</button>'
      + '</td>'
      + '</tr>';
  }).join('');

  container.innerHTML = '<table>'
    + '<thead><tr>'
    + '<th>Name</th><th>Strasse</th><th>Ort</th><th></th>'
    + '</tr></thead>'
    + '<tbody>' + tbody + '</tbody>'
    + '</table>';
}

export function openEmpfaengerModal(record) {
  openModal({
    title: record ? 'Empf\u00E4nger bearbeiten' : 'Neuer Empf\u00E4nger',
    fields: [
      { key: 'name',    label: 'Name',    required: true, value: record?.name || '' },
      { key: 'strasse', label: 'Strasse', value: record?.strasse || '' },
      { key: 'ort',     label: 'Ort',     value: record?.ort || '' },
    ],
    onSave: async function(values) {
      if (record?.id) values.id = record.id;
      const ok = await saveEmpfaengerRecord(values);
      if (ok) {
        closeModal();
        await renderEmpfaengerTable();
        loadContacts();
      } else {
        window.showToast?.('Fehler beim Speichern.', 'error');
      }
    },
  });
}

async function deleteEmpfaenger(id) {
  const ok = await window.showConfirm('Empf\u00E4nger l\u00F6schen', 'Diesen Empf\u00E4nger wirklich l\u00F6schen?');
  if (!ok) return;
  const success = await deleteEmpfaengerRecord(id);
  if (success) {
    await renderEmpfaengerTable();
    loadContacts();
  } else {
    window.showToast?.('Fehler beim Löschen.', 'error');
  }
}

async function editEmpfaenger(id) {
  const rows = await fetchEmpfaenger();
  const record = rows.find(function(r) { return r.id === id; });
  if (record) openEmpfaengerModal(record);
}

// ── Vorlagen ────────────────────────────────────────────────────────────────

export async function renderVorlagenTable() {
  const container = document.getElementById('stamm-vorlagen-table');
  if (!container) return;

  const cloudRows = await fetchCloudTemplateRows();
  const localData = loadTemplatesData();
  const localKeys = Object.keys(localData).sort();

  const allRows = [];
  cloudRows.forEach(function(r) {
    allRows.push({ name: r.name, source: 'cloud', created_at: r.created_at, cloudName: r.name });
  });
  localKeys.forEach(function(name) {
    allRows.push({ name: name, source: 'local', created_at: null, cloudName: null });
  });

  if (!allRows.length) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:13px">Keine Vorlagen vorhanden.</div>';
    return;
  }

  const tbody = allRows.map(function(r) {
    const sourceBadge = r.source === 'cloud'
      ? '<span class="badge" style="background:#dbeafe;color:#1e40af">Cloud</span>'
      : '<span class="badge" style="background:#fef3c7;color:#92400e">Lokal</span>';
    const dateStr = r.created_at ? formatDate(r.created_at) : '\u2014';
    const safeName = escHtml(r.name);
    const safeSource = escHtml(r.source);
    const prefixedKey = safeSource + ':' + safeName;
    return '<tr onclick="_editVorlage(\'' + prefixedKey + '\')" style="cursor:pointer">'
      + '<td class="td-name">' + safeName + '</td>'
      + '<td>' + sourceBadge + '</td>'
      + '<td class="td-date">' + escHtml(dateStr) + '</td>'
      + '<td class="td-actions">'
      +   '<button class="row-action-btn row-action-btn-danger" title="L\u00F6schen"'
      +   ' onclick="event.stopPropagation();_deleteVorlage(\'' + safeName + '\',\'' + safeSource + '\')">' + SVG_DEL + '</button>'
      + '</td>'
      + '</tr>';
  }).join('');

  container.innerHTML = '<table>'
    + '<thead><tr>'
    + '<th>Name</th><th>Quelle</th><th>Erstellt</th><th></th>'
    + '</tr></thead>'
    + '<tbody>' + tbody + '</tbody>'
    + '</table>';
}

async function deleteVorlage(name, source) {
  const ok = await window.showConfirm('Vorlage l\u00F6schen', 'Vorlage "' + name + '" wirklich l\u00F6schen?');
  if (!ok) return;
  if (source === 'cloud') {
    const success = await deleteCloudTemplate(name);
    if (!success) { window.showToast?.('Fehler beim Löschen.', 'error'); return; }
  } else {
    const data = loadTemplatesData();
    delete data[name];
    saveTemplatesData(data);
  }
  await renderVorlagenTable();
  loadVorlagen();
}

// ── Open editor in Vorlage mode ─────────────────────────────────────────────
export function openVorlageEditor() {
  openModal({
    title: 'Neue Vorlage',
    fields: [
      { key: 'name', label: 'Vorlagename', required: true, placeholder: 'z.B. Standard-Rechnung' },
    ],
    saveLabel: 'Erstellen',
    onSave: function(values) {
      closeModal();
      if (typeof window.neueRechnung === 'function') window.neueRechnung();
      state.currentVorlageName = values.name;
      if (typeof window.showEditor === 'function') window.showEditor('vorlage', 'Vorlage: ' + values.name);
      const nameInput = document.getElementById('vorlage-name-input');
      if (nameInput) nameInput.value = values.name;
      // Trigger initial save
      autoSaveVorlage();
    },
  });
}

function editVorlage(prefixedKey) {
  const name = prefixedKey.indexOf(':') >= 0 ? prefixedKey.slice(prefixedKey.indexOf(':') + 1) : prefixedKey;
  if (typeof window.neueRechnung === 'function') window.neueRechnung();
  loadTemplateByKey(prefixedKey);
  state.currentVorlageName = name;
  if (typeof window.showEditor === 'function') window.showEditor('vorlage', 'Vorlage: ' + name);
  const nameInput = document.getElementById('vorlage-name-input');
  if (nameInput) nameInput.value = name;
}

// ── Window exports for inline onclick handlers ──────────────────────────────
window._editAbsender    = editAbsender;
window._deleteAbsender  = deleteAbsender;
window._editEmpfaenger  = editEmpfaenger;
window._deleteEmpfaenger = deleteEmpfaenger;
window._deleteVorlage   = deleteVorlage;
window._editVorlage     = editVorlage;
