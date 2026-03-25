import { state } from './state.js';
import { collectState, applyState } from './templates.js';
import {
  isConfigured,
  getNextInvoiceNumber,
  saveRechnung,
  fetchRechnungen,
  fetchRechnungById,
  deleteRechnung,
} from './supabase.js';

// ── Readonly Mode ─────────────────────────────────────────────────────────────
export function setReadonly(isReadonly) {
  state.isReadonly = isReadonly;

  const banner = document.getElementById('readonly-banner');
  if (banner) banner.style.display = isReadonly ? 'block' : 'none';

  const buchBtn = document.getElementById('buch-rechnung-btn');
  if (buchBtn) buchBtn.style.display = isReadonly ? 'none' : 'inline-flex';

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
export async function bucheRechnung() {
  if (state.isReadonly) return;

  if (!isConfigured()) {
    alert('Supabase nicht konfiguriert. Buchen nicht möglich.');
    return;
  }

  const absenderName = document.getElementById('f-stell-name')?.value?.trim();
  if (!absenderName) {
    alert('Bitte zuerst den Absender (Firma/Name) ausfüllen.');
    return;
  }

  const empfaengerName = document.getElementById('f-emp-name')?.value?.trim() || '';

  if (!confirm('Rechnung buchen?\n\nDie Rechnung wird gespeichert und kann danach nicht mehr verändert werden.')) {
    return;
  }

  // Get next number
  const nummer = await getNextInvoiceNumber(absenderName);
  if (nummer === null) {
    alert('Fehler beim Abrufen der Rechnungsnummer.');
    return;
  }

  // Set the number in the title field if it exists
  const titelEl = document.getElementById('f-titel');
  if (titelEl && !titelEl.value) {
    titelEl.value = `Rechnung Nr. ${nummer}`;
  }

  // Collect total from positions
  const betrag = state.positions.reduce((sum, p) => {
    return sum + (parseFloat(p.qty || 0) * parseFloat(p.price || 0));
  }, 0);

  const waehrung = document.getElementById('f-currency')?.value || 'CHF';

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

  const id = await saveRechnung(record);
  if (!id) {
    alert('Fehler beim Speichern der Rechnung.');
    return;
  }

  setReadonly(true);
  await renderArchivListe();
  alert(`Rechnung Nr. ${nummer} wurde gebucht.`);
}

// ── Archiv laden ──────────────────────────────────────────────────────────────
export async function ladeAusArchiv(id) {
  const rechnung = await fetchRechnungById(id);
  if (!rechnung) { alert('Rechnung nicht gefunden.'); return; }

  applyState(rechnung.daten);
  setReadonly(true);
}

export async function loescheAusArchiv(id) {
  if (!confirm('Rechnung wirklich löschen?')) return;
  const ok = await deleteRechnung(id);
  if (ok) await renderArchivListe();
  else alert('Fehler beim Löschen.');
}

export async function neueRechnung() {
  if (state.isReadonly && !confirm('Aktuelle gebuchte Rechnung verlassen? Änderungen sind nicht möglich.')) return;
  setReadonly(false);
  // Clear key fields for a new invoice
  const titelEl = document.getElementById('f-titel');
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
