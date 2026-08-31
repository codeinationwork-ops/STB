import React, { useState } from 'react';
import {
  X,
  Shirt,
  Scissors,
  ShoppingBag,
  Calendar,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { TailorOrder, ShopProfile, TailorCustomer, StaffTailor, BoutiqueAppointment, MarketplaceProduct } from '../../types';
import { Screen3NewOrder } from './Screen3NewOrder';
import { Screen3AlterationForm } from './Screen3AlterationForm';
import { Screen3SaleForm } from './Screen3SaleForm';
import { BoutiqueAppointmentModal } from './BoutiqueAppointmentModal';
import { useLanguage } from '../../lib/LanguageContext';

export type ModernOrderPopupType = 'stitch' | 'alter' | 'sale' | 'appointment' | null;

interface ModernOrderPopupsProps {
  isOpen: boolean;
  activeType: ModernOrderPopupType;
  onClose: () => void;
  onSaveOrder: (order: TailorOrder) => void;
  shopProfile?: ShopProfile | null;
  existingCustomers?: TailorCustomer[];
  tailors?: StaffTailor[];
  isDesktopView?: boolean;
  initialProduct?: MarketplaceProduct | null;
}

export const ModernOrderPopups: React.FC<ModernOrderPopupsProps> = ({
  isOpen,
  activeType,
  onClose,
  onSaveOrder,
  shopProfile,
  existingCustomers = [],
  tailors = [],
  isDesktopView = false,
  initialProduct = null,
}) => {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState<ModernOrderPopupType>(activeType);

  // Sync tab when activeType changes
  React.useEffect(() => {
    if (activeType) {
      setCurrentTab(activeType);
    }
  }, [activeType]);

  // Handle ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentTab) return null;

  const getHeaderMeta = () => {
    switch (currentTab) {
      case 'stitch':
        return {
          title: 'Bespoke Custom Stitching',
          subtitle: 'Client body measurements, fabric, styling specs & promised delivery date',
          badge: '🧵 STITCH ORDER',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
          gradient: 'from-[#0B4636] via-[#0d5945] to-slate-900',
          icon: Shirt,
        };
      case 'alter':
        return {
          title: 'Express Alteration & Fitting',
          subtitle: 'Waist, length, sleeves, tapering & garment repair specifications',
          badge: '✂️ ALTERATION',
          badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
          gradient: 'from-sky-950 via-indigo-950 to-slate-900',
          icon: Scissors,
        };
      case 'sale':
        return {
          title: 'Ready-Made Retail Sale Billing',
          subtitle: 'Instant barcode / item billing, ready garments, accessories & tax invoice',
          badge: '🛍️ RETAIL SALE',
          badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
          gradient: 'from-teal-950 via-emerald-950 to-slate-900',
          icon: ShoppingBag,
        };
      case 'appointment':
        return {
          title: 'Client Appointment & Fitting Visit',
          subtitle: 'Schedule trial room fittings, custom bridal consultations & order pick-ups',
          badge: '📅 APPOINTMENT',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
          gradient: 'from-purple-950 via-slate-900 to-indigo-950',
          icon: Calendar,
        };
      default:
        return {
          title: 'New Order Entry',
          subtitle: 'Record tailor orders and customer details',
          badge: 'ORDER',
          badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
          gradient: 'from-slate-900 to-slate-800',
          icon: Shirt,
        };
    }
  };

  const meta = getHeaderMeta();
  const IconComp = meta.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
      <div className="bg-[#f8f9fb] rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300/80 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* ================= 1. ULTRA-MODERN STICKY MODAL TOP BAR ================= */}
        <div className={`bg-gradient-to-r ${meta.gradient} text-white px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 relative border-b border-white/10`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
                <IconComp className="w-5 h-5 text-amber-300 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black tracking-wider uppercase ${meta.badgeBg}`}>
                    {meta.badge}
                  </span>
                  <span className="text-xs text-slate-300 hidden sm:inline">•</span>
                  <span className="text-xs text-amber-200/90 font-medium truncate hidden sm:inline">
                    {shopProfile?.shopName || 'Boutique Studio'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate mt-0.5">
                  {meta.title}
                </h2>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer shrink-0 active:scale-95"
              title="Close Popup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workflow Quick Switcher Tabs inside Modal Header */}
          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/15 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setCurrentTab('stitch')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                currentTab === 'stitch'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Stitch</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('alter')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                currentTab === 'alter'
                  ? 'bg-sky-400 text-slate-950 shadow-xs'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Alter</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('sale')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                currentTab === 'sale'
                  ? 'bg-emerald-400 text-slate-950 shadow-xs'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Sale</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('appointment')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                currentTab === 'appointment'
                  ? 'bg-purple-400 text-slate-950 shadow-xs'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Appointment</span>
            </button>
          </div>
        </div>

        {/* ================= 2. MODAL FORM BODY ================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {currentTab === 'stitch' && (
            <Screen3NewOrder
              onBack={onClose}
              onSaveOrder={(ord) => {
                onSaveOrder(ord);
                onClose();
              }}
              existingCustomers={existingCustomers}
              isDesktopView={isDesktopView}
              initialCategory="Stitch"
              initialMode="stitch"
              initialProduct={initialProduct}
            />
          )}

          {currentTab === 'alter' && (
            <Screen3AlterationForm
              onBack={onClose}
              onSaveOrder={(ord) => {
                onSaveOrder(ord);
                onClose();
              }}
              existingCustomers={existingCustomers}
              shopProfile={shopProfile}
              isDesktopView={isDesktopView}
            />
          )}

          {currentTab === 'sale' && (
            <Screen3SaleForm
              onBack={onClose}
              onSaveOrder={(ord, addAnother) => {
                onSaveOrder(ord);
                if (!addAnother) {
                  onClose();
                }
              }}
              existingCustomers={existingCustomers}
              shopProfile={shopProfile}
              isDesktopView={isDesktopView}
            />
          )}

          {currentTab === 'appointment' && (
            <div className="max-w-xl mx-auto py-2">
              <BoutiqueAppointmentModal
                isOpen={true}
                onClose={onClose}
                existingCustomers={existingCustomers}
                onSaved={() => {
                  onClose();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
