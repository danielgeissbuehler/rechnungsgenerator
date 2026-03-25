import { state } from './state.js';
import { val, fmt } from './utils.js';
import { render } from './render.js';

export function addPosition(desc = '', price = 0, qty = 1) {
  const id = state.posId++;
  state.positions.push({ id, desc, price: +price || 0, qty: qty === '' ? 1 : +qty, col5:'', col6:'', col7:'', col8:'' });
  state.expandedPositions.add(id);
  renderPositionsList();
  render();
}

export function removePosition(id) {
  const idx = state.positions.findIndex(p => p.id === id);
  if (idx !== -1) state.positions.splice(idx, 1);
  state.expandedPositions.delete(id);
  renderPositionsList();
  render();
}

export function updatePosition(id, field, value) {
  const p = state.positions.find(p => p.id === id);
  if (!p) return;
  if (field === 'price') p[field] = +value || 0;
  else if (field === 'qty') p[field] = value === '' ? 0 : +value;
  else p[field] = value;
  render();
}

export function buildNumText(pos, c2, c3, c4, currency) {
  const parts = [];
  if (c2) parts.push(fmt(pos.price));
  if (c3) parts.push('×' + pos.qty);
  if (c4 && (c2 || c3)) parts.push('= ' + currency + '\u00A0' + fmt(pos.price * pos.qty));
  return parts.join(' ');
}

