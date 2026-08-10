import { Product, CategoryItem, UserAddress, CommunitySavings, SavingsChartPoint } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'neemans-1',
    name: 'ReLive Knit Merino Wool Sneakers',
    brand: "NEEMAN'S",
    category: 'Indie Footwear',
    gender: 'Unisex',
    directPrice: 2299,
    marketplacePrice: 3299,
    marketplaceName: "Neeman's Direct vs Marketplace",
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1200&auto=format&fit=crop&q=80'
    ],
    specs: [
      { label: 'Material', value: 'Recycled Merino Wool Knit' },
      { label: 'Insole', value: 'Memory Foam Cushioning' }
    ],
    stockLeft: 15,
    rating: 4.8,
    reviewsCount: 210,
    trendingScore: 98,
    couponCode: 'NEEMANSDIRECT',
    couponDiscount: 12,
    officialUrl: 'https://neemans.com/products/relive-knit',
    description: 'Breathable lightweight sneakers made from sustainable Merino wool knit.'
  },
  {
    id: 'snitch-1',
    name: '380 GSM Heavyweight Boxy Hoodie',
    brand: 'SNITCH',
    category: 'Streetwear & Oversized',
    gender: 'Men',
    directPrice: 1299,
    marketplacePrice: 1799,
    marketplaceName: 'Snitch Direct vs Marketplace',
    images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1200&auto=format&fit=crop&q=80'],
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
    description: 'Heavyweight 380 GSM French Terry cotton hoodie with drop shoulders.'
  }
];

export const CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-1',
    name: 'Streetwear & Oversized',
    image: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=600&auto=format&fit=crop&q=80',
    storeCount: 142,
    description: 'Heavyweight tees, drop-shoulder hoodies, technical cargos, and boxy outerwear direct from native creators.',
    tag: 'Trending #1',
    popularBrands: ['Snitch', 'Urbanic', 'Souled Store', 'Bhaane']
  },
  {
    id: 'cat-2',
    name: 'Clean Beauty & Skincare',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
    storeCount: 89,
    description: 'Active ingredient serums, botanical sunscreen sticks, and clean dermatological essentials without retail markups.',
    tag: 'High Margin Savings',
    popularBrands: ['Minimalist', 'Bare Anatomy', 'Derma Co', 'Foxtale']
  },
  {
    id: 'cat-3',
    name: 'Indie Footwear',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    storeCount: 64,
    description: 'Minimalist sneakers, breathable Merino wool slip-ons, and handcrafted leather boots made direct in India.',
    tag: 'Direct Warranty',
    popularBrands: ['Comet', "Neeman's", '7-10', 'Bhavya']
  },
  {
    id: 'cat-4',
    name: 'Artisanal Coffee',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80',
    storeCount: 52,
    description: 'Freshly roasted single-estate Arabica beans, cold brew pods, and precision pour-over gear shipped within 24h.',
    tag: 'Roasted On Order',
    popularBrands: ['Blue Tokai', 'Subko', 'Sleepy Owl', 'Third Wave']
  },
  {
    id: 'cat-5',
    name: 'Tech & EDC',
    image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80',
    storeCount: 78,
    description: 'MagSafe armor cases, braided charging cables, leather desk mats, and modular everyday carry organizers.',
    tag: '1-Year Warranty',
    popularBrands: ['DailyObjects', 'Stuffcool', 'Satechi', 'Kratos']
  }
];

export const MOCK_ADDRESSES: UserAddress[] = [
  {
    id: 'addr-1',
    label: 'Home (Default)',
    name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    street: 'Flat 402, Sunshine Residency, Indiranagar 100ft Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    isDefault: true
  },
  {
    id: 'addr-2',
    label: 'Design Studio / Office',
    name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    street: 'Studio 12, WeWork Galaxy, Residency Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560025',
    isDefault: false
  }
];

export const INITIAL_COMMUNITY_SAVINGS: CommunitySavings[] = [
  {
    id: 'feed-1',
    userHandle: '@Rahul_m',
    productName: 'Boxy Heavy Hoodie',
    brand: 'Snitch',
    amountSaved: 500,
    timeAgo: '2 mins ago',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'feed-2',
    userHandle: '@Priya_k',
    productName: '10% Niacinamide Serum',
    brand: 'Minimalist',
    amountSaved: 150,
    timeAgo: '4 mins ago',
    userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'feed-3',
    userHandle: '@Anish_v',
    productName: 'Aeon Retro Sneakers',
    brand: 'Comet',
    amountSaved: 1100,
    timeAgo: '7 mins ago',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
  },
  {
    id: 'feed-4',
    userHandle: '@Sneha_d',
    productName: 'Attikan Dark Roast 1kg',
    brand: 'Blue Tokai',
    amountSaved: 160,
    timeAgo: '12 mins ago',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
  }
];

export const SAVINGS_CHART_DATA: SavingsChartPoint[] = [
  { month: 'Mar', savings: 1200, orders: 3 },
  { month: 'Apr', savings: 2100, orders: 5 },
  { month: 'May', savings: 2950, orders: 7 },
  { month: 'Jun', savings: 3600, orders: 9 },
  { month: 'Jul', savings: 4250, orders: 11 },
  { month: 'Aug', savings: 4850, orders: 14 }
];
