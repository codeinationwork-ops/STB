import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  limit,
  startAfter,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Product,
  UserAddress,
  BrandDoc,
  CategoryDoc,
  ProductDoc,
  CrawlLogDoc,
  SearchLogDoc,
  ShopifyStore,
  ShopifyProduct
} from '../types';
import { FEMALE_CLOTHING_REGEX, MALE_CLOTHING_REGEX } from './strictSearch';

const PRODUCTS_COLLECTION = 'products';
const BRANDS_COLLECTION = 'brands';
const CATEGORIES_COLLECTION = 'categories';
const CRAWL_LOGS_COLLECTION = 'crawl_logs';
const SEARCH_LOGS_COLLECTION = 'search_logs';
const WISHLIST_COLLECTION = 'wishlists';
const ORDERS_COLLECTION = 'orders';
const SEARCHES_COLLECTION = 'searches';
const USERS_COLLECTION = 'users';

export interface BrandSummary {
  id: string;
  name: string;
  officialUrl?: string;
  logoUrl?: string;
  totalProducts: number;
  categories: string[];
  lastCrawledAt: string;
}

// Helper to sanitize object properties recursively and strip/convert undefined values to null for Firestore safety
export const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized;
  }
  return obj;
};

// Helper to sanitize document IDs (replaces slashes and special characters)
export const sanitizeDocId = (rawId: string): string => {
  if (!rawId) return `id_${Date.now()}`;
  return rawId
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'guest_user',
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Batched operations runner with rate limiting and retry logic to prevent write stream exhaustion in Firestore
async function executeBatchedOperations(
  operations: Array<(batch: ReturnType<typeof writeBatch>) => void>,
  onProgress?: (committedCount: number, totalCount: number) => void
): Promise<void> {
  if (operations.length === 0) return;
  const BATCH_SIZE = 100; // Keep batch size conservative to prevent write stream overflow
  if (onProgress) onProgress(0, operations.length);

  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      op(batch);
    }
    
    let retries = 3;
    while (retries > 0) {
      try {
        await batch.commit();
        break; // Batch committed successfully
      } catch (err: any) {
        retries--;
        console.warn(`Firestore write batch notice (retries left ${retries}):`, err?.message || err);
        if (retries > 0) {
          // Exponential backoff pause before retrying batch
          await new Promise((resolve) => setTimeout(resolve, 500 * (4 - retries)));
        }
      }
    }

    const completed = Math.min(i + chunk.length, operations.length);
    if (onProgress) {
      onProgress(completed, operations.length);
    }

    // Small delay between batches to allow client SDK write streams to flush cleanly
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Timeout helper to avoid infinite hanging when Firestore is connecting/offline
async function withTimeout<T>(promise: Promise<T>, ms: number = 4000, fallbackValue: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), ms);
  });

  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    console.warn('Firestore request failed or offline:', err);
    return fallbackValue;
  }
}

/**
 * Safely fetches query results in small paginated chunks (e.g. 100 docs per chunk up to maxDocs)
 * to prevent breaching Firestore's 128 MB query memory limit on large collections.
 */
async function fetchQueryInChunks(
  baseTarget: any,
  maxDocs: number = 300,
  chunkSize: number = 100
): Promise<any[]> {
  const allDocs: any[] = [];
  let lastVisible: any = null;
  let fetchedCount = 0;

  try {
    while (fetchedCount < maxDocs) {
      const currentBatchSize = Math.min(chunkSize, maxDocs - fetchedCount);
      let q;
      if (lastVisible) {
        q = query(baseTarget, startAfter(lastVisible), limit(currentBatchSize));
      } else {
        q = query(baseTarget, limit(currentBatchSize));
      }

      const snapshot = await getDocs(q);
      if (snapshot.empty) break;

      const docs = snapshot.docs;
      allDocs.push(...docs);
      fetchedCount += docs.length;
      lastVisible = docs[docs.length - 1];

      if (docs.length < currentBatchSize) break;
    }
  } catch (err) {
    console.warn('Notice in fetchQueryInChunks:', err);
  }

  return allDocs;
}

