import { state, META_COUNT, TPLS_KEY } from './state.js';
import { val, chk } from './utils.js';
import { render } from './render.js';
import { renderColConfig } from './columns.js';
import { renderPositionsList } from './positions.js';
import { toggleMetaField } from './meta.js';
import * as cloud from './supabase.js';
import { F, ALL_FIELD_IDS } from './field-ids.js';

let fixedVorlagen  = {};
export let cloudVorlagen  = {};

// ── Local storage helpers ───────────────────────────────────────────────────
export function loadTemplatesData() {
  try { return JSON.parse(localStorage.getItem(TPLS_KEY) || '{}'); } catch { return {}; }
}
export function saveTemplatesData(data) {
  localStorage.setItem(TPLS_KEY, JSON.stringify(data));
}

// ── Vorlage save status indicator ───────────────────────────────────────────
function setVorlageStatus(msg, type) {
  const el = document.getElementById('vorlage-save-status');
  if (!el) return;
  el.textContent = msg;
  el.className   = type || '';
}

// ── Load all templates ─────────────────────────────────────────────────────
export async function loadVorlagen() {
  if (cloud.isConfigured()) {
    try {
      cloudVorlagen = await cloud.fetchCloudTemplates();
    } catch (e) {
      console.error('Cloud-Vorlagen nicht erreichbar', e);
    }
  }
}

// ── Modal integration ───────────────────────────────────────────────────────
export function getModalVorlagen() {
  const result = [];
  Object.keys(cloudVorlagen).sort().forEach(name => {
    result.push({ key: 'cloud:' + name, label: name, source: 'cloud' });
  });
  Object.keys(loadTemplatesData()).sort().forEach(name => {
    result.push({ key: 'local:' + name, label: name, source: 'local' });
  });
  return result;
}

// ── Collect / Apply state ──────────────────────────────────────────────────
export function collectState() {
  const fieldIds = ALL_FIELD_IDS;
  const fields = {};
  fieldIds.forEach(id => { fields[id] = val(id); });

  const meta = [];
  for (let i = 0; i < META_COUNT; i++) {
    meta.push({
      show:  document.getElementById(`mf-show-${i}`)?.checked || false,
      label: val(`mf-label-${i}`),
      value: val(`mf-value-${i}`),
    });
  }

  const tb  = document.getElementById(F.TEXTBLOCK);
  const tb2 = document.getElementById(F.TEXTBLOCK2);
  return {
    fields,
    meta,
    visibility: { ...state.visibility },
    colAlign:   { ...state.colAlign },
    positions:  state.positions.map(p => ({ ...p })),
    textblock:  tb  ? tb.getHTML()  : '',
    textblock2: tb2 ? tb2.getHTML() : '',
    qtyTotal:   chk('chk-qty-total'),
    qrBill:     state.visibility.qrBill,
  };
}

const SVG_EYE  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const SVG_HIDE = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

export function syncVisBtn(key) {
  const btn = document.getElementById('vis-' + key);
  if (!btn) return;
  const v = state.visibility[key];
  btn.replaceChildren();
  btn.insertAdjacentHTML('beforeend', v ? SVG_EYE + ' sichtbar' : SVG_HIDE + ' ausgeblendet');
  btn.classList.toggle('hidden-state', !v);
}

