/**
 * editor-simple.js — Vereinfachter Rechnungs-Editor.
 *
 * Zeigt nur die für eine Rechnung relevanten Felder (Empfänger, Absender,
 * Datum/Zeitraum, Titel, Textblöcke, Positionen-Tabelle, Bank/IBAN).
 * Sektionen werden gemäss state.visibility ein- oder ausgeblendet.
 *
 * Sync-Prinzip: Jedes #se-* Input schreibt via syncField() / syncRte() in
 * das entsprechende versteckte #f-* Feld im klassischen Editor.
 * render() liest weiterhin aus #f-* — keine Änderung an der Render-Pipeline.
 *
 * Alle exportierten Funktionen werden in main.js auf window.* gesetzt
 * (für onclick= Handler im HTML).
 */

import { state, COL_DEFS } from './state.js';
import { render } from './render.js';
import { fmt } from './utils.js';
import { F } from './field-ids.js';
import { rteInline, rteBlock, rteInsertHrInEditor, rteKeydown } from './rte.js';
import { initSimpleContactPicker, initSimpleCompanyPicker, syncSimpleContactValue, syncSimpleCompanyValue, setContactPickerValue } from './contacts.js';

// ── Hilfsfunktionen ────────────────────────────────────────────────────────────

/** getElementById Kurzform */
function el(id) { return document.getElementById(id); }

/** Setzt visibility eines Elements. */
function setVisible(id, visible) {
  const e = el(id);
  if (e) e.style.display = visible ? '' : 'none';
}

/** Liest den Wert eines #f-* Feldes (Input oder Textarea). */
function fVal(id) {
  const e = el(id);
  return e ? (e.value || '') : '';
}

// ── Spalten-Mapping: COL_DEF.n → Positions-Objekt-Feld ────────────────────────
const COL_FIELD = { 1: 'desc', 2: 'price', 3: 'qty', 4: null, 5: 'col5', 6: 'col6', 7: 'col7', 8: 'col8' };

/** Gibt die sichtbaren Spalten in COL_DEFS-Reihenfolge zurück (col4 immer am Ende). */
function getVisibleCols() {
  return COL_DEFS.filter(c => state.visibility['col' + c.n]);
}

/** Berechnet Total einer Position. */
function posTotal(pos) {
  if (state.col4Manual) return parseFloat(pos.total) || 0;
  const p = parseFloat(pos.price) || 0;
  const q = parseFloat(pos.qty)   || 0;
  return p * q;
}

/** fmtCHF → use imported fmt() from utils.js */
const fmtCHF = fmt;

// ── Haupt-Funktion: einfachen Editor befüllen ──────────────────────────────────

/**
 * Liest alle bestehenden #f-* Felder aus und befüllt damit den simple editor.
 * Blendet Sektionen gemäss state.visibility ein/aus.
 * Wird von showEditor() aufgerufen, nachdem applyState() die Daten geladen hat.
 */
