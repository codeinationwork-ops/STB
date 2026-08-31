import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  textClassName?: string;
  subtitleClassName?: string;
  className?: string;
  variant?: 'light' | 'dark' | 'glass';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  textClassName = 'text-slate-900',
  subtitleClassName = 'text-slate-500',
  className = '',
  variant = 'dark',
}) => {
  const sizeMap = {
    xs: 'w-6 h-6 rounded-lg',
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-16 h-16 rounded-3xl',
    '2xl': 'w-24 h-24 rounded-[32px]',
  };

  const svgSizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10',
    '2xl': 'w-14 h-14',
  };

  const textSizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Precision Stylized Geometric Tailor Scissors Mark matching brand asset */}
      <div
        className={`${sizeMap[size]} flex items-center justify-center shrink-0 shadow-md relative overflow-hidden transition-transform ${
          variant === 'light'
            ? 'bg-emerald-900 border border-emerald-700/50'
            : variant === 'glass'
            ? 'bg-[#0B4636]/90 backdrop-blur-md border border-amber-300/30'
            : 'bg-[#062c22] border border-[#0B4636]'
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${svgSizeMap[size]} text-[#5e8b75] transform -rotate-12 drop-shadow-xs`}
        >
          {/* Subtle background glow circle */}
          <circle cx="50" cy="50" r="44" fill="currentColor" fillOpacity="0.08" />
          
          {/* Left Handle Loop */}
          <circle
            cx="32"
            cy="30"
            r="16"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Right Handle Loop */}
          <circle
            cx="32"
            cy="70"
            r="16"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Connecting Stems to Pivot */}
          <path
            d="M44 38L62 50"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M44 62L62 50"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Central Pivot Dot */}
          <circle cx="62" cy="50" r="4" fill="#fde68a" />
          {/* Top Blade extending outwards */}
          <path
            d="M62 50L86 28"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Bottom Blade crossing */}
          <path
            d="M62 50L86 72"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight leading-none ${textSizeMap[size]} ${textClassName}`}>
            Shop<span className="text-amber-500">Scopers</span>
          </span>
          <span className={`text-[10px] font-bold tracking-wider uppercase mt-0.5 leading-none ${subtitleClassName}`}>
            Boutique CRM
          </span>
        </div>
      )}
    </div>
  );
};
