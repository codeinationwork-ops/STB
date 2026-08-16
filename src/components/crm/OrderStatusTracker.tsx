import React, { useState, useRef } from 'react';
import {
  Check,
  Scissors,
  Sparkles,
  CheckCircle2,
  ShoppingBag,
  Clock,
  Volume2,
  Pause,
  Ruler,
  FileText,
  X,
  Download,
  Share2,
} from 'lucide-react';
import { OrderStatus, TailorOrder, ShopProfile } from '../../types';
import { getWhatsAppUrl, formatDisplayPhone } from '../../lib/phoneUtils';
import { downloadReceiptPdf, sendWhatsAppWithPdfReceipt } from '../../lib/pdfReceiptGenerator';

interface OrderStatusTrackerProps {
  order: TailorOrder;
  onStatusChangeRequest: (order: TailorOrder, targetStatus: OrderStatus) => void;
  onViewMeasurements?: (order: TailorOrder) => void;
  onViewReceipt?: (order: TailorOrder) => void;
  onToggleVoicePlay?: (order: TailorOrder) => void;
  isVoicePlaying?: boolean;
  shopProfile?: ShopProfile;
  size?: 'sm' | 'md' | 'lg';
}

export const ORDER_STAGES: {
  status: OrderStatus;
  label: string;
  shortLabel: string;
  stepNumber: number;
  icon: any;
  color: string;
  bgColor: string;
  activeBorder: string;
}[] = [
  {
    status: 'New / Cutting',
    label: '1. Received & Cutting',
    shortLabel: 'Cutting',
    stepNumber: 1,
    icon: Scissors,
    color: 'text-amber-700',
    bgColor: 'bg-amber-500',
    activeBorder: 'border-amber-400',
  },
  {
    status: 'Assigned',
    label: '2. Assigned to Karigar',
    shortLabel: 'Assigned',
    stepNumber: 2,
    icon: Clock,
    color: 'text-blue-700',
    bgColor: 'bg-blue-600',
    activeBorder: 'border-blue-400',
  },
  {
    status: 'Stitching in Progress',
    label: '3. Stitching in Progress',
    shortLabel: 'Stitching',
    stepNumber: 3,
    icon: Sparkles,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-600',
    activeBorder: 'border-indigo-400',
  },
  {
    status: 'Completed',
    label: '4. Ready for Pickup',
    shortLabel: 'Ready',
    stepNumber: 4,
    icon: CheckCircle2,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-600',
    activeBorder: 'border-emerald-400',
  },
  {
    status: 'Delivered',
    label: '5. Delivered & Settled',
    shortLabel: 'Delivered',
    stepNumber: 5,
    icon: ShoppingBag,
    color: 'text-[#0B4636]',
    bgColor: 'bg-[#0B4636]',
    activeBorder: 'border-[#0B4636]',
  },
];

