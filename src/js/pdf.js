import { val } from './utils.js';
import { F } from './field-ids.js';

// ── Download: html2canvas + jsPDF → direct .pdf file ────────────────────────

async function generatePDF(containerEl = null) {
  const { jsPDF } = window.jspdf;
  const container = containerEl || document.getElementById('preview-wrap');
  const pages     = Array.from(container.querySelectorAll('.a4-page'));
  const pdf       = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

  const canvases = await Promise.all(pages.map(page =>
    html2canvas(page, {
      scale: 1.5, useCORS: true, backgroundColor: '#ffffff',
      logging: false, width: 794, height: 1123,
      onclone: (_doc, el) => { el.style.transform = 'none'; },
    })
  ));

  canvases.forEach((canvas, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  return pdf;
}

export async function downloadPDF(containerEl = null, filename = null) {
  const btn     = document.getElementById('btn-download');
  const loading = document.getElementById('loading');
  if (btn) btn.disabled = true;
  if (loading) loading.classList.add('show');

  try {
    const pdf  = await generatePDF(containerEl);
    const name = filename || (val(F.TITEL) || 'Rechnung').replace(/\s+/g, '_');
    pdf.save(`${name}.pdf`);
  } catch (e) {
    alert('Fehler: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
    if (loading) loading.classList.remove('show');
  }
}

// ── Print: native browser print via hidden iframe (instant) ─────────────────

export function printPDF(containerEl = null) {
  const container = containerEl || document.getElementById('preview-wrap');
  const pages     = container.querySelectorAll('.a4-page');
  if (!pages.length) return;

  let cssText = '';
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) cssText += rule.cssText + '\n';
    } catch (_) {
      if (sheet.href) cssText += `@import url("${sheet.href}");\n`;
    }
  }

  const pagesHtml = Array.from(pages).map(p => p.outerHTML).join('\n');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
${cssText}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { margin: 0; padding: 0; background: #fff; width: 794px; }
.a4-page {
  width: 794px !important;
  min-height: 1123px !important;
  box-shadow: none !important;
  transform: none !important;
  margin: 0 !important;
  page-break-after: always;
  overflow: hidden;
}
.a4-page:last-child { page-break-after: auto; }
@page { size: 210mm 297mm; margin: 0; }
</style>
</head><body>${pagesHtml}</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:0;top:0;width:794px;height:1123px;border:none;opacity:0;pointer-events:none;z-index:-1';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  iframe.contentWindow.addEventListener('afterprint', () => iframe.remove());
  setTimeout(() => { if (iframe.parentNode) iframe.remove(); }, 60000);

  if (iframe.contentDocument.readyState === 'complete') {
    triggerPrint();
  } else {
    iframe.contentWindow.onload = triggerPrint;
  }
}
