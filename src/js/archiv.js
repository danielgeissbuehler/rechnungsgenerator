import { state } from './state.js';
import { collectState, applyState } from './templates.js';
import {
  isConfigured,
  getNextInvoiceNumber,
  saveRechnung,
  saveEntwurf,
  fetchRechnungen,
  fetchRechnungById,
  deleteRechnung,
} from './supabase.js';
import { F } from './field-ids.js';

// ── Readonly Mode ─────────────────────────────────────────────────────────────
export function setReadonly(isReadonly) {
  state.isReadonly = isReadonly;

  const banner = document.getElementById('readonly-banner');
  if (banner) banner.style.display = isReadonly ? 'block' : 'none';

  // Disable/enable all form inputs
  const editor = document.getElementById('editor') || document.querySelector('.editor-panel');
  if (!editor) return;

  editor.classList.toggle('readonly', isReadonly);

  const selectors = 'input:not(#login-email):not(#login-password), textarea, select, [contenteditable]';
  editor.querySelectorAll(selectors).forEach(el => {
    if (el.hasAttribute('contenteditable')) {
      el.contentEditable = isReadonly ? 'false' : 'true';
    } else {
      el.disabled = isReadonly;
    }
  });
}

// ── Buchen ────────────────────────────────────────────────────────────────────
export async function bucheRechnung(draftId) {
  if (state.isReadonly) return;

  if (!isConfigured()) {
    window.showToast?.('Supabase nicht konfiguriert.', 'error');
    return;
  }

  const absenderName = document.getElementById(F.STELL_NAME)?.value?.trim();
  if (!absenderName) {
    window.showToast?.('Bitte zuerst den Absender ausfüllen.', 'warning');
    return;
  }

  const empfaengerName = document.getElementById(F.EMP_NAME)?.value?.trim() || '';

  const ok = await window.showConfirm(
    'Rechnung versenden',
    'Die Rechnung wird gespeichert und kann danach nicht mehr verändert werden.',
    'Versenden',
    { theme: 'amber', icon: 'send' },
  );
  if (!ok) return;

  // Get next number
  const nummer = await getNextInvoiceNumber(absenderName);
  if (nummer === null) {
    window.showToast?.('Fehler beim Abrufen der Rechnungsnummer.', 'error');
    return;
  }

  // Set the number in the title field if it exists
  const titelEl = document.getElementById(F.TITEL);
  if (titelEl && !titelEl.value) {
    titelEl.value = `Rechnung Nr. ${nummer}`;
  }

  // Collect total from positions
  const betrag = state.positions.reduce((sum, p) => {
    return sum + (parseFloat(p.qty || 0) * parseFloat(p.price || 0));
  }, 0);

  const waehrung = document.getElementById(F.CURRENCY)?.value || 'CHF';

  // Collect full state snapshot
  const snapshot = collectState();

  const record = {
    nummer,
    absender_name:   absenderName,
    empfaenger_name: empfaengerName,
    betrag:          Math.round(betrag * 20) / 20, // round to 0.05
    waehrung,
    daten:           snapshot,
  };

  // If this was a draft, update the existing row instead of inserting a new one
  const id_to_update = draftId || state.currentDraftId;
  if (id_to_update) {
    record.id = id_to_update;
  }

  const id = await saveRechnung(record);
  if (!id) {
    window.showToast?.('Fehler beim Speichern der Rechnung.', 'error');
    return;
  }

  state.currentDraftId = null;
  state.currentRechnungId = id;

  setReadonly(true);
  await renderArchivListe();
  window.loadRechnungen?.();
  window.showToast?.(`Rechnung Nr. ${nummer} wurde gebucht.`, 'success');
  setTimeout(() => window.showDashboard?.(), 300);
}

// ── Archiv laden ──────────────────────────────────────────────────────────────
export async function ladeEntwurf(id) {
  const rechnung = await fetchRechnungById(id);
  if (!rechnung) { window.showToast?.('Entwurf nicht gefunden.', 'error'); return; }

  applyState(rechnung.daten);
  setReadonly(false);
  state.currentDraftId = id;
  state.currentRechnungId = null;
}

export async function ladeAusArchiv(id) {
  const rechnung = await fetchRechnungById(id);
  if (!rechnung) { window.showToast?.('Rechnung nicht gefunden.', 'error'); return; }

  applyState(rechnung.daten);
  setReadonly(true);
  state.currentRechnungId = id;
  state.currentDraftId = null;
}

export async function loescheAusArchiv(id) {
  const confirmed = await window.showConfirm(
    'Rechnung löschen?',
    'Diese Aktion kann nicht rückgängig gemacht werden.'
  );
  if (!confirmed) return;
  const ok = await deleteRechnung(id);
  if (ok) await renderArchivListe();
  else window.showToast?.('Fehler beim Löschen.', 'error');
}