export function fillSimpleEditor() {
  // Empfänger (readonly — wird durch applySimpleContact() aktualisiert)
  _refreshEmpfaengerDisplay();

  // Absender-Anzeige (readonly — wird durch applySimpleCompany() aktualisiert)
  _refreshAbsenderDisplay();

  // Titel
  const seTitel = el('se-titel');
  if (seTitel) seTitel.value = fVal(F.TITEL);

  // Währung
  const seCurrency = el('se-currency');
  if (seCurrency) seCurrency.value = fVal(F.CURRENCY) || 'CHF';

  // Textblöcke (HTML aus contenteditable → contenteditable)
  const seTb  = el('se-textblock');
  const seTb2 = el('se-textblock2');
  const mainTb  = el(F.TEXTBLOCK);
  const mainTb2 = el(F.TEXTBLOCK2);
  if (seTb  && mainTb)  seTb.innerHTML  = mainTb.innerHTML  || '';
  if (seTb2 && mainTb2) seTb2.innerHTML = mainTb2.innerHTML || '';

  // Bank (readonly)
  const seBankName = el('se-bank-name');
  const seIban     = el('se-iban');
  if (seBankName) seBankName.value = fVal(F.BANK_NAME);
  if (seIban)     seIban.value     = fVal(F.IBAN);

  // Sektionen ein-/ausblenden
  setVisible('se-card-meta',       state.visibility.meta);
  setVisible('se-card-titel',      state.visibility.titel);
  setVisible('se-card-textblock',  state.visibility.textblock);
  setVisible('se-card-positionen', state.visibility.positionen);
  setVisible('se-card-textblock2', state.visibility.textblock2);
  setVisible('se-card-bank',       state.visibility.bank);

  // Datum-Defaults: heute / heute + 1 Monat (nur wenn leer)
  _setDateDefaults();

  // Dynamische Sektionen aufbauen
  renderSimpleMeta();
  renderSimplePositions();

  // Contact/Company Picker synchronisieren
  initSimpleContactPicker();
  initSimpleCompanyPicker();
  syncSimpleContactValue();
  syncSimpleCompanyValue();

  // Clear contact picker if no empfänger in template/state
  if (!fVal(F.EMP_NAME)) setContactPickerValue('');
}

// ── Meta-Felder (Datum & Zeitraum) ────────────────────────────────────────────

/**
 * Baut die aktiven Meta-Felder (mf-show-N = checked) als Info-Items auf.
 * Nur sichtbare Felder werden angezeigt; Reihenfolge wie im Template definiert.
 */
export function renderSimpleMeta() {
  const wrap = el('se-meta-fields');
  if (!wrap) return;

  // Sicheres Leeren ohne innerHTML
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

  // Grid-Container
  const grid = document.createElement('div');
  grid.className = 'ig ig-meta';
  let hasAny = false;

  for (let i = 0; i < 5; i++) {
    const showChk = el('mf-show-' + i);
    if (!showChk || !showChk.checked) continue;

    const labelVal = el('mf-label-' + i)?.value || '';
    const valueVal = el('mf-value-' + i)?.value || '';

    const item = _buildMetaItem(i, labelVal, valueVal);
    grid.appendChild(item);
    hasAny = true;
  }

  if (hasAny) wrap.appendChild(grid);
  setVisible('se-card-meta', state.visibility.meta && hasAny);
}

/**
 * Erstellt ein editierbares Info-Item für ein Meta-Feld.
 * @param {number} i - Meta-Feld-Index (0–4)
 * @param {string} labelText - Label-Text (z.B. "DATUM")
 * @param {string} valueText - Aktueller Wert
 */
/**
 * Konvertiert TT.MM.JJJJ → YYYY-MM-DD (für date input).
 */
