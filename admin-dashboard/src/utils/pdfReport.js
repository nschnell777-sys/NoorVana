import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

// Brand colors
const SAGE = [61, 74, 62];
const TERRACOTTA = [212, 149, 106];
const CREAM = [239, 235, 228];
const TEXT_DARK = [45, 45, 45];
const TEXT_MUTED = [92, 107, 94];
const WHITE = [255, 255, 255];

// Page dimensions (Letter)
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN = 15;
const CW = PAGE_W - 2 * MARGIN;
const HEADER_H = 18;
const FOOTER_H = 8;
const CONTENT_TOP = HEADER_H + 6;
const CONTENT_BOTTOM = PAGE_H - FOOTER_H - 3;

const STATE_NAMES = {
  TX: 'Texas', FL: 'Florida', AZ: 'Arizona', SC: 'South Carolina',
  SD: 'South Dakota', CA: 'California', NY: 'New York', IL: 'Illinois',
  GA: 'Georgia', NC: 'North Carolina', OH: 'Ohio', PA: 'Pennsylvania'
};

function fmtCurrency(v) {
  return `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawHeaderBar(doc) {
  doc.setFillColor(...SAGE);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('NoorVana Advantage', MARGIN, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Market Analytics Report', MARGIN, 15.5);

  doc.setFontSize(8);
  doc.text(format(new Date(), 'MMMM d, yyyy'), PAGE_W - MARGIN, 11, { align: 'right' });
}

function drawFooter(doc, pageNum, totalPages) {
  const y = PAGE_H - FOOTER_H;
  doc.setDrawColor(...SAGE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);

  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('NoorVana Advantage', MARGIN, y + 4);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, y + 4, { align: 'right' });
}

function drawSubtitle(doc, filterLabel, period) {
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(filterLabel || 'All States', MARGIN, CONTENT_TOP + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Period: ${period || 'All Time'}`, PAGE_W - MARGIN, CONTENT_TOP + 3, { align: 'right' });

  // Terracotta accent line
  doc.setDrawColor(...TERRACOTTA);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, CONTENT_TOP + 5, PAGE_W - MARGIN, CONTENT_TOP + 5);

  return CONTENT_TOP + 7;
}

function drawKpiSection(doc, summary, startY) {
  const kpis = [
    { label: 'TOTAL CLIENTS', value: String(summary.total_clients || 0) },
    { label: 'AVG DURATION', value: `${summary.avg_tenure_days || 0} days` },
    { label: 'TOTAL REVENUE', value: fmtCurrency(summary.total_revenue) },
    { label: 'AVG REV / CLIENT', value: fmtCurrency(summary.avg_revenue_per_client) }
  ];

  const gap = 2.5;
  const boxW = (CW - gap * 3) / 4;
  const boxH = 16;

  kpis.forEach((kpi, i) => {
    const x = MARGIN + i * (boxW + gap);

    doc.setFillColor(...CREAM);
    doc.roundedRect(x, startY, boxW, boxH, 1.5, 1.5, 'F');

    doc.setTextColor(...TEXT_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(kpi.label, x + boxW / 2, startY + 5.5, { align: 'center' });

    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(kpi.value, x + boxW / 2, startY + 12.5, { align: 'center' });
  });

  return startY + boxH + 3;
}

function drawTable(doc, columns, rows, startY) {
  const ROW_H = 6;
  const HDR_H = 7;
  let y = startY;
  let pageNum = 1;

  const drawTableHeader = () => {
    doc.setFillColor(...SAGE);
    doc.rect(MARGIN, y, CW, HDR_H, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    columns.forEach(col => {
      doc.text(col.label, col.x, y + 4.5, { align: col.align || 'left' });
    });
    y += HDR_H;
  };

  drawTableHeader();

  rows.forEach((row, idx) => {
    if (y + ROW_H > CONTENT_BOTTOM) {
      pageNum++;
      doc.addPage();
      drawHeaderBar(doc);
      y = CONTENT_TOP;
      drawTableHeader();
    }

    if (idx % 2 === 1) {
      doc.setFillColor(...CREAM);
      doc.rect(MARGIN, y, CW, ROW_H, 'F');
    }

    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    columns.forEach(col => {
      const val = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '');
      doc.text(val, col.x, y + 4, { align: col.align || 'left' });
    });
    y += ROW_H;
  });

  // Bottom border
  doc.setDrawColor(...SAGE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, MARGIN + CW, y);

  return { y: y + 2, pageNum };
}

async function captureElement(el) {
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#FFFFFF',
    logging: false,
    useCORS: true
  });
  return canvas.toDataURL('image/png');
}

function ensureSpace(doc, needed, currentY) {
  if (currentY + needed > CONTENT_BOTTOM) {
    doc.addPage();
    drawHeaderBar(doc);
    return CONTENT_TOP;
  }
  return currentY;
}