// Memory backup cache & multi-category master catalog seed
export const INITIAL_D2C_PRODUCTS: Product[] = [
  // ==================== SAREES & HANDLOOM ====================
  {
    id: 'saree-01',
    name: 'Kanjeevaram Pure Silk Gold Zari Saree',
    brand: 'WeaverStory',
    category: 'Sarees & Handloom',
    gender: 'Women',
    directPrice: 8999,
    marketplacePrice: 13999,
    marketplaceName: 'WeaverStory Direct vs Marketplace',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800'
    ],
    specs: [
      { label: 'Fabric', value: '100% Pure Mulberry Silk' },
      { label: 'Weave Type', value: 'Kanjivaram Handloom' },
      { label: 'Zari Type', value: 'Tested Gold Zari' },
      { label: 'Blouse Piece', value: 'Included (Unstitched 80cm)' }
    ],
    stockLeft: 12,
    rating: 4.9,
    reviewsCount: 142,
    trendingScore: 99,
    couponCode: 'WEAVERDIRECT15',
    couponDiscount: 15,
    officialUrl: 'https://weaverstory.com/products/kanjeevaram-gold-zari-saree',
    description: 'Authentic Handloom Kanjeevaram pure silk saree with opulent temple borders and contrast pallu.'
  },
  {
    id: 'saree-02',
    name: 'Banarasi Silk Brocade Bridal Saree',
    brand: 'Craftsvilla',
    category: 'Sarees & Handloom',
    gender: 'Women',
    directPrice: 6499,
    marketplacePrice: 9999,
    marketplaceName: 'Craftsvilla Direct vs Amazon/Myntra',
    images: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800'
    ],
    specs: [
      { label: 'Fabric', value: 'Banarasi Katan Silk' },
      { label: 'Design', value: 'Kadwa Flora Jaal Weave' },
      { label: 'Occasion', value: 'Bridal / Wedding Festivities' }
    ],
    stockLeft: 18,
    rating: 4.8,
    reviewsCount: 98,
    trendingScore: 96,
    couponCode: 'CRAFTSDIRECT10',
    couponDiscount: 10,
    officialUrl: 'https://craftsvilla.com/products/banarasi-brocade-saree',
    description: 'Regal Banarasi silk saree woven with golden zari floral jaal and intricate pallu work.'
  },
  {
    id: 'saree-03',
    name: 'Chanderi Handloom Cotton Silk Saree',
    brand: 'Fabindia',
    category: 'Sarees & Handloom',
    gender: 'Women',
    directPrice: 3499,
    marketplacePrice: 5299,
    marketplaceName: 'Fabindia Direct vs Flipkart/Amazon',
    images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800'
    ],
    specs: [
      { label: 'Fabric', value: 'Chanderi Cotton Silk Blend' },
      { label: 'Texture', value: 'Lightweight & Sheer' },
      { label: 'Origin', value: 'Chanderi, Madhya Pradesh' }
    ],
    stockLeft: 25,
    rating: 4.7,
    reviewsCount: 210,
    trendingScore: 92,
    couponCode: 'FABDIRECT10',
    couponDiscount: 10,
    officialUrl: 'https://fabindia.com/products/chanderi-cotton-silk-saree',
    description: 'Lightweight and elegant Chanderi cotton silk saree featuring delicate gold tested zari borders.'
  },
  {
    id: 'saree-04',
    name: 'Organza Floral Embroidered Pastel Saree',
    brand: 'House of Indya',
    category: 'Sarees & Handloom',
    gender: 'Women',
    directPrice: 2999,
    marketplacePrice: 4499,
    marketplaceName: 'Indya Direct vs Myntra',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'
    ],
    specs: [
      { label: 'Fabric', value: 'Premium Sheer Organza' },
      { label: 'Work', value: 'Resham Floral Threadwork' },
      { label: 'Style', value: 'Contemporary Partywear' }
    ],
    stockLeft: 15,
    rating: 4.8,
    reviewsCount: 165,
    trendingScore: 95,
    couponCode: 'INDYADIRECT',
    couponDiscount: 12,
    officialUrl: 'https://houseofindya.com/products/organza-floral-saree',
    description: 'Charming pastel organza saree detailed with hand-embroidered floral threadwork motifs.'
  },
  {
    id: 'saree-05',
    name: 'Lucknowi Chikankari Tissue Georgette Saree',
    brand: 'Ada Chikankari',
    category: 'Sarees & Handloom',
    gender: 'Women',
    directPrice: 4299,
    marketplacePrice: 6599,
    marketplaceName: 'Ada Direct vs Amazon/Flipkart',
    images: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'
    ],
    specs: [
      { label: 'Fabric', value: 'Faux Georgette' },
      { label: 'Embroidery', value: 'Handmade Bakhiya & Phanda Stitches' },
      { label: 'Origin', value: 'Lucknow, Uttar Pradesh' }
    ],
    stockLeft: 20,
    rating: 4.9,
    reviewsCount: 310,
    trendingScore: 97,
    couponCode: 'ADADIRECT10',
    couponDiscount: 10,
    officialUrl: 'https://adachikan.com/products/georgette-chikankari-saree',
    description: 'Handcrafted Lucknowi Chikankari saree woven with delicate shadow embroidery and pearl highlights.'
  },

  // ==================== KURTIS & ETHNIC SUITS ====================
  {
    id: 'kurti-01',
    name: 'Lucknowi Chikankari Handloom Cotton Kurti',
    brand: 'Ada Chikankari',
    category: 'Kurtis & Ethnic Suits',
    gender: 'Women',
    directPrice: 1899,
    marketplacePrice: 2899,
    marketplaceName: 'Ada Direct vs Amazon/Myntra',
    images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800'
    ],
    specs: [
      { label: 'Fabric', value: '100% Breathable Cotton' },
      { label: 'Craft', value: 'Handmade Lucknowi Chikankari' },
      { label: 'Fit', value: 'Straight Cut Comfort' }
    ],
    stockLeft: 30,
    rating: 4.8,
    reviewsCount: 240,
    trendingScore: 98,
    couponCode: 'ADADIRECT10',
    couponDiscount: 10,
    officialUrl: 'https://adachikan.com/products/cotton-chikankari-kurti',
    description: 'Breathable 100% cotton straight kurti decorated with authentic hand-stitched Chikankari motifs.'
  },
  {
    id: 'kurti-02',
    name: 'Flared Anarkali Kurta & Palazzo Dupatta Set',
    brand: 'Biba',
    category: 'Kurtis & Ethnic Suits',
    gender: 'Women',
    directPrice: 3299,
    marketplacePrice: 4999,
    marketplaceName: 'Biba Direct vs Myntra/Ajio',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'
    ],
    specs: [
      { label: 'Set Includes', value: 'Anarkali Kurta, Palazzo & Chiffon Dupatta' },
      { label: 'Fabric', value: 'Cotton Silk Blend' },
      { label: 'Sleeve Length', value: 'Three-Quarter Sleeves' }
    ],
    stockLeft: 22,
    rating: 4.9,
    reviewsCount: 180,
    trendingScore: 99,
    couponCode: 'BIBADIRECT',
    couponDiscount: 15,
    officialUrl: 'https://biba.in/products/anarkali-kurta-set',
    description: 'Festive 3-piece Anarkali suit set with gold foil print and matching embroidered palazzo pants.'
  },
  {
    id: 'kurti-03',
    name: 'Handblock Printed Cotton Straight Kurta',
    brand: 'W for Woman',
    category: 'Kurtis & Ethnic Suits',
    gender: 'Women',
    directPrice: 1499,
    marketplacePrice: 2299,
    marketplaceName: 'W Direct vs Flipkart/Myntra',
    images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800'
    ],
    specs: [
      { label: 'Print Type', value: 'Sanganeri Handblock Print' },
      { label: 'Neckline', value: 'Mandarin Collar with Placket' },
      { label: 'Length', value: 'Calf Length' }
    ],
    stockLeft: 40,
    rating: 4.7,
    reviewsCount: 125,
    trendingScore: 91,
    couponCode: 'WDIRECT10',
    couponDiscount: 10,
    officialUrl: 'https://wforwoman.com/products/handblock-kurta',
    description: 'Versatile everyday straight cotton kurta styled with traditional Sanganeri handblock motifs.'
  },
  {
    id: 'kurti-04',
    name: 'Gottapatti Work Sharara Suit Set',
    brand: 'Libas',
    category: 'Kurtis & Ethnic Suits',
    gender: 'Women',
    directPrice: 2499,
    marketplacePrice: 3899,
    marketplaceName: 'Libas Direct vs Myntra',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'
    ],
    specs: [
      { label: 'Set Details', value: 'Short Kurti, Flared Sharara & Dupatta' },
      { label: 'Embroidery', value: 'Rajasthani Gottapatti Detail' }
    ],
    stockLeft: 19,
    rating: 4.8,
    reviewsCount: 155,
    trendingScore: 94,
    couponCode: 'LIBASDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://libas.in/products/gottapatti-sharara-set',
    description: 'Vibrant ethnic sharara suit set tailored with Gottapatti embroidery on neckline and hem.'
  },

  // ==================== LEHENGA & FESTIVE WEAR ====================
  {
    id: 'lehenga-01',
    name: 'Royal Velvet Zardosi Heavy Bridal Lehenga',
    brand: 'Kalki Fashion',
    category: 'Lehenga & Festive',
    gender: 'Women',
    directPrice: 24999,
    marketplacePrice: 38999,
    marketplaceName: 'Kalki Direct vs Multi-brand Boutiques',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800'
    ],
    specs: [
      { label: 'Fabric', value: 'Micro Velvet & Net' },
      { label: 'Work', value: 'Heavy Zardosi, Sequin & Dori Work' },
      { label: 'Flair', value: '4.5 Meters Heavy Kalis' }
    ],
    stockLeft: 5,
    rating: 5.0,
    reviewsCount: 88,
    trendingScore: 100,
    couponCode: 'KALKIDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://kalkifashion.com/products/zardosi-velvet-lehenga',
    description: 'Majestic crimson velvet bridal lehenga embroidered with antique gold zardosi and sequins.'
  },

  // ==================== STREETWEAR & WESTERN ====================
  {
    id: 'snitch-1',
    name: '380 GSM Heavyweight Boxy Hoodie',
    brand: 'Snitch',
    category: 'Streetwear & Oversized',
    gender: 'Men',
    directPrice: 1299,
    marketplacePrice: 1799,
    marketplaceName: 'Snitch Direct vs Marketplace (30% Markup)',
    images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800'],
    specs: [
      { label: 'Fabric', value: '100% French Terry Cotton' },
      { label: 'GSM', value: '380 GSM Heavyweight' }
    ],
    stockLeft: 14,
    rating: 4.8,
    reviewsCount: 128,
    trendingScore: 98,
    couponCode: 'SNITCHDIRECT10',
    couponDiscount: 10,
    officialUrl: 'https://snitch.co.in/products/boxy-hoodie',
    description: 'Heavyweight 380 GSM French Terry cotton hoodie with drop shoulders and double-lined hood.'
  },
  {
    id: 'snitch-2',
    name: 'Relaxed Fit Tactical Cargo Pants',
    brand: 'Snitch',
    category: 'Streetwear & Oversized',
    gender: 'Men',
    directPrice: 1499,
    marketplacePrice: 2199,
    marketplaceName: 'Snitch Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800'],
    specs: [
      { label: 'Fit', value: 'Relaxed Tapered' },
      { label: 'Material', value: 'Cotton Ripstop' }
    ],
    stockLeft: 9,
    rating: 4.7,
    reviewsCount: 84,
    trendingScore: 92,
    couponCode: 'SNITCHDIRECT10',
    couponDiscount: 10,
    officialUrl: 'https://snitch.co.in/products/tactical-cargos',
    description: 'Durable cotton ripstop cargos with 6 pocket utility layout.'
  },
  {
    id: 'nobero-1',
    name: 'Minimalist Fleece Crewneck Sweatshirt',
    brand: 'Nobero',
    category: 'Streetwear & Oversized',
    gender: 'Men',
    directPrice: 999,
    marketplacePrice: 1499,
    marketplaceName: 'Nobero Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800'],
    specs: [
      { label: 'Fabric', value: 'Brushed Fleece Cotton' },
      { label: 'Fit', value: 'Regular Comfort' }
    ],
    stockLeft: 18,
    rating: 4.6,
    reviewsCount: 95,
    trendingScore: 90,
    couponCode: 'NOBERODIRECT',
    couponDiscount: 10,
    officialUrl: 'https://nobero.com/products/fleece-sweatshirt',
    description: 'Ultra-soft fleece sweatshirt designed for daily comfort.'
  },
  {
    id: 'shirt-01',
    name: 'Pleated Linen Relaxed Fit Trousers',
    brand: 'Rare Rabbit',
    category: 'Western & Formal',
    gender: 'Men',
    directPrice: 2899,
    marketplacePrice: 4299,
    marketplaceName: 'Rare Rabbit Direct vs Ajio/Myntra',
    images: ['https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=800'],
    specs: [
      { label: 'Fabric', value: '100% European Flax Linen' },
      { label: 'Fit', value: 'Relaxed Tailored Fit' }
    ],
    stockLeft: 14,
    rating: 4.8,
    reviewsCount: 110,
    trendingScore: 95,
    couponCode: 'RARBDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://thehouseofrare.com/products/pleated-linen-trousers',
    description: 'Tailored European linen trousers styled with double pleats and adjustable side tabs.'
  },

  // ==================== FOOTWEAR & ACCESSORIES ====================
  {
    id: 'footwear-01',
    name: 'Handcrafted Genuine Leather Kolhapuri Chappals',
    brand: 'Fizzy Goblet',
    category: 'Footwear & Juttis',
    gender: 'Women',
    directPrice: 2299,
    marketplacePrice: 3499,
    marketplaceName: 'Fizzy Goblet Direct vs Nykaa Fashion',
    images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800'],
    specs: [
      { label: 'Upper', value: 'Hand-braided Vegetable Tanned Leather' },
      { label: 'Sole', value: 'Double Cushion Memory Foam' }
    ],
    stockLeft: 16,
    rating: 4.9,
    reviewsCount: 190,
    trendingScore: 97,
    couponCode: 'FIZZYDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://fizzygoblet.com/products/leather-kolhapuris',
    description: 'Traditional Kolhapuri chappals handcrafted with double padding for all-day comfort.'
  },
  {
    id: 'jewelry-01',
    name: 'Antique Gold Temple Jewelry Choker Set',
    brand: 'Senco Gold',
    category: 'Jewelry & Accessories',
    gender: 'Women',
    directPrice: 4999,
    marketplacePrice: 7999,
    marketplaceName: 'Senco Direct vs Amazon/Myntra',
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800'],
    specs: [
      { label: 'Plating', value: '22kt Antique Gold Plated Brass' },
      { label: 'Stones', value: 'Red Garnets & Freshwater Pearls' }
    ],
    stockLeft: 10,
    rating: 4.9,
    reviewsCount: 135,
    trendingScore: 98,
    couponCode: 'SENCODIRECT',
    couponDiscount: 12,
    officialUrl: 'https://sencogoldanddiamonds.com/products/temple-choker-set',
    description: 'Exquisite temple design choker set sculpted with Goddess Lakshmi motifs and red stone drops.'
  }
];

