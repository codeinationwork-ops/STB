import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  Sparkles,
  Phone,
  MessageSquare,
  MapPin,
  Tag,
  CheckCircle2,
  Share2,
  ArrowLeft,
  Filter,
  Eye,
  Store,
  Layers,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  X,
  Film,
  Grid,
  Bookmark,
  RefreshCw,
} from 'lucide-react';
import { InventoryItem, ShopProfile } from '../../types';
import { getWhatsAppUrl, clean10DigitPhone } from '../../lib/phoneUtils';
import { DiscoverReels } from './DiscoverReels';
import { roomDb } from '../../lib/localRoomDb';
import { db } from '../../lib/firebase';
import { doc, collection, onSnapshot } from 'firebase/firestore';

interface LivePublicCataloguePageProps {
  shopPhoneParam?: string;
  shopScoperCodeParam?: string;
  shopProfile?: ShopProfile;
  inventory?: InventoryItem[];
  onNavigateHome?: () => void;
}

export const LivePublicCataloguePage: React.FC<LivePublicCataloguePageProps> = ({
  shopPhoneParam,
  shopScoperCodeParam,
  shopProfile: propShopProfile,
  inventory: propInventory = [],
  onNavigateHome,
}) => {
  // Live state from Firestore
  const [firestoreShopProfile, setFirestoreShopProfile] = useState<ShopProfile | null>(null);
  const [firestoreInventory, setFirestoreInventory] = useState<InventoryItem[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(true);

  const cleanPhone = clean10DigitPhone(shopPhoneParam || propShopProfile?.phoneNumber || roomDb.getShopProfile().phoneNumber) || '7608807790';
  const effectiveScCode = shopScoperCodeParam || `SHOPSCOPER-${cleanPhone}`;

  // Direct Live Firestore synchronization for public scanner / visitor
  useEffect(() => {
    let isCancelled = false;
    const boutiqueIdWithPrefix = `shop_${cleanPhone}`;
    const boutiqueIdRaw = cleanPhone;

    // 1. Listen for Boutique profile in Firestore
    const unsubBoutiqueDoc = onSnapshot(
      doc(db, 'boutiques', boutiqueIdWithPrefix),
      (docSnap) => {
        if (docSnap.exists() && !isCancelled) {
          const data = docSnap.data();
          setFirestoreShopProfile({
            shopName: data.shopName || 'Rohit Sarees',
            ownerName: data.ownerName || 'Rohit',
            phoneNumber: data.phoneNumber || data.phone || cleanPhone,
            address: data.address || data.exactAddress || 'Main Market, City Center',
            upiId: data.upiId || '',
            gpayPhonePeNumber: data.gpayPhonePeNumber || cleanPhone,
            upiQrCodeUrl: data.upiQrCodeUrl || '',
            lastSyncedTimestamp: 'Real-time Live',
          });
        }
      },
      (err) => console.warn('Public boutique doc sync note:', err.message)
    );

    // 2. Listen for Boutique inventory in Firestore (subcollection + root collection)
    let bItems: InventoryItem[] = [];
    let rItems: InventoryItem[] = [];

    const mergeAndSetInventory = () => {
      if (isCancelled) return;
      const itemMap = new Map<string, InventoryItem>();

      // Filter matching root items for this boutique, or all if root belongs to this shop
      rItems.forEach((it) => {
        if (!it.boutiqueId || it.boutiqueId === boutiqueIdWithPrefix || it.boutiqueId === boutiqueIdRaw) {
          itemMap.set(it.id, it);
        } else {
          // If boutiqueId doesn't strictly match, still include if it matches phone or is only store item
          itemMap.set(it.id, it);
        }
      });

      // Override or add boutique-specific items
      bItems.forEach((it) => {
        itemMap.set(it.id, { ...it, boutiqueId: boutiqueIdWithPrefix });
      });

      const mergedList = Array.from(itemMap.values());
      if (mergedList.length > 0) {
        setFirestoreInventory(mergedList);
      }
      setIsLiveLoading(false);
    };

    const unsubBoutiqueInv = onSnapshot(
      collection(db, 'boutiques', boutiqueIdWithPrefix, 'inventory'),
      (snap) => {
        bItems = snap.docs.map((d) => ({
          ...(d.data() as InventoryItem),
          id: d.id,
        }));
        mergeAndSetInventory();
      },
      (err) => console.warn('Public boutique subcollection inventory sync note:', err.message)
    );

    const unsubRootInv = onSnapshot(
      collection(db, 'inventory'),
      (snap) => {
        rItems = snap.docs.map((d) => ({
          ...(d.data() as InventoryItem),
          id: d.id,
        }));
        mergeAndSetInventory();
      },
      (err) => console.warn('Public root inventory sync note:', err.message)
    );

    return () => {
      isCancelled = true;
      unsubBoutiqueDoc();
      unsubBoutiqueInv();
      unsubRootInv();
    };
  }, [cleanPhone]);

  const shopProfile: ShopProfile = useMemo(() => {
    if (firestoreShopProfile) return firestoreShopProfile;
    if (propShopProfile && propShopProfile.shopName && propShopProfile.shopName !== 'Boutique Shop') {
      return propShopProfile;
    }
    const local = roomDb.getShopProfile();
    if (local && local.shopName && local.shopName !== 'Boutique Shop') {
      return local;
    }
    return {
      shopName: 'Rohit Sarees',
      ownerName: 'Rohit',
      phoneNumber: cleanPhone,
      address: 'Main Market, City Center',
      upiId: '',
      gpayPhonePeNumber: cleanPhone,
      upiQrCodeUrl: '',
      lastSyncedTimestamp: 'Real-time Live',
    };
  }, [firestoreShopProfile, propShopProfile, cleanPhone]);

  const inventory: InventoryItem[] = useMemo(() => {
    if (firestoreInventory.length > 0) return firestoreInventory;
    if (propInventory && propInventory.length > 0) return propInventory;
    const localInv = roomDb.getInventory();
    if (localInv && localInv.length > 0) return localInv;
    return [];
  }, [firestoreInventory, propInventory]);

  // Default to 'reels' mode as requested to connect scanner directly to catalogue in reel-style view
  const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'Men' | 'Women' | 'Unisex' | 'Kids'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activePhotoModalItem, setActivePhotoModalItem] = useState<InventoryItem | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  const shopName = shopProfile.shopName || 'Rohit Sarees';
  const ownerName = shopProfile.ownerName || 'Rohit';
  const address = shopProfile.address || 'Main Market, City Center';

  // Categories present in inventory
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [inventory]);

  // Filtered inventory for Grid view
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      const matchGender =
        selectedGender === 'ALL' ||
        item.gender === selectedGender ||
        (!item.gender && selectedGender === 'Unisex');

      const matchCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;

      return matchSearch && matchGender && matchCategory;
    });
  }, [inventory, searchQuery, selectedGender, selectedCategory]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleInquireWhatsApp = (item: InventoryItem) => {
    const price = item.finalPrice || item.price || item.sellingPrice || 0;
    const priceText = price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Price on inquiry';
    const message = `Hello ${shopName}! I scanned your ShopScoper QR Code [${effectiveScCode}] and I am interested in *${item.name}* (${item.category}, ${priceText}). Is this available in stock?`;
    window.open(getWhatsAppUrl(cleanPhone, message), '_blank');
  };

  return (
    <div className="min-h-[100dvh] bg-black text-slate-100 flex flex-col font-sans">
      {/* VIEW MODE 1: REELS CARD FULL-SCREEN VIEW (DEFAULT) */}
      {viewMode === 'reels' ? (
        <main className="w-full h-full flex-1 flex items-center justify-center p-0">
          <DiscoverReels
            shopProfile={shopProfile}
            inventory={inventory}
            customerPhone={cleanPhone}
            customerName="Customer"
          />
        </main>
      ) : (
        /* VIEW MODE 2: CLASSIC GRID VIEW */
        <>
          {/* Top ShopScoper Scannable Live Banner for Grid Mode */}
          <header className="bg-gradient-to-r from-[#041d16] via-[#0B4636] to-[#072C21] border-b border-emerald-500/30 sticky top-0 z-40 shadow-xl backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {onNavigateHome && (
                  <button
                    onClick={onNavigateHome}
                    className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                    title="Go to App Home"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 font-black shadow-inner shrink-0 text-xs sm:text-base">
                  ✦
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] uppercase tracking-wider">
                      ShopScoper Live
                    </span>
                    <span className="font-mono text-[9px] sm:text-[10px] text-emerald-300 font-bold bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/40 truncate max-w-[130px] sm:max-w-none">
                      {effectiveScCode}
                    </span>
                  </div>
                  <h1 className="text-sm sm:text-lg font-black text-white tracking-tight mt-0.5 leading-tight truncate">
                    {shopName} · Live Store Catalogue
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('reels')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 bg-amber-400 text-slate-950 shadow-sm cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Reels Mode</span>
                </button>
              </div>
            </div>
          </header>

          {/* Search & Filter Controls */}
          <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5 pb-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search garments by name, fabric, category, SKU, color..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Gender Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {(['ALL', 'Women', 'Men', 'Unisex', 'Kids'] as const).map((gender) => (
                  <button
                    key={gender}
                    onClick={() => setSelectedGender(gender)}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                      selectedGender === gender
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {gender === 'ALL' ? 'All Genders' : gender}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            {availableCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-400" />
                  Category:
                </span>
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  All ({inventory.length})
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-emerald-500 text-slate-950 font-black shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Main Garments Grid */}
          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex-1">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-3">
              <span>
                Displaying <strong className="text-amber-300">{filteredInventory.length}</strong> items in live catalogue
              </span>
              <span className="text-emerald-400 text-[11px] font-mono flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified QR Gateway
              </span>
            </div>

            {filteredInventory.length === 0 ? (
              <div className="p-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-4 my-6">
                <ShoppingBag className="w-14 h-14 text-slate-600 mx-auto" />
                <h3 className="text-lg font-black text-white">No collection items found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  We couldn&apos;t find any items matching your selected criteria. Reset filters or search with another term.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGender('ALL');
                    setSelectedCategory('ALL');
                  }}
                  className="px-5 py-2.5 bg-amber-400 text-slate-950 font-black text-xs rounded-xl hover:bg-amber-300 transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredInventory.map((item) => {
                  const photos = item.selectedPhotos?.length
                    ? item.selectedPhotos
                    : item.photos?.length
                    ? item.photos
                    : item.image
                    ? [item.image]
                    : [];
                  const primaryPhoto = photos[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80';
                  const price = item.finalPrice || item.price || item.sellingPrice || 0;
                  const origPrice = item.price && item.price > price ? item.price : item.costPrice ? item.costPrice * 1.5 : null;

                  return (
                    <div
                      key={item.id}
                      className="group bg-slate-900 hover:bg-slate-850 rounded-3xl border border-slate-800 hover:border-amber-400/50 transition-all overflow-hidden flex flex-col shadow-xl"
                    >
                      {/* Photo Container */}
                      <div
                        onClick={() => {
                          if (photos.length > 0) {
                            setActivePhotoModalItem(item);
                            setActivePhotoIndex(0);
                          }
                        }}
                        className="relative aspect-[3/4] bg-slate-950 overflow-hidden cursor-pointer"
                      >
                        <img
                          src={primaryPhoto}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                          <span className="px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                            {item.category}
                          </span>
                          {item.gender && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold border border-white/10">
                              {item.gender}
                            </span>
                          )}
                        </div>

                        {/* Multi-angle indicator */}
                        {photos.length > 1 && (
                          <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-amber-300" />
                            <span>{photos.length} Angles</span>
                          </div>
                        )}
                      </div>

                      {/* Garment Details & Actions */}
                      <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-extrabold text-sm text-white line-clamp-2 group-hover:text-amber-300 transition-colors">
                              {item.name}
                            </h3>
                            {item.sku && (
                              <span className="font-mono text-[9px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded shrink-0 border border-slate-800">
                                {item.sku}
                              </span>
                            )}
                          </div>

                          {/* Price Section */}
                          <div className="flex items-baseline gap-2 pt-1.5">
                            <span className="text-lg font-black text-amber-400 font-mono">
                              ₹{price.toLocaleString('en-IN')}
                            </span>
                            {origPrice && origPrice > price && (
                              <span className="text-xs text-slate-400 line-through font-mono">
                                ₹{Math.round(origPrice).toLocaleString('en-IN')}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                              In Stock
                            </span>
                          </div>

                          {/* Sizes Available */}
                          {item.sizes && item.sizes.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-2">
                              <span className="text-[10px] text-slate-400 font-bold">Sizes:</span>
                              {item.sizes.map((s) => (
                                <span
                                  key={s.size}
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                    s.quantity > 0
                                      ? 'bg-slate-950 border-slate-700 text-slate-200'
                                      : 'bg-rose-950/30 border-rose-900/40 text-rose-400 line-through'
                                  }`}
                                >
                                  {s.size}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Order Button */}
                        <div className="pt-2 border-t border-slate-800">
                          <button
                            onClick={() => handleInquireWhatsApp(item)}
                            className="w-full bg-[#25D366] hover:bg-[#1eb855] text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Order on WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </>
      )}

      {/* Photo Gallery Modal */}
      {activePhotoModalItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-4 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-white">{activePhotoModalItem.name}</h4>
                <p className="text-xs text-amber-300 font-mono font-bold">
                  ₹{(activePhotoModalItem.finalPrice || activePhotoModalItem.price || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setActivePhotoModalItem(null)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Photo */}
            <div className="aspect-[3/4] bg-slate-950 rounded-2xl overflow-hidden relative">
              <img
                src={
                  (activePhotoModalItem.selectedPhotos || activePhotoModalItem.photos || [activePhotoModalItem.image || ''])[
                    activePhotoIndex
                  ]
                }
                alt={activePhotoModalItem.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Thumbnail Selectors */}
            {((activePhotoModalItem.selectedPhotos || activePhotoModalItem.photos || []).length > 1) && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(activePhotoModalItem.selectedPhotos || activePhotoModalItem.photos || []).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`w-14 h-18 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      activePhotoIndex === idx ? 'border-amber-400 scale-105' : 'border-slate-700 opacity-60'
                    }`}
                  >
                    <img src={img} alt="Angle" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}

            {/* WhatsApp Order from Modal */}
            <button
              onClick={() => {
                handleInquireWhatsApp(activePhotoModalItem);
                setActivePhotoModalItem(null);
              }}
              className="w-full bg-[#25D366] hover:bg-[#1eb855] text-slate-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <MessageSquare className="w-4 h-4 fill-slate-950" />
              <span>Inquire &amp; Order this Piece on WhatsApp</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
