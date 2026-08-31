import React from 'react';
import {
  X,
  Plus,
  Scissors,
  ShoppingBag,
  Calendar,
  UserPlus,
  DollarSign,
  Shirt,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';

interface BoutiqueSpeedNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (
    action:
      | 'custom_order'
      | 'alteration'
      | 'quick_sale'
      | 'book_appointment'
      | 'new_customer'
      | 'record_payment'
      | 'catalogue_upload'
  ) => void;
}

export const BoutiqueSpeedNewModal: React.FC<BoutiqueSpeedNewModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const actions = [
    {
      id: 'custom_order' as const,
      title: t('quick.stitch', 'Stitch') + ' - Custom & Bridal',
      desc: 'Stitching order, design reference, fabric & measurements',
      icon: Shirt,
      color: 'bg-amber-400 text-slate-950',
      badge: 'Stitch',
      borderHover: 'hover:border-amber-400 hover:bg-amber-50/40',
    },
    {
      id: 'alteration' as const,
      title: t('quick.alter', 'Alter') + ' - Fitting & Repairs',
      desc: 'Quick express entry for garment fitting, hemming & fixes',
      icon: Scissors,
      color: 'bg-sky-600 text-white',
      badge: 'Alteration',
      borderHover: 'hover:border-sky-400 hover:bg-sky-50/40',
    },
    {
      id: 'quick_sale' as const,
      title: t('quick.sale', 'Sale') + ' - Ready-made Bill',
      desc: 'Instant retail bill for ready boutique garments & accessories',
      icon: ShoppingBag,
      color: 'bg-emerald-600 text-white',
      badge: 'Retail Bill',
      borderHover: 'hover:border-emerald-400 hover:bg-emerald-50/40',
    },
    {
      id: 'book_appointment' as const,
      title: t('quick.appointment', 'Appointment') + ' - Trial & Visit',
      desc: 'Schedule bridal consultation, trial room fitting, or pickup',
      icon: Calendar,
      color: 'bg-purple-600 text-white',
      badge: 'Visit / Trial',
      borderHover: 'hover:border-purple-400 hover:bg-purple-50/40',
    },
    {
      id: 'record_payment' as const,
      title: 'Collect Payment / Advance',
      desc: 'Record UPI, Cash or Card settlement against an order',
      icon: DollarSign,
      color: 'bg-teal-600 text-white',
      badge: 'Ledger',
      borderHover: 'hover:border-teal-400 hover:bg-teal-50/40',
    },
    {
      id: 'new_customer' as const,
      title: 'New Customer Profile',
      desc: 'Add customer contact, preferences, and body measurements',
      icon: UserPlus,
      color: 'bg-slate-800 text-white',
      badge: 'Directory',
      borderHover: 'hover:border-slate-400 hover:bg-slate-50/40',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Modal Top */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">
                {t('quick.title', 'Quick Actions')}
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                Choose an operational task to create or record
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

        {/* Action Grid (Compact, Smaller Cards) */}
        <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[70vh] overflow-y-auto">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  onSelectAction(act.id);
                  onClose();
                }}
                className={`p-3 rounded-xl border border-slate-200 bg-white text-left transition-all cursor-pointer group flex flex-col justify-between gap-2 shadow-2xs hover:shadow-sm ${act.borderHover}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${act.color}`}>
                    <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {act.badge}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-black text-slate-900 group-hover:text-[#0B4636] transition-colors flex items-center gap-1">
                    <span>{act.title}</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug font-medium line-clamp-2">
                    {act.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
