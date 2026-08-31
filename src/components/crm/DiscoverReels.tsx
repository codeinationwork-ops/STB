import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShoppingBag,
  Phone,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  Maximize2,
  Minimize2,
  Info,
  X,
  Share2,
  Check,
  Tag,
  Scissors,
  Eye,
  CheckCircle2,
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
  videoSrc?: string;
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
  videoUrl: string;
  posterUrl: string;
  photos: ReelPhotoItem[];
  likesCount: number;
  tags: string[];
  audioTrack: string;
  isStoreInventory?: boolean;
}

// Curated Showcase Fallback Data
export const BOUTIQUE_REELS_DATA: BoutiqueReelItem[] = [
  {
    id: 'reel-mulmul-1',
    title: 'Mulmul Ojas Yarn Dyed Cotton Kurta-Pant Set',
    category: 'MULMUL',
    price: 2750,
    originalPrice: 3499,
    fabric: 'Pure Yarn Dyed Organic Mulmul Cotton',
    stitchTime: 'Ready in Stock',
    description: 'Contemporary striped yarn-dyed cotton kurta paired with ivory straight trousers and tailored mandarin collar.',
    tailorNotes: 'Comfort tailored fit with custom shoulder and sleeve drop adjustments available.',
    videoUrl: '',
    posterUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=85',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=85',
        type: 'image',
        label: 'Front Model View',
      },
      {
        url: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1000&q=85',
        type: 'image',
        label: 'Yarn Stripe Weave Detail',
      },
      {
        url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=85',
        type: 'image',
        label: 'Fabric & Pant Fit Profile',
      },
      {
        url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=85',
        type: 'image',
        label: 'Collar & Button Stitching',
      },
    ],
    likesCount: 9,
    tags: ['#Mulmul', '#CottonSet', '#EthnicMen', '#KurtaPant'],
    audioTrack: 'Acoustic Sitar Vibes',
  },
  {
    id: 'reel-1',
    title: 'Royal Zardosi Handcrafted Bridal Blouse',
    category: 'BLOUSE',
    price: 3250,
    originalPrice: 4200,
    fabric: 'Pure Raw Silk with Gold Zari & Dabka Work',
    stitchTime: '3-4 Days Express Stitching',
    description: 'Intricate peacock neck cutwork, padded bridal lining, and customized dori with handcrafted latkans.',
    tailorNotes: 'Customized to your exact FitBook measurements. 100% fitting guarantee with free trial alteration.',
    videoUrl: '',
    posterUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
        type: 'image',
        label: 'Bridal Front Cut',
      },
      {
        url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
        type: 'image',
        label: 'Back Neck Zari Cutwork',
      },
      {
        url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
        type: 'image',
        label: 'Gold Dabka & Tassel Detail',
      },
    ],
    likesCount: 14,
    tags: ['#BridalBlouse', '#ZardosiWork', '#CustomFit'],
    audioTrack: 'Boutique Original • Sitar Lounge',
  },
  {
    id: 'reel-2',
    title: 'Heritage Banarasi Silk Anarkali Suit',
    category: 'SUIT',
    price: 4890,
    originalPrice: 6500,
    fabric: 'Pure Katan Silk with Organza Dupatta',
    stitchTime: '4-5 Days Stitching',
    description: 'Floor-length 32-kali flared Anarkali with scalloped zari borders and heavy can-can lining for royal flare.',
    tailorNotes: 'Pattern matched at all kali joints. Includes custom sleeve length & neck depth customization.',
    videoUrl: '',
    posterUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
        type: 'image',
        label: 'Royal Full Flare Silhouette',
      },
      {
        url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
        type: 'image',
        label: 'Katan Weave Ghera Detail',
      },
    ],
    likesCount: 28,
    tags: ['#BanarasiAnarkali', '#SilkFlairs', '#FestiveWear'],
    audioTrack: 'Royal Tabla & Flute Beats',
  },
];

