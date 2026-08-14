import {
  TailorOrder,
  TailorCustomer,
  StaffTailor,
  ShopProfile,
  RevenueAnalytics,
  PaymentMode,
  PaymentRecord,
} from '../types';
import {
  INITIAL_ORDERS,
  INITIAL_CUSTOMERS,
  INITIAL_STAFF_TAILORS,
  INITIAL_SHOP_PROFILE,
  INITIAL_REVENUE_ANALYTICS,
} from '../data/mockTailorData';

const ORDERS_KEY = 'shopscoper_room_orders_v3';
const CUSTOMERS_KEY = 'shopscoper_room_customers_v3';
const TAILORS_KEY = 'shopscoper_room_tailors_v3';
const SHOP_PROFILE_KEY = 'shopscoper_room_profile_v3';
const SYNC_STATE_KEY = 'shopscoper_room_sync_v3';

export class LocalRoomDatabase {
  private listeners: Set<() => void> = new Set();
  private inMemoryOrders: TailorOrder[] | null = null;
  private inMemoryCustomers: TailorCustomer[] | null = null;
  private inMemoryTailors: StaffTailor[] | null = null;
  private inMemoryShopProfile: ShopProfile | null = null;

  constructor() {
    this.initDefaults();
  }

  private safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`LocalStorage quota exceeded notice for key "${key}":`, e);
      return false;
    }
  }

  private purgeOldStorage() {
    try {
      const keysToPurge = [
        'shopscoper_room_orders_v1', 'shopscoper_room_customers_v1', 'shopscoper_room_tailors_v1', 'shopscoper_room_profile_v1', 'shopscoper_room_sync_v1',
        'shopscoper_room_orders_v2', 'shopscoper_room_customers_v2', 'shopscoper_room_tailors_v2', 'shopscoper_room_profile_v2', 'shopscoper_room_sync_v2'
      ];
      keysToPurge.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Purge notice:', e);
    }
  }

  private initDefaults() {
    this.purgeOldStorage();
    try {
      if (!localStorage.getItem(ORDERS_KEY)) {
        this.safeSetItem(ORDERS_KEY, JSON.stringify([]));
      }
      if (!localStorage.getItem(CUSTOMERS_KEY)) {
        this.safeSetItem(CUSTOMERS_KEY, JSON.stringify([]));
      }
      if (!localStorage.getItem(TAILORS_KEY)) {
        this.safeSetItem(TAILORS_KEY, JSON.stringify([]));
      }
      if (!localStorage.getItem(SHOP_PROFILE_KEY)) {
        this.safeSetItem(SHOP_PROFILE_KEY, JSON.stringify(INITIAL_SHOP_PROFILE));
      }
    } catch (e) {
      console.warn('LocalStorage init notice:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Safe Persistence Methods ---
  private persistOrders(orders: TailorOrder[]): void {
    const rawJson = JSON.stringify(orders);
    if (this.safeSetItem(ORDERS_KEY, rawJson)) {
      return;
    }

    // Tier 1: Purge old versions
    this.purgeOldStorage();
    if (this.safeSetItem(ORDERS_KEY, rawJson)) {
      return;
    }

    // Tier 2: Trim heavy base64 strings (audio / images)
    const trimmedOrders = orders.map((o) => {
      const item = { ...o };
      if (item.voiceNoteUrl && item.voiceNoteUrl.length > 50000) {
        item.voiceNoteUrl = 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg';
      }
      if (item.receiptImageUrl && item.receiptImageUrl.length > 50000) {
        item.receiptImageUrl = null;
      }
      if (item.referenceGarmentUrl && item.referenceGarmentUrl.length > 50000) {
        item.referenceGarmentUrl = null;
      }
      if (item.fabricPhotos && item.fabricPhotos.some((p) => p.length > 50000)) {
        item.fabricPhotos = item.fabricPhotos.filter((p) => p.length <= 50000);
      }
      return item;
    });

    if (this.safeSetItem(ORDERS_KEY, JSON.stringify(trimmedOrders))) {
      return;
    }

    // Tier 3: Store only top 30 recent orders in localStorage
    const recentOrders = trimmedOrders.slice(0, 30);
    this.safeSetItem(ORDERS_KEY, JSON.stringify(recentOrders));
  }

  private persistCustomers(customers: TailorCustomer[]): void {
    const rawJson = JSON.stringify(customers);
    if (this.safeSetItem(CUSTOMERS_KEY, rawJson)) {
      return;
    }
    this.purgeOldStorage();
    if (this.safeSetItem(CUSTOMERS_KEY, rawJson)) {
      return;
    }
    const recent = customers.slice(0, 50);
    this.safeSetItem(CUSTOMERS_KEY, JSON.stringify(recent));
  }

  private persistTailors(tailors: StaffTailor[]): void {
    this.safeSetItem(TAILORS_KEY, JSON.stringify(tailors));
  }

  private persistShopProfile(profile: ShopProfile): void {
    this.safeSetItem(SHOP_PROFILE_KEY, JSON.stringify(profile));
  }

  // --- Orders CRUD ---
  public getOrders(): TailorOrder[] {
    if (this.inMemoryOrders !== null) {
      return this.inMemoryOrders;
    }
    try {
      const data = localStorage.getItem(ORDERS_KEY);
      this.inMemoryOrders = data ? JSON.parse(data) : INITIAL_ORDERS;
    } catch {
      this.inMemoryOrders = INITIAL_ORDERS;
    }
    return this.inMemoryOrders || INITIAL_ORDERS;
  }

  public saveOrder(order: TailorOrder): void {
    const orders = [...this.getOrders()];
    const index = orders.findIndex((o) => o.id === order.id);
    if (index >= 0) {
      orders[index] = { ...order, updatedAt: new Date().toISOString() };
    } else {
      orders.unshift({ ...order, updatedAt: new Date().toISOString() });
    }
    this.inMemoryOrders = orders;
    this.persistOrders(orders);

    // Also auto update or create customer history
    this.syncCustomerFromOrder(order);
    this.notify();
  }

  public updateOrderStatus(orderId: string, status: TailorOrder['status']): void {
    const orders = [...this.getOrders()];
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      if (status === 'Delivered' && !order.deliveredDate) {
        order.deliveredDate = new Date().toISOString().split('T')[0];
      }
      this.inMemoryOrders = orders;
      this.persistOrders(orders);
      this.notify();
    }
  }

  public deliverOrderWithSettlement(
    orderId: string,
    balancePaymentReceived: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ): void {
    const orders = [...this.getOrders()];
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'Delivered';
      order.deliveredDate = new Date().toISOString().split('T')[0];
      if (stitchedPhotos && stitchedPhotos.length > 0) {
        order.stitchedPhotos = Array.from(new Set([...(order.stitchedPhotos || []), ...stitchedPhotos]));
      }
      if (balancePaymentReceived > 0) {
        const payRecord: PaymentRecord = {
          id: `pay-${Date.now()}`,
          date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          amount: balancePaymentReceived,
          type: balancePaymentReceived >= order.balanceDue ? 'Balance' : 'Partial',
          mode: paymentMode,
          note: notes || 'Settlement at delivery',
        };
        order.paymentHistory = [payRecord, ...(order.paymentHistory || [])];
        order.advancePaid = (order.advancePaid || 0) + balancePaymentReceived;
        order.balanceDue = Math.max(0, order.totalAmount - order.advancePaid);
      }
      order.updatedAt = new Date().toISOString();
      this.inMemoryOrders = orders;
      this.persistOrders(orders);
      this.syncCustomerFromOrder(order);
      this.notify();
    }
  }

  public updateOrderAssignment(orderId: string, assignedTailor: string, estimatedHours: number, offerMessage: string, dueDate: string, dueTime: string): void {
    const orders = [...this.getOrders()];
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.assignedTailor = assignedTailor;
      order.estimatedHours = estimatedHours;
      order.offerMessage = offerMessage;
      order.dueDate = dueDate;
      order.dueTime = dueTime;
      order.updatedAt = new Date().toISOString();
      this.inMemoryOrders = orders;
      this.persistOrders(orders);
      this.notify();
    }
  }

  public updateOrderDueDate(orderId: string, dueDate: string, dueTime?: string): void {
    const orders = [...this.getOrders()];
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.dueDate = dueDate;
      if (dueTime) {
        order.dueTime = dueTime;
      }
      order.updatedAt = new Date().toISOString();
      this.inMemoryOrders = orders;
      this.persistOrders(orders);
      this.notify();
    }
  }

  public deleteOrder(orderId: string): void {
    const orders = this.getOrders().filter((o) => o.id !== orderId);
    this.inMemoryOrders = orders;
    this.persistOrders(orders);
    this.notify();
  }

  // --- Customers CRUD ---
  public getCustomers(): TailorCustomer[] {
    if (this.inMemoryCustomers !== null) {
      return this.inMemoryCustomers;
    }
    try {
      const data = localStorage.getItem(CUSTOMERS_KEY);
      this.inMemoryCustomers = data ? JSON.parse(data) : INITIAL_CUSTOMERS;
    } catch {
      this.inMemoryCustomers = INITIAL_CUSTOMERS;
    }
    return this.inMemoryCustomers || INITIAL_CUSTOMERS;
  }

  public saveCustomer(customer: TailorCustomer): void {
    const customers = [...this.getCustomers()];
    const index = customers.findIndex((c) => c.phone === customer.phone || c.id === customer.id);
    if (index >= 0) {
      customers[index] = customer;
    } else {
      customers.unshift(customer);
    }
    this.inMemoryCustomers = customers;
    this.persistCustomers(customers);
    this.notify();
  }

  private syncCustomerFromOrder(order: TailorOrder) {
    const customers = [...this.getCustomers()];
    const existing = customers.find((c) => c.phone === order.customerPhone);
    if (existing) {
      existing.ordersCount += 1;
      existing.lastOrderDate = order.createdDate;
      existing.totalSpent += order.totalAmount;
      existing.isRepeat = existing.ordersCount > 1;
      if (Object.keys(order.measurements).length > 0) {
        existing.measurements = { ...existing.measurements, ...order.measurements };
      }
    } else {
      customers.unshift({
        id: `cust-${Date.now()}`,
        name: order.customerName || 'Customer',
        phone: order.customerPhone,
        isRepeat: false,
        ordersCount: 1,
        lastOrderDate: order.createdDate,
        totalSpent: order.totalAmount,
        gender: order.genderCategory,
        measurements: order.measurements,
        createdAt: new Date().toISOString(),
      });
    }
    this.inMemoryCustomers = customers;
    this.persistCustomers(customers);
  }

  // --- Staff Tailors CRUD ---
  public getTailors(): StaffTailor[] {
    if (this.inMemoryTailors !== null) {
      return this.inMemoryTailors;
    }
    const mockNames = new Set(['master ramesh', 'rafiq bhai', 'suresh kumar', 'mohan lal']);
    const mockIds = new Set(['tailor-1', 'tailor-2', 'tailor-3', 'tailor-4', 't1', 't2', 't3', 't4']);

    try {
      const data = localStorage.getItem(TAILORS_KEY);
      const parsed: StaffTailor[] = data ? JSON.parse(data) : [];
      
      // Filter out any mock dummy tailors from existing local storage
      const realTailors = parsed.filter(
        (t) => !mockNames.has(t.name.toLowerCase()) && !mockIds.has(t.id)
      );

      // Ensure Self (Owner) is present
      if (!realTailors.some((t) => t.role === 'Owner' || t.name === 'Self (Owner)')) {
        realTailors.unshift({
          id: 'tailor-owner',
          name: 'Self (Owner)',
          phone: '',
          role: 'Owner',
          initials: 'SO',
          activeOrdersCount: 0,
        });
      }

      this.inMemoryTailors = realTailors;
      this.persistTailors(realTailors);
    } catch {
      this.inMemoryTailors = INITIAL_STAFF_TAILORS;
    }
    return this.inMemoryTailors || INITIAL_STAFF_TAILORS;
  }

  public addTailor(name: string, phone: string, role: 'Owner' | 'Tailor' = 'Tailor'): void {
    const tailors = [...this.getTailors()];
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    tailors.push({
      id: `tailor-${Date.now()}`,
      name,
      phone,
      role,
      initials: initials || 'TL',
      activeOrdersCount: 0,
    });
    this.inMemoryTailors = tailors;
    this.persistTailors(tailors);
    this.notify();
  }

  public deleteTailor(tailorId: string): void {
    const current = this.getTailors();
    // Do not delete Self (Owner)
    const updated = current.filter((t) => t.id !== tailorId || t.role === 'Owner');
    this.inMemoryTailors = updated;
    this.persistTailors(updated);
    this.notify();
  }

  // --- Shop Profile CRUD ---
  public getShopProfile(): ShopProfile {
    if (this.inMemoryShopProfile !== null) {
      return this.inMemoryShopProfile;
    }
    try {
      const data = localStorage.getItem(SHOP_PROFILE_KEY);
      this.inMemoryShopProfile = data ? JSON.parse(data) : INITIAL_SHOP_PROFILE;
    } catch {
      this.inMemoryShopProfile = INITIAL_SHOP_PROFILE;
    }
    return this.inMemoryShopProfile || INITIAL_SHOP_PROFILE;
  }

  public updateShopProfile(profile: Partial<ShopProfile>): void {
    const current = this.getShopProfile();
    const updated = { ...current, ...profile };
    this.inMemoryShopProfile = updated;
    this.persistShopProfile(updated);
    this.notify();
  }

  // --- Revenue Analytics Calculation ---
  public getRevenueAnalytics(): RevenueAnalytics {
    const orders = this.getOrders();
    let totalRev = 0;
    let advanceTotal = 0;
    let balanceTotal = 0;
    let completedCount = 0;
    let pendingCol = 0;
    let pendingCount = 0;

    const serviceMap: { [key: string]: { count: number; revenue: number } } = {};
    const modeMap: { [key: string]: number } = {
      Cash: 0,
      'UPI (Scan & Pay)': 0,
      'Other (Card/Wallet)': 0,
    };

    orders.forEach((ord) => {
      totalRev += ord.totalAmount;
      advanceTotal += ord.advancePaid;
      balanceTotal += ord.totalAmount - ord.advancePaid;
      if (ord.status === 'Completed' || ord.status === 'Delivered') {
        completedCount++;
      } else {
        pendingCol += ord.balanceDue;
        pendingCount++;
      }

      // Modes
      const mode = ord.paymentMode || 'Cash';
      modeMap[mode] = (modeMap[mode] || 0) + ord.advancePaid;

      // Services
      const svc = ord.garmentType || 'Other';
      if (!serviceMap[svc]) serviceMap[svc] = { count: 0, revenue: 0 };
      serviceMap[svc].count += 1;
      serviceMap[svc].revenue += ord.totalAmount;
    });

    const topServices = Object.entries(serviceMap).map(([name, val]) => ({
      name,
      count: val.count,
      revenue: val.revenue,
      percentage: totalRev > 0 ? Number(((val.revenue / totalRev) * 100).toFixed(1)) : 0,
    }));
    topServices.sort((a, b) => b.revenue - a.revenue);

    const paymentModes = Object.entries(modeMap).map(([name, amount]) => ({
      name,
      amount,
      percentage: advanceTotal > 0 ? Number(((amount / advanceTotal) * 100).toFixed(1)) : 0,
    }));

    return {
      ...INITIAL_REVENUE_ANALYTICS,
      totalRevenue: totalRev,
      advanceReceived: advanceTotal,
      balanceReceived: balanceTotal,
      ordersCompleted: completedCount,
      pendingCollections: pendingCol,
      pendingOrdersCount: pendingCount,
      topServices: topServices.length > 0 ? topServices : INITIAL_REVENUE_ANALYTICS.topServices,
      paymentModes: paymentModes.length > 0 ? paymentModes : INITIAL_REVENUE_ANALYTICS.paymentModes,
    };
  }

  // --- Cloud Sync Simulator ---
  public async triggerCloudSync(): Promise<{ success: boolean; lastSynced: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        this.updateShopProfile({ lastSyncedTimestamp: now });
        resolve({ success: true, lastSynced: now });
      }, 1200);
    });
  }
}

export const roomDb = new LocalRoomDatabase();
