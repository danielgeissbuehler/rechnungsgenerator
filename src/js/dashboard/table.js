/**
 * dashboard/table.js — Invoice table rendering and sorting.
 */

import { escHtml, formatCHF, formatDate, setText } from '../utils.js';
import { allRechnungen, filterState, sortState, currentDetailId } from './state.js';
import { getStatusBadge, field } from './helpers.js';

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

/**
 * Apply filterState, sort DESC by date, and render the invoice table.
 * All user data in the rendered HTML is sanitised via escHtml().
 */
export function renderInvoiceTable() {
  // 1. Filter
  let list = allRechnungen.filter(function(r) {
    if (filterState.absender.length   && filterState.absender.indexOf(r.absender_name)     === -1) return false;
    if (filterState.empfaenger.length && filterState.empfaenger.indexOf(r.empfaenger_name) === -1) return false;
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
        field(r, 'f-titel'),
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

  // SVG icon snippets (hardcoded, no user data)
  const IC_BUILDING = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>';
  const IC_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  const IC_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

  // 4. Card rows — all user data sanitised via escHtml()
  const rows = list.map(function(r) {
    const numDisplay    = r.nummer ? '#' + String(r.nummer).padStart(3, '0') : '\u2014';
    const titel         = field(r, 'f-titel') || '';
    const dateDisplay   = formatDate(r.created_at);
    const amountDisplay = formatCHF(parseFloat(r.betrag) || 0, r.waehrung || 'CHF');
    const selectedClass = r.id === currentDetailId ? ' row-selected' : '';
    const stateClass    = r.status === 'entwurf' ? ' ca-row-entwurf'
                        : r.status === 'storniert' ? ' ca-row-storniert' : '';
    const safeId        = escHtml(r.id);

    return '<div class="ca-row' + selectedClass + stateClass + '" data-id="' + safeId + '" onclick="openDetailPanel(\'' + safeId + '\')">'
      + '<div class="ca-num">' + escHtml(numDisplay) + '</div>'
      + '<div class="ca-main">'
      +   '<div class="ca-title">' + escHtml(titel || r.empfaenger_name || '\u2014') + '</div>'
      +   '<div class="ca-sub">'
      +     '<span class="ca-meta">' + IC_BUILDING + ' ' + escHtml(r.absender_name || '\u2014') + '</span>'
      +     '<span class="ca-meta">' + IC_ARROW + ' ' + escHtml(r.empfaenger_name || '\u2014') + '</span>'
      +     '<span class="ca-meta">' + IC_CAL + ' ' + escHtml(dateDisplay) + '</span>'
      +   '</div>'
      + '</div>'
      + '<div class="ca-amount">' + amountDisplay + '</div>'
      + '<div class="ca-status">' + getStatusBadge(r.status) + '</div>'
      + '<div class="ca-actions">'
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
      +   (r.status === 'entwurf'
          ? '<button class="row-action-btn row-action-btn-danger" title="L\u00F6schen"'
          +   ' onclick="event.stopPropagation();_rowDelete(\'' + safeId + '\')">'
          +     '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
          +       ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
          +       '<polyline points="3 6 5 6 21 6"/>'
          +       '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'
          +       '<path d="M10 11v6"/><path d="M14 11v6"/>'
          +       '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'
          +     '</svg>'
          +   '</button>'
          : '<button class="row-action-btn row-action-btn-danger" title="Nur Entw\u00FCrfe k\u00F6nnen gel\u00F6scht werden" disabled>'
          +     '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
          +       ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
          +       '<polyline points="3 6 5 6 21 6"/>'
          +       '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'
          +       '<path d="M10 11v6"/><path d="M14 11v6"/>'
          +       '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'
          +     '</svg>'
          +   '</button>')
      + '</div>'
      + '</div>';
  }).join('');

  /** Build a sort button for the sort bar. */
  function sortBtn(col, label) {
    const active = sortState.col === col;
    const arrow  = active ? (sortState.dir === 'asc' ? ' \u2191' : ' \u2193') : '';
    const cls    = active ? ' ca-sort-active' : '';
    return '<span class="ca-sort-btn' + cls + '" onclick="dashSortBy(\'' + col + '\')">'
      + label + arrow + '</span>';
  }

  /* innerHTML is used intentionally; all user data in rows is sanitised via escHtml().
     The sortBtn() helper only uses hardcoded string literals — no user input. */
  container.innerHTML =
      '<div class="ca-sort-bar">'
    +   sortBtn('nummer', 'Nr.')
    +   '<span>' + sortBtn('absender_name', 'Absender') + ' &middot; ' + sortBtn('empfaenger_name', 'Empf\u00E4nger') + '</span>'
    +   sortBtn('betrag', 'Betrag')
    +   sortBtn('status', 'Status')
    +   sortBtn('created_at', 'Datum')
    + '</div>'
    + '<div class="ca-list">' + rows + '</div>'
    + '<div class="ca-footer">'
    +   '<span>Total (' + list.length + ' Rechnungen)</span>'
    +   '<span>' + formatCHF(totalSum, waehrung) + '</span>'
    + '</div>';
}
