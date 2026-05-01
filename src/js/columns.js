import { state, COL_DEFS, COL_DEFAULTS } from './state.js';
import { renderPositionsList } from './positions.js';
import { render } from './render.js';

export function renderColConfig() {
  const container = document.getElementById('col-cfg-list');
  if (!container) return;

  // Snapshot current values before clearing
  const snap = {};
  COL_DEFS.forEach(({ inputId }) => {
    const el = document.getElementById(inputId);
    if (el) snap[inputId] = el.value;
  });

  container.replaceChildren();

  COL_DEFS.forEach(({ n, label, inputId, ph, extra }) => {
    const row = document.createElement('div');
    row.className = 'col-cfg-row';

    const chk = document.createElement('input');
    chk.type = 'checkbox'; chk.id = 'chk-col' + n;
    chk.checked = !!state.visibility['col' + n];
    chk.addEventListener('change', () => toggleCol(n));

    const lbl = document.createElement('label');
    lbl.className = 'col-cfg-label'; lbl.htmlFor = 'chk-col' + n;
    lbl.textContent = label;

    const inp = document.createElement('input');
    inp.type = 'text'; inp.id = inputId; inp.placeholder = ph;
    inp.value = snap[inputId] !== undefined ? snap[inputId] : (COL_DEFAULTS[inputId] || '');
    inp.addEventListener('input', () => { if (extra) renderPositionsList(); render(); });

    const alignWrap = document.createElement('div');
    alignWrap.className = 'col-align-btns';
    [['l','L'], ['c','C'], ['r','R']].forEach(([a, txt]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'col-align-btn' + (state.colAlign[n] === a ? ' active' : '');
      btn.textContent = txt;
      btn.title = a === 'l' ? 'Links' : a === 'c' ? 'Mitte' : 'Rechts';
      btn.addEventListener('click', () => setColAlign(n, a));
      alignWrap.appendChild(btn);
    });

    row.append(chk, lbl, inp, alignWrap);

    if (n === 4) {
      const manWrap = document.createElement('div');
      manWrap.className = 'col-manual-wrap';
      const manChk = document.createElement('input');
      manChk.type = 'checkbox'; manChk.id = 'chk-col4-manual';
      manChk.checked = !!state.col4Manual;
      manChk.addEventListener('change', () => toggleCol4Manual());
      const manLbl = document.createElement('label');
      manLbl.htmlFor = 'chk-col4-manual'; manLbl.className = 'col-manual-label';
      manLbl.textContent = 'Total (Spalte 8) manuell';
      manWrap.append(manChk, manLbl);
      row.appendChild(manWrap);
    }

    container.appendChild(row);
  });
}

export function setColAlign(n, align) {
  state.colAlign[n] = align;
  renderColConfig();
  render();
}

export function toggleCol(n) {
  state.visibility['col' + n] = document.getElementById('chk-col' + n).checked;
  renderPositionsList();
  render();
}

export function toggleCol4Manual() {
  state.col4Manual = document.getElementById('chk-col4-manual').checked;
  if (state.col4Manual) {
    state.positions.forEach(p => { if (!p.total) p.total = Math.round(p.price * p.qty * 20) / 20; });
  }
  renderPositionsList();
  render();
}
