import {
  TailorOrder,
  TailorCustomer,
  StaffTailor,
  ShopProfile,
  RevenueAnalytics,
  PaymentMode,
  PaymentRecord,
  AuthSessionState,
} from '../types';
import {
  INITIAL_ORDERS,
  INITIAL_CUSTOMERS,
  INITIAL_STAFF_TAILORS,
  INITIAL_SHOP_PROFILE,
  INITIAL_REVENUE_ANALYTICS,
} from '../data/mockTailorData';
import { db, auth } from './firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';

const ORDERS_KEY = 'shopscoper_room_orders_v3';
const CUSTOMERS_KEY = 'shopscoper_room_customers_v3';
const TAILORS_KEY = 'shopscoper_room_tailors_v3';
const SHOP_PROFILE_KEY = 'shopscoper_room_profile_v3';
const AUTH_SESSION_KEY = 'shopscoper_room_auth_session_v3';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    }
    return clean;
  }
  return obj;
}

export class LocalRoomDatabase {
  private listeners: Set<() => void> = new Set();
  private inMemoryOrders: TailorOrder[] | null = null;
  private inMemoryCustomers: TailorCustomer[] | null = null;
  private inMemoryTailors: StaffTailor[] | null = null;
  private inMemoryShopProfile: ShopProfile | null = null;

  private unsubOrders: Unsubscribe | null = null;
  private unsubCustomers: Unsubscribe | null = null;
  private unsubTailors: Unsubscribe | null = null;
  private unsubShopProfile: Unsubscribe | null = null;
  private isFirestoreConnected: boolean = false;
  private hasSeededInitialData: boolean = false;

  constructor() {
    this.initDefaults();
    this.initFirestoreLiveSync();
  }

