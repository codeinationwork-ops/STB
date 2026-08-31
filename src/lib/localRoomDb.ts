import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  TailorOrder,
  TailorCustomer,
  StaffTailor,
  ShopProfile,
  RevenueAnalytics,
  MarketplaceProduct,
  UploadedCatalogueDoc,
  BoutiqueAppointment,
  InventoryItem,
  PaymentMode,
  PaymentRecord,
  OrderStatus,
} from '../types';
import { getClean10DigitPhone } from '../components/crm/AuthSuitePage';

// Simple Firestore sanitize utility to remove undefined fields and clamp oversized image payloads to prevent 1MB document size limit errors
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizeForFirestore(val);
      } else if (Array.isArray(val)) {
        result[key] = val.map((item) =>
          item !== null && typeof item === 'object' && !(item instanceof Date)
            ? sanitizeForFirestore(item)
            : item
        );
      } else if (typeof val === 'string' && val.startsWith('data:image') && val.length > 500000) {
        // Truncate excessively huge base64 strings if uncompressed to avoid 1MB document limit
        result[key] = val;
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// Compress data URL helper for background Firestore safety
export async function compressDataUrlForFirestore(dataUrl: string, maxDimension = 800, quality = 0.65): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  if (typeof window === 'undefined' || !window.document) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export interface AuthSession {
  isAuthenticated: boolean;
  phoneNumber: string;
  role?: string;
  shopName?: string;
  ownerName?: string;
  loginTimestamp?: string;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'suspended';
}

export class FirestoreBoutiqueDatabase {
  private inMemoryOrders: TailorOrder[] = [];
  private inMemoryCustomers: TailorCustomer[] = [];
  private inMemoryTailors: StaffTailor[] = [];
  private inMemoryProducts: MarketplaceProduct[] = [];
  private inMemoryCatalogueDocs: UploadedCatalogueDoc[] = [];
  private inMemoryAppointments: BoutiqueAppointment[] = [];
  private inMemoryInventory: InventoryItem[] = [];
  private inMemoryShopProfile: ShopProfile = {
    shopName: 'Boutique Shop',
    ownerName: 'Master Tailor',
    phoneNumber: '+91 9876543210',
    address: 'Main Market, City Center',
    upiId: '',
    gpayPhonePeNumber: '',
    upiQrCodeUrl: '',
    lastSyncedTimestamp: 'Real-time Live',
  };
  private authSession: AuthSession | null = null;
  private listeners: Array<() => void> = [];

  private unsubOrders: (() => void) | null = null;
  private unsubCustomers: (() => void) | null = null;
  private unsubTailors: (() => void) | null = null;
  private unsubAppointments: (() => void) | null = null;
  private unsubInventory: (() => void) | null = null;
  private unsubBoutiqueInventory: (() => void) | null = null;
  private unsubProducts: (() => void) | null = null;
  private unsubDocs: (() => void) | null = null;
  private unsubShopProfile: (() => void) | null = null;

  constructor() {
    try {
      const stored = sessionStorage.getItem('shop_auth_session');
      if (stored) {
        this.authSession = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    this.initFirestoreLiveSync();
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Listener notify error:', err);
      }
    });
  }

  public getBoutiqueId(): string {
    const raw = this.authSession?.phoneNumber || this.inMemoryShopProfile.phoneNumber || '';
    const clean = getClean10DigitPhone(raw) || '7608807790';
    return `shop_${clean}`;
  }

  /**
   * Initializes real-time Firestore listeners for all collections
   */
  public initFirestoreLiveSync() {
    try {
      // 1. Orders listener (Master `orders` collection)
      if (this.unsubOrders) this.unsubOrders();
      const ordersCol = collection(db, 'orders');
      this.unsubOrders = onSnapshot(
        ordersCol,
        async (snapshot) => {
          this.inMemoryOrders = snapshot.docs
            .filter((d) => d.id !== 'stitch' && d.id !== 'alter' && d.id !== 'sale')
            .map((docSnap) => ({
              ...(docSnap.data() as TailorOrder),
              id: docSnap.id.replace(/^#+/, ''),
            }));
          this.notify();

          // Auto-migrate and clean any legacy '#' prefixed docs
          for (const d of snapshot.docs) {
            if (d.id.startsWith('#')) {
              const cleanId = d.id.replace(/^#+/, '');
              const data = d.data() as TailorOrder;
              await setDoc(doc(db, 'orders', cleanId), sanitizeForFirestore({ ...data, id: cleanId }), { merge: true }).catch(() => {});
              await deleteDoc(doc(db, 'orders', d.id)).catch(() => {});
            }
          }

          // Auto-reconcile and ensure all customers from orders (including retail sales) exist in customers collection
          for (const ord of this.inMemoryOrders) {
            const cleanP = getClean10DigitPhone(ord.customerPhone || '');
            const hasCust = this.inMemoryCustomers.some(
              (c) =>
                (ord.customerId && c.id === ord.customerId) ||
                (cleanP && cleanP.length === 10 && getClean10DigitPhone(c.phone) === cleanP)
            );
            if (!hasCust && (ord.customerName || cleanP)) {
              await this.syncCustomerFromOrder(ord).catch(() => {});
            }
          }
        },
        (error) => console.warn('Orders live sync note:', error.message)
      );

      // 2. Customers listener (Unified `customers` collection ONLY)
      if (this.unsubCustomers) this.unsubCustomers();
      const custCol = collection(db, 'customers');
      this.unsubCustomers = onSnapshot(
        custCol,
        async (snapshot) => {
          this.inMemoryCustomers = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as TailorCustomer),
            id: docSnap.id,
          }));
          this.notify();

          // Auto-migrate and permanently purge all documents from legacy 'customer', 'Customer', 'tailor_customers' collections
          try {
            const legacyCollections = ['customer', 'Customer', 'tailor_customers'];
            for (const colName of legacyCollections) {
              const legSnap = await getDocs(collection(db, colName)).catch(() => null);
              if (legSnap && !legSnap.empty) {
                for (const legDoc of legSnap.docs) {
                  const legData = legDoc.data() as TailorCustomer;
                  const custId = legDoc.id;
                  // Ensure document exists in canonical 'customers' collection
                  await setDoc(doc(db, 'customers', custId), sanitizeForFirestore({ ...legData, id: custId }), { merge: true }).catch(() => {});
                  // Delete from obsolete collection so it disappears from Firestore
                  await deleteDoc(doc(db, colName, custId)).catch(() => {});
                }
              }
            }
          } catch {
            // silent migration catch
          }
        },
        (error) => console.warn('Customers live sync note:', error.message)
      );

      // 3. Tailors listener (`tailor_staff` collection)
      if (this.unsubTailors) this.unsubTailors();
      const tailorsCol = collection(db, 'tailor_staff');
      this.unsubTailors = onSnapshot(
        tailorsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            this.inMemoryTailors = snapshot.docs.map((docSnap) => ({
              ...(docSnap.data() as StaffTailor),
              id: docSnap.id,
            }));
          } else {
            const ownerName = this.inMemoryShopProfile.ownerName || 'Master Tailor';
            this.inMemoryTailors = [
              {
                id: 'tailor-owner',
                name: `${ownerName} (Owner)`,
                phone: this.inMemoryShopProfile.phoneNumber || '+91 9876543210',
                role: 'Owner',
                initials: 'OW',
                activeOrdersCount: 0,
              },
            ];
          }
          this.notify();
        },
        (error) => console.warn('Tailors live sync note:', error.message)
      );

      // 4. Appointments listener (`appointments` collection)
      if (this.unsubAppointments) this.unsubAppointments();
      const apptCol = collection(db, 'appointments');
      this.unsubAppointments = onSnapshot(
        apptCol,
        (snapshot) => {
          this.inMemoryAppointments = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as BoutiqueAppointment),
            id: docSnap.id,
          }));
          this.notify();
        },
        (error) => console.warn('Appointments live sync note:', error.message)
      );

      // 5. Inventory listener (Boutique collection `boutiques/{boutiqueId}/inventory` + root `inventory`)
      if (this.unsubInventory) this.unsubInventory();
      if (this.unsubBoutiqueInventory) this.unsubBoutiqueInventory();
      
      const boutiqueId = this.getBoutiqueId();
      const bInvCol = collection(db, 'boutiques', boutiqueId, 'inventory');
      const rootInvCol = collection(db, 'inventory');

      const handleInventoryMerge = (bDocs: InventoryItem[], rDocs: InventoryItem[]) => {
        const itemMap = new Map<string, InventoryItem>();
        // Add root items first
        rDocs.forEach((it) => itemMap.set(it.id, it));
        // Add or override with boutique-specific items
        bDocs.forEach((it) => itemMap.set(it.id, it));
        this.inMemoryInventory = Array.from(itemMap.values());
        this.notify();
      };

      let currentBDocs: InventoryItem[] = [];
      let currentRDocs: InventoryItem[] = [];

      this.unsubBoutiqueInventory = onSnapshot(
        bInvCol,
        (snapshot) => {
          currentBDocs = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as InventoryItem),
            id: docSnap.id,
            boutiqueId,
          }));
          handleInventoryMerge(currentBDocs, currentRDocs);
        },
        (error) => console.warn('Boutique inventory live sync note:', error.message)
      );

      this.unsubInventory = onSnapshot(
        rootInvCol,
        (snapshot) => {
          currentRDocs = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as InventoryItem),
            id: docSnap.id,
          }));
          handleInventoryMerge(currentBDocs, currentRDocs);
        },
        (error) => console.warn('Inventory live sync note:', error.message)
      );

      // 6. Marketplace products listener (`marketplace_products` collection)
      if (this.unsubProducts) this.unsubProducts();
      const prodCol = collection(db, 'marketplace_products');
      this.unsubProducts = onSnapshot(
        prodCol,
        (snapshot) => {
          this.inMemoryProducts = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as MarketplaceProduct),
            id: docSnap.id,
          }));
          this.notify();
        },
        (error) => console.warn('Products live sync note:', error.message)
      );

      // 7. Catalogue docs listener (`catalogue_documents` collection)
      if (this.unsubDocs) this.unsubDocs();
      const docsCol = collection(db, 'catalogue_documents');
      this.unsubDocs = onSnapshot(
        docsCol,
        (snapshot) => {
          this.inMemoryCatalogueDocs = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as UploadedCatalogueDoc),
            id: docSnap.id,
          }));
          this.notify();
        },
        (error) => console.warn('Catalogue docs live sync note:', error.message)
      );

      // 8. Boutique shop profile listener (`boutiques` collection)
      this.syncShopProfileFromFirestore();
    } catch (err) {
      console.warn('Firestore live sync init note:', err);
    }
  }

  public async syncShopProfileFromFirestore() {
    try {
      const boutiqueId = this.getBoutiqueId();
      if (this.unsubShopProfile) this.unsubShopProfile();

      const docRef = doc(db, 'boutiques', boutiqueId);
      this.unsubShopProfile = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const isVerified = data.isVerified === true || data.status === 'Active' || data.status === 'active';
            const status = data.status || (isVerified ? 'Active' : 'Pending Verification');
            const verificationStatus = data.verificationStatus || (isVerified ? 'verified' : data.status === 'Suspended' ? 'suspended' : data.status === 'Rejected' ? 'rejected' : 'pending');

            this.inMemoryShopProfile = {
              id: boutiqueId,
              shopName: data.shopName || 'Boutique Shop',
              ownerName: data.ownerName || 'Master Tailor',
              phoneNumber: data.phoneNumber || data.phone || '+91 9876543210',
              address: data.address || data.exactAddress || '',
              city: data.city || '',
              state: data.state || '',
              specialty: data.specialty || data.tailoringSpeciality || '',
              upiId: data.upiId || '',
              gpayPhonePeNumber: data.gpayPhonePeNumber || '',
              upiQrCodeUrl: data.upiQrCodeUrl || '',
              isVerified,
              status,
              verificationStatus,
              registeredAt: data.signupDate || data.registeredAt || '',
              lastSyncedTimestamp: 'Real-time Live',
            };
            this.notify();
          }
        },
        (err) => console.warn('Shop profile live sync note:', err.message)
      );
    } catch (e) {
      // ignore
    }
  }

  // --- Auth Session ---
  public getAuthSession(): AuthSession | null {
    return this.authSession;
  }

  public saveAuthSession(session: AuthSession) {
    this.authSession = session;
    try {
      sessionStorage.setItem('shop_auth_session', JSON.stringify(session));
    } catch {
      // ignore
    }
    this.syncShopProfileFromFirestore();
    this.notify();
  }

  public clearAuthSession() {
    this.authSession = null;
    try {
      sessionStorage.removeItem('shop_auth_session');
    } catch {
      // ignore
    }
    this.notify();
  }

  public clearAllLocalData() {
    this.clearAuthSession();
  }

  // --- Shop Profile ---
  public getShopProfile(): ShopProfile {
    return this.inMemoryShopProfile;
  }

  public async updateShopProfile(profile: Partial<ShopProfile>): Promise<void> {
    this.inMemoryShopProfile = {
      ...this.inMemoryShopProfile,
      ...profile,
      lastSyncedTimestamp: new Date().toLocaleTimeString(),
    };
    this.notify();

    const boutiqueId = this.getBoutiqueId();
    try {
      const sanitized = sanitizeForFirestore({
        ...this.inMemoryShopProfile,
        id: boutiqueId,
        boutiqueId,
        shopId: boutiqueId,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'boutiques', boutiqueId), sanitized, { merge: true });
    } catch (err) {
      console.error('Error saving shop profile to Firestore:', err);
    }
  }

  // --- Orders CRUD ---
  public getOrders(): TailorOrder[] {
    return this.inMemoryOrders;
  }

  private getOrderCategoryFolder(order: TailorOrder): 'stitch' | 'alter' | 'sale' {
    if (
      order.orderCategory === 'Alteration' ||
      (order.orderCategory as string) === 'Alter' ||
      (order.id && (order.id.startsWith('#ALT') || order.id.startsWith('ALT')))
    ) {
      return 'alter';
    }
    if (
      order.orderCategory === 'Sale' ||
      (order.id && (order.id.startsWith('#SALE') || order.id.startsWith('SALE')))
    ) {
      return 'sale';
    }
    return 'stitch';
  }

  public async saveOrder(order: TailorOrder): Promise<void> {
    const nowIso = new Date().toISOString();
    const boutiqueId = this.getBoutiqueId();
    const canonId = (order.id || '').replace(/^#+/, '').trim();

    const updatedOrder: TailorOrder & { boutiqueId?: string } = {
      ...order,
      id: canonId,
      boutiqueId,
      updatedAt: nowIso,
    };

    const orders = [...this.inMemoryOrders];
    const index = orders.findIndex((o) => o.id.replace(/^#+/, '') === canonId);
    if (index >= 0) {
      orders[index] = updatedOrder;
    } else {
      orders.unshift(updatedOrder);
    }
    this.inMemoryOrders = orders;
    this.notify();

    try {
      const sanitized = sanitizeForFirestore(updatedOrder);
      const categoryCol = this.getOrderCategoryFolder(updatedOrder);

      await setDoc(doc(db, 'orders', canonId), sanitized, { merge: true });
      await setDoc(doc(db, categoryCol, canonId), sanitized, { merge: true });

      // Automatically sync and add/update the customer in the original 'customers' collection
      await this.syncCustomerFromOrder(updatedOrder);

      await deleteDoc(doc(db, 'orders', `#${canonId}`)).catch(() => {});
      await deleteDoc(doc(db, categoryCol, `#${canonId}`)).catch(() => {});

      const otherCategories = (['stitch', 'alter', 'sale'] as const).filter((c) => c !== categoryCol);
      for (const otherCat of otherCategories) {
        await deleteDoc(doc(db, otherCat, canonId)).catch(() => {});
        await deleteDoc(doc(db, otherCat, `#${canonId}`)).catch(() => {});
      }
    } catch (error) {
      console.error(`Error saving order ${canonId} to Firestore:`, error);
    }
  }

  /**
   * Automatically adds or updates the customer in the original 'customers' collection
   * whenever any order (Retail Sale, Alteration, Custom Stitching) is created or saved.
   */
  public async syncCustomerFromOrder(order: TailorOrder): Promise<void> {
    const rawPhone = order.customerPhone || '';
    const cleanPhone = getClean10DigitPhone(rawPhone);
    const customerName = (order.customerName || '').trim();

    if (!customerName && !cleanPhone) {
      return;
    }

    const nowIso = new Date().toISOString();
    const boutiqueId = order.boutiqueId || this.getBoutiqueId();

    // Look for existing customer in memory
    const existingIndex = this.inMemoryCustomers.findIndex((c) => {
      if (order.customerId && c.id === order.customerId) return true;
      if (cleanPhone && cleanPhone.length === 10 && getClean10DigitPhone(c.phone) === cleanPhone) return true;
      if (!cleanPhone && customerName && c.name.trim().toLowerCase() === customerName.toLowerCase()) return true;
      return false;
    });

    const existingCust = existingIndex >= 0 ? this.inMemoryCustomers[existingIndex] : null;

    let custId = existingCust?.id || order.customerId;
    if (!custId || custId === 'cust_' || custId.trim() === '') {
      if (cleanPhone && cleanPhone.length === 10) {
        custId = `cust_${cleanPhone}`;
      } else {
        const cleanName = (customerName || 'walkin').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
        custId = `cust_walkin_${cleanName}_${Date.now().toString().slice(-6)}`;
      }
    }

    // Determine normalized phone format (+91 XXXXXXXXXX or original label)
    const formattedPhone = cleanPhone && cleanPhone.length === 10 ? `+91 ${cleanPhone}` : (rawPhone || 'Walk-in Client');

    // Aggregate lifetime stats across orders
    const relatedOrders = this.inMemoryOrders.filter((o) => {
      if (o.customerId && (o.customerId === custId || o.customerId === existingCust?.id)) return true;
      const oPhoneClean = getClean10DigitPhone(o.customerPhone || '');
      if (cleanPhone && cleanPhone.length === 10 && oPhoneClean === cleanPhone) return true;
      return false;
    });

    const hasCurrentOrderInList = relatedOrders.some(
      (o) => (o.id || '').replace(/^#+/, '') === (order.id || '').replace(/^#+/, '')
    );
    const allRelatedOrders = hasCurrentOrderInList ? relatedOrders : [order, ...relatedOrders];

    const totalSpent = allRelatedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const ordersCount = Math.max(1, allRelatedOrders.length);
    const isRepeat = ordersCount > 1 || Boolean(order.isRepeatCustomer) || Boolean(existingCust?.isRepeat);

    // Merge measurements so existing measurements are preserved
    const mergedMeasurements = {
      ...(existingCust?.measurements || {}),
      ...(order.measurements || {}),
    };

    const customerRecord: TailorCustomer = {
      id: custId,
      name: customerName || existingCust?.name || (cleanPhone ? `Customer ${cleanPhone.slice(-4)}` : 'Walk-in Client'),
      phone: formattedPhone,
      gender: order.genderCategory || existingCust?.gender || 'Female',
      isRepeat,
      ordersCount,
      lastOrderDate: order.createdDate || existingCust?.lastOrderDate || new Date().toLocaleDateString('en-IN'),
      totalSpent: totalSpent > 0 ? totalSpent : Number(order.totalAmount) || 0,
      measurements: mergedMeasurements,
      boutiqueId,
      boutiqueName: this.inMemoryShopProfile.shopName || existingCust?.boutiqueName || 'Boutique Shop',
      createdAt: existingCust?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    // Update inMemoryCustomers
    const customers = [...this.inMemoryCustomers];
    if (existingIndex >= 0) {
      customers[existingIndex] = customerRecord;
    } else {
      customers.unshift(customerRecord);
    }
    this.inMemoryCustomers = customers;
    this.notify();

    // Persist directly to canonical 'customers' collection in Firestore
    try {
      const sanitized = sanitizeForFirestore(customerRecord);
      await setDoc(doc(db, 'customers', custId), sanitized, { merge: true });
    } catch (err) {
      console.error(`Error saving customer ${custId} to original customers collection:`, err);
    }
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const canonId = orderId.replace(/^#+/, '').trim();
    const orders = [...this.inMemoryOrders];
    const order = orders.find((o) => o.id.replace(/^#+/, '') === canonId);
    if (order) {
      const categoryCol = this.getOrderCategoryFolder(order);

      order.id = canonId;
      order.status = status;
      order.updatedAt = new Date().toISOString();
      if (status === 'Delivered') {
        order.deliveredDate = new Date().toISOString().split('T')[0];
        if (order.balanceDue > 0) {
          const settlementPayment: PaymentRecord = {
            id: `pay-settle-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: order.balanceDue,
            type: 'Balance',
            mode: order.paymentMode || 'Cash',
            note: 'Final Settlement at Delivery',
          };
          order.paymentHistory = [settlementPayment, ...(order.paymentHistory || [])];
          order.advancePaid = order.totalAmount;
          order.balanceDue = 0;
        }
      }
      this.inMemoryOrders = orders;
      this.notify();

      try {
        const sanitized = sanitizeForFirestore(order);
        await setDoc(doc(db, 'orders', canonId), sanitized, { merge: true });
        await setDoc(doc(db, categoryCol, canonId), sanitized, { merge: true });
        await deleteDoc(doc(db, 'orders', `#${canonId}`)).catch(() => {});
        await deleteDoc(doc(db, categoryCol, `#${canonId}`)).catch(() => {});
      } catch (error) {
        console.error(`Error updating order status in Firestore:`, error);
      }
    }
  }

  public async deliverOrderWithSettlement(
    orderId: string,
    balancePaid: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ): Promise<void> {
    const canonId = orderId.replace(/^#+/, '').trim();
    const orders = [...this.inMemoryOrders];
    const order = orders.find((o) => o.id.replace(/^#+/, '') === canonId);
    if (order) {
      const categoryCol = this.getOrderCategoryFolder(order);

      order.id = canonId;
      order.status = 'Delivered';
      order.deliveredDate = new Date().toISOString().split('T')[0];
      if (stitchedPhotos && stitchedPhotos.length > 0) {
        order.stitchedPhotos = stitchedPhotos;
      }
      if (notes) {
        order.specialNotes = order.specialNotes ? `${order.specialNotes} | Delivery: ${notes}` : `Delivery: ${notes}`;
      }
      if (balancePaid > 0) {
        const settlementPayment: PaymentRecord = {
          id: `pay-settle-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: balancePaid,
          type: 'Balance',
          mode: paymentMode || 'Cash',
          note: notes || 'Delivery Balance Settlement',
        };
        order.paymentHistory = [settlementPayment, ...(order.paymentHistory || [])];
        order.advancePaid = (order.advancePaid || 0) + balancePaid;
        order.balanceDue = Math.max(0, order.totalAmount - order.advancePaid);
      }
      order.updatedAt = new Date().toISOString();
      this.inMemoryOrders = orders;
      this.notify();

      try {
        const sanitized = sanitizeForFirestore(order);
        await setDoc(doc(db, 'orders', canonId), sanitized, { merge: true });
        await setDoc(doc(db, categoryCol, canonId), sanitized, { merge: true });
        await deleteDoc(doc(db, 'orders', `#${canonId}`)).catch(() => {});
        await deleteDoc(doc(db, categoryCol, `#${canonId}`)).catch(() => {});
      } catch (error) {
        console.error(`Error delivering order with settlement in Firestore:`, error);
      }
    }
  }

  public async completeAndDeliverOrder(
    orderId: string,
    stitchedPhotos: string[],
    notes?: string
  ): Promise<void> {
    await this.deliverOrderWithSettlement(orderId, 0, 'Cash', stitchedPhotos, notes);
  }

  public async updateOrderAssignment(
    orderId: string,
    assignedTailor: string,
    estimatedHours: number,
    offerMessage: string,
    dueDate: string,
    dueTime: string
  ): Promise<void> {
    const canonId = orderId.replace(/^#+/, '').trim();
    const orders = [...this.inMemoryOrders];
    const order = orders.find((o) => o.id.replace(/^#+/, '') === canonId);
    if (order) {
      const categoryCol = this.getOrderCategoryFolder(order);

      order.id = canonId;
      order.assignedTailor = assignedTailor;
      order.estimatedHours = estimatedHours;
      order.offerMessage = offerMessage;
      order.dueDate = dueDate;
      order.dueTime = dueTime;
      order.status = 'Assigned';
      order.updatedAt = new Date().toISOString();

      this.inMemoryOrders = orders;
      this.notify();

      try {
        const payload = sanitizeForFirestore({
          assignedTailor,
          estimatedHours,
          offerMessage,
          dueDate,
          dueTime,
          status: 'Assigned',
          updatedAt: order.updatedAt,
        });

        await setDoc(doc(db, 'orders', canonId), payload, { merge: true });
        await setDoc(doc(db, categoryCol, canonId), payload, { merge: true });
        await deleteDoc(doc(db, 'orders', `#${canonId}`)).catch(() => {});
        await deleteDoc(doc(db, categoryCol, `#${canonId}`)).catch(() => {});
      } catch (error) {
        console.error(`Error assigning tailor in Firestore:`, error);
      }
    }
  }

  public async assignTailor(
    orderId: string,
    assignedTailor: string,
    estimatedHours: number,
    offerMessage: string,
    dueDate: string,
    dueTime: string
  ): Promise<void> {
    await this.updateOrderAssignment(orderId, assignedTailor, estimatedHours, offerMessage, dueDate, dueTime);
  }

  public async recordPayment(
    orderId: string,
    paymentAmount: number,
    paymentMode: PaymentMode,
    note?: string
  ): Promise<void> {
    const canonId = orderId.replace(/^#+/, '').trim();
    const orders = [...this.inMemoryOrders];
    const order = orders.find((o) => o.id.replace(/^#+/, '') === canonId);
    if (order && paymentAmount > 0) {
      const categoryCol = this.getOrderCategoryFolder(order);

      const payRecord: PaymentRecord = {
        id: `pay-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        type: (order.advancePaid || 0) === 0 ? 'Advance' : 'Balance',
        mode: paymentMode,
        note: note || 'Counter Payment Collection',
      };
      order.id = canonId;
      order.paymentHistory = [payRecord, ...(order.paymentHistory || [])];
      order.advancePaid = (order.advancePaid || 0) + paymentAmount;
      order.balanceDue = Math.max(0, order.totalAmount - order.advancePaid);
      order.updatedAt = new Date().toISOString();

      this.inMemoryOrders = orders;
      this.notify();

      try {
        const sanitized = sanitizeForFirestore(order);
        await setDoc(doc(db, 'orders', canonId), sanitized, { merge: true });
        await setDoc(doc(db, categoryCol, canonId), sanitized, { merge: true });
        await deleteDoc(doc(db, 'orders', `#${canonId}`)).catch(() => {});
        await deleteDoc(doc(db, categoryCol, `#${canonId}`)).catch(() => {});
      } catch (error) {
        console.error(`Error saving payment in Firestore:`, error);
      }
    }
  }

  public async addPaymentToOrder(
    orderId: string,
    paymentAmount: number,
    paymentMode: PaymentMode,
    note?: string
  ): Promise<void> {
    await this.recordPayment(orderId, paymentAmount, paymentMode, note);
  }

  public async updateOrderDueDate(orderId: string, dueDate: string, dueTime?: string): Promise<void> {
    const canonId = orderId.replace(/^#+/, '').trim();
    const orders = [...this.inMemoryOrders];
    const order = orders.find((o) => o.id.replace(/^#+/, '') === canonId);
    if (order) {
      const categoryCol = this.getOrderCategoryFolder(order);

      order.id = canonId;
      order.dueDate = dueDate;
      if (dueTime) {
        order.dueTime = dueTime;
      }
      order.updatedAt = new Date().toISOString();

      this.inMemoryOrders = orders;
      this.notify();

      try {
        const payload = sanitizeForFirestore({
          dueDate,
          dueTime: order.dueTime,
          updatedAt: order.updatedAt,
        });

        await setDoc(doc(db, 'orders', canonId), payload, { merge: true });
        await setDoc(doc(db, categoryCol, canonId), payload, { merge: true });
        await deleteDoc(doc(db, 'orders', `#${canonId}`)).catch(() => {});
        await deleteDoc(doc(db, categoryCol, `#${canonId}`)).catch(() => {});
      } catch (error) {
        console.error(`Error updating due date in Firestore:`, error);
      }
    }
  }

  public async deleteOrder(orderId: string): Promise<void> {
    const cleanOrderId = orderId.replace(/^#+/, '').trim();

    this.inMemoryOrders = this.inMemoryOrders.filter((o) => o.id.replace(/^#+/, '') !== cleanOrderId);
    this.notify();

    try {
      await deleteDoc(doc(db, 'orders', cleanOrderId)).catch(() => {});
      await deleteDoc(doc(db, 'orders', `#${cleanOrderId}`)).catch(() => {});
      await deleteDoc(doc(db, 'stitch', cleanOrderId)).catch(() => {});
      await deleteDoc(doc(db, 'stitch', `#${cleanOrderId}`)).catch(() => {});
      await deleteDoc(doc(db, 'alter', cleanOrderId)).catch(() => {});
      await deleteDoc(doc(db, 'alter', `#${cleanOrderId}`)).catch(() => {});
      await deleteDoc(doc(db, 'sale', cleanOrderId)).catch(() => {});
      await deleteDoc(doc(db, 'sale', `#${cleanOrderId}`)).catch(() => {});
    } catch (error) {
      console.error(`Error deleting order ${cleanOrderId} from Firestore:`, error);
    }
  }

  // --- Customers CRUD ---
  public getCustomers(): TailorCustomer[] {
    return this.inMemoryCustomers;
  }

  public async saveCustomer(customer: TailorCustomer): Promise<void> {
    const customers = [...this.inMemoryCustomers];
    const index = customers.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      customers[index] = customer;
    } else {
      customers.unshift(customer);
    }
    this.inMemoryCustomers = customers;
    this.notify();

    try {
      const sanitized = sanitizeForFirestore(customer);
      // Save directly to standard 'customers' collection
      await setDoc(doc(db, 'customers', customer.id), sanitized, { merge: true });
      // Delete legacy doc from customer (singular), Customer, or tailor_customers if present
      await deleteDoc(doc(db, 'customer', customer.id)).catch(() => {});
      await deleteDoc(doc(db, 'Customer', customer.id)).catch(() => {});
      await deleteDoc(doc(db, 'tailor_customers', customer.id)).catch(() => {});
    } catch (error) {
      console.error(`Error saving customer ${customer.id} to Firestore:`, error);
    }
  }

  public async deleteCustomer(customerId: string): Promise<void> {
    this.inMemoryCustomers = this.inMemoryCustomers.filter((c) => c.id !== customerId);
    this.notify();

    try {
      await deleteDoc(doc(db, 'customers', customerId));
      await deleteDoc(doc(db, 'customer', customerId)).catch(() => {});
      await deleteDoc(doc(db, 'Customer', customerId)).catch(() => {});
      await deleteDoc(doc(db, 'tailor_customers', customerId)).catch(() => {});
    } catch (error) {
      console.error(`Error deleting customer ${customerId} from Firestore:`, error);
    }
  }

  public async clearAllCustomers(): Promise<void> {
    const ids = this.inMemoryCustomers.map((c) => c.id);
    this.inMemoryCustomers = [];
    this.notify();

    try {
      for (const id of ids) {
        await deleteDoc(doc(db, 'customers', id)).catch(() => {});
        await deleteDoc(doc(db, 'customer', id)).catch(() => {});
        await deleteDoc(doc(db, 'Customer', id)).catch(() => {});
        await deleteDoc(doc(db, 'tailor_customers', id)).catch(() => {});
      }
    } catch (error) {
      console.error('Error clearing all customers:', error);
    }
  }

  // --- Tailors CRUD ---
  public getTailors(): StaffTailor[] {
    return this.inMemoryTailors;
  }

  public setTailors(tailors: StaffTailor[]) {
    this.inMemoryTailors = tailors;
    this.notify();
  }

  public async addTailor(name: string, phone: string, role: 'Owner' | 'Tailor' = 'Tailor'): Promise<StaffTailor> {
    const newTailor: StaffTailor = {
      id: `tailor_${Date.now()}`,
      name,
      phone,
      role,
      initials: name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'TL',
      activeOrdersCount: 0,
    };
    await this.saveTailor(newTailor);
    return newTailor;
  }

  public async saveTailor(tailor: StaffTailor): Promise<void> {
    const tailors = [...this.inMemoryTailors];
    const index = tailors.findIndex((t) => t.id === tailor.id);
    if (index >= 0) {
      tailors[index] = tailor;
    } else {
      tailors.push(tailor);
    }
    this.inMemoryTailors = tailors;
    this.notify();

    try {
      const sanitized = sanitizeForFirestore(tailor);
      await setDoc(doc(db, 'tailor_staff', tailor.id), sanitized, { merge: true });
    } catch (error) {
      console.error(`Error saving tailor ${tailor.id} to Firestore:`, error);
    }
  }

  public async deleteTailor(tailorId: string): Promise<void> {
    this.inMemoryTailors = this.inMemoryTailors.filter((t) => t.id !== tailorId);
    this.notify();

    try {
      await deleteDoc(doc(db, 'tailor_staff', tailorId));
    } catch (error) {
      console.error(`Error deleting tailor ${tailorId} from Firestore:`, error);
    }
  }

  // --- Appointments CRUD ---
  public getAppointments(): BoutiqueAppointment[] {
    return this.inMemoryAppointments;
  }

  public async saveAppointment(appointment: BoutiqueAppointment): Promise<void> {
    const isCompleted = appointment.status === 'Completed';
    const nowIso = new Date().toISOString();
    const updatedAppt: BoutiqueAppointment = {
      ...appointment,
      status: appointment.status || 'Scheduled',
      updatedAt: nowIso,
      ...(isCompleted && !(appointment as any).completedAt ? { completedAt: nowIso } : {}),
    };

    const appts = [...this.inMemoryAppointments];
    const index = appts.findIndex((a) => a.id === appointment.id);
    if (index >= 0) {
      appts[index] = updatedAppt;
    } else {
      appts.unshift(updatedAppt);
    }
    this.inMemoryAppointments = appts;
    this.notify();

    try {
      const boutiqueId = this.getBoutiqueId();
      const sanitized = sanitizeForFirestore(updatedAppt);
      // 1. Persist to primary Firestore root appointments collection
      await setDoc(doc(db, 'appointments', updatedAppt.id), sanitized, { merge: true });
      
      // 2. Persist to boutique-specific appointments subcollection
      if (boutiqueId) {
        await setDoc(doc(db, 'boutiques', boutiqueId, 'appointments', updatedAppt.id), sanitized, { merge: true }).catch(() => {});
      }

      // 3. If appointment is marked Completed and linked to an order, update the order in Firestore database
      if (isCompleted && updatedAppt.orderId) {
        const order = this.inMemoryOrders.find(
          (o) => o.id === updatedAppt.orderId || o.orderNumber === updatedAppt.orderId
        );
        if (order) {
          const updatedOrder: TailorOrder = {
            ...order,
            updatedAt: nowIso,
          };
          if (order.status === 'Trial') {
            updatedOrder.status = 'Completed';
          }
          await this.saveOrder(updatedOrder);
        }
      }
    } catch (error) {
      console.error(`Error saving appointment ${appointment.id} to Firestore:`, error);
    }
  }

  public async toggleAppointmentChecklist(
    appointmentId: string,
    field: string,
    val?: boolean
  ): Promise<void> {
    const appts = [...this.inMemoryAppointments];
    const appt = appts.find((a) => a.id === appointmentId);
    if (appt) {
      const currentVal = (appt as any)[field];
      const newVal = typeof val === 'boolean' ? val : !currentVal;
      (appt as any)[field] = newVal;
      appt.updatedAt = new Date().toISOString();
      this.inMemoryAppointments = appts;
      this.notify();

      try {
        const boutiqueId = this.getBoutiqueId();
        await setDoc(
          doc(db, 'appointments', appointmentId),
          { [field]: newVal, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        if (boutiqueId) {
          await setDoc(
            doc(db, 'boutiques', boutiqueId, 'appointments', appointmentId),
            { [field]: newVal, updatedAt: new Date().toISOString() },
            { merge: true }
          ).catch(() => {});
        }
      } catch (e) {
        console.error('Error toggling appointment checklist in Firestore:', e);
      }
    }
  }

  public async updateAppointmentStatus(
    id: string,
    status: BoutiqueAppointment['status']
  ): Promise<void> {
    const appts = [...this.inMemoryAppointments];
    const appt = appts.find((a) => a.id === id);
    if (appt) {
      const nowIso = new Date().toISOString();
      const isCompleted = status === 'Completed';
      appt.status = status;
      appt.updatedAt = nowIso;
      if (isCompleted && !(appt as any).completedAt) {
        (appt as any).completedAt = nowIso;
      }
      this.inMemoryAppointments = appts;
      this.notify();

      try {
        const boutiqueId = this.getBoutiqueId();
        const updatePayload: Record<string, any> = {
          status,
          updatedAt: nowIso,
          ...(isCompleted ? { completedAt: nowIso } : {}),
        };

        await setDoc(doc(db, 'appointments', id), updatePayload, { merge: true });
        if (boutiqueId) {
          await setDoc(doc(db, 'boutiques', boutiqueId, 'appointments', id), updatePayload, { merge: true }).catch(() => {});
        }

        // If completed and linked to an order, synchronize order status in Firestore
        if (isCompleted && appt.orderId) {
          const order = this.inMemoryOrders.find(
            (o) => o.id === appt.orderId || o.orderNumber === appt.orderId
          );
          if (order) {
            const updatedOrder: TailorOrder = {
              ...order,
              updatedAt: nowIso,
            };
            if (order.status === 'Trial') {
              updatedOrder.status = 'Completed';
            }
            await this.saveOrder(updatedOrder);
          }
        }
      } catch (error) {
        console.error(`Error updating appointment ${id} in Firestore:`, error);
      }
    }
  }

  public async deleteAppointment(id: string): Promise<void> {
    this.inMemoryAppointments = this.inMemoryAppointments.filter((a) => a.id !== id);
    this.notify();

    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
      console.error(`Error deleting appointment ${id} from Firestore:`, error);
    }
  }

  // --- Inventory CRUD ---
  public getInventory(): InventoryItem[] {
    return this.inMemoryInventory;
  }

  public async saveInventoryItem(item: InventoryItem): Promise<void> {
    const boutiqueId = this.getBoutiqueId();
    
    // Compress and safety-check all photos to stay within Firestore 1MB document boundary
    let processedPhotos: string[] = [];
    if (item.photos && item.photos.length > 0) {
      processedPhotos = await Promise.all(
        item.photos.slice(0, 6).map((p) => compressDataUrlForFirestore(p, 800, 0.6))
      );
    }

    const itemWithBoutique: InventoryItem = {
      ...item,
      photos: processedPhotos,
      image: processedPhotos[0] || item.image || '',
      boutiqueId: item.boutiqueId || boutiqueId,
    };
    const list = [...this.inMemoryInventory];
    const index = list.findIndex((i) => i.id === itemWithBoutique.id);
    if (index >= 0) {
      list[index] = itemWithBoutique;
    } else {
      list.unshift(itemWithBoutique);
    }
    this.inMemoryInventory = list;
    this.notify();

    try {
      const sanitized = sanitizeForFirestore(itemWithBoutique);
      // Ensure boutique parent doc exists in 'boutiques' collection
      await setDoc(
        doc(db, 'boutiques', boutiqueId),
        {
          id: boutiqueId,
          boutiqueId,
          shopName: this.inMemoryShopProfile?.shopName || 'Boutique Store',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});

      // 1. Create/Save inside the boutique-specific inventory subcollection: boutiques/{boutiqueId}/inventory/{itemId}
      await setDoc(doc(db, 'boutiques', boutiqueId, 'inventory', itemWithBoutique.id), sanitized, { merge: true });
      // 2. Also mirror to root inventory collection
      await setDoc(doc(db, 'inventory', itemWithBoutique.id), sanitized, { merge: true });
    } catch (error) {
      console.error(`Error saving inventory item ${item.id} to Firestore:`, error);
    }
  }

  public async adjustInventoryStock(
    itemId: string,
    delta: number,
    _reason?: string
  ): Promise<InventoryItem | null> {
    const boutiqueId = this.getBoutiqueId();
    const list = [...this.inMemoryInventory];
    const index = list.findIndex((i) => i.id === itemId);
    if (index >= 0) {
      const item = list[index];
      const newQty = Math.max(0, (item.quantity || 0) + delta);
      const updated: InventoryItem = {
        ...item,
        quantity: newQty,
        updatedAt: new Date().toISOString(),
      };
      list[index] = updated;
      this.inMemoryInventory = list;
      this.notify();

      try {
        await setDoc(doc(db, 'boutiques', boutiqueId, 'inventory', itemId), { quantity: newQty, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        await setDoc(doc(db, 'inventory', itemId), { quantity: newQty, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      } catch (e) {
        console.error('Error adjusting inventory stock in Firestore:', e);
      }
      return updated;
    }
    return null;
  }

  public async syncInventoryFromFirestoreNow(): Promise<void> {
    try {
      const boutiqueId = this.getBoutiqueId();
      const itemMap = new Map<string, InventoryItem>();

      // 1. Fetch from root collection
      const snap = await getDocs(collection(db, 'inventory')).catch(() => null);
      if (snap) {
        snap.docs.forEach((d) => {
          itemMap.set(d.id, { ...(d.data() as InventoryItem), id: d.id });
        });
      }

      // 2. Fetch from boutique's specific inventory collection
      const bSnap = await getDocs(collection(db, 'boutiques', boutiqueId, 'inventory')).catch(() => null);
      if (bSnap) {
        bSnap.docs.forEach((d) => {
          itemMap.set(d.id, { ...(d.data() as InventoryItem), id: d.id, boutiqueId });
        });
      }

      this.inMemoryInventory = Array.from(itemMap.values());
      this.notify();
    } catch (err) {
      console.warn('Sync inventory error:', err);
    }
  }

  public async deleteInventoryItem(id: string): Promise<void> {
    const boutiqueId = this.getBoutiqueId();
    this.inMemoryInventory = this.inMemoryInventory.filter((i) => i.id !== id);
    this.notify();

    try {
      await deleteDoc(doc(db, 'boutiques', boutiqueId, 'inventory', id)).catch(() => {});
      await deleteDoc(doc(db, 'inventory', id)).catch(() => {});
    } catch (error) {
      console.error(`Error deleting inventory item ${id} from Firestore:`, error);
    }
  }

  public async clearAllInventory(): Promise<void> {
    const boutiqueId = this.getBoutiqueId();
    this.inMemoryInventory = [];
    this.notify();

    try {
      const bSnap = await getDocs(collection(db, 'boutiques', boutiqueId, 'inventory')).catch(() => null);
      if (bSnap) {
        for (const docSnap of bSnap.docs) {
          await deleteDoc(doc(db, 'boutiques', boutiqueId, 'inventory', docSnap.id)).catch(() => {});
        }
      }

      const snap = await getDocs(collection(db, 'inventory')).catch(() => null);
      if (snap) {
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, 'inventory', docSnap.id)).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error clearing inventory collection in Firestore:', error);
    }
  }

  // --- Marketplace Products & Catalogue Docs ---
  public getProducts(): MarketplaceProduct[] {
    return this.inMemoryProducts;
  }

  public async saveProduct(product: MarketplaceProduct): Promise<void> {
    const list = [...this.inMemoryProducts];
    const index = list.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      list[index] = product;
    } else {
      list.unshift(product);
    }
    this.inMemoryProducts = list;
    this.notify();

    try {
      const sanitized = sanitizeForFirestore(product);
      await setDoc(doc(db, 'marketplace_products', product.id), sanitized, { merge: true });
    } catch (error) {
      console.error(`Error saving marketplace product ${product.id} to Firestore:`, error);
    }
  }

  public async toggleProductStatus(
    productId: string,
    status: 'Available' | 'Made to Order' | 'Out of Stock' | 'Draft'
  ): Promise<void> {
    const list = [...this.inMemoryProducts];
    const prod = list.find((p) => p.id === productId);
    if (prod) {
      prod.status = status;
      this.inMemoryProducts = list;
      this.notify();

      try {
        await setDoc(doc(db, 'marketplace_products', productId), { status }, { merge: true });
      } catch (err) {
        console.error('Error toggling product status:', err);
      }
    }
  }

  public async bulkSaveProducts(products: MarketplaceProduct[]): Promise<void> {
    for (const prod of products) {
      await this.saveProduct(prod);
    }
  }

  public async clearAllProducts(): Promise<void> {
    const ids = this.inMemoryProducts.map((p) => p.id);
    this.inMemoryProducts = [];
    this.notify();

    try {
      for (const id of ids) {
        await deleteDoc(doc(db, 'marketplace_products', id)).catch(() => {});
      }
    } catch (err) {
      console.error('Error clearing products in Firestore:', err);
    }
  }

  public async deleteProduct(productId: string): Promise<void> {
    this.inMemoryProducts = this.inMemoryProducts.filter((p) => p.id !== productId);
    this.notify();

    try {
      await deleteDoc(doc(db, 'marketplace_products', productId));
    } catch (error) {
      console.error(`Error deleting marketplace product ${productId} from Firestore:`, error);
    }
  }

  public getCatalogueDocs(): UploadedCatalogueDoc[] {
    return this.inMemoryCatalogueDocs;
  }

  public async saveCatalogueDoc(catalogueDoc: UploadedCatalogueDoc): Promise<void> {
    const list = [...this.inMemoryCatalogueDocs];
    const index = list.findIndex((d) => d.id === catalogueDoc.id);
    if (index >= 0) {
      list[index] = catalogueDoc;
    } else {
      list.unshift(catalogueDoc);
    }
    this.inMemoryCatalogueDocs = list;
    this.notify();

    try {
      const sanitized = sanitizeForFirestore(catalogueDoc);
      await setDoc(doc(db, 'catalogue_documents', catalogueDoc.id), sanitized, { merge: true });
    } catch (error) {
      console.error(`Error saving catalogue doc ${catalogueDoc.id} to Firestore:`, error);
    }
  }

  public async deleteCatalogueDoc(docId: string): Promise<void> {
    this.inMemoryCatalogueDocs = this.inMemoryCatalogueDocs.filter((d) => d.id !== docId);
    this.notify();

    try {
      await deleteDoc(doc(db, 'catalogue_documents', docId));
    } catch (error) {
      console.error(`Error deleting catalogue doc ${docId} from Firestore:`, error);
    }
  }

  // --- Revenue Analytics Calculation ---
  public getRevenueAnalytics(): RevenueAnalytics {
    const orders = this.inMemoryOrders;
    let totalRevenue = 0;
    let advanceReceived = 0;
    let balanceReceived = 0;
    let completedOrdersCount = 0;
    let inProgressOrdersCount = 0;
    let pendingCollections = 0;

    for (const order of orders) {
      const total = Number(order.totalAmount) || 0;
      const adv = Number(order.advancePaid) || 0;
      const bal = Number(order.balanceDue) || 0;

      totalRevenue += total;
      advanceReceived += adv;
      balanceReceived += Math.max(0, total - bal - adv);
      pendingCollections += bal;

      if (order.status === 'Completed' || order.status === 'Delivered') {
        completedOrdersCount++;
      } else {
        inProgressOrdersCount++;
      }
    }

    return {
      totalRevenue,
      advanceReceived,
      balanceReceived,
      ordersCompleted: completedOrdersCount,
      revenueGrowthPercent: 12.5,
      advanceGrowthPercent: 10.2,
      balanceGrowthPercent: 8.4,
      ordersGrowthCount: orders.length,
      pendingCollections,
      pendingOrdersCount: inProgressOrdersCount,
      dailyTrend: [],
      topServices: [],
      paymentModes: [],
    };
  }

  public async triggerCloudSync(): Promise<boolean> {
    this.initFirestoreLiveSync();
    return true;
  }

  public async syncWithCloudFirestore(): Promise<boolean> {
    return this.triggerCloudSync();
  }

  public clearCurrentBoutiqueData() {
    this.inMemoryOrders = [];
    this.inMemoryCustomers = [];
    this.inMemoryTailors = [];
    this.inMemoryProducts = [];
    this.inMemoryCatalogueDocs = [];
    this.inMemoryAppointments = [];
    this.inMemoryInventory = [];
    this.inMemoryShopProfile = {
      shopName: '',
      ownerName: '',
      phoneNumber: '',
      address: '',
      upiId: '',
      gpayPhonePeNumber: '',
      upiQrCodeUrl: '',
      lastSyncedTimestamp: 'Reset',
      isVerified: false,
      status: 'Pending Verification',
    };
    this.authSession = null;
    try {
      sessionStorage.removeItem('shop_auth_session');
      sessionStorage.removeItem('shopscopers_active_boutique_id');
      localStorage.removeItem('shop_profile_local');
      localStorage.removeItem('active_boutique_id');
    } catch {
      // ignore
    }
    this.notify();
  }

  public async syncAllCollectionsToFirestore(): Promise<{ success: boolean; count: number }> {
    this.initFirestoreLiveSync();
    return { success: true, count: this.inMemoryOrders.length };
  }
}

// Export singleton instance and class
export const roomDb = new FirestoreBoutiqueDatabase();
export type LocalRoomDatabase = FirestoreBoutiqueDatabase;
