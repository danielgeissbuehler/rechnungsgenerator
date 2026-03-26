import { state, META_COUNT, TPLS_KEY } from './state.js';
import { val, chk } from './utils.js';
import { render } from './render.js';
import { renderColConfig } from './columns.js';
import { renderPositionsList } from './positions.js';
import { toggleMetaField } from './meta.js';
import * as cloud from './supabase.js';
import { F, ALL_FIELD_IDS } from './field-ids.js';

let fixedVorlagen  = {};
let cloudVorlagen  = {};

// ── Local storage helpers ───────────────────────────────────────────────────
export function loadTemplatesData() {
  try { return JSON.parse(localStorage.getItem(TPLS_KEY) || '{}'); } catch { return {}; }
}
export function saveTemplatesData(data) {
  localStorage.setItem(TPLS_KEY, JSON.stringify(data));
}

// ── Cloud status indicator ─────────────────────────────────────────────────
export function setCloudStatus(msg, type) {
  const el = document.getElementById('cloud-status');
  if (!el) return;
  el.textContent = msg;
  el.className   = type;
  el.style.display = msg ? 'block' : 'none';
}

// ── Load all templates ─────────────────────────────────────────────────────
export async function loadVorlagen() {
  if (cloud.isConfigured()) {
    setCloudStatus('☁ Cloud wird geladen…', 'sync-info');
    try {
      cloudVorlagen = await cloud.fetchCloudTemplates();
      const count   = Object.keys(cloudVorlagen).length;
      setCloudStatus(`☁ ${count} Cloud-Vorlage${count !== 1 ? 'n' : ''} geladen`, 'sync-ok');
      setTimeout(() => setCloudStatus('', ''), 3000);
    } catch (e) {
      setCloudStatus('☁ Cloud nicht erreichbar', 'sync-error');
    }
  }

  buildTemplateList();
}

export function buildTemplateList() {
  const sel = document.getElementById('template-select');
  const cur = sel.value;
  sel.replaceChildren();

  const placeholder = document.createElement('option');
  placeholder.value = ''; placeholder.textContent = '— Vorlage wählen —';
  sel.appendChild(placeholder);

  const addGroup = (label, keys, prefix) => {
    if (!keys.length) return;
    const grp = document.createElement('optgroup');
    grp.label = label;
    keys.forEach(name => {
      const opt = document.createElement('option');
      opt.value = prefix + name; opt.textContent = name;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  };

  addGroup('Fixe Vorlagen',        Object.keys(fixedVorlagen).sort(),              'fixed:');
  addGroup('☁ Cloud Vorlagen',     Object.keys(cloudVorlagen).sort(),              'cloud:');
  addGroup('Eigene Vorlagen (lokal)', Object.keys(loadTemplatesData()).sort(),      'local:');

  const hasCur = cur && (
    (cur.startsWith('fixed:') && fixedVorlagen[cur.slice(6)]) ||
    (cur.startsWith('cloud:') && cloudVorlagen[cur.slice(6)]) ||
    (cur.startsWith('local:') && loadTemplatesData()[cur.slice(6)])
  );
  if (hasCur) sel.value = cur;
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

// ── Save ───────────────────────────────────────────────────────────────────
export async function saveTemplate() {
  const nameEl = document.getElementById('template-name');
  const name   = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }

  const tplState = collectState();

  // Always save locally
  const localData = loadTemplatesData();
  localData[name] = tplState;
  saveTemplatesData(localData);

  // Save to cloud if configured
  if (cloud.isConfigured()) {
    setCloudStatus('☁ Wird gespeichert…', 'sync-pending');
    const ok = await cloud.saveCloudTemplate(name, tplState);
    if (ok) { cloudVorlagen[name] = tplState; setCloudStatus('☁ In Cloud gespeichert', 'sync-ok'); }
    else                                       setCloudStatus('☁ Cloud-Fehler – nur lokal gespeichert', 'sync-error');
    setTimeout(() => setCloudStatus('', ''), 3000);
  }

  buildTemplateList();
  document.getElementById('template-select').value = 'local:' + name;
  nameEl.value = '';
}

// ── Load ───────────────────────────────────────────────────────────────────
export function loadTemplate() {
  const raw = document.getElementById('template-select').value;
  if (!raw) return;
  let tplState;
  if      (raw.startsWith('fixed:')) tplState = fixedVorlagen[raw.slice(6)];
  else if (raw.startsWith('cloud:')) tplState = cloudVorlagen[raw.slice(6)];
  else if (raw.startsWith('local:')) tplState = loadTemplatesData()[raw.slice(6)];
  if (tplState) applyState(tplState);
}

// ── Delete ─────────────────────────────────────────────────────────────────
export async function deleteTemplate() {
  const raw = document.getElementById('template-select').value;
  if (!raw) return;
  if (raw.startsWith('fixed:')) { alert('Fixe Vorlagen können nicht gelöscht werden.'); return; }

  const name = raw.slice(raw.indexOf(':') + 1);
  if (!confirm(`Vorlage "${name}" löschen?`)) return;

  if (raw.startsWith('cloud:')) {
    setCloudStatus('☁ Wird gelöscht…', 'sync-pending');
    const ok = await cloud.deleteCloudTemplate(name);
    if (ok) { delete cloudVorlagen[name]; setCloudStatus('☁ Aus Cloud gelöscht', 'sync-ok'); }
    else                                   setCloudStatus('☁ Cloud-Fehler', 'sync-error');
    setTimeout(() => setCloudStatus('', ''), 3000);
  } else {
    const data = loadTemplatesData();
    delete data[name];
    saveTemplatesData(data);
  }

  buildTemplateList();
}

// ── Import / Export ────────────────────────────────────────────────────────
export function downloadCurrentAsJSON() {
  const nameEl = document.getElementById('template-name');
  const name   = nameEl.value.trim() || 'Vorlage';
  const blob   = new Blob([JSON.stringify({ [name]: collectState() }, null, 2)], { type:'application/json' });
  const a      = document.createElement('a');
  a.href       = URL.createObjectURL(blob);
  a.download   = name.replace(/\s+/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportTemplates() {
  const blob = new Blob([JSON.stringify(loadTemplatesData(), null, 2)], { type:'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'vorlagen_export.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importTemplates(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      const existing = loadTemplatesData();
      Object.assign(existing, imported);
      saveTemplatesData(existing);
      buildTemplateList();
    } catch { alert('Ungültige JSON-Datei.'); }
  };
  reader.readAsText(file);
  input.value = '';
}
