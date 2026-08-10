import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot
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

const PRODUCTS_COLLECTION = 'products';
const BRANDS_COLLECTION = 'brands';
const CATEGORIES_COLLECTION = 'categories';
const CRAWL_LOGS_COLLECTION = 'crawl_logs';
const SEARCH_LOGS_COLLECTION = 'search_logs';
const WISHLIST_COLLECTION = 'wishlists';
const ORDERS_COLLECTION = 'orders';
const SEARCHES_COLLECTION = 'searches';
const USERS_COLLECTION = 'users';
const SHOPIFY_STORES_COLLECTION = 'shopify_stores';
const SHOPIFY_PRODUCTS_COLLECTION = 'shopify_products';

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

// Memory backup cache in case Firestore is unreachable/offline
const DEPRECATED_DEMO_PRODUCTS: Product[] = [
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
    id: 'veirdo-1',
    name: 'Acid Wash Oversized Graphic Hoodie',
    brand: 'Veirdo',
    category: 'Streetwear & Oversized',
    gender: 'Unisex',
    directPrice: 1099,
    marketplacePrice: 1599,
    marketplaceName: 'Veirdo Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800'],
    specs: [
      { label: 'Wash', value: 'Vintage Acid Wash' },
      { label: 'GSM', value: '340 GSM' }
    ],
    stockLeft: 11,
    rating: 4.7,
    reviewsCount: 112,
    trendingScore: 94,
    couponCode: 'VEIRDODIRECT',
    couponDiscount: 12,
    officialUrl: 'https://veirdo.in/products/acid-wash-hoodie',
    description: 'Retro acid wash unisex hoodie featuring high-density puff print.'
  },
  {
    id: 'souledstore-1',
    name: 'Anime Edition Heavy Pullover Hoodie',
    brand: 'Souled Store',
    category: 'Streetwear & Oversized',
    gender: 'Unisex',
    directPrice: 1399,
    marketplacePrice: 1999,
    marketplaceName: 'Souled Store Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800'],
    specs: [
      { label: 'Print', value: 'Licensed Screen Print' },
      { label: 'Fabric', value: '100% Combed Cotton' }
    ],
    stockLeft: 8,
    rating: 4.9,
    reviewsCount: 310,
    trendingScore: 99,
    couponCode: 'SOULEDDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://thesouledstore.com/products/anime-hoodie',
    description: 'Official licensed anime graphic hoodie in high grade cotton.'
  },
  {
    id: 'urbanic-1',
    name: 'Ribbed Knit Cropped Top',
    brand: 'Urbanic',
    category: 'Streetwear & Oversized',
    gender: 'Women',
    directPrice: 890,
    marketplacePrice: 1290,
    marketplaceName: 'Urbanic Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800'],
    specs: [
      { label: 'Knit', value: 'Fine Stretch Ribbed' },
      { label: 'Style', value: 'Cropped Fit' }
    ],
    stockLeft: 22,
    rating: 4.7,
    reviewsCount: 145,
    trendingScore: 95,
    couponCode: 'URBANICDIRECT',
    couponDiscount: 15,
    officialUrl: 'https://urbanic.com/products/ribbed-crop-top',
    description: 'Trendy ribbed knit cropped top with soft stretch contouring.'
  },
  {
    id: 'urbanic-2',
    name: 'High-Waisted Wide Leg Tailored Trousers',
    brand: 'Urbanic',
    category: 'Streetwear & Oversized',
    gender: 'Women',
    directPrice: 1490,
    marketplacePrice: 2190,
    marketplaceName: 'Urbanic Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800'],
    specs: [
      { label: 'Waist', value: 'High Rise Fitted' },
      { label: 'Leg', value: 'Wide Drape Flow' }
    ],
    stockLeft: 16,
    rating: 4.8,
    reviewsCount: 198,
    trendingScore: 96,
    couponCode: 'URBANICDIRECT',
    couponDiscount: 15,
    officialUrl: 'https://urbanic.com/products/wide-leg-trousers',
    description: 'Chic high-waisted tailored trousers with smooth drape silhouette.'
  },
  {
    id: 'bhaane-1',
    name: 'Modern Utility Boxy Oversized Shirt',
    brand: 'Bhaane',
    category: 'Streetwear & Oversized',
    gender: 'Unisex',
    directPrice: 2200,
    marketplacePrice: 3100,
    marketplaceName: 'Bhaane Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800'],
    specs: [
      { label: 'Fabric', value: 'Handwoven Organic Cotton' },
      { label: 'Cut', value: 'Boxy Drop Shoulder' }
    ],
    stockLeft: 7,
    rating: 4.9,
    reviewsCount: 62,
    trendingScore: 93,
    couponCode: 'BHAANEDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://bhaane.com/products/boxy-utility-shirt',
    description: 'Artisanal organic cotton boxy shirt with minimal chest pocket design.'
  },
  {
    id: 'minimalist-1',
    name: '10% Niacinamide + Matmarine Face Serum 30ml',
    brand: 'Minimalist',
    category: 'Clean Beauty & Skincare',
    gender: 'Unisex',
    directPrice: 599,
    marketplacePrice: 799,
    marketplaceName: 'Minimalist Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800'],
    specs: [
      { label: 'Active', value: '10% Niacinamide' },
      { label: 'Skin Type', value: 'Oily & Acne Prone' }
    ],
    stockLeft: 35,
    rating: 4.9,
    reviewsCount: 420,
    trendingScore: 99,
    couponCode: 'MINIMALISTDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://beminimalist.co/products/niacinamide-10',
    description: 'Niacinamide serum formulated to reduce sebum production and blemishes.'
  },
  {
    id: 'minimalist-2',
    name: 'SPF 50 PA++++ Lightweight Sunscreen Fluid 50g',
    brand: 'Minimalist',
    category: 'Clean Beauty & Skincare',
    gender: 'Unisex',
    directPrice: 499,
    marketplacePrice: 699,
    marketplaceName: 'Minimalist Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800'],
    specs: [
      { label: 'Protection', value: 'SPF 50 PA++++' },
      { label: 'Finish', value: 'Zero White Cast Matte' }
    ],
    stockLeft: 40,
    rating: 4.8,
    reviewsCount: 512,
    trendingScore: 97,
    couponCode: 'MINIMALISTDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://beminimalist.co/products/sunscreen-spf-50',
    description: 'Broad spectrum sunscreen with lightweight non-greasy absorption.'
  },
  {
    id: 'comet-1',
    name: 'Aeon Retro Chunky Low-Top Sneakers',
    brand: 'Comet',
    category: 'Indie Footwear',
    gender: 'Men',
    directPrice: 2999,
    marketplacePrice: 4299,
    marketplaceName: 'Comet Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'],
    specs: [
      { label: 'Sole', value: 'TPU Cushioning Sole' },
      { label: 'Upper', value: 'Full Grain Leather & Mesh' }
    ],
    stockLeft: 12,
    rating: 4.8,
    reviewsCount: 175,
    trendingScore: 97,
    couponCode: 'COMETDIRECT',
    couponDiscount: 15,
    officialUrl: 'https://wearcomet.com/products/aeon-retro',
    description: 'Chunky retro low-top sneakers crafted in premium leather paneled mesh.'
  },
  {
    id: 'neemans-1',
    name: 'ReLive Knit Merino Wool Slip-On Shoes',
    brand: "Neeman's",
    category: 'Indie Footwear',
    gender: 'Unisex',
    directPrice: 2299,
    marketplacePrice: 3299,
    marketplaceName: "Neeman's Direct vs Marketplace",
    images: ['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800'],
    specs: [
      { label: 'Material', value: 'Recycled Merino Wool Knit' },
      { label: 'Insole', value: 'Memory Foam Cushioning' }
    ],
    stockLeft: 15,
    rating: 4.7,
    reviewsCount: 210,
    trendingScore: 94,
    couponCode: 'NEEMANSDIRECT',
    couponDiscount: 12,
    officialUrl: 'https://neemans.com/products/relive-knit',
    description: 'Breathable lightweight slip-ons made from sustainable Merino wool.'
  },
  {
    id: 'bluetokai-1',
    name: 'Attikan Estate Dark Roast Coffee Beans 500g',
    brand: 'Blue Tokai',
    category: 'Artisanal Coffee',
    gender: 'Unisex',
    directPrice: 650,
    marketplacePrice: 850,
    marketplaceName: 'Blue Tokai Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800'],
    specs: [
      { label: 'Roast', value: 'Dark Roast Single Estate' },
      { label: 'Notes', value: 'Dark Chocolate & Roasted Almond' }
    ],
    stockLeft: 50,
    rating: 4.9,
    reviewsCount: 680,
    trendingScore: 99,
    couponCode: 'BLUETOKAIDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://bluetokaicoffee.com/products/attikan-estate',
    description: 'Single estate 100% Arabica coffee roasted fresh upon order.'
  },
  {
    id: 'nobero-2',
    name: 'Everyday Comfort Stretch Jogger Trousers',
    brand: 'Nobero',
    category: 'Streetwear & Oversized',
    gender: 'Men',
    directPrice: 699,
    marketplacePrice: 1199,
    marketplaceName: 'Nobero Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800'],
    specs: [
      { label: 'Fit', value: 'Slim Jogger Taper' },
      { label: 'Fabric', value: 'Cotton Lycra Blend' }
    ],
    stockLeft: 25,
    rating: 4.7,
    reviewsCount: 180,
    trendingScore: 94,
    couponCode: 'NOBERODIRECT',
    couponDiscount: 10,
    officialUrl: 'https://nobero.com/products/stretch-jogger-trousers',
    description: 'Lightweight stretch cotton jogger trousers for all-day active comfort.'
  },
  {
    id: 'veirdo-2',
    name: 'Casual Lightweight Cotton Chino Trousers',
    brand: 'Veirdo',
    category: 'Streetwear & Oversized',
    gender: 'Men',
    directPrice: 749,
    marketplacePrice: 1299,
    marketplaceName: 'Veirdo Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800'],
    specs: [
      { label: 'Style', value: 'Classic Chino Cut' },
      { label: 'Fabric', value: '100% Breathable Twill' }
    ],
    stockLeft: 19,
    rating: 4.6,
    reviewsCount: 142,
    trendingScore: 92,
    couponCode: 'VEIRDODIRECT',
    couponDiscount: 12,
    officialUrl: 'https://veirdo.in/products/chino-trousers',
    description: 'Versatile cotton chino trousers with reinforced stitching and clean front.'
  },
  {
    id: 'urbanic-3',
    name: 'Linen Blend High-Rise Ankle Trousers',
    brand: 'Urbanic',
    category: 'Streetwear & Oversized',
    gender: 'Women',
    directPrice: 720,
    marketplacePrice: 1190,
    marketplaceName: 'Urbanic Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800'],
    specs: [
      { label: 'Material', value: 'Linen Viscose Blend' },
      { label: 'Rise', value: 'High Elastic Waistband' }
    ],
    stockLeft: 22,
    rating: 4.8,
    reviewsCount: 205,
    trendingScore: 96,
    couponCode: 'URBANICDIRECT',
    couponDiscount: 15,
    officialUrl: 'https://urbanic.com/products/linen-ankle-trousers',
    description: 'Breezy linen blend high-rise trousers designed for easy summer tailoring.'
  },
  {
    id: 'souledstore-2',
    name: 'Urban Flex Utility Cargo Trousers',
    brand: 'Souled Store',
    category: 'Streetwear & Oversized',
    gender: 'Unisex',
    directPrice: 749,
    marketplacePrice: 1399,
    marketplaceName: 'Souled Store Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800'],
    specs: [
      { label: 'Fit', value: 'Relaxed Streetwear Fit' },
      { label: 'Pockets', value: '6 Deep Utility Pockets' }
    ],
    stockLeft: 14,
    rating: 4.8,
    reviewsCount: 280,
    trendingScore: 97,
    couponCode: 'SOULEDDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://thesouledstore.com/products/flex-cargo-trousers',
    description: 'Comfortable stretch cotton utility cargo trousers with elastic drawstring waist.'
  },
  {
    id: 'snitch-3',
    name: 'Slim Fit Cotton Stretch Utility Trousers',
    brand: 'Snitch',
    category: 'Streetwear & Oversized',
    gender: 'Men',
    directPrice: 749,
    marketplacePrice: 1399,
    marketplaceName: 'Snitch Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800'],
    specs: [
      { label: 'Cut', value: 'Modern Slim Tapered' },
      { label: 'Fabric', value: '98% Cotton 2% Elastane' }
    ],
    stockLeft: 15,
    rating: 4.7,
    reviewsCount: 164,
    trendingScore: 95,
    couponCode: 'SNITCHDIRECT10',
    couponDiscount: 10,
    officialUrl: 'https://snitch.co.in/products/slim-utility-trousers',
    description: 'Clean modern slim fit stretch trousers engineered for urban daily wear.'
  },
  {
    id: 'dailyobjects-1',
    name: 'MagSafe Leatherette Armor Desk Stand & Wallet',
    brand: 'DailyObjects',
    category: 'Tech & EDC',
    gender: 'Unisex',
    directPrice: 1199,
    marketplacePrice: 1699,
    marketplaceName: 'DailyObjects Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800'],
    specs: [
      { label: 'Compatibility', value: 'MagSafe iPhone 12-16 Series' },
      { label: 'Material', value: 'Vegan Leatherette' }
    ],
    stockLeft: 28,
    rating: 4.8,
    reviewsCount: 130,
    trendingScore: 95,
    couponCode: 'DAILYOBJECTSDIRECT',
    couponDiscount: 10,
    officialUrl: 'https://dailyobjects.com/products/magsafe-wallet',
    description: 'Modular MagSafe phone stand and card wallet with dual viewing angles.'
  }
];