export function applyState(stateData) {
  Object.entries(stateData.fields || {}).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (el) el.value = v;
  });

  (stateData.meta || []).forEach((m, i) => {
    const showEl  = document.getElementById(`mf-show-${i}`);
    const labelEl = document.getElementById(`mf-label-${i}`);
    const valueEl = document.getElementById(`mf-value-${i}`);
    if (showEl)  showEl.checked  = m.show;
    if (labelEl) labelEl.value   = m.label;
    if (valueEl) valueEl.value   = m.value;
    toggleMetaField(i);
  });

  if (stateData.visibility) {
    Object.assign(state.visibility, stateData.visibility);
    ['header','heading','empfaenger','steller','meta','titel','textblock','positionen','textblock2','bank','qrBill']
      .forEach(syncVisBtn);
  }

  if (stateData.colAlign) Object.assign(state.colAlign, stateData.colAlign);
  renderColConfig();

  state.positions.length = 0;
  state.expandedPositions.clear();
  (stateData.positions || []).forEach(p => state.positions.push({ ...p }));
  state.posId = state.positions.length ? Math.max(...state.positions.map(p => p.id)) + 1 : 0;
  renderPositionsList();

  const setRTE = (id, html) => {
    const el = document.getElementById(id);
    if (!el) return;
    const parsed = new DOMParser().parseFromString(html || '', 'text/html');
    el.replaceChildren(...Array.from(parsed.body.childNodes));
  };
  setRTE(F.TEXTBLOCK,  stateData.textblock);
  setRTE(F.TEXTBLOCK2, stateData.textblock2);

  const qtyEl = document.getElementById('chk-qty-total');
  if (qtyEl) qtyEl.checked = !!stateData.qtyTotal;

  render();
}

// ── Load template by prefixed key (used by modal / stammdaten) ─────────────
export function loadTemplateByKey(prefixedKey) {
  if (!prefixedKey) return;
  let tplState;
  if      (prefixedKey.startsWith('fixed:')) tplState = fixedVorlagen[prefixedKey.slice(6)];
  else if (prefixedKey.startsWith('cloud:')) tplState = cloudVorlagen[prefixedKey.slice(6)];
  else if (prefixedKey.startsWith('local:')) tplState = loadTemplatesData()[prefixedKey.slice(6)];
  if (tplState) applyState(tplState);
}

// ── Auto-save for Vorlagen (debounced) ──────────────────────────────────────
let _vorlageAutoSaveTimer = null;

export function autoSaveVorlage() {
  const editor = document.getElementById('view-editor');
  if (!editor || getComputedStyle(editor).display === 'none') return;
  if (editor.classList.contains('simple-mode')) return;
  if (!state.currentVorlageName) return;
  if (!cloud.isConfigured()) return;

  setVorlageStatus('Speichert…');
  clearTimeout(_vorlageAutoSaveTimer);
  _vorlageAutoSaveTimer = setTimeout(async () => {
    const name = state.currentVorlageName;
    if (!name) return;
    const tplState = collectState();
    const ok = await cloud.saveCloudTemplate(name, tplState);
    if (ok) {
      cloudVorlagen[name] = tplState;
      setVorlageStatus('Gespeichert');
      setTimeout(() => setVorlageStatus(''), 2000);
    } else {
      setVorlageStatus('Fehler beim Speichern', 'error');
    }
  }, 1500);
}

// ── Rename Vorlage (debounced) ──────────────────────────────────────────────
let _renameTimer = null;

export function renameVorlageDebounced(newName) {
  newName = (newName || '').trim();
  clearTimeout(_renameTimer);
  if (!newName) return;

  _renameTimer = setTimeout(async () => {
    const oldName = state.currentVorlageName;
    if (!oldName || oldName === newName) {
      // Name unchanged or first save — just update state and save
      state.currentVorlageName = newName;
      autoSaveVorlage();
      return;
    }

    if (!cloud.isConfigured()) return;

    setVorlageStatus('Umbenennen…');
    const tplState = collectState();

    // Save with new name
    const ok = await cloud.saveCloudTemplate(newName, tplState);
    if (!ok) {
      setVorlageStatus('Fehler: Name evtl. bereits vergeben', 'error');
      return;
    }

    // Delete old name
    await cloud.deleteCloudTemplate(oldName);
    delete cloudVorlagen[oldName];
    cloudVorlagen[newName] = tplState;
    state.currentVorlageName = newName;

    // Update topbar title
    const titleEl = document.getElementById('editor-topbar-title');
    if (titleEl) titleEl.textContent = 'Vorlage: ' + newName;

    setVorlageStatus('Umbenannt');
    setTimeout(() => setVorlageStatus(''), 2000);
  }, 1500);
}
