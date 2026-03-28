/**
 * SearchableSelect — custom dropdown with search for contact/company pickers.
 *
 * Usage:
 *   const instance = createSearchableSelect(containerEl, {
 *     placeholder: '— Empfänger wählen —',
 *     items: [{ value: '0,0', label: 'Name', subtitle: 'Strasse, Ort' }],
 *     onSelect: (value) => { ... },
 *     selectedValue: ''
 *   });
 *   instance.update(newItems, selectedValue);
 *   instance.getValue();
 *   instance.destroy();
 */

/** @type {SearchableSelect|null} currently open instance */
let openInstance = null;

document.addEventListener('click', (e) => {
  if (openInstance && !openInstance._root.contains(e.target)) {
    openInstance._close();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openInstance) {
    openInstance._close();
  }
});

/**
 * @param {HTMLElement} container
 * @param {object} opts
 */
export function createSearchableSelect(container, opts = {}) {
  const { placeholder = '— Wählen —', items = [], onSelect, selectedValue = '' } = opts;

  // Build DOM
  const root = document.createElement('div');
  root.className = 'ss-root';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'ss-trigger';

  const triggerLabel = document.createElement('span');
  triggerLabel.className = 'ss-trigger-label';
  const triggerArrow = document.createElement('span');
  triggerArrow.className = 'ss-trigger-arrow';
  triggerArrow.textContent = '▾';
  trigger.append(triggerLabel, triggerArrow);

  const dropdown = document.createElement('div');
  dropdown.className = 'ss-dropdown';
  dropdown.style.display = 'none';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'ss-search-wrap';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'ss-search';
  searchInput.placeholder = 'Suchen…';
  searchInput.autocomplete = 'off';
  searchWrap.appendChild(searchInput);

  const list = document.createElement('div');
  list.className = 'ss-list';

  dropdown.append(searchWrap, list);
  root.append(trigger, dropdown);
  container.appendChild(root);

  // State
  let currentItems = [];
  let value = selectedValue;
  let highlightIdx = -1;
  let filteredItems = [];
  let isOpen = false;

  const instance = {
    _root: root,
    _close: close,
    update,
    getValue: () => value,
    setValue,
    destroy,
  };

  // Event listeners
  trigger.addEventListener('click', toggle);
  searchInput.addEventListener('input', onSearch);
  searchInput.addEventListener('keydown', onKeydown);

  // Init
  update(items, selectedValue);

  return instance;

  // ── Functions ──

  function toggle() {
    isOpen ? close() : open();
  }

  function open() {
    if (openInstance && openInstance !== instance) openInstance._close();
    isOpen = true;
    openInstance = instance;
    dropdown.style.display = '';
    root.classList.add('ss-open');
    searchInput.value = '';
    renderList('');
    searchInput.focus();
    positionDropdown();
  }

  function close() {
    isOpen = false;
    if (openInstance === instance) openInstance = null;
    dropdown.style.display = 'none';
    root.classList.remove('ss-open');
    highlightIdx = -1;
  }

  function positionDropdown() {
    const rect = root.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 280 && rect.top > 280) {
      dropdown.classList.add('ss-above');
    } else {
      dropdown.classList.remove('ss-above');
    }
  }

  function update(newItems, newValue) {
    currentItems = newItems || [];
    if (newValue !== undefined) value = newValue;
    updateTriggerLabel();
    if (isOpen) renderList(searchInput.value);
  }

  function setValue(v) {
    value = v;
    updateTriggerLabel();
  }

  function updateTriggerLabel() {
    const item = currentItems.find(i => i.value === value);
    if (item) {
      triggerLabel.textContent = item.label;
      trigger.classList.remove('ss-placeholder');
    } else {
      triggerLabel.textContent = placeholder;
      trigger.classList.add('ss-placeholder');
    }
  }

  function onSearch() {
    renderList(searchInput.value);
  }

  function renderList(query) {
    const q = query.toLowerCase().trim();
    filteredItems = q
      ? currentItems.filter(i =>
          i.label.toLowerCase().includes(q) ||
          (i.subtitle && i.subtitle.toLowerCase().includes(q))
        )
      : currentItems;

    highlightIdx = -1;
    list.innerHTML = '';

    if (filteredItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ss-empty';
      empty.textContent = q ? 'Keine Treffer' : 'Keine Einträge';
      list.appendChild(empty);
      return;
    }

    filteredItems.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'ss-item' + (item.value === value ? ' ss-selected' : '');
      el.dataset.idx = idx;

      const labelEl = document.createElement('span');
      labelEl.className = 'ss-item-label';
      labelEl.textContent = item.label;

      el.appendChild(labelEl);

      if (item.subtitle) {
        const subEl = document.createElement('span');
        subEl.className = 'ss-item-sub';
        subEl.textContent = item.subtitle;
        el.appendChild(subEl);
      }

      el.addEventListener('click', () => selectItem(item.value));
      el.addEventListener('mouseenter', () => {
        highlightIdx = idx;
        updateHighlight();
      });

      list.appendChild(el);
    });
  }

  function selectItem(v) {
    value = v;
    updateTriggerLabel();
    close();
    if (onSelect) onSelect(v);
  }

  function onKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIdx = Math.min(highlightIdx + 1, filteredItems.length - 1);
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIdx = Math.max(highlightIdx - 1, 0);
      updateHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < filteredItems.length) {
        selectItem(filteredItems[highlightIdx].value);
      }
    }
  }

  function updateHighlight() {
    const items = list.querySelectorAll('.ss-item');
    items.forEach((el, i) => {
      el.classList.toggle('ss-highlight', i === highlightIdx);
    });
    // Scroll into view
    const highlighted = items[highlightIdx];
    if (highlighted) highlighted.scrollIntoView({ block: 'nearest' });
  }

  function destroy() {
    if (openInstance === instance) openInstance = null;
    trigger.removeEventListener('click', toggle);
    root.remove();
  }
}
