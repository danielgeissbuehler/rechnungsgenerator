import { val } from './utils.js';

export async function downloadPDF() {
  const btn     = document.getElementById('btn-download');
  const loading = document.getElementById('loading');
  btn.disabled  = true;
  loading.classList.add('show');

  try {
    const { jsPDF } = window.jspdf;
    const pages     = document.querySelectorAll('#preview-wrap .a4-page');
    const pdf       = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        logging: false, width: 794, height: 1123,
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
    }

    pdf.save(`${(val('f-titel') || 'Rechnung').replace(/\s+/g, '_')}.pdf`);
  } catch (e) {
    alert('Fehler: ' + e.message);
  } finally {
    btn.disabled = false;
    loading.classList.remove('show');
  }
}
