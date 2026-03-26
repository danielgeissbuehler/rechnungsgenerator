/**
 * dashboard.js — Dashboard view controller for the Rechnungsgenerator app.
 *
 * Handles: view switching, invoice list, filters, stats, detail panel,
 * new-invoice modal, and status management.
 *
 * ES Module — imported by main.js (Vite build).
 * All functions callable from HTML onclick are exported AND assigned to window.*.
 *
 * innerHTML is used intentionally to render structured HTML templates.
 * All user-supplied values are sanitised through escHtml() before insertion.
 */

import {
  fetchRechnungen,
  fetchRechnungById,
  updateRechnungStatus,
  isConfigured,
} from './supabase.js';
import { buildPagesFromData } from './render.js';
import { fillSimpleEditor } from './editor-simple.js';
import { scalePreview } from './ui.js';
import { downloadPDF, printPDF } from './pdf.js';

// ── Module state ─────────────────────────────────────────────────────────────

/** @type {Array<Object>} Full invoice list from DB */
let allRechnungen = [];

/** @type {string|null} UUID of the currently open detail panel */
let currentDetailId = null;

let filterState = {
  absender:   '',
  empfaenger: '',
  status:     'alle',
  betragVon:  null,
  betragBis:  null,
  suche:      '',
};

/** @type {{ col: string, dir: 'asc'|'desc' }} Active sort column and direction */
let sortState = { col: 'created_at', dir: 'desc' };

/**
 * Toggle sort column/direction and re-render the table.
 * @param {string} col
 */
export function dashSortBy(col) {
  if (sortState.col === col) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.col = col;
    sortState.dir = col === 'betrag' || col === 'created_at' ? 'desc' : 'asc';
  }
  renderInvoiceTable();
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Safely set the textContent of a DOM element by ID.
 * @param {string} id
 * @param {string} text
 */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * Escape a string for safe insertion into HTML attribute values and text nodes.
 * Every user-controlled value rendered via innerHTML is passed through this.
 * @param {string|null|undefined} str
 * @returns {string}
 */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a number as "CHF 4'200.00" (de-CH locale).
 * @param {number|string} betrag
 * @param {string} [waehrung='CHF']
 * @returns {string}
 */
function formatCHF(betrag, waehrung) {
  if (waehrung == null) waehrung = 'CHF';
  const num = parseFloat(betrag) || 0;
  const formatted = num.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return escHtml(waehrung) + '\u00A0' + formatted;
}

/**
 * Format an ISO date string for display in de-CH locale.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('de-CH');
}

/**
 * Safely read a field from r.daten.fields.
 * @param {Object} r
 * @param {string} key
 * @returns {string}
 */
function field(r, key) {
  return (r && r.daten && r.daten.fields && r.daten.fields[key] != null)
    ? r.daten.fields[key]
    : '';
}

/**
 * Returns the HTML for a status badge. Labels are static — no user data.
 * badge-blue / badge-red carry inline-style fallbacks for robustness.
 * @param {string} status
 * @returns {string}
 */
function getStatusBadge(status) {
  switch (status) {
    case 'entwurf':
      return '<span class="badge badge-gray">Entwurf</span>';
    case 'offen':
      return '<span class="badge badge-amber">Offen</span>';
    case 'versendet':
      return '<span class="badge badge-blue" style="background:#dbeafe;color:#1e40af">Versendet</span>';
    case 'bezahlt':
      return '<span class="badge badge-green">Bezahlt</span>';
    case 'storniert':
      return '<span class="badge badge-red" style="background:#fee2e2;color:#991b1b">Storniert</span>';
    default:
      return '<span class="badge badge-gray">' + escHtml(status || '\u2014') + '</span>';
  }
}

// ── View switching ────────────────────────────────────────────────────────────

/**
 * Show the dashboard view, hide the editor, and reload invoices.
 */
export function showDashboard() {
  const vEditor      = document.getElementById('view-editor');
  const topbarDash   = document.getElementById('topbar-dash');
  const topbarEditor = document.getElementById('topbar-editor');

  if (vEditor)      vEditor.style.display      = 'none';
  if (topbarDash)   topbarDash.style.display   = 'contents';
  if (topbarEditor) topbarEditor.style.display = 'none';

  // Mark first nav-item (Dashboard) active
  document.querySelectorAll('.nav-item').forEach(function(el, i) {
    el.classList.toggle('active', i === 0);
  });

  loadRechnungen();
}