export function renderPositionsList() {
  const { positions, visibility: vis, expandedPositions } = state;
  const c1 = vis.col1, c2 = vis.col2, c3 = vis.col3, c4 = vis.col4;
  const c5 = vis.col5, c6 = vis.col6, c7 = vis.col7, c8 = vis.col8;
  const currency = val('f-currency') || 'CHF';

  const list = document.getElementById('positions-list');
  list.replaceChildren();

  const zeilenCount = document.getElementById('zeilen-count');
  if (zeilenCount) {
    zeilenCount.textContent = positions.length
      ? positions.length + ' Zeile' + (positions.length !== 1 ? 'n' : '') : '';
  }

  let dragFromGrip = false;

  positions.forEach((pos, idx) => {
    const isOpen = expandedPositions.has(pos.id);

    const item = document.createElement('div');
    item.className = 'pos-item';
    item.draggable = true;

    // Drag & drop
    item.addEventListener('dragstart', e => {
      if (!dragFromGrip) { e.preventDefault(); return; }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(pos.id));
      setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', () => { item.classList.remove('dragging'); dragFromGrip = false; });
    item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over'); });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const fromId  = parseInt(e.dataTransfer.getData('text/plain'));
      if (fromId === pos.id) return;
      const fromIdx = positions.findIndex(p => p.id === fromId);
      const [moved] = positions.splice(fromIdx, 1);
      positions.splice(idx, 0, moved);
      renderPositionsList();
      render();
    });

    // Summary bar
    const summary = document.createElement('div');
    summary.className = 'pos-summary' + (isOpen ? ' open' : '');

    const grip = document.createElement('span');
    grip.className = 'pos-grip';
    grip.textContent = '⠿';
    grip.title = 'Ziehen zum Verschieben';
    grip.addEventListener('mousedown', () => { dragFromGrip = true; });

    const chevron = document.createElement('span');
    chevron.className = 'pos-chevron';
    chevron.textContent = isOpen ? '▲' : '▼';

    const descSpan = document.createElement('span');
    descSpan.className = 'pos-summary-desc' + (pos.desc ? '' : ' empty');
    descSpan.textContent = pos.desc || 'Neue Position';

    const numSpan = document.createElement('span');
    numSpan.className = 'pos-summary-num';
    numSpan.textContent = buildNumText(pos, c2, c3, c4, currency);

    const upBtn = document.createElement('button');
    upBtn.className = 'pos-move-btn'; upBtn.textContent = '↑'; upBtn.title = 'Nach oben';
    upBtn.disabled = idx === 0;
    upBtn.addEventListener('click', e => {
      e.stopPropagation();
      [positions[idx - 1], positions[idx]] = [positions[idx], positions[idx - 1]];
      renderPositionsList(); render();
    });

    const downBtn = document.createElement('button');
    downBtn.className = 'pos-move-btn'; downBtn.textContent = '↓'; downBtn.title = 'Nach unten';
    downBtn.disabled = idx === positions.length - 1;
    downBtn.addEventListener('click', e => {
      e.stopPropagation();
      [positions[idx + 1], positions[idx]] = [positions[idx], positions[idx + 1]];
      renderPositionsList(); render();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove'; removeBtn.textContent = '×';
    removeBtn.addEventListener('click', e => { e.stopPropagation(); removePosition(pos.id); });

    summary.append(grip, chevron, descSpan);
    if (numSpan.textContent) summary.appendChild(numSpan);
    summary.append(upBtn, downBtn, removeBtn);

    summary.addEventListener('click', () => {
      if (expandedPositions.has(pos.id)) expandedPositions.delete(pos.id);
      else expandedPositions.add(pos.id);
      renderPositionsList();
    });

    item.appendChild(summary);

    // Detail form (expanded)
    if (isOpen) {
      const detail = document.createElement('div');
      detail.className = 'pos-detail';

      const mkLabel = text => { const l = document.createElement('label'); l.textContent = text; return l; };
      const mkWrap  = () => document.createElement('div');

      if (c1) {
        const w = mkWrap();
        w.appendChild(mkLabel(val('f-col-pos') || 'Position'));
        const ta = document.createElement('textarea');
        ta.rows = 2; ta.value = pos.desc; ta.placeholder = 'Beschreibung';
        ta.style.cssText = 'width:100%;font-size:11.5px;resize:vertical;min-height:34px;max-height:120px;font-family:inherit;line-height:1.4;';
        ta.addEventListener('input', function () {
          updatePosition(pos.id, 'desc', this.value);
          descSpan.textContent = this.value || 'Neue Position';
          descSpan.className = 'pos-summary-desc' + (this.value ? '' : ' empty');
        });
        w.appendChild(ta);
        detail.appendChild(w);
      }

      const grid = document.createElement('div');
      grid.className = 'pos-detail-grid';

      const addField = (labelText, inputEl) => {
        const w = mkWrap();
        w.appendChild(mkLabel(labelText));
        w.appendChild(inputEl);
        grid.appendChild(w);
      };

      if (c5) {
        const i = document.createElement('input'); i.type = 'text'; i.value = pos.col5 || ''; i.placeholder = '–';
        i.addEventListener('input', function () { updatePosition(pos.id, 'col5', this.value); });
        addField(val('f-col-extra5') || 'Spalte 2', i);
      }
      if (c6) {
        const i = document.createElement('input'); i.type = 'text'; i.value = pos.col6 || ''; i.placeholder = '–';
        i.addEventListener('input', function () { updatePosition(pos.id, 'col6', this.value); });
        addField(val('f-col-extra6') || 'Spalte 3', i);
      }
      if (c2) {
        const i = document.createElement('input'); i.type = 'number'; i.value = pos.price; i.min = '0'; i.step = '0.01';
        i.addEventListener('input', function () {
          updatePosition(pos.id, 'price', this.value);
          numSpan.textContent = buildNumText(pos, c2, c3, c4, currency);
        });
        addField(val('f-col-preis') || 'Preis', i);
      }
      if (c7) {
        const i = document.createElement('input'); i.type = 'text'; i.value = pos.col7 || ''; i.placeholder = '–';
        i.addEventListener('input', function () { updatePosition(pos.id, 'col7', this.value); });
        addField(val('f-col-extra7') || 'Spalte 5', i);
      }
      if (c3) {
        const i = document.createElement('input'); i.type = 'number'; i.value = pos.qty; i.step = '1';
        i.addEventListener('input', function () {
          updatePosition(pos.id, 'qty', this.value);
          numSpan.textContent = buildNumText(pos, c2, c3, c4, currency);
        });
        addField(val('f-col-menge') || 'Menge', i);
      }
      if (c8) {
        const i = document.createElement('input'); i.type = 'text'; i.value = pos.col8 || ''; i.placeholder = '–';
        i.addEventListener('input', function () { updatePosition(pos.id, 'col8', this.value); });
        addField(val('f-col-extra8') || 'Spalte 7', i);
      }
      if (c4) {
        const i = document.createElement('input'); i.type = 'text'; i.readOnly = true;
        i.value = currency + ' ' + fmt(pos.price * pos.qty);
        i.className = 'pos-total-readonly';
        addField((val('f-col-total') || 'Total') + ' (' + currency + ')', i);
      }

      if (grid.children.length) detail.appendChild(grid);
      item.appendChild(detail);
    }

    list.appendChild(item);
  });
}
