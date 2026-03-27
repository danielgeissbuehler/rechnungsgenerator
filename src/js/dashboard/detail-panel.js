/**
 * dashboard/detail-panel.js — Invoice detail panel (slide-in) and status changes.
 */

import {
  fetchRechnungById,
  fetchRechnungen,
  updateRechnungStatus,
} from '../supabase.js';
import { buildPagesFromData } from '../render.js';
import { downloadPDF, printPDF } from '../pdf.js';
import { escHtml, formatCHF, formatDate } from '../utils.js';
import { currentDetailId, setCurrentDetailId, allRechnungen, setAllRechnungen } from './state.js';
import { field, getStatusBadge } from './helpers.js';
import { showEditor } from './views.js';
import { renderDashboardStats } from './stats.js';
import { renderInvoiceTable } from './table.js';
import { loadRechnungen } from './data.js';
import { F } from '../field-ids.js';

/**
 * Build the mini doc-sheet HTML preview from a rechnung record.
 * All user data is passed through escHtml().
 * @param {Object} r - full rechnung record (with daten JSONB)
 * @returns {string} sanitised HTML string
 */
function buildDocPreview(r) {
  const fields    = (r && r.daten && r.daten.fields)    || {};
  const positions = (r && r.daten && r.daten.positions) || [];

  const absName  = escHtml(fields['absender-firma']   || fields['absender-name']   || (r && r.absender_name)  || '\u2014');
  const absEmail = escHtml(fields['absender-email']   || '');
  const absParts = [
    fields['absender-strasse'],
    [fields['absender-plz'], fields['absender-ort']].filter(Boolean).join(' '),
  ].filter(Boolean);

  const empName  = escHtml(fields['empfaenger-name'] || (r && r.empfaenger_name) || '\u2014');
  const empParts = [
    fields['empfaenger-strasse'],
    [fields['empfaenger-plz'], fields['empfaenger-ort']].filter(Boolean).join(' '),
  ].filter(Boolean);

  const rechnDatum = escHtml(fields['datum']       || formatDate(r && r.created_at));
  const faellig    = escHtml(fields['zahlbar-bis'] || fields['faellig'] || '');
  const numStr     = (r && r.nummer) ? '#' + String(r.nummer).padStart(3, '0') : 'Entwurf';
  const numSafe    = escHtml(numStr);
  const waehrung   = (r && r.waehrung) || 'CHF';
  const bank       = escHtml(fields['bank'] || fields['bank-name'] || '');
  const iban       = escHtml(fields['iban'] || '');

  const posRows = positions.map(function(p) {
    const menge = parseFloat(p.menge  != null ? p.menge  : (p.anzahl      != null ? p.anzahl      : 1));
    const preis = parseFloat(p.preis  != null ? p.preis  : (p.einzelpreis != null ? p.einzelpreis : 0));
    const tot   = menge * preis;
    const bez   = escHtml(p.bezeichnung || p.text || p.beschreibung || '\u2014');
    return '<tr>'
      + '<td>' + bez + '</td>'
      + '<td>' + menge.toLocaleString('de-CH') + '</td>'
      + '<td>' + preis.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>'
      + '<td>' + tot.toLocaleString('de-CH',   { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>'
      + '</tr>';
  }).join('');

  return '<div class="doc-sheet">'
    + '<div class="doc-header-row">'
    +   '<div>'
    +     '<div class="doc-co-name">' + absName + '</div>'
    +     (absEmail ? '<div class="doc-co-email">' + absEmail + '</div>' : '')
    +   '</div>'
    +   '<div class="doc-co-addr">' + absParts.map(escHtml).join('<br>') + '</div>'
    + '</div>'
    + '<div class="doc-rule"></div>'
    + '<div class="doc-body-row">'
    +   '<div class="doc-recipient">'
    +     '<strong>' + empName + '</strong>'
    +     (empParts.length ? '<br>' + empParts.map(escHtml).join('<br>') : '')
    +   '</div>'
    +   '<div class="doc-datebox">'
    +     'Datum:&nbsp;<strong>' + rechnDatum + '</strong><br>'
    +     (faellig ? 'Zahlbar bis:&nbsp;<strong>' + faellig + '</strong><br>' : '')
    +     'Rechnung:&nbsp;<strong>' + numSafe + '</strong>'
    +   '</div>'
    + '</div>'
    + '<div class="doc-invoice-title">Rechnung ' + numSafe + '</div>'
    + '<table class="doc-table">'
    +   '<thead><tr>'
    +     '<th>Bezeichnung</th>'
    +     '<th style="text-align:right">Menge</th>'
    +     '<th style="text-align:right">Preis</th>'
    +     '<th style="text-align:right">Total</th>'
    +   '</tr></thead>'
    +   '<tbody>'
    +     (posRows || '<tr><td colspan="4" style="color:#aaa;font-style:italic">Keine Positionen</td></tr>')
    +   '</tbody>'
    + '</table>'
    + '<div class="doc-total-row">'
    +   '<span>Total</span>'
    +   '<span>' + formatCHF(parseFloat((r && r.betrag) || 0), waehrung) + '</span>'
    + '</div>'
    + ((bank || iban)
        ? '<div class="doc-footer">'
          + (bank ? 'Bank: ' + bank + '<br>' : '')
          + (iban ? 'IBAN: ' + iban : '')
          + '</div>'
        : '')
    + '</div>';
}

/**
 * Fetch a full invoice and open the slide-in detail panel.
 * @param {string} id - invoice UUID
 */
export async function openDetailPanel(id) {
  if (!id) return;

  let rechnung;
  try {
    rechnung = await fetchRechnungById(id);
  } catch (err) {
    console.error('openDetailPanel:', err);
    return;
  }

  if (!rechnung) {
    console.warn('openDetailPanel: not found:', id);
    return;
  }

  setCurrentDetailId(id);
  await renderDetailPanel(rechnung);

  const backdrop = document.getElementById('detail-panel-backdrop');
  if (backdrop) backdrop.style.display = 'flex';

  // Highlight matching row
  document.querySelectorAll('#dash-table-container tbody tr').forEach(function(tr) {
    const attr = tr.getAttribute('onclick') || '';
    tr.classList.toggle('row-selected', attr.indexOf(id) !== -1);
  });
}

/**
 * Close the detail panel and remove row highlighting.
 */
export function closeDetailPanel() {
  const backdrop = document.getElementById('detail-panel-backdrop');
  if (backdrop) backdrop.style.display = 'none';

  document.querySelectorAll('#dash-table-container tbody tr').forEach(function(tr) {
    tr.classList.remove('row-selected');
  });

  setCurrentDetailId(null);
}

/**
 * Render invoice A4 pages into a hidden off-screen container for PDF generation.
 * Safe: buildPagesFromData() escapes all user-supplied values via esc() before returning HTML.
 * @param {Object} daten - invoice.daten JSONB
 * @returns {HTMLElement} The container — caller must call .remove() when done.
 */
async function renderOffscreen(daten) {
  const wrap = document.createElement('div');
  // Must stay on-screen and visible for html2canvas to capture content.
  // Use z-index:-1 to hide behind the UI, clip to zero visual height.
  wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;pointer-events:none;overflow:hidden;height:0';
  const pages = await buildPagesFromData(daten);
  pages.forEach(function(pageHtml) { wrap.insertAdjacentHTML('beforeend', pageHtml); });
  document.body.appendChild(wrap);
  return wrap;
}

/**
 * Render the full detail panel HTML into #detail-panel.
 * All user-supplied values pass through escHtml() before innerHTML insertion.
 * @param {Object} r - full rechnung record from Supabase
 */
async function renderDetailPanel(r) {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;

  const waehrung    = (r && r.waehrung) || 'CHF';
  const totalBetrag = parseFloat((r && r.betrag) || 0);
  const numStr      = (r && r.nummer) ? '#' + String(r.nummer).padStart(3, '0') : 'Entwurf';
  const numSafe     = escHtml(numStr);
  const safeId      = escHtml(r && r.id);

  // Info values — use actual snapshot field IDs from templates.js collectState()
  const empName = escHtml(field(r,F.EMP_NAME)    || (r && r.empfaenger_name) || '\u2014');
  const empAddr = [
    field(r,F.EMP_STRASSE),
    field(r,F.EMP_ORT),
  ].filter(Boolean).join(', ');

  const absName = escHtml(field(r,F.STELL_NAME) || (r && r.absender_name) || '\u2014');
  const absAddr = [
    field(r,F.STELL_ADRESSE),
    field(r,F.STELL_ORT),
  ].filter(Boolean).join(', ');

  // Datum/Zahlbar from meta array (label-based lookup)
  const meta       = (r && r.daten && r.daten.meta) || [];
  const findMeta   = lbl => (meta.find(m => m.show && m.label && m.label.toLowerCase().includes(lbl)) || {}).value || '';
  const rechnDatum = escHtml(findMeta('datum')   || formatDate(r && r.created_at));
  const faellig    = escHtml(findMeta('zahlbar') || findMeta('fällig') || '\u2014');
  const bank       = escHtml(field(r,F.BANK_NAME) || '\u2014');
  const iban       = escHtml(field(r,F.IBAN)      || '\u2014');

  // Positions — state uses { desc, price, qty }
  const positions = (r && r.daten && r.daten.positions) || [];
  const posRows   = positions.map(function(p) {
    const menge = parseFloat(p.qty   != null ? p.qty   : 1);
    const preis = parseFloat(p.price != null ? p.price : 0);
    const tot   = menge * preis;
    const bez   = escHtml(p.desc || '\u2014');
    return '<tr>'
      + '<td>' + bez + '</td>'
      + '<td>' + menge.toLocaleString('de-CH') + '</td>'
      + '<td>' + preis.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>'
      + '<td>' + tot.toLocaleString('de-CH',   { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>'
      + '</tr>';
  }).join('');

  // Status action buttons — IDs are escaped UUIDs; labels are static
  var statusActions = '';
  var s = r && r.status;
  if (s === 'offen') {
    statusActions =
      '<button class="btn btn-ghost" style="color:var(--amber);border-color:var(--amber)" onclick="handleStatusChange(\'' + safeId + '\',\'versendet\')">Rechnung versenden</button>'
      + '<button class="btn btn-ghost" style="color:var(--green);border-color:var(--green)" onclick="handleStatusChange(\'' + safeId + '\',\'bezahlt\')">Als bezahlt markieren</button>'
      + '<button class="btn btn-danger" onclick="handleStatusChange(\'' + safeId + '\',\'storniert\')">Stornieren</button>';
  } else if (s === 'versendet') {
    statusActions =
      '<button class="btn btn-ghost" style="color:var(--green);border-color:var(--green)" onclick="handleStatusChange(\'' + safeId + '\',\'bezahlt\')">Als bezahlt markieren</button>'
      + '<button class="btn btn-danger" onclick="handleStatusChange(\'' + safeId + '\',\'storniert\')">Stornieren</button>';
  } else if (s === 'entwurf') {
    statusActions =
      '<button class="btn btn-ghost" style="color:var(--amber);border-color:var(--amber)" onclick="window.bucheRechnung && window.bucheRechnung(\'' + safeId + '\')">Rechnung versenden</button>';
  }

  const accordionBodyId = 'dp-pdf-accordion-body';
  const chevronId       = 'dp-pdf-chevron';

  var html =
    // Header
    '<div class="dp-header">'
    + '<div class="dp-header-info">'
    +   '<div class="dp-num">Rechnung ' + numSafe + '</div>'
    +   '<div class="dp-title">' + escHtml((r && r.empfaenger_name) || '\u2014') + '</div>'
    +   '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
    +     getStatusBadge(r && r.status)
    +     '<span style="font-size:11px;color:var(--muted);font-family:var(--mono)">' + formatCHF(totalBetrag, waehrung) + '</span>'
    +   '</div>'
    + '</div>'
    + '<div class="dp-header-actions">'
    +   '<button class="icon-btn" title="Im Editor \u00F6ffnen" onclick="_dpOpenEditor()">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    +       '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>'
    +       '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'
    +     '</svg>'
    +   '</button>'
    +   '<button class="icon-btn" title="PDF herunterladen" onclick="_dpDownloadPDF()">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    +       '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
    +       '<polyline points="7 10 12 15 17 10"/>'
    +       '<line x1="12" y1="15" x2="12" y2="3"/>'
    +     '</svg>'
    +   '</button>'
    +   '<button class="icon-btn" title="Drucken" onclick="_dpPrint()">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    +       '<polyline points="6 9 6 2 18 2 18 9"/>'
    +       '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>'
    +       '<rect x="6" y="14" width="12" height="8"/>'
    +     '</svg>'
    +   '</button>'
    +   '<button class="icon-btn icon-btn-danger" title="L\u00F6schen" onclick="_dpDelete(\'' + safeId + '\')">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    +       '<polyline points="3 6 5 6 21 6"/>'
    +       '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'
    +       '<path d="M10 11v6"/><path d="M14 11v6"/>'
    +       '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'
    +     '</svg>'
    +   '</button>'
    +   '<button class="icon-btn" title="Schliessen" onclick="closeDetailPanel()">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">'
    +       '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
    +     '</svg>'
    +   '</button>'
    + '</div>'
    + '</div>'

    // Body
    + '<div class="dp-body">'

    // Info grid
    + '<div class="info-grid">'
    +   '<div class="info-item">'
    +     '<label>Empf\u00E4nger</label><span>' + empName + '</span>'
    +     (empAddr ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + escHtml(empAddr) + '</div>' : '')
    +   '</div>'
    +   '<div class="info-item">'
    +     '<label>Absender</label><span>' + absName + '</span>'
    +     (absAddr ? '<div style="font-size:11px;color:var(--muted);margin-top:2px">' + escHtml(absAddr) + '</div>' : '')
    +   '</div>'
    +   '<div class="info-item"><label>Datum</label><span>' + rechnDatum + '</span></div>'
    +   '<div class="info-item"><label>Zahlbar bis</label><span>' + faellig + '</span></div>'
    + '</div>'

    // Positionen
    + '<div class="section-card">'
    +   '<div class="section-card-header">Positionen</div>'
    +   '<div class="section-card-body">'
    +     '<table class="pos-table">'
    +       '<thead><tr>'
    +         '<th>Bezeichnung</th>'
    +         '<th style="text-align:right">Menge</th>'
    +         '<th style="text-align:right">Preis</th>'
    +         '<th style="text-align:right">Total</th>'
    +       '</tr></thead>'
    +       '<tbody>'
    +         (posRows || '<tr><td colspan="4" style="color:var(--muted);font-style:italic;font-size:12px">Keine Positionen erfasst</td></tr>')
    +       '</tbody>'
    +     '</table>'
    +     '<div class="total-line">'
    +       '<span class="lbl">Total</span>'
    +       '<span class="val">' + formatCHF(totalBetrag, waehrung) + '</span>'
    +     '</div>'
    +   '</div>'
    + '</div>'

    // Bank / IBAN
    + '<div class="info-grid">'
    +   '<div class="info-item"><label>Bank</label><span>' + bank + '</span></div>'
    +   '<div class="info-item"><label>IBAN</label>'
    +     '<span style="font-family:var(--mono);font-size:11px;word-break:break-all">' + iban + '</span>'
    +   '</div>'
    + '</div>'

    // PDF accordion
    + '<div class="pdf-accordion">'
    +   '<div class="pdf-accordion-header" onclick="_dpTogglePdf()">'
    +     '<div class="pdf-accordion-title">'
    +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    +         '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
    +         '<polyline points="14 2 14 8 20 8"/>'
    +       '</svg>'
    +       'PDF Vorschau'
    +     '</div>'
    +     '<svg id="' + chevronId + '" class="pdf-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">'
    +       '<polyline points="6 9 12 15 18 9"/>'
    +     '</svg>'
    +   '</div>'
    +   '<div id="' + accordionBodyId + '" class="pdf-accordion-body" style="display:none">'
    +     '<div class="dp-a4-preview-wrap"><div id="dp-a4-pages"></div></div>'
    +   '</div>'
    + '</div>'

    // Status actions
    + (statusActions
        ? '<div style="background:var(--surface2);border:1px solid var(--border,#e5e7eb);border-radius:var(--radius);padding:14px 16px;margin-bottom:18px">'
          + '<div class="section-label" style="margin-bottom:10px">Status \u00E4ndern</div>'
          + '<div style="display:flex;flex-wrap:wrap;gap:8px">' + statusActions + '</div>'
          + '</div>'
        : '')

    + '</div>'; // /dp-body

  panel.innerHTML = html;

  // Inject real A4 preview pages into the accordion placeholder
  const a4Container = document.getElementById('dp-a4-pages');
  if (a4Container && r.daten) {
    const pages = await buildPagesFromData(r.daten);
    // Pages HTML is generated by buildPages() which escapes all user content via esc()
    a4Container.innerHTML = pages.join('');
  }

  // Open invoice in editor (drafts: editable + auto-save; booked: readonly)
  window._dpOpenEditor = async function() {
    if (r.status === 'entwurf') {
      if (typeof window.ladeEntwurf === 'function') await window.ladeEntwurf(r.id);
    } else {
      if (typeof window.ladeAusArchiv === 'function') await window.ladeAusArchiv(r.id);
    }
    const titleText = r.status === 'entwurf'
      ? 'Entwurf bearbeiten'
      : 'Rechnung ' + numStr;
    showEditor('edit', titleText);
    closeDetailPanel();
  };

  // Accordion toggle (re-bound on each panel open)
  window._dpTogglePdf = function() {
    const body    = document.getElementById(accordionBodyId);
    const chevron = document.getElementById(chevronId);
    if (!body) return;
    const wasOpen = body.style.display !== 'none';
    body.style.display = wasOpen ? 'none' : 'block';
    if (chevron) chevron.classList.toggle('open', !wasOpen);
  };

  // Download PDF using an off-screen render — no accordion flash
  window._dpDownloadPDF = async function() {
    const wrap     = await renderOffscreen(r.daten);
    const rawName  = (r && r.empfaenger_name) || 'Rechnung';
    const filename = rawName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    await downloadPDF(wrap, filename);
    wrap.remove();
  };

  // Print using an off-screen render — no accordion flash
  window._dpPrint = async function() {
    const wrap = await renderOffscreen(r.daten);
    await printPDF(wrap);
    wrap.remove();
  };

  // Delete with confirmation
  window._dpDelete = async function(deleteId) {
    const ok = await window.showConfirm(
      'Rechnung löschen?',
      'Diese Aktion kann nicht rückgängig gemacht werden.'
    );
    if (!ok) return;
    try {
      const { deleteRechnung } = await import('../supabase.js');
      await deleteRechnung(deleteId);
      closeDetailPanel();
      await loadRechnungen();
    } catch (err) {
      console.error('_dpDelete:', err);
      window.showToast?.('Fehler beim Löschen der Rechnung.', 'error');
    }
  };
}

// ── Status change ─────────────────────────────────────────────────────────────

/**
 * Update the status of an invoice and refresh the panel and table.
 * @param {string} id
 * @param {string} newStatus
 */
export async function handleStatusChange(id, newStatus) {
  const labels = {
    versendet:  { title: 'Rechnung versenden',      msg: 'Status auf «Versendet» setzen?', ok: 'Versenden',   theme: 'amber', icon: 'send' },
    bezahlt:    { title: 'Als bezahlt markieren',    msg: 'Status auf «Bezahlt» setzen?',   ok: 'Bestätigen',  theme: 'green', icon: 'check' },
    storniert:  { title: 'Rechnung stornieren',      msg: 'Diese Rechnung wirklich stornieren? Dies kann nicht rückgängig gemacht werden.', ok: 'Stornieren', theme: 'danger', icon: 'ban' },
  };
  const lbl = labels[newStatus];
  if (lbl) {
    const ok = await window.showConfirm(lbl.title, lbl.msg, lbl.ok, { theme: lbl.theme, icon: lbl.icon });
    if (!ok) return;
  }

  try {
    await updateRechnungStatus(id, newStatus);
  } catch (err) {
    console.error('handleStatusChange:', err);
    window.showToast?.('Fehler beim Statuswechsel.', 'error');
    return;
  }

  const toastLabels = { versendet: 'Rechnung versendet', bezahlt: 'Als bezahlt markiert', storniert: 'Rechnung storniert' };
  window.showToast?.(toastLabels[newStatus] || 'Status geändert', 'success');

  // Re-fetch updated record and refresh panel
  try {
    const updated = await fetchRechnungById(id);
    if (updated) await renderDetailPanel(updated);
  } catch (err) {
    console.error('handleStatusChange re-fetch:', err);
  }

  // Refresh full list
  try {
    setAllRechnungen(await fetchRechnungen());
  } catch (_) {
    // Non-fatal
  }
  renderDashboardStats(allRechnungen);
  renderInvoiceTable();
}
