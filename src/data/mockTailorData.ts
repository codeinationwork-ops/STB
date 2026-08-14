import { TailorOrder, TailorCustomer, StaffTailor, ShopProfile, RevenueAnalytics } from '../types';

export const INITIAL_SHOP_PROFILE: ShopProfile = {
  shopName: '',
  ownerName: '',
  phoneNumber: '',
  address: '',
  upiId: '',
  upiQrCodeUrl: '',
  gpayPhonePeNumber: '',
  lastSyncedTimestamp: '',
};

export const INITIAL_STAFF_TAILORS: StaffTailor[] = [
  { id: 'tailor-owner', name: 'Self (Owner)', phone: '', role: 'Owner', initials: 'SO', activeOrdersCount: 0 },
];

export const INITIAL_CUSTOMERS: TailorCustomer[] = [];

export const INITIAL_ORDERS: TailorOrder[] = [];

export const INITIAL_REVENUE_ANALYTICS: RevenueAnalytics = {
  totalRevenue: 0,
  advanceReceived: 0,
  balanceReceived: 0,
  ordersCompleted: 0,
  revenueGrowthPercent: 0,
  advanceGrowthPercent: 0,
  balanceGrowthPercent: 0,
  ordersGrowthCount: 0,
  pendingCollections: 0,
  pendingOrdersCount: 0,
  dailyTrend: [],
  topServices: [],
  paymentModes: [],
};
