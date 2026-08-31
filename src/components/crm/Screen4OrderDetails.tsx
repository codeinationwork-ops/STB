import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Scissors,
  Share2,
  User,
  DollarSign,
  Volume2,
  Image as ImageIcon,
  Check,
  Calendar,
  AlertCircle,
  Plus,
  Download,
  Printer,
  FileText,
  Camera,
  X,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { TailorOrder, OrderStatus, PaymentRecord, ShopProfile, PaymentMode } from '../../types';
import { OrderStatusTracker } from './OrderStatusTracker';
import { OrderCompletedModal } from './OrderCompletedModal';
import { OrderDeliveryModal } from './OrderDeliveryModal';
import { getWhatsAppUrl, clean10DigitPhone, formatDisplayPhone } from '../../lib/phoneUtils';
import { downloadReceiptPdf, sendWhatsAppWithPdfReceipt } from '../../lib/pdfReceiptGenerator';
import { useLanguage } from '../../lib/LanguageContext';
import { getMeasurementLabel } from '../../lib/measurementSpecs';

interface Screen4OrderDetailsProps {
  order: TailorOrder;
  shopProfile?: ShopProfile;
  onBack: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onDeliverOrder?: (
    orderId: string,
    balancePaid: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ) => void;
  onAssignTimelineClick: (order: TailorOrder) => void;
  isDesktopView?: boolean;
}

