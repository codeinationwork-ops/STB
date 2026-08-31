import { jsPDF } from 'jspdf';
import { TailorOrder, ShopProfile } from '../types';
import { clean10DigitPhone, formatDisplayPhone, getWhatsAppUrl } from './phoneUtils';

/**
 * Generates an official jsPDF document instance for an order receipt slip.
 */
export function buildOrderReceiptPdf(order: TailorOrder, shopProfile?: ShopProfile | null): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Standard compact receipt format (148 x 210 mm)
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const shopName = shopProfile?.shopName || 'ROYAL TAILOR BOUTIQUE';
  const ownerName = shopProfile?.ownerName || '';
  const shopAddress = shopProfile?.address || 'Main Market, City Center';
  const shopPhone = shopProfile?.phoneNumber || '';

  // Background Accent Header Banner (Emerald 800)
  doc.setFillColor(6, 95, 70);
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Shop Branding in Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(shopName.toUpperCase(), pageWidth / 2, 10, { align: 'center' });

  doc.setTextColor(236, 253, 245);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (ownerName) {
    doc.text(`Proprietor: ${ownerName}`, pageWidth / 2, 15, { align: 'center' });
  }
  doc.text(shopAddress, pageWidth / 2, 19, { align: 'center' });
  if (shopPhone) {
    doc.text(`Phone: ${formatDisplayPhone(shopPhone)}`, pageWidth / 2, 23, { align: 'center' });
  }

  // Official Receipt Badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth / 2 - 35, 25, 70, 6, 2, 2, 'F');
  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('OFFICIAL CUSTOMER ORDER RECEIPT', pageWidth / 2, 29, { align: 'center' });

  let y = 38;

  // Order & Customer Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(8, y, pageWidth - 16, 20, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('RECEIPT NO', 12, y + 5);
  doc.text('BOOKING DATE', pageWidth / 2 + 2, y + 5);
  doc.text('CUSTOMER NAME', 12, y + 14);
  doc.text('MOBILE PHONE', pageWidth / 2 + 2, y + 14);

  doc.setTextColor(6, 95, 70);
  doc.setFontSize(9);
  doc.text(order.id, 12, y + 9);
  doc.text(`${order.createdDate} (${order.createdTime || ''})`, pageWidth / 2 + 2, y + 9);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text(order.customerName, 12, y + 18);
  doc.text(formatDisplayPhone(order.customerPhone), pageWidth / 2 + 2, y + 18);

  y += 24;

  // Garment Details / Sale Items Section
  const isSaleOrder = order.orderCategory === 'Sale' || (order.saleItems && order.saleItems.length > 0);

  if (isSaleOrder && order.saleItems && order.saleItems.length > 0) {
    // Retail Invoice Table Header
    doc.setFillColor(243, 232, 255); // Purple light
    doc.setDrawColor(216, 180, 254);
    doc.roundedRect(8, y, pageWidth - 16, 8, 1.5, 1.5, 'FD');

    doc.setTextColor(107, 33, 168);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('ITEM DESCRIPTION', 12, y + 5.5);
    doc.text('QTY', pageWidth / 2 + 10, y + 5.5, { align: 'center' });
    doc.text('RATE', pageWidth - 32, y + 5.5, { align: 'right' });
    doc.text('TOTAL', pageWidth - 12, y + 5.5, { align: 'right' });

    y += 9;

    // Line items
    order.saleItems.forEach((item, idx) => {
      const itemBg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(itemBg, itemBg, itemBg);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(8, y, pageWidth - 16, 7, 1, 1, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(item.name.slice(0, 32), 12, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(String(item.quantity || 1), pageWidth / 2 + 10, y + 4.5, { align: 'center' });
      doc.text(`INR ${item.unitPrice || 0}`, pageWidth - 32, y + 4.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(6, 95, 70);
      const lineTotal = (item.quantity || 1) * (item.unitPrice || 0) - (item.discount || 0);
      doc.text(`INR ${lineTotal}`, pageWidth - 12, y + 4.5, { align: 'right' });

      y += 8;
    });

    if (order.specialNotes) {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.text(`Notes: ${order.specialNotes.slice(0, 70)}`, 12, y + 2);
      y += 5;
    }
  } else {
    // Garment Details Section for Stitching / Alteration
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(8, y, pageWidth - 16, 18, 2, 2, 'FD');

    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Garment: ${order.garmentType}`, 12, y + 6);

    // Category Tag
    doc.setFillColor(6, 95, 70);
    doc.roundedRect(pageWidth - 45, y + 2, 33, 5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.text((order.orderCategory || 'NEW STITCH').toUpperCase(), pageWidth - 28.5, y + 5.5, { align: 'center' });

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Style / Fitting: ${order.subTypeStyle || 'Standard Fitting'}`, 12, y + 11);
    if (order.specialNotes) {
      doc.text(`Notes: ${order.specialNotes.slice(0, 55)}`, 12, y + 15);
    }

    y += 22;

    // Measurements Grid (if any)
    const validMeasurements = Object.entries(order.measurements || {}).filter(
      ([_, v]) => typeof v === 'string' && v.trim() !== ''
    );

    if (validMeasurements.length > 0) {
      doc.setTextColor(6, 95, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('RECORDED MEASUREMENTS (INCHES)', 10, y + 2);
      y += 4;

      const colWidth = (pageWidth - 20) / 3;
      const rowHeight = 6;
      let col = 0;
      let rowY = y;

      validMeasurements.forEach(([mKey, mVal]) => {
        const xPos = 10 + col * colWidth;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(xPos, rowY, colWidth - 2, rowHeight, 1, 1, 'FD');

        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        const cleanKey = mKey.replace(/([A-Z])/g, ' $1').toLowerCase();
        doc.text(cleanKey.slice(0, 14), xPos + 2, rowY + 4);

        doc.setTextColor(6, 95, 70);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(String(mVal), xPos + colWidth - 4, rowY + 4, { align: 'right' });

        col++;
        if (col >= 3) {
          col = 0;
          rowY += rowHeight + 1.5;
        }
      });

      y = col === 0 ? rowY + 2 : rowY + rowHeight + 3.5;
    }
  }

  // Financial Ledger Table
  doc.setDrawColor(203, 213, 225);
  doc.line(8, y, pageWidth - 8, y);
  y += 5;

  if (typeof order.subtotalAmount === 'number' && order.subtotalAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Items Subtotal:', 12, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`INR ${order.subtotalAmount}`, pageWidth - 12, y, { align: 'right' });
    y += 4.5;
  }

  if (typeof order.discountAmount === 'number' && order.discountAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 38, 38);
    doc.text('Discount Applied:', 12, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`- INR ${order.discountAmount}`, pageWidth - 12, y, { align: 'right' });
    y += 4.5;
  }

  if (typeof order.taxAmount === 'number' && order.taxAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('GST / Tax:', 12, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`+ INR ${order.taxAmount}`, pageWidth - 12, y, { align: 'right' });
    y += 4.5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Total Invoice / Order Charge:', 12, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`INR ${order.totalAmount}`, pageWidth - 12, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(4, 120, 87);
  doc.text(`Amount Paid (${order.paymentMode || 'Cash'}):`, 12, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`INR ${order.advancePaid}`, pageWidth - 12, y, { align: 'right' });

  y += 4;
  // Balance Due Highlight Box
  if (order.balanceDue > 0) {
    doc.setFillColor(255, 228, 230); // Rose light
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(8, y, pageWidth - 16, 11, 2, 2, 'FD');

    doc.setTextColor(159, 18, 57);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('BALANCE DUE AT TRIAL / DELIVERY', 12, y + 7);
    doc.setFontSize(11);
    doc.text(`INR ${order.balanceDue}`, pageWidth - 12, y + 7, { align: 'right' });
  } else {
    doc.setFillColor(240, 253, 244); // Emerald light
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(8, y, pageWidth - 16, 9, 2, 2, 'FD');

    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('✓ 100% FULLY PAID AT COUNTER', 12, y + 6);
    doc.setFontSize(9);
    doc.text('ZERO BALANCE DUE', pageWidth - 12, y + 6, { align: 'right' });
  }

  y += 14;

  y += 15;

  // Promised Due Date Banner
  doc.setFillColor(6, 95, 70);
  doc.roundedRect(8, y, pageWidth - 16, 12, 2, 2, 'F');

  doc.setTextColor(209, 250, 229); // Emerald 100
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PROMISED DELIVERY DATE & TIME', 12, y + 4.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.text(`${order.dueDate} at ${order.dueTime || '18:00'}`, 12, y + 9);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 36, y + 3.5, 24, 5.5, 1.5, 1.5, 'F');
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(7);
  doc.text('ON TIME', pageWidth - 24, y + 7.2, { align: 'center' });

  y += 18;

  // Footer Note & Terms
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.text(
    'Please present this official receipt during trial or pickup. Thank you for choosing our boutique!',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  return doc;
}

/**
 * Downloads the receipt as a true PDF file.
 */
export function downloadReceiptPdf(order: TailorOrder, shopProfile?: ShopProfile | null): void {
  const doc = buildOrderReceiptPdf(order, shopProfile);
  const cleanId = order.id.replace('#', '');
  const cleanName = order.customerName.replace(/\s+/g, '_');
  doc.save(`Order_Receipt_${cleanId}_${cleanName}.pdf`);
}

/**
 * Generates formatted text for WhatsApp messaging with receipt breakdown.
 */
export function generateWhatsAppReceiptText(order: TailorOrder, shopProfile?: ShopProfile | null): string {
  const sName = shopProfile?.shopName || 'ROYAL TAILOR BOUTIQUE';
  const sPhone = shopProfile?.phoneNumber || '';
  const isSale = order.orderCategory === 'Sale' || (order.saleItems && order.saleItems.length > 0);

  if (isSale && order.saleItems && order.saleItems.length > 0) {
    const itemsLines = order.saleItems
      .map(
        (i) =>
          `  • ${i.name} (x${i.quantity || 1}) - ₹${(i.quantity || 1) * (i.unitPrice || 0) - (i.discount || 0)}`
      )
      .join('\n');

    return `🛍️ *RETAIL INVOICE - ${sName.toUpperCase()}* 🧾
━━━━━━━━━━━━━━━━━━━━
*Invoice No:* ${order.invoiceNumber || order.id}
*Date:* ${order.createdDate} ${order.createdTime || ''}
*Customer:* ${order.customerName} (${formatDisplayPhone(order.customerPhone)})

*Purchased Items:*
${itemsLines}
${order.specialNotes ? `\n*Notes / Alteration:* ${order.specialNotes}` : ''}

*Invoice Summary:*
${order.subtotalAmount ? `• Subtotal: ₹${order.subtotalAmount}\n` : ''}${order.discountAmount ? `• Discount: -₹${order.discountAmount}\n` : ''}${order.taxAmount ? `• GST/Tax: +₹${order.taxAmount}\n` : ''}• *Total Bill:* ₹${order.totalAmount}
• Amount Paid (${order.paymentMode || 'Cash'}): ₹${order.advancePaid}
• *Balance Due:* ${order.balanceDue === 0 ? '₹0 (Fully Paid ✓)' : `₹${order.balanceDue}`}
${sPhone ? `\n📍 Shop Helpline: ${formatDisplayPhone(sPhone)}` : ''}

📄 *PDF invoice attached for your records.*
Thank you for shopping with ${sName}!`;
  }

  const nonZeroMeasurements = Object.entries(order.measurements || {})
    .filter(([_, v]) => typeof v === 'string' && v.trim() !== '')
    .map(([k, v]) => `  • ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${v}`)
    .join('\n');

  return `🧵 *ORDER RECEIPT - ${sName.toUpperCase()}* ✂️
━━━━━━━━━━━━━━━━━━━━
*Receipt No:* ${order.id}
*Date:* ${order.createdDate} ${order.createdTime || ''}
*Customer:* ${order.customerName} (${formatDisplayPhone(order.customerPhone)})

*Garment Details:*
• Type: ${order.garmentType}
• Category: ${order.orderCategory || 'New Stitch'}
• Style: ${order.subTypeStyle || 'Standard Custom Fit'}
${nonZeroMeasurements ? `\n*Recorded Measurements (in):*\n${nonZeroMeasurements}` : ''}
${order.specialNotes ? `\n*Special Notes:* ${order.specialNotes}` : ''}

*Financial Summary:*
• Total Amount: ₹${order.totalAmount}
• Advance Paid: ₹${order.advancePaid} (${order.paymentMode || 'Cash'})
• *BALANCE DUE AT PICKUP:* ₹${order.balanceDue}

🗓️ *Promised Delivery Date:* ${order.dueDate} at ${order.dueTime || '18:00'}
${sPhone ? `\n📍 Contact Shop: ${formatDisplayPhone(sPhone)}` : ''}

📄 *PDF receipt generated & attached for your records.*
Thank you for choosing us! Please present this slip during garment trial or delivery.`;
}

/**
 * Master Share Handler:
 * 1. Generates PDF receipt Blob.
 * 2. Uses Web Share API (with file attachment) if supported on device (e.g. mobile WhatsApp attachment).
 * 3. Also auto-downloads PDF so tailor has it saved in local storage.
 * 4. Opens WhatsApp with strictly cleaned 10-digit number (never double +91).
 */
export async function sendWhatsAppWithPdfReceipt(
  order: TailorOrder,
  shopProfile?: ShopProfile | null
): Promise<{ sharedViaNative: boolean }> {
  const doc = buildOrderReceiptPdf(order, shopProfile);
  const cleanId = order.id.replace('#', '');
  const cleanName = order.customerName.replace(/\s+/g, '_');
  const filename = `Order_Receipt_${cleanId}_${cleanName}.pdf`;

  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
  const messageText = generateWhatsAppReceiptText(order, shopProfile);

  // Check if native file sharing is supported (Mobile WhatsApp share)
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: `Order Receipt ${order.id}`,
        text: messageText,
      });
      return { sharedViaNative: true };
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('Native share cancelled or failed, falling back to direct download + WhatsApp link:', e);
      }
    }
  }

  // Fallback: Download PDF to device + Open WhatsApp link directly
  doc.save(filename);
  const waUrl = getWhatsAppUrl(order.customerPhone, messageText);
  window.open(waUrl, '_blank');
  return { sharedViaNative: false };
}