function _chToIso(ch) {
  const m = (ch || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/**
 * Konvertiert YYYY-MM-DD → TT.MM.JJJJ (Schweizer Format).
 */
function _isoToCh(iso) {
  const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

/** Setzt Datum (mf-value-0) auf heute und Zahlbar bis (mf-value-2) auf heute + 1 Monat, wenn leer. */
function _setDateDefaults() {
  const datumEl   = el('mf-value-0');
  const zahlbarEl = el('mf-value-2');
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmtCh = (d) => pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();

  if (datumEl && !datumEl.value) {
    datumEl.value = fmtCh(now);
  }
  if (zahlbarEl && !zahlbarEl.value) {
    const plus1m = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    zahlbarEl.value = fmtCh(plus1m);
  }
}

/** Indices der Meta-Felder die einen Date-Picker erhalten. */
const DATE_META_INDICES = new Set([0, 2]);

function _buildMetaItem(i, labelText, valueText) {
  const item = document.createElement('div');
  item.className = 'ii';

  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  item.appendChild(lbl);

  const isDate = DATE_META_INDICES.has(i);
  const inp = document.createElement('input');
  inp.type            = isDate ? 'date' : 'text';
  inp.value           = isDate ? _chToIso(valueText) : valueText;
  inp.placeholder     = '—';
  inp.dataset.metaIndex = i;
  inp.addEventListener('input', function() {
    const mfVal = el('mf-value-' + i);
    if (mfVal) mfVal.value = isDate ? _isoToCh(this.value) : this.value;
    render();
  });
  item.appendChild(inp);
  return item;
}

// ── Positions-Tabelle ──────────────────────────────────────────────────────────

/**
 * Rendert state.positions als Inline-Tabelle in #se-positions-wrap.
 * Spalten gemäss COL_DEFS, nur sichtbare werden angezeigt.
 */
export function renderSimplePositions() {
  const wrap = el('se-positions-wrap');
  if (!wrap) return;
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

  const cols = getVisibleCols();
  const readonly = state.isReadonly;

  // Tabelle aufbauen
  const table = document.createElement('table');
  table.className = 'se-pos-table';

  // thead
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');

  cols.forEach(c => {
    const th = document.createElement('th');
    const headerEl = el(c.inputId);
    th.textContent  = headerEl ? (headerEl.value || c.ph) : c.ph;
    if (c.n !== 1) th.className = 'r';  // alle ausser POSITION rechtsbündig
    trHead.appendChild(th);
  });
  // Löschen-Spalte (leer)
  if (!readonly) {
    const thDel = document.createElement('th');
    trHead.appendChild(thDel);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  // tbody
  const tbody = document.createElement('tbody');
  state.positions.forEach(pos => {
    const tr = document.createElement('tr');

    cols.forEach(c => {
      const td = document.createElement('td');
      if (c.n === 4 && !state.col4Manual) {
        // TOTAL: computed, readonly
        td.className = 'se-pos-total';
        td.textContent = fmtCHF(posTotal(pos));
      } else if (c.n === 4 && state.col4Manual) {
        // TOTAL: manual editable
        const inp = document.createElement('input');
        inp.className = 'se-pos-input r';
        inp.type = 'number'; inp.step = '0.05'; inp.min = '0';
        inp.value = pos.total ?? '';
        inp.placeholder = '0.00';
        if (readonly) {
          inp.readOnly = true;
        } else {
          inp.addEventListener('input', (function(pid) {
            return function() {
              const p = state.positions.find(p => p.id === pid);
              if (p) {
                p.total = parseFloat(this.value) || 0;
                _updateSimpleTotal();
                render();
              }
            };
          })(pos.id));
        }
        td.appendChild(inp);
      } else {
        // Editierbare Zelle
        const field = COL_FIELD[c.n];
        const inp = document.createElement('input');
        inp.className = 'se-pos-input' + (c.n !== 1 ? ' r' : '');
        inp.type      = c.n === 2 || c.n === 3 ? 'number' : 'text';
        inp.value     = pos[field] ?? '';
        inp.placeholder = c.n === 2 ? '0.00' : c.n === 3 ? '1' : '';
        if (c.n === 2 || c.n === 3) { inp.step = c.n === 2 ? '0.05' : '1'; inp.min = '0'; }
        if (readonly) {
          inp.readOnly = true;
        } else {
          inp.addEventListener('input', (function(pid, f, inputEl) {
            return function() {
              const val = f === 'price' || f === 'qty' ? parseFloat(this.value) || 0 : this.value;
              const p = state.positions.find(p => p.id === pid);
              if (p) {
                p[f] = val;
                // Total-Zelle in derselben Zeile aktualisieren
                const totalCell = inputEl.closest('tr')?.querySelector('.se-pos-total');
                if (totalCell) totalCell.textContent = fmtCHF(posTotal(p));
                // Feld im normalen Editor syncen (für render())
                _syncPositionToHidden(p);
                _updateSimpleTotal();
                render();
              }
            };
          })(pos.id, field, inp));
        }
        td.appendChild(inp);
      }
      tr.appendChild(td);
    });

    // Löschen-Button
    if (!readonly) {
      const tdDel = document.createElement('td');
      const btn = document.createElement('button');
      btn.className   = 'se-pos-del';
      btn.textContent = '×';
      btn.setAttribute('aria-label', 'Position löschen');
      btn.addEventListener('click', (function(pid) {
        return function() { removeSimplePosition(pid); };
      })(pos.id));
      tdDel.appendChild(btn);
      tr.appendChild(tdDel);
    }

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);

  _updateSimpleTotal();
}

/** Aktualisiert die Total-Anzeige unter der Tabelle. */
function _updateSimpleTotal() {
  const totalEl = el('se-total');
  if (!totalEl) return;

  const currency = el('se-currency')?.value || fVal(F.CURRENCY) || 'CHF';
  const total = state.positions.reduce((sum, p) => sum + posTotal(p), 0);
  totalEl.textContent = currency + ' ' + fmtCHF(total);
}

// ── Positions CRUD ─────────────────────────────────────────────────────────────

/** Fügt eine leere Position hinzu und re-rendert. */
export function addSimplePosition() {
  if (state.isReadonly) return;
  state.posId++;
  state.positions.push({ id: state.posId, desc: '', price: 0, qty: 1, col5: '', col6: '', col7: '', col8: '', total: 0 });
  renderSimplePositions();
  render();
}

/** Entfernt eine Position und re-rendert. */
export function removeSimplePosition(id) {
  if (state.isReadonly) return;
  state.positions = state.positions.filter(p => p.id !== id);
  renderSimplePositions();
  render();
}

// ── Sync-Funktionen ────────────────────────────────────────────────────────────

/**
 * Schreibt den Wert eines #se-* Inputs in das entsprechende #f-* Feld.
 * Wird als oninput-Handler im HTML verwendet.
 * @param {string} targetId - ID des Ziel-Feldes (z.B. 'f-emp-name')
 * @param {HTMLInputElement} inputEl - Das Quell-Element
 */
export function syncField(targetId, inputEl) {
  const t = el(targetId);
  if (t) t.value = inputEl.value;
}

/**
 * Schreibt den Wert einer Textarea in ein contenteditable div (plain text).
 * @param {string} targetId - ID des contenteditable Ziels
 * @param {HTMLTextAreaElement} textareaEl
 */
export function syncRte(targetId, textareaEl) {
  const t = el(targetId);
  if (t) t.textContent = textareaEl.value;
}

/** Sync HTML from a contenteditable div to the hidden full editor's contenteditable. */
export function syncRteHtml(targetId, sourceEl) {
  const t = el(targetId);
  if (t && sourceEl) {
    t.innerHTML = sourceEl.innerHTML;
  }
}

/** Map simple editor ID → hidden full editor ID */
function _seTarget(editorId) {
  return editorId === 'se-textblock' ? F.TEXTBLOCK : F.TEXTBLOCK2;
}

/** Sync simple editor → hidden editor + render. Called after every RTE action. */
function _seAfter(editorId) {
  const editor = el(editorId);
  if (editor) syncRteHtml(_seTarget(editorId), editor);
  render();
}

/** RTE inline command (bold/italic/underline). */
export function seRteCmd(cmd, editorId) {
  const tagMap = { bold: 'b', italic: 'i', underline: 'u' };
  rteInline(tagMap[cmd] || cmd, editorId);
  _seAfter(editorId);
}

/** RTE block command (h1/h2/h3/p). */
export function seRteBlock(tag, editorId) {
  rteBlock(tag, editorId);
  _seAfter(editorId);
}

/** RTE raw execCommand (lists, alignment, indent). */
export function seRteRaw(cmd, editorId) {
  const editor = el(editorId);
  if (!editor) return;
  editor.focus();
  document.execCommand('styleWithCSS', false, false);
  document.execCommand(cmd, false, null);
  _seAfter(editorId);
}

/** Insert horizontal rule. */
export function seRteHr(editorId) {
  rteInsertHrInEditor(editorId);
  _seAfter(editorId);
}

/** Keydown handler for heading → paragraph on Enter. */
export function seRteKeydown(e, editorId) {
  rteKeydown(e, editorId);
}

/**
 * Synchronisiert ein geändertes positions-Objekt in die #positions-list DOM
 * des versteckten vollen Editors (so dass collectState() konsistente Daten liest).
 * Da positions direkt in state.positions liegt, ist das nicht nötig —
 * collectState() liest state.positions direkt.
 */
function _syncPositionToHidden(pos) {
  // state.positions wurde bereits durch den Event-Handler aktualisiert.
  // Der volle Editor liest positions aus state (nicht aus der DOM).
  // Nichts zu tun.
}

// ── Absender / Empfänger ───────────────────────────────────────────────────────

// applySimpleContact / applySimpleCompany are now handled by SearchableSelect
// callbacks in contacts.js — kept as no-ops for backwards compat with window.*
export function applySimpleContact() {}
export function applySimpleCompany() {}

/** Aktualisiert die Empfänger-Anzeige aus den #f-emp-* Feldern. */
export function _refreshEmpfaengerDisplay() {
  const nameEl    = el('se-emp-display-name');
  const strasseEl = el('se-emp-display-strasse');
  const ortEl     = el('se-emp-display-ort');
  if (nameEl)    nameEl.value    = fVal(F.EMP_NAME);
  if (strasseEl) strasseEl.value = [fVal(F.EMP_STRASSE), fVal(F.EMP_HAUSNUMMER)].filter(Boolean).join(' ');
  if (ortEl)     ortEl.value     = [fVal(F.EMP_PLZ), fVal(F.EMP_ORT)].filter(Boolean).join(' ');
}

/** Aktualisiert die Absender-Anzeige aus den #f-stell-* Feldern. */
export function _refreshAbsenderDisplay() {
  const nameEl    = el('se-stell-name');
  const strasseEl = el('se-stell-strasse');
  const ortEl     = el('se-stell-ort');
  if (nameEl)    nameEl.value    = fVal(F.STELL_NAME);
  if (strasseEl) strasseEl.value = [fVal(F.STELL_ADRESSE), fVal(F.STELL_HAUSNUMMER)].filter(Boolean).join(' ');
  if (ortEl)     ortEl.value     = [fVal(F.STELL_PLZ), fVal(F.STELL_ORT)].filter(Boolean).join(' ');
}

/** Sync Empfänger sub-field → hidden #f-emp-* fields. */
export function syncEmpField(input, field) {
  const v = input.value;
  if (field === 'name') {
    const f = el(F.EMP_NAME); if (f) f.value = v;
  } else if (field === 'strasse') {
    const f = el(F.EMP_STRASSE); if (f) f.value = v;
    const h = el(F.EMP_HAUSNUMMER); if (h) h.value = '';
  } else if (field === 'ort') {
    const parts = v.match(/^(\d{4})\s+(.*)$/);
    const plz = el(F.EMP_PLZ);  if (plz) plz.value = parts ? parts[1] : '';
    const ort = el(F.EMP_ORT);  if (ort) ort.value  = parts ? parts[2] : v;
  }
  render();
}

/** Sync Absender sub-field → hidden #f-stell-* fields. */
export function syncStellField(input, field) {
  const v = input.value;
  if (field === 'name') {
    const f = el(F.STELL_NAME); if (f) f.value = v;
  } else if (field === 'strasse') {
    const f = el(F.STELL_ADRESSE); if (f) f.value = v;
    const h = el(F.STELL_HAUSNUMMER); if (h) h.value = '';
  } else if (field === 'ort') {
    const parts = v.match(/^(\d{4})\s+(.*)$/);
    const plz = el(F.STELL_PLZ);  if (plz) plz.value = parts ? parts[1] : '';
    const ort = el(F.STELL_ORT);  if (ort) ort.value  = parts ? parts[2] : v;
  }
  render();
}

// _syncContactPicker / _syncCompanyPicker removed — replaced by SearchableSelect in contacts.js
