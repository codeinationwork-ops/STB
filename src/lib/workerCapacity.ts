import { TailorOrder, StaffTailor, OrderStatus } from '../types';

export const DEFAULT_GARMENT_ESTIMATED_HOURS: Record<string, number> = {
  'Formal Shirt': 3,
  'Shirt': 3,
  'Kurta Pajama': 4,
  'Kurta': 4,
  'Blouse': 3,
  'Anarkali Suit': 6,
  'Sherwani': 8,
  'Lehenga': 8,
  'Pant / Trouser': 4,
  'Trouser': 4,
  'Pant': 4,
  'Suit (Coat + Pant)': 10,
  'Suit': 8,
  'Coat': 6,
  'Alterations': 1.5,
  'Alteration': 1.5,
  'Other': 4,
};

export const PROCESS_STAGES = [
  'Cutting Not Started',
  'Cutting in Progress',
  'Cutting Completed',
  'Stitching in Progress',
  'Trial Ready',
  'Alterations',
  'Completed',
  'Delivered',
] as const;

export type ProcessStage = (typeof PROCESS_STAGES)[number];

export function getEstimatedHoursForGarment(garmentType: string, category?: string): number {
  if (category === 'Alteration') return 1.5;
  if (!garmentType) return 4;

  const lower = garmentType.toLowerCase();
  for (const [key, hrs] of Object.entries(DEFAULT_GARMENT_ESTIMATED_HOURS)) {
    if (lower.includes(key.toLowerCase())) {
      return hrs;
    }
  }
  return 4;
}

export interface DailyWorkerSlot {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // Mon, Tue, etc.
  formattedDate: string; // 14 Aug, etc.
  dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  isDayOff: boolean; // Sunday is Day Off (0 hours)
  maxShiftHours: number; // 8 hours for Mon-Sat, 0 for Sun
  bookedHours: number;
  freeHours: number;
  ordersOnDate: TailorOrder[];
  isFullyBooked: boolean;
  hasNoOrders: boolean; // True if date has 0 orders taken
}

export interface WorkerPerformanceSummary {
  tailorId: string;
  tailorName: string;
  role: string;
  phone: string;
  initials: string;
  // Current active workload
  activeOrdersCount: number;
  activeOrders: TailorOrder[];
  activeWorkloadHours: number;
  // Completed workload & historical audit
  completedOrdersCount: number;
  completedOrders: TailorOrder[];
  completedHours: number;
  // Financial contribution
  totalRevenueGenerated: number;
  completedRevenueGenerated: number;
  // Schedule / Capacity
  dailyCapacityHours: number; // 8h standard
  freeHoursToday: number;
  capacityStatus: 'Free / Available' | 'Moderate' | 'Full / Busy';
  // Next 7 days schedule
  upcomingSchedule: DailyWorkerSlot[];
  earliestFreeDate: string | null;
}

/**
 * Standard 8 Hours a Day, Monday to Saturday (Sunday off) schedule generator
 */
