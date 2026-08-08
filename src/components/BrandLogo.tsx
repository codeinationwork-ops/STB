import React, { useState } from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white' | 'dark';
  scale?: '1.0' | '1.2' | '1.5' | '2.0' | string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '', variant = 'default', scale = '1.0' }) => {
  const [hasError, setHasError] = useState(false);

  const heightClass = {
    sm: 'h-7 sm:h-8',
    md: 'h-8 sm:h-10',
    lg: 'h-11 sm:h-14',
  }[size];

  const scaleClass = scale && scale !== '1.0' ? {
    '1.2': 'scale-[1.2]',
    '1.5': 'scale-[1.5]',
    '2.0': 'scale-[2.0]',
  }[scale] || '' : '';

  const filterClass = variant === 'white' ? 'brightness-0 invert' : '';

  if (hasError) {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <svg viewBox="0 0 450 120" fill="none" className={`${heightClass} w-auto ${filterClass}`}>
          <text x="10" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="78" fill={variant === 'white' ? '#FFFFFF' : '#0A1138'} letterSpacing="-1.5">Shop</text>
          <text x="195" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="78" fill={variant === 'white' ? '#FFFFFF' : '#7B1DF2'} letterSpacing="-1.5">Sc</text>
          <g transform="translate(285, 24)">
            <circle cx="34" cy="34" r="25" stroke={variant === 'white' ? '#FFFFFF' : '#7B1DF2'} strokeWidth="11" fill="none"/>
            <path d="M51 51 L67 67" stroke={variant === 'white' ? '#FFFFFF' : '#7B1DF2'} strokeWidth="12" strokeLinecap="round"/>
            <rect x="23" y="30" width="22" height="18" rx="2.5" stroke={variant === 'white' ? '#FFFFFF' : '#0A1138'} strokeWidth="4" fill="none"/>
            <path d="M29 30 V25 C29 22.5 39 22.5 39 25 V30" stroke={variant === 'white' ? '#FFFFFF' : '#0A1138'} strokeWidth="3.5" strokeLinecap="round" fill="none"/>
          </g>
          <text x="360" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="78" fill={variant === 'white' ? '#FFFFFF' : '#7B1DF2'} letterSpacing="-1.5">per</text>
        </svg>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center select-none overflow-hidden ${className}`}>
      <img
        src="/Logo.png"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          if (target.src.endsWith('/Logo.png')) {
            target.src = '/logo.png';
          } else if (target.src.endsWith('/logo.png')) {
            target.src = '/shopscoper-logo.svg';
          } else {
            setHasError(true);
          }
        }}
        alt="ShopScoper Logo"
        className={`${heightClass} w-auto object-contain transition-transform duration-200 ${scaleClass} ${filterClass}`}
        loading="eager"
        decoding="async"
      />
    </div>
  );
};



