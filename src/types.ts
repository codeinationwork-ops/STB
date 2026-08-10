export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

// 1. brands Collection Schema
export interface BrandCrawlerConfig {
  products_json_url?: string;
  sitemap_url?: string;
  crawl_frequency_hours: number;
  last_crawled_at: string;
  status: 'ACTIVE' | 'PAUSED' | 'FAILED';
}

export interface BrandSubscription {
  tier: string;
  is_featured: boolean;
  monthly_fee_inr: number;
}

export interface BrandDoc {
  _id: string;
  brand_name: string;
  slug: string;
  domain: string;
  official_url: string;
  logo_url: string;
  category_tags: string[];
  platform_type: string;
  crawler_config: BrandCrawlerConfig;
  subscription: BrandSubscription;
  created_at: string;
}

// 2. categories Collection Schema
export interface SubCategoryItem {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryDoc {
  _id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  subcategories: SubCategoryItem[];
  is_active: boolean;
}

// 3. products Collection Schema (Core Master Collection)
export interface ProductPricing {
  direct_price: number;
  marketplace_price: number;
  savings_amount: number;
  savings_percentage: number;
  currency: string;
}

export interface ProductMedia {
  primary_image: string;
  gallery_images: string[];
}

export interface ProductVariantDoc {
  variant_id: string;
  size?: string;
  color?: string;
  sku?: string;
  price: number;
  in_stock: boolean;
}

export interface ProductMetrics {
  click_count: number;
  wishlist_count: number;
  rating: number;
  reviews_count: number;
}

export interface ProductStatus {
  is_active: boolean;
  in_stock: boolean;
  last_crawled_at: string;
}

export interface ProductDoc {
  _id: string;
  brand_id: string;
  brand_name: string;
  title: string;
  slug: string;
  category_id: string;
  category_name: string;
  description: string;
  canonical_product_url: string;
  outbound_checkout_url: string;
  pricing: ProductPricing;
  media: ProductMedia;
  normalized_specs: ProductSpec[];
  variants: ProductVariantDoc[];
  metrics: ProductMetrics;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

// 4. crawl_logs Collection Schema
export interface CrawlLogDoc {
  _id: string;
  brand_id: string;
  started_at: string;
  completed_at: string;
  products_found: number;
  products_upserted: number;
  errors_encountered: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

// 5. search_logs Collection Schema
export interface SearchLogDoc {
  _id: string;
  user_session_id: string;
  raw_query: string;
  ai_parsed_intent: {
    category: string;
    max_price?: number | null;
    keywords: string[];
  };
  results_returned: number;
  clicked_product_id?: string;
  timestamp: string;
}

// UI Product representation (mapped from ProductDoc)
export interface Product {
  id: string;
  name: string;
  brand: string;
  brandLogo?: string;
  category: string;
  directPrice: number;
  marketplacePrice: number;
  marketplaceName: string;
  images: string[];
  specs: ProductSpec[];
  stockLeft: number;
  rating: number;
  reviewsCount: number;
  trendingScore: number;
  couponCode?: string;
  couponDiscount?: number;
  officialUrl: string;
  description: string;
  lastUpdated?: string;
  sizes?: string[];
  colors?: ProductColor[];
  badge?: string;
  priceDropHistory?: { date: string; directPrice: number; marketplacePrice: number }[];
  gender?: 'Men' | 'Women' | 'Unisex' | 'N/A';
  articleCollection?: string;
  // Optional Shopify Direct Checkout & Pricing Sync attributes
  price?: number;
  variant_id?: string | number;
  store_domain?: string;
  cart_permalink?: string;
  compare_at_price?: number;
  discount_percentage?: number;
  price_dropped?: boolean;
  previous_price?: number;
  active_promo_code?: string;
  promo_banner_found?: string;
  // Raw product doc attachment
  rawDoc?: ProductDoc;
}

export interface ShopifyStore {
  id: string;
  store_domain: string;
  store_name: string;
  api_key?: string;
  access_token?: string;
  status: 'active' | 'crawling' | 'error' | 'idle';
  total_products: number;
  last_scraped_at?: string;
  created_at: string;
  discount_code?: string;
  notes?: string;
}

export interface ShopifyProduct {
  id: string;
  variant_id: string | number;
  title: string;
  description: string;
  category: string;
  images: string[];
  price: number;
  compare_at_price?: number | null;
  discount_percentage: number;
  store_domain: string;
  cart_permalink: string;
  vendor?: string;
  gender?: 'Men' | 'Women' | 'Unisex' | 'N/A';
  created_at?: string;
  discount_code?: string;
  price_dropped?: boolean;
  previous_price?: number;
  active_promo_code?: string;
  promo_banner_found?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  image: string;
  storeCount: number;
  description: string;
  tag: string;
  popularBrands: string[];
}

export interface UserAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface CommunitySavings {
  id: string;
  userHandle: string;
  productName: string;
  brand: string;
  amountSaved: number;
  timeAgo: string;
  userAvatar: string;
}

export interface SavingsChartPoint {
  month: string;
  savings: number;
  orders: number;
}

export interface UserSession {
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

