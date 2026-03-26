import { val } from './utils.js';

async function generatePDF(containerEl = null) {
  const { jsPDF } = window.jspdf;
  const container = containerEl || document.getElementById('preview-wrap');
  const pages     = container.querySelectorAll('.a4-page');
  const pdf       = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      logging: false, width: 794, height: 1123,
      // Reset CSS scale transforms (e.g. the 0.615x preview scale in the detail panel)
      onclone: (_doc, el) => { el.style.transform = 'none'; },
    });
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
  }
  return pdf;
}

/**
 * Generate and download a PDF from A4 page elements.
 * @param {HTMLElement|null} containerEl - Container with .a4-page children. Defaults to #preview-wrap.
 * @param {string|null} filename - PDF filename (without .pdf). Defaults to the f-titel field value.
 */
export async function downloadPDF(containerEl = null, filename = null) {
  const btn     = document.getElementById('btn-download');
  const loading = document.getElementById('loading');
  if (btn) btn.disabled = true;
  if (loading) loading.classList.add('show');

  try {
    const pdf  = await generatePDF(containerEl);
    const name = filename || (val('f-titel') || 'Rechnung').replace(/\s+/g, '_');
    pdf.save(`${name}.pdf`);
  } catch (e) {
    alert('Fehler: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
    if (loading) loading.classList.remove('show');
  }
}

/**
 * Generate a PDF and open it in a new tab for printing via the browser's native PDF viewer.
 * This produces output identical to downloadPDF — the print result IS the PDF.
 * This is the approach used by Google, Stripe, and other SaaS products.
 * @param {HTMLElement|null} containerEl - Container with .a4-page children. Defaults to #preview-wrap.
 */
export async function printPDF(containerEl = null) {
  const loading = document.getElementById('loading');
  if (loading) loading.classList.add('show');

  try {
    const pdf = await generatePDF(containerEl);
    const url = pdf.output('bloburl');
    window.open(url, '_blank');
  } catch (e) {
    alert('Fehler: ' + e.message);
  } finally {
    if (loading) loading.classList.remove('show');
  }
}