export const Screen4OrderDetails: React.FC<Screen4OrderDetailsProps> = ({
  order,
  shopProfile,
  onBack,
  onUpdateStatus,
  onDeliverOrder,
  onAssignTimelineClick,
  isDesktopView = false,
}) => {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(order.balanceDue);
  const [paymentNote, setPaymentNote] = useState('Balance paid at pickup');

  // Modals for Completed and Delivered workflows
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const shopName = shopProfile?.shopName || 'Royal Tailors';
  const shopAddress = shopProfile?.address || '';
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopName + ' ' + shopAddress)}`;

  const toggleVoice = () => {
    if (!order.voiceNoteUrl) return;
    if (isPlayingVoice) {
      setIsPlayingVoice(false);
    } else {
      setIsPlayingVoice(true);
      const audio = new Audio(order.voiceNoteUrl);
      audio.play().catch(() => {});
      audio.onended = () => setIsPlayingVoice(false);
    }
  };

  const handleStatusChangeRequest = (_order: TailorOrder, targetStatus: OrderStatus) => {
    if (targetStatus === 'Assigned') {
      onAssignTimelineClick(order);
    } else if (targetStatus === 'Completed') {
      setShowCompletedModal(true);
    } else if (targetStatus === 'Delivered') {
      setShowDeliveryModal(true);
    } else {
      onUpdateStatus(order.id, targetStatus);
    }
  };

  const handleConfirmDeliverySettlement = (
    orderId: string,
    balancePaid: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ) => {
    if (onDeliverOrder) {
      onDeliverOrder(orderId, balancePaid, paymentMode, stitchedPhotos, notes);
    } else {
      onUpdateStatus(orderId, 'Delivered');
    }
    setShowDeliveryModal(false);
  };

  const handleConfirmCompleted = (orderId: string) => {
    onUpdateStatus(orderId, 'Completed');
    setShowCompletedModal(false);
  };

  const handleRecordPayment = () => {
    if (paymentAmount <= 0) return;
    const newRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      amount: paymentAmount,
      type: paymentAmount >= order.balanceDue ? 'Balance' : 'Partial',
      mode: 'Cash',
      note: paymentNote,
    };

    order.paymentHistory.unshift(newRecord);
    order.advancePaid += paymentAmount;
    order.balanceDue = Math.max(0, order.totalAmount - order.advancePaid);
    setShowPaymentModal(false);
  };

  const handleDownloadReceipt = () => {
    const sName = shopProfile?.shopName || 'ROYAL TAILORS & BOUTIQUE';
    const sPhone = shopProfile?.phoneNumber || '';
    const sAddress = shopProfile?.address || '';
    const ownerName = shopProfile?.ownerName || '';

    const nonZeroMeasurements = Object.entries(order.measurements || {})
      .filter(([_, v]) => typeof v === 'string' && v.trim() !== '')
      .map(([k, v]) => `<tr><td style="padding: 6px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600;">${getMeasurementLabel(k)}</td><td style="padding: 6px 12px; border: 1px solid #e2e8f0; font-weight: 800; color: #0B4636;">${v}</td></tr>`)
      .join('');

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Receipt - ${order.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
    .card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0B4636; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; letter-spacing: 1px; color: #fbbf24; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 12px; opacity: 0.9; }
    .badge { display: inline-block; background: #fbbf24; color: #0B4636; font-weight: 900; font-size: 11px; padding: 4px 12px; border-radius: 20px; margin-top: 10px; text-transform: uppercase; }
    .content { padding: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 13px; margin-bottom: 16px; }
    .grid-item label { display: block; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .grid-item span { font-weight: 800; color: #0f172a; }
    .specs { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px; margin-bottom: 16px; font-size: 13px; }
    .ledger { border-top: 2px dashed #cbd5e1; border-bottom: 2px dashed #cbd5e1; padding: 14px 0; margin-bottom: 16px; font-size: 13px; }
    .ledger-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 600; }
    .balance-box { background: #ffe4e6; border: 1px solid #fecdd3; color: #9f1239; padding: 12px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
    .due-box { background: #0B4636; color: #ffffff; padding: 12px 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${sName}</h1>
      ${ownerName ? `<p>Proprietor: ${ownerName}</p>` : ''}
      ${sAddress ? `<p>${sAddress}</p>` : ''}
      ${sPhone ? `<p>📞 Phone: +91 ${sPhone}</p>` : ''}
      <div class="badge">OFFICIAL CUSTOMER ORDER RECEIPT</div>
    </div>
    <div class="content">
      <div class="grid">
        <div class="grid-item"><label>Receipt No</label><span>${order.id}</span></div>
        <div class="grid-item"><label>Date</label><span>${order.createdDate} (${order.createdTime})</span></div>
        <div class="grid-item"><label>Customer Name</label><span>${order.customerName}</span></div>
        <div class="grid-item"><label>Mobile Phone</label><span>${order.customerPhone}</span></div>
      </div>
      <div class="specs">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 15px; color: #0B4636; margin-bottom: 6px;">
          <span>🧵 ${order.garmentType}</span>
          <span style="font-size: 11px; background: #0B4636; color: #fbbf24; padding: 2px 8px; border-radius: 10px;">${order.orderCategory || 'New Stitch'}</span>
        </div>
        <div><strong>Style:</strong> ${order.subTypeStyle || 'Standard Fitting'}</div>
        ${order.specialNotes ? `<div style="margin-top: 6px; font-size: 12px; background: #ffffff; padding: 8px; border-radius: 8px; border: 1px solid #fef3c7;"><strong>Notes:</strong> ${order.specialNotes}</div>` : ''}
      </div>
      ${nonZeroMeasurements ? `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 900; color: #0B4636; text-transform: uppercase; margin-bottom: 4px;">📏 Recorded Measurements (Inches)</div>
          <table>${nonZeroMeasurements}</table>
        </div>
      ` : ''}
      <div class="ledger">
        <div class="ledger-row"><span>Total Amount:</span><span>₹${order.totalAmount}</span></div>
        <div class="ledger-row" style="color: #047857;"><span>Advance Paid (${order.paymentMode}):</span><span>- ₹${order.advancePaid}</span></div>
        <div class="balance-box">
          <div><strong style="font-size: 12px; display: block;">BALANCE DUE AT PICKUP</strong><span style="font-size: 10px;">Pay at trial/delivery</span></div>
          <span style="font-size: 20px; font-weight: 900;">₹${order.balanceDue}</span>
        </div>
      </div>
      <div class="due-box">
        <div>
          <span style="font-size: 10px; color: #fef08a; text-transform: uppercase; display: block; font-weight: 700;">Promised Delivery Date</span>
          <span style="font-size: 13px; font-weight: 900;">📅 ${order.dueDate} at ${order.dueTime}</span>
        </div>
        <span style="background: #fbbf24; color: #0B4636; font-weight: 900; font-size: 10px; padding: 4px 8px; border-radius: 8px;">ON TIME</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Order_Receipt_${order.id.replace('#', '')}_${order.customerName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-full bg-[#F8F9FA] text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-20'}`}>
      {/* Top Header (Mobile Only) */}
      {!isDesktopView ? (
        <div className="bg-[#0B4636] text-white p-3.5 sticky top-0 z-20 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5 truncate">
                <span>{order.id}</span>
                <span className="text-xs font-semibold text-amber-300 truncate">({order.garmentType})</span>
              </h1>
              <p className="text-[10px] text-emerald-200 truncate">Order Details & Timeline</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleDownloadReceipt}
              className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow flex items-center gap-1 cursor-pointer"
              title="Download Receipt File"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const text = `Hello ${order.customerName}, update regarding your ${order.garmentType} (${order.id}) at ${shopName}:\n\nStatus: ${order.status}\nBalance Due: ₹${order.balanceDue}\n\n📍 Shop Location on Google Maps:\n${mapUrl}`;
                window.open(`https://wa.me/91${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
              }}
              className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1 cursor-pointer"
              title="Share on WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-600 hover:text-[#0B4636] flex items-center gap-1 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('nav.backToDashboard', 'Back to Dashboard')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
              Order {order.id} • {order.garmentType}
            </span>
            <button
              onClick={handleDownloadReceipt}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('order.downloadSlip', 'Download Slip')}</span>
            </button>
            <button
              onClick={() => {
                const text = `Hello ${order.customerName}, update regarding your ${order.garmentType} (${order.id}) at ${shopName}:\n\nStatus: ${order.status}\nBalance Due: ₹${order.balanceDue}\n\n📍 Shop Location on Google Maps:\n${mapUrl}`;
                window.open(`https://wa.me/91${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t('order.sendWhatsAppSlip', 'Send WhatsApp Slip')}</span>
            </button>
          </div>
        </div>
      )}

      <div className={`space-y-2.5 ${isDesktopView ? 'w-full max-w-none' : 'p-3 max-w-2xl mx-auto'}`}>
        {/* Customer Header Card */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Order #{order.id}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-black border shadow-2xs ${
                  order.orderCategory === 'Sale'
                    ? 'bg-purple-100 text-purple-900 border-purple-200'
                    : order.orderCategory === 'Alteration'
                    ? 'bg-amber-100 text-amber-900 border-amber-200'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                }`}
              >
                {order.orderCategory === 'Sale' ? '🛍️ Retail Sale' : order.orderCategory === 'Alteration' ? '✂️ Alteration' : '🧵 Stitching'}
              </span>
              {order.invoiceNumber && (
                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                  {order.invoiceNumber}
                </span>
              )}
            </div>
            <h2 className="text-sm font-black text-slate-900 truncate">{order.customerName}</h2>
            <p className="text-xs font-semibold text-slate-500">{order.customerPhone}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`tel:${clean10DigitPhone(order.customerPhone)}`}
              className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0B4636] border border-emerald-200 flex items-center justify-center font-bold hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
              title="Call Customer"
            >
              <Phone className="w-4 h-4" />
            </a>
            <a
              href={`https://wa.me/91${clean10DigitPhone(order.customerPhone)}`}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-2xs"
              title="Message on WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* 5-Stage Milestone Tracker */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#0B4636] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Order Lifecycle & Status</span>
            </h3>
            <span className="text-[9px] font-bold text-slate-400">Tap stage to transition</span>
          </div>

          <OrderStatusTracker
            order={order}
            onStatusChangeRequest={handleStatusChangeRequest}
            shopProfile={shopProfile}
          />
        </div>

        {/* Category Specific View 1: Retail Sale Items */}
        {order.orderCategory === 'Sale' && order.saleItems && order.saleItems.length > 0 && (
          <div className="bg-white rounded-xl p-3 border border-purple-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1">
                <span>🛍️ Retail Sale Bill ({order.saleItems.length} Items)</span>
              </h3>
              {order.invoiceNumber && (
                <span className="text-[10px] font-mono font-black text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {order.invoiceNumber}
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-extrabold text-[10px]">
                  <tr>
                    <th className="p-2">Item Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Unit Rate</th>
                    <th className="p-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {order.saleItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="p-2 font-bold text-slate-900">
                        <div>{item.name}</div>
                        {item.sku && <span className="text-[9px] text-slate-400 font-mono">SKU: {item.sku}</span>}
                      </td>
                      <td className="p-2 text-center font-black">{item.quantity}</td>
                      <td className="p-2 text-right">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-black text-[#0B4636]">
                        ₹{(item.quantity * item.unitPrice - (item.discount || 0)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(order.taxAmount || order.discountAmount) ? (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-xs text-slate-600">
                {order.discountAmount ? (
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>Discount:</span>
                    <span>- ₹{order.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                ) : null}
                {order.taxAmount ? (
                  <div className="flex justify-between font-bold">
                    <span>GST / Tax:</span>
                    <span>+ ₹{order.taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {/* Category Specific View 2: Alteration Tasks & Garment Intake */}
        {order.orderCategory === 'Alteration' && (
          <div className="bg-white rounded-xl p-3 border border-amber-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5 text-amber-700" />
                <span>Alteration Ticket Details</span>
              </h3>
              {order.alterationUrgency && (
                <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  {order.alterationUrgency}
                </span>
              )}
            </div>

            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5 text-xs">
              <div className="font-extrabold text-slate-900">
                <span className="text-slate-500 font-bold">Garment Provided: </span>
                {order.alterationGarmentProvided || order.garmentType}
              </div>

              {order.alterationTasks && order.alterationTasks.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-amber-900 block">Alteration Work Required:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {order.alterationTasks.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-white p-1.5 rounded-md border border-amber-200 font-bold text-slate-800 text-[11px]">
                        <span className="text-amber-700 font-black">✓</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {order.defectNotes && (
                <div className="pt-1.5 border-t border-amber-200/80 text-amber-950 text-[11px]">
                  <span className="font-black text-amber-900">Pre-existing Garment Condition / Defects: </span>
                  <span>{order.defectNotes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Finished Stitched Garment Photos (If Completed or Delivered) */}
        {order.stitchedPhotos && order.stitchedPhotos.length > 0 && (
          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>Finished Garment Photos ({order.stitchedPhotos.length})</span>
              </h3>
              <span className="text-[9px] font-bold text-emerald-700">Uploaded for delivery</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {order.stitchedPhotos.map((photo, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(photo)}
                  className="aspect-square rounded-lg bg-white border border-emerald-300 overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-2xs group relative"
                >
                  {photo && photo.trim() !== '' ? (
                    <img src={photo} alt={`Finished garment ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : null}
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded font-bold">
                    Zoom
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proof Attachments (Receipt & Voice Note) */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2">
          <h3 className="text-xs font-black text-[#0B4636] uppercase tracking-wider flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Measurement Proof & Audio</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Receipt Photo */}
            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
              <span className="text-[9px] font-bold text-slate-500 block mb-1">Receipt / Measurement Slip</span>
              {order.receiptImageUrl && order.receiptImageUrl.trim() !== '' ? (
                <div
                  onClick={() => setSelectedImage(order.receiptImageUrl)}
                  className="h-28 rounded-md bg-slate-200 overflow-hidden relative cursor-pointer group"
                >
                  <img src={order.receiptImageUrl} alt="Receipt" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                  <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded font-bold">
                    Tap to Zoom
                  </span>
                </div>
              ) : (
                <div className="h-28 rounded-md border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-medium">
                  No slip attached
                </div>
              )}
            </div>

            {/* Voice Note */}
            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-500 block mb-1">Tailor Voice Instruction</span>
                {order.voiceNoteUrl ? (
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleVoice}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer transition-all ${
                          isPlayingVoice ? 'bg-purple-600 animate-pulse' : 'bg-[#0B4636]'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {isPlayingVoice ? 'Playing instruction...' : `Audio Note (${order.voiceNoteDurationSec || 12}s)`}
                        </span>
                        <span className="text-[9px] text-slate-500">Recorded at order creation</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-6 text-center">No audio recorded for this order</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Measurements Table */}
        {order.orderCategory !== 'Sale' && (
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2">
          <h3 className="text-xs font-black text-[#0B4636] uppercase tracking-wider flex items-center gap-1">
            <span>📏 Measurements Ledger</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
            {Object.entries(order.measurements).map(([key, val]) => {
              if (!val) return null;
              return (
                <div key={key} className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block leading-tight line-clamp-1">{getMeasurementLabel(key)}</span>
                  <span className="text-xs font-black text-slate-900 mt-0.5 block">{val}</span>
                </div>
              );
            })}
          </div>

          {order.specialNotes && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold block mb-0.5">Special Instructions:</span>
              {order.specialNotes}
            </div>
          )}
        </div>
        )}

        {/* Financial Ledger & Payment History */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#0B4636] uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Financial Ledger</span>
            </h3>

            {order.balanceDue > 0 && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-2 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-[#0B4636] text-xs font-black flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>+ Collect Payment</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-lg text-center border border-slate-200">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Total</span>
              <span className="text-xs font-black text-slate-900">₹{order.totalAmount}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-emerald-700 uppercase block">Advance</span>
              <span className="text-xs font-black text-emerald-700">₹{order.advancePaid}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-rose-600 uppercase block">Balance</span>
              <span className="text-xs font-black text-rose-600">₹{order.balanceDue}</span>
            </div>
          </div>

          {/* Payment Status Highlight Banner */}
          {order.balanceDue === 0 ? (
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
              <span>✓ Fully Paid in Full (Settled via {order.paymentMode})</span>
              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black">PAID</span>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between">
              <span>⚠️ Balance Due: ₹{order.balanceDue} at Handover</span>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-black cursor-pointer shadow-2xs"
              >
                Collect Now
              </button>
            </div>
          )}

          {/* Payment History timeline */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold text-slate-600">Payment Transactions:</span>
            {order.paymentHistory.map((pm) => (
              <div key={pm.id} className="p-1.5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 text-[11px]">{pm.type} Payment ({pm.mode})</span>
                  <span className="text-[9px] text-slate-400 block">{pm.date}</span>
                </div>
                <span className="font-black text-emerald-700">+ ₹{pm.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && selectedImage.trim() !== '' && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <img src={selectedImage} alt="Enlarged" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}

      {/* Collect Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Record Received Payment</h3>
            <p className="text-xs text-slate-500">Enter amount received from {order.customerName}</p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹)</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-extrabold text-slate-900 focus:outline-none focus:border-[#0B4636]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Note</label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="flex-1 py-2 rounded-xl bg-[#0B4636] text-white font-bold text-xs"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ORDER COMPLETED MODAL (WHATSAPP NOTIFICATION) ================= */}
      {showCompletedModal && (
        <OrderCompletedModal
          order={order}
          shopProfile={shopProfile}
          onClose={() => setShowCompletedModal(false)}
          onConfirmCompleted={handleConfirmCompleted}
        />
      )}

      {/* ================= ORDER DELIVERY MODAL (SETTLEMENT & PHOTOS) ================= */}
      {showDeliveryModal && (
        <OrderDeliveryModal
          order={order}
          shopProfile={shopProfile}
          onClose={() => setShowDeliveryModal(false)}
          onConfirmDelivery={handleConfirmDeliverySettlement}
        />
      )}
    </div>
  );
};