export function generateWorkerScheduleForDays(
  tailorName: string,
  orders: TailorOrder[],
  daysCount = 14,
  startDate = new Date()
): DailyWorkerSlot[] {
  const schedule: DailyWorkerSlot[] = [];
  const activeOrders = orders.filter(
    (o) => !o.isArchived && o.status !== 'Completed' && o.status !== 'Delivered'
  );

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const isSunday = dayOfWeek === 0;

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${d.getDate()} ${months[d.getMonth()]}`;

    const maxShiftHours = isSunday ? 0 : 8; // 8 hours a day Mon-Sat

    // Orders allocated to this tailor on this date
    const ordersOnDate = activeOrders.filter((o) => {
      const matchesTailor =
        tailorName === 'Self (Owner)'
          ? o.assignedTailor === 'Self (Owner)' || o.assignedTailor === 'Owner'
          : o.assignedTailor === tailorName;

      return matchesTailor && o.dueDate === dateStr;
    });

    const bookedHours = ordersOnDate.reduce(
      (sum, o) => sum + (o.estimatedHours || getEstimatedHoursForGarment(o.garmentType, o.orderCategory)),
      0
    );

    const freeHours = isSunday ? 0 : Math.max(0, maxShiftHours - bookedHours);
    const isFullyBooked = !isSunday && freeHours <= 0;
    const hasNoOrders = !isSunday && bookedHours === 0;

    schedule.push({
      dateStr,
      dayLabel: dayLabels[dayOfWeek],
      formattedDate,
      dayOfWeek,
      isDayOff: isSunday,
      maxShiftHours,
      bookedHours,
      freeHours,
      ordersOnDate,
      isFullyBooked,
      hasNoOrders,
    });
  }

  return schedule;
}

/**
 * Calculates complete worker summaries, historical stitches, and 8h Mon-Sat schedules
 */
export function calculateWorkerPerformances(
  tailors: StaffTailor[],
  orders: TailorOrder[]
): WorkerPerformanceSummary[] {
  const mockNames = new Set(['master ramesh', 'rafiq bhai', 'suresh kumar', 'mohan lal']);
  const mockIds = new Set(['tailor-1', 'tailor-2', 'tailor-3', 'tailor-4', 't1', 't2', 't3', 't4']);
  const staffList = tailors.filter((t) => !mockNames.has(t.name.toLowerCase()) && !mockIds.has(t.id));

  // Ensure Self (Owner) is present
  if (!staffList.some((s) => s.role === 'Owner' || s.name.includes('Owner') || s.name.includes('Self'))) {
    staffList.unshift({
      id: 'tailor-owner',
      name: 'Self (Owner)',
      phone: '',
      role: 'Owner',
      initials: 'SO',
      activeOrdersCount: 0,
    });
  }

  return staffList.map((staff) => {
    // Active orders
    const activeOrders = orders.filter((o) => {
      if (o.isArchived || o.status === 'Completed' || o.status === 'Delivered') return false;
      if (staff.role === 'Owner' || staff.name.includes('Owner') || staff.name.includes('Self')) {
        return (
          o.assignedTailor === staff.name ||
          o.assignedTailor === 'Self (Owner)' ||
          o.assignedTailor === 'Owner'
        );
      }
      return o.assignedTailor === staff.name;
    });

    // Completed orders historical audit
    const completedOrders = orders.filter((o) => {
      if (o.status !== 'Completed' && o.status !== 'Delivered') return false;
      if (staff.role === 'Owner' || staff.name.includes('Owner') || staff.name.includes('Self')) {
        return (
          o.assignedTailor === staff.name ||
          o.assignedTailor === 'Self (Owner)' ||
          o.assignedTailor === 'Owner'
        );
      }
      return o.assignedTailor === staff.name;
    });

    const activeWorkloadHours = activeOrders.reduce(
      (sum, o) => sum + (o.estimatedHours || getEstimatedHoursForGarment(o.garmentType, o.orderCategory)),
      0
    );

    const completedHours = completedOrders.reduce(
      (sum, o) => sum + (o.estimatedHours || getEstimatedHoursForGarment(o.garmentType, o.orderCategory)),
      0
    );

    // Total revenue generated
    const totalRevenueGenerated = [...activeOrders, ...completedOrders].reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    const completedRevenueGenerated = completedOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    // 8 Hours a Day Schedule (Mon-Sat)
    const upcomingSchedule = generateWorkerScheduleForDays(staff.name, orders, 14);

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySlot = upcomingSchedule.find((s) => s.dateStr === todayStr);
    const freeHoursToday = todaySlot ? todaySlot.freeHours : 8;

    let capacityStatus: 'Free / Available' | 'Moderate' | 'Full / Busy' = 'Free / Available';
    if (freeHoursToday === 0) {
      capacityStatus = 'Full / Busy';
    } else if (freeHoursToday <= 3) {
      capacityStatus = 'Moderate';
    }

    // Earliest date with at least 3 hours free
    const firstFreeSlot = upcomingSchedule.find((s) => !s.isDayOff && s.freeHours >= 3);
    const earliestFreeDate = firstFreeSlot ? firstFreeSlot.dateStr : null;

    return {
      tailorId: staff.id,
      tailorName: staff.name,
      role: staff.role,
      phone: staff.phone,
      initials: staff.initials,
      activeOrdersCount: activeOrders.length,
      activeOrders,
      activeWorkloadHours,
      completedOrdersCount: completedOrders.length,
      completedOrders,
      completedHours,
      totalRevenueGenerated,
      completedRevenueGenerated,
      dailyCapacityHours: 8, // Standard 8h/day
      freeHoursToday,
      capacityStatus,
      upcomingSchedule,
      earliestFreeDate,
    };
  });
}

/**
 * Finds all workers available on a specific date and their remaining hours (out of 8h)
 */
export function getTailorAvailabilityOnDate(
  dateStr: string,
  tailors: StaffTailor[],
  orders: TailorOrder[],
  requiredHours = 3
) {
  const d = new Date(dateStr);
  const isSunday = d.getDay() === 0;

  if (isSunday) {
    return {
      isSunday: true,
      availableTailors: [],
      message: 'Sunday is a weekly shop holiday (0 working hours). Please pick Monday–Saturday.',
    };
  }

  const workerSummaries = calculateWorkerPerformances(tailors, orders);

  const availabilityList = workerSummaries.map((w) => {
    const slot = w.upcomingSchedule.find((s) => s.dateStr === dateStr);
    const freeHrs = slot ? slot.freeHours : 8;
    const bookedHrs = slot ? slot.bookedHours : 0;
    const canAccept = freeHrs >= requiredHours;

    return {
      tailorId: w.tailorId,
      tailorName: w.tailorName,
      role: w.role,
      freeHours: freeHrs,
      bookedHours: bookedHrs,
      canAccept,
      hasNoOrders: bookedHrs === 0,
    };
  });

  return {
    isSunday: false,
    availableTailors: availabilityList,
    message: `${availabilityList.filter((a) => a.canAccept).length} tailors available with sufficient time on this date.`,
  };
}

export function checkAndEnrichOrderOverdue(order: TailorOrder): TailorOrder {
  if (order.status === 'Completed' || order.status === 'Delivered' || order.isArchived) {
    return { ...order, isOverdue: false, daysOverdue: 0 };
  }

  const dueDateStr = order.dueDate || new Date().toISOString().split('T')[0];
  const dueTimeStr = order.dueTime || '18:00';
  const dueTimestamp = new Date(`${dueDateStr}T${dueTimeStr}`).getTime();
  const now = Date.now();

  if (dueTimestamp < now) {
    const diffMs = now - dueTimestamp;
    const daysOverdue = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return { ...order, isOverdue: true, daysOverdue };
  }

  return { ...order, isOverdue: false, daysOverdue: 0 };
}