export async function neueRechnung() {
  if (state.isReadonly) {
    const ok = await window.showConfirm('Rechnung verlassen', 'Aktuelle gebuchte Rechnung verlassen?', 'Verlassen');
    if (!ok) return;
  }
  setReadonly(false);
  state.currentDraftId = null;
  state.currentRechnungId = null;
  // Clear key fields for a new invoice
  const titelEl = document.getElementById(F.TITEL);
  if (titelEl) titelEl.value = '';
}

// ── Entwurf speichern ─────────────────────────────────────────────────────────
export async function speichereEntwurf() {
  if (!isConfigured()) {
    window.showToast?.('Supabase nicht konfiguriert.', 'error');
    return;
  }

  const snapshot = collectState();

  const absenderName = document.getElementById(F.STELL_NAME)?.value?.trim() || '';
  const empfaengerName = document.getElementById(F.EMP_NAME)?.value?.trim() || '';

  const betrag = state.positions.reduce((sum, p) => {
    return sum + (parseFloat(p.qty || 0) * parseFloat(p.price || 0));
  }, 0);

  const waehrung = document.getElementById(F.CURRENCY)?.value || 'CHF';

  const record = {
    absender_name:   absenderName,
    empfaenger_name: empfaengerName,
    betrag:          Math.round(betrag * 20) / 20,
    waehrung,
    daten:           snapshot,
  };

  if (state.currentDraftId) {
    record.id = state.currentDraftId;
  }

  const id = await saveEntwurf(record);
  if (id) {
    state.currentDraftId = id;
    window.loadRechnungen?.();
  }
}

// ── Auto-save (debounced Entwurf) ─────────────────────────────────────────────
let _autoSaveTimer = null;

export function autoSave() {
  const editor = document.getElementById('view-editor');
  if (!editor || getComputedStyle(editor).display === 'none') return;
  if (state.isReadonly) return;
  if (state.currentRechnungId) return; // Viewing booked invoice — no draft save
  if (!isConfigured()) return;
  if (state.currentVorlageName) return; // Vorlage-Modus — kein Entwurf speichern

  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(async () => {
    await speichereEntwurf();
  }, 1500);
}

// ── Kopie einer Rechnung erstellen ────────────────────────────────────────────
export async function kopieRechnung(id) {
  const rechnung = await fetchRechnungById(id);
  if (!rechnung) return;

  applyState(rechnung.daten);
  setReadonly(false);
  state.currentDraftId = null;
  state.currentRechnungId = null;

  // Clear the title field so it doesn't carry over the original invoice number
  const titelEl = document.getElementById(F.TITEL);
  if (titelEl) titelEl.value = '';
}

// ── Archiv UI ─────────────────────────────────────────────────────────────────
const TRASH_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

function makeCell(text, cls) {
  const td = document.createElement('td');
  if (cls) td.className = cls;
  td.textContent = text;
  return td;
}

export async function renderArchivListe() {
  const container = document.getElementById('archiv-liste');
  if (!container) return;

  if (!isConfigured()) {
    container.replaceChildren();
    const p = document.createElement('p');
    p.className = 'archiv-hint';
    p.textContent = 'Supabase nicht konfiguriert — Archiv nicht verfügbar.';
    container.appendChild(p);
    return;
  }

  container.replaceChildren();
  const loadingP = document.createElement('p');
  loadingP.className = 'archiv-hint';
  loadingP.textContent = 'Lade…';
  container.appendChild(loadingP);

  const liste = await fetchRechnungen();
  container.replaceChildren();

  if (!liste.length) {
    const p = document.createElement('p');
    p.className = 'archiv-hint';
    p.textContent = 'Noch keine gebuchten Rechnungen.';
    container.appendChild(p);
    return;
  }

  const table = document.createElement('table');
  table.className = 'archiv-table';

  // Header
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Nr.', 'Empfänger', 'Betrag', 'Datum', ''].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body — click row to load, trash button to delete
  const tbody = document.createElement('tbody');
  liste.forEach(r => {
    const tr = document.createElement('tr');
    const datum = new Date(r.created_at).toLocaleDateString('de-CH');
    const betragStr = Number(r.betrag).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    tr.appendChild(makeCell(String(r.nummer), ''));
    tr.appendChild(makeCell(r.empfaenger_name || '—', 'archiv-td-name'));
    tr.appendChild(makeCell(`${betragStr} ${r.waehrung}`, ''));
    tr.appendChild(makeCell(datum, ''));

    // Trash button — stopPropagation so row click doesn't also fire
    const delTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-remove';
    delBtn.title = 'Löschen';
    delBtn.innerHTML = TRASH_SVG;
    delBtn.addEventListener('click', e => { e.stopPropagation(); loescheAusArchiv(r.id); });
    delTd.appendChild(delBtn);
    tr.appendChild(delTd);

    // Click row to load
    tr.addEventListener('click', () => ladeAusArchiv(r.id));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}
