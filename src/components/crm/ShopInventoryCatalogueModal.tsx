import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  ShoppingBag,
  Sparkles,
  Phone,
  MessageSquare,
  MapPin,
  Tag,
  CheckCircle2,
  Share2,
  ExternalLink,
  Layers,
  ArrowUpDown,
  Scissors,
  Store,
  ChevronRight,
  Eye,
  Info,
} from 'lucide-react';
import { InventoryItem, ShopProfile, PlatformShop } from '../../types';
import { getWhatsAppUrl, clean10DigitPhone } from '../../lib/phoneUtils';

interface ShopInventoryCatalogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopProfile | PlatformShop;
  inventory: InventoryItem[];
  shopScoperCode?: string;
}

export const ShopInventoryCatalogueModal: React.FC<ShopInventoryCatalogueModalProps> = ({
  isOpen,
  onClose,
  shop,
  inventory,
  shopScoperCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'Men' | 'Women' | 'Unisex' | 'Kids'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<InventoryItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const shopName = 'shopName' in shop ? shop.shopName : 'Boutique';
  const shopPhone = 'phoneNumber' in shop ? shop.phoneNumber : '';
  const shopAddress = 'address' in shop ? shop.address : ('city' in shop ? `${shop.city}, ${shop.state}` : '');
  const ownerName = 'ownerName' in shop ? shop.ownerName : 'Store Owner';

  const cleanPhone = clean10DigitPhone(shopPhone) || '7608807790';
  const scCode = shopScoperCode || `SHOPSCOPER-${cleanPhone}`;

  // Unique categories in the inventory
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [inventory]);

  // Filtered inventory items
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

  const handleShareCatalogue = () => {
    const url = `${window.location.origin}/catalogue?shop=${cleanPhone}&source=shopscoper_qr`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleInquireItemWhatsApp = (item: InventoryItem) => {
    const priceText = item.finalPrice || item.price ? `₹${(item.finalPrice || item.price || 0).toLocaleString('en-IN')}` : 'Price on request';
    const message = `Hello ${shopName}! I saw *${item.name}* (${item.category}, ${priceText}) in your ShopScoper Live Inventory Catalogue [Code: ${scCode}]. Is this available for purchase / trial?`;
    window.open(getWhatsAppUrl(shopPhone || '7608807790', message), '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 text-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-emerald-500/30 shadow-2xl overflow-hidden">
        {/* Header with ShopScoper Branding */}
        <div className="bg-gradient-to-r from-[#0B4636] via-[#08382b] to-[#041d16] p-4 sm:p-5 border-b border-emerald-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black text-base shadow-inner">
              ✦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  ShopScoper Live Catalogue
                </span>
                <span className="font-mono text-[10px] text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {scCode}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                {shopName}
              </h2>
              <p className="text-xs text-emerald-200/80 font-medium flex items-center gap-2 mt-0.5">
                <span>By {ownerName}</span>
                {shopAddress && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[260px]">{shopAddress}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareCatalogue}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
              title="Copy Catalogue Link"
            >
              <Share2 className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500 text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-950/80 p-3 sm:p-4 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search collection by dress name, fabric, category, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Gender Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['ALL', 'Women', 'Men', 'Unisex', 'Kids'] as const).map((gender) => (
                <button
                  key={gender}
                  onClick={() => setSelectedGender(gender)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                    selectedGender === gender
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All ({inventory.length})
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Garment Grid / Catalog Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span>
              Showing <strong className="text-amber-300">{filteredInventory.length}</strong> available collection items in{' '}
              <strong className="text-white">{shopName}</strong>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified ShopScoper Collection
            </span>
          </div>

          {filteredInventory.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/50 rounded-2xl border border-slate-800 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No items found matching your filters</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try clearing your search query or selecting &quot;All Genders&quot; to browse all available fabrics and garments in the inventory collection.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGender('ALL');
                  setSelectedCategory('ALL');
                }}
                className="px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-300 transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                    className="group bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700 hover:border-amber-400/50 transition-all overflow-hidden flex flex-col shadow-lg"
                  >
                    {/* Thumbnail Image with Badges */}
                    <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden">
                      <img
                        src={primaryPhoto}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                          {item.category}
                        </span>

                        {item.gender && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold">
                            {item.gender}
                          </span>
                        )}
                      </div>

                      {/* Multi-photo indicator */}
                      {photos.length > 1 && (
                        <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                          📷 {photos.length} Angles
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-extrabold text-sm text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                            {item.name}
                          </h4>
                          {item.sku && (
                            <span className="font-mono text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded shrink-0">
                              {item.sku}
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-base font-black text-amber-400 font-mono">
                            ₹{price.toLocaleString('en-IN')}
                          </span>
                          {origPrice && origPrice > price && (
                            <span className="text-xs text-slate-400 line-through font-mono">
                              ₹{Math.round(origPrice).toLocaleString('en-IN')}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            In Stock
                          </span>
                        </div>

                        {/* Available Sizes */}
                        {item.sizes && item.sizes.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-1.5">
                            <span className="text-[10px] text-slate-400 font-bold">Sizes:</span>
                            {item.sizes.map((s) => (
                              <span
                                key={s.size}
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  s.quantity > 0
                                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                                    : 'bg-rose-950/30 border-rose-900/40 text-rose-400 line-through'
                                }`}
                              >
                                {s.size}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 border-t border-slate-700/60">
                        <button
                          onClick={() => handleInquireItemWhatsApp(item)}
                          className="w-full bg-[#25D366] hover:bg-[#1eb855] text-slate-950 font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
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
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-3 sm:p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-slate-300">
              ShopScoper Live QR Gateway · Scannable by any mobile device
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const message = `Hello ${shopName}! I am browsing your ShopScoper Catalogue [${scCode}] and would like to ask about custom stitching and appointments.`;
                window.open(getWhatsAppUrl(shopPhone || '7608807790', message), '_blank');
              }}
              className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Contact Boutique Direct</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