export const INITIAL_D2C_PRODUCTS: Product[] = DEPRECATED_DEMO_PRODUCTS;

let memoryProductsCache: Product[] = [];
let memoryBrandsCache: Record<string, BrandSummary> = {};

export function safeNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? fallback : val;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.]/g, '');
    if (!cleaned) return fallback;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
  }
  return fallback;
}

export function mapDocToProduct(d: { id: string; data: () => any }): Product {
  const data = d.data();
  const title = data.title || data.name || 'D2C Product';
  const brand = data.brand_name || data.brand || 'D2C Brand';
  const rawCategory = data.product_type || data.category_name || data.category || 'Streetwear & Apparel';
  const category = String(rawCategory).trim() || 'Streetwear & Apparel';

  const directPrice = safeNumber(data.pricing?.direct_price) ||
                      safeNumber(data.directPrice) ||
                      safeNumber(data.price) ||
                      1299;

  const rawCompareAt = safeNumber(data.pricing?.marketplace_price) ||
                       safeNumber(data.marketplacePrice) ||
                       safeNumber(data.compare_at_price);

  const marketplacePrice = rawCompareAt > directPrice ? rawCompareAt : Math.round(directPrice * 1.35);

  const images = data.media?.gallery_images || data.images || (data.media?.primary_image ? [data.media.primary_image] : ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800']);
  const specs = data.normalized_specs || data.specs || [];
  const officialUrl = data.canonical_product_url || data.officialUrl || '';

  const rawGender = data.gender || data.target_gender || data.audience;
  let gender: 'Men' | 'Women' | 'Unisex' = 'Unisex';

  const nameAndCat = (title + ' ' + category).toLowerCase();
  const hasFemaleMention = /\b(women|womens|female|ladies|girls|woman)\b/i.test(nameAndCat);
  const hasMaleMention = /\b(men|mens|male|gents|boys|man)\b/i.test(nameAndCat);

  if (hasFemaleMention && !hasMaleMention) {
    gender = 'Women';
  } else if (hasMaleMention && !hasFemaleMention) {
    gender = 'Men';
  } else if (rawGender) {
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
  
  const directPrice = safeNumber(sp.directPrice) ||
                      safeNumber(sp.price) ||
                      safeNumber(sp.pricing?.direct_price) ||
                      safeNumber(sp.variants?.[0]?.price) ||
                      1299;

  const rawCompareAt = safeNumber(sp.compare_at_price) ||
                       safeNumber(sp.marketplacePrice) ||
                       safeNumber(sp.pricing?.marketplace_price) ||
                       safeNumber(sp.variants?.[0]?.compare_at_price);

  const marketplacePrice = rawCompareAt > directPrice ? rawCompareAt : Math.round(directPrice * 1.35);

  const images = Array.isArray(sp.images) && sp.images.length > 0 
    ? sp.images 
    : (sp.media?.gallery_images || (sp.image ? [sp.image] : ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800']));

  const domainClean = sp.store_domain ? sp.store_domain.replace(/^https?:\/\//, '').split('/')[0] : '';
  const officialUrl = sp.officialUrl || sp.cart_permalink || (domainClean ? `https://${domainClean}` : '');

  const rawGenderStr = String(sp.gender || sp.target_gender || sp.audience || '').trim().toLowerCase();
  let gender: 'Men' | 'Women' | 'Unisex' = 'Unisex';
  if (/^(women|womens|women's|female|ladies|lady|girl|girls|for her)$/i.test(rawGenderStr)) {
    gender = 'Women';
  } else if (/^(men|mens|men's|male|gents|guy|guys|boy|boys|for him)$/i.test(rawGenderStr)) {
    gender = 'Men';
  } else if (/^(unisex|all|everyone)$/i.test(rawGenderStr)) {
    gender = 'Unisex';
  } else {
    const tagsStr = Array.isArray(sp.tags) ? sp.tags.join(' ') : String(sp.tags || '');
    const specsStr = Array.isArray(sp.specs) ? sp.specs.map((s: any) => `${s?.label || ''} ${s?.value || ''}`).join(' ') : '';
    const text = `${name} ${category} ${sp.product_type || ''} ${sp.description || ''} ${tagsStr} ${specsStr}`.toLowerCase();
    const hasWomen = FEMALE_KEYWORDS_REGEX.test(text);
    const hasMen = MALE_KEYWORDS_REGEX.test(text);
    if (hasWomen && !hasMen) gender = 'Women';
    else if (hasMen && !hasWomen) gender = 'Men';
    else gender = 'Unisex';
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

// 1. Fetch real-time products from Firestore in small batched queries
export async function ensureProductsSeededToFirestore(): Promise<void> {
  try {
    // Limit check to 1 document so we never fetch full dataset just to check if empty
    const qSnapshot = await getDocs(query(collection(db, SHOPIFY_PRODUCTS_COLLECTION), limit(1)));
    if (qSnapshot.empty) {
      console.log('Seeding initial products to Shopify products collection (shopify_products)...');
      const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
      INITIAL_D2C_PRODUCTS.forEach((p) => {
        const docId = sanitizeDocId(`sp_${p.id}`);
        const ref = doc(db, SHOPIFY_PRODUCTS_COLLECTION, docId);
        const docData = sanitizeForFirestore({
          id: p.id,
          title: p.name,
          name: p.name,
          vendor: p.brand,
          brand: p.brand,
          brand_name: p.brand,
          product_type: p.category,
          category: p.category,
          category_name: p.category,
          gender: p.gender || 'Unisex',
          price: p.directPrice,
          directPrice: p.directPrice,
          compare_at_price: p.marketplacePrice,
          marketplacePrice: p.marketplacePrice,
          marketplaceName: p.marketplaceName,
          images: p.images,
          specs: p.specs,
          stockLeft: p.stockLeft,
          rating: p.rating,
          reviewsCount: p.reviewsCount,
          trendingScore: p.trendingScore,
          couponCode: p.couponCode,
          couponDiscount: p.couponDiscount,
          officialUrl: p.officialUrl,
          description: p.description,
          updated_at: new Date().toISOString()
        });
        ops.push((batch) => batch.set(ref, docData));
      });
      await executeBatchedOperations(ops);
    }
  } catch (err) {
    console.warn('Notice seeding initial products to Shopify products collection:', err);
  }
}

// Standard Fisher-Yates array shuffle for client-side randomization
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Multi-Brand Round-Robin Interleaving to guarantee brand diversity in feeds
export const interleaveByBrand = (array: Product[]): Product[] => {
  if (!array || array.length === 0) return [];

  const getBrand = (p: Product) =>
    normalizeStoreAndBrandName(p.brand, p.officialUrl || p.store_domain, (p as any).vendor || (p as any).store_name) || 'Brand';

  // Group products by normalized brand name
  const brandBuckets = new Map<string, Product[]>();
  array.forEach((p) => {
    const b = getBrand(p);
    if (!brandBuckets.has(b)) brandBuckets.set(b, []);
    brandBuckets.get(b)!.push(p);
  });

  // Shuffle products within each brand bucket
  brandBuckets.forEach((prods, key) => {
    brandBuckets.set(key, shuffleArray(prods));
  });

  // Shuffle brand keys so starting brand varies dynamically
  const brandKeys = shuffleArray(Array.from(brandBuckets.keys()));

  const result: Product[] = [];
  const maxLen = Math.max(0, ...Array.from(brandBuckets.values()).map((b) => b.length));

  // Round-robin interleave across distinct brands
  for (let i = 0; i < maxLen; i++) {
    for (const bKey of brandKeys) {
      const bucket = brandBuckets.get(bKey);
      if (bucket && i < bucket.length) {
        result.push(bucket[i]);
      }
    }
  }

  return result;
};

// Brand-Diverse Picker to guarantee each skip/shuffle transitions to a product from a NEW brand
export function pickNextBrandDiverseProduct(
  pool: Product[],
  currentProduct: Product | null,
  seenProductIds: Set<string>,
  recentBrandHistory: string[]
): Product | null {
  if (!pool || pool.length === 0) return null;

  const getBrand = (p: Product) =>
    normalizeStoreAndBrandName(p.brand, p.officialUrl || p.store_domain, (p as any).vendor || (p as any).store_name) || 'Brand';

  // Find unseen products in pool
  let unseen = pool.filter((p) => !seenProductIds.has(p.id));
  if (unseen.length === 0) {
    // Reset seen product IDs if all products have been seen
    pool.forEach((p) => seenProductIds.delete(p.id));
    unseen = pool;
  }

  const currentBrand = currentProduct ? getBrand(currentProduct) : null;

  // Group unseen products by normalized brand
  const brandBuckets = new Map<string, Product[]>();
  unseen.forEach((p) => {
    const b = getBrand(p);
    if (!brandBuckets.has(b)) brandBuckets.set(b, []);
    brandBuckets.get(b)!.push(p);
  });

  const availableBrands = Array.from(brandBuckets.keys());

  // 1. Strictly exclude current product's brand if other brands exist
  let candidateBrands = availableBrands.filter((b) => b !== currentBrand);
  if (candidateBrands.length === 0) {
    candidateBrands = availableBrands;
  }

  // 2. Exclude recently shown brands from recent history if possible
  const notRecentlySeenBrands = candidateBrands.filter((b) => !recentBrandHistory.includes(b));
  let selectedBrands = notRecentlySeenBrands.length > 0 ? notRecentlySeenBrands : candidateBrands;

  // 3. Pick a brand randomly among candidate brands
  const chosenBrand = selectedBrands[Math.floor(Math.random() * selectedBrands.length)];
  const brandProducts = brandBuckets.get(chosenBrand) || [];

  // 4. Pick a product from chosen brand (excluding current product if possible)
  const candidateProducts = brandProducts.filter((p) => p.id !== currentProduct?.id);
  const finalPool = candidateProducts.length > 0 ? candidateProducts : brandProducts;
  const chosenProduct = finalPool[Math.floor(Math.random() * finalPool.length)] || null;

  if (chosenProduct) {
    seenProductIds.add(chosenProduct.id);
    const brandName = getBrand(chosenProduct);
    recentBrandHistory.push(brandName);
    // Keep history bounded to last 15 brands
    if (recentBrandHistory.length > 15) {
      recentBrandHistory.shift();
    }
  }

  return chosenProduct;
}

// Comprehensive gender classification helpers
export const FEMALE_KEYWORDS_REGEX = /\b(women|womens|women's|woman|female|ladies|lady|girl|girls|for her|her|dress|dresses|skirt|skirts|saree|saris|sari|lehenga|lehengas|bra|bras|bralette|crop|croptop|crop top|kurti|kurtis|gown|gowns|bikini|monokini|frock|frocks|blouse|blouses|heels|stiletto|stilettos|wedge|wedges|handbag|handbags|clutch|clutches|tote|totes|lingerie|makeup|lipstick|lipsticks|lipgloss|eyeliner|mascara|blush|necklace|necklaces|earring|earrings|pendant|pendants|anklet|anklets|scrunchie|scrunchies|hairband|hairbands|dupatta|dupattas|palazzo|palazzos|salwar|salwars|choli|cholis|maternity|corset|corsets|camisole|nighty|nightgown|scrunchy|bodycon|midi|maxi|sanitary|feminine|purse|purses|shoulder bag|pump|pumps|mule|mules|sandals|kajal|nail polish|nail paint|lip balm|concealer|foundation|serum|facial|compact|highlighter|tampon|pads|anarkali|sharara|gharara|kaftan|kaftans|jumpsuit|romper|slip dress|wrap dress|nightwear for women|ladies footwear)\b/i;

export const MALE_KEYWORDS_REGEX = /\b(men|mens|men's|man|male|gents|gentleman|gentlemen|boy|boys|for him|him|menswear|sherwani|kurta for men|boxer|boxers|trunks|briefs|beard|shaving|aftershave|tie|bow tie|cufflinks|tuxedo|suspenders)\b/i;

export function isFemaleProduct(p: Product): boolean {
  if (!p) return false;

  const g = (p.gender || '').toLowerCase().trim();
  // N/A, Not Assigned, Unisex, or empty gender must NEVER appear in Female section unless explicitly Female
  if (g === 'n/a' || g === 'na' || g === 'not assigned' || g === 'none' || g === 'unassigned' || g === 'unisex') {
    return false;
  }

  // 1. Explicit Female gender tag
  if (g === 'women' || g === 'female' || g === 'ladies' || g === "women's" || g === 'womens') {
    return true;
  }

  // 2. Explicit Male gender tag -> definitely NOT Female
  if (g === 'men' || g === 'male' || g === 'gents' || g === "men's" || g === 'mens') {
    return false;
  }

  // 3. Fallback to strict keyword matching if gender tag is missing
  const text = `${p.name || ''} ${p.category || ''} ${p.description || ''} ${(p.specs || []).map(s => `${s?.label || ''} ${s?.value || ''}`).join(' ')}`.toLowerCase();

  const matchesFemale = FEMALE_KEYWORDS_REGEX.test(text);
  const matchesMale = MALE_KEYWORDS_REGEX.test(text);

  if (matchesFemale && !matchesMale) return true;

  return false;
}

export function isMaleProduct(p: Product): boolean {
  if (!p) return false;

  const g = (p.gender || '').toLowerCase().trim();
  // N/A, Not Assigned, Unisex, or empty gender must NEVER appear in Male section unless explicitly Male
  if (g === 'n/a' || g === 'na' || g === 'not assigned' || g === 'none' || g === 'unassigned' || g === 'unisex') {
    return false;
  }

  // 1. Explicit Male gender tag
  if (g === 'men' || g === 'male' || g === 'gents' || g === "men's" || g === 'mens') {
    return true;
  }

  // 2. Explicit Female gender tag -> definitely NOT Male
  if (g === 'women' || g === 'female' || g === 'ladies' || g === "women's" || g === 'womens') {
    return false;
  }

  // 3. Fallback to strict keyword matching if gender tag is missing
  const text = `${p.name || ''} ${p.category || ''} ${p.description || ''} ${(p.specs || []).map(s => `${s?.label || ''} ${s?.value || ''}`).join(' ')}`.toLowerCase();

  const matchesFemale = FEMALE_KEYWORDS_REGEX.test(text);
  const matchesMale = MALE_KEYWORDS_REGEX.test(text);

  if (matchesFemale) return false;
  if (matchesMale) return true;

  return false;
}

// Helper to check if a product matches the requested gender filter
export function matchesGenderFilter(p: Product, genderFilter?: string | null): boolean {
  if (!genderFilter || genderFilter.toLowerCase() === 'all') return true;
  const rawG = genderFilter.toLowerCase().trim();
  if (rawG === 'men' || rawG === 'male' || rawG === 'him' || rawG === 'for him') {
    return isMaleProduct(p);
  }
  if (rawG === 'women' || rawG === 'female' || rawG === 'her' || rawG === 'for her') {
    return isFemaleProduct(p);
  }
  if (rawG === 'unisex') {
    return (p.gender || '').toLowerCase() === 'unisex';
  }
  return true;
}

// Lightweight stream-based pagination wrapper interface for shopify_products query
export interface StreamPaginationOptions {
  batchSize?: number; // defaults to 50 to prevent memory spikes and keep UI snappy
  genderFilter?: string | null;
  maxItems?: number;
  onChunk?: (chunk: Product[], accumulated: Product[], isDone: boolean) => void;
}

// Stream-based lightweight pagination wrapper for shopify_products using limit(50)
export async function streamShopifyProducts(
  options: StreamPaginationOptions = {}
): Promise<Product[]> {
  const batchSize = options.batchSize || 50; // Stream in 50-item lightweight chunks
  const maxItems = options.maxItems || 50000;
  const genderFilter = options.genderFilter || null;
  const onChunk = options.onChunk;

  const itemsMap = new Map<string, Product>();
  let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  let hasMore = true;

  const gLower = genderFilter ? genderFilter.toLowerCase().trim() : 'all';
  let genderConstraint: any;
  if (gLower !== 'all' && gLower !== '') {
    let selectedGender = gLower;
    if (gLower === 'men' || gLower === 'male' || gLower === 'him' || gLower === 'for him') {
      selectedGender = 'Men';
    } else if (gLower === 'women' || gLower === 'female' || gLower === 'her' || gLower === 'for her') {
      selectedGender = 'Women';
    } else if (gLower === 'unisex') {
      selectedGender = 'Unisex';
    }
    genderConstraint = where('gender', '==', selectedGender);
  } else {
    // Explicitly exclude products with 'N/A' gender values
    genderConstraint = where('gender', 'in', ['male', 'female', 'unisex', 'Men', 'Women', 'Unisex']);
  }

  try {
    while (hasMore && itemsMap.size < maxItems) {
      const fetchCount = Math.min(batchSize, maxItems - itemsMap.size);
      const chunkProducts: Product[] = [];

      try {
        const queryConstraints: any[] = [genderConstraint, orderBy('random_sort')];
        if (lastDoc) {
          queryConstraints.push(startAfter(lastDoc));
        }
        queryConstraints.push(limit(fetchCount));

        const q = query(collection(db, SHOPIFY_PRODUCTS_COLLECTION), ...queryConstraints);
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        snapshot.docs.forEach((d) => {
          const spData = d.data();
          if (spData && (spData.title || spData.name || spData.price)) {
            const mapped = mapShopifyProductToProduct(spData, d.id);
            if (matchesGenderFilter(mapped, genderFilter)) {
              itemsMap.set(mapped.id, mapped);
              chunkProducts.push(mapped);
            }
          }
        });

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.docs.length < fetchCount) {
          hasMore = false;
        }
      } catch (indexedErr) {
        console.warn('Notice: Composite index query (gender + random_sort) pending/unavailable, using lightweight 50-item fallback stream:', indexedErr);
        let fallbackConstraints: any[] = [];
        if (lastDoc) {
          fallbackConstraints.push(startAfter(lastDoc));
        }
        fallbackConstraints.push(limit(fetchCount));

        const q = query(collection(db, SHOPIFY_PRODUCTS_COLLECTION), ...fallbackConstraints);
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        snapshot.docs.forEach((d) => {
          const spData = d.data();
          if (spData && (spData.title || spData.name || spData.price)) {
            const mapped = mapShopifyProductToProduct(spData, d.id);
            if (matchesGenderFilter(mapped, genderFilter)) {
              itemsMap.set(mapped.id, mapped);
              chunkProducts.push(mapped);
            }
          }
        });

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.docs.length < fetchCount) {
          hasMore = false;
        }
      }

      const accumulated = Array.from(itemsMap.values());
      if (onChunk && chunkProducts.length > 0) {
        onChunk(chunkProducts, accumulated, !hasMore);
      }
    }
  } catch (err) {
    console.warn('Notice reading shopify_products in lightweight stream wrapper:', err);
  }

  const finalResult = Array.from(itemsMap.values());
  if (onChunk && finalResult.length > 0) {
    onChunk([], finalResult, true);
  }
  return finalResult;
}

// Fetch products in paginated 50-item lightweight chunks (with cursor) from shopify_products
export async function fetchProductBatch(
  lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  batchSize: number = 50,
  genderFilter?: string | null
): Promise<{ products: Product[]; nextCursor: QueryDocumentSnapshot<DocumentData> | null }> {
  try {
    const productsRef = collection(db, SHOPIFY_PRODUCTS_COLLECTION);
    const matchingProducts: Product[] = [];
    let nextCursor: QueryDocumentSnapshot<DocumentData> | null = null;

    const gLower = genderFilter ? genderFilter.toLowerCase().trim() : 'all';

    // Construct composite query using selectedGender and orderBy('random_sort'), excluding N/A
    const queryConstraints: any[] = [];
    if (gLower !== 'all' && gLower !== '') {
      let selectedGender = gLower;
      if (gLower === 'men' || gLower === 'male' || gLower === 'him' || gLower === 'for him') {
        selectedGender = 'Men';
      } else if (gLower === 'women' || gLower === 'female' || gLower === 'her' || gLower === 'for her') {
        selectedGender = 'Women';
      } else if (gLower === 'unisex') {
        selectedGender = 'Unisex';
      }
      queryConstraints.push(where('gender', '==', selectedGender));
    } else {
      // Explicitly exclude products with 'N/A' gender values using 'in' clause
      queryConstraints.push(where('gender', 'in', ['male', 'female', 'unisex', 'Men', 'Women', 'Unisex']));
    }

    queryConstraints.push(orderBy('random_sort'));

    if (lastVisibleDoc) {
      queryConstraints.push(startAfter(lastVisibleDoc));
    }
    queryConstraints.push(limit(batchSize));

    try {
      const q = query(productsRef, ...queryConstraints);
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        nextCursor = snapshot.docs[snapshot.docs.length - 1];
        snapshot.docs.forEach((docSnap) => {
          const spData = docSnap.data();
          if (spData && (spData.title || spData.name || spData.price)) {
            const mapped = mapShopifyProductToProduct(spData, docSnap.id);
            matchingProducts.push(mapped);
          }
        });
        return { products: matchingProducts, nextCursor };
      }
    } catch (indexedErr) {
      console.warn('Composite index query on shopify_products (gender + random_sort) unavailable or pending, executing resilient query fallback:', indexedErr);
      let fallbackConstraints: any[] = [];
      if (lastVisibleDoc) {
        fallbackConstraints.push(startAfter(lastVisibleDoc));
      }
      fallbackConstraints.push(limit(batchSize));
      const q = query(productsRef, ...fallbackConstraints);
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        nextCursor = snapshot.docs[snapshot.docs.length - 1];
        snapshot.docs.forEach((docSnap) => {
          const spData = docSnap.data();
          if (spData && (spData.title || spData.name || spData.price)) {
            const mapped = mapShopifyProductToProduct(spData, docSnap.id);
            if (matchesGenderFilter(mapped, genderFilter)) {
              matchingProducts.push(mapped);
            }
          }
        });
      }
      return { products: matchingProducts, nextCursor };
    }

    return { products: matchingProducts, nextCursor };
  } catch (error) {
    console.error('Error in fetchProductBatch:', error);
    return { products: [], nextCursor: null };
  }
}

// Helper: Safely fetch shopify_products using streamShopifyProducts with limit(50)
export async function fetchShopifyProductsBatched(
  maxItems: number = 50000,
  genderFilter?: string | null
): Promise<Product[]> {
  return streamShopifyProducts({
    batchSize: 50,
    genderFilter,
    maxItems
  });
}

// Fetch all products directly and live exclusively from Firestore shopify_products collection
export async function fetchAllProductsFromFirestore(genderFilter?: string | null): Promise<Product[]> {
  // Ensure initial products exist in shopify_products if empty
  await ensureProductsSeededToFirestore();

  const products = await fetchShopifyProductsBatched(50000, genderFilter);
  if (products.length > 0) {
    memoryProductsCache = products;
  }
  return memoryProductsCache;
}

export async function getProductsFromFirestore(gender?: string): Promise<Product[]> {
  try {
    if (memoryProductsCache && memoryProductsCache.length > 0) {
      // Trigger background update silently
      fetchAllProductsFromFirestore(gender).catch(() => {});
      const all = memoryProductsCache;
      if (!gender || gender.toLowerCase() === 'all') return all;
      return all.filter((p) => matchesGenderFilter(p, gender));
    }

    const fetchPromise = fetchAllProductsFromFirestore(gender);
    const fetched = await withTimeout(fetchPromise, 12000, memoryProductsCache);
    const all = fetched || [];
    if (!gender || gender.toLowerCase() === 'all') return all;

    return all.filter((p) => matchesGenderFilter(p, gender));
  } catch (error) {
    console.error('Error in getProductsFromFirestore:', error);
    return memoryProductsCache;
  }
}

export async function getOrSeedProducts(initialProducts: Product[] = []): Promise<Product[]> {
  if (memoryProductsCache && memoryProductsCache.length > 0) {
    fetchAllProductsFromFirestore().catch(() => {});
    return memoryProductsCache;
  }
  const fetchPromise = fetchAllProductsFromFirestore();
  const res = await withTimeout(fetchPromise, 12000, memoryProductsCache);
  return res || [];
}

// Fetch live products directly from Firestore shopify_products collection
export async function getLiveProductsFromDb(fallbackProducts: Product[] = []): Promise<Product[]> {
  if (memoryProductsCache && memoryProductsCache.length > 0) {
    fetchAllProductsFromFirestore().catch(() => {});
    return memoryProductsCache;
  }
  const fetchPromise = fetchAllProductsFromFirestore();
  const res = await withTimeout(fetchPromise, 12000, memoryProductsCache);
  return res || [];
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

// 4b. Fetch & Save Try-On Credits per unique user
export async function fetchUserTryOnCredits(userId: string): Promise<number> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data.tryOnCredits === 'number') {
        return data.tryOnCredits;
      }
    }
    // Default: 1 free Try-On per unique user
    return 1;
  } catch (error) {
    console.warn('Error fetching try-on credits from Firestore:', error);
    return 1;
  }
}

export async function saveUserTryOnCredits(userId: string, credits: number): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userDocRef, {
      tryOnCredits: credits,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving try-on credits to Firestore:', error);
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

    // 2. Fetch products from SHOPIFY_PRODUCTS_COLLECTION in safe batches and aggregate by brand
    try {
      const batchedProducts = await fetchShopifyProductsBatched(500);
      const brandCounts: Record<string, { name: string; count: number; categories: Set<string>; lastCrawledAt?: string; officialUrl?: string }> = {};

      batchedProducts.forEach((p) => {
        if (p && (p.name || p.brand || p.directPrice)) {
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

    // 2. Query `shopify_products` collection in safe batches
    try {
      const batchedShopify = await fetchShopifyProductsBatched(500);
      batchedShopify.forEach((mapped) => {
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

export async function deleteShopifyStoreFromDb(storeId: string, storeDomain?: string): Promise<boolean> {
  const path = SHOPIFY_STORES_COLLECTION;
  try {
    // 1. Delete store document (try exact storeId & cleanId variants)
    const cleanId = sanitizeDocId(storeId.replace(/^https?:\/\//, ''));
    try {
      await deleteDoc(doc(db, path, storeId));
    } catch (e1) {
      console.warn('Delete store exact ID attempt:', e1);
    }
    if (cleanId !== storeId) {
      try {
        await deleteDoc(doc(db, path, cleanId));
      } catch (e2) {
        console.warn('Delete store clean ID attempt:', e2);
      }
    }
    if (storeDomain) {
      const domainCleanId = sanitizeDocId(storeDomain.replace(/^https?:\/\//, ''));
      if (domainCleanId !== cleanId && domainCleanId !== storeId) {
        try {
          await deleteDoc(doc(db, path, domainCleanId));
        } catch {}
      }
    }

    // 2. Also delete associated store products in safe chunks of max 300 items
    if (storeDomain) {
      try {
        const prodPath = SHOPIFY_PRODUCTS_COLLECTION;
        const targetDomainClean = storeDomain.replace(/^https?:\/\//, '').toLowerCase().split('/')[0];

        const snapshot = await getDocs(collection(db, prodPath));
        const refsToDelete: any[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const prodDom = (data.store_domain || '').toLowerCase();
          if (prodDom.includes(targetDomainClean)) {
            refsToDelete.push(d.ref);
          }
        });

        if (refsToDelete.length > 0) {
          const ops = refsToDelete.map((ref) => (batch: ReturnType<typeof writeBatch>) => batch.delete(ref));
          await executeBatchedOperations(ops);
        }
      } catch (prodErr) {
        console.warn('Could not chunk-delete store products:', prodErr);
      }
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
      batch.set(ref, sanitizeForFirestore(prod), { merge: true });
    });

    await executeBatchedOperations(ops, onProgress);
    return true;
  } catch (error) {
    console.error('Error saving Shopify products batch to Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch {}
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

    // 3. Batch update products in SHOPIFY_PRODUCTS_COLLECTION (limited to 200 documents)
    const cleanDom = storeDomain ? storeDomain.replace(/^https?:\/\//, '').toLowerCase().split('/')[0] : '';
    const prodSnap = await getDocs(query(collection(db, SHOPIFY_PRODUCTS_COLLECTION), limit(200)));
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    prodSnap.forEach((d) => {
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

export async function getShopifyProductsFromDb(storeDomain?: string, maxItems: number = 50000): Promise<ShopifyProduct[]> {
  const path = SHOPIFY_PRODUCTS_COLLECTION;
  const products: ShopifyProduct[] = [];
  const BATCH_SIZE = 250;
  let lastDoc: any = null;
  let hasMore = true;

  try {
    const cleanDom = storeDomain ? storeDomain.replace(/^https?:\/\//, '').toLowerCase().split('/')[0] : '';

    while (hasMore && products.length < maxItems) {
      const fetchCount = Math.min(BATCH_SIZE, maxItems - products.length);
      let q = query(collection(db, path), limit(fetchCount));
      
      if (cleanDom) {
        q = lastDoc
          ? query(collection(db, path), where('store_domain', '==', storeDomain), startAfter(lastDoc), limit(fetchCount))
          : query(collection(db, path), where('store_domain', '==', storeDomain), limit(fetchCount));
      } else {
        q = lastDoc
          ? query(collection(db, path), startAfter(lastDoc), limit(fetchCount))
          : query(collection(db, path), limit(fetchCount));
      }

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      snapshot.forEach((d) => {
        products.push(d.data() as ShopifyProduct);
      });

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.docs.length < fetchCount) {
        hasMore = false;
      }
    }

    return products;
  } catch (error) {
    console.error('Error fetching Shopify products from Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch {}
    return products;
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


