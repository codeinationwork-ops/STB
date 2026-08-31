export type GarmentCategory =
  | 'Formal Shirt'
  | 'Kurta Pajama'
  | 'Blouse'
  | 'Anarkali Suit'
  | 'Sherwani'
  | 'Lehenga'
  | 'Pant / Trouser'
  | 'Suit (Coat + Pant)'
  | 'Alterations'
  | 'Other';

export type OrderStatus =
  | 'New / Cutting'
  | 'Assigned'
  | 'Stitching in Progress'
  | 'In Alteration / Fitting'
  | 'Trial'
  | 'Completed'
  | 'Delivered';

export type PaymentMode =
  | 'Cash'
  | 'UPI (Scan & Pay)'
  | 'UPI / QR'
  | 'Card'
  | 'Online'
  | 'Other (Card/Wallet)';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  type: 'Advance' | 'Balance' | 'Partial' | 'Full Payment';
  mode: PaymentMode;
  note?: string;
}

export type MeasurementCategory = 'Upper Body' | 'Lower Body' | 'Sleeves' | 'Neck & Others';

export type GenderCategory = 'Male' | 'Female' | 'Unisex';

export interface MeasurementMap {
  // Common / Shared
  totalLength?: string;
  frontLength?: string;
  backLength?: string;
  shoulder?: string;
  chest?: string;
  waist?: string;
  hip?: string;
  armhole?: string;
  sleeveLength?: string;
  bicep?: string;
  wrist?: string;
  sleeveOpening?: string;
  neck?: string;
  frontNeckDepth?: string;
  backNeckDepth?: string;

  // Ladies Specific
  upperChest?: string;
  fullBust?: string;
  apexPoint?: string;
  underBust?: string;
  sideSlit?: string;
  tyingWaist?: string;
  seatHip?: string;
  calf?: string;
  crotchFork?: string;
  bottomOpening?: string;

  // Gents Specific
  stomach?: string;
  outseamLength?: string;
  inseam?: string;
  thigh?: string;
  knee?: string;
  bottomHem?: string;
  crotch?: string;

  // Legacy / Additional
  crossFront?: string;
  crossBack?: string;
  shoulderToWaist?: string;
  customNotes?: string;
  [key: string]: string | undefined;
}

export type OrderCategory = 'Stitch' | 'New Stitch' | 'Alteration' | 'Sale';

export interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  sku?: string;
  category?: string;
}

export interface TailorOrder {
  id: string;
  orderNumber?: string;
  orderType?: OrderCategory | string;
  assignedTailorName?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  isRepeatCustomer: boolean;
  garmentType: GarmentCategory | string;
  orderCategory?: OrderCategory;
  subTypeStyle: string;
  genderCategory: GenderCategory;
  measurementMode: 'manual' | 'receipt';
  measurements: MeasurementMap;
  receiptImageUrl: string | null;
  referenceGarmentUrl?: string | null;
  specialNotes: string;
  voiceNoteUrl: string | null;
  voiceNoteDurationSec: number;
  fabricPhotos: string[];
  stitchedPhotos?: string[];
  deliveredDate?: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentMode: PaymentMode;
  paymentHistory: PaymentRecord[];
  status: OrderStatus;
  createdDate: string;
  createdTime: string;
  createdBy: string;
  dueDate: string;
  dueTime: string;
  assignedTailor: string;
  estimatedHours: number;
  offerMessage: string;
  isOverdue: boolean;
  daysOverdue: number;
  isArchived: boolean;
  updatedAt: string;

  // Specific Alteration Order attributes
  boutiqueId?: string;
  needsAlteration?: boolean;
  referencePhotos?: string[];
  alterationTasks?: string[];
  alterationUrgency?: 'Normal (2-3 Days)' | 'Same Day (24h)' | 'Urgent Express (1-2h)' | string;
  defectNotes?: string;
  alterationGarmentProvided?: string;

  // Specific Ready-made Retail Sale attributes
  saleItems?: SaleItem[];
  subtotalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  gstIncluded?: boolean;
  invoiceNumber?: string;
}