/**
 * Show the editor view over the app shell. Dashboard sidebar stays visible.
 * @param {'new'|'edit'|'copy'} [mode='new']
 * @param {string} [titleText='Neue Rechnung']
 */
export function showEditor(mode, titleText) {
  if (mode      == null) mode      = 'new';
  if (titleText == null) titleText = 'Neue Rechnung';

  const vEditor      = document.getElementById('view-editor');
  const topbarDash   = document.getElementById('topbar-dash');
  const topbarEditor = document.getElementById('topbar-editor');

  if (vEditor)      vEditor.style.display      = 'flex';
  if (topbarDash)   topbarDash.style.display   = 'none';
  if (topbarEditor) topbarEditor.style.display = 'contents';

  const titleEl = document.getElementById('editor-topbar-title');
  if (titleEl) titleEl.textContent = titleText;

  // Einfacher Editor für normale Rechnungen, voller Editor nur für Vorlagen
  const isSimple = mode !== 'vorlage';
  if (vEditor) vEditor.classList.toggle('simple-mode', isSimple);
  if (isSimple) fillSimpleEditor();

  // Scale preview to fit available width after layout settles
  requestAnimationFrame(() => scalePreview());
}

// ── Data & filter ─────────────────────────────────────────────────────────────

/**
 * Fetch all invoices from Supabase, populate filter dropdowns, render stats + table.
 */
