import React, { useState, useRef } from 'react';
import {
  FileText,
  X,
  Phone,
  MessageSquare,
  Printer,
  Download,
  Share2,
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Play,
  Pause,
  DollarSign,
  Plus,
  ArrowRight,
  ExternalLink,
  Camera,
  ShoppingBag,
} from 'lucide-react';
import { TailorOrder, ShopProfile, OrderStatus, PaymentMode, PaymentRecord } from '../../types';
import { clean10DigitPhone, formatDisplayPhone, getWhatsAppUrl } from '../../lib/phoneUtils';
import { downloadReceiptPdf, sendWhatsAppWithPdfReceipt } from '../../lib/pdfReceiptGenerator';
import { getMeasurementLabel } from '../../lib/measurementSpecs';

interface OrderReceiptModalProps {
  order: TailorOrder;
  shopProfile?: ShopProfile | null;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onDeliverOrder?: (
    orderId: string,
    balancePaid: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ) => void;
  onRecordPayment?: (orderId: string, amount: number, mode: PaymentMode, note?: string) => void;
  onAssignTimelineClick?: (order: TailorOrder) => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  order,
  shopProfile,
  onClose,
  onUpdateStatus,
  onDeliverOrder,
  onRecordPayment,
  onAssignTimelineClick,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [selectedZoomPhoto, setSelectedZoomPhoto] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(order.balanceDue || 0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [paymentNote, setPaymentNote] = useState('Settlement at pickup');
  const [isSharing, setIsSharing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const shopName = shopProfile?.shopName || 'Royal Tailors & Boutique';
  const ownerName = shopProfile?.ownerName || '';
  const shopAddress = shopProfile?.address || 'Main Road, Market Center';
  const shopPhone = shopProfile?.phoneNumber || '';

  const cleanPhone = clean10DigitPhone(order.customerPhone);
  const formattedPhone = formatDisplayPhone(order.customerPhone);

  const isSale = order.orderCategory === 'Sale';
  const isAlteration = order.orderCategory === 'Alteration';
  const categoryLabel = isSale ? 'Ready Sale' : isAlteration ? 'Alteration' : 'Custom Stitching';
  const categoryBg = isSale
    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
    : isAlteration
    ? 'bg-purple-100 text-purple-900 border-purple-300'
    : 'bg-blue-100 text-blue-900 border-blue-300';

  const nonZeroMeasurements = Object.entries(order.measurements || {})
    .filter(([_, v]) => typeof v === 'string' && v.trim() !== '')
    .map(([k, v]) => ({ key: k, label: getMeasurementLabel(k), value: v }));

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleToggleVoice = () => {
    if (!order.voiceNoteUrl) return;
    if (isPlayingVoice) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingVoice(false);
    } else {
      const audio = new Audio(order.voiceNoteUrl);
      audioRef.current = audio;
      setIsPlayingVoice(true);
      audio.play().catch(() => setIsPlayingVoice(false));
      audio.onended = () => setIsPlayingVoice(false);
    }
  };

  const handleWhatsAppShare = async () => {
    setIsSharing(true);
    try {
      await sendWhatsAppWithPdfReceipt(order, shopProfile);
    } catch (err) {
      console.error('WhatsApp share error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRecordPaymentSubmit = () => {
    if (paymentAmount <= 0) return;
    if (onRecordPayment) {
      onRecordPayment(order.id, paymentAmount, paymentMode, paymentNote);
    } else {
      const newRecord: PaymentRecord = {
        id: `pay-${Date.now()}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        amount: paymentAmount,
        type: paymentAmount >= order.balanceDue ? 'Balance' : 'Partial',
        mode: paymentMode,
        note: paymentNote,
      };
      order.paymentHistory = order.paymentHistory || [];
      order.paymentHistory.unshift(newRecord);
      order.advancePaid = (order.advancePaid || 0) + paymentAmount;
      order.balanceDue = Math.max(0, order.totalAmount - order.advancePaid);
    }
    setShowPaymentForm(false);
  };

  const handleQuickStatus = (newStatus: OrderStatus) => {
    if (newStatus === 'Delivered' && onDeliverOrder) {
      onDeliverOrder(order.id, order.balanceDue, 'Cash', []);
    } else if (onUpdateStatus) {
      onUpdateStatus(order.id, newStatus);
    } else {
      order.status = newStatus;
      if (newStatus === 'Delivered') {
        order.advancePaid = order.totalAmount;
        order.balanceDue = 0;
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white p-5 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Receipt"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center pr-6">
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
              {shopName}
            </h2>
            {ownerName && (
              <p className="text-xs text-emerald-200 font-medium mt-0.5">Proprietor: {ownerName}</p>
            )}
            <p className="text-[11px] text-emerald-100/80 mt-0.5">{shopAddress}</p>
            {shopPhone && (
              <p className="text-[11px] text-emerald-100 font-medium">📞 +91 {formatDisplayPhone(shopPhone)}</p>
            )}

            <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-xs px-3.5 py-1 rounded-full border border-white/20">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-black tracking-wider text-amber-300 uppercase">
                Official Order Receipt
              </span>
            </div>
          </div>
        </div>

        {/* ================= SCROLLABLE RECEIPT BODY ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* 1. Order ID & Category Header Strip */}
          <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm text-slate-900">{order.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    title="Copy Order ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Booked: {order.createdDate || 'Recent'} {order.createdTime ? `• ${order.createdTime}` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${categoryBg}`}>
                {categoryLabel}
              </span>
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-800 text-white shadow-2xs">
                {order.status}
              </span>
            </div>
          </div>

          {/* 2. Customer Profile & Communication */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                  {order.customerName ? order.customerName.charAt(0).toUpperCase() : 'C'}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-slate-900 text-sm truncate">{order.customerName}</div>
                  <div className="font-mono text-slate-500 text-xs font-semibold">
                    {formattedPhone ? `+91 ${formattedPhone}` : 'No phone provided'}
                  </div>
                </div>
              </div>

              {cleanPhone && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
                    title="Call Customer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={getWhatsAppUrl(
                      cleanPhone,
                      `Hello ${order.customerName}, update regarding order #${order.id} from ${shopName}. Status: ${order.status}, Total: ₹${order.totalAmount}, Balance Due: ₹${order.balanceDue}.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center transition-colors shadow-2xs"
                    title="WhatsApp Customer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-white" />
                  </a>
                </div>
              )}
            </div>

            {/* Delivery Timeline Strip */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Promised:{' '}
                  <strong className="text-slate-900 font-bold">
                    {order.dueDate} {order.dueTime ? `(${order.dueTime})` : ''}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 justify-end">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Karigar:{' '}
                  <strong className="text-slate-900 font-bold">{order.assignedTailor || 'Counter Sales'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 3. Garment Details & Tailoring Specs */}
          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{isSale ? '🛍️' : isAlteration ? '✂️' : '🧵'}</span>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{order.garmentType}</h4>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    {order.subTypeStyle || 'Standard Custom Fit'}
                  </p>
                </div>
              </div>

              {order.voiceNoteUrl && (
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[11px] border border-purple-300 shadow-2xs transition-colors cursor-pointer"
                >
                  {isPlayingVoice ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlayingVoice ? 'Pause Audio' : 'Play Voice Note'}</span>
                </button>
              )}
            </div>

            {order.specialNotes && (
              <div className="p-2.5 bg-white rounded-xl border border-emerald-200/80 text-[11px] text-slate-700">
                <span className="font-bold text-emerald-900 block mb-0.5">Special Instructions:</span>
                {order.specialNotes}
              </div>
            )}

            {/* Design & Reference Photos */}
            {order.referencePhotos && order.referencePhotos.length > 0 && (
              <div>
                <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider block mb-1.5">
                  Attached Reference Photos ({order.referencePhotos.length})
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {order.referencePhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedZoomPhoto(photo)}
                      className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                    >
                      <img src={photo} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Measurement Vault Grid (if available) */}
          {nonZeroMeasurements.length > 0 && (
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Scissors className="w-3.5 h-3.5 text-emerald-700" />
                  Recorded Body Measurements (Inches)
                </h4>
                <span className="text-[10px] text-slate-400 font-semibold">{nonZeroMeasurements.length} parameters</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {nonZeroMeasurements.map((m) => (
                  <div
                    key={m.key}
                    className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
                  >
                    <span className="text-[10px] font-semibold text-slate-500 truncate">{m.label}</span>
                    <span className="text-xs font-mono font-black text-emerald-900 mt-0.5">{m.value}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Financial Ledger & Settlement Breakdown */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Payment Ledger</h4>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Total Value / Stitching Charges:</span>
                <span className="font-mono font-bold text-slate-900">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Advance Received:</span>
                <span className="font-mono font-bold">- ₹{(order.advancePaid || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-black text-slate-900 block">Balance Due at Delivery</span>
                  <span className="text-[10px] text-slate-400">Payable at trial / collection</span>
                </div>
                <div className="text-right">
                  {order.balanceDue > 0 ? (
                    <span className="text-base font-mono font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                      ₹{order.balanceDue.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
                      ✓ Paid in Full
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History List (if multiple records) */}
            {order.paymentHistory && order.paymentHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Payment History ({order.paymentHistory.length})
                </span>
                <div className="space-y-1">
                  {order.paymentHistory.map((rec, i) => (
                    <div
                      key={rec.id || i}
                      className="p-1.5 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{rec.type || 'Payment'}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({rec.mode || 'Cash'}) • {rec.date}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800">+ ₹{rec.amount?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Settle / Add Payment Toggle */}
            {order.balanceDue > 0 && (
              <div className="pt-1">
                {!showPaymentForm ? (
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(true)}
                    className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Payment / Settle Balance</span>
                  </button>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Record Customer Payment</span>
                      <button
                        type="button"
                        onClick={() => setShowPaymentForm(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Amount (₹)</label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(Math.max(0, Number(e.target.value)))}
                          max={order.balanceDue}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Payment Mode</label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI Scan & Pay</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRecordPaymentSubmit}
                      className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      Confirm ₹{paymentAmount} Received
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Quick Stage Update Bar */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-600">Quick Status Update:</span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {order.status !== 'Completed' && order.status !== 'Delivered' && (
                <button
                  type="button"
                  onClick={() => handleQuickStatus('Completed')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Mark Ready</span>
                </button>
              )}
              {order.status !== 'Delivered' && (
                <button
                  type="button"
                  onClick={() => handleQuickStatus('Delivered')}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Mark Delivered</span>
                </button>
              )}
              {onAssignTimelineClick && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAssignTimelineClick(order);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3" />
                  <span>Assign Karigar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================= MODAL ACTIONS FOOTER ================= */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            disabled={isSharing}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#1faa4b] active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>{isSharing ? 'Generating Receipt...' : 'WhatsApp Receipt + PDF'}</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadReceiptPdf(order, shopProfile)}
              className="flex-1 sm:flex-initial py-3 px-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Download PDF Bill"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 sm:flex-initial py-3 px-3.5 rounded-2xl bg-white hover:bg-slate-100 active:scale-98 border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-3.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Lightbox */}
      {selectedZoomPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedZoomPhoto(null);
          }}
        >
          <div className="max-w-2xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img src={selectedZoomPhoto} alt="Zoomed Reference" className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setSelectedZoomPhoto(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
