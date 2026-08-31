import { ShopProfile, BoutiqueSubscription } from '../types';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  isPendingConfirmation: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPaidExpired: boolean;
  paidDaysLeft: number;
  daysLeft: number;
  totalTrialDays: number;
  signupDate: string;
  trialEndDate: string;
  planName: string;
  planTier: string;
  subscriptionPlan?: 'monthly' | 'annual';
  subscriptionExpiryDate?: string;
  priceFormatted: string;
  paymentId?: string;
  paymentMethod?: string;
  paymentSubmittedAt?: string;
}

export const MONTHLY_PRICE = 199;
export const ANNUAL_PRICE = 1999;

/**
 * Calculates the current boutique subscription, admin confirmation, and 1-month free trial status.
 * Accepts either the profile, a dedicated BoutiqueSubscription doc from Firestore, or both.
 */
export function getSubscriptionStatus(
  profile?: ShopProfile | null,
  subscriptionDoc?: BoutiqueSubscription | null
): SubscriptionStatus {
  const now = Date.now();

  const isPendingConfirmation =
    subscriptionDoc?.status === 'pending_confirmation' ||
    (!subscriptionDoc && profile?.subscriptionStatus === 'pending_confirmation');

  // Check if admin has activated the subscription via Subscription doc or profile
  const isDocActive = subscriptionDoc?.status === 'active';
  const hasActiveSubFlag = Boolean(
    !isPendingConfirmation &&
      (isDocActive ||
        profile?.subscriptionStatus === 'active' ||
        profile?.isSubscribed === true ||
        profile?.planTier === 'Annual Pro' ||
        profile?.planTier === 'Monthly Pro' ||
        profile?.planTier === 'Pro Multi-Device' ||
        profile?.planTier === 'Boutique Enterprise')
  );

  let paidDaysLeft = 0;
  let isSubscribed = false;
  let isPaidExpired = false;

  const expiryDateString = subscriptionDoc?.expiryDate || profile?.subscriptionExpiryDate;

  if (hasActiveSubFlag) {
    if (expiryDateString) {
      const expiryMs = new Date(expiryDateString).getTime();
      const diffMs = expiryMs - now;
      paidDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (paidDaysLeft > 0) {
        isSubscribed = true;
      } else {
        isSubscribed = false;
        isPaidExpired = true;
      }
    } else {
      isSubscribed = true;
      const plan = subscriptionDoc?.plan || profile?.subscriptionPlan;
      paidDaysLeft = plan === 'annual' ? 365 : 30;
    }
  }

  const totalTrialDays = profile?.trialDurationDays || 30; // 1 month free trial (30 days)

  // Determine exact signup date
  let signupIso = profile?.signupDate || profile?.registeredAt || subscriptionDoc?.createdAt;
  if (!signupIso) {
    const cleanPhone = (profile?.phoneNumber || subscriptionDoc?.phoneNumber || 'default').replace(/\D/g, '');
    const localKey = `boutique_signup_date_${cleanPhone}`;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(localKey);
        if (stored) {
          signupIso = stored;
        } else {
          signupIso = new Date().toISOString();
          localStorage.setItem(localKey, signupIso);
        }
      } catch {
        signupIso = new Date().toISOString();
      }
    } else {
      signupIso = new Date().toISOString();
    }
  }

  const signupTime = new Date(signupIso).getTime();
  const elapsedMs = Math.max(0, now - signupTime);
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const trialDaysLeft = Math.max(0, totalTrialDays - elapsedDays);

  const trialEndTime = new Date(signupTime + totalTrialDays * 24 * 60 * 60 * 1000);

  // When subscribed, the free trial banner and trial status are completely gone!
  const isTrialActive = !isSubscribed && !isPendingConfirmation && trialDaysLeft > 0;
  const isTrialExpired = !isSubscribed && !isPendingConfirmation && trialDaysLeft <= 0;

  const currentPlan =
    subscriptionDoc?.plan ||
    profile?.subscriptionPlan ||
    (profile?.planTier === 'Annual Pro' ? 'annual' : 'monthly');

  const planTier = isSubscribed
    ? currentPlan === 'annual' || profile?.planTier === 'Annual Pro'
      ? 'Annual Pro'
      : 'Monthly Pro'
    : isPendingConfirmation
    ? 'Verification Pending'
    : isPaidExpired
    ? 'Subscription Expired'
    : isTrialActive
    ? '1-Month Free Trial'
    : 'Trial Expired';

  const planName = isSubscribed
    ? currentPlan === 'annual' || profile?.planTier === 'Annual Pro'
      ? `Annual Pro (${paidDaysLeft} Days Active)`
      : `Monthly Pro (${paidDaysLeft} Days Active)`
    : isPendingConfirmation
    ? 'Payment Under Admin Review'
    : isPaidExpired
    ? 'License Expired - Renew'
    : isTrialActive
    ? `1-Month Free Trial (${trialDaysLeft}d left)`
    : 'Free Trial Expired';

  const priceFormatted = isSubscribed
    ? currentPlan === 'annual' || profile?.planTier === 'Annual Pro'
      ? '₹1,999/year'
      : '₹199/month'
    : isPendingConfirmation
    ? `₹${subscriptionDoc?.amount || profile?.subscriptionPrice || 199} (Pending Admin Approval)`
    : isTrialActive
    ? 'Free Trial (1 Month)'
    : 'Expired';

  return {
    isSubscribed,
    isPendingConfirmation,
    isTrialActive,
    isTrialExpired,
    isPaidExpired,
    paidDaysLeft,
    daysLeft: trialDaysLeft,
    totalTrialDays,
    signupDate: signupIso,
    trialEndDate: trialEndTime.toISOString(),
    planName,
    planTier,
    subscriptionPlan: currentPlan,
    subscriptionExpiryDate: expiryDateString,
    priceFormatted,
    paymentId: subscriptionDoc?.paymentId || profile?.paymentId,
    paymentMethod: subscriptionDoc?.paymentMethod || profile?.paymentMethod,
    paymentSubmittedAt: subscriptionDoc?.submittedAt || profile?.paymentSubmittedAt,
  };
}
