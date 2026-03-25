import { initAuth, handleLogin, handleLogout } from './auth.js';
import { rteInit, rteCmd, rteCmdRaw, rteBlockBtn, rteInsertHr, rteCmd2, rteCmd2Raw, rteBlock2, rteInsertHr2, rteKeydown } from './rte.js';
import { render, updatePreviewScale } from './render.js';
import { addPosition } from './positions.js';
import { renderColConfig, toggleCol, setColAlign } from './columns.js';
import { toggleMetaField } from './meta.js';
import { loadContacts, loadCompanies, applyContact, applyCompany, saveCurrentAbsender, saveCurrentEmpfaenger } from './contacts.js';
import { loadVorlagen, saveTemplate, loadTemplate, deleteTemplate, exportTemplates, importTemplates, downloadCurrentAsJSON } from './templates.js';
import { downloadPDF } from './pdf.js';
import { toggleSection, toggleVis, showTab, initResizeHandle } from './ui.js';
import { bucheRechnung, ladeAusArchiv, loescheAusArchiv, neueRechnung, renderArchivListe, setReadonly, speichereEntwurf, kopieRechnung } from './archiv.js';
import {
  showDashboard, showEditor, loadRechnungen,
  dashFilterChanged, dashSetStatusTab,
  handleNeueRechnung, closeNeueRechnungModal, confirmNeueRechnung,
  openDetailPanel, closeDetailPanel,
  handleStatusChange, handleKopieRechnung,
  renderDashboardStats,
} from './dashboard.js';

// ── Expose globals for inline HTML event handlers ─────────────────────────
Object.assign(window, {
  render, addPosition, toggleSection, toggleVis, showTab, downloadPDF,
  saveTemplate, loadTemplate, deleteTemplate, exportTemplates, importTemplates, downloadCurrentAsJSON,
  applyContact, applyCompany, saveCurrentAbsender, saveCurrentEmpfaenger,
  toggleCol, setColAlign, toggleMetaField,
  rteCmd, rteCmdRaw, rteBlockBtn, rteInsertHr,
  rteCmd2, rteCmd2Raw, rteBlock2, rteInsertHr2, rteKeydown,
  handleLogin, handleLogout,
  bucheRechnung, ladeAusArchiv, loescheAusArchiv, neueRechnung, renderArchivListe,
  speichereEntwurf, kopieRechnung,
  showDashboard, showEditor, loadRechnungen,
  dashFilterChanged, dashSetStatusTab,
  handleNeueRechnung, closeNeueRechnungModal, confirmNeueRechnung,
  openDetailPanel, closeDetailPanel,
  handleStatusChange, handleKopieRechnung,
  renderDashboardStats,
  loadTemplateByName: function(name) {
    if (!name) return;
    const sel = document.getElementById('template-select');
    if (sel) { sel.value = name; window.loadTemplate(); }
  },
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

  loadRechnungen();
  renderArchivListe();
  rteInit();

  const rteEl = document.getElementById('f-textblock');
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
  window.addEventListener('resize', updatePreviewScale);

  // Add "Entwurf speichern" button next to the book-invoice button
  const buchBtn = document.getElementById('buch-rechnung-btn');
  if (buchBtn) {
    const entwurfBtn = document.createElement('button');
    entwurfBtn.id = 'entwurf-btn';
    entwurfBtn.className = 'btn-secondary';
    entwurfBtn.textContent = 'Entwurf speichern';
    entwurfBtn.onclick = () => window.speichereEntwurf();
    buchBtn.parentNode.insertBefore(entwurfBtn, buchBtn);
  }

  loadContacts();
  loadCompanies();
  loadVorlagen();
});
