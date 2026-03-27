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
  // Empfänger
  const seEmpName    = el('se-emp-name');
  const seEmpStrasse = el('se-emp-strasse');
  const seEmpOrt     = el('se-emp-ort');
  if (seEmpName)    seEmpName.value    = fVal(F.EMP_NAME);
  if (seEmpStrasse) seEmpStrasse.value = fVal(F.EMP_STRASSE);
  if (seEmpOrt)     seEmpOrt.value     = fVal(F.EMP_ORT);

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

  // Dynamische Sektionen aufbauen
  renderSimpleMeta();
  renderSimplePositions();

  // Contact/Company Picker synchronisieren
  _syncContactPicker();
  _syncCompanyPicker();
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
function _buildMetaItem(i, labelText, valueText) {
  const item = document.createElement('div');
  item.className = 'ii';

  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  item.appendChild(lbl);

  const inp = document.createElement('input');
  inp.type        = 'text';
  inp.value       = valueText;
  inp.placeholder = '—';
  inp.dataset.metaIndex = i;
  inp.addEventListener('input', function() {
    const mfVal = el('mf-value-' + i);
    if (mfVal) mfVal.value = this.value;
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
      if (c.n === 4) {
        // TOTAL: computed, readonly
        td.className = 'se-pos-total';
        td.textContent = fmtCHF(posTotal(pos));
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
  state.positions.push({ id: state.posId, desc: '', price: 0, qty: 1, col5: '', col6: '', col7: '', col8: '' });
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

/**
 * Wird aufgerufen wenn der Empfänger-Dropdown im simple editor geändert wird.
 * Kopiert die Werte in die #f-* Felder und aktualisiert die se-* Felder.
 */
export function applySimpleContact() {
  const sel = el('se-contact-select');
  const mainSel = el('contact-select');
  if (!sel || !mainSel) return;
  // Wert in den Haupt-Picker spiegeln und applyContact() aufrufen
  mainSel.value = sel.value;
  if (typeof window.applyContact === 'function') window.applyContact();
  // Se-Felder nachführen
  const seEmpName    = el('se-emp-name');
  const seEmpStrasse = el('se-emp-strasse');
  const seEmpOrt     = el('se-emp-ort');
  if (seEmpName)    seEmpName.value    = fVal(F.EMP_NAME);
  if (seEmpStrasse) seEmpStrasse.value = fVal(F.EMP_STRASSE);
  if (seEmpOrt)     seEmpOrt.value     = fVal(F.EMP_ORT);
}

/**
 * Wird aufgerufen wenn der Absender-Dropdown im simple editor geändert wird.
 */
export function applySimpleCompany() {
  const sel = el('se-company-select');
  const mainSel = el('company-select');
  if (!sel || !mainSel) return;
  mainSel.value = sel.value;
  if (typeof window.applyCompany === 'function') window.applyCompany();
  _refreshAbsenderDisplay();
  // Bank readonly-Felder nachführen
  const seBankName = el('se-bank-name');
  const seIban     = el('se-iban');
  if (seBankName) seBankName.value = fVal(F.BANK_NAME);
  if (seIban)     seIban.value     = fVal(F.IBAN);
}

/** Aktualisiert die readonly Absender-Anzeige aus den #f-stell-* Feldern. */
function _refreshAbsenderDisplay() {
  const nameEl  = el('se-stell-name');
  const addrEl  = el('se-stell-adresse');
  if (nameEl) nameEl.value  = fVal(F.STELL_NAME);
  if (addrEl) addrEl.value  = [fVal(F.STELL_ADRESSE), fVal(F.STELL_ORT)].filter(Boolean).join(', ');
}

/** Synchronisiert den se-contact-select mit dem Haupt-Picker. */
function _syncContactPicker() {
  const mainSel = el('contact-select');
  const seSel   = el('se-contact-select');
  if (!mainSel || !seSel) return;

  // Optionen klonen wenn leer
  if (seSel.options.length <= 1) {
    // Leere Option
    while (seSel.firstChild) seSel.removeChild(seSel.firstChild);
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '— Kontakt wählen —';
    seSel.appendChild(blank);
    // Optgroups/Options aus Haupt-Picker übernehmen
    Array.from(mainSel.children).forEach(child => {
      seSel.appendChild(child.cloneNode(true));
    });
  }
  seSel.value = mainSel.value;
}

/** Synchronisiert den se-company-select mit dem Haupt-Picker. */
function _syncCompanyPicker() {
  const mainSel = el('company-select');
  const seSel   = el('se-company-select');
  if (!mainSel || !seSel) return;

  if (seSel.options.length === 0) {
    Array.from(mainSel.options).forEach(opt => {
      seSel.appendChild(opt.cloneNode(true));
    });
  }
  seSel.value = mainSel.value;
}