export async function generateMarketReport({
  reportDiv, filters, summary, level, breakdown, clients, period, filename,
  customChartsDiv
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  // --- Page 1: Header + KPIs + Table ---
  drawHeaderBar(doc);
  let y = drawSubtitle(doc, filters, period);
  y = drawKpiSection(doc, summary, y);

  // Section title
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const tableTitle = level === 'territory' ? 'Clients' : level === 'market' ? 'Territories' : level === 'state' ? 'Markets' : 'States';
  doc.text(tableTitle, MARGIN, y + 3);
  y += 5;

  // Build table columns and rows
  let columns, rows;
  if (level === 'territory' && clients?.length > 0) {
    columns = [
      { key: 'name', label: 'Name', x: MARGIN + 2, align: 'left' },
      { key: 'email', label: 'Email', x: MARGIN + 40, align: 'left' },
      { key: 'care_package', label: 'Package', x: MARGIN + 95, align: 'left', format: v => (v || '').replace('_', ' ') },
      { key: 'current_tier', label: 'Tier', x: MARGIN + 118, align: 'left' },
      { key: 'lifetime_points', label: 'Lifetime Pts', x: MARGIN + CW - 25, align: 'right', format: v => (v || 0).toLocaleString() },
      { key: 'redeemable_points', label: 'Redeemable', x: MARGIN + CW - 2, align: 'right', format: v => (v || 0).toLocaleString() }
    ];
    rows = clients;
  } else {
    columns = [
      { key: 'name', label: 'Name', x: MARGIN + 2, align: 'left', format: v => level === 'country' ? (STATE_NAMES[v] || v) : v },
      { key: 'clients', label: 'Clients', x: MARGIN + 48, align: 'right', format: v => String(v || 0) },
      { key: 'active_clients', label: 'Active', x: MARGIN + 65, align: 'right', format: v => String(v || 0) },
      { key: 'revenue', label: 'Revenue', x: MARGIN + 98, align: 'right', format: v => fmtCurrency(v) },
      { key: 'avg_revenue_per_client', label: 'Rev/Client', x: MARGIN + 130, align: 'right', format: v => fmtCurrency(v) },
      { key: 'avg_tenure_days', label: 'Avg Duration', x: MARGIN + CW - 2, align: 'right', format: v => `${v || 0} days` }
    ];
    rows = breakdown || [];
  }

  const tableResult = drawTable(doc, columns, rows, y);
  y = tableResult.y;

  // --- Charts: try to fit on same page or start new page ---
  if (reportDiv) {
    const chartsNeeded = 145; // revenue trend (~60) + two side-by-side (~60) + title + gaps
    y = ensureSpace(doc, chartsNeeded, y + 2);

    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Charts & Visualizations', MARGIN, y + 3);
    y += 6;

    const trendEl = reportDiv.querySelector('[data-chart="revenue-trend"]');
    const tierEl = reportDiv.querySelector('[data-chart="tier-distribution"]');
    const pkgEl = reportDiv.querySelector('[data-chart="care-package"]');

    if (trendEl) {
      try {
        const trendImg = await captureElement(trendEl);
        y = ensureSpace(doc, 58, y);
        doc.addImage(trendImg, 'PNG', MARGIN, y, CW, 55);
        y += 58;
      } catch (e) {
        console.error('Failed to capture revenue trend:', e);
      }
    }

    const halfW = (CW - 3) / 2;
    y = ensureSpace(doc, 58, y);

    if (tierEl) {
      try {
        const tierImg = await captureElement(tierEl);
        doc.addImage(tierImg, 'PNG', MARGIN, y, halfW, 55);
      } catch (e) {
        console.error('Failed to capture tier chart:', e);
      }
    }
    if (pkgEl) {
      try {
        const pkgImg = await captureElement(pkgEl);
        doc.addImage(pkgImg, 'PNG', MARGIN + halfW + 3, y, halfW, 55);
      } catch (e) {
        console.error('Failed to capture package chart:', e);
      }
    }
    y += 58;
  }

  // --- Custom Charts ---
  if (customChartsDiv) {
    const customEls = customChartsDiv.querySelectorAll('[data-custom-chart]');
    if (customEls.length > 0) {
      y = ensureSpace(doc, 12, y);
      doc.setTextColor(...TEXT_DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Custom Charts', MARGIN, y + 3);
      y += 6;

      for (const el of customEls) {
        try {
          y = ensureSpace(doc, 60, y);
          const img = await captureElement(el);
          doc.addImage(img, 'PNG', MARGIN, y, CW, 55);
          y += 58;
        } catch (e) {
          console.error('Failed to capture custom chart:', e);
        }
      }
    }
  }

  // --- Draw footers on all pages ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(filename || 'noorvana-market-report.pdf');
}
