import { state } from './state.js';
import { val, chk, esc, fmt, fmtFull, nl2br } from './utils.js';
import { getMetaData } from './meta.js';

export function updatePreviewScale() {
  const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!isMobile) {
    document.documentElement.style.removeProperty('--preview-scale');
    return;
  }
  const scale = Math.min((window.innerWidth - 16) / 794, 1);
  document.documentElement.style.setProperty('--preview-scale', scale);
}

export async function render() {
  const wrap = document.getElementById('preview-wrap');
  const scrollTop = wrap.scrollTop;
  wrap.replaceChildren();
  buildPages().forEach(html => {
    const d = document.createElement('div');
    d.setHTMLUnsafe(html);
    wrap.appendChild(d.firstElementChild);
  });

  if (state.visibility.qrBill) {
    const total = state.positions.reduce((s, p) => s + p.price * p.qty, 0);
    const { buildQRPage } = await import('./qrbill.js');
    const qrHtml = await buildQRPage(Math.round(total * 20) / 20);
    if (qrHtml) {
      const d = document.createElement('div');
      d.setHTMLUnsafe(qrHtml);
      wrap.appendChild(d.firstElementChild);
    }
  }

  wrap.scrollTop = scrollTop;
  updatePreviewScale();
}

export function buildHeader(isFirst) {
  const sub  = isFirst ? '' : ' page-header--sub';
  const hide = !state.visibility.header ? ' style="visibility:hidden"' : '';
  const lines = [val('f-company'), val('f-email')].filter(Boolean);
  return `<div class="page-header${sub}"${hide}>${
    lines.length ? `<div class="company-name">${lines.map(esc).join('<br>')}</div>` : ''
  }</div>`;
}

export function buildFooter() {
  const vis       = state.visibility.bank ? '' : ' inv-hidden';
  const bankLines = [val('f-bank-name'), val('f-bank-adresse'), val('f-bank-strasse')].filter(Boolean);
  const iban      = val('f-iban');
  return `<div class="page-footer${vis}">
    <hr class="footer-line">
    <div class="footer-content">
      <div class="footer-left">
        ${bankLines.length ? `<span class="footer-bank-label">BANK</span><div>${bankLines.map(esc).join('<br>')}</div>` : ''}
      </div>
      ${iban ? `<div class="footer-iban">IBAN &nbsp; ${esc(iban)}</div>` : ''}
    </div>
  </div>`;
}

