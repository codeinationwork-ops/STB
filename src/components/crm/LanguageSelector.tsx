import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, AppLanguage } from '../../lib/LanguageContext';

interface LanguageSelectorProps {
  variant?: 'compact' | 'pill' | 'header' | 'inline';
  className?: string;
}

const LANGUAGES: { code: AppLanguage; label: string; short: string; title: string }[] = [
  { code: 'en', label: 'English', short: 'EN', title: 'English' },
  { code: 'hi', label: 'हिन्दी', short: 'हिन्दी', title: 'हिन्दी (Hindi)' },
  { code: 'bn', label: 'বাংলা', short: 'বাংলা', title: 'বাংলা (Bengali)' },
  { code: 'or', label: 'ଓଡ଼ିଆ', short: 'ଓଡ଼ିଆ', title: 'ଓଡ଼ିଆ (Odia)' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { language, setLanguage } = useLanguage();

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center bg-white/10 p-0.5 rounded-xl border border-white/20 text-[10px] font-black shrink-0 ${className}`}
        role="group"
        aria-label="Language options"
      >
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            title={lang.title}
            className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
              language === lang.code
                ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            {lang.short}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div
        className={`inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0 ${className}`}
        role="group"
        aria-label="Language options"
      >
        <Globe className="w-3.5 h-3.5 text-slate-400 ml-1" />
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            title={lang.title}
            className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              language === lang.code
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  // Inline / Bar variant for forms and toolbars
  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 text-xs font-bold overflow-x-auto no-scrollbar ${className}`}
      role="group"
      aria-label="Language selection bar"
    >
      <div className="flex items-center gap-1 px-1.5 text-slate-500 font-extrabold text-[11px] shrink-0">
        <Globe className="w-3.5 h-3.5 text-slate-500" />
        <span>Language / भाषा:</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            title={lang.title}
            className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
              language === lang.code
                ? 'bg-[#0B4636] text-amber-300 shadow-xs ring-1 ring-[#0B4636]'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
};
