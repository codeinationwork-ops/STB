import React, { useState } from 'react';
import {
  X,
  Send,
  Copy,
  CheckCircle2,
  Sparkles,
  Phone,
  MessageSquare,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { TailorOrder, ShopProfile } from '../../types';
import { getWhatsAppUrl, formatDisplayPhone } from '../../lib/phoneUtils';

interface OrderCompletedModalProps {
  order: TailorOrder;
  shopProfile?: ShopProfile;
  onClose: () => void;
  onConfirmCompleted: (orderId: string) => void;
}

export const OrderCompletedModal: React.FC<OrderCompletedModalProps> = ({
  order,
  shopProfile,
  onClose,
  onConfirmCompleted,
}) => {
  const shopName = shopProfile?.shopName || 'Royal Tailors & Boutique';
  const shopPhone = shopProfile?.phoneNumber || '';
  const shopAddress = shopProfile?.address || '';

  const defaultMsg = `Namaste ${order.customerName}! 🧵✨\n\nGreat news! Your ${order.garmentType} (Order #${order.id}) is COMPLETED and ready for trial/pickup at ${shopName}.\n\n💰 Total: ₹${order.totalAmount}\n💵 Advance Paid: ₹${order.advancePaid}\n💳 Balance Due: ₹${order.balanceDue}\n\n📍 Shop Address: ${shopAddress || 'Main Market'}\n📞 Contact: ${shopPhone || '9876543210'}\n\nPlease visit anytime to try your fit. Thank you! 🙏`;

  const [message, setMessage] = useState(defaultMsg);
  const [copied, setCopied] = useState(false);

  const waUrl = getWhatsAppUrl(order.customerPhone, message);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendAndComplete = () => {
    window.open(waUrl, '_blank');
    onConfirmCompleted(order.id);
    onClose();
  };

  const handleJustComplete = () => {
    onConfirmCompleted(order.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900">Order Completed & Ready</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                  Ready for Pickup
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Order #{order.id} • <span className="font-bold text-slate-700">{order.customerName}</span>
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

        {/* Order Details Brief Card */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Garment</span>
            <div className="font-black text-slate-900 text-sm">{order.garmentType}</div>
            <div className="text-[11px] text-slate-600">{order.subTypeStyle || 'Custom stitching'}</div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Balance Pending</span>
            <div className="font-black text-base text-rose-600">
              {order.balanceDue > 0 ? `₹${order.balanceDue}` : 'Fully Paid'}
            </div>
            <div className="text-[10px] text-slate-500">Total: ₹{order.totalAmount}</div>
          </div>
        </div>

        {/* WhatsApp Message Preview Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Customer WhatsApp Ready Alert:</span>
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>

          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Customer Phone */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-3.5 h-3.5" />
            <span>Send to: <strong className="text-slate-900">{formatDisplayPhone(order.customerPhone)}</strong></span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            WhatsApp Ready
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleJustComplete}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Mark Ready (No Message)
          </button>

          <button
            type="button"
            onClick={handleSendAndComplete}
            className="flex-2 py-2.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#1ebd59] text-white font-black text-xs shadow-md shadow-[#25D366]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <Send className="w-4 h-4" />
            <span>Send WhatsApp & Mark Ready</span>
          </button>
        </div>
      </div>
    </div>
  );
};