export function buildPages() {
  const { visibility: vis, positions, colAlign } = state;

  const empName    = val('f-emp-name');
  const empStrasse = val('f-emp-strasse');
  const empOrt     = val('f-emp-ort');
  const stName     = val('f-stell-name');
  const stAdresse  = val('f-stell-adresse');
  const stOrt      = val('f-stell-ort');
  const titel      = val('f-titel');
  const heading    = val('f-heading');
  const currency   = val('f-currency') || 'CHF';
  const showQtyTot = chk('chk-qty-total');

  const colPos    = val('f-col-pos')    || 'POSITION';
  const colPreis  = val('f-col-preis')  || 'PREIS';
  const colMenge  = val('f-col-menge')  || 'MENGE';
  const colTotal  = val('f-col-total')  || 'TOTAL';
  const colExtra5 = val('f-col-extra5');
  const colExtra6 = val('f-col-extra6');
  const colExtra7 = val('f-col-extra7');
  const colExtra8 = val('f-col-extra8');

  const useCol1 = vis.col1, useCol2 = vis.col2, useCol3 = vis.col3, useCol4 = vis.col4;
  const useCol5 = vis.col5, useCol6 = vis.col6, useCol7 = vis.col7, useCol8 = vis.col8;

  const textblockEl   = document.getElementById('f-textblock');
  const textblockRaw  = textblockEl ? textblockEl.getHTML() : '';
  const textblockText = textblockEl ? textblockEl.innerText.trim() : '';
  const useTextblock  = vis.textblock && textblockText.length > 0;

  const metaData = getMetaData();

  const showTitel = vis.titel && titel.trim().length > 0;
  const total     = positions.reduce((s, p) => s + p.price * p.qty, 0);
  const totalQty  = positions.reduce((s, p) => s + p.qty, 0);

  const aC = n => colAlign[n] === 'r' ? ' class="r"' : colAlign[n] === 'c' ? ' class="c"' : '';

  const colDefs = [
    { use: useCol1, label: colPos,                    n:1, baseW: 46 },
    { use: useCol5, label: colExtra5,                 n:5, baseW: 12 },
    { use: useCol6, label: colExtra6,                 n:6, baseW: 12 },
    { use: useCol2, label: colPreis,                  n:2, baseW: 16 },
    { use: useCol7, label: colExtra7,                 n:7, baseW: 12 },
    { use: useCol3, label: colMenge,                  n:3, baseW: 12 },
    { use: useCol8, label: colExtra8,                 n:8, baseW: 12 },
    { use: useCol4, label: colTotal + ' ' + currency, n:4, baseW: 20 },
  ];
  const visCols     = colDefs.filter(c => c.use);
  const totalBaseW  = visCols.reduce((s, c) => s + c.baseW, 0) || 1;

  const tableHead = `<thead><tr>
    ${visCols.map(c => `<th${aC(c.n)} style="width:${Math.round(c.baseW / totalBaseW * 100)}%">${esc(c.label)}</th>`).join('')}
  </tr></thead>`;

  const footColspan = [useCol1, useCol5, useCol6, useCol2, useCol7].filter(Boolean).length || 1;
  const tableFoot   = isLast => isLast ? `<tfoot><tr>
    <td colspan="${footColspan}">Total</td>
    ${useCol3 ? `<td${aC(3)}>${showQtyTot ? totalQty : ''}</td>` : ''}
    ${useCol8 ? `<td></td>` : ''}
    ${useCol4 ? `<td${aC(4)}>${esc(currency)} ${fmt(Math.round(total * 20) / 20)}</td>` : ''}
  </tr></tfoot>` : '';

  const rowHTML = p => `<tr>
    ${useCol1 ? `<td${aC(1)}>${nl2br(p.desc)}</td>`      : ''}
    ${useCol5 ? `<td${aC(5)}>${esc(p.col5||'')}</td>`    : ''}
    ${useCol6 ? `<td${aC(6)}>${esc(p.col6||'')}</td>`    : ''}
    ${useCol2 ? `<td${aC(2)}>${fmtFull(p.price)}</td>`   : ''}
    ${useCol7 ? `<td${aC(7)}>${esc(p.col7||'')}</td>`    : ''}
    ${useCol3 ? `<td${aC(3)}>${fmtFull(p.qty)}</td>`     : ''}
    ${useCol8 ? `<td${aC(8)}>${esc(p.col8||'')}</td>`    : ''}
    ${useCol4 ? `<td${aC(4)}>${fmt(Math.round(p.price * p.qty * 20) / 20)}</td>` : ''}
  </tr>`;

  const headingVisible = vis.heading && heading.trim().length > 0;
  const sepHide        = !vis.heading ? ' style="visibility:hidden"' : '';
  const headingHide    = !headingVisible ? ' style="visibility:hidden"' : '';
  const headingText    = heading.trim() || '\u00A0';

  const separatorHTML = `<div class="separator-area"${sepHide}>
    <div class="separator-left"><hr class="separator-line"></div>
    <div class="separator-right"><span class="invoice-heading-text"${headingHide}>${esc(headingText)}</span></div>
  </div>`;

  const empLines  = [empName, empStrasse, empOrt].filter(Boolean);
  const empBlock  = empLines.length && vis.empfaenger
    ? `<div class="emp-block">${empLines.map(esc).join('<br>')}</div>` : '';
  const stLines   = [stName, stAdresse, stOrt].filter(Boolean);
  const stellHTML = stLines.length && vis.steller ? stLines.map(esc).join('<br>') : '';
  const metaColHTML = (vis.meta && metaData.length > 0)
    ? `<div class="meta-col"><table class="meta-table">
        ${metaData.map(r => `<tr><td>${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`).join('')}
      </table></div>` : '';

  const contentTopHTML = `${empBlock}<div class="steller-meta-row">
    <div class="steller-col">${stellHTML}</div>${metaColHTML}
  </div>`;
  const titleHTML = showTitel ? `<div class="invoice-title">${esc(titel)}</div>` : '';

  // ── Off-screen measurers ────────────────────────────────────────────────
  const mC = document.createElement('div');
  mC.style.cssText = 'position:fixed;left:-9999px;top:0;width:682px;font-family:"Open Sans",sans-serif;font-size:12px;color:#2c2c2c;visibility:hidden;pointer-events:none;';
  document.body.appendChild(mC);
  const mW = document.createElement('div');
  mW.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;font-family:"Open Sans",sans-serif;font-size:12px;visibility:hidden;pointer-events:none;';
  document.body.appendChild(mW);

  const mH  = html => { mC.setHTMLUnsafe(html); return mC.scrollHeight; };
  const mHW = html => { mW.setHTMLUnsafe(html); return mW.scrollHeight; };

  const PAGE_H  = 1123;
  const PAD_BOT = 120;

  const hH1    = mHW(buildHeader(true));
  const hHN    = mHW(buildHeader(false));
  const avail1 = PAGE_H - PAD_BOT - hH1;
  const availN = PAGE_H - PAD_BOT - hHN;

  const hStatic1 = mH(separatorHTML + contentTopHTML + titleHTML);

  // Parse textblock into top-level elements for fitting
  const parseElements = raw => {
    const parser = document.createElement('div');
    parser.setHTMLUnsafe(raw);
    const kids = Array.from(parser.childNodes);
    const blocks = kids.map(n => n.nodeType === 3
      ? (n.textContent.trim() ? `<p>${n.textContent}</p>` : null)
      : (n.outerHTML || null)
    ).filter(Boolean);
    return blocks.length ? blocks : (raw.trim() ? [raw] : []);
  };

  const tbElements = useTextblock ? parseElements(textblockRaw) : [];

  const tbElH = els => els.length ? mH(`<div class="text-block">${els.join('')}</div>`) : 0;
  const fitElements = (els, maxH) => {
    if (!els.length || maxH <= 0) return { fit: [], rest: els };
    if (tbElH(els) <= maxH) return { fit: els, rest: [] };
    let lo = 0, hi = els.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (tbElH(els.slice(0, mid)) <= maxH) lo = mid; else hi = mid - 1;
    }
    if (lo === 0) lo = 1;
    return { fit: els.slice(0, lo), rest: els.slice(lo) };
  };

  const tableH = (fromIdx, count, isLast) => {
    const slice = positions.slice(fromIdx, fromIdx + count);
    return mH(`<table class="items-table">${tableHead}<tbody>${slice.map(rowHTML).join('')}</tbody>${tableFoot(isLast)}</table>`);
  };
  const fitRows = (fromIdx, maxH) => {
    const rem = positions.length - fromIdx;
    if (rem <= 0 || maxH <= 0) return { count: 0, nextIdx: fromIdx };
    if (mH(`<table class="items-table">${tableHead}<tbody></tbody></table>`) > maxH) return { count: 0, nextIdx: fromIdx };
    let lo = 0, hi = rem;
    while (lo < hi) {
      const mid    = Math.ceil((lo + hi) / 2);
      const isLast = fromIdx + mid >= positions.length;
      if (tableH(fromIdx, mid, isLast) <= maxH) lo = mid; else hi = mid - 1;
    }
    if (lo === 0) lo = 1;
    return { count: lo, nextIdx: fromIdx + lo };
  };

  // Textblock 2
  const tb2El      = document.getElementById('f-textblock2');
  const tb2Raw     = tb2El ? tb2El.getHTML() : '';
  const tb2Text    = tb2El ? tb2El.innerText.trim() : '';
  const useTb2     = vis.textblock2 && tb2Text.length > 0;
  const tb2Elements = useTb2 ? parseElements(tb2Raw) : [];

  const tb2ElH = els => els.length ? mH(`<div class="text-block">${els.join('')}</div>`) : 0;
  const fitElements2 = (els, maxH) => {
    if (!els.length || maxH <= 0) return { fit: [], rest: els };
    if (tb2ElH(els) <= maxH) return { fit: els, rest: [] };
    let lo = 0, hi = els.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (tb2ElH(els.slice(0, mid)) <= maxH) lo = mid; else hi = mid - 1;
    }
    if (lo === 0) lo = 1;
    return { fit: els.slice(0, lo), rest: els.slice(lo) };
  };

  // ── Page builder loop ──────────────────────────────────────────────────
  const pages  = [];
  let tbRest   = tbElements.slice();
  let tb2Rest  = tb2Elements.slice();
  let posIdx   = 0;
  let pageNum  = 0;
  const needTable      = vis.positionen;
  const tableFinished  = () => !needTable || posIdx >= positions.length;
  const hasMoreContent = () =>
    tbRest.length > 0 || (needTable && posIdx < positions.length) || tb2Rest.length > 0;

  do {
    const isFirst = pageNum === 0;
    const avail   = isFirst ? avail1 : availN;
    let remaining = avail - (isFirst ? hStatic1 : 0);
    const parts   = isFirst ? [separatorHTML + contentTopHTML + titleHTML] : [];

    if (tbRest.length > 0) {
      const { fit, rest } = fitElements(tbRest, remaining);
      if (fit.length > 0) {
        parts.push(`<div class="text-block">${fit.join('')}</div>`);
        remaining -= tbElH(fit);
      }
      tbRest = rest;
    }

    if (needTable) {
      if (positions.length === 0) {
        if (isFirst) {
          parts.push(`<table class="items-table">${tableHead}<tbody></tbody>${tableFoot(true)}</table>`);
          remaining = 0;
        }
      } else if (posIdx < positions.length) {
        const { count, nextIdx } = fitRows(posIdx, remaining);
        if (count > 0) {
          const isLastSlice = nextIdx >= positions.length;
          const slice = positions.slice(posIdx, nextIdx);
          parts.push(`<table class="items-table">${tableHead}<tbody>${slice.map(rowHTML).join('')}</tbody>${tableFoot(isLastSlice)}</table>`);
          remaining -= tableH(posIdx, count, isLastSlice);
          posIdx = nextIdx;
        }
      }
    }

    if (tableFinished() && tb2Rest.length > 0) {
      const { fit, rest } = fitElements2(tb2Rest, remaining);
      if (fit.length > 0) {
        parts.push(`<div class="text-block">${fit.join('')}</div>`);
        remaining -= tb2ElH(fit);
      }
      tb2Rest = rest;
    }

    pages.push(`<div class="a4-page">${buildHeader(isFirst)}<div class="page-content">${parts.join('')}</div>${buildFooter()}</div>`);
    pageNum++;

  } while (hasMoreContent());

  document.body.removeChild(mC);
  document.body.removeChild(mW);

  if (pages.length === 0) {
    pages.push(`<div class="a4-page">${buildHeader(true)}<div class="page-content">${separatorHTML}${contentTopHTML}${titleHTML}</div>${buildFooter()}</div>`);
  }

  return pages;
}
