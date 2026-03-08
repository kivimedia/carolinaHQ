import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CB_COLORS, type GenerateDocumentOptions, type PdfLineItem, type PdfPayment } from './types';

const MARGIN = { left: 10, right: 10, top: 12, bottom: 12 };

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Main synchronous PDF generator
export function generateDocumentPdfSync(options: GenerateDocumentOptions): jsPDF {
  const { documentType, project, client, items, payments, company, policies } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN.left - MARGIN.right;
  let y = MARGIN.top;

  const setColor = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFillColor = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);

  // Header
  setColor(CB_COLORS.pink);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const title = documentType === 'PROPOSAL' ? 'PROPOSAL' : documentType === 'INVOICE' ? 'INVOICE' : documentType === 'QUOTE' ? 'QUOTE' : 'CONTRACT';
  doc.text(title, MARGIN.left, y + 7);

  // Company info (right side)
  if (company) {
    setColor(CB_COLORS.navy);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name || 'Carolina Balloons', pageWidth - MARGIN.right, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(CB_COLORS.muted);
    let cy = y + 5;
    if (company.phone) { doc.text(company.phone, pageWidth - MARGIN.right, cy, { align: 'right' }); cy += 4; }
    if (company.email) { doc.text(company.email, pageWidth - MARGIN.right, cy, { align: 'right' }); cy += 4; }
    if (company.website) { doc.text(company.website, pageWidth - MARGIN.right, cy, { align: 'right' }); }
  }

  y += 16;

  // Divider
  setFillColor(CB_COLORS.pink);
  doc.rect(MARGIN.left, y, contentWidth, 0.5, 'F');
  y += 6;

  // Project & client info
  setColor(CB_COLORS.navy);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(project.name, MARGIN.left, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Two columns: client left, event right
  const midX = MARGIN.left + contentWidth / 2;

  if (client) {
    setColor(CB_COLORS.muted);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT', MARGIN.left, y);
    doc.setFont('helvetica', 'normal');
    setColor(CB_COLORS.navy);
    let cy = y + 5;
    doc.text(client.name, MARGIN.left, cy); cy += 4;
    if (client.email) { doc.text(client.email, MARGIN.left, cy); cy += 4; }
    if (client.phone) { doc.text(client.phone, MARGIN.left, cy); cy += 4; }
    if (client.company) { doc.text(client.company, MARGIN.left, cy); cy += 4; }
    if (client.address) { doc.text(client.address, MARGIN.left, cy); }
  }

  // Event info right column
  setColor(CB_COLORS.muted);
  doc.setFont('helvetica', 'bold');
  doc.text('EVENT DETAILS', midX, y);
  doc.setFont('helvetica', 'normal');
  setColor(CB_COLORS.navy);
  let ey = y + 5;
  if (project.startDate) {
    doc.text(`Date: ${formatDate(project.startDate)}${project.endDate && project.endDate !== project.startDate ? ` - ${formatDate(project.endDate)}` : ''}`, midX, ey);
    ey += 4;
  }
  if (project.venue) { doc.text(`Venue: ${project.venue}`, midX, ey); ey += 4; }
  if (project.venueAddress) { doc.text(project.venueAddress, midX, ey); ey += 4; }
  doc.text(`Status: ${project.status}`, midX, ey);

  y = Math.max(y + 25, ey + 6);

  // Items table
  if (items.length > 0) {
    setFillColor(CB_COLORS.pink);
    doc.rect(MARGIN.left, y, contentWidth, 0.3, 'F');
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN.left, right: MARGIN.right },
      head: [['Item', 'Qty', 'Rate', 'Amount']],
      body: items.map((item) => [
        item.name + (item.category ? `\n${item.category}` : ''),
        item.quantity.toString(),
        formatCurrency(item.rate),
        formatCurrency(item.amount),
      ]),
      headStyles: {
        fillColor: CB_COLORS.pink,
        textColor: CB_COLORS.white,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: CB_COLORS.navy,
      },
      alternateRowStyles: {
        fillColor: CB_COLORS.lightBg,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
      },
      theme: 'plain',
    });

    y = (doc as any).lastAutoTable?.finalY || y + 40;
    y += 6;
  }

  // Totals section
  const totalsX = pageWidth - MARGIN.right - 70;

  setColor(CB_COLORS.navy);
  doc.setFontSize(9);

  if (project.subtotal != null) {
    doc.text('Subtotal:', totalsX, y);
    doc.text(formatCurrency(project.subtotal), pageWidth - MARGIN.right, y, { align: 'right' });
    y += 5;
  }

  // Surcharges (proposal-specific)
  if (options.surcharges && options.surcharges.length > 0) {
    for (const surcharge of options.surcharges) {
      doc.text(`${surcharge.label}:`, totalsX, y);
      doc.text(formatCurrency(surcharge.amount), pageWidth - MARGIN.right, y, { align: 'right' });
      y += 5;
    }
  }

  if (project.discountAmount && project.discountAmount > 0) {
    doc.text('Discount:', totalsX, y);
    setColor([220, 38, 38]); // red
    doc.text(`-${formatCurrency(project.discountAmount)}`, pageWidth - MARGIN.right, y, { align: 'right' });
    setColor(CB_COLORS.navy);
    y += 5;
  }

  if (project.taxAmount != null && project.taxAmount > 0) {
    const taxPct = project.taxRate ? `(${(project.taxRate * 100).toFixed(2)}%)` : '';
    doc.text(`Tax ${taxPct}:`, totalsX, y);
    doc.text(formatCurrency(project.taxAmount), pageWidth - MARGIN.right, y, { align: 'right' });
    y += 5;
  }

  // Total
  setFillColor(CB_COLORS.pink);
  doc.rect(totalsX - 2, y - 1, 72, 8, 'F');
  setColor(CB_COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', totalsX, y + 4);
  doc.text(formatCurrency(project.total), pageWidth - MARGIN.right, y + 4, { align: 'right' });
  y += 14;

  // Personal note (proposals only)
  if (documentType === 'PROPOSAL' && options.personalNote) {
    if (y > 230) { doc.addPage(); y = MARGIN.top; }
    setColor(CB_COLORS.pink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('A Note From Halley', MARGIN.left, y);
    y += 5;

    // Blush background box
    const noteLines = doc.splitTextToSize(options.personalNote, contentWidth - 8);
    const noteHeight = noteLines.length * 4 + 6;
    setFillColor(CB_COLORS.lightBg);
    doc.roundedRect(MARGIN.left, y - 2, contentWidth, noteHeight, 2, 2, 'F');

    setColor(CB_COLORS.navy);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(noteLines, MARGIN.left + 4, y + 2);
    y += noteHeight + 4;
  }

  // Policies
  if (policies && documentType !== 'INVOICE') {
    const renderPolicy = (label: string, policy: { name: string; content: string }) => {
      if (y > 240) { doc.addPage(); y = MARGIN.top; }
      setColor(CB_COLORS.pink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(label, MARGIN.left, y);
      y += 5;
      setColor(CB_COLORS.navy);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(policy.content, contentWidth);
      doc.text(lines, MARGIN.left, y);
      y += lines.length * 3.5 + 6;
    };

    if (policies.payment) renderPolicy('Payment Policy', policies.payment);
    if (policies.cancellation) renderPolicy('Cancellation Policy', policies.cancellation);
    if (policies.terms) renderPolicy('Terms & Conditions', policies.terms);
  }

  // Signature block (contracts only)
  if (documentType === 'CONTRACT') {
    if (y > 230) { doc.addPage(); y = MARGIN.top; }
    y += 6;
    setColor(CB_COLORS.navy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('By signing below, I agree to the terms outlined in this contract.', MARGIN.left, y);
    y += 10;

    // Signature line
    doc.setDrawColor(CB_COLORS.muted[0], CB_COLORS.muted[1], CB_COLORS.muted[2]);
    doc.line(MARGIN.left, y, MARGIN.left + 80, y);
    doc.line(midX, y, midX + 60, y);
    y += 4;
    setColor(CB_COLORS.muted);
    doc.setFontSize(7);
    doc.text('Signature', MARGIN.left, y);
    doc.text('Date', midX, y);
    y += 8;

    doc.line(MARGIN.left, y, MARGIN.left + 80, y);
    y += 4;
    doc.text('Printed Name', MARGIN.left, y);
  }

  // Payments page (if payments exist)
  if (payments && payments.length > 0) {
    doc.addPage();
    y = MARGIN.top;

    setColor(CB_COLORS.pink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Payment History', MARGIN.left, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN.left, right: MARGIN.right },
      head: [['Date', 'Type', 'Method', 'Status', 'Amount']],
      body: payments.map((p) => [
        p.paidDate ? formatDate(p.paidDate) : new Date(p.createdAt).toLocaleDateString(),
        p.paymentType,
        p.paymentMethod || '-',
        p.status,
        formatCurrency(p.amount),
      ]),
      headStyles: {
        fillColor: CB_COLORS.pink,
        textColor: CB_COLORS.white,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: CB_COLORS.navy,
      },
      columnStyles: {
        4: { halign: 'right' },
      },
      theme: 'plain',
    });

    y = (doc as any).lastAutoTable?.finalY || y + 30;
    y += 6;

    // Payment totals
    const totalPaid = payments.filter(p => p.status === 'completed' && p.paymentType !== 'refund').reduce((s, p) => s + p.amount, 0);
    const totalRefunded = payments.filter(p => p.paymentType === 'refund').reduce((s, p) => s + p.amount, 0);
    const balance = project.total - totalPaid + totalRefunded;

    setColor(CB_COLORS.navy);
    doc.setFontSize(9);
    doc.text(`Total Paid: ${formatCurrency(totalPaid)}`, MARGIN.left, y); y += 5;
    if (totalRefunded > 0) { doc.text(`Total Refunded: ${formatCurrency(totalRefunded)}`, MARGIN.left, y); y += 5; }
    doc.setFont('helvetica', 'bold');
    doc.text(`Balance Due: ${formatCurrency(Math.max(0, balance))}`, MARGIN.left, y);
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setColor(CB_COLORS.muted);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const footerY = doc.internal.pageSize.getHeight() - 6;
    doc.text(
      `${project.name} - Generated ${new Date().toLocaleDateString()}`,
      MARGIN.left,
      footerY
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - MARGIN.right, footerY, { align: 'right' });
  }

  return doc;
}

// Download PDF to browser
export function downloadDocumentPdf(options: GenerateDocumentOptions): void {
  const doc = generateDocumentPdfSync(options);
  const fileName = `${options.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${options.documentType.toLowerCase()}.pdf`;
  doc.save(fileName);
}

// Generate base64 for email attachment
export function generateDocumentPdfBase64(options: GenerateDocumentOptions): string {
  const doc = generateDocumentPdfSync(options);
  return doc.output('datauristring');
}
