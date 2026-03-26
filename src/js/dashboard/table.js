/**
 * dashboard/table.js — Invoice table rendering and sorting.
 */

import { escHtml, formatCHF, formatDate, setText } from '../utils.js';
import { allRechnungen, filterState, sortState, currentDetailId } from './state.js';
import { getStatusBadge } from './helpers.js';

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
