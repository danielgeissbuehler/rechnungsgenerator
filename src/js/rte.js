export function rteInit() {
  document.execCommand('defaultParagraphSeparator', false, 'p');
  document.execCommand('styleWithCSS', false, false);
}

export function rteInline(tag, editorId) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const editor = document.getElementById(editorId);
  if (!editor || !editor.contains(range.commonAncestorContainer)) return;

  if (sel.isCollapsed) {
    const cmdMap = { b:'bold', i:'italic', u:'underline' };
    if (cmdMap[tag]) { document.execCommand('styleWithCSS', false, false); document.execCommand(cmdMap[tag], false, null); }
    return;
  }

  const existing = sel.anchorNode?.parentElement?.closest(tag);
  if (existing) {
    const frag = document.createDocumentFragment();
    while (existing.firstChild) frag.appendChild(existing.firstChild);
    existing.replaceWith(frag);
  } else {
    const wrap = document.createElement(tag);
    try { range.surroundContents(wrap); }
    catch { wrap.appendChild(range.extractContents()); range.insertNode(wrap); }
    const r2 = document.createRange();
    r2.selectNodeContents(wrap);
    sel.removeAllRanges(); sel.addRange(r2);
  }
}

export function rteBlock(tag, editorId) {
  const editor = document.getElementById(editorId);
  if (!editor) return;
  if (!editor.innerText.trim()) {
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    editor.replaceChildren(p);
    const r = document.createRange();
    r.setStart(editor.firstChild, 0);
    r.collapse(true);
    const s = window.getSelection();
    s.removeAllRanges(); s.addRange(r);
  }
  document.execCommand('styleWithCSS', false, false);
  document.execCommand('formatBlock', false, tag);
}

export function rteKeydown(e, editorId) {
  if (e.key !== 'Enter') return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const node = sel.getRangeAt(0).startContainer;
  const el = node.nodeType === 3 ? node.parentElement : node;
  const heading = el.closest('h1,h2,h3,h4,h5,h6');
  if (!heading) return;
  e.preventDefault();
  const p = document.createElement('p');
  p.appendChild(document.createElement('br'));
  heading.after(p);
  const r = document.createRange();
  r.setStart(p, 0); r.collapse(true);
  sel.removeAllRanges(); sel.addRange(r);
}

export function rteInsertHrInEditor(editorId) {
  const editor = document.getElementById(editorId);
  if (!editor) return;
  editor.focus();
  // Insert HR followed by an empty paragraph
  const hr = document.createElement('hr');
  const p  = document.createElement('p');
  p.appendChild(document.createElement('br'));
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(p);
    range.insertNode(hr);
    const r2 = document.createRange();
    r2.setStart(p, 0); r2.collapse(true);
    sel.removeAllRanges(); sel.addRange(r2);
  }
}

// ── Shorthands for Editor 1 (f-textblock) ──
export function rteCmd(cmd)      { rteInline(cmd === 'bold' ? 'b' : cmd === 'italic' ? 'i' : 'u', 'f-textblock'); }
export function rteCmdRaw(cmd)   { document.execCommand('styleWithCSS', false, false); document.execCommand(cmd, false, null); }
export function rteBlockBtn(tag) { rteBlock(tag, 'f-textblock'); }
export function rteInsertHr()    { rteInsertHrInEditor('f-textblock'); }

// ── Shorthands for Editor 2 (f-textblock2) ──
export function rteCmd2(cmd)     { rteInline(cmd === 'bold' ? 'b' : cmd === 'italic' ? 'i' : 'u', 'f-textblock2'); }
export function rteCmd2Raw(cmd)  { document.execCommand('styleWithCSS', false, false); document.execCommand(cmd, false, null); }
export function rteBlock2(tag)   { rteBlock(tag, 'f-textblock2'); }
export function rteInsertHr2()   { rteInsertHrInEditor('f-textblock2'); }
