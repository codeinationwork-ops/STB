import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { BoutiqueSubscription } from '../types';
import { MONTHLY_PRICE, ANNUAL_PRICE } from './subscriptionUtils';

const SUBSCRIPTION_COLLECTION = 'Subscription';
const SUBSCRIPTION_ALIAS = 'subscriptions';
const BOUTIQUES_COLLECTION = 'boutiques';

class SubscriptionManager {
  private localCache: Map<string, BoutiqueSubscription> = new Map();

  constructor() {
    this.restoreFromLocal();
  }

  private getStorageKey(boutiqueId: string) {
    return `subscription_data_${boutiqueId.replace(/\D/g, '') || boutiqueId}`;
  }

  private restoreFromLocal() {
    if (typeof window === 'undefined') return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('subscription_data_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.boutiqueId) {
              this.localCache.set(parsed.boutiqueId, parsed);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  private persistLocal(sub: BoutiqueSubscription) {
    if (typeof window === 'undefined') return;
    try {
      this.localCache.set(sub.boutiqueId, sub);
      localStorage.setItem(this.getStorageKey(sub.boutiqueId), JSON.stringify(sub));
    } catch {
      // ignore
    }
  }

  /**
   * Submit a payment directly to the dedicated Firestore 'Subscription' collection.
   */
  async submitSubscriptionPayment(
    boutiqueId: string,
    shopInfo: {
      shopName?: string;
      ownerName?: string;
      phoneNumber?: string;
    },
    plan: 'monthly' | 'annual',
    paymentDetails: {
      paymentId: string;
      paymentMethod: string;
      amountPaid?: number;
    }
  ): Promise<BoutiqueSubscription> {
    const cleanId = (boutiqueId || 'boutique_main').replace(/\s+/g, '_');
    const amount = paymentDetails.amountPaid || (plan === 'annual' ? ANNUAL_PRICE : MONTHLY_PRICE);
    const nowIso = new Date().toISOString();

    const newSubscription: BoutiqueSubscription = {
      id: cleanId,
      boutiqueId: cleanId,
      shopId: cleanId,
      shopName: shopInfo.shopName || 'Boutique Studio',
      ownerName: shopInfo.ownerName || 'Boutique Owner',
      phoneNumber: shopInfo.phoneNumber || '',
      plan,
      planName: plan === 'annual' ? 'Annual Pro License (365 Days)' : 'Monthly Pro License (30 Days)',
      amount,
      currency: 'INR',
      paymentId: paymentDetails.paymentId,
      paymentMethod: paymentDetails.paymentMethod,
      status: 'pending_confirmation',
      submittedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Save locally first for instant optimistic response
    this.persistLocal(newSubscription);

    // Save directly to the dedicated 'Subscription' Firestore collection
    try {
      const subRef = doc(db, SUBSCRIPTION_COLLECTION, cleanId);
      await setDoc(subRef, newSubscription, { merge: true });

      // Mirror to alias collection
      const aliasRef = doc(db, SUBSCRIPTION_ALIAS, cleanId);
      await setDoc(aliasRef, newSubscription, { merge: true });

      // Update boutique document status reference in 'boutiques' collection
      const boutiqueRef = doc(db, BOUTIQUES_COLLECTION, cleanId);
      await setDoc(
        boutiqueRef,
        {
          subscriptionStatus: 'pending_confirmation',
          subscriptionPlan: plan,
          subscriptionPrice: amount,
          paymentId: paymentDetails.paymentId,
          paymentMethod: paymentDetails.paymentMethod,
          paymentSubmittedAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Subscription Firestore write deferred or offline:', err);
    }

    return newSubscription;
  }

  /**
   * Approve a subscription from Admin Verification Portal.
   */
  async approveSubscription(
    boutiqueId: string,
    unlockDays?: number
  ): Promise<BoutiqueSubscription | null> {
    const cleanId = (boutiqueId || 'boutique_main').replace(/\s+/g, '_');
    const existing = this.localCache.get(cleanId) || (await this.getBoutiqueSubscription(cleanId));

    const defaultDays = existing?.plan === 'annual' ? 365 : 30;
    const finalDays = unlockDays && unlockDays > 0 ? unlockDays : defaultDays;
    const nowMs = Date.now();
    const expiryMs = nowMs + finalDays * 24 * 60 * 60 * 1000;
    const nowIso = new Date(nowMs).toISOString();
    const expiryIso = new Date(expiryMs).toISOString();

    const updatedSub: BoutiqueSubscription = {
      ...(existing || {
        id: cleanId,
        boutiqueId: cleanId,
        shopName: 'Boutique Studio',
        ownerName: 'Boutique Owner',
        phoneNumber: '',
        plan: finalDays >= 365 ? 'annual' : 'monthly',
        planName: finalDays >= 365 ? 'Annual Pro License (365 Days)' : 'Monthly Pro License (30 Days)',
        amount: finalDays >= 365 ? ANNUAL_PRICE : MONTHLY_PRICE,
        currency: 'INR',
        paymentId: `TXN_${Math.floor(10000000 + Math.random() * 90000000)}`,
        paymentMethod: 'UPI (Admin Approved)',
        submittedAt: nowIso,
        createdAt: nowIso,
      }),
      status: 'active',
      confirmedAt: nowIso,
      confirmedDays: finalDays,
      startDate: nowIso,
      expiryDate: expiryIso,
      updatedAt: nowIso,
    };

    this.persistLocal(updatedSub);

    try {
      // 1. Update in Subscription collection
      const subRef = doc(db, SUBSCRIPTION_COLLECTION, cleanId);
      await setDoc(subRef, updatedSub, { merge: true });

      const aliasRef = doc(db, SUBSCRIPTION_ALIAS, cleanId);
      await setDoc(aliasRef, updatedSub, { merge: true });

      // 2. Unlock boutique in boutiques collection
      const boutiqueRef = doc(db, BOUTIQUES_COLLECTION, cleanId);
      await setDoc(
        boutiqueRef,
        {
          isSubscribed: true,
          subscriptionStatus: 'active',
          subscriptionPlan: updatedSub.plan,
          subscriptionExpiryDate: expiryIso,
          subscriptionStartDate: nowIso,
          confirmedByAdminAt: nowIso,
          confirmedDays: finalDays,
          planTier: updatedSub.plan === 'annual' ? 'Annual Pro' : 'Monthly Pro',
          status: 'Active',
          isVerified: true,
          verificationStatus: 'verified',
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Subscription approval Firestore write deferred:', err);
    }

    return updatedSub;
  }

  /**
   * Reject a subscription from Admin Verification Portal.
   */
  async rejectSubscription(
    boutiqueId: string,
    reason?: string
  ): Promise<BoutiqueSubscription | null> {
    const cleanId = (boutiqueId || 'boutique_main').replace(/\s+/g, '_');
    const existing = this.localCache.get(cleanId) || (await this.getBoutiqueSubscription(cleanId));
    const nowIso = new Date().toISOString();

    const updatedSub: BoutiqueSubscription = {
      ...(existing || {
        id: cleanId,
        boutiqueId: cleanId,
        shopName: 'Boutique Studio',
        ownerName: 'Boutique Owner',
        phoneNumber: '',
        plan: 'monthly',
        planName: 'Monthly Pro License',
        amount: MONTHLY_PRICE,
        currency: 'INR',
        paymentId: 'TXN_REJECTED',
        paymentMethod: 'UPI',
        submittedAt: nowIso,
        createdAt: nowIso,
      }),
      status: 'rejected',
      rejectionReason: reason || 'Payment proof could not be verified by Admin.',
      updatedAt: nowIso,
    };

    this.persistLocal(updatedSub);

    try {
      const subRef = doc(db, SUBSCRIPTION_COLLECTION, cleanId);
      await setDoc(subRef, updatedSub, { merge: true });

      const aliasRef = doc(db, SUBSCRIPTION_ALIAS, cleanId);
      await setDoc(aliasRef, updatedSub, { merge: true });

      const boutiqueRef = doc(db, BOUTIQUES_COLLECTION, cleanId);
      await setDoc(
        boutiqueRef,
        {
          isSubscribed: false,
          subscriptionStatus: 'rejected',
          rejectionReason: reason || 'Payment not verified',
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Subscription rejection Firestore write deferred:', err);
    }

    return updatedSub;
  }

  /**
   * Fetch a single boutique's subscription directly from Firestore 'Subscription' collection.
   */
  async getBoutiqueSubscription(boutiqueId: string): Promise<BoutiqueSubscription | null> {
    const cleanId = (boutiqueId || 'boutique_main').replace(/\s+/g, '_');
    try {
      const subRef = doc(db, SUBSCRIPTION_COLLECTION, cleanId);
      const snap = await getDoc(subRef);
      if (snap.exists()) {
        const data = snap.data() as BoutiqueSubscription;
        this.persistLocal(data);
        return data;
      }
    } catch {
      // fallback to local
    }
    return this.localCache.get(cleanId) || null;
  }

  /**
   * Real-time listener for a single boutique's subscription document in 'Subscription' collection.
   */
  subscribeToBoutiqueSubscription(
    boutiqueId: string,
    callback: (sub: BoutiqueSubscription | null) => void
  ): () => void {
    const cleanId = (boutiqueId || 'boutique_main').replace(/\s+/g, '_');

    // Immediate callback with cached value if available
    const cached = this.localCache.get(cleanId);
    if (cached) {
      callback(cached);
    }

    try {
      const subRef = doc(db, SUBSCRIPTION_COLLECTION, cleanId);
      const unsubscribe = onSnapshot(
        subRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as BoutiqueSubscription;
            this.persistLocal(data);
            callback(data);
          } else {
            callback(null);
          }
        },
        (err) => {
          console.warn('Subscription realtime listener error:', err);
          callback(this.localCache.get(cleanId) || null);
        }
      );
      return unsubscribe;
    } catch {
      return () => {};
    }
  }

  /**
   * Real-time listener for all subscriptions in 'Subscription' collection (Admin Portal).
   */
  subscribeToAllSubscriptions(callback: (subs: BoutiqueSubscription[]) => void): () => void {
    try {
      const subCol = collection(db, SUBSCRIPTION_COLLECTION);
      const unsubscribe = onSnapshot(
        subCol,
        (snap) => {
          const list: BoutiqueSubscription[] = [];
          snap.forEach((docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as BoutiqueSubscription;
              list.push(data);
              this.persistLocal(data);
            }
          });
          callback(list);
        },
        (err) => {
          console.warn('All Subscriptions realtime listener error:', err);
          const cachedList = Array.from(this.localCache.values());
          callback(cachedList);
        }
      );
      return unsubscribe;
    } catch {
      return () => {};
    }
  }

  /**
   * Get all subscriptions from Firestore.
   */
  async getAllSubscriptions(): Promise<BoutiqueSubscription[]> {
    try {
      const subCol = collection(db, SUBSCRIPTION_COLLECTION);
      const snap = await getDocs(subCol);
      const list: BoutiqueSubscription[] = [];
      snap.forEach((d) => {
        if (d.exists()) {
          const item = d.data() as BoutiqueSubscription;
          list.push(item);
          this.persistLocal(item);
        }
      });
      return list;
    } catch {
      return Array.from(this.localCache.values());
    }
  }
}

export const SubscriptionService = new SubscriptionManager();