interface DiscoverReelsProps {
  shopProfile?: ShopProfile;
  inventory?: InventoryItem[];
  customerPhone?: string;
  customerName?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const DiscoverReels: React.FC<DiscoverReelsProps> = ({
  shopProfile: propShopProfile,
  inventory: propInventory,
  customerPhone,
  customerName = 'Customer',
  onNavigateToTab,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [photoIndex, setPhotoIndex] = useState<number>(0);
  const [imageFitMode, setImageFitMode] = useState<'contain' | 'cover'>('contain');
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showLightbox, setShowLightbox] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Live real-time inventory state from Firestore & RoomDb
  const [liveInventory, setLiveInventory] = useState<InventoryItem[]>([]);
  const [liveShopProfile, setLiveShopProfile] = useState<ShopProfile | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const lastScrollTime = useRef<number>(0);

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

  // Subscribe directly to real-time RoomDB & Firestore updates
  useEffect(() => {
    // 1. Initial local roomDb read
    const localItems = roomDb.getInventory();
    if (localItems && localItems.length > 0) {
      setLiveInventory(localItems);
    }
    const localProfile = roomDb.getShopProfile();
    if (localProfile) {
      setLiveShopProfile(localProfile);
    }

    // 2. RoomDb listener
    const unsubRoom = roomDb.subscribe(() => {
      setLiveInventory([...roomDb.getInventory()]);
      setLiveShopProfile({ ...roomDb.getShopProfile() });
    });

    // 3. Direct Firestore real-time inventory synchronization
    const boutiqueId = `shop_${cleanShopPhone}`;
    let bDocs: InventoryItem[] = [];
    let rDocs: InventoryItem[] = [];

    const mergeRealtimeInventory = () => {
      const itemMap = new Map<string, InventoryItem>();
      rDocs.forEach((it) => itemMap.set(it.id, it));
      bDocs.forEach((it) => itemMap.set(it.id, { ...it, boutiqueId }));
      const merged = Array.from(itemMap.values());
      if (merged.length > 0) {
        setLiveInventory(merged);
      }
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
      (err) => console.warn('Boutique reel inventory sync note:', err.message)
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
      (err) => console.warn('Root reel inventory sync note:', err.message)
    );

    const unsubBoutiqueDoc = onSnapshot(
      doc(db, 'boutiques', boutiqueId),
      (snap) => {
        if (snap.exists()) {
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

    return () => {
      unsubRoom();
      unsubBoutiqueInv();
      unsubRootInv();
      unsubBoutiqueDoc();
    };
  }, [cleanShopPhone]);

  // Merge provided prop inventory with real-time inventory
  const effectiveInventory = useMemo<InventoryItem[]>(() => {
    if (propInventory && propInventory.length > 0) {
      return propInventory;
    }
    if (liveInventory.length > 0) {
      return liveInventory;
    }
    return roomDb.getInventory() || [];
  }, [propInventory, liveInventory]);

  // Convert real-time store inventory into reel format
  const inventoryReels: BoutiqueReelItem[] = useMemo(() => {
    return effectiveInventory.map((item, idx) => {
      // Collect all valid photo URLs
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

      const primaryImage =
        allPhotos[0] ||
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=85';

      const extraPhotos: ReelPhotoItem[] =
        allPhotos.length > 0
          ? allPhotos.map((img, i) => ({
              url: img,
              type: 'image' as const,
              label: `Angle ${i + 1}`,
            }))
          : [
              {
                url: primaryImage,
                type: 'image' as const,
                label: 'Garment View',
              },
            ];

      const priceNum = item.finalPrice || item.sellingPrice || item.price || 0;
      const originalPriceNum =
        item.price && item.price > priceNum
          ? item.price
          : item.discountPercent
          ? Math.round(priceNum / (1 - item.discountPercent / 100))
          : Math.round((priceNum || 1499) * 1.25);

      const sizesLabel =
        item.sizes && item.sizes.length > 0
          ? item.sizes
              .filter((s) => s.quantity > 0)
              .map((s) => `${s.size} (${s.quantity})`)
              .join(', ')
          : `${item.quantity ?? 1} in stock`;

      return {
        id: `inv-reel-${item.id || idx}`,
        title: item.name || 'Boutique Designer Piece',
        category: (item.category || item.gender || 'DESIGNER WEAR').toUpperCase(),
        price: priceNum,
        originalPrice: originalPriceNum,
        fabric: item.notes || item.category || 'Premium Artisan Garment',
        stitchTime: (item.quantity ?? 0) > 0 ? 'Ready in Store' : 'Made to Order',
        description: item.notes || `${item.category || 'Garment'} in stock at ${effectiveShopProfile.shopName || 'our boutique'}.`,
        tailorNotes: `SKU: ${item.sku || 'N/A'} • Sizes: ${sizesLabel}`,
        videoUrl: '',
        posterUrl: primaryImage,
        photos: extraPhotos,
        likesCount: 12 + ((idx * 7) % 35),
        tags: ['#InStock', `#${(item.gender || 'Fashion').replace(/\s+/g, '')}`, `#${(item.category || 'Boutique').replace(/\s+/g, '')}`],
        audioTrack: 'Boutique Live Showcase',
        isStoreInventory: true,
      };
    });
  }, [effectiveInventory, effectiveShopProfile.shopName]);

  // Prioritize real inventory reels; fallback to showcase data if inventory is empty
  const allReelsCombined: BoutiqueReelItem[] = useMemo(() => {
    if (inventoryReels.length > 0) {
      return inventoryReels;
    }
    return BOUTIQUE_REELS_DATA;
  }, [inventoryReels]);

  // All active reels
  const filteredReels = allReelsCombined;

  // Safe active reel item
  const currentReel: BoutiqueReelItem = useMemo(() => {
    if (filteredReels.length === 0) {
      return inventoryReels[0] || BOUTIQUE_REELS_DATA[0];
    }
    const safeIdx = Math.min(currentIndex, filteredReels.length - 1);
    return filteredReels[safeIdx];
  }, [filteredReels, currentIndex, inventoryReels]);

  const photosList = useMemo(() => {
    if (currentReel && currentReel.photos && currentReel.photos.length > 0) {
      return currentReel.photos;
    }
    return [
      {
        url: currentReel?.posterUrl || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=85',
        type: 'image' as const,
        label: 'Garment View',
      },
    ];
  }, [currentReel]);

  const activePhoto = useMemo(() => {
    const safePhotoIdx = Math.min(photoIndex, photosList.length - 1);
    return photosList[safePhotoIdx] || photosList[0];
  }, [photosList, photoIndex]);

  // Reset photo index when reel changes
  useEffect(() => {
    setPhotoIndex(0);
  }, [currentIndex]);

  const handleNextReel = () => {
    if (currentIndex < filteredReels.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrevReel = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(filteredReels.length - 1);
    }
  };

  const handleNextPhoto = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    if (photoIndex < photosList.length - 1) {
      setPhotoIndex(photoIndex + 1);
    } else {
      setPhotoIndex(0);
    }
  };

  const handlePrevPhoto = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    if (photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
    } else {
      setPhotoIndex(photosList.length - 1);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 450) return;
    if (Math.abs(e.deltaY) > 25) {
      lastScrollTime.current = now;
      if (e.deltaY > 0) {
        handleNextReel();
      } else {
        handlePrevReel();
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    touchStartY.current = null;
    touchStartX.current = null;

    if (Math.abs(deltaY) > 45 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > 0) {
        handleNextReel();
      } else {
        handlePrevReel();
      }
      return;
    }

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        handleNextPhoto();
      } else {
        handlePrevPhoto();
      }
    }
  };

  const handleWhatsAppBuy = (reel: BoutiqueReelItem) => {
    const price = `₹${reel.price.toLocaleString('en-IN')}`;
    const message = `Hello ${effectiveShopProfile.shopName || 'Boutique'}! I am interested in purchasing *${reel.title}* (${reel.category}, ${price}). Is this in stock for order or trial?`;
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

  const discountPercent = useMemo(() => {
    if (currentReel.originalPrice && currentReel.originalPrice > currentReel.price) {
      return Math.round(((currentReel.originalPrice - currentReel.price) / currentReel.originalPrice) * 100);
    }
    return 0;
  }, [currentReel]);

  return (
    <div className="w-full min-h-[100dvh] relative overflow-hidden flex items-center justify-center bg-slate-950 p-0 sm:py-3 select-none">
      {/* Outer ambient blur background for desktop viewport */}
      {activePhoto?.url && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden sm:block">
          <img
            key={`outer-bg-${currentReel.id}-${photoIndex}`}
            src={activePhoto.url}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover blur-3xl scale-125 opacity-40 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/80" />
        </div>
      )}

      {/* Main Mobile Card / Reel Container */}
      <div
        id="reels-card-container"
        ref={containerRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full max-w-[440px] h-[100dvh] sm:h-[860px] sm:max-h-[96vh] sm:rounded-[36px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] flex flex-col justify-between bg-slate-950 mx-auto border-0 sm:border-4 border-slate-800/80 z-10"
      >
        {/* ================= 1. PROPER PRODUCT IMAGE PRESENTATION LAYER ================= */}
        {activePhoto?.url ? (
          <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950 flex items-center justify-center">
            {/* Ambient Background Glow Layer (fills any empty frame naturally) */}
            <img
              key={`ambient-bg-${currentReel.id}-${photoIndex}`}
              src={activePhoto.url}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-35 transition-opacity duration-500 pointer-events-none"
            />

            {/* Main Foreground Hero Photo: Perfectly framed, uncropped & sharp */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <img
                key={`full-reel-img-${currentReel.id}-${photoIndex}-${imageFitMode}`}
                src={activePhoto.url}
                alt={currentReel.title}
                referrerPolicy="no-referrer"
                className={`w-full h-full transition-all duration-300 ${
                  imageFitMode === 'contain'
                    ? 'object-contain object-center scale-[0.98] drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)]'
                    : 'object-cover object-top'
                }`}
              />
            </div>

            {/* Subtle Sheer Gradient at Top for Header Legibility */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none z-10" />

            {/* Ultra-Soft Sheer Gradient at Bottom (Never blocks product fabric) */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-10" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 flex items-center justify-center text-white/50 text-base font-bold bg-slate-900">
            No image available
          </div>
        )}

        {/* ================= 2. TOP FLOATING HEADER BAR ================= */}
        <div className="relative w-full pt-3.5 px-3.5 pb-2 z-40 flex items-center justify-between pointer-events-auto">
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
            className="w-9 h-9 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* ShopScoper Brand Logo Pill */}
          <div className="flex items-center gap-1.5 cursor-default select-none px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 shadow-lg">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xs">
              <Sparkles className="w-3 h-3 text-white fill-white" />
            </div>
            <span className="text-white font-black text-xs tracking-tight drop-shadow-xs">
              Shop<span className="text-indigo-400">Scoper</span>
            </span>
          </div>

          {/* Right Controls: Fit Toggle + Boutique Name */}
          <div className="flex items-center gap-1.5">
            {/* Image Fit Mode Switcher (Fit Garment / Fill Screen) */}
            <button
              type="button"
              onClick={() => setImageFitMode(imageFitMode === 'contain' ? 'cover' : 'contain')}
              className="px-2.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 text-[10px] font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
              title={imageFitMode === 'contain' ? 'Switch to Full-Screen Cover' : 'Switch to Fit Entire Outfit'}
            >
              {imageFitMode === 'contain' ? (
                <>
                  <Maximize2 className="w-3 h-3 text-amber-300" />
                  <span className="hidden xs:inline">Fit</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3 h-3 text-emerald-300" />
                  <span className="hidden xs:inline">Fill</span>
                </>
              )}
            </button>

            {/* Boutique Name Badge */}
            <div className="max-w-[110px] sm:max-w-[130px] px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-[10px] font-black text-slate-200 uppercase tracking-wider truncate text-right shadow-md">
              {effectiveShopProfile.shopName || 'Rohit Sarees'}
            </div>
          </div>
        </div>

        {/* ================= 3. INTERACTIVE TAP ZONES FOR PHOTOS ================= */}
        <div className="relative flex-1 w-full z-20 pointer-events-auto flex">
          {/* Tap Left for Previous Photo (Invisible Tap Zone) */}
          <div
            id="reels-zone-prev-photo"
            onClick={handlePrevPhoto}
            className="w-1/2 h-full cursor-pointer"
            title="Tap for Previous Angle"
          />

          {/* Tap Right for Next Photo (Invisible Tap Zone) */}
          <div
            id="reels-zone-next-photo"
            onClick={handleNextPhoto}
            className="w-1/2 h-full cursor-pointer"
            title="Tap for Next Angle"
          />

          {/* FLOATING PHOTO CAROUSEL PILL & ZOOM BUTTON */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
            {/* Carousel Dots */}
            {photosList.length > 1 && (
              <div id="reels-photo-pagination" className="flex items-center gap-1.5 bg-black/40 backdrop-blur-xl px-2.5 py-1 rounded-full border border-white/15 shadow-xl">
                {photosList.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoIndex(idx);
                    }}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      idx === photoIndex
                        ? 'w-4 h-1.5 bg-amber-400 shadow-xs'
                        : 'w-1.5 h-1.5 bg-white/40 hover:bg-white'
                    }`}
                    title={`Angle ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Quick Full-Screen Lightbox Zoom Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(true);
              }}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-md border border-white/20 shadow-md cursor-pointer transition-all active:scale-95"
              title="Inspect Full Image & Embroidery Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* RIGHT FLOATING QUICK ACTIONS */}
          <div className="absolute right-3 bottom-12 z-30 flex flex-col items-center gap-2 pointer-events-auto">
            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              title="Share Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ================= 4. ULTRA-TRANSPARENT, SHEER FLOATING BOTTOM OVERLAY ================= */}
        <div
          id="reels-bottom-overlay"
          className="relative z-30 p-2.5 sm:p-3 pointer-events-auto shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {/* Glassmorphic Sheer Floating Capsule */}
          <div className="bg-slate-950/40 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.7)] space-y-2 text-left">
            {/* Row 1: Category Badge + Stock Status + Item Index */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-black tracking-wider uppercase text-amber-300 drop-shadow-xs truncate">
                  {currentReel.category || 'BOUTIQUE COLLECTION'}
                </span>
                {currentReel.stitchTime && (
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    <span>{currentReel.stitchTime}</span>
                  </span>
                )}
              </div>

              {/* Counter Indicator (e.g. 1 of 8) */}
              <div className="text-[10px] font-bold text-slate-300 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                {currentIndex + 1} / {filteredReels.length}
              </div>
            </div>

            {/* Row 2: Product Name (Crisp & High Contrast with soft drop-shadow) */}
            <h2 className="text-white font-black text-sm sm:text-base tracking-tight leading-snug uppercase line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {currentReel.title}
            </h2>

            {/* Row 3: Price + Discount Badge */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-white font-black text-lg sm:text-xl tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-mono">
                  ₹{currentReel.price.toLocaleString('en-IN')}
                </span>
                {currentReel.originalPrice && currentReel.originalPrice > currentReel.price && (
                  <span className="text-slate-400 text-xs font-semibold line-through">
                    ₹{currentReel.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-900/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Row 4: ACTION BUTTONS: [🛍️ Shop Direct] [📞 Call] */}
            <div className="flex items-center gap-2 pt-1">
              {/* Button 1: Shop Direct / Buy on WhatsApp */}
              <button
                id="reel-btn-shop-direct"
                type="button"
                onClick={() => handleWhatsAppBuy(currentReel)}
                className="flex-1 py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4 text-white shrink-0" />
                <span>Shop Direct</span>
              </button>

              {/* Button 2: Direct Phone Call */}
              <a
                id="reel-btn-call-boutique"
                href={`tel:${cleanShopPhone}`}
                className="py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-white/25 backdrop-blur-md shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Call Boutique"
              >
                <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Call</span>
              </a>
            </div>
          </div>

          {/* Bottom Mobile Home Indicator Line */}
          <div className="pt-1.5 flex justify-center">
            <div className="w-20 h-1 bg-white/30 rounded-full" />
          </div>
        </div>

        {/* ================= 5. FULL-SCREEN LIGHTBOX ZOOM MODAL ================= */}
        {showLightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-in fade-in duration-200"
            onClick={() => setShowLightbox(false)}
          >
            {/* Top Lightbox Controls */}
            <div className="w-full max-w-lg flex items-center justify-between text-white z-10 pt-2">
              <div className="text-xs font-bold text-slate-300">
                {currentReel.title} • {photosList[photoIndex]?.label || `Angle ${photoIndex + 1}`}
              </div>
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-Resolution Uncropped Lightbox Photo */}
            <div className="relative flex-1 w-full max-w-lg flex items-center justify-center my-auto overflow-hidden">
              <img
                src={activePhoto.url}
                alt={currentReel.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] object-contain drop-shadow-2xl rounded-xl animate-in zoom-in-95 duration-200"
              />
            </div>

            {/* Bottom Lightbox Controls */}
            <div className="w-full max-w-lg flex items-center justify-between text-white pb-2 z-10">
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Angle</span>
              </button>
              <span className="text-xs font-bold text-amber-300">
                {photoIndex + 1} of {photosList.length}
              </span>
              <button
                type="button"
                onClick={handleNextPhoto}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Next Angle</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


