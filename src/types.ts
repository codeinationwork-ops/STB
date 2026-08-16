export type GarmentCategory =
  | 'Formal Shirt'
  | 'Kurta Pajama'
  | 'Blouse'
  | 'Anarkali Suit'
  | 'Sherwani'
  | 'Lehenga'
  | 'Pant / Trouser'
  | 'Suit (Coat + Pant)'
  | 'Alterations'
  | 'Other';

export type OrderStatus =
  | 'New / Cutting'
  | 'Assigned'
  | 'Stitching in Progress'
  | 'Trial'
  | 'Completed'
  | 'Delivered';

export type PaymentMode = 'Cash' | 'UPI (Scan & Pay)' | 'Other (Card/Wallet)';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  type: 'Advance' | 'Balance' | 'Partial';
  mode: PaymentMode;
  note?: string;
}

export type MeasurementCategory = 'Upper Body' | 'Lower Body' | 'Sleeves' | 'Neck & Others';

export type GenderCategory = 'Male' | 'Female';

export interface MeasurementMap {
  // Upper Body
  chest?: string;
  shoulder?: string;
  frontLength?: string;
  backLength?: string;
  waist?: string;
  stomach?: string;
  hip?: string;
  armhole?: string;
  // Lower Body
  pantLength?: string;
  inseam?: string;
  thigh?: string;
  knee?: string;
  bottomHem?: string;
  // Sleeves & Neck
  neck?: string;
  bicep?: string;
  wrist?: string;
  sleeveLength?: string;
  // Others
  crossBack?: string;
  frontNeckDepth?: string;
  backNeckDepth?: string;
  customNotes?: string;
  [key: string]: string | undefined;
}

export interface TailorOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  isRepeatCustomer: boolean;
  garmentType: GarmentCategory | string;
  orderCategory?: 'New Stitch' | 'Alteration';
  subTypeStyle: string;
  genderCategory: GenderCategory;
  measurementMode: 'manual' | 'receipt';
  measurements: MeasurementMap;
  receiptImageUrl: string | null;
  referenceGarmentUrl?: string | null;
  specialNotes: string;
  voiceNoteUrl: string | null;
  voiceNoteDurationSec: number;
  fabricPhotos: string[];
  stitchedPhotos?: string[];
  deliveredDate?: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentMode: PaymentMode;
  paymentHistory: PaymentRecord[];
  status: OrderStatus;
  createdDate: string;
  createdTime: string;
  createdBy: string;
  dueDate: string;
  dueTime: string;
  assignedTailor: string;
  estimatedHours: number;
  offerMessage: string;
  isOverdue: boolean;
  daysOverdue: number;
  isArchived: boolean;
  updatedAt: string;
}

export interface TailorCustomer {
  id: string;
  name: string;
  phone: string;
  isRepeat: boolean;
  ordersCount: number;
  lastOrderDate: string;
  totalSpent: number;
  gender: GenderCategory;
  measurements: MeasurementMap;
  notes?: string;
  createdAt: string;
}

export interface StaffTailor {
  id: string;
  name: string;
  phone: string;
  role: 'Owner' | 'Tailor';
  initials: string;
  activeOrdersCount: number;
}

export interface ShopProfile {
  shopName: string;
  ownerName: string;
  phoneNumber: string;
  address: string;
  googleMapUrl?: string;
  upiId: string;
  upiQrCodeUrl: string;
  gpayPhonePeNumber: string;
  lastSyncedTimestamp: string;
}

export interface DailyRevenuePoint {
  date: string;
  dayLabel: string;
  advance: number;
  balance: number;
}

export interface TopServiceMetric {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface PaymentModeBreakdown {
  name: string;
  amount: number;
  percentage: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  advanceReceived: number;
  balanceReceived: number;
  ordersCompleted: number;
  revenueGrowthPercent: number;
  advanceGrowthPercent: number;
  balanceGrowthPercent: number;
  ordersGrowthCount: number;
  pendingCollections: number;
  pendingOrdersCount: number;
  dailyTrend: DailyRevenuePoint[];
  topServices: TopServiceMetric[];
  paymentModes: PaymentModeBreakdown[];
}

export interface UserSession {
  email: string;
  name: string;
  role: 'admin' | 'user';
  phone?: string;
  avatar?: string;
}

export interface AuthSessionState {
  isAuthenticated: boolean;
  phoneNumber: string;
  loginTimestamp: string;
  shopName?: string;
  ownerName?: string;
}

export type CRMTab = 'dashboard' | 'customers' | 'orders' | 'revenue' | 'more';