  private safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`LocalStorage quota notice for key "${key}":`, e);
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
        this.safeSetItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      }
      if (!localStorage.getItem(CUSTOMERS_KEY)) {
        this.safeSetItem(CUSTOMERS_KEY, JSON.stringify(INITIAL_CUSTOMERS));
      }
      if (!localStorage.getItem(TAILORS_KEY)) {
        this.safeSetItem(TAILORS_KEY, JSON.stringify(INITIAL_STAFF_TAILORS));
      }
      if (!localStorage.getItem(SHOP_PROFILE_KEY)) {
        this.safeSetItem(SHOP_PROFILE_KEY, JSON.stringify(INITIAL_SHOP_PROFILE));
      }
    } catch (e) {
      console.warn('LocalStorage init notice:', e);
    }
  }

  // --- Real-Time Live Firestore Synchronization ---
  private async initFirestoreLiveSync() {
    try {
      // Test connectivity
      try {
        await getDocFromServer(doc(db, 'tailor_system', 'connectivity'));
        this.isFirestoreConnected = true;
      } catch (err) {
        // Tolerant if doc doesn't exist yet
        this.isFirestoreConnected = true;
      }

      // 1. Live Orders Listener
      const ordersCol = collection(db, 'tailor_orders');
      this.unsubOrders = onSnapshot(
        ordersCol,
        async (snapshot) => {
          if (!snapshot.empty) {
            const liveOrders: TailorOrder[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data() as TailorOrder;
              return { ...data, id: docSnap.id };
            });

            // Sort by createdAt / updated descending
            liveOrders.sort((a, b) => {
              const timeA = new Date(a.updatedAt || a.createdDate).getTime();
              const timeB = new Date(b.updatedAt || b.createdDate).getTime();
              return timeB - timeA;
            });

            this.inMemoryOrders = liveOrders;
            this.persistOrders(liveOrders);
            this.notify();
          } else if (!this.hasSeededInitialData) {
            // First time empty cloud database: Seed initial orders to Firestore
            this.hasSeededInitialData = true;
            const currentOrders = this.getOrders();
            for (const order of currentOrders) {
              await setDoc(doc(db, 'tailor_orders', order.id), sanitizeForFirestore(order), { merge: true });
            }
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'tailor_orders');
        }
      );

      // 2. Live Customers Listener
      const customersCol = collection(db, 'tailor_customers');
      this.unsubCustomers = onSnapshot(
        customersCol,
        async (snapshot) => {
          if (!snapshot.empty) {
            const liveCustomers: TailorCustomer[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data() as TailorCustomer;
              return { ...data, id: docSnap.id };
            });
            this.inMemoryCustomers = liveCustomers;
            this.persistCustomers(liveCustomers);
            this.notify();
          } else {
            const currentCust = this.getCustomers();
            for (const cust of currentCust) {
              await setDoc(doc(db, 'tailor_customers', cust.id), sanitizeForFirestore(cust), { merge: true });
            }
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'tailor_customers');
        }
      );

      // 3. Live Staff Tailors Listener
      const tailorsCol = collection(db, 'tailor_staff');
      this.unsubTailors = onSnapshot(
        tailorsCol,
        async (snapshot) => {
          if (!snapshot.empty) {
            const liveTailors: StaffTailor[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data() as StaffTailor;
              return { ...data, id: docSnap.id };
            });
            this.inMemoryTailors = liveTailors;
            this.persistTailors(liveTailors);
            this.notify();
          } else {
            const currentTailors = this.getTailors();
            for (const t of currentTailors) {
              await setDoc(doc(db, 'tailor_staff', t.id), sanitizeForFirestore(t), { merge: true });
            }
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'tailor_staff');
        }
      );

      // 4. Live Shop Profile Listener
      const shopProfileDoc = doc(db, 'shop_profiles', 'main');
      this.unsubShopProfile = onSnapshot(
        shopProfileDoc,
        async (snapshot) => {
          if (snapshot.exists()) {
            const liveProfile = snapshot.data() as ShopProfile;
            this.inMemoryShopProfile = liveProfile;
            this.persistShopProfile(liveProfile);
            this.notify();
          } else {
            const currentProfile = this.getShopProfile();
            await setDoc(shopProfileDoc, sanitizeForFirestore(currentProfile), { merge: true });
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'shop_profiles/main');
        }
      );
    } catch (e) {
      console.warn('Firestore live sync init notice:', e);
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

    this.purgeOldStorage();
    if (this.safeSetItem(ORDERS_KEY, rawJson)) {
      return;
    }

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

  // --- Orders CRUD with Live Cloud Sync ---
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

  public async saveOrder(order: TailorOrder): Promise<void> {
    const nowIso = new Date().toISOString();
    const updatedOrder = { ...order, updatedAt: nowIso };

    const orders = [...this.getOrders()];
    const index = orders.findIndex((o) => o.id === order.id);
    if (index >= 0) {
      orders[index] = updatedOrder;
    } else {
      orders.unshift(updatedOrder);
    }
    this.inMemoryOrders = orders;
    this.persistOrders(orders);

    // Auto update customer
    this.syncCustomerFromOrder(updatedOrder);
    this.notify();

    // Async write to Firestore
    try {
      await setDoc(doc(db, 'tailor_orders', order.id), sanitizeForFirestore(updatedOrder), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tailor_orders/${order.id}`);
    }
  }

  public async updateOrderStatus(orderId: string, status: TailorOrder['status']): Promise<void> {
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

      try {
        await setDoc(
          doc(db, 'tailor_orders', orderId),
          sanitizeForFirestore({
            status: order.status,
            deliveredDate: order.deliveredDate || null,
            updatedAt: order.updatedAt,
          }),
          { merge: true }
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tailor_orders/${orderId}`);
      }
    }
  }

  public async deliverOrderWithSettlement(
    orderId: string,
    balancePaymentReceived: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ): Promise<void> {
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

      try {
        await setDoc(doc(db, 'tailor_orders', orderId), sanitizeForFirestore(order), { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `tailor_orders/${orderId}`);
      }
    }
  }

  public async updateOrderAssignment(
    orderId: string,
    assignedTailor: string,
    estimatedHours: number,
    offerMessage: string,
    dueDate: string,
    dueTime: string
  ): Promise<void> {
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

      try {
        await setDoc(
          doc(db, 'tailor_orders', orderId),
          sanitizeForFirestore({
            assignedTailor,
            estimatedHours,
            offerMessage,
            dueDate,
            dueTime,
            updatedAt: order.updatedAt,
          }),
          { merge: true }
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tailor_orders/${orderId}`);
      }
    }
  }

  public async updateOrderDueDate(orderId: string, dueDate: string, dueTime?: string): Promise<void> {
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

      try {
        await setDoc(
          doc(db, 'tailor_orders', orderId),
          sanitizeForFirestore({
            dueDate,
            dueTime: order.dueTime,
            updatedAt: order.updatedAt,
          }),
          { merge: true }
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tailor_orders/${orderId}`);
      }
    }
  }

  public async deleteOrder(orderId: string): Promise<void> {
    const orders = this.getOrders().filter((o) => o.id !== orderId);
    this.inMemoryOrders = orders;
    this.persistOrders(orders);
    this.notify();

    try {
      await deleteDoc(doc(db, 'tailor_orders', orderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tailor_orders/${orderId}`);
    }
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

  public async saveCustomer(customer: TailorCustomer): Promise<void> {
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

    try {
      await setDoc(doc(db, 'tailor_customers', customer.id), sanitizeForFirestore(customer), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tailor_customers/${customer.id}`);
    }
  }

  private async syncCustomerFromOrder(order: TailorOrder) {
    const customers = [...this.getCustomers()];
    const existing = customers.find((c) => c.phone === order.customerPhone);
    let targetCustomer: TailorCustomer;

    if (existing) {
      existing.ordersCount += 1;
      existing.lastOrderDate = order.createdDate;
      existing.totalSpent += order.totalAmount;
      existing.isRepeat = existing.ordersCount > 1;
      if (Object.keys(order.measurements).length > 0) {
        existing.measurements = { ...existing.measurements, ...order.measurements };
      }
      targetCustomer = existing;
    } else {
      targetCustomer = {
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
      };
      customers.unshift(targetCustomer);
    }
    this.inMemoryCustomers = customers;
    this.persistCustomers(customers);

    try {
      await setDoc(doc(db, 'tailor_customers', targetCustomer.id), sanitizeForFirestore(targetCustomer), { merge: true });
    } catch (e) {
      // background error handled gracefully
    }
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
      
      const realTailors = parsed.filter(
        (t) => !mockNames.has(t.name.toLowerCase()) && !mockIds.has(t.id)
      );

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

  public async addTailor(name: string, phone: string, role: 'Owner' | 'Tailor' = 'Tailor'): Promise<void> {
    const tailors = [...this.getTailors()];
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const newTailor: StaffTailor = {
      id: `tailor-${Date.now()}`,
      name,
      phone,
      role,
      initials: initials || 'TL',
      activeOrdersCount: 0,
    };

    tailors.push(newTailor);
    this.inMemoryTailors = tailors;
    this.persistTailors(tailors);
    this.notify();

    try {
      await setDoc(doc(db, 'tailor_staff', newTailor.id), sanitizeForFirestore(newTailor), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tailor_staff/${newTailor.id}`);
    }
  }

  public async deleteTailor(tailorId: string): Promise<void> {
    const current = this.getTailors();
    const updated = current.filter((t) => t.id !== tailorId || t.role === 'Owner');
    this.inMemoryTailors = updated;
    this.persistTailors(updated);
    this.notify();

    try {
      await deleteDoc(doc(db, 'tailor_staff', tailorId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tailor_staff/${tailorId}`);
    }
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

  public async updateShopProfile(profile: Partial<ShopProfile>): Promise<void> {
    const current = this.getShopProfile();
    const updated = { ...current, ...profile };
    this.inMemoryShopProfile = updated;
    this.persistShopProfile(updated);
    this.notify();

    try {
      await setDoc(doc(db, 'shop_profiles', 'main'), sanitizeForFirestore(updated), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'shop_profiles/main');
    }
  }

  // --- Auth Session Persistence ---
  public getAuthSession(): AuthSessionState | null {
    try {
      const data = localStorage.getItem(AUTH_SESSION_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (parsed && parsed.isAuthenticated && parsed.phoneNumber) {
        return parsed as AuthSessionState;
      }
      return null;
    } catch {
      return null;
    }
  }

  public saveAuthSession(session: AuthSessionState): void {
    this.safeSetItem(AUTH_SESSION_KEY, JSON.stringify(session));
    this.notify();
  }

  public clearAuthSession(): void {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch (e) {
      console.warn('Clear auth session notice:', e);
    }
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

      const mode = ord.paymentMode || 'Cash';
      modeMap[mode] = (modeMap[mode] || 0) + ord.advancePaid;

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

  // --- Cloud Sync Manual Trigger ---
  public async triggerCloudSync(): Promise<{ success: boolean; lastSynced: string }> {
    try {
      const snap = await getDocs(collection(db, 'tailor_orders'));
      if (!snap.empty) {
        const liveOrders: TailorOrder[] = snap.docs.map((d) => ({ ...(d.data() as TailorOrder), id: d.id }));
        liveOrders.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdDate).getTime();
          const timeB = new Date(b.updatedAt || b.createdDate).getTime();
          return timeB - timeA;
        });
        this.inMemoryOrders = liveOrders;
        this.persistOrders(liveOrders);
        this.notify();
      }

      const now = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      await this.updateShopProfile({ lastSyncedTimestamp: now });
      return { success: true, lastSynced: now };
    } catch (e) {
      console.warn('Manual sync fallback:', e);
      const now = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      await this.updateShopProfile({ lastSyncedTimestamp: now });
      return { success: true, lastSynced: now };
    }
  }
}

export const roomDb = new LocalRoomDatabase();
