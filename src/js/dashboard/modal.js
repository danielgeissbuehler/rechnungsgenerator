/**
 * dashboard/modal.js — Reusable modal utility for Stammdaten CRUD.
 * Renders modals dynamically using existing .overlay-backdrop + .nim-* CSS.
 */

import { escHtml } from '../utils.js';

let currentModal = null;

/**
 * Build a form field element and register it in fieldEls.
 */
function buildField(f, fieldEls) {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';
  if (f.span === 2) wrap.style.gridColumn = '1 / -1';

  const label = document.createElement('label');
  label.textContent = f.label;
  wrap.appendChild(label);

  const input = document.createElement('input');
  input.type = f.type || 'text';
  input.placeholder = f.placeholder || '';
  input.value = f.value || '';
  if (f.required) input.required = true;
  wrap.appendChild(input);

  fieldEls[f.key] = input;
  return wrap;
}

/**
 * Open a modal dialog.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {Array} [opts.fields] — flat field list (single column, legacy)
 * @param {Array<{title:string, columns?:number, fields:Array}>} [opts.sections] — grouped fields
 * @param {string} [opts.saveLabel='Speichern']
 * @param {function(Object):void} opts.onSave
 */
export function openModal(opts) {
  closeModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'overlay-backdrop';
  backdrop.style.display = 'flex';
  backdrop.addEventListener('click', function(e) {
    if (e.target === backdrop) closeModal();
  });

  const modal = document.createElement('div');
  modal.className = 'new-invoice-modal';

  // Header
  const header = document.createElement('div');
  header.className = 'nim-header';
  header.innerHTML =
    '<div>'
    + '<div class="nim-title">' + escHtml(opts.title) + '</div>'
    + (opts.subtitle ? '<div class="nim-sub">' + escHtml(opts.subtitle) + '</div>' : '')
    + '</div>'
    + '<button class="btn btn-ghost" style="padding:6px 12px;font-size:12px">\u2715</button>';
  header.querySelector('button').addEventListener('click', closeModal);

  // Body
  const body = document.createElement('div');
  body.className = 'nim-body';

  const fieldEls = {};

  if (opts.sections) {
    // Sectioned layout
    opts.sections.forEach(function(sec) {
      const section = document.createElement('div');
      section.className = 'modal-section';

      if (sec.title) {
        const heading = document.createElement('div');
        heading.className = 'modal-section-title';
        heading.textContent = sec.title;
        section.appendChild(heading);
      }

      const grid = document.createElement('div');
      grid.className = 'modal-field-grid';
      if (sec.columns) grid.style.gridTemplateColumns = 'repeat(' + sec.columns + ', 1fr)';

      (sec.fields || []).forEach(function(f) {
        grid.appendChild(buildField(f, fieldEls));
      });

      section.appendChild(grid);
      body.appendChild(section);
    });
  } else {
    // Legacy flat fields
    (opts.fields || []).forEach(function(f) {
      body.appendChild(buildField(f, fieldEls));
    });
  }

  // Footer
  const footer = document.createElement('div');
  footer.className = 'nim-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-ghost';
  cancelBtn.textContent = 'Abbrechen';
  cancelBtn.addEventListener('click', closeModal);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = opts.saveLabel || 'Speichern';
  saveBtn.addEventListener('click', function() {
    const values = {};
    let valid = true;
    Object.entries(fieldEls).forEach(function([key, input]) {
      values[key] = input.value.trim();
      if (input.required && !values[key]) {
        input.style.borderColor = 'var(--red, #ef4444)';
        valid = false;
      } else {
        input.style.borderColor = '';
      }
    });
    if (!valid) return;
    if (typeof opts.onSave === 'function') opts.onSave(values);
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  currentModal = backdrop;

  // Focus first input
  const firstInput = body.querySelector('input');
  if (firstInput) firstInput.focus();

  // Esc to close
  function onKey(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }
  }
  document.addEventListener('keydown', onKey);
  backdrop._onKey = onKey;
}

/**
 * Close the current modal.
 */
export function closeModal() {
  if (currentModal) {
    if (currentModal._onKey) document.removeEventListener('keydown', currentModal._onKey);
    currentModal.remove();
    currentModal = null;
  }
}
