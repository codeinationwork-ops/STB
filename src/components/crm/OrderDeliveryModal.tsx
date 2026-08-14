import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  Trash2,
  Send,
  CreditCard,
  Banknote,
  QrCode,
  IndianRupee,
  ShoppingBag,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { TailorOrder, ShopProfile, PaymentMode } from '../../types';
import { getWhatsAppUrl, formatDisplayPhone } from '../../lib/phoneUtils';

interface OrderDeliveryModalProps {
  order: TailorOrder;
  shopProfile?: ShopProfile;
  onClose: () => void;
  onConfirmDelivery: (
    orderId: string,
    balancePaid: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ) => void;
}

export const OrderDeliveryModal: React.FC<OrderDeliveryModalProps> = ({
  order,
  shopProfile,
  onClose,
  onConfirmDelivery,
}) => {
  const [balancePaidAmount, setBalancePaidAmount] = useState<number>(order.balanceDue);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>('Cash');
  const [deliveryNotes, setDeliveryNotes] = useState('Delivered to customer. Trial verified.');
  const [stitchedPhotos, setStitchedPhotos] = useState<string[]>(order.stitchedPhotos || []);
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shopName = shopProfile?.shopName || 'Royal Tailors & Boutique';
  const remainingBalanceAfterPayment = Math.max(0, order.balanceDue - balancePaidAmount);

  // Handle Photo Upload / Capture
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setStitchedPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setStitchedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompleteDelivery = () => {
    if (sendWhatsAppReceipt) {
      const deliveryMsg = `Namaste ${order.customerName}! 🛍️✨\n\nYour order #${order.id} for "${order.garmentType}" has been successfully DELIVERED by ${shopName}.\n\n💰 Total Amount: ₹${order.totalAmount}\n💵 Payment Collected: ₹${balancePaidAmount} (${selectedPaymentMode})\n💳 Remaining Balance: ₹${remainingBalanceAfterPayment}\n\nThank you for choosing ${shopName}! We look forward to creating your next outfit! 🙏👗✂️`;
      const waUrl = getWhatsAppUrl(order.customerPhone, deliveryMsg);
      window.open(waUrl, '_blank');
    }

    onConfirmDelivery(
      order.id,
      balancePaidAmount,
      selectedPaymentMode,
      stitchedPhotos,
      deliveryNotes
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150 my-auto max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0B4636] text-amber-300 flex items-center justify-center font-black shadow-md">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900">Deliver Order #{order.id}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-[#0B4636]">
                  Final Delivery
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Customer: <strong className="text-slate-800">{order.customerName}</strong> ({order.customerPhone})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Pending Balance & Payment Settlement */}
        <div className="space-y-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-amber-700" />
              <span>1. Pending Balance & Payment Settlement:</span>
            </label>
            <span className="text-[11px] font-bold text-amber-800">
              Total Order: ₹{order.totalAmount}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-white border border-amber-200">
              <span className="text-[10px] text-slate-500 block">Advance Received</span>
              <span className="font-extrabold text-emerald-700 text-sm">₹{order.advancePaid}</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-amber-200">
              <span className="text-[10px] text-slate-500 block">Pending Balance Due</span>
              <span className="font-black text-rose-600 text-sm">₹{order.balanceDue}</span>
            </div>
          </div>

          {order.balanceDue > 0 ? (
            <div className="space-y-2 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Amount Received Today (₹):</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setBalancePaidAmount(order.balanceDue)}
                      className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-[10px] cursor-pointer"
                    >
                      Full ₹{order.balanceDue}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalancePaidAmount(0)}
                      className="px-2 py-0.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] cursor-pointer"
                    >
                      ₹0 (Keep Due)
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={order.balanceDue}
                  value={balancePaidAmount}
                  onChange={(e) => setBalancePaidAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Method:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Cash', 'UPI (Scan & Pay)', 'Other (Card/Wallet)'] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedPaymentMode(mode)}
                      className={`p-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer text-center ${
                        selectedPaymentMode === mode
                          ? 'bg-[#0B4636] text-white border-[#0B4636] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {mode.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Full amount (₹{order.totalAmount}) is already paid. No balance pending!</span>
            </div>
          )}
        </div>

        {/* 2. Upload Stitched Dress Photos */}
        <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#0B4636]" />
              <span>2. Upload Stitched Dress Photos:</span>
            </label>
            <span className="text-[10px] text-slate-500 font-bold">
              {stitchedPhotos.length} Attached
            </span>
          </div>

          {/* Photo Gallery Previews */}
          {stitchedPhotos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
              {stitchedPhotos.map((photo, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 bg-slate-100 shadow-2xs">
                  <img
                    src={photo}
                    alt={`Stitched dress ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 cursor-pointer shadow-xs"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            multiple
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0B4636] bg-white hover:bg-emerald-50/50 text-slate-700 hover:text-[#0B4636] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Take Photo / Upload Stitched Garment Photos</span>
          </button>
        </div>

        {/* Delivery Note */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Delivery / Alteration Note:</label>
          <input
            type="text"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="e.g. Delivered to customer. Fit verified."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
          />
        </div>

        {/* WhatsApp Receipt Checkbox */}
        <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 cursor-pointer">
          <input
            type="checkbox"
            checked={sendWhatsAppReceipt}
            onChange={(e) => setSendWhatsAppReceipt(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
          />
          <div className="text-xs">
            <span className="font-bold text-emerald-900 block">Send Delivery Receipt on WhatsApp</span>
            <span className="text-[10px] text-emerald-700">Notifies {order.customerName} ({order.customerPhone})</span>
          </div>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCompleteDelivery}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[#0B4636] hover:bg-[#083529] text-amber-300 font-black text-xs shadow-md shadow-[#0B4636]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Confirm Delivery & Settle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