export const getStageIndex = (status: OrderStatus): number => {
  if (status === 'New / Cutting') return 0;
  if (status === 'Assigned') return 1;
  if (status === 'Stitching in Progress' || status === 'Trial') return 2;
  if (status === 'Completed') return 3;
  if (status === 'Delivered') return 4;
  return 0;
};

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  order,
  onStatusChangeRequest,
  onViewMeasurements,
  onViewReceipt,
  onToggleVoicePlay,
  isVoicePlaying: externalIsVoicePlaying,
  shopProfile,
  size = 'sm',
}) => {
  const currentIdx = getStageIndex(order.status);
  const [internalVoicePlaying, setInternalVoicePlaying] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isVoicePlaying = externalIsVoicePlaying ?? internalVoicePlaying;

  const handleVoiceToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleVoicePlay) {
      onToggleVoicePlay(order);
      return;
    }

    if (!order.voiceNoteUrl) return;

    if (internalVoicePlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setInternalVoicePlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(order.voiceNoteUrl);
      audioRef.current = audio;
      setInternalVoicePlaying(true);
      audio.play().catch(() => setInternalVoicePlaying(false));
      audio.onended = () => {
        setInternalVoicePlaying(false);
        audioRef.current = null;
      };
    }
  };

  const handleOpenMeasurements = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewMeasurements) {
      onViewMeasurements(order);
    } else {
      setShowMeasurementModal(true);
    }
  };

  const handleOpenReceipt = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewReceipt) {
      onViewReceipt(order);
    } else {
      setShowReceiptModal(true);
    }
  };

  // Measurement counting
  const nonZeroMeasurements = Object.entries(order.measurements || {}).filter(
    ([_, val]) => typeof val === 'string' && val.trim() !== ''
  );

  const hasPaperSlip = !!order.receiptImageUrl;
  const hasVoiceNote = !!order.voiceNoteUrl;

  const handleDownloadReceiptHtml = () => {
    const sName = shopProfile?.shopName || 'ROYAL TAILORS & BOUTIQUE';
    const sPhone = shopProfile?.phoneNumber || '';
    const sAddress = shopProfile?.address || '';
    const ownerName = shopProfile?.ownerName || '';

    const measurementsRows = nonZeroMeasurements
      .map(
        ([k, v]) =>
          `<tr><td style="padding: 6px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600; text-transform: capitalize;">${k
            .replace(/([A-Z])/g, ' $1')
            .toLowerCase()}</td><td style="padding: 6px 12px; border: 1px solid #e2e8f0; font-weight: 800; color: #0B4636;">${v}</td></tr>`
      )
      .join('');

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt - Order #${order.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; padding: 20px; color: #0f172a; }
    .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0B4636; color: #ffffff; padding: 20px; text-align: center; }
    .header h1 { margin: 0 0 4px 0; font-size: 18px; color: #fbbf24; text-transform: uppercase; }
    .content { padding: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 12px; margin-bottom: 14px; }
    .grid-item label { display: block; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .grid-item span { font-weight: 800; color: #0f172a; }
    .balance-box { background: #ffe4e6; border: 1px solid #fecdd3; color: #9f1239; padding: 10px; border-radius: 10px; display: flex; justify-content: space-between; font-weight: 800; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${sName}</h1>
      ${ownerName ? `<p style="margin:2px 0;font-size:12px;">Proprietor: ${ownerName}</p>` : ''}
      ${sPhone ? `<p style="margin:2px 0;font-size:12px;">Phone: +91 ${sPhone}</p>` : ''}
      <div style="background:#fbbf24;color:#0B4636;font-weight:900;font-size:10px;padding:3px 10px;border-radius:20px;display:inline-block;margin-top:6px;">ORDER RECEIPT</div>
    </div>
    <div class="content">
      <div class="grid">
        <div class="grid-item"><label>Order ID</label><span>#${order.id}</span></div>
        <div class="grid-item"><label>Date</label><span>${order.createdDate}</span></div>
        <div class="grid-item"><label>Customer</label><span>${order.customerName}</span></div>
        <div class="grid-item"><label>Phone</label><span>${order.customerPhone}</span></div>
        <div class="grid-item"><label>Garment</label><span>${order.garmentType}</span></div>
        <div class="grid-item"><label>Delivery Promised</label><span>${order.dueDate}</span></div>
      </div>
      <div style="border-top:1px dashed #cbd5e1;border-bottom:1px dashed #cbd5e1;padding:10px 0;font-size:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Total Order Amount</span><b>₹${order.totalAmount}</b></div>
        <div style="display:flex;justify-content:space-between;color:#059669;margin-bottom:4px;"><span>Advance Paid</span><b>₹${order.advancePaid}</b></div>
        <div class="balance-box"><span>Balance Due at Pickup</span><span>₹${order.balanceDue}</span></div>
      </div>
      ${
        measurementsRows
          ? `<h4 style="margin:14px 0 6px 0;font-size:11px;text-transform:uppercase;color:#0B4636;">Measurements</h4><table>${measurementsRows}</table>`
          : ''
      }
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-Order-${order.id}-${order.customerName.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {/* Quick Action Top Bar: Voice Note + Measurements + Receipt (Replacing redundant Status text) */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap px-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Voice Note Button (If added) */}
          {hasVoiceNote && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95 ${
                isVoicePlaying
                  ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-300'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-[#0B4636] border border-emerald-300'
              }`}
              title={isVoicePlaying ? 'Pause Voice Note' : 'Play Voice Recording'}
            >
              {isVoicePlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Playing Voice...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-800" />
                  <span>
                    Voice Note{order.voiceNoteDurationSec ? ` (${order.voiceNoteDurationSec}s)` : ''}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Measurement Button (Manual Tape specs or Paper Slip) */}
          <button
            type="button"
            onClick={handleOpenMeasurements}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95 ${
              hasPaperSlip
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                : nonZeroMeasurements.length > 0
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title="View Recorded Measurements or Paper Slip"
          >
            <Ruler className="w-3.5 h-3.5 text-indigo-700" />
            <span>
              {hasPaperSlip
                ? 'Slip Photo'
                : nonZeroMeasurements.length > 0
                ? `Measurements (${nonZeroMeasurements.length})`
                : 'Measurements'}
            </span>
          </button>

          {/* Receipt / Bill Button */}
          <button
            type="button"
            onClick={handleOpenReceipt}
            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="View Order Receipt & Bill Breakdown"
          >
            <FileText className="w-3.5 h-3.5 text-[#0B4636]" />
            <span>Receipt / Bill</span>
          </button>
        </div>

        {/* Step Progression Indicator */}
        <div className="flex items-center gap-1 text-[11px] font-black text-slate-500">
          <span className="text-slate-400 font-semibold">Step</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-extrabold border border-slate-200">
            {currentIdx + 1}/5
          </span>
        </div>
      </div>

      {/* 5-Step Segmented Bar with Big Touch Targets */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
        {ORDER_STAGES.map((stage, idx) => {
          const isPassed = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const Icon = stage.icon;

          return (
            <button
              key={stage.status}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChangeRequest(order, stage.status);
              }}
              title={`Change status to ${stage.label}`}
              className={`py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group min-h-[44px] ${
                isCurrent
                  ? `${stage.bgColor} text-white font-black shadow-md ring-2 ring-amber-300 scale-[1.02]`
                  : isPassed
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-600 font-bold hover:text-slate-900 border border-slate-200/60'
              }`}
            >
              <div className="flex items-center justify-center">
                {isPassed ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-amber-300' : 'text-slate-500'}`} />
                )}
              </div>
              <span className={`text-[10px] sm:text-[11px] font-black leading-tight mt-0.5 tracking-tight ${isCurrent ? 'text-white' : ''}`}>
                {stage.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* ================= INLINE MEASUREMENTS MODAL ================= */}
      {showMeasurementModal && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowMeasurementModal(false);
          }}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-black">
                  <Ruler className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Measurements • #{order.id}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {order.customerName} ({order.garmentType})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMeasurementModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Paper Slip Image if attached */}
            {order.receiptImageUrl && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider">
                  Paper Measurement Slip Photo
                </span>
                <div
                  onClick={() => setSelectedZoomImage(order.receiptImageUrl)}
                  className="rounded-2xl border border-amber-300 overflow-hidden bg-amber-50 p-2 cursor-pointer hover:opacity-95 transition-opacity"
                >
                  <img
                    src={order.receiptImageUrl}
                    alt="Paper Slip"
                    className="w-full max-h-56 object-contain rounded-xl"
                  />
                  <p className="text-center text-[10px] font-bold text-amber-800 mt-1">
                    🔍 Tap to zoom full resolution
                  </p>
                </div>
              </div>
            )}

            {/* Tape Measurements Grid */}
            {nonZeroMeasurements.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Recorded Tape Specifications ({nonZeroMeasurements.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {nonZeroMeasurements.map(([key, val]) => (
                    <div
                      key={key}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                    >
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="text-sm font-black text-[#0B4636] mt-0.5">
                        {val} in
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !order.receiptImageUrl && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-semibold">
                  Standard sizing or paper slip not attached.
                </div>
              )
            )}

            {/* Special Instructions & Notes */}
            {order.specialNotes && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950">
                <span className="font-extrabold">Special Instructions: </span>
                {order.specialNotes}
              </div>
            )}

            {/* Voice Note Player in Modal if available */}
            {order.voiceNoteUrl && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-emerald-950">Voice Instruction Attached</span>
                  <p className="text-[10px] text-emerald-800 font-semibold">Recorded by customer/master</p>
                </div>
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  className="px-3 py-1.5 rounded-xl bg-[#0B4636] text-amber-300 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isVoicePlaying ? 'Pause Audio' : 'Play Recording'}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowMeasurementModal(false)}
              className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs cursor-pointer shadow-sm"
            >
              Close Measurements
            </button>
          </div>
        </div>
      )}

      {/* ================= INLINE RECEIPT & BILL MODAL ================= */}
      {showReceiptModal && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowReceiptModal(false);
          }}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-[#0B4636] flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Official Receipt • #{order.id}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {shopProfile?.shopName || 'Royal Tailors & Boutique'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Summary Grid */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span className="font-semibold">Customer Name:</span>
                <span className="font-black text-slate-900">{order.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-semibold">Phone:</span>
                <span className="font-black text-slate-900">{formatDisplayPhone(order.customerPhone)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-semibold">Garment:</span>
                <span className="font-black text-[#0B4636]">{order.garmentType}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-semibold">Promised Delivery:</span>
                <span className="font-black text-slate-900">{order.dueDate}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-semibold">Order Stage:</span>
                <span className="font-black text-emerald-800">{order.status}</span>
              </div>
            </div>

            {/* Payment Ledger */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Stitching & Fabric Total</span>
                <span>₹{order.totalAmount}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700">
                <span>Advance Paid</span>
                <span>₹{order.advancePaid}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center">
                <span className="font-black text-rose-950 text-sm">Balance Due at Delivery</span>
                <span className="text-base font-black text-rose-600">₹{order.balanceDue}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadReceiptPdf(order, shopProfile)}
                className="py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Slip</span>
              </button>

              <button
                type="button"
                onClick={() => sendWhatsAppWithPdfReceipt(order, shopProfile)}
                className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp + PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowReceiptModal(false)}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Zoom Image Lightbox */}
      {selectedZoomImage && (
        <div
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedZoomImage(null);
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedZoomImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/40 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedZoomImage}
            alt="Enlarged view"
            className="max-w-full max-h-[85vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
