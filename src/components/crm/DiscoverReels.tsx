import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShoppingBag,
  Phone,
  ArrowLeft,
  Sparkles,
  Share2,
  Check,
  CheckCircle2,
  RefreshCw,
  Store,
  MessageCircle,
} from 'lucide-react';
import { ShopProfile, InventoryItem } from '../../types';
import { getWhatsAppUrl, clean10DigitPhone } from '../../lib/phoneUtils';
import { roomDb } from '../../lib/localRoomDb';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';

export interface ReelPhotoItem {
  url: string;
  type: 'image' | 'video';
  label: string;
}

export interface BoutiqueReelItem {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  fabric: string;
  stitchTime: string;
  description: string;
  tailorNotes: string;
  posterUrl: string;
  photos: ReelPhotoItem[];
  isStoreInventory?: boolean;
}

interface DiscoverReelsProps {
  shopProfile?: ShopProfile;
  inventory?: InventoryItem[];
  customerPhone?: string;
  customerName?: string;
  onNavigateToTab?: (tab: string) => void;
  isLoading?: boolean;
}

export const DiscoverReels: React.FC<DiscoverReelsProps> = ({
  shopProfile: propShopProfile,
  inventory: propInventory,
  customerPhone,
  customerName = 'Customer',
  onNavigateToTab,
  isLoading: propIsLoading,
}) => {
  const [liveInventory, setLiveInventory] = useState<InventoryItem[]>([]);
  const [liveShopProfile, setLiveShopProfile] = useState<ShopProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [activeReelIndex, setActiveReelIndex] = useState<number>(0);
  const [photoIndices, setPhotoIndices] = useState<Record<string, number>>({});
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const effectiveShopProfile: ShopProfile = useMemo(() => {
    if (propShopProfile && propShopProfile.shopName && propShopProfile.shopName !== 'Boutique Shop') {
      return propShopProfile;
    }
    if (liveShopProfile && liveShopProfile.shopName) {
      return liveShopProfile;
    }
    const local = roomDb.getShopProfile();
    if (local && local.shopName) return local;
    return {
      shopName: 'Rohit Sarees',
      ownerName: 'Rohit',
      phoneNumber: '+91 7608807790',
      address: 'Main Market, City Center',
      upiId: '',
      gpayPhonePeNumber: '7608807790',
      upiQrCodeUrl: '',
      lastSyncedTimestamp: 'Real-time Live',
    };
  }, [propShopProfile, liveShopProfile]);

  const cleanShopPhone = clean10DigitPhone(
    customerPhone ||
    effectiveShopProfile.phoneNumber ||
    (effectiveShopProfile as any).phone ||
    '7608807790'
  ) || '7608807790';

  // Real-time synchronization directly with Firestore & LocalRoomDb
  useEffect(() => {
    let isMounted = true;
    const localItems = roomDb.getInventory();
    if (localItems && localItems.length > 0) {
      setLiveInventory(localItems);
      setIsSyncing(false);
    }
    const localProfile = roomDb.getShopProfile();
    if (localProfile) {
      setLiveShopProfile(localProfile);
    }

    const unsubRoom = roomDb.subscribe(() => {
      if (!isMounted) return;
      const latest = roomDb.getInventory();
      setLiveInventory([...latest]);
      setLiveShopProfile({ ...roomDb.getShopProfile() });
      setIsSyncing(false);
    });

    const boutiqueId = `shop_${cleanShopPhone}`;
    let bDocs: InventoryItem[] = [];
    let rDocs: InventoryItem[] = [];

    const mergeRealtimeInventory = () => {
      if (!isMounted) return;
      const itemMap = new Map<string, InventoryItem>();
      rDocs.forEach((it) => itemMap.set(it.id, it));
      bDocs.forEach((it) => itemMap.set(it.id, { ...it, boutiqueId }));
      const merged = Array.from(itemMap.values());
      if (merged.length > 0) {
        setLiveInventory(merged);
      }
      setIsSyncing(false);
    };

    const unsubBoutiqueInv = onSnapshot(
      collection(db, 'boutiques', boutiqueId, 'inventory'),
      (snap) => {
        bDocs = snap.docs.map((d) => ({
          ...(d.data() as InventoryItem),
          id: d.id,
        }));
        mergeRealtimeInventory();
      },
      (err) => {
        console.warn('Boutique reel inventory sync note:', err.message);
        if (isMounted) setIsSyncing(false);
      }
    );

    const unsubRootInv = onSnapshot(
      collection(db, 'inventory'),
      (snap) => {
        rDocs = snap.docs.map((d) => ({
          ...(d.data() as InventoryItem),
          id: d.id,
        }));
        mergeRealtimeInventory();
      },
      (err) => {
        console.warn('Root reel inventory sync note:', err.message);
        if (isMounted) setIsSyncing(false);
      }
    );

    const unsubBoutiqueDoc = onSnapshot(
      doc(db, 'boutiques', boutiqueId),
      (snap) => {
        if (snap.exists() && isMounted) {
          const data = snap.data();
          setLiveShopProfile({
            shopName: data.shopName || 'Rohit Sarees',
            ownerName: data.ownerName || 'Rohit',
            phoneNumber: data.phoneNumber || data.phone || cleanShopPhone,
            address: data.address || data.exactAddress || 'Main Market, City Center',
            upiId: data.upiId || '',
            gpayPhonePeNumber: data.gpayPhonePeNumber || cleanShopPhone,
            upiQrCodeUrl: data.upiQrCodeUrl || '',
            lastSyncedTimestamp: 'Real-time Live',
          });
        }
      },
      (err) => console.warn('Boutique reel profile sync note:', err.message)
    );

    const timer = setTimeout(() => {
      if (isMounted) setIsSyncing(false);
    }, 1200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      unsubRoom();
      unsubBoutiqueInv();
      unsubRootInv();
      unsubBoutiqueDoc();
    };
  }, [cleanShopPhone]);

  // Merge real-time items (strictly real items, zero demo mocks)
  const effectiveInventory = useMemo<InventoryItem[]>(() => {
    if (propInventory && propInventory.length > 0) {
      return propInventory;
    }
    if (liveInventory.length > 0) {
      return liveInventory;
    }
    return roomDb.getInventory() || [];
  }, [propInventory, liveInventory]);

  // Convert real store inventory into reels format
  const reelsList: BoutiqueReelItem[] = useMemo(() => {
    return effectiveInventory
      .filter((item) => item && (item.name || item.image || (item.photos && item.photos.length > 0)))
      .map((item, idx) => {
        const allPhotos: string[] = [];
        if (Array.isArray(item.photos)) {
          item.photos.forEach((p) => {
            if (p && typeof p === 'string' && p.trim()) allPhotos.push(p.trim());
          });
        }
        if (Array.isArray(item.selectedPhotos)) {
          item.selectedPhotos.forEach((p) => {
            if (p && typeof p === 'string' && p.trim() && !allPhotos.includes(p.trim())) {
              allPhotos.push(p.trim());
            }
          });
        }
        if (item.image && typeof item.image === 'string' && item.image.trim() && !allPhotos.includes(item.image.trim())) {
          allPhotos.unshift(item.image.trim());
        }

        const primaryImage = allPhotos[0] || '';

        const photoItems: ReelPhotoItem[] =
          allPhotos.length > 0
            ? allPhotos.map((img, i) => ({
                url: img,
                type: 'image' as const,
                label: `Angle ${i + 1}`,
              }))
            : primaryImage
            ? [
                {
                  url: primaryImage,
                  type: 'image' as const,
                  label: 'Garment View',
                },
              ]
            : [];

        const priceNum = item.finalPrice || item.sellingPrice || item.price || 0;
        const originalPriceNum =
          item.price && item.price > priceNum
            ? item.price
            : item.discountPercent
            ? Math.round(priceNum / (1 - item.discountPercent / 100))
            : undefined;

        const sizesLabel =
          item.sizes && item.sizes.length > 0
            ? item.sizes
                .filter((s) => s.quantity > 0)
                .map((s) => `${s.size} (${s.quantity})`)
                .join(', ')
            : `${item.quantity ?? 1} in stock`;

        return {
          id: item.id || `inv-reel-${idx}`,
          title: item.name || 'Designer Boutique Garment',
          category: (item.category || item.gender || 'BOUTIQUE COLLECTION').toUpperCase(),
          price: priceNum,
          originalPrice: originalPriceNum,
          fabric: item.notes || item.category || 'Premium Artisan Fabric',
          stitchTime: (item.quantity ?? 0) > 0 ? 'Ready in Store' : 'Available on Order',
          description: item.notes || `${item.name} available at ${effectiveShopProfile.shopName || 'our boutique'}.`,
          tailorNotes: `SKU: ${item.sku || 'N/A'} • Sizes: ${sizesLabel}`,
          posterUrl: primaryImage,
          photos: photoItems,
          isStoreInventory: true,
        };
      });
  }, [effectiveInventory, effectiveShopProfile.shopName]);

  // Set up intersection observer for physical reel snapping
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || reelsList.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = Number(entry.target.getAttribute('data-index') || 0);
            setActiveReelIndex(index);
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    reelRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reelsList]);

  // Cycle photo within active reel
  const handlePhotoNext = (reelId: string, totalPhotos: number, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    if (totalPhotos <= 1) return;
    setPhotoIndices((prev) => {
      const current = prev[reelId] || 0;
      return {
        ...prev,
        [reelId]: current < totalPhotos - 1 ? current + 1 : 0,
      };
    });
  };

  const handlePhotoPrev = (reelId: string, totalPhotos: number, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    if (totalPhotos <= 1) return;
    setPhotoIndices((prev) => {
      const current = prev[reelId] || 0;
      return {
        ...prev,
        [reelId]: current > 0 ? current - 1 : totalPhotos - 1,
      };
    });
  };

  // Keyboard up/down reel navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (reelsList.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(activeReelIndex + 1, reelsList.length - 1);
        reelRefs.current[nextIdx]?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(activeReelIndex - 1, 0);
        reelRefs.current[prevIdx]?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        const curReel = reelsList[activeReelIndex];
        if (curReel) handlePhotoNext(curReel.id, curReel.photos.length);
      } else if (e.key === 'ArrowLeft') {
        const curReel = reelsList[activeReelIndex];
        if (curReel) handlePhotoPrev(curReel.id, curReel.photos.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReelIndex, reelsList]);

  const handleWhatsAppBuy = (reel: BoutiqueReelItem) => {
    const price = reel.price > 0 ? `₹${reel.price.toLocaleString('en-IN')}` : 'Price on inquiry';
    const message = `Hello ${effectiveShopProfile.shopName || 'Boutique'}! I am viewing your live catalogue and I am interested in purchasing *${reel.title}* (${reel.category}, ${price}). Is this in stock?`;
    window.open(getWhatsAppUrl(cleanShopPhone, message), '_blank');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const isLoading = propIsLoading || (isSyncing && reelsList.length === 0);

  // 1. LOADING SHIMMER STATE (Never show fake demo items while connecting)
  if (isLoading && reelsList.length === 0) {
    return (
      <div className="w-full h-[100dvh] fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 select-none">
        {/* Top Header Placeholder */}
        <div className="w-full max-w-[440px] flex items-center justify-between py-4 px-2">
          <div className="w-9 h-9 rounded-full bg-slate-900 animate-pulse" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-slate-300">ShopScoper Live</span>
          </div>
          <div className="w-20 h-6 rounded-full bg-slate-900 animate-pulse" />
        </div>

        {/* Shimmering Center Frame */}
        <div className="w-full max-w-[440px] flex-1 rounded-3xl bg-slate-900/80 border border-slate-800/80 flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="w-24 h-24 rounded-full bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center mb-4">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
          </div>
          <h3 className="text-white font-black text-lg text-center tracking-tight">
            Connecting to Live Catalogue...
          </h3>
          <p className="text-xs text-slate-400 text-center max-w-xs mt-1.5 font-medium">
            Fetching real-time inventory from {effectiveShopProfile.shopName || 'Boutique'}
          </p>

          {/* Shimmering Bottom Card Placeholder */}
          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="w-28 h-3.5 bg-slate-800 rounded-md animate-pulse" />
            <div className="w-48 h-4 bg-slate-800 rounded-md animate-pulse" />
            <div className="w-20 h-5 bg-slate-800 rounded-md animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 2. EMPTY REAL-TIME INVENTORY STATE (No items uploaded yet by boutique)
  if (reelsList.length === 0) {
    return (
      <div className="w-full h-[100dvh] fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-[440px] h-full flex flex-col justify-between py-6">
          {/* Header */}
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.reload();
                }
              }}
              className="w-9 h-9 rounded-full bg-slate-900 text-white border border-slate-800 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-white">{effectiveShopProfile.shopName || 'Boutique'}</span>
            </div>
            <div className="w-9" />
          </div>

          {/* Center Card */}
          <div className="my-auto p-6 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Store className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-white font-black text-xl tracking-tight">
                Catalogue Updating
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                {effectiveShopProfile.shopName || 'This boutique'} is currently adding fresh collections to their live catalogue.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <a
                href={getWhatsAppUrl(cleanShopPhone, `Hello ${effectiveShopProfile.shopName}! I scanned your catalogue. Please share your latest available collections.`)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>Chat on WhatsApp</span>
              </a>

              <a
                href={`tel:${cleanShopPhone}`}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition-all"
              >
                <Phone className="w-4 h-4 text-amber-300" />
                <span>Call {effectiveShopProfile.shopName}</span>
              </a>
            </div>
          </div>

          {/* Footer Info */}
          <p className="text-[11px] text-slate-500 text-center font-medium">
            ShopScoper Live Boutique Scanner • Real-time
          </p>
        </div>
      </div>
    );
  }

  // 3. FULL NATIVE-FEEL VERTICAL SNAP REELS CONTAINER
  return (
    <div className="w-full h-[100dvh] fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden font-sans">
      {/* Outer ambient blur background for desktop viewport */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden sm:block">
        {reelsList[activeReelIndex]?.posterUrl && (
          <img
            src={reelsList[activeReelIndex].posterUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover blur-3xl scale-125 opacity-30 transition-all duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90" />
      </div>

      {/* Main App-Frame Wrapper: Full-screen on mobile, centered phone shell on desktop */}
      <div className="relative w-full h-[100dvh] sm:max-w-[430px] sm:h-[880px] sm:max-h-[96vh] sm:rounded-[36px] sm:border-4 sm:border-slate-800/80 overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col bg-black z-10">
        {/* ================= FIXED TOP APP HEADER ================= */}
        <header className="absolute top-0 left-0 right-0 z-40 px-3.5 pt-3.5 pb-2 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/85 via-black/40 to-transparent">
          {/* Back Button */}
          <button
            id="reels-back-btn"
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.reload();
              }
            }}
            className="w-9 h-9 rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* ShopScoper Brand Logo Pill */}
          <div className="flex items-center gap-1.5 cursor-default select-none px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 shadow-lg">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xs">
              <Sparkles className="w-2.5 h-2.5 text-white fill-white" />
            </div>
            <span className="text-white font-black text-xs tracking-tight drop-shadow-xs">
              Shop<span className="text-indigo-400">Scoper</span>
            </span>
          </div>

          {/* Boutique Name Badge */}
          <div className="max-w-[130px] px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[10px] font-black text-slate-200 uppercase tracking-wider truncate text-right shadow-md">
            {effectiveShopProfile.shopName || 'Rohit Sarees'}
          </div>
        </header>

        {/* ================= VERTICAL SNAP-SCROLL REELS CONTAINER ================= */}
        <div
          ref={scrollContainerRef}
          id="reels-snap-scroll-container"
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
        >
          {reelsList.map((reel, index) => {
            const currentPhotoIdx = photoIndices[reel.id] || 0;
            const photos = reel.photos.length > 0 ? reel.photos : [{ url: reel.posterUrl, type: 'image' as const, label: 'Front' }];
            const activePhoto = photos[Math.min(currentPhotoIdx, photos.length - 1)] || photos[0];
            const discountPercent =
              reel.originalPrice && reel.originalPrice > reel.price
                ? Math.round(((reel.originalPrice - reel.price) / reel.originalPrice) * 100)
                : 0;

            return (
              <div
                key={reel.id}
                data-index={index}
                ref={(el) => {
                  reelRefs.current[index] = el;
                }}
                className="w-full h-full min-h-[100dvh] sm:min-h-full snap-start snap-always relative shrink-0 overflow-hidden flex flex-col justify-between bg-black"
              >
                {/* ================= 1. FULL-BLEED SCREEN-FILLING IMAGE LAYER ================= */}
                <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
                  {/* Full Bleed High-Resolution Product Image Filling the Entire Screen */}
                  {activePhoto?.url ? (
                    <img
                      src={activePhoto.url}
                      alt={reel.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-300"
                    />
                  ) : (
                    <div className="text-white/40 font-bold text-sm">No photo available</div>
                  )}

                  {/* Gradient Vignettes for Header and Bottom Overlay Legibility */}
                  <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
                  <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none z-10" />
                </div>

                {/* ================= 2. HORIZONTAL PHOTO TAP NAVIGATION ZONES ================= */}
                <div className="relative flex-1 w-full z-20 pointer-events-auto flex">
                  {/* Left Half: Tap for Previous Photo Angle */}
                  <div
                    onClick={(e) => handlePhotoPrev(reel.id, photos.length, e)}
                    className="w-1/2 h-full cursor-pointer"
                    title="Tap for Previous Angle"
                  />

                  {/* Right Half: Tap for Next Photo Angle */}
                  <div
                    onClick={(e) => handlePhotoNext(reel.id, photos.length, e)}
                    className="w-1/2 h-full cursor-pointer"
                    title="Tap for Next Angle"
                  />

                  {/* Photo Pagination Pill Indicator (if multiple angles) */}
                  {photos.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/50 backdrop-blur-xl px-2.5 py-1 rounded-full border border-white/15 shadow-xl pointer-events-auto">
                      {photos.map((_, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoIndices((prev) => ({ ...prev, [reel.id]: pIdx }));
                          }}
                          className={`transition-all duration-300 rounded-full cursor-pointer ${
                            pIdx === currentPhotoIdx
                              ? 'w-4 h-1.5 bg-amber-400 shadow-xs'
                              : 'w-1.5 h-1.5 bg-white/40 hover:bg-white'
                          }`}
                          title={`Angle ${pIdx + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Floating Share Button on Right Side */}
                  <div className="absolute right-3.5 bottom-8 z-30 flex flex-col items-center gap-2 pointer-events-auto">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                      title="Share Reel Link"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ================= 3. FLOATING BOTTOM GARMENT DETAILS CAPSULE ================= */}
                <div
                  id={`reel-bottom-card-${reel.id}`}
                  className="relative z-30 p-2.5 sm:p-3 pointer-events-auto shrink-0 pb-4 sm:pb-3"
                >
                  <div className="bg-slate-950/50 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.85)] space-y-2 text-left">
                    {/* Row 1: Category Badge + Stock Status + Item Position */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-black tracking-wider uppercase text-amber-300 drop-shadow-xs truncate">
                          {reel.category}
                        </span>
                        {reel.stitchTime && (
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{reel.stitchTime}</span>
                          </span>
                        )}
                      </div>

                      {/* Reel Index (e.g. 1 / 4) */}
                      <div className="text-[10px] font-bold text-slate-300 bg-black/50 px-2 py-0.5 rounded-full border border-white/10 shrink-0 font-mono">
                        {index + 1} / {reelsList.length}
                      </div>
                    </div>

                    {/* Row 2: Product Name (Crisp & Legible) */}
                    <h2 className="text-white font-black text-sm sm:text-base tracking-tight leading-snug uppercase line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {reel.title}
                    </h2>

                    {/* Row 3: Price & Discount */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-white font-black text-lg sm:text-xl tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-mono">
                          {reel.price > 0 ? `₹${reel.price.toLocaleString('en-IN')}` : 'Price on Inquiry'}
                        </span>
                        {reel.originalPrice && reel.originalPrice > reel.price && (
                          <span className="text-slate-400 text-xs font-semibold line-through">
                            ₹{reel.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                        {discountPercent > 0 && (
                          <span className="text-[10px] font-black text-emerald-300 bg-emerald-900/70 border border-emerald-500/40 px-1.5 py-0.5 rounded-md">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      {reel.fabric && (
                        <span className="text-[10px] text-slate-300 font-medium truncate max-w-[140px]">
                          {reel.fabric}
                        </span>
                      )}
                    </div>

                    {/* Row 4: Action Buttons [🛍️ Shop Direct] [📞 Call] */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* Shop Direct WhatsApp Button */}
                      <button
                        type="button"
                        onClick={() => handleWhatsAppBuy(reel)}
                        className="flex-1 py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <ShoppingBag className="w-4 h-4 text-white shrink-0" />
                        <span>Shop Direct</span>
                      </button>

                      {/* Direct Phone Call Button */}
                      <a
                        href={`tel:${cleanShopPhone}`}
                        className="py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-white/25 backdrop-blur-md shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                        title="Call Boutique"
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>

                  {/* Subtle Home Pill Line */}
                  <div className="pt-1.5 flex justify-center">
                    <div className="w-16 h-1 bg-white/25 rounded-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
