import { state } from './state.js';
import { render, updatePreviewScale } from './render.js';

export function toggleSection(h) {
  h.classList.toggle('open');
  h.nextElementSibling.classList.toggle('open');
}

const SVG_EYE  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const SVG_HIDE = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

export function toggleVis(key, forcedValue) {
  state.visibility[key] = forcedValue !== undefined ? !!forcedValue : !state.visibility[key];
  const btn = document.getElementById('vis-' + key);
  const v   = state.visibility[key];
  if (btn) {
    btn.replaceChildren();
    btn.insertAdjacentHTML('beforeend', v ? SVG_EYE + ' sichtbar' : SVG_HIDE + ' ausgeblendet');
    btn.classList.toggle('hidden-state', !v);
  }
  render();
}

export function showTab(tab) {
  const editor  = document.getElementById('editor');
  const preview = document.getElementById('preview-wrap');
  const tabs    = document.querySelectorAll('.mob-tab');
  const fab     = document.getElementById('mob-preview-btn');

  if (tab === 'editor') {
    editor.classList.remove('mob-hidden');
    preview.classList.add('mob-hidden');
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
    fab.replaceChildren();
    fab.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Vorschau`);
    fab.onclick = () => showTab('preview');
  } else {
    editor.classList.add('mob-hidden');
    preview.classList.remove('mob-hidden');
    tabs[0].classList.remove('active');
    tabs[1].classList.add('active');
    fab.replaceChildren();
    fab.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editor`);
    fab.onclick = () => showTab('editor');
    updatePreviewScale();
  }
}

// ── Sidebar collapse ──────────────────────────────────────────────────────
const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

export function toggleSidebarCollapse() {
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
}

export function restoreSidebarState() {
  if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1') {
    document.body.classList.add('sidebar-collapsed');
  }
}

// ── Preview fit-to-width scaling ─────────────────────────────────────────────
export function scalePreview() {
  const wrap = document.getElementById('preview-wrap');
  if (!wrap) return;
  const available = wrap.clientWidth - 40;   // minus padding (20px each side)
  const scale = Math.min(available / 794, 1);
  wrap.style.setProperty('--editor-preview-scale', scale);
}

// ── Editor resize handle ───────────────────────────────────────────────────
export function initResizeHandle() {
  const handle = document.getElementById('resize-handle');
  const editorFull   = document.getElementById('editor');
  const editorSimple = document.getElementById('editor-simple');
  let startX, startW;

  handle.addEventListener('mousedown', e => {
    const editor = document.getElementById('view-editor')?.classList.contains('simple-mode')
      ? editorSimple : editorFull;
    startX = e.clientX;
    startW = editor.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = ev => {
      const w = Math.max(280, Math.min(800, startW + ev.clientX - startX));
      editor.style.width = w + 'px';
      editor.style.flex  = 'none';
      scalePreview();
    };
    const onUp = () => {
      handle.classList.remove('dragging');
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}
