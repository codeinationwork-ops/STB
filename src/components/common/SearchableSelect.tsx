import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, MapPin } from 'lucide-react';

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  searchPlaceholder?: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  disabledMessage?: string;
  required?: boolean;
  allowCustomInput?: boolean;
  icon?: React.ReactNode;
  helperText?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  placeholder,
  searchPlaceholder = 'Search...',
  options,
  value,
  onChange,
  disabled = false,
  disabledMessage,
  required = false,
  allowCustomInput = true,
  icon,
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(lower));
  }, [options, searchTerm]);

  const handleSelect = (selected: string) => {
    onChange(selected);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="relative font-sans" ref={containerRef}>
      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1">
          {icon}
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
          >
            Clear
          </button>
        )}
      </label>

      {/* Main trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
          disabled
            ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
            : isOpen
            ? 'border-[#0B4636] bg-white ring-1 ring-[#0B4636] text-slate-900 shadow-xs'
            : value
            ? 'border-slate-300 bg-white text-slate-900 hover:border-slate-400'
            : 'border-slate-300 text-slate-400 hover:border-slate-400'
        }`}
      >
        <span className="truncate pr-2">
          {value || (disabled && disabledMessage ? disabledMessage : placeholder)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0B4636]' : ''
          }`}
        />
      </button>

      {helperText && !disabled && (
        <p className="text-[10px] text-slate-400 mt-1">{helperText}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fadeIn">
          {/* Search box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent px-1.5 py-1 text-xs font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-xs text-slate-500 font-medium">No matches found</p>
                {allowCustomInput && searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchTerm.trim())}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors w-full cursor-pointer"
                  >
                    Use "{searchTerm.trim()}"
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.toLowerCase() === option.toLowerCase();
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full px-3 py-2 text-xs font-semibold text-left flex items-center justify-between rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-[#0B4636] font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0B4636] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
