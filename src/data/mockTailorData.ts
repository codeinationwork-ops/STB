import { TailorOrder, TailorCustomer, StaffTailor, ShopProfile, RevenueAnalytics, MarketplaceProduct, InventoryItem } from '../types';

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

export const INITIAL_STAFF_TAILORS: StaffTailor[] = [];

export const INITIAL_CUSTOMERS: TailorCustomer[] = [];

export const INITIAL_ORDERS: TailorOrder[] = [];

export const INITIAL_MARKETPLACE_PRODUCTS: MarketplaceProduct[] = [];

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

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];


