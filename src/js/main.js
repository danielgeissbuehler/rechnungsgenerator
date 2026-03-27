import { F } from './field-ids.js';
import { initAuth, handleLogin, handleLogout } from './auth.js';
import { rteInit, rteCmd, rteCmdRaw, rteBlockBtn, rteInsertHr, rteCmd2, rteCmd2Raw, rteBlock2, rteInsertHr2, rteKeydown } from './rte.js';
import { render, updatePreviewScale } from './render.js';
import { addPosition } from './positions.js';
import { renderColConfig, toggleCol, setColAlign } from './columns.js';
import { toggleMetaField } from './meta.js';
import { loadContacts, loadCompanies, applyContact, applyCompany, saveCurrentAbsender, saveCurrentEmpfaenger } from './contacts.js';
import { loadVorlagen, autoSaveVorlage, renameVorlageDebounced } from './templates.js';
import { downloadPDF, printPDF } from './pdf.js';
import { toggleSection, toggleVis, showTab, initResizeHandle, scalePreview, toggleSidebarCollapse, restoreSidebarState } from './ui.js';
import { bucheRechnung, ladeAusArchiv, ladeEntwurf, loescheAusArchiv, neueRechnung, renderArchivListe, setReadonly, speichereEntwurf, kopieRechnung, autoSave } from './archiv.js';
import {
  showDashboard, showEditor, loadRechnungen,
  dashFilterChanged, dashSetStatusTab,
  handleNeueRechnung, closeNeueRechnungModal, confirmNeueRechnung,
  openDetailPanel, closeDetailPanel,
  handleStatusChange, handleKopieRechnung,
  renderDashboardStats,
  dashSortBy,
} from './dashboard/index.js';
import {
  fillSimpleEditor, renderSimplePositions,
  addSimplePosition, removeSimplePosition,
  syncField, syncRte, syncRteHtml, seRteCmd, seRteBlock, seRteRaw, seRteHr, seRteKeydown,
  applySimpleContact, applySimpleCompany,
} from './editor-simple.js';

// ── SVG icon paths ───────────────────────────────────────────────────────
const ICONS = {
  trash:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  send:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  check:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  ban:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  warn:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  logout:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
};

// ── Global confirm dialog ─────────────────────────────────────────────────
/**
 * Show a styled confirmation dialog. Returns a Promise<boolean>.
 * @param {string} title
 * @param {string} [msg]
 * @param {string} [okLabel]
 * @param {object} [opts] — { theme: 'danger'|'amber'|'green'|'blue', icon: keyof ICONS }
 */
window.showConfirm = function(title, msg, okLabel, opts) {
  return new Promise(function(resolve) {
    const modal     = document.getElementById('confirm-modal');
    const titleEl   = document.getElementById('confirm-modal-title');
    const msgEl     = document.getElementById('confirm-modal-msg');
    const okBtn     = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const iconEl    = document.getElementById('confirm-modal-icon');
    if (!modal) { resolve(false); return; }

    const theme = (opts && opts.theme) || 'danger';
    const icon  = (opts && opts.icon)  || 'trash';

    titleEl.textContent = title || '';
    msgEl.textContent   = msg   || '';
    okBtn.textContent   = okLabel || 'Löschen';
    okBtn.className     = 'theme-' + theme;
    iconEl.className    = 'confirm-dialog-icon theme-' + theme;
    iconEl.innerHTML    = ICONS[icon] || ICONS.warn;
    modal.style.display = 'flex';

    function cleanup(result) {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }
    function onOk()      { cleanup(true);  }
    function onCancel()  { cleanup(false); }
    function onBackdrop(e) { if (e.target === modal) cleanup(false); }
    function onKey(e)    { if (e.key === 'Escape') cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
    cancelBtn.focus();
  });
};

// ── Toast notifications ──────────────────────────────────────────────────
/**
 * Show a brief toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration=3000]
 */
window.showToast = function(message, type, duration) {
  type = type || 'info';
  duration = duration || 3000;
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconSvgs = {
    success: ICONS.check,
    error:   ICONS.warn,
    warning: ICONS.warn,
    info:    ICONS.info,
  };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<span class="toast-icon ' + type + '">' + (iconSvgs[type] || '') + '</span>'
    + '<span>' + message + '</span>';
  container.appendChild(toast);

  setTimeout(function() {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', function() { toast.remove(); });
  }, duration);
};

// ── Expose globals for inline HTML event handlers ─────────────────────────
Object.assign(window, {
  render, addPosition, toggleSection, toggleVis, showTab, toggleSidebarCollapse, downloadPDF, printPDF,
  autoSaveVorlage, renameVorlageDebounced,
  applyContact, applyCompany, saveCurrentAbsender, saveCurrentEmpfaenger,
  toggleCol, setColAlign, toggleMetaField,
  rteCmd, rteCmdRaw, rteBlockBtn, rteInsertHr,
  rteCmd2, rteCmd2Raw, rteBlock2, rteInsertHr2, rteKeydown,
  handleLogin, handleLogout,
  bucheRechnung, ladeAusArchiv, loescheAusArchiv, neueRechnung, renderArchivListe,
  speichereEntwurf, kopieRechnung, autoSave, ladeEntwurf,
  showDashboard, showEditor, loadRechnungen,
  dashFilterChanged, dashSetStatusTab,
  handleNeueRechnung, closeNeueRechnungModal, confirmNeueRechnung,
  openDetailPanel, closeDetailPanel,
  handleStatusChange, handleKopieRechnung,
  renderDashboardStats, dashSortBy,
  // Einfacher Rechnungs-Editor
  fillSimpleEditor, renderSimplePositions,
  addSimplePosition, removeSimplePosition,
  syncField, syncRte, syncRteHtml, seRteCmd, seRteBlock, seRteRaw, seRteHr, seRteKeydown,
  applySimpleContact, applySimpleCompany,
});

// ── App initialisation ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const authResult = await initAuth();

  // Populate sidebar user display
  const user = authResult?.user ?? authResult?.session?.user ?? null;
  if (user) {
    const email = user.email ?? '';
    const displayName = user.user_metadata?.full_name ?? email;
    const initials = email.slice(0, 2).toUpperCase();
    const nameEl = document.getElementById('sidebar-user-name');
    const emailEl = document.getElementById('sidebar-user-email');
    const avatarEl = document.querySelector('.db-avatar');
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.textContent = initials;
  }

  restoreSidebarState();
  loadRechnungen();
  renderArchivListe();
  rteInit();

  const rteEl = document.getElementById(F.TEXTBLOCK);
  if (rteEl) {
    rteEl.addEventListener('focus', () => {
      document.execCommand('defaultParagraphSeparator', false, 'p');
      document.execCommand('styleWithCSS', false, false);
    });
  }

  // Set today's date
  const today = new Date();
  const dd    = String(today.getDate()).padStart(2, '0');
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy  = today.getFullYear();
  const datumEl = document.getElementById('mf-value-0');
  if (datumEl) datumEl.value = `${dd}.${mm}.${yyyy}`;

  renderColConfig();
  for (let i = 0; i < 5; i++) toggleMetaField(i);

  [['Beratungsleistungen April', 150, 8], ['Spesen', 0.70, 120]]
    .forEach(([d, p, q]) => addPosition(d, p, q));

  render();
  initResizeHandle();
  window.addEventListener('resize', () => { updatePreviewScale(); scalePreview(); });

  loadContacts();
  loadCompanies();
  loadVorlagen();
});
