import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  ShoppingBag,
  Scissors,
  Calendar,
  Sparkles,
  Shirt,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';

interface BoutiqueFloatingQuickActionProps {
  onNewStitch: () => void;
  onNewAlter: () => void;
  onNewSale: () => void;
  onNewAppointment: () => void;
  // Fallback alias for backward compatibility
  onNewOrder?: () => void;
}

export const BoutiqueFloatingQuickAction: React.FC<BoutiqueFloatingQuickActionProps> = ({
  onNewStitch,
  onNewAlter,
  onNewSale,
  onNewAppointment,
  onNewOrder,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleStitch = onNewStitch || onNewOrder || (() => {});
  const handleAlter = onNewAlter || (() => {});
  const handleSale = onNewSale || (() => {});
  const handleAppointment = onNewAppointment || (() => {});

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsOpen(false);
        handleStitch();
      } else if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsOpen(false);
        handleAlter();
      } else if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setIsOpen(false);
        handleSale();
      } else if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setIsOpen(false);
        handleAppointment();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleStitch, handleAlter, handleSale, handleAppointment]);

  const handleAction = (cb: () => void) => {
    setIsOpen(false);
    cb();
  };

  const actionItems = [
    {
      id: 'stitch',
      title: t('quick.stitch', 'Stitch'),
      sub: t('quick.stitchSub', 'Custom Stitching & Bridal'),
      shortcut: 'Alt+S',
      icon: Shirt,
      iconBg: 'bg-amber-400 text-slate-950 shadow-xs',
      borderHover: 'hover:border-amber-400 hover:bg-amber-50/60',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      action: handleStitch,
    },
    {
      id: 'alter',
      title: t('quick.alter', 'Alter'),
      sub: t('quick.alterSub', 'Fitting & Alterations'),
      shortcut: 'Alt+A',
      icon: Scissors,
      iconBg: 'bg-sky-600 text-white shadow-xs',
      borderHover: 'hover:border-sky-400 hover:bg-sky-50/60',
      badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
      action: handleAlter,
    },
    {
      id: 'sale',
      title: t('quick.sale', 'Sale'),
      sub: t('quick.saleSub', 'Ready-made Billing'),
      shortcut: 'Alt+R',
      icon: ShoppingBag,
      iconBg: 'bg-emerald-600 text-white shadow-xs',
      borderHover: 'hover:border-emerald-400 hover:bg-emerald-50/60',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      action: handleSale,
    },
    {
      id: 'appointment',
      title: t('quick.appointment', 'Appointment'),
      sub: t('quick.appointmentSub', 'Trial & Consultation'),
      shortcut: 'Alt+V',
      icon: Calendar,
      iconBg: 'bg-purple-600 text-white shadow-xs',
      borderHover: 'hover:border-purple-400 hover:bg-purple-50/60',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      action: handleAppointment,
    },
  ];

  return (
    <div ref={menuRef} className="fixed bottom-16 lg:bottom-6 right-4 sm:right-6 z-40 font-sans">
      {/* Dimmed Overlay when Open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xs z-30 transition-opacity animate-fadeIn"
        />
      )}

      {/* Expanded Quick Action Items (Compact & Sleek) */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 mb-2 flex flex-col items-end gap-2 z-40 w-64 sm:w-72 animate-scaleUp">
          <div className="w-full bg-emerald-950 text-white px-3.5 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between border border-emerald-800 shadow-md">
            <span className="flex items-center gap-1.5 text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {t('quick.title', 'Quick Actions')}
            </span>
            <span className="text-[10px] text-emerald-300 font-medium">Esc to close</span>
          </div>

          {actionItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAction(item.action)}
                className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white text-slate-900 border border-slate-200 shadow-md hover:shadow-lg transition-all cursor-pointer group active:scale-98 ${item.borderHover}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold group-hover:scale-105 transition-transform shrink-0 ${item.iconBg}`}>
                    <Icon className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate">
                      {item.sub}
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${item.badgeBg}`}>
                  {item.shortcut}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Trigger Button (FAB) - Refined Green & White Palette */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 sm:h-11 px-3.5 sm:px-4 rounded-full text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all cursor-pointer active:scale-95 border z-40 ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-700 ring-2 ring-emerald-500/30'
            : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-600 ring-2 ring-emerald-500/20'
        }`}
        title="Quick Actions (+ Stitch / Alter / Sale / Appointment)"
      >
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
          <Plus className="w-4 h-4 stroke-[3] text-white" />
        </div>
        <span className="tracking-wide text-white font-bold text-xs">
          {t('quick.title', 'Quick Actions')}
        </span>
        {!isOpen && (
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse inline-block" />
        )}
      </button>
    </div>
  );
};
