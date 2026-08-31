import React, { useState } from 'react';
import {
  X,
  DollarSign,
  CreditCard,
  QrCode,
  CheckCircle2,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import { TailorOrder, PaymentMode } from '../../types';

interface BoutiqueQuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: TailorOrder[];
  preselectedOrder?: TailorOrder | null;
  onRecordPayment: (orderId: string, amount: number, mode: PaymentMode, note?: string) => void;
}

export const BoutiqueQuickPaymentModal: React.FC<BoutiqueQuickPaymentModalProps> = ({
  isOpen,
  onClose,
  orders,
  preselectedOrder,
  onRecordPayment,
}) => {
  if (!isOpen) return null;

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    preselectedOrder?.id || (orders.find((o) => o.balanceDue > 0)?.id || '')
  );

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || preselectedOrder;

  const [amount, setAmount] = useState<number>(activeOrder?.balanceDue || 0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI (Scan & Pay)');
  const [note, setNote] = useState<string>('Boutique Counter Settlement');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || amount <= 0) return;

    onRecordPayment(selectedOrderId, amount, paymentMode, note);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Compact Header */}
        <div className="px-4 py-3 bg-[#072C21] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-400 text-slate-950 flex items-center justify-center font-black">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">
                Record Payment / Advance
              </h2>
              <p className="text-[10px] text-emerald-200/90 font-medium">
                Counter balance or booking advance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 space-y-3">
          {/* Order selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Select Order</label>
            <select
              value={selectedOrderId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedOrderId(id);
                const ord = orders.find((o) => o.id === id);
                if (ord) setAmount(ord.balanceDue || 0);
              }}
              className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-[#0B4636] outline-hidden"
            >
              {orders
                .filter((o) => !o.isArchived)
                .map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    {ord.customerName} &bull; {ord.garmentType} (Due: ₹{ord.balanceDue})
                  </option>
                ))}
            </select>
          </div>

          {activeOrder && (
            <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900 text-xs">{activeOrder.customerName}</div>
                <div className="text-[10px] text-slate-500 font-mono">{activeOrder.id} &bull; {activeOrder.garmentType}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-slate-400 uppercase font-bold">Due</div>
                <div className="font-black text-emerald-800 text-xs">₹{activeOrder.balanceDue.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Amount to Collect (₹) *</label>
            <input
              type="number"
              required
              min={1}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full text-sm font-black px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-[#0B4636] outline-hidden"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMode('UPI (Scan & Pay)')}
                className={`p-2 rounded-lg border text-[11px] font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  paymentMode === 'UPI (Scan & Pay)'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('Cash')}
                className={`p-2 rounded-lg border text-[11px] font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  paymentMode === 'Cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('Other (Card/Wallet)')}
                className={`p-2 rounded-lg border text-[11px] font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  paymentMode === 'Other (Card/Wallet)'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card / Net</span>
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Receipt Reference / Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. GPay Ref #12345 or Cash counter"
              className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-[#0B4636] outline-hidden"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#0B4636] hover:bg-[#072C21] text-white font-black text-xs cursor-pointer transition-all shadow-xs active:scale-95"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