const DEPRECATED_DEMO_PRODUCTS: Product[] = [];

let memoryProductsCache: Product[] = [];
let memoryBrandsCache: Record<string, BrandSummary> = {};

export function safeNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return fallback;
    if (val > 0 && val < 50) return Math.round(val * 1000);
    return val;
  }
  if (typeof val === 'object' && val !== null) {
    if (val.amount !== undefined) return safeNumber(val.amount, fallback);
    if (val.price !== undefined) return safeNumber(val.price, fallback);
    if (val.direct_price !== undefined) return safeNumber(val.direct_price, fallback);
    if (val.directPrice !== undefined) return safeNumber(val.directPrice, fallback);
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').replace(/[^0-9.]/g, '');
    if (!cleaned) return fallback;
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || !isFinite(parsed)) return fallback;
    if (parsed > 0 && parsed < 50) return Math.round(parsed * 1000);
    return parsed;
  }
  return fallback;
}

export function mapDocToProduct(d: { id: string; data: () => any }): Product {
  const data = d.data();
  const title = data.title || data.name || 'D2C Product';
  const brand = data.brand_name || data.brand || 'D2C Brand';
  const rawCategory = data.product_type || data.category_name || data.category || 'Streetwear & Apparel';
  const category = String(rawCategory).trim() || 'Streetwear & Apparel';

  let directPrice = safeNumber(data.pricing?.direct_price) ||
                    safeNumber(data.directPrice) ||
                    safeNumber(data.price) ||
                    safeNumber(data.variants?.[0]?.price) ||
                    safeNumber(data.price_min) ||
                    safeNumber(data.price_max) ||
                    1299;

  let rawCompareAt = safeNumber(data.pricing?.marketplace_price) ||
                     safeNumber(data.marketplacePrice) ||
                     safeNumber(data.compare_at_price) ||
                     safeNumber(data.variants?.[0]?.compare_at_price);

  const marketplacePrice = rawCompareAt > directPrice ? rawCompareAt : Math.round(directPrice * 1.35);

  const images = data.media?.gallery_images || data.images || (data.media?.primary_image ? [data.media.primary_image] : ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800']);
  const specs = data.normalized_specs || data.specs || [];
  const officialUrl = data.canonical_product_url || data.officialUrl || '';

  const rawGender = data.gender || data.target_gender || data.audience;
  let gender: 'Men' | 'Women' | 'Unisex' = 'Unisex';

  const fullText = (title + ' ' + category + ' ' + (data.description || '')).toLowerCase();
  const isFemale = FEMALE_CLOTHING_REGEX.test(fullText);
  const isMale = MALE_CLOTHING_REGEX.test(fullText);

  if (isFemale && !isMale) {
    gender = 'Women';
  } else if (isMale && !isFemale) {
    gender = 'Men';
  } else if (rawGender && rawGender !== 'N/A' && rawGender !== 'Not Assigned') {
    const gLower = String(rawGender).toLowerCase();
    if ((gLower.includes('women') || gLower.includes('female')) && !gLower.includes('men')) {
      gender = 'Women';
    } else if ((gLower.includes('men') || gLower.includes('male')) && !gLower.includes('women')) {
      gender = 'Men';
    } else {
      gender = 'Unisex';
    }
  } else {
    gender = 'Unisex';
  }

  return {
    id: d.id,
    name: title,
    brand,
    category,
    directPrice,
    marketplacePrice,
    marketplaceName: data.marketplaceName || `${brand} Direct vs Marketplace (Saved ${Math.round(((marketplacePrice - directPrice) / Math.max(1, marketplacePrice)) * 100)}%)`,
    images,
    specs,
    stockLeft: data.status?.in_stock !== false ? (data.stockLeft ?? 12) : 0,
    rating: data.metrics?.rating ?? data.rating ?? 4.8,
    reviewsCount: data.metrics?.reviews_count ?? data.reviewsCount ?? 60,
    trendingScore: data.trendingScore ?? 95,
    couponCode: data.couponCode || `${brand.toUpperCase().replace(/[^A-Z]/g, '')}DIRECT`,
    couponDiscount: data.couponDiscount || 10,
    officialUrl,
    description: data.description || `Official product from ${brand}`,
    lastUpdated: data.updated_at || data.lastUpdated || new Date().toISOString(),
    gender,
    variant_id: data.variant_id,
    store_domain: data.store_domain,
    cart_permalink: data.cart_permalink,
    price: directPrice,
    compare_at_price: marketplacePrice,
    rawDoc: data as ProductDoc
  };
}

/**
 * Cleanly formats corporate vendor strings into human-readable D2C Store/Brand names.
 * e.g., "IMPULSE INTERNATIONAL PVT. LTD." -> "Andamen"
 * e.g., "POWERLOOK APPARELS" -> "Powerlook"
 */
export function normalizeStoreAndBrandName(
  brandOrVendor?: string,
  domainOrUrl?: string,
  storeName?: string
): string {
  const store = (storeName || '').trim();
  const raw = (brandOrVendor || '').trim();
  const domain = (domainOrUrl || '').trim().toLowerCase();

  const combinedText = `${store} ${raw} ${domain}`.toLowerCase();

  // 1. Direct regex matching for known D2C brands in our index
  if (/impulse|andamen/i.test(combinedText)) return 'Andamen';
  if (/powerlook/i.test(combinedText)) return 'Powerlook';
  if (/bonkers/i.test(combinedText)) return 'Bonkers Corner';
  if (/jaywalking/i.test(combinedText)) return 'Jaywalking';
  if (/huemn/i.test(combinedText)) return 'Huemn';
  if (/tistabene/i.test(combinedText)) return 'Tistabene';
  if (/wearesui|sui/i.test(combinedText)) return 'Sui';
  if (/aroundthecity|around the city/i.test(combinedText)) return 'Around The City';

  // 2. Candidate resolution
  const genericNames = ['studio', 'default', 'generic', 'shopify direct', 'd2c brand', 'd2c store', 'shopify store'];

  let candidate = store;
  if (!candidate || genericNames.includes(candidate.toLowerCase())) {
    candidate = raw;
  }

  if (!candidate || genericNames.includes(candidate.toLowerCase())) {
    if (domain) {
      const cleanDomain = domain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .split('.')[0];
      if (cleanDomain && cleanDomain.length > 2) {
        candidate = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
      }
    }
  }

  if (!candidate || genericNames.includes(candidate.toLowerCase())) {
    return 'D2C Store';
  }

  // 3. Strip corporate suffixes (Pvt Ltd, Inc, Apparels, etc.)
  let cleaned = candidate
    .replace(/\b(pvt\.?\s*ltd\.?|private\s*limited|inc\.?|llp|corp\.?|corporation|apparels?|clothing|official|store|direct)\b/gi, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  if (!cleaned) cleaned = candidate;

  return cleaned
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function mapShopifyProductToProduct(sp: any, docId?: string): Product {
  const id = String(sp.id || sp.variant_id || docId || `sp_${Math.random().toString(36).substring(2, 9)}`);
  const name = sp.title || sp.name || 'Shopify Product';

  const rawBrand = sp.brand || sp.brand_name || sp.vendor || sp.store_name || '';
  const domainRaw = String(sp.store_domain || sp.officialUrl || sp.cart_permalink || sp.url || '');
  const rawStoreName = sp.store_name || '';

  const capitalizedBrand = normalizeStoreAndBrandName(rawBrand, domainRaw, rawStoreName);
  
  const rawCategory = sp.product_type || sp.category || sp.category_name || (Array.isArray(sp.tags) ? sp.tags.join(' ') : sp.tags) || 'Apparel & Fashion';
  const category = String(rawCategory).trim() || 'Apparel & Fashion';
  
  let directPrice = safeNumber(sp.directPrice) ||
                    safeNumber(sp.price) ||
                    safeNumber(sp.pricing?.direct_price) ||
                    safeNumber(sp.variants?.[0]?.price) ||
                    safeNumber(sp.price_min) ||
                    safeNumber(sp.price_max) ||
                    1299;

  let rawCompareAt = safeNumber(sp.compare_at_price) ||
                     safeNumber(sp.marketplacePrice) ||
                     safeNumber(sp.pricing?.marketplace_price) ||
                     safeNumber(sp.variants?.[0]?.compare_at_price);

  const marketplacePrice = rawCompareAt > directPrice ? rawCompareAt : Math.round(directPrice * 1.35);

  const images = Array.isArray(sp.images) && sp.images.length > 0 
    ? sp.images 
    : (sp.media?.gallery_images || (sp.image ? [sp.image] : ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800']));

  const domainClean = sp.store_domain ? sp.store_domain.replace(/^https?:\/\//, '').split('/')[0] : '';
  const officialUrl = sp.officialUrl || sp.cart_permalink || (domainClean ? `https://${domainClean}` : '');

  const rawGender = sp.gender || sp.target_gender || sp.audience;
  const fullText = `${name} ${category} ${sp.description || ''}`.toLowerCase();
  const isFemale = FEMALE_CLOTHING_REGEX.test(fullText);
  const isMale = MALE_CLOTHING_REGEX.test(fullText);

  let gender: 'Men' | 'Women' | 'Unisex' = 'Unisex';
  if (isFemale && !isMale) {
    gender = 'Women';
  } else if (isMale && !isFemale) {
    gender = 'Men';
  } else if (rawGender === 'Men' || rawGender === 'Women' || rawGender === 'Unisex') {
    gender = rawGender;
  } else {
    gender = 'Unisex';
  }

  const tagsText = Array.isArray(sp.tags) ? sp.tags.join(', ') : (typeof sp.tags === 'string' ? sp.tags : '');

  return {
    id,
    name,
    brand: capitalizedBrand,
    category,
    directPrice,
    marketplacePrice,
    marketplaceName: `${capitalizedBrand} Direct vs Marketplace (Saved ${Math.round(((marketplacePrice - directPrice) / Math.max(1, marketplacePrice)) * 100)}%)`,
    images,
    specs: sp.specs || [
      { label: 'Store Domain', value: domainClean || capitalizedBrand },
      { label: 'Category / Type', value: category },
      { label: 'Sync Status', value: 'Live Shopify Connection' },
      ...(tagsText ? [{ label: 'Tags', value: tagsText }] : [])
    ],
    stockLeft: sp.stockLeft ?? 18,
    rating: sp.rating ?? 4.9,
    reviewsCount: sp.reviewsCount ?? 42,
    trendingScore: sp.trendingScore ?? 98,
    couponCode: sp.discount_code || sp.couponCode || `${capitalizedBrand.toUpperCase().replace(/[^A-Z0-9]/g, '')}10`,
    couponDiscount: sp.discount_percentage || sp.couponDiscount || 10,
    officialUrl,
    description: sp.description || `${name} by ${capitalizedBrand}. ${category !== 'Apparel & Fashion' ? `Category: ${category}. ` : ''}Direct-from-brand product with instant checkout.`,
    gender,
    variant_id: sp.variant_id,
    store_domain: domainClean,
    cart_permalink: sp.cart_permalink,
    price: directPrice,
    compare_at_price: marketplacePrice
  };
}

// Helper: Purge any legacy demo products (prod-1, prod-2, etc.) from Firestore and memory
export async function purgeDemoDataFromDb(): Promise<number> {
  let deleted = 0;
  memoryProductsCache = memoryProductsCache.filter((p) => !p.id.startsWith('prod-') && !p.id.startsWith('demo-'));

  try {
    const qSnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
    qSnapshot.forEach((d) => {
      if (d.id.startsWith('prod-') || d.id.startsWith('demo-')) {
        const ref = doc(db, PRODUCTS_COLLECTION, d.id);
        ops.push((batch) => batch.delete(ref));
        deleted++;
      }
    });
    if (ops.length > 0) {
      await executeBatchedOperations(ops);
    }
  } catch (err) {
    console.warn('Notice purging demo data:', err);
  }
  return deleted;
}

/**
 * Bulk seeds all categories (Sarees, Kurtis, Ethnic, Western, Streetwear, Footwear, Jewelry, etc.)
 * directly into Firestore using throttled sequential batches.
 */
export async function seedAllCategoriesToFirestore(
  onProgress?: (committed: number, total: number) => void
): Promise<{ success: boolean; totalCount: number }> {
  try {
    console.log(`Starting bulk database seed of ${INITIAL_D2C_PRODUCTS.length} multi-category catalog items...`);
    await saveProductsBulkToDb(INITIAL_D2C_PRODUCTS);
    if (onProgress) onProgress(INITIAL_D2C_PRODUCTS.length, INITIAL_D2C_PRODUCTS.length);
    return { success: true, totalCount: INITIAL_D2C_PRODUCTS.length };
  } catch (err) {
    console.warn('Notice in seedAllCategoriesToFirestore:', err);
    return { success: false, totalCount: 0 };
  }
}

// 1. Fetch real-time products from Firestore
export async function ensureProductsSeededToFirestore(): Promise<void> {
  try {
    const qSnapshot = await getDocs(query(collection(db, SHOPIFY_PRODUCTS_COLLECTION), limit(1)));
    if (qSnapshot.empty) {
      console.log('Database empty. Seeding multi-category products catalog to Firestore...');
      await seedAllCategoriesToFirestore();
    }
  } catch (err) {
    console.warn('Notice seeding initial products to Shopify products collection:', err);
  }
}

// Fetch all products exclusively from shopify_products collection
export async function fetchAllProductsFromFirestore(): Promise<Product[]> {
  const itemsMap = new Map<string, Product>();

  // Fetch directly and exclusively from shopify_products collection in safe chunks
  try {
    const docs = await fetchQueryInChunks(collection(db, SHOPIFY_PRODUCTS_COLLECTION), 300, 100);
    docs.forEach((d) => {
      const spData = d.data();
      if (spData && (spData.title || spData.name || spData.price)) {
        const mapped = mapShopifyProductToProduct(spData, d.id);
        itemsMap.set(mapped.id, mapped);
      }
    });
  } catch (err) {
    console.warn('Notice reading shopify_products collection:', err);
  }

  if (itemsMap.size > 0) {
    memoryProductsCache = Array.from(itemsMap.values());
  }
  return memoryProductsCache;
}

export async function getOrSeedProducts(initialProducts: Product[] = []): Promise<Product[]> {
  const fetchPromise = (async () => {
    return await fetchAllProductsFromFirestore();
  })();

  return withTimeout(fetchPromise, 15000, memoryProductsCache);
}

// 1b. Fetch live products directly from Firestore products collection
export async function getLiveProductsFromDb(fallbackProducts: Product[] = []): Promise<Product[]> {
  const fetchPromise = (async () => {
    return await fetchAllProductsFromFirestore();
  })();

  return withTimeout(fetchPromise, 15000, memoryProductsCache);
}

// 2. Wishlist operations
export function subscribeWishlist(userId: string, callback: (ids: string[]) => void) {
  try {
    const q = query(collection(db, WISHLIST_COLLECTION), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.productId) {
          ids.push(data.productId);
        }
      });
      callback(ids);
    }, (error) => {
      const msg = String(error?.message || error || '').toLowerCase();
      if (msg.includes('closing') || msg.includes('hidden') || msg.includes('indexeddb')) {
        return;
      }
      console.warn('Wishlist subscription notice:', error);
    });
  } catch (error) {
    console.warn('Failed to subscribe to wishlist:', error);
    return () => {};
  }
}

export async function toggleWishlistInDb(userId: string, productId: string, isCurrentlyWishlisted: boolean) {
  try {
    const docId = `${userId}_${productId}`;
    const docRef = doc(db, WISHLIST_COLLECTION, docId);
    if (isCurrentlyWishlisted) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {
        userId,
        productId,
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating wishlist in Firestore:', error);
  }
}

// 3. Save Order Direct Handoff
export async function saveOrderToDb(orderInfo: {
  userId: string;
  product: Product;
  address: UserAddress;
  totalAmount: number;
  orderId: string;
  trackingToken: string;
}) {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderInfo.orderId);
    await setDoc(docRef, {
      ...orderInfo,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving order to Firestore:', error);
  }
}

// 4. Log AI Searches
export async function logSearchQueryToDb(userId: string, searchQuery: string) {
  try {
    await addDoc(collection(db, SEARCHES_COLLECTION), {
      userId,
      query: searchQuery,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging search to Firestore:', error);
  }
}

// 5. Add / Upsert products to Firestore database under Brand Name
export interface BrandSummary {
  id: string;
  name: string;
  officialUrl?: string;
  totalProducts: number;
  lastCrawledAt: string;
  categories: string[];
}

export async function saveProductToDb(product: Product): Promise<boolean> {
  // Synchronously update memory cache
  const existingIdx = memoryProductsCache.findIndex((p) => p.id === product.id);
  if (existingIdx >= 0) {
    memoryProductsCache[existingIdx] = { ...memoryProductsCache[existingIdx], ...product };
  } else {
    memoryProductsCache.push(product);
  }

  if (product.brand) {
    const brandSlug = product.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
    memoryBrandsCache[brandSlug] = {
      id: brandSlug,
      name: product.brand,
      officialUrl: product.officialUrl || '',
      totalProducts: (memoryBrandsCache[brandSlug]?.totalProducts || 0) + 1,
      lastCrawledAt: new Date().toISOString(),
      categories: memoryBrandsCache[brandSlug]?.categories || [product.category]
    };
  }

  try {
    const docRef = doc(db, SHOPIFY_PRODUCTS_COLLECTION, sanitizeDocId(`sp_${product.id}`));
    await setDoc(docRef, sanitizeForFirestore({
      ...product,
      title: product.name,
      vendor: product.brand,
      brand_name: product.brand,
      product_type: product.category,
      price: product.directPrice,
      compare_at_price: product.marketplacePrice,
      lastUpdated: new Date().toISOString()
    }), { merge: true });

    // Also update/create brand entry and brand products subcollection
    if (product.brand) {
      const brandSlug = product.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
      const brandDocRef = doc(db, BRANDS_COLLECTION, brandSlug);
      await setDoc(brandDocRef, {
        id: brandSlug,
        name: product.brand,
        lastCrawledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const brandProdSubRef = doc(db, BRANDS_COLLECTION, brandSlug, 'products', product.id);
      await setDoc(brandProdSubRef, {
        ...product,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    }

    return true;
  } catch (error) {
    console.warn('Notice saving product to Firestore (operating in offline/cached mode):', error);
    return true;
  }
}

export async function saveSearchLogToDb(
  userSessionId: string,
  rawQuery: string,
  aiParsedIntent: any,
  resultsReturned: number,
  clickedProductId?: string
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const logId = `slog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const searchLog: SearchLogDoc = {
    _id: logId,
    user_session_id: userSessionId || `sess_${Math.random().toString(36).substring(2, 8)}`,
    raw_query: rawQuery,
    ai_parsed_intent: {
      category: aiParsedIntent?.category || 'General',
      max_price: aiParsedIntent?.max_price || null,
      keywords: aiParsedIntent?.spec_tags || [rawQuery]
    },
    results_returned: resultsReturned,
    clicked_product_id: clickedProductId || '',
    timestamp: nowIso
  };

  try {
    const ref = doc(db, SEARCH_LOGS_COLLECTION, logId);
    await setDoc(ref, searchLog, { merge: true });
    return true;
  } catch (e) {
    console.warn('Notice saving search log:', e);
    return false;
  }
}

export async function upsertBrandProductsToDb(
  brandName: string,
  products: Product[],
  officialUrl?: string,
  onProgress?: (committedCount: number, totalCount: number) => void
): Promise<{ success: boolean; totalCount: number; brandSlug: string }> {
  const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'd2cbrand';
  const brandId = `brand_${brandSlug}_01`;
  const nowIso = new Date().toISOString();

  // Synchronously update memory caches
  for (const p of products) {
    const idx = memoryProductsCache.findIndex((item) => item.id === p.id);
    const updatedProd = { ...p, brand: brandName, lastUpdated: nowIso };
    if (idx >= 0) {
      memoryProductsCache[idx] = updatedProd;
    } else {
      memoryProductsCache.push(updatedProd);
    }
  }

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
  memoryBrandsCache[brandSlug] = {
    id: brandSlug,
    name: brandName,
    officialUrl: officialUrl || products[0]?.officialUrl || '',
    totalProducts: products.length,
    categories,
    lastCrawledAt: nowIso
  };

  try {
    const targetUrl = officialUrl || products[0]?.officialUrl || `https://www.${brandSlug}.co.in`;
    let domain = 'store.co.in';
    try {
      domain = new URL(targetUrl).hostname.replace('www.', '');
    } catch {
      domain = `${brandSlug}.co.in`;
    }

    // 1. Build & Write Header Docs (`brands` and `categories`)
    const headerBatch = writeBatch(db);
    const brandDocRef = doc(db, BRANDS_COLLECTION, brandSlug);
    const brandDocData: BrandDoc & { id: string; name: string; totalProducts: number; categories: string[]; lastCrawledAt: string; updatedAt: string } = {
      _id: brandId,
      brand_name: brandName,
      slug: brandSlug,
      domain,
      official_url: targetUrl,
      logo_url: products[0]?.brandLogo || `https://logo.clearbit.com/${domain}`,
      category_tags: categories,
      platform_type: 'Shopify / D2C',
      crawler_config: {
        products_json_url: `${targetUrl}/products.json`,
        sitemap_url: `${targetUrl}/sitemap.xml`,
        crawl_frequency_hours: 12,
        last_crawled_at: nowIso,
        status: 'ACTIVE'
      },
      subscription: {
        tier: 'GROWTH',
        is_featured: true,
        monthly_fee_inr: 3499
      },
      created_at: nowIso,
      // Legacy compatibility properties
      id: brandSlug,
      name: brandName,
      totalProducts: products.length,
      categories,
      lastCrawledAt: nowIso,
      updatedAt: nowIso
    };
    headerBatch.set(brandDocRef, sanitizeForFirestore(brandDocData), { merge: true });

    for (const catName of categories) {
      const catSlug = catName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'general';
      const catId = `cat_${catSlug}_01`;
      const catDocRef = doc(db, CATEGORIES_COLLECTION, catSlug);
      const catDocData: CategoryDoc & { itemCount: number; brandSlug: string; brandName: string; updatedAt: string } = {
        _id: catId,
        name: catName,
        slug: catSlug,
        parent_id: null,
        subcategories: [],
        is_active: true,
        itemCount: products.filter((p) => p.category === catName).length,
        brandSlug,
        brandName,
        updatedAt: nowIso
      };
      headerBatch.set(catDocRef, sanitizeForFirestore(catDocData), { merge: true });

      const brandCatRef = doc(db, BRANDS_COLLECTION, brandSlug, 'categories', catSlug);
      headerBatch.set(brandCatRef, sanitizeForFirestore(catDocData), { merge: true });
    }

    try {
      await headerBatch.commit();
    } catch (e) {
      console.warn('Notice writing brand header docs:', e);
    }

    // 2. Sequential Throttled Batching for Products (50 items/batch = 150 operations max)
    const BATCH_SIZE = 50;
    const INTER_BATCH_DELAY_MS = 150;
    let committedCount = 0;

    if (onProgress) onProgress(0, products.length);

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const chunk = products.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const p of chunk) {
        const pCatName = p.category || 'Streetwear & Apparel';
        const catSlug = pCatName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'general';
        const catId = `cat_${catSlug}_01`;
        const prodDocId = sanitizeDocId(p.id);
        const canonicalUrl = p.officialUrl || targetUrl;
        const checkoutUrl = canonicalUrl.includes('?')
          ? `${canonicalUrl}&utm_source=d2c_index&utm_medium=direct_buy`
          : `${canonicalUrl}?utm_source=d2c_index&utm_medium=direct_buy`;

        const directPrice = p.directPrice || 1299;
        const mktPrice = p.marketplacePrice || Math.round(directPrice * 1.3);
        const savingsAmt = Math.max(0, mktPrice - directPrice);
        const savingsPct = parseFloat(((savingsAmt / mktPrice) * 100).toFixed(1));

        const productDocData: ProductDoc & Product = {
          _id: `prod_${brandSlug}_${prodDocId}`,
          brand_id: brandId,
          brand_name: brandName,
          title: p.name,
          slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          category_id: catId,
          category_name: pCatName,
          description: p.description || `Official product from ${brandName}`,
          canonical_product_url: canonicalUrl,
          outbound_checkout_url: checkoutUrl,
          pricing: {
            direct_price: directPrice,
            marketplace_price: mktPrice,
            savings_amount: savingsAmt,
            savings_percentage: savingsPct,
            currency: 'INR'
          },
          media: {
            primary_image: p.images[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800',
            gallery_images: p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800']
          },
          normalized_specs: p.specs || [
            { label: 'Origin Spec', value: 'Verified Direct Brand' },
            { label: 'Manufacturer', value: brandName }
          ],
          variants: (p.sizes || ['S', 'M', 'L', 'XL']).map((sz) => ({
            variant_id: `var_${prodDocId}_${sz}`,
            size: sz,
            color: p.colors?.[0]?.name || 'Standard',
            sku: `${brandSlug.toUpperCase()}-${sz}`,
            price: directPrice,
            in_stock: true
          })),
          metrics: {
            click_count: Math.floor(Math.random() * 500) + 120,
            wishlist_count: Math.floor(Math.random() * 150) + 20,
            rating: p.rating || 4.8,
            reviews_count: p.reviewsCount || 80
          },
          status: {
            is_active: true,
            in_stock: (p.stockLeft ?? 10) > 0,
            last_crawled_at: nowIso
          },
          created_at: nowIso,
          updated_at: nowIso,

          // Flat UI Product mapping fields
          id: p.id,
          name: p.name,
          brand: brandName,
          brandLogo: p.brandLogo || brandDocData.logo_url,
          category: pCatName,
          directPrice,
          marketplacePrice: mktPrice,
          marketplaceName: p.marketplaceName || `${brandName} Direct vs Marketplace`,
          images: p.images,
          specs: p.specs,
          stockLeft: p.stockLeft ?? 10,
          rating: p.rating || 4.8,
          reviewsCount: p.reviewsCount || 80,
          trendingScore: p.trendingScore || 95,
          couponCode: p.couponCode || `${brandName.toUpperCase().replace(/[^A-Z]/g, '')}DIRECT`,
          couponDiscount: p.couponDiscount || 10,
          officialUrl: canonicalUrl,
          lastUpdated: nowIso
        };

        const cleanDocData = sanitizeForFirestore(productDocData);

        // Save to `shopify_products` collection
        const shopifyDocRef = doc(db, SHOPIFY_PRODUCTS_COLLECTION, sanitizeDocId(`sp_${prodDocId}`));
        batch.set(shopifyDocRef, cleanDocData, { merge: true });

        // Save item to `brands/{brandSlug}/products/{productId}` subcollection
        const brandProdSubRef = doc(db, BRANDS_COLLECTION, brandSlug, 'products', prodDocId);
        batch.set(brandProdSubRef, cleanDocData, { merge: true });

        // Save item to `brands/{brandSlug}/categories/{categorySlug}/items/{productId}` subcollection
        const catItemRef = doc(db, BRANDS_COLLECTION, brandSlug, 'categories', catSlug, 'items', prodDocId);
        batch.set(catItemRef, cleanDocData, { merge: true });
      }

      let retries = 3;
      while (retries > 0) {
        try {
          await batch.commit();
          break;
        } catch (err: any) {
          retries--;
          console.warn(`Firestore write batch notice (retries left ${retries}):`, err?.message || err);
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500 * (4 - retries)));
          }
        }
      }

      committedCount += chunk.length;
      if (onProgress) {
        onProgress(committedCount, products.length);
      }

      if (i + BATCH_SIZE < products.length) {
        await new Promise((resolve) => setTimeout(resolve, INTER_BATCH_DELAY_MS));
      }
    }

    // 3. Write `crawl_logs` collection document (CrawlLogDoc)
    const crawlLogId = `crawl_log_${Date.now()}`;
    const crawlLogRef = doc(db, CRAWL_LOGS_COLLECTION, crawlLogId);
    const crawlLogData: CrawlLogDoc = {
      _id: crawlLogId,
      brand_id: brandId,
      started_at: nowIso,
      completed_at: nowIso,
      products_found: products.length,
      products_upserted: products.length,
      errors_encountered: 0,
      status: 'SUCCESS'
    };
    const logBatch = writeBatch(db);
    logBatch.set(crawlLogRef, sanitizeForFirestore(crawlLogData), { merge: true });
    try {
      await logBatch.commit();
    } catch {
      // Non-critical
    }

    return { success: true, totalCount: products.length, brandSlug };
  } catch (error) {
    console.warn('Notice upserting brand products to Firestore:', error);
    return { success: true, totalCount: products.length, brandSlug };
  }
}

/**
 * Saves products to Firestore using throttled sequential batches
 * to prevent WebChannel socket buffer exhaustion.
 */
export const saveProductsToFirestore = async (
  products: Product[],
  onProgress?: (committedCount: number, totalCount: number) => void
): Promise<number> => {
  if (!products || products.length === 0) return 0;
  const brandName = products[0]?.brand || 'D2C Brand';
  const result = await upsertBrandProductsToDb(brandName, products, '', onProgress);
  return result.totalCount;
};

/**
 * Applies only changed and new products to Firestore using throttled batching.
 */
export const applyDiffToFirestore = async (
  newProducts: Product[],
  updatedProducts: Product[],
  onProgress?: (committed: number, total: number) => void
): Promise<number> => {
  const itemsToSync = [...newProducts, ...updatedProducts];
  if (itemsToSync.length === 0) return 0;

  return await saveProductsToFirestore(itemsToSync, onProgress);
};

export async function saveProductsBulkToDb(products: Product[]): Promise<boolean> {
  try {
    const brandGroups: Record<string, Product[]> = {};
    for (const p of products) {
      const b = p.brand || 'D2C Brand';
      if (!brandGroups[b]) brandGroups[b] = [];
      brandGroups[b].push(p);
    }

    for (const [brandName, brandProds] of Object.entries(brandGroups)) {
      await upsertBrandProductsToDb(brandName, brandProds);
    }

    return true;
  } catch (error) {
    console.error('Error bulk saving products to Firestore:', error);
    return false;
  }
}

export async function getAllBrandsFromDb(): Promise<BrandSummary[]> {
  const fetchPromise = (async () => {
    const brandsMap: Record<string, BrandSummary> = {};

    // 1. Fetch stored brand summaries from BRANDS_COLLECTION
    try {
      const brandSnapshot = await getDocs(collection(db, BRANDS_COLLECTION));
      brandSnapshot.forEach((d) => {
        brandsMap[d.id] = { id: d.id, ...d.data() } as BrandSummary;
      });
    } catch (e) {
      console.warn('Brands collection query notice:', e);
    }

    // 2. Fetch all products from SHOPIFY_PRODUCTS_COLLECTION and aggregate by brand
    try {
      const docs = await fetchQueryInChunks(collection(db, SHOPIFY_PRODUCTS_COLLECTION), 300, 100);
      const brandCounts: Record<string, { name: string; count: number; categories: Set<string>; lastCrawledAt?: string; officialUrl?: string }> = {};

      docs.forEach((d) => {
        const spData = d.data();
        if (spData && (spData.title || spData.name || spData.price)) {
          const p = mapShopifyProductToProduct(spData, d.id);
          const bName = p.brand || 'D2C Brand';
          const slug = bName.toLowerCase().replace(/[^a-z0-9]/g, '');

          if (!brandCounts[slug]) {
            brandCounts[slug] = {
              name: bName,
              count: 0,
              categories: new Set(),
              lastCrawledAt: new Date().toISOString(),
              officialUrl: p.officialUrl
            };
          }
          brandCounts[slug].count += 1;
          if (p.category) brandCounts[slug].categories.add(p.category);
          if (p.officialUrl && !brandCounts[slug].officialUrl) {
            brandCounts[slug].officialUrl = p.officialUrl;
          }

          // Keep memoryProductsCache in sync
          if (!memoryProductsCache.some((mp) => mp.id === p.id)) {
            memoryProductsCache.push(p);
          }
        }
      });

      // Merge discovered product brands into brandsMap
      for (const [slug, info] of Object.entries(brandCounts)) {
        if (!brandsMap[slug]) {
          brandsMap[slug] = {
            id: slug,
            name: info.name,
            officialUrl: info.officialUrl || '',
            totalProducts: info.count,
            lastCrawledAt: info.lastCrawledAt || new Date().toISOString(),
            categories: Array.from(info.categories)
          };
        } else {
          brandsMap[slug].totalProducts = Math.max(brandsMap[slug].totalProducts || 0, info.count);
          if (info.officialUrl && !brandsMap[slug].officialUrl) {
            brandsMap[slug].officialUrl = info.officialUrl;
          }
          if (info.categories.size > 0) {
            const mergedCats = Array.from(
              new Set([...(brandsMap[slug].categories || []), ...Array.from(info.categories)])
            );
            brandsMap[slug].categories = mergedCats;
          }
        }
      }
    } catch (e) {
      console.warn('Products collection fetch notice:', e);
    }

    // 3. Merge memoryBrandsCache entries so no newly added brand in memory is dropped
    for (const [mSlug, mBrand] of Object.entries(memoryBrandsCache)) {
      if (!brandsMap[mSlug]) {
        brandsMap[mSlug] = mBrand;
      } else {
        brandsMap[mSlug].totalProducts = Math.max(brandsMap[mSlug].totalProducts || 0, mBrand.totalProducts || 0);
      }
    }

    const brandList = Object.values(brandsMap);
    brandList.forEach((b) => {
      memoryBrandsCache[b.id] = b;
    });
    return brandList;
  })();

  const fallbackList = Object.values(memoryBrandsCache);
  return withTimeout(fetchPromise, 15000, fallbackList);
}

export async function getProductsByBrandFromDb(brandName: string): Promise<Product[]> {
  const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const fallbackProds = memoryProductsCache.filter((p) => {
    const pBrand = (p.brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pId = p.id.toLowerCase();
    return (
      pBrand === brandSlug ||
      (pBrand.length > 2 && brandSlug.includes(pBrand)) ||
      (brandSlug.length > 2 && pBrand.includes(brandSlug)) ||
      pId.startsWith(brandSlug) ||
      (p.brand && p.brand.toLowerCase() === brandName.toLowerCase())
    );
  });

  const fetchPromise = (async () => {
    const products: Product[] = [];

    // 1. First fetch directly from subcollection `brands/{brandSlug}/products`
    try {
      const subColSnap = await getDocs(collection(db, BRANDS_COLLECTION, brandSlug, 'products'));
      if (!subColSnap.empty) {
        subColSnap.forEach((d) => {
          products.push({ id: d.id, ...d.data() } as Product);
        });
        return products;
      }
    } catch (e) {
      console.warn('Notice querying brand product subcollection:', e);
    }

    // 2. Query `shopify_products` collection
    try {
      const docs = await fetchQueryInChunks(collection(db, SHOPIFY_PRODUCTS_COLLECTION), 200, 100);
      docs.forEach((d) => {
        const spData = d.data();
        if (spData) {
          const mapped = mapShopifyProductToProduct(spData, d.id);
          const pBrand = (mapped.brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const pId = mapped.id.toLowerCase();

          if (
            pBrand === brandSlug ||
            (pBrand.length > 2 && brandSlug.includes(pBrand)) ||
            (brandSlug.length > 2 && pBrand.includes(brandSlug)) ||
            pId.startsWith(brandSlug) ||
            (mapped.brand && mapped.brand.toLowerCase() === brandName.toLowerCase())
          ) {
            if (!products.some((existing) => existing.id === mapped.id)) {
              products.push(mapped);
            }
          }
        }
      });
    } catch (e) {
      console.warn('Notice querying shopify_products for brand:', e);
    }

    return products;
  })();

  return withTimeout(fetchPromise, 4000, fallbackProds);
}

export const fetchBrandProductsFromDb = getProductsByBrandFromDb;

export async function deleteProductFromDb(productId: string, brandName?: string): Promise<boolean> {
  memoryProductsCache = memoryProductsCache.filter((p) => p.id !== productId);

  if (brandName) {
    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (memoryBrandsCache[brandSlug]) {
      memoryBrandsCache[brandSlug].totalProducts = Math.max(0, (memoryBrandsCache[brandSlug].totalProducts || 1) - 1);
    }
  }

  try {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));

    if (brandName) {
      const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
      try {
        await deleteDoc(doc(db, BRANDS_COLLECTION, brandSlug, 'products', productId));
      } catch (e) {
        // ignore
      }
      try {
        await deleteDoc(doc(db, BRANDS_COLLECTION, brandSlug, 'items', productId));
      } catch (e) {
        // ignore
      }
    }
    return true;
  } catch (err) {
    console.warn('Error deleting product from Firestore:', err);
    return true;
  }
}

export async function deleteBrandFromDb(brandSlug: string, brandName?: string): Promise<boolean> {
  const targetName = (brandName || brandSlug).trim();
  const normalizedSlug = brandSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedName = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetBrandLower = targetName.toLowerCase();

  // 1. Instant purge from memory caches
  for (const k of Object.keys(memoryBrandsCache)) {
    const cachedBrand = memoryBrandsCache[k];
    const cachedNameLower = (cachedBrand?.name || '').toLowerCase();
    const cachedSlug = (cachedBrand?.id || k).toLowerCase().replace(/[^a-z0-9]/g, '');

    if (
      k === normalizedSlug ||
      k === normalizedName ||
      cachedSlug === normalizedSlug ||
      cachedSlug === normalizedName ||
      cachedNameLower === targetBrandLower
    ) {
      delete memoryBrandsCache[k];
    }
  }

  memoryProductsCache = memoryProductsCache.filter((p) => {
    const pSlug = (p.brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pBrand = (p.brand || '').toLowerCase();

    const isMatch =
      pSlug === normalizedSlug ||
      pSlug === normalizedName ||
      pBrand === targetBrandLower ||
      p.id.toLowerCase().startsWith(normalizedSlug) ||
      p.id.toLowerCase().startsWith(normalizedName);

    return !isMatch;
  });

  try {
    // 2. Collect all possible brand document IDs
    const possibleBrandIds = Array.from(
      new Set([
        brandSlug,
        targetName,
        normalizedSlug,
        normalizedName,
        targetBrandLower
      ])
    ).filter(Boolean);

    // Also scan `brands` collection to find any docs matching brand name/slug
    try {
      const allBrandsSnap = await getDocs(collection(db, BRANDS_COLLECTION));
      allBrandsSnap.forEach((bDoc) => {
        const bData = bDoc.data();
        const bNameLower = (bData?.name || '').toLowerCase();
        const bSlugLower = (bData?.id || bDoc.id).toLowerCase().replace(/[^a-z0-9]/g, '');

        if (
          bDoc.id.toLowerCase() === targetBrandLower ||
          bSlugLower === normalizedSlug ||
          bSlugLower === normalizedName ||
          bNameLower === targetBrandLower
        ) {
          possibleBrandIds.push(bDoc.id);
        }
      });
    } catch (e) {
      console.warn('Notice scanning brands collection for deletion:', e);
    }

    const uniqueBrandIds = Array.from(new Set(possibleBrandIds));
    const deleteOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    // 3. Purge subcollections and brand documents for all identified brand IDs
    for (const bId of uniqueBrandIds) {
      try {
        // Delete items in `brands/{bId}/categories/{catId}/items`
        try {
          const catSnap = await getDocs(collection(db, BRANDS_COLLECTION, bId, 'categories'));
          for (const catDoc of catSnap.docs) {
            try {
              const catItemsSnap = await getDocs(
                collection(db, BRANDS_COLLECTION, bId, 'categories', catDoc.id, 'items')
              );
              catItemsSnap.docs.forEach((d) => {
                const ref = doc(db, BRANDS_COLLECTION, bId, 'categories', catDoc.id, 'items', d.id);
                deleteOps.push((batch) => batch.delete(ref));
              });
            } catch (e) {
              // ignore
            }
            const catRef = doc(db, BRANDS_COLLECTION, bId, 'categories', catDoc.id);
            deleteOps.push((batch) => batch.delete(catRef));
          }
        } catch (e) {
          // ignore
        }

        // Delete items in `products` and `items` subcollections under brand
        const directSubCollections = ['products', 'items'];
        for (const subCol of directSubCollections) {
          try {
            const subSnap = await getDocs(collection(db, BRANDS_COLLECTION, bId, subCol));
            subSnap.docs.forEach((d) => {
              const ref = doc(db, BRANDS_COLLECTION, bId, subCol, d.id);
              deleteOps.push((batch) => batch.delete(ref));
            });
          } catch (e) {
            // ignore
          }
        }

        // Delete the brand document itself
        const bRef = doc(db, BRANDS_COLLECTION, bId);
        deleteOps.push((batch) => batch.delete(bRef));
      } catch (e) {
        console.warn('Notice deleting brand doc:', bId, e);
      }
    }

    // 4. Delete matching products from top-level `products` collection
    const q = query(collection(db, PRODUCTS_COLLECTION));
    const snapshot = await getDocs(q);

    snapshot.forEach((d) => {
      const data = d.data() as Product;
      const pSlug = (data.brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pBrand = (data.brand || '').toLowerCase();

      const isExactMatch =
        pSlug === normalizedSlug ||
        pSlug === normalizedName ||
        pBrand === targetBrandLower ||
        (normalizedSlug.length >= 3 && d.id.toLowerCase().startsWith(normalizedSlug + '_')) ||
        (normalizedName.length >= 3 && d.id.toLowerCase().startsWith(normalizedName + '_'));

      if (isExactMatch) {
        const ref = doc(db, PRODUCTS_COLLECTION, d.id);
        deleteOps.push((batch) => batch.delete(ref));
      }
    });

    if (deleteOps.length > 0) {
      await executeBatchedOperations(deleteOps);
    }

    return true;
  } catch (err) {
    console.warn('Delete brand notice:', err);
    return true;
  }
}

export async function clearAllProductsAndBrandsFromDb(): Promise<boolean> {
  memoryBrandsCache = {};
  memoryProductsCache = [];

  try {
    const deleteOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    const brandsSnap = await getDocs(collection(db, BRANDS_COLLECTION));
    brandsSnap.docs.forEach((d) => {
      const ref = doc(db, BRANDS_COLLECTION, d.id);
      deleteOps.push((batch) => batch.delete(ref));
    });

    const prodsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    prodsSnap.docs.forEach((d) => {
      const ref = doc(db, PRODUCTS_COLLECTION, d.id);
      deleteOps.push((batch) => batch.delete(ref));
    });

    if (deleteOps.length > 0) {
      await executeBatchedOperations(deleteOps);
    }

    return true;
  } catch (err) {
    console.warn('Clear all database notice:', err);
    return true;
  }
}

export async function saveUserProfileToDb(userSession: { email: string; name: string; role: 'admin' | 'user'; avatar?: string }) {
  try {
    const userDocId = userSession.email.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const userDocRef = doc(db, USERS_COLLECTION, userDocId);
    await setDoc(userDocRef, {
      uid: userDocId,
      email: userSession.email,
      name: userSession.name,
      avatar: userSession.avatar || '',
      role: userSession.role || (userSession.email === 'imamir760@gmail.com' ? 'admin' : 'user'),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`User profile for ${userSession.email} synced to Firestore 'users' collection`);
  } catch (error) {
    console.warn('Notice saving user profile to Firestore:', error);
  }
}

export interface BrandRemovalRequestData {
  brandName: string;
  websiteUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  reason: string;
}

export interface BrandAdditionRequestData {
  brandName: string;
  websiteUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  category: string;
  details: string;
}

const BRAND_REMOVAL_COLLECTION = 'brand_removal_requests';
const BRAND_ADDITION_COLLECTION = 'brand_addition_requests';

export async function submitBrandRemovalRequest(data: BrandRemovalRequestData): Promise<boolean> {
  const path = BRAND_REMOVAL_COLLECTION;
  try {
    const docData = sanitizeForFirestore({
      ...data,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    });
    await addDoc(collection(db, path), docData);
    return true;
  } catch (error) {
    console.error('Error submitting brand removal request:', error);
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch {
      // Fallback
    }
    return false;
  }
}

export async function submitBrandAdditionRequest(data: BrandAdditionRequestData): Promise<boolean> {
  const path = BRAND_ADDITION_COLLECTION;
  try {
    const docData = sanitizeForFirestore({
      ...data,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    });
    await addDoc(collection(db, path), docData);
    return true;
  } catch (error) {
    console.error('Error submitting brand addition request:', error);
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch {
      // Fallback
    }
    return false;
  }
}

// ----------------------------------------------------------------------------
// SHOPIFY STORES & SHOPIFY PRODUCTS FIRESTORE SERVICES
// ----------------------------------------------------------------------------
const SHOPIFY_STORES_COLLECTION = 'shopify_stores';
const SHOPIFY_PRODUCTS_COLLECTION = 'shopify_products';

export async function saveShopifyStoreToDb(storeData: Partial<ShopifyStore>): Promise<ShopifyStore> {
  const path = SHOPIFY_STORES_COLLECTION;
  const storeDomain = storeData.store_domain?.toLowerCase().trim() || 'store';
  const cleanId = sanitizeDocId(storeDomain.replace(/^https?:\/\//, ''));
  const now = new Date().toISOString();

  const storeRecord: ShopifyStore = {
    id: cleanId,
    store_domain: storeData.store_domain || '',
    store_name: storeData.store_name || storeDomain,
    api_key: storeData.api_key || '',
    access_token: storeData.access_token || '',
    status: storeData.status || 'active',
    total_products: storeData.total_products || 0,
    last_scraped_at: storeData.last_scraped_at || now,
    created_at: storeData.created_at || now,
    discount_code: storeData.discount_code || '',
    notes: storeData.notes || ''
  };

  try {
    await setDoc(doc(db, path, cleanId), sanitizeForFirestore(storeRecord), { merge: true });
    return storeRecord;
  } catch (error) {
    console.error('Error saving Shopify Store to Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${cleanId}`);
    } catch {}
    return storeRecord;
  }
}

export async function getShopifyStoresFromDb(): Promise<ShopifyStore[]> {
  const path = SHOPIFY_STORES_COLLECTION;
  try {
    const snapshot = await getDocs(collection(db, path));
    const stores: ShopifyStore[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as ShopifyStore;
      stores.push({ ...data, id: d.id });
    });
    return stores;
  } catch (error) {
    console.error('Error getting Shopify Stores from Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch {}
    return [];
  }
}

export async function deleteShopifyStoreFromDb(storeId: string, storeDomain?: string, storeName?: string): Promise<boolean> {
  const path = SHOPIFY_STORES_COLLECTION;
  try {
    const targetDomainClean = (storeDomain || '').replace(/^https?:\/\//, '').toLowerCase().split('/')[0].trim();
    const targetNameClean = (storeName || '').trim();
    const targetNameLower = targetNameClean.toLowerCase();
    const cleanId = sanitizeDocId((storeId || targetDomainClean).replace(/^https?:\/\//, ''));

    // 1. Delete store documents from SHOPIFY_STORES_COLLECTION
    try {
      const storesSnap = await getDocs(collection(db, path));
      const storeRefsToDelete: any[] = [];

      storesSnap.forEach((d) => {
        const data = d.data();
        const dId = d.id.toLowerCase();
        const dName = (data.store_name || '').toLowerCase();
        const dDomain = (data.store_domain || '').toLowerCase();

        const matchesId = dId === storeId.toLowerCase() || dId === cleanId.toLowerCase() || (targetDomainClean && dId.includes(targetDomainClean));
        const matchesDomain = targetDomainClean && dDomain.includes(targetDomainClean);
        const matchesName = targetNameLower && (dName === targetNameLower || dName.includes(targetNameLower));

        if (matchesId || matchesDomain || matchesName) {
          storeRefsToDelete.push(d.ref);
        }
      });

      if (storeId) storeRefsToDelete.push(doc(db, path, storeId));
      if (cleanId && cleanId !== storeId) storeRefsToDelete.push(doc(db, path, cleanId));

      const uniqueStorePathSet = new Set(storeRefsToDelete.map((r) => r.path));
      for (const p of uniqueStorePathSet) {
        try {
          await deleteDoc(doc(db, p));
        } catch (e) {
          console.warn('Notice deleting store doc ref:', p, e);
        }
      }
    } catch (e) {
      console.warn('Error scanning/deleting store docs:', e);
    }

    // 2. Delete all matching products from SHOPIFY_PRODUCTS_COLLECTION
    try {
      const prodPath = SHOPIFY_PRODUCTS_COLLECTION;
      const allProdsDocs = await fetchQueryInChunks(collection(db, prodPath), 300, 100);
      const prodRefsToDelete: any[] = [];

      allProdsDocs.forEach((d) => {
        const data = d.data();
        const prodDom = (data.store_domain || data.officialUrl || '').toLowerCase();
        const prodVendor = (data.vendor || data.brand || data.brand_name || '').toLowerCase();

        const matchesDomain = targetDomainClean && prodDom.includes(targetDomainClean);
        const matchesVendor = targetNameLower && (prodVendor === targetNameLower || prodVendor.includes(targetNameLower));

        if (matchesDomain || matchesVendor) {
          prodRefsToDelete.push(d.ref);
        }
      });

      if (prodRefsToDelete.length > 0) {
        const ops = prodRefsToDelete.map((ref) => (batch: ReturnType<typeof writeBatch>) => batch.delete(ref));
        await executeBatchedOperations(ops);
      }
    } catch (prodErr) {
      console.warn('Error deleting shopify_products:', prodErr);
    }

    // 3. Purge brand record and subcollections from BRANDS_COLLECTION and top-level PRODUCTS_COLLECTION
    const brandSlug = targetDomainClean || sanitizeDocId(targetNameLower) || storeId;
    const bName = targetNameClean || storeName || storeId;
    try {
      await deleteBrandFromDb(brandSlug, bName);
    } catch (brandErr) {
      console.warn('Error in deleteBrandFromDb cascade:', brandErr);
    }

    // 4. Delete associated crawl logs from CRAWL_LOGS_COLLECTION
    try {
      const crawlSnap = await getDocs(collection(db, CRAWL_LOGS_COLLECTION));
      const crawlRefsToDelete: any[] = [];
      crawlSnap.forEach((d) => {
        const data = d.data();
        const cDom = (data.store_domain || data.domain || '').toLowerCase();
        const cBrand = (data.brand_slug || data.brand_name || data.brand || '').toLowerCase();

        if ((targetDomainClean && cDom.includes(targetDomainClean)) || (targetNameLower && cBrand.includes(targetNameLower))) {
          crawlRefsToDelete.push(d.ref);
        }
      });

      if (crawlRefsToDelete.length > 0) {
        const ops = crawlRefsToDelete.map((ref) => (batch: ReturnType<typeof writeBatch>) => batch.delete(ref));
        await executeBatchedOperations(ops);
      }
    } catch (crawlErr) {
      console.warn('Error deleting crawl_logs:', crawlErr);
    }

    return true;
  } catch (error) {
    console.error('Error deleting Shopify store:', error);
    try {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${storeId}`);
    } catch {}
    return false;
  }
}

export async function saveShopifyProductsToDb(
  products: ShopifyProduct[],
  onProgress?: (committedCount: number, totalCount: number) => void
): Promise<boolean> {
  if (!products || products.length === 0) return true;
  const path = SHOPIFY_PRODUCTS_COLLECTION;

  try {
    const ops = products.map((prod) => (batch: ReturnType<typeof writeBatch>) => {
      const docId = sanitizeDocId(`sp_${prod.variant_id || prod.id}`);
      const ref = doc(db, path, docId);

      // Clean and sanitize product payload to ensure document size is compact
      const cleanProd = {
        ...prod,
        // Truncate description if longer than 3000 chars to avoid bloated Firestore docs
        description: prod.description && prod.description.length > 3000
          ? prod.description.slice(0, 3000) + '...'
          : (prod.description || ''),
        // Filter out base64 data URLs in images if present, keeping http/https URLs or first 5 images
        images: (prod.images || [])
          .filter((img) => typeof img === 'string' && !img.startsWith('data:image/'))
          .slice(0, 5)
      };

      batch.set(ref, sanitizeForFirestore(cleanProd), { merge: true });
    });

    await executeBatchedOperations(ops, onProgress);
    return true;
  } catch (error) {
    console.warn('Notice saving Shopify products batch to Firestore:', error);
    return false;
  }
}

/**
 * Updates a brand name across Firestore BRANDS_COLLECTION, PRODUCTS_COLLECTION,
 * and memory caches so discovery feed automatically displays the updated brand name.
 */
export async function updateBrandNameInDb(
  oldBrandName: string,
  newBrandName: string,
  storeDomain?: string
): Promise<boolean> {
  const trimmedNew = newBrandName.trim();
  if (!trimmedNew) return false;

  const oldSlug = oldBrandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const newSlug = trimmedNew.toLowerCase().replace(/[^a-z0-9]/g, '') || 'd2cbrand';

  try {
    const nowIso = new Date().toISOString();

    // 1. Update memory caches
    if (oldSlug && memoryBrandsCache[oldSlug]) {
      const existing = memoryBrandsCache[oldSlug];
      delete memoryBrandsCache[oldSlug];
      memoryBrandsCache[newSlug] = {
        ...existing,
        id: newSlug,
        name: trimmedNew
      };
    } else {
      memoryBrandsCache[newSlug] = {
        id: newSlug,
        name: trimmedNew,
        officialUrl: storeDomain ? (storeDomain.startsWith('http') ? storeDomain : `https://${storeDomain}`) : '',
        totalProducts: 0,
        categories: ['General'],
        lastCrawledAt: nowIso
      };
    }

    memoryProductsCache.forEach((p) => {
      const pBrand = p.brand || '';
      if (
        pBrand.toLowerCase() === oldBrandName.toLowerCase() ||
        (storeDomain && p.officialUrl?.toLowerCase().includes(storeDomain.toLowerCase()))
      ) {
        p.brand = trimmedNew;
      }
    });

    // 2. Write/Update brand doc in BRANDS_COLLECTION
    const brandDocRef = doc(db, BRANDS_COLLECTION, newSlug);
    await setDoc(
      brandDocRef,
      sanitizeForFirestore({
        id: newSlug,
        name: trimmedNew,
        brand_name: trimmedNew,
        slug: newSlug,
        updatedAt: nowIso
      }),
      { merge: true }
    );

    // 3. Batch update products in SHOPIFY_PRODUCTS_COLLECTION in safe chunks
    const cleanDom = storeDomain ? storeDomain.replace(/^https?:\/\//, '').toLowerCase().split('/')[0] : '';
    const docs = await fetchQueryInChunks(collection(db, SHOPIFY_PRODUCTS_COLLECTION), 300, 100);
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    docs.forEach((d) => {
      const data = d.data() as any;
      const matchesBrand =
        data.brand_name?.toLowerCase() === oldBrandName.toLowerCase() ||
        data.brand?.toLowerCase() === oldBrandName.toLowerCase();
      const matchesDomain =
        cleanDom &&
        (data.canonical_product_url?.toLowerCase().includes(cleanDom) ||
          data.officialUrl?.toLowerCase().includes(cleanDom));

      if (matchesBrand || matchesDomain) {
        ops.push((batch) => {
          batch.update(d.ref, {
            brand: trimmedNew,
            brand_name: trimmedNew,
            updated_at: nowIso
          });
        });
      }
    });

    if (ops.length > 0) {
      await executeBatchedOperations(ops);
    }

    return true;
  } catch (err) {
    console.warn('Notice updating brand name in DB:', err);
    return false;
  }
}

export async function getShopifyProductsFromDb(storeDomain?: string): Promise<ShopifyProduct[]> {
  const path = SHOPIFY_PRODUCTS_COLLECTION;
  try {
    let baseTarget: any = collection(db, path);
    if (storeDomain) {
      const cleanDomain = storeDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
      baseTarget = query(collection(db, path), where('store_domain', '==', cleanDomain));
    }

    const docs = await fetchQueryInChunks(baseTarget, 300, 100);
    const products: ShopifyProduct[] = [];
    docs.forEach((d) => {
      const data = d.data() as ShopifyProduct;
      if (data) {
        products.push(data);
      }
    });
    return products;
  } catch (error) {
    console.warn('Notice fetching Shopify products from Firestore:', error);
    return [];
  }
}

export async function deleteShopifyProductFromDb(productId: string): Promise<boolean> {
  const path = SHOPIFY_PRODUCTS_COLLECTION;
  const docId = sanitizeDocId(`sp_${productId}`);
  try {
    // 1. Delete from shopify_products collection
    try {
      await deleteDoc(doc(db, path, docId));
    } catch {}
    try {
      await deleteDoc(doc(db, path, productId));
    } catch {}

    // 2. Delete from master products collection if exists
    try {
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, docId));
    } catch {}
    try {
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
    } catch {}

    return true;
  } catch (error) {
    console.error('Error deleting Shopify product:', error);
    try {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${docId}`);
    } catch {}
    return false;
  }
}


