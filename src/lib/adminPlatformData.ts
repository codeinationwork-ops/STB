import { PlatformShop } from '../types';
import { roomDb } from './localRoomDb';
import { db } from './firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { SubscriptionService } from './subscriptionService';

// In-memory cache of REAL boutique shops (no dummy/seed mock shops)
let inMemoryPlatformShops: PlatformShop[] = [];
let listeners: Array<(shops: PlatformShop[]) => void> = [];
let unsubscribeFirestore: (() => void) | null = null;
let isListening = false;

export class AdminPlatformService {
  private static notifyListeners() {
    const shops = this.getShops();
    listeners.forEach((fn) => {
      try {
        fn(shops);
      } catch (e) {
        console.error('Error in AdminPlatformService listener:', e);
      }
    });
  }

  public static initRealtimeListener(): void {
    if (isListening) return;
    isListening = true;

    try {
      // Real-time listener directly on the 'boutiques' Firestore collection
      const boutiquesRef = collection(db, 'boutiques');
      unsubscribeFirestore = onSnapshot(
        boutiquesRef,
        (snap) => {
          const loadedShops: PlatformShop[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            const shopId = docSnap.id;

            // Ignore system or non-shop document IDs if any
            if (shopId.startsWith('_') || !data.shopName) return;

            const isVerified =
              data.isVerified === true ||
              data.status === 'Active' ||
              data.status === 'active' ||
              data.verificationStatus === 'verified';

            const status = isVerified
              ? 'Active'
              : data.status === 'Suspended'
              ? 'Suspended'
              : data.status === 'Rejected' || data.verificationStatus === 'rejected'
              ? 'Rejected'
              : 'Pending Verification';

            const verificationStatus = isVerified
              ? 'verified'
              : data.status === 'Suspended'
              ? 'suspended'
              : data.status === 'Rejected' || data.verificationStatus === 'rejected'
              ? 'rejected'
              : 'pending';

            const isSubscribed =
              data.subscriptionStatus === 'active' ||
              (data.isSubscribed === true && data.subscriptionStatus !== 'pending_confirmation');

            const mapped: PlatformShop = {
              id: shopId,
              shopName: data.shopName || 'Boutique Shop',
              ownerName: data.ownerName || 'Boutique Owner',
              phoneNumber: data.phoneNumber || data.phone || '',
              city: data.city || 'Bhubaneswar',
              state: data.state || 'Odisha',
              planTier: data.planTier || data.plan || 'Starter Plan',
              status,
              isVerified,
              verificationStatus,
              totalOrders: data.totalOrders || 0,
              grossRevenue: data.grossRevenue || 0,
              activeKarigarsCount: data.activeKarigarsCount || 1,
              lastActive: data.lastActive || 'Registered Recently',
              createdAt:
                data.signupDate ||
                data.registeredAt ||
                data.createdAt?.toDate?.()?.toISOString?.() ||
                data.createdAt ||
                new Date().toISOString(),
              address: data.address || data.exactAddress || '',
              upiId: data.upiId || '',
              email: data.email || data.authEmail || '',
              specialty: data.specialty || data.tailoringSpeciality || '',
              pincode: data.pincode || '',
              rejectionReason: data.rejectionReason,
              verifiedAt: data.verifiedAt,
              isSubscribed,
              subscriptionStatus: data.subscriptionStatus || (isSubscribed ? 'active' : 'trial'),
              subscriptionPlan: data.subscriptionPlan,
              subscriptionPrice: data.subscriptionPrice,
              subscriptionStartDate: data.subscriptionStartDate,
              subscriptionExpiryDate: data.subscriptionExpiryDate,
              paymentId: data.paymentId,
              paymentMethod: data.paymentMethod,
              paymentSubmittedAt: data.paymentSubmittedAt,
              confirmedByAdminAt: data.confirmedByAdminAt,
              confirmedDays: data.confirmedDays,
            };

            loadedShops.push(mapped);
          });

          // Sort by creation date descending (newest first)
          loadedShops.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || 0;
            const timeB = new Date(b.createdAt).getTime() || 0;
            return timeB - timeA;
          });

          inMemoryPlatformShops = loadedShops;
          this.notifyListeners();
        },
        (err) => {
          console.warn('Realtime Firestore boutiques listener warning:', err);
        }
      );
    } catch (e) {
      console.warn('AdminPlatformService realtime init note:', e);
    }
  }

  public static subscribe(callback: (shops: PlatformShop[]) => void): () => void {
    this.initRealtimeListener();
    listeners.push(callback);
    callback(this.getShops());
    return () => {
      listeners = listeners.filter((fn) => fn !== callback);
    };
  }

  public static getShops(): PlatformShop[] {
    this.initRealtimeListener();

    // Also include current roomDb profile if user has an active real registration
    const currentShopProfile = roomDb.getShopProfile();
    const currentPhone = (currentShopProfile.phoneNumber || '').replace(/\D/g, '');
    const boutiqueId = roomDb.getBoutiqueId();
    const shopDocId = boutiqueId || (currentPhone ? `shop_${currentPhone}` : null);

    const mergedList = [...inMemoryPlatformShops];

    // If current user is registered with valid phone and shop name, ensure it is in the list
    if (shopDocId && currentShopProfile.shopName && currentPhone) {
      const existingIdx = mergedList.findIndex(
        (s) => s.id === shopDocId || s.phoneNumber.replace(/\D/g, '') === currentPhone
      );

      const isCurrentVerified =
        currentShopProfile.isVerified === true ||
        currentShopProfile.status === 'Active' ||
        currentShopProfile.status === 'active' ||
        currentShopProfile.verificationStatus === 'verified';

      const currentOrders = roomDb.getOrders();
      const currentTailors = roomDb.getTailors();
      const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      if (existingIdx === -1) {
        const primaryShop: PlatformShop = {
          id: shopDocId,
          shopName: currentShopProfile.shopName,
          ownerName: currentShopProfile.ownerName || 'Boutique Owner',
          phoneNumber: currentShopProfile.phoneNumber || '',
          city: currentShopProfile.city || 'Bhubaneswar',
          state: currentShopProfile.state || 'Odisha',
          planTier: (currentShopProfile.plan as any) || 'Starter Plan',
          status: isCurrentVerified ? 'Active' : 'Pending Verification',
          isVerified: isCurrentVerified,
          verificationStatus: isCurrentVerified ? 'verified' : 'pending',
          totalOrders: currentOrders.length,
          grossRevenue: currentRevenue,
          activeKarigarsCount: Math.max(1, currentTailors.length),
          lastActive: 'Active now',
          createdAt: currentShopProfile.registeredAt || new Date().toISOString(),
          address: currentShopProfile.address || '',
          upiId: currentShopProfile.upiId || '',
          specialty: currentShopProfile.specialty || '',
        };
        mergedList.unshift(primaryShop);
      }
    }

    return mergedList;
  }

  public static async saveShops(shops: PlatformShop[]): Promise<void> {
    inMemoryPlatformShops = shops;
    try {
      for (const shop of shops) {
        await setDoc(
          doc(db, 'boutiques', shop.id),
          {
            ...shop,
            isVerified: shop.status === 'Active',
            verificationStatus:
              shop.status === 'Active'
                ? 'verified'
                : shop.status === 'Suspended'
                ? 'suspended'
                : shop.status === 'Rejected'
                ? 'rejected'
                : 'pending',
          },
          { merge: true }
        ).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to persist boutique shops to Firestore:', e);
    }
  }

  public static updateShopStatus(shopId: string, status: PlatformShop['status']): PlatformShop[] {
    const shops = this.getShops();
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      target.status = status;
      target.isVerified = status === 'Active';
      target.verificationStatus =
        status === 'Active'
          ? 'verified'
          : status === 'Suspended'
          ? 'suspended'
          : status === 'Rejected'
          ? 'rejected'
          : 'pending';
      if (status === 'Active') {
        target.verifiedAt = new Date().toISOString();
      }
      this.saveShops(shops);

      // If this corresponds to the currently loaded boutique in roomDb, sync immediately
      const currentBoutiqueId = roomDb.getBoutiqueId();
      const currentPhone = roomDb.getShopProfile().phoneNumber.replace(/\D/g, '');
      const targetPhone = target.phoneNumber.replace(/\D/g, '');
      if (shopId === currentBoutiqueId || (currentPhone && currentPhone === targetPhone)) {
        roomDb.updateShopProfile({
          isVerified: status === 'Active',
          status: status,
          verificationStatus: target.verificationStatus,
        });
      }
    }
    return [...shops];
  }

  public static verifyBoutique(shopId: string): PlatformShop[] {
    return this.updateShopStatus(shopId, 'Active');
  }

  public static rejectBoutique(shopId: string, reason?: string): PlatformShop[] {
    const shops = this.getShops();
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      target.status = 'Rejected';
      target.isVerified = false;
      target.verificationStatus = 'rejected';
      target.rejectionReason = reason || 'Incomplete registration details. Please reach out to admin.';
      this.saveShops(shops);

      const currentBoutiqueId = roomDb.getBoutiqueId();
      const currentPhone = roomDb.getShopProfile().phoneNumber.replace(/\D/g, '');
      const targetPhone = target.phoneNumber.replace(/\D/g, '');
      if (shopId === currentBoutiqueId || (currentPhone && currentPhone === targetPhone)) {
        roomDb.updateShopProfile({
          isVerified: false,
          status: 'Rejected',
          verificationStatus: 'rejected',
        });
      }
    }
    return [...shops];
  }

  public static updateShopPlan(shopId: string, planTier: PlatformShop['planTier']): PlatformShop[] {
    const shops = this.getShops();
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      target.planTier = planTier;
      this.saveShops(shops);
    }
    return [...shops];
  }

  public static approveBoutiqueSubscription(shopId: string, customDays?: number): PlatformShop[] {
    const shops = this.getShops();
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      const now = new Date();
      const plan = target.subscriptionPlan || (target.planTier === 'Boutique Enterprise' ? 'annual' : 'monthly');
      const days = customDays || target.confirmedDays || (plan === 'annual' ? 365 : 30);
      const expiryDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

      target.isSubscribed = true;
      target.subscriptionStatus = 'active';
      target.status = 'Active';
      target.isVerified = true;
      target.verificationStatus = 'verified';
      target.confirmedDays = days;
      target.subscriptionStartDate = now.toISOString();
      target.subscriptionExpiryDate = expiryDate;
      target.confirmedByAdminAt = now.toISOString();
      target.planTier = plan === 'annual' ? 'Boutique Enterprise' : 'Pro Multi-Device';

      this.saveShops(shops);

      // Trigger approval in the dedicated Firestore 'Subscription' collection
      SubscriptionService.approveSubscription(shopId, days).catch((err) => {
        console.warn('SubscriptionService approve error:', err);
      });
    }
    return [...shops];
  }

  public static rejectBoutiqueSubscription(shopId: string, reason?: string): PlatformShop[] {
    const shops = this.getShops();
    const target = shops.find((s) => s.id === shopId);
    if (target) {
      target.subscriptionStatus = 'rejected';
      target.isSubscribed = false;
      target.rejectionReason = reason || 'Payment transaction could not be verified.';
      this.saveShops(shops);

      // Trigger rejection in the dedicated Firestore 'Subscription' collection
      SubscriptionService.rejectSubscription(shopId, reason).catch((err) => {
        console.warn('SubscriptionService reject error:', err);
      });
    }
    return [...shops];
  }

  /**
   * Permanently deletes an individual boutique and all its associated backend data
   * across Firestore subcollections and root collections.
   */
  public static async deleteBoutique(shopId: string, adminToken?: string): Promise<PlatformShop[]> {
    const shops = this.getShops();
    const target = shops.find((s) => s.id === shopId);
    const cleanPhone = (target?.phoneNumber || '').replace(/\D/g, '');
    const clean10 = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;

    // 1. Delete direct boutique doc in Firestore
    try {
      await deleteDoc(doc(db, 'boutiques', shopId)).catch(() => {});
      if (clean10 && shopId !== `shop_${clean10}`) {
        await deleteDoc(doc(db, 'boutiques', `shop_${clean10}`)).catch(() => {});
      }
      if (cleanPhone && shopId !== `shop_${cleanPhone}`) {
        await deleteDoc(doc(db, 'boutiques', `shop_${cleanPhone}`)).catch(() => {});
      }
    } catch (e) {
      console.warn('Error deleting boutique doc from Firestore:', e);
    }

    // 2. Delete all subcollections inside boutiques/{shopId}
    const subcollections = [
      'inventory',
      'orders',
      'customers',
      'tailors',
      'tailor_staff',
      'appointments',
      'marketplace_products',
      'products',
      'catalogue',
      'catalogue_documents',
      'notifications',
      'measurements',
      'settings',
      'analytics',
      'audit_logs',
    ];

    const boutiqueDocIds = [shopId];
    if (clean10 && !boutiqueDocIds.includes(`shop_${clean10}`)) boutiqueDocIds.push(`shop_${clean10}`);
    if (cleanPhone && !boutiqueDocIds.includes(`shop_${cleanPhone}`)) boutiqueDocIds.push(`shop_${cleanPhone}`);

    for (const bId of boutiqueDocIds) {
      for (const subCol of subcollections) {
        try {
          const subSnap = await getDocs(collection(db, 'boutiques', bId, subCol)).catch(() => null);
          if (subSnap && !subSnap.empty) {
            for (const subDoc of subSnap.docs) {
              await deleteDoc(doc(db, 'boutiques', bId, subCol, subDoc.id)).catch(() => {});
            }
          }
        } catch {}
      }
    }

    // 3. Delete root collection records associated with this individual boutique
    const rootCollectionsToPurge = [
      'orders',
      'customers',
      'tailor_staff',
      'inventory',
      'appointments',
      'marketplace_products',
      'catalogue_documents',
      'stitch',
      'alter',
      'sale',
      'tailor_orders',
      'users',
    ];

    for (const colName of rootCollectionsToPurge) {
      try {
        const snap = await getDocs(collection(db, colName)).catch(() => null);
        if (snap && !snap.empty) {
          for (const d of snap.docs) {
            const data = d.data();
            const docBoutiqueId = data.boutiqueId || data.shopId;
            const docPhone = (data.phoneNumber || data.phone || data.shopPhone || data.customerPhone || '').replace(/\D/g, '');
            const docPhone10 = docPhone.length > 10 ? docPhone.slice(-10) : docPhone;

            const isMatch =
              docBoutiqueId === shopId ||
              (clean10 && docBoutiqueId === `shop_${clean10}`) ||
              (cleanPhone && docBoutiqueId === `shop_${cleanPhone}`) ||
              (clean10 && (docPhone === clean10 || docPhone10 === clean10)) ||
              d.id === shopId ||
              (clean10 && d.id === `shop_${clean10}`);

            if (isMatch) {
              await deleteDoc(doc(db, colName, d.id)).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn(`Error cleaning up root collection ${colName}:`, err);
      }
    }

    // 4. If current session matches this boutique, clear local RoomDb data
    const currentBoutiqueId = roomDb.getBoutiqueId();
    const currentPhone = roomDb.getShopProfile().phoneNumber.replace(/\D/g, '');
    const currentPhone10 = currentPhone.length > 10 ? currentPhone.slice(-10) : currentPhone;
    if (
      shopId === currentBoutiqueId ||
      (clean10 && currentBoutiqueId === `shop_${clean10}`) ||
      (clean10 && currentPhone10 === clean10)
    ) {
      roomDb.clearCurrentBoutiqueData();
    }

    // 5. Notify server backend for audit logs & server state purge
    try {
      const token =
        adminToken ||
        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('shopscopers_admin_token') : null);
      await fetch(`/api/admin/boutiques/${encodeURIComponent(shopId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => {});
    } catch {}

    // 6. Update in-memory state & notify listeners
    inMemoryPlatformShops = inMemoryPlatformShops.filter(
      (s) =>
        s.id !== shopId &&
        (!clean10 || (s.id !== `shop_${clean10}` && s.phoneNumber.replace(/\D/g, '').slice(-10) !== clean10))
    );
    this.notifyListeners();

    return this.getShops();
  }
}