export interface TailorCustomer {
  id: string;
  customerId?: string;
  name: string;
  customerName?: string;
  phone: string;
  phoneNumber?: string;
  cleanPhone?: string;
  isRepeat: boolean;
  ordersCount: number;
  lastOrderDate: string;
  totalSpent: number;
  gender: GenderCategory;
  measurements: MeasurementMap;
  notes?: string;
  boutiqueId?: string;
  boutiqueName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffTailor {
  id: string;
  name: string;
  phone: string;
  role: 'Owner' | 'Tailor';
  initials: string;
  activeOrdersCount: number;
}

export interface ShopProfile {
  id?: string;
  shopName: string;
  ownerName: string;
  phoneNumber: string;
  address: string;
  googleMapUrl?: string;
  upiId: string;
  upiQrCodeUrl: string;
  gpayPhonePeNumber: string;
  lastSyncedTimestamp: string;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'suspended';
  status?: 'Active' | 'Pending Verification' | 'Suspended' | string;
  city?: string;
  state?: string;
  specialty?: string;
  plan?: string;
  planTier?: string;
  registeredAt?: string;
  signupDate?: string;
  trialDurationDays?: number;
  isSubscribed?: boolean;
  subscriptionStatus?: 'none' | 'trial' | 'pending_confirmation' | 'active' | 'expired' | 'rejected';
  subscriptionPlan?: 'monthly' | 'annual';
  subscriptionPrice?: number;
  subscriptionStartDate?: string;
  subscriptionExpiryDate?: string;
  paymentId?: string;
  paymentMethod?: string;
  paymentSubmittedAt?: string;
  confirmedByAdminAt?: string;
  confirmedDays?: number;
  paymentReferenceNote?: string;
}

export interface DailyRevenuePoint {
  date: string;
  dayLabel: string;
  advance: number;
  balance: number;
}

export interface TopServiceMetric {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface PaymentModeBreakdown {
  name: string;
  amount: number;
  percentage: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  advanceReceived: number;
  balanceReceived: number;
  ordersCompleted: number;
  revenueGrowthPercent: number;
  advanceGrowthPercent: number;
  balanceGrowthPercent: number;
  ordersGrowthCount: number;
  pendingCollections: number;
  pendingOrdersCount: number;
  dailyTrend: DailyRevenuePoint[];
  topServices: TopServiceMetric[];
  paymentModes: PaymentModeBreakdown[];
}

export interface UserSession {
  email: string;
  name: string;
  role: 'admin' | 'user';
  phone?: string;
  avatar?: string;
}

export interface AuthSessionState {
  isAuthenticated: boolean;
  phoneNumber: string;
  loginTimestamp: string;
  shopName?: string;
  ownerName?: string;
  role?: string;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'suspended';
}

export interface UploadedCatalogueDoc {
  id: string;
  title: string;
  category: string;
  fileUrl: string; // Base64 or URL
  fileName: string;
  fileSize?: string;
  fileType: 'pdf' | 'lookbook_images' | 'doc';
  pageCount?: number;
  previewThumbnail?: string;
  lookbookPhotos?: string[];
  description?: string;
  tailorId?: string;
  tailorName?: string;
  uploadedAt: string;
  downloadCount?: number;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  category: GarmentCategory | string;
  price: number; // Stitching / Base Crafting Charge
  fabricIncludedPrice?: number; // Total with fabric
  advanceRequired?: number;
  images: string[];
  tailorId: string;
  tailorName: string;
  tailorPhone?: string;
  estimatedDays: number;
  fabricTypes: string[];
  customizationOptions: string[];
  measurementsRequired: string[];
  status: 'Available' | 'Made to Order' | 'Out of Stock' | 'Draft';
  isFeatured?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type AppointmentType =
  | 'Trial & Fitting'
  | 'Bridal Consultation'
  | 'Final Pickup & Delivery'
  | 'Measurements'
  | 'Alteration'
  | 'Others'
  | 'Design Consultation'
  | 'Style & Design Selection'
  | 'VIP Walk-in';

export interface BoutiqueAppointment {
  id: string;
  appointmentId?: string;
  boutiqueId?: string;
  boutiqueName?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  cleanPhone?: string;
  time: string; // e.g. "10:30 AM" or "15:30"
  date: string; // "YYYY-MM-DD"
  voiceNoteUrl?: string | null;
  voiceNoteDuration?: number;
  type?: AppointmentType;
  orderId?: string;
  garmentName?: string;
  garmentReady?: boolean;
  accessoriesReady?: boolean;
  measurementsLoaded?: boolean;
  trialRoomAssigned?: string;
  notes?: string;
  balanceToCollect?: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Rescheduled' | 'Cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export type CRMTab = 'dashboard' | 'inventory' | 'marketplace' | 'customers' | 'orders' | 'revenue' | 'more';

export type InventoryGender = 'Men' | 'Women' | 'Unisex' | 'Kids';

export interface InventorySizeQuantity {
  size: string; // e.g. 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'Free Size'
  quantity: number;
}

export type InventoryCategory =
  | 'Trims & Laces'
  | 'Accessories & Buttons'
  | 'Ready Garments'
  | 'Threads & Interlining'
  | 'Packaging & Consumables'
  | 'Other'
  | string;

export type InventoryUnit =
  | 'Meters'
  | 'Yards'
  | 'Pieces'
  | 'Rolls'
  | 'Spools'
  | 'Sets'
  | 'Packets'
  | 'Boxes';

export interface InventoryItem {
  id: string;
  name: string;
  gender?: InventoryGender;
  category: string;
  sizes?: InventorySizeQuantity[];
  quantity: number; // total quantity across sizes
  minStockAlert?: number;
  price?: number; // Base MRP / Price
  discountPercent?: number; // % off
  discountAmount?: number; // ₹ off
  finalPrice?: number; // net selling price
  sellingPrice?: number; // compatibility alias for finalPrice
  costPrice?: number;
  photos?: string[]; // 2-6 garment photos
  modelPhotos?: string[]; // 4 generated AI model try-on photos
  selectedPhotos?: string[]; // final photos chosen for inventory display
  hasTryOn?: boolean;
  sku?: string;
  unit?: InventoryUnit;
  supplier?: string;
  supplierPhone?: string;
  location?: string;
  image?: string;
  notes?: string;
  boutiqueId?: string;
  lastRestockedDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AdminTab =
  | 'verifications'
  | 'shops'
  | 'overview'; // optional backward-compatibility fallback

export interface AdminUser {
  email: string;
  name: string;
  role: 'super_admin' | 'support_admin';
  expiresAt?: number;
}

export interface PlatformShop {
  id: string;
  shopName: string;
  ownerName: string;
  phoneNumber: string;
  city: string;
  state: string;
  planTier: 'Starter Free' | 'Pro Multi-Device' | 'Boutique Enterprise';
  status: 'Active' | 'Pending Verification' | 'Suspended' | 'Rejected';
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'suspended';
  totalOrders: number;
  grossRevenue: number;
  activeKarigarsCount: number;
  lastActive: string;
  createdAt: string;
  address?: string;
  upiId?: string;
  email?: string;
  specialty?: string;
  pincode?: string;
  rejectionReason?: string;
  verifiedAt?: string;
  isSubscribed?: boolean;
  subscriptionStatus?: 'none' | 'trial' | 'pending_confirmation' | 'active' | 'expired' | 'rejected';
  subscriptionPlan?: 'monthly' | 'annual';
  subscriptionPrice?: number;
  subscriptionStartDate?: string;
  subscriptionExpiryDate?: string;
  paymentId?: string;
  paymentMethod?: string;
  paymentSubmittedAt?: string;
  confirmedByAdminAt?: string;
  confirmedDays?: number;
}

export interface BoutiqueSubscription {
  id: string;
  boutiqueId: string;
  shopId?: string;
  shopName: string;
  ownerName: string;
  phoneNumber: string;
  plan: 'monthly' | 'annual';
  planName: string;
  amount: number;
  currency: string;
  paymentId: string;
  paymentMethod: string;
  status: 'pending_confirmation' | 'active' | 'rejected' | 'expired';
  submittedAt: string;
  confirmedAt?: string;
  confirmedDays?: number;
  startDate?: string;
  expiryDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminBroadcastItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'feature';
  targetAudience: 'all' | 'active_shops' | 'trial';
  createdAt: string;
  author: string;
  active: boolean;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  category: 'auth' | 'shop' | 'order' | 'broadcast' | 'system';
  details: string;
  ip: string;
}