export async function loadRechnungen() {
  if (!isConfigured()) {
    allRechnungen = [];
    renderDashboardStats(allRechnungen);
    renderInvoiceTable();
    return;
  }

  try {
    allRechnungen = await fetchRechnungen();
  } catch (err) {
    console.error('loadRechnungen:', err);
    allRechnungen = [];
  }

  // Absender filter dropdown
  const absEl = document.getElementById('filter-absender');
  if (absEl) {
    const unique = Array.from(
      new Set(allRechnungen.map(function(r) { return r.absender_name; }).filter(Boolean))
    ).sort();
    absEl.innerHTML = '<option value="">Alle</option>'
      + unique.map(function(n) {
          return '<option value="' + escHtml(n) + '">' + escHtml(n) + '</option>';
        }).join('');
    absEl.value = filterState.absender;
  }

  // Empfanger filter dropdown
  const empEl = document.getElementById('filter-empfaenger');
  if (empEl) {
    const unique = Array.from(
      new Set(allRechnungen.map(function(r) { return r.empfaenger_name; }).filter(Boolean))
    ).sort();
    empEl.innerHTML = '<option value="">Alle</option>'
      + unique.map(function(n) {
          return '<option value="' + escHtml(n) + '">' + escHtml(n) + '</option>';
        }).join('');
    empEl.value = filterState.empfaenger;
  }

  // Kopie select in new-invoice modal
  const kopieEl = document.getElementById('modal-kopie-select');
  if (kopieEl) {
    const opts = allRechnungen
      .filter(function(r) { return r.status !== 'entwurf'; })
      .map(function(r) {
        const numPart = r.nummer ? 'Nr.\u00A0' + r.nummer : 'Entwurf';
        const label   = numPart + ' \u2013 ' + (r.empfaenger_name || '\u2014');
        return '<option value="' + escHtml(r.id) + '">' + escHtml(label) + '</option>';
      })
      .join('');
    kopieEl.innerHTML = '<option value="">\u2014 Rechnung w\u00E4hlen \u2014</option>' + opts;
  }

  renderDashboardStats(allRechnungen);
  renderInvoiceTable();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

/**
 * Compute and render stat card values from the full invoice list.
 * Also triggers sidebar user update (async, non-blocking).
 * @param {Array<Object>} [list]
 */
export function renderDashboardStats(list) {
  if (list == null) list = allRechnungen;

  const now       = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const total = list.length;
  const thisMonthCount = list.filter(function(r) {
    const d = new Date(r.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const offenList  = list.filter(function(r) { return r.status === 'offen' || r.status === 'versendet'; });
  const offenCount = offenList.length;
  const offenSum   = offenList.reduce(function(s, r) { return s + (parseFloat(r.betrag) || 0); }, 0);

  const bezahltList = list.filter(function(r) {
    return r.status === 'bezahlt' && new Date(r.created_at).getFullYear() === thisYear;
  });
  const bezahltCount = bezahltList.length;
  const bezahltSum   = bezahltList.reduce(function(s, r) { return s + (parseFloat(r.betrag) || 0); }, 0);

  const ausstehendSum   = offenSum;
  const offenBadgeCount = list.filter(function(r) { return r.status === 'offen'; }).length;

  setText('stat-total',       String(total));
  setText('stat-total-sub',   '+' + thisMonthCount + ' diesen Monat');
  setText('stat-offen',       String(offenCount));
  setText('stat-offen-sub',   formatCHF(offenSum) + ' ausstehend');
  setText('stat-bezahlt',     String(bezahltCount));
  setText('stat-bezahlt-sub', formatCHF(bezahltSum) + ' bezahlt');
  setText('stat-ausstehend',  formatCHF(ausstehendSum));

  const badge = document.getElementById('nav-badge-offen');
  if (badge) {
    badge.textContent   = String(offenBadgeCount);
    badge.style.display = offenBadgeCount > 0 ? 'inline-block' : 'none';
  }

  updateSidebarUser();
}

/**
 * Fetch current auth session and update sidebar user elements via textContent.
 * Failures are silently ignored — this info is cosmetic.
 */
async function updateSidebarUser() {
  try {
    const { getSession } = await import('./supabase.js');
    const session = await getSession();
    const user    = session && session.user;
    if (user) {
      const email    = user.email || '';
      const meta     = user.user_metadata || {};
      const fullName = meta.full_name || meta.name || email.split('@')[0] || '\u2014';
      const initials = fullName
        .split(' ')
        .map(function(p) { return p[0] || ''; })
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';
      setText('sidebar-user-name',  fullName);
      setText('sidebar-user-email', email);
      setText('sidebar-avatar',     initials);
    }
  } catch (_) {
    // Silently ignore
  }
}

// ── Filter handlers ───────────────────────────────────────────────────────────

/**
 * Read current filter input values and re-render the invoice table.
 */
export function dashFilterChanged() {
  const absEl = document.getElementById('filter-absender');
  const empEl = document.getElementById('filter-empfaenger');
  const srcEl = document.getElementById('dash-search');
  const vonEl = document.getElementById('filter-betrag-von');
  const bisEl = document.getElementById('filter-betrag-bis');

  filterState.absender   = (absEl && absEl.value)  || '';
  filterState.empfaenger = (empEl && empEl.value)  || '';
  filterState.suche      = (srcEl && srcEl.value)  || '';

  const von = vonEl ? vonEl.value : '';
  const bis = bisEl ? bisEl.value : '';
  filterState.betragVon = (von !== '' && von != null) ? parseFloat(von) : null;
  filterState.betragBis = (bis !== '' && bis != null) ? parseFloat(bis) : null;

  renderInvoiceTable();
}

/**
 * Activate a status filter tab.
 * @param {HTMLElement} el - clicked .ftab element
 */
export function dashSetStatusTab(el) {
  document.querySelectorAll('#dash-status-tabs .ftab').forEach(function(t) {
    t.classList.remove('active');
  });
  el.classList.add('active');
  filterState.status = el.dataset.status || 'alle';
  renderInvoiceTable();
}

// ── Table rendering ───────────────────────────────────────────────────────────

/**
 * Apply filterState, sort DESC by date, and render the invoice table.
 * All user data in the rendered HTML is sanitised via escHtml().
 */
export function renderInvoiceTable() {
  // 1. Filter
  let list = allRechnungen.filter(function(r) {
    if (filterState.absender   && r.absender_name   !== filterState.absender)   return false;
    if (filterState.empfaenger && r.empfaenger_name !== filterState.empfaenger) return false;
    if (filterState.status !== 'alle' && r.status !== filterState.status)        return false;
    if (filterState.betragVon != null && (parseFloat(r.betrag) || 0) < filterState.betragVon) return false;
    if (filterState.betragBis != null && (parseFloat(r.betrag) || 0) > filterState.betragBis) return false;
    if (filterState.suche) {
      const q       = filterState.suche.toLowerCase();
      const dateStr = r.created_at ? formatDate(r.created_at) : '';
      const haystack = [
        r.nummer ? String(r.nummer) : '',
        r.absender_name   || '',
        r.empfaenger_name || '',
        String(parseFloat(r.betrag) || 0),
        dateStr,
      ].join(' ').toLowerCase();
      if (haystack.indexOf(q) === -1) return false;
    }
    return true;
  });

  // 2. Sort by sortState
  list = list.slice().sort(function(a, b) {
    let va, vb;
    switch (sortState.col) {
      case 'nummer':
        va = parseInt(a.nummer, 10) || 0;
        vb = parseInt(b.nummer, 10) || 0;
        break;
      case 'absender_name':
        va = (a.absender_name   || '').toLowerCase();
        vb = (b.absender_name   || '').toLowerCase();
        break;
      case 'empfaenger_name':
        va = (a.empfaenger_name || '').toLowerCase();
        vb = (b.empfaenger_name || '').toLowerCase();
        break;
      case 'betrag':
        va = parseFloat(a.betrag) || 0;
        vb = parseFloat(b.betrag) || 0;
        break;
      case 'status':
        va = a.status || '';
        vb = b.status || '';
        break;
      default: // created_at
        va = new Date(a.created_at).getTime();
        vb = new Date(b.created_at).getTime();
    }
    if (va < vb) return sortState.dir === 'asc' ? -1 : 1;
    if (va > vb) return sortState.dir === 'asc' ?  1 : -1;
    return 0;
  });

  // 3. Update title
  setText('dash-table-title', 'Rechnungen (' + list.length + ')');

  const container = document.getElementById('dash-table-container');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:13px">Keine Rechnungen gefunden.</div>';
    return;
  }

  const totalSum = list.reduce(function(s, r) { return s + (parseFloat(r.betrag) || 0); }, 0);
  const waehrung = (list[0] && list[0].waehrung) || 'CHF';

  // 4. Rows — all user data sanitised via escHtml()
  const rows = list.map(function(r) {
    const numDisplay    = r.nummer ? '#' + String(r.nummer).padStart(3, '0') : '\u2014';
    const dateDisplay   = formatDate(r.created_at);
    const amountDisplay = formatCHF(parseFloat(r.betrag) || 0, r.waehrung || 'CHF');
    const selectedClass = r.id === currentDetailId ? ' row-selected' : '';
    const safeId        = escHtml(r.id);

    return '<tr class="' + selectedClass.trim() + '" onclick="openDetailPanel(\'' + safeId + '\')">'
      + '<td class="td-num">'    + escHtml(numDisplay)                  + '</td>'
      + '<td class="td-name">'   + escHtml(r.absender_name   || '\u2014') + '</td>'
      + '<td class="td-loc">'    + escHtml(r.empfaenger_name || '\u2014') + '</td>'
      + '<td class="td-amount">' + amountDisplay                        + '</td>'
      + '<td class="td-date">'   + escHtml(dateDisplay)                 + '</td>'
      + '<td>'                   + getStatusBadge(r.status)             + '</td>'
      + '<td class="td-actions">'
      +   '<button class="row-action-btn" title="Bearbeiten"'
      +   ' onclick="event.stopPropagation();_rowEdit(\'' + safeId + '\')">'
      +     '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      +       ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
      +       '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>'
      +       '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'
      +     '</svg>'
      +   '</button>'
      +   '<button class="row-action-btn" title="PDF herunterladen"'
      +   ' onclick="event.stopPropagation();_rowDownload(\'' + safeId + '\')">'
      +     '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      +       ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
      +       '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
      +       '<polyline points="7 10 12 15 17 10"/>'
      +       '<line x1="12" y1="15" x2="12" y2="3"/>'
      +     '</svg>'
      +   '</button>'
      +   '<button class="row-action-btn" title="Drucken"'
      +   ' onclick="event.stopPropagation();_rowPrint(\'' + safeId + '\')">'
      +     '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      +       ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
      +       '<polyline points="6 9 6 2 18 2 18 9"/>'
      +       '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>'
      +       '<rect x="6" y="14" width="12" height="8"/>'
      +     '</svg>'
      +   '</button>'
      +   '<button class="row-action-btn row-action-btn-danger" title="L\u00F6schen"'
      +   ' onclick="event.stopPropagation();_rowDelete(\'' + safeId + '\')">'
      +     '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      +       ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
      +       '<polyline points="3 6 5 6 21 6"/>'
      +       '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'
      +       '<path d="M10 11v6"/><path d="M14 11v6"/>'
      +       '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'
      +     '</svg>'
      +   '</button>'
      + '</td>'
      + '</tr>';
  }).join('');

  /**
   * Build a sortable <th> cell.
   * @param {string} col   — sort key (hardcoded, never user input)
   * @param {string} label — display text (hardcoded, never user input)
   * @returns {string}
   */
  function sortTh(col, label) {
    const active = sortState.col === col;
    const arrow  = active ? (sortState.dir === 'asc' ? ' \u2191' : ' \u2193') : ' \u2195';
    const cls    = active ? ' class="th-sort-active"' : '';
    return '<th' + cls + ' style="cursor:pointer;user-select:none"'
      + ' onclick="dashSortBy(\'' + col + '\')">'
      + label
      + '<span style="opacity:' + (active ? '1' : '.3') + ';font-size:10px;margin-left:3px">' + arrow + '</span>'
      + '</th>';
  }

  /* innerHTML is used intentionally; all user data in rows is sanitised via escHtml().
     The sortTh() helper only uses hardcoded string literals — no user input. */
  container.innerHTML = '<table>'
    + '<thead><tr>'
    +   sortTh('nummer',         'Nr.')
    +   sortTh('absender_name',  'Absender')
    +   sortTh('empfaenger_name','Empf\u00E4nger')
    +   sortTh('betrag',         'Betrag')
    +   sortTh('created_at',     'Datum')
    +   sortTh('status',         'Status')
    +   '<th></th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '<tfoot>'
    +   '<tr class="total-footer-row">'
    +     '<td colspan="3">Total (' + list.length + ' Rechnungen)</td>'
    +     '<td>' + formatCHF(totalSum, waehrung) + '</td>'
    +     '<td colspan="3"></td>'
    +   '</tr>'
    + '</tfoot>'
    + '</table>';
}

// ── Detail panel ──────────────────────────────────────────────────────────────

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

  currentDetailId = id;
  renderDetailPanel(rechnung);

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

  currentDetailId = null;
}

/**
 * Render invoice A4 pages into a hidden off-screen container for PDF generation.
 * Safe: buildPagesFromData() escapes all user-supplied values via esc() before returning HTML.
 * @param {Object} daten - invoice.daten JSONB
 * @returns {HTMLElement} The container — caller must call .remove() when done.
 */
function renderOffscreen(daten) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none';
  // buildPagesFromData() sanitises all user content via esc() — same as a4Container use below
  const pages = buildPagesFromData(daten);
  pages.forEach(function(pageHtml) { wrap.insertAdjacentHTML('beforeend', pageHtml); });
  document.body.appendChild(wrap);
  return wrap;
}

/**
 * Render the full detail panel HTML into #detail-panel.
 * All user-supplied values pass through escHtml() before innerHTML insertion.
 * @param {Object} r - full rechnung record from Supabase
 */
function renderDetailPanel(r) {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;

  const waehrung    = (r && r.waehrung) || 'CHF';
  const totalBetrag = parseFloat((r && r.betrag) || 0);
  const numStr      = (r && r.nummer) ? '#' + String(r.nummer).padStart(3, '0') : 'Entwurf';
  const numSafe     = escHtml(numStr);
  const safeId      = escHtml(r && r.id);

  // Info values — use actual snapshot field IDs from templates.js collectState()
  const empName = escHtml(field(r,'f-emp-name')    || (r && r.empfaenger_name) || '\u2014');
  const empAddr = [
    field(r,'f-emp-strasse'),
    field(r,'f-emp-ort'),
  ].filter(Boolean).join(', ');

  const absName = escHtml(field(r,'f-stell-name') || (r && r.absender_name) || '\u2014');
  const absAddr = [
    field(r,'f-stell-adresse'),
    field(r,'f-stell-ort'),
  ].filter(Boolean).join(', ');

  // Datum/Zahlbar from meta array (label-based lookup)
  const meta       = (r && r.daten && r.daten.meta) || [];
  const findMeta   = lbl => (meta.find(m => m.show && m.label && m.label.toLowerCase().includes(lbl)) || {}).value || '';
  const rechnDatum = escHtml(findMeta('datum')   || formatDate(r && r.created_at));
  const faellig    = escHtml(findMeta('zahlbar') || findMeta('fällig') || '\u2014');
  const bank       = escHtml(field(r,'f-bank-name') || '\u2014');
  const iban       = escHtml(field(r,'f-iban')      || '\u2014');

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
      '<button class="btn btn-ghost" onclick="handleStatusChange(\'' + safeId + '\',\'versendet\')">Als versendet markieren</button>'
      + '<button class="btn btn-ghost" style="color:var(--green)" onclick="handleStatusChange(\'' + safeId + '\',\'bezahlt\')">Als bezahlt markieren</button>'
      + '<button class="btn btn-danger" onclick="handleStatusChange(\'' + safeId + '\',\'storniert\')">Stornieren</button>';
  } else if (s === 'versendet') {
    statusActions =
      '<button class="btn btn-ghost" style="color:var(--green)" onclick="handleStatusChange(\'' + safeId + '\',\'bezahlt\')">Als bezahlt markieren</button>'
      + '<button class="btn btn-danger" onclick="handleStatusChange(\'' + safeId + '\',\'storniert\')">Stornieren</button>';
  } else if (s === 'entwurf') {
    statusActions =
      '<button class="btn btn-primary" onclick="window.bucheRechnung && window.bucheRechnung(\'' + safeId + '\')">Rechnung buchen</button>';
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
    const pages = buildPagesFromData(r.daten);
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
    const wrap     = renderOffscreen(r.daten);
    const rawName  = (r && r.empfaenger_name) || 'Rechnung';
    const filename = rawName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    await downloadPDF(wrap, filename);
    wrap.remove();
  };

  // Print using an off-screen render — no accordion flash
  window._dpPrint = async function() {
    const wrap = renderOffscreen(r.daten);
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
      const { deleteRechnung } = await import('./supabase.js');
      await deleteRechnung(deleteId);
      closeDetailPanel();
      await loadRechnungen();
    } catch (err) {
      console.error('_dpDelete:', err);
      alert('Fehler beim L\u00F6schen der Rechnung.');
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
  try {
    await updateRechnungStatus(id, newStatus);
  } catch (err) {
    console.error('handleStatusChange:', err);
    return;
  }

  // Re-fetch updated record and refresh panel
  try {
    const updated = await fetchRechnungById(id);
    if (updated) renderDetailPanel(updated);
  } catch (err) {
    console.error('handleStatusChange re-fetch:', err);
  }

  // Refresh full list
  try {
    allRechnungen = await fetchRechnungen();
  } catch (_) {
    // Non-fatal
  }
  renderDashboardStats(allRechnungen);
  renderInvoiceTable();
}

// ── New Invoice Modal ─────────────────────────────────────────────────────────

/**
 * Open the new-invoice modal and populate the Vorlage dropdown.
 */
export function handleNeueRechnung() {
  const vorlagenSelect = document.getElementById('modal-vorlage-select');
  if (vorlagenSelect) {
    const data = window._vorlagenData || {};
    const keys = Object.keys(data).sort();
    vorlagenSelect.innerHTML =
      '<option value="">\u2014 Vorlage w\u00E4hlen \u2014</option>'
      + keys.map(function(k) {
          return '<option value="' + escHtml(k) + '">' + escHtml(k) + '</option>';
        }).join('');
  }

  const overlay = document.getElementById('new-invoice-overlay');
  if (overlay) overlay.style.display = 'flex';

  const leerRadio = document.querySelector('[name=neue-rechnung-typ][value=leer]');
  if (leerRadio) leerRadio.checked = true;
}

/**
 * Close the new-invoice modal.
 */
export function closeNeueRechnungModal() {
  const overlay = document.getElementById('new-invoice-overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Confirm the modal selection and navigate to the editor.
 */
export async function confirmNeueRechnung() {
  const selected = document.querySelector('[name=neue-rechnung-typ]:checked');
  if (!selected) return;
  const typ = selected.value;

  if (typ === 'leer') {
    if (typeof window.neueRechnung === 'function') window.neueRechnung();
    showEditor('new', 'Neue Rechnung');
    closeNeueRechnungModal();
    window.speichereEntwurf?.();
    return;
  }

  if (typ === 'vorlage') {
    const vorlageSelect = document.getElementById('modal-vorlage-select');
    const vorlage       = (vorlageSelect && vorlageSelect.value) || '';
    if (!vorlage) {
      alert('Bitte eine Vorlage ausw\u00E4hlen.');
      return;
    }
    if (typeof window.loadTemplateByName === 'function') window.loadTemplateByName(vorlage);
    showEditor('new', 'Aus Vorlage');
    closeNeueRechnungModal();
    window.speichereEntwurf?.();
    return;
  }

  if (typ === 'kopie') {
    const kopieSelect = document.getElementById('modal-kopie-select');
    const kopieId     = (kopieSelect && kopieSelect.value) || '';
    if (!kopieId) {
      alert('Bitte eine Rechnung f\u00FCr die Kopie ausw\u00E4hlen.');
      return;
    }
    if (typeof window.kopieRechnung === 'function') await window.kopieRechnung(kopieId);
    showEditor('copy', 'Kopie');
    closeNeueRechnungModal();
    window.speichereEntwurf?.();
    return;
  }
}

/**
 * Copy an invoice directly (bypassing the modal) and open the editor.
 * @param {string} id
 */
export async function handleKopieRechnung(id) {
  if (typeof window.kopieRechnung === 'function') window.kopieRechnung(id);
  showEditor('copy', 'Kopie von Rechnung');
}

// ── Dashboard click-to-close ──────────────────────────────────────────────────
// Close the detail panel when clicking anywhere in the dashboard that isn't
// the panel itself or an invoice row (which will switch to that invoice).
document.addEventListener('click', function(e) {
  if (!currentDetailId) return;
  if (e.target.closest('#detail-panel')) return;
  if (e.target.closest('#dash-table-container tbody tr')) return;
  closeDetailPanel();
});

// ── Window exports ────────────────────────────────────────────────────────────
// All functions invoked from HTML onclick attributes must be on window.

window.showDashboard          = showDashboard;
window.showEditor             = showEditor;
window.dashFilterChanged      = dashFilterChanged;
window.dashSetStatusTab       = dashSetStatusTab;
window.openDetailPanel        = openDetailPanel;
window.closeDetailPanel       = closeDetailPanel;
window.handleStatusChange     = handleStatusChange;
window.handleNeueRechnung     = handleNeueRechnung;
window.closeNeueRechnungModal = closeNeueRechnungModal;
window.confirmNeueRechnung    = confirmNeueRechnung;
window.handleKopieRechnung    = handleKopieRechnung;
window.loadRechnungen         = loadRechnungen;
window.renderDashboardStats   = renderDashboardStats;
window.renderInvoiceTable     = renderInvoiceTable;

// ── Table row quick-action handlers ──────────────────────────────────────────

window._rowEdit = async function(id) {
  const r = await fetchRechnungById(id);
  if (!r) return;
  if (r.status === 'entwurf') {
    if (typeof window.ladeEntwurf === 'function') await window.ladeEntwurf(r.id);
  } else {
    if (typeof window.ladeAusArchiv === 'function') await window.ladeAusArchiv(r.id);
  }
  const numStr    = r.nummer ? '#' + String(r.nummer).padStart(3, '0') : 'Entwurf';
  const titleText = r.status === 'entwurf' ? 'Entwurf bearbeiten' : 'Rechnung ' + numStr;
  showEditor('edit', titleText);
};

window._rowDownload = async function(id) {
  const r = await fetchRechnungById(id);
  if (!r) return;
  const wrap     = renderOffscreen(r.daten);
  const rawName  = (r.empfaenger_name) || 'Rechnung';
  const filename = rawName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  await downloadPDF(wrap, filename);
  wrap.remove();
};

window._rowPrint = async function(id) {
  const r = await fetchRechnungById(id);
  if (!r) return;
  const wrap = renderOffscreen(r.daten);
  await printPDF(wrap);
  wrap.remove();
};

window._rowDelete = async function(id) {
  if (typeof window._dpDelete === 'function') await window._dpDelete(id);
};
