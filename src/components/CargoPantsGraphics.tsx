import React from 'react';
import { motion } from 'motion/react';

// Real photo component for Male Navy Cargo Pants with 3D Out-of-Screen animation
export const MaleNavyCargoPants: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => {
  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-visible ${className}`}>
      {/* Soft Light Blue Circular Backdrop */}
      <div className="absolute w-[80%] h-[80%] rounded-full bg-gradient-to-b from-[#e0ecff] to-[#c7dcfd] shadow-inner border border-blue-100/60" />

      {/* Floating 3D Image popping OUT of the screen / circle */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="relative z-20 w-[105%] h-[115%] -mt-4 flex items-center justify-center overflow-visible"
      >
        <motion.img
          src="/male_ss.png"
          alt="Men's Outfit"
          whileHover={{ scale: 1.12, y: -10, filter: "drop-shadow(0 20px 25px rgba(37,99,235,0.35))" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-full h-full object-contain filter drop-shadow-xl cursor-pointer"
        />
      </motion.div>
    </div>
  );
};

// Real photo component for Female Blush Pink Cargo Pants with 3D Out-of-Screen animation
export const FemalePinkCargoPants: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => {
  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-visible ${className}`}>
      {/* Soft Light Pink Circular Backdrop */}
      <div className="absolute w-[80%] h-[80%] rounded-full bg-gradient-to-b from-[#fde8ef] to-[#fbcfe0] shadow-inner border border-rose-100/60" />

      {/* Floating 3D Image popping OUT of the screen / circle */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
        className="relative z-20 w-[105%] h-[115%] -mt-4 flex items-center justify-center overflow-visible"
      >
        <motion.img
          src="/female_ss.png"
          alt="Women's Outfit"
          whileHover={{ scale: 1.12, y: -10, filter: "drop-shadow(0 20px 25px rgba(225,29,72,0.35))" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-full h-full object-contain filter drop-shadow-xl cursor-pointer"
        />
      </motion.div>
    </div>
  );
};

