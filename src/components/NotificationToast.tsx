import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ShieldAlert, Sparkles, X, Zap } from 'lucide-react';

interface NotificationToastProps {
  onExpressBuyProduct?: (productName: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  onExpressBuyProduct
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentNotice, setCurrentNotice] = useState({
    title: '⚡ Flash Price Drop Alert',
    brand: 'Snitch',
    text: 'Heavyweight Hoodie dropped by ₹500 on official site!',
    savings: '₹500'
  });

  const notifications = [
    {
      title: '⚡ Flash Price Drop Alert',
      brand: 'Snitch',
      text: 'Heavyweight Hoodie dropped by ₹500 on official site!',
      savings: '₹500'
    },
    {
      title: '🔥 Token Code Unlocked',
      brand: 'Minimalist',
      text: '10% Niacinamide Serum token BEDIRECT10 active now!',
      savings: '₹150'
    },
    {
      title: '👟 Restock Pulse Alert',
      brand: 'Comet',
      text: 'Aeon Retro Sneakers restocked in UK 9 on official store!',
      savings: '₹1,100'
    }
  ];

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % notifications.length;
      setCurrentNotice(notifications[index]);
      setIsVisible(true);

      setTimeout(() => {
        setIsVisible(false);
      }, 5500);
    }, 14000);

    // Initial trigger after 3s
    const timer = setTimeout(() => {
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5500);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed bottom-5 right-5 z-40 max-w-sm w-full p-4 rounded-2xl bg-[#09090B]/95 border border-emerald-500/50 shadow-2xl backdrop-blur-xl flex items-start gap-3"
        >
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/30">
            <Zap className="w-5 h-5 fill-emerald-400 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                {currentNotice.title}
              </span>
              <button onClick={() => setIsVisible(false)} className="text-zinc-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs font-bold text-white leading-tight">
              {currentNotice.text}
            </p>

            <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-zinc-400">{currentNotice.brand} Direct</span>
              <span className="text-emerald-400 font-extrabold">Save {currentNotice.savings}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
