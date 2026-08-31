/**
 * Timezone-aware Date Utilities for Tailor CRM & Boutique Appointments
 * Ensures consistent YYYY-MM-DD formatting matching client local time instead of UTC offset shifts.
 */

export const getLocalDateStr = (d: Date | string | number | any = new Date()): string => {
  if (!d) return new Date().toISOString().split('T')[0];
  
  // Handle Firestore Timestamp object
  if (typeof d === 'object' && d !== null) {
    if (typeof d.toDate === 'function') {
      d = d.toDate();
    } else if (typeof d.seconds === 'number') {
      d = new Date(d.seconds * 1000);
    }
  }

  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeDateStr = (dateVal?: any): string => {
  if (!dateVal) return '';

  // Handle Firestore Timestamp object
  if (typeof dateVal === 'object' && dateVal !== null) {
    if (typeof dateVal.toDate === 'function') {
      return getLocalDateStr(dateVal.toDate());
    }
    if (typeof dateVal.seconds === 'number') {
      return getLocalDateStr(new Date(dateVal.seconds * 1000));
    }
    if (dateVal instanceof Date) {
      return getLocalDateStr(dateVal);
    }
  }

  // Handle numbers (epoch ms or seconds)
  if (typeof dateVal === 'number') {
    const d = dateVal > 1e11 ? new Date(dateVal) : new Date(dateVal * 1000);
    return getLocalDateStr(d);
  }

  if (typeof dateVal !== 'string') return '';
  const trimmed = dateVal.trim();
  if (!trimmed) return '';

  // If ISO string with T
  if (trimmed.includes('T')) {
    // Check if valid Date to get local date
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return getLocalDateStr(d);
    }
    return trimmed.split('T')[0];
  }

  // If DD-MM-YYYY (e.g. 20-08-2026 or 20-8-2026)
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // If DD/MM/YYYY (e.g. 20/08/2026 or 20/8/2026)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // If YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // If YYYY-MM-DD with unpadded digits e.g. 2026-8-20
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try standard parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return getLocalDateStr(parsed);
  }

  return trimmed;
};

export const getOffsetDateStr = (days: number, fromDate: Date = new Date()): string => {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return getLocalDateStr(d);
};

export const isDateToday = (dateVal?: any): boolean => {
  if (!dateVal) return false;
  const todayLocal = getLocalDateStr();
  const normalized = normalizeDateStr(dateVal);
  if (normalized === todayLocal) return true;

  // Also check direct string matches for IN and GB locales
  const now = new Date();
  const todayIn = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const todayGb = now.toLocaleDateString('en-GB');
  const s = String(dateVal).trim();
  return s.startsWith(todayLocal) || s === todayIn || s === todayGb || s.includes(todayLocal);
};

export const isDateTomorrow = (dateStr?: string | null): boolean => {
  if (!dateStr) return false;
  return normalizeDateStr(dateStr) === getOffsetDateStr(1);
};

export const isDateInUpcomingRange = (dateStr?: string | null, days: number = 7): boolean => {
  if (!dateStr) return false;
  const normalized = normalizeDateStr(dateStr);
  const today = getLocalDateStr();
  const maxDate = getOffsetDateStr(days);
  return normalized >= today && normalized <= maxDate;
};

export const formatDisplayDate = (isoOrFormattedDate?: string | null): string => {
  if (!isoOrFormattedDate) return '';
  const normalized = normalizeDateStr(isoOrFormattedDate);
  const parts = normalized.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  }
  return isoOrFormattedDate;
};

export const formatFullReadableDate = (isoOrFormattedDate?: string | null): string => {
  if (!isoOrFormattedDate) return '';
  try {
    const normalized = normalizeDateStr(isoOrFormattedDate);
    const [y, m, d] = normalized.split('-').map(Number);
    if (!y || !m || !d) return isoOrFormattedDate;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoOrFormattedDate;
  }
};
