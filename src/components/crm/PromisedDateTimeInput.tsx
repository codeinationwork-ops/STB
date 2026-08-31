import React from 'react';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import {
  formatDisplayDate,
  formatFullReadableDate,
  getLocalDateStr,
  normalizeDateStr,
} from '../../lib/dateUtils';

export { formatDisplayDate, formatFullReadableDate, getLocalDateStr, normalizeDateStr };

interface PromisedDateTimeInputProps {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  onDateChange: (newDate: string) => void;
  onTimeChange: (newTime: string) => void;
  showPresets?: boolean;
  showStatusBanner?: boolean;
  isSundayOff?: boolean;
  freeWorkersCount?: number;
  estimatedHours?: number;
  label?: string;
  className?: string;
}

// Convert HH:mm to 12-hour AM/PM format (e.g. 10:00 -> 10:00 AM, 18:00 -> 06:00 PM)
export const formatDisplayTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const mins = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH < 10 ? '0' : ''}${displayH}:${mins} ${ampm}`;
};

export const PromisedDateTimeInput: React.FC<PromisedDateTimeInputProps> = ({
  date,
  time,
  onDateChange,
  onTimeChange,
  showPresets = true,
  showStatusBanner = true,
  isSundayOff = false,
  freeWorkersCount,
  estimatedHours,
  label = 'Promised Date & Time',
  className = '',
}) => {
  const quickDatePresets = [
    { label: 'Today', days: 0 },
    { label: 'Tomorrow', days: 1 },
    { label: '3 Days', days: 3 },
    { label: '5 Days', days: 5 },
    { label: '7 Days', days: 7 },
    { label: '10 Days', days: 10 },
  ];

  const quickTimePresets = [
    { label: '10:00 AM', time: '10:00' },
    { label: '12:00 PM', time: '12:00' },
    { label: '02:00 PM', time: '14:00' },
    { label: '04:00 PM', time: '16:00' },
    { label: '06:00 PM', time: '18:00' },
    { label: '08:00 PM', time: '20:00' },
  ];

  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const timeInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype && typeof dateInputRef.current.showPicker === 'function') {
        try {
          dateInputRef.current.showPicker();
          return;
        } catch {
          // fallback
        }
      }
      dateInputRef.current.focus();
      dateInputRef.current.click();
    }
  };

  const handleOpenTimePicker = () => {
    if (timeInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype && typeof timeInputRef.current.showPicker === 'function') {
        try {
          timeInputRef.current.showPicker();
          return;
        } catch {
          // fallback
        }
      }
      timeInputRef.current.focus();
      timeInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#0B4636]" />
          <span>{label}</span>
        </label>
        {date && (
          <span className="text-[11px] font-bold text-[#0B4636]">
            {formatFullReadableDate(date)} • {formatDisplayTime(time)}
          </span>
        )}
      </div>

      {/* 1-Tap Date Presets */}
      {showPresets && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400">Quick:</span>
          {quickDatePresets.map((preset) => {
            const targetDate = new Date(Date.now() + preset.days * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            const isSelected = date === targetDate;

            return (
              <button
                key={preset.days}
                type="button"
                onClick={() => onDateChange(targetDate)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0B4636] text-amber-300 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                ⚡ {preset.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Styled Twin Pill Inputs matching Reference Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Date Input Pill */}
        <div
          onClick={handleOpenDatePicker}
          className="relative group cursor-pointer"
        >
          <div className="flex items-center justify-between bg-white border-2 border-slate-200 group-hover:border-[#0B4636]/60 group-focus-within:border-[#0B4636] group-focus-within:ring-2 group-focus-within:ring-[#0B4636]/20 rounded-2xl px-3.5 py-2 transition-all shadow-2xs">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date (DD-MM-YYYY)</span>
              <span className="text-sm font-black text-slate-900 tracking-wide">
                {formatDisplayDate(date) || 'Select Date'}
              </span>
            </div>
            <Calendar className="w-4 h-4 text-slate-700 shrink-0 pointer-events-none group-hover:text-[#0B4636]" />
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>
        </div>

        {/* Time Input Pill */}
        <div
          onClick={handleOpenTimePicker}
          className="relative group cursor-pointer"
        >
          <div className="flex items-center justify-between bg-white border-2 border-slate-200 group-hover:border-[#0B4636]/60 group-focus-within:border-[#0B4636] group-focus-within:ring-2 group-focus-within:ring-[#0B4636]/20 rounded-2xl px-3.5 py-2 transition-all shadow-2xs">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Time (24h / AM-PM)</span>
              <span className="text-sm font-black text-slate-900 tracking-wide">
                {time || '18:00'} <span className="text-xs font-bold text-slate-500">({formatDisplayTime(time)})</span>
              </span>
            </div>
            <Clock className="w-4 h-4 text-slate-700 shrink-0 pointer-events-none group-hover:text-[#0B4636]" />
            <input
              ref={timeInputRef}
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Quick Time Slots Selection */}
      {showPresets && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <span className="text-[10px] font-bold text-slate-400 shrink-0">Time Slots:</span>
          {quickTimePresets.map((tp) => {
            const isSelected = time === tp.time;
            return (
              <button
                key={tp.time}
                type="button"
                onClick={() => onTimeChange(tp.time)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-[#0B4636] font-black shadow-xs ring-1 ring-[#0B4636]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {tp.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Real-time Status / Availability Banner */}
      {showStatusBanner && (
        <div>
          {isSundayOff ? (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-[11px] font-bold">
              <span>⚠️</span>
              <span>Sunday is Weekly Off (0 working hours). Choose Mon–Sat for guaranteed delivery.</span>
            </div>
          ) : freeWorkersCount !== undefined ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-emerald-900 text-[11px] font-bold">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>
                  Promised: <span className="underline">{formatDisplayDate(date)}</span> at {formatDisplayTime(time)}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                {estimatedHours ? `${estimatedHours}h Estimated Work` : 'Capacity Available'}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
