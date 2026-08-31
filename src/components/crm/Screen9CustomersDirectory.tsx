import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  Phone,
  MessageSquare,
  Scissors,
  ArrowLeft,
  Plus,
  Edit3,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Save,
  Camera,
  ShieldCheck,
  Copy,
  Check,
  Grid,
  List,
  ZoomIn,
  Wallet,
  AlertCircle,
  Maximize2,
  Minimize2,
  FileText,
  Upload,
  ExternalLink,
  BookOpen,
  Trophy,
  Receipt,
  Sparkles,
  ShoppingBag,
  Layers,
  Crown,
  Medal,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { TailorCustomer, TailorOrder, MeasurementMap } from '../../types';
import { roomDb } from '../../lib/localRoomDb';
import { getWhatsAppUrl, clean10DigitPhone, formatDisplayPhone } from '../../lib/phoneUtils';
import { useLanguage } from '../../lib/LanguageContext';
import {
  LADIES_TOPWEAR_FIELDS,
  LADIES_BOTTOMWEAR_FIELDS,
  GENTS_TOPWEAR_FIELDS,
  GENTS_BOTTOMWEAR_FIELDS,
  getMeasurementLabel,
  ALL_MEASUREMENT_FIELDS_MAP,
} from '../../lib/measurementSpecs';

interface Screen9CustomersDirectoryProps {
  customers: TailorCustomer[];
  orders: TailorOrder[];
  onBack: () => void;
  onSelectOrder?: (order: TailorOrder) => void;
  onNewOrderForCustomer?: (customer: TailorCustomer) => void;
  isDesktopView?: boolean;
}

export const Screen9CustomersDirectory: React.FC<Screen9CustomersDirectoryProps> = ({
  customers: propCustomers,
  orders: propOrders,
  onBack,
  onSelectOrder,
  onNewOrderForCustomer,
}) => {
  const { t } = useLanguage();
  const [allCustomers, setAllCustomers] = useState<TailorCustomer[]>(() =>
    propCustomers && propCustomers.length > 0 ? propCustomers : roomDb.getCustomers()
  );
  const [allOrders, setAllOrders] = useState<TailorOrder[]>(() =>
    propOrders && propOrders.length > 0 ? propOrders : roomDb.getOrders()
  );
  const [shopProfile, setShopProfile] = useState(() => roomDb.getShopProfile());

  // Synchronize with database updates and props
  useEffect(() => {
    if (propCustomers && propCustomers.length > 0) {
      setAllCustomers(propCustomers);
    }
  }, [propCustomers]);

  useEffect(() => {
    if (propOrders && propOrders.length > 0) {
      setAllOrders(propOrders);
    }
  }, [propOrders]);

  useEffect(() => {
    const unsub = roomDb.subscribe(() => {
      setAllCustomers(roomDb.getCustomers());
      setAllOrders(roomDb.getOrders());
      setShopProfile(roomDb.getShopProfile());
    });
    return unsub;
  }, []);

  // Main Sub-Tab: 'customers' (Customers & Fit Books) | 'ledger' (Live Financial Ledger) | 'leaderboard' (Customer Leaderboard)
  const [mainTab, setMainTab] = useState<'customers' | 'ledger' | 'leaderboard'>('customers');

  // Search & Filter State for Customers Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'repeat' | 'pending_balance' | 'high_spenders' | 'has_fitbook' | 'has_slips'
  >('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Single-Liner Accordion Expansion State
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<string>>(new Set());

  // Active sub-tab inside inline expanded card: 'measurements' | 'slips' | 'orders' | 'ledger'
  const [inlineTabs, setInlineTabs] = useState<Record<string, 'measurements' | 'slips' | 'orders' | 'ledger'>>({});

  // Inline measurement editing state per customer
  const [editingCustomerMap, setEditingCustomerMap] = useState<Record<string, boolean>>({});
  const [draftMeasurementsMap, setDraftMeasurementsMap] = useState<Record<string, MeasurementMap>>({});
  const [draftNotesMap, setDraftNotesMap] = useState<Record<string, string>>({});

  // Customer Profile Full Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<TailorCustomer | null>(null);
  const [customerModalTab, setCustomerModalTab] = useState<'measurements' | 'slips' | 'orders'>('measurements');
  const [isEditingMeasurementsModal, setIsEditingMeasurementsModal] = useState(false);
  const [modalMeasurementsDraft, setModalMeasurementsDraft] = useState<MeasurementMap>({});
  const [modalNotesDraft, setModalNotesDraft] = useState('');

  // Receipt & Image Zoom State
  const [zoomSlipUrl, setZoomSlipUrl] = useState<string | null>(null);
  const [copiedMeasurementsId, setCopiedMeasurementsId] = useState<string | null>(null);

  // New Customer Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGender, setNewCustGender] = useState<'Ladies' | 'Gents' | 'Kids'>('Ladies');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [newCustMeasurements, setNewCustMeasurements] = useState<MeasurementMap>({});
  const [isSavingNewCust, setIsSavingNewCust] = useState(false);

  // Hidden File Input Ref for uploading customer slips
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadCustomerId, setActiveUploadCustomerId] = useState<string | null>(null);

  // Ledger Filter States
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [ledgerVerticalFilter, setLedgerVerticalFilter] = useState<
    'all' | 'stitching' | 'alteration' | 'retail'
  >('all');

  // Helper to extract customer orders
  const getCustomerOrders = (customer: TailorCustomer) => {
    const custClean = (customer.phone || '').replace(/\D/g, '').slice(-10);
    return allOrders.filter((o) => {
      if (o.customerId && o.customerId === customer.id) return true;
      if (o.customerPhone === customer.phone) return true;
      const ordClean = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
      if (custClean && ordClean && custClean === ordClean) return true;
      return false;
    });
  };

  // Helper to get physical slip photos of a customer
  const getCustomerSlips = (customer: TailorCustomer) => {
    const custOrders = getCustomerOrders(customer);
    const slips: { order: TailorOrder; url: string; title: string; date: string }[] = [];
    custOrders.forEach((o) => {
      if (o.receiptImageUrl) {
        slips.push({
          order: o,
          url: o.receiptImageUrl,
          title: `Slip for ${o.garmentType} (#${o.orderNumber || o.id})`,
          date: o.createdDate || o.createdAt?.split('T')[0] || 'Order Slip',
        });
      }
    });
    return slips;
  };

  // Filter & Search logic for Customers
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        Boolean(c.name && typeof c.name === 'string' && c.name.toLowerCase().includes(q)) ||
        Boolean(c.phone && typeof c.phone === 'string' && c.phone.includes(q));

      if (!matchesSearch) return false;

      const custClean = (c.phone || '').replace(/\D/g, '').slice(-10);
      const custOrders = allOrders.filter((o) => {
        if (o.customerId && o.customerId === c.id) return true;
        if (o.customerPhone === c.phone) return true;
        const ordClean = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
        if (custClean && ordClean && custClean === ordClean) return true;
        return false;
      });
      const totalDue = custOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
      const hasFitBook = Object.keys(c.measurements || {}).some((k) => !!c.measurements[k]);
      const slipsCount = custOrders.filter((o) => !!o.receiptImageUrl).length;

      if (filterType === 'repeat') return c.isRepeat || custOrders.length > 1;
      if (filterType === 'pending_balance') return totalDue > 0;
      if (filterType === 'high_spenders') return (c.totalSpent || 0) >= 3000;
      if (filterType === 'has_fitbook') return hasFitBook;
      if (filterType === 'has_slips') return slipsCount > 0;

      return true;
    });
  }, [allCustomers, allOrders, searchQuery, filterType]);

  // Live Financial Ledger Orders memo
  const ledgerOrders = useMemo(() => {
    return allOrders.filter((ord) => {
      const q = (ledgerSearch || searchQuery).toLowerCase().trim();
      const matchesSearch =
        !q ||
        Boolean(ord.customerName && typeof ord.customerName === 'string' && ord.customerName.toLowerCase().includes(q)) ||
        Boolean(ord.customerPhone && typeof ord.customerPhone === 'string' && ord.customerPhone.includes(q)) ||
        Boolean(ord.orderNumber && typeof ord.orderNumber === 'string' && ord.orderNumber.toLowerCase().includes(q)) ||
        Boolean(ord.garmentType && typeof ord.garmentType === 'string' && ord.garmentType.toLowerCase().includes(q)) ||
        Boolean(ord.assignedTailorName && typeof ord.assignedTailorName === 'string' && ord.assignedTailorName.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Status filter
      const bal = ord.balanceDue !== undefined ? ord.balanceDue : Math.max(0, (ord.totalAmount || 0) - (ord.advancePaid || 0));
      if (ledgerStatusFilter === 'paid' && bal > 0) return false;
      if (ledgerStatusFilter === 'pending' && bal <= 0) return false;

      // Vertical filter
      if (ledgerVerticalFilter !== 'all') {
        const oType = (ord.orderType || '').toLowerCase();
        const gType = (ord.garmentType || '').toLowerCase();
        if (ledgerVerticalFilter === 'stitching') {
          if (oType.includes('alter') || oType.includes('retail') || oType.includes('sale') || gType.includes('alter'))
            return false;
        } else if (ledgerVerticalFilter === 'alteration') {
          if (!oType.includes('alter') && !gType.includes('alter')) return false;
        } else if (ledgerVerticalFilter === 'retail') {
          if (!oType.includes('retail') && !oType.includes('sale') && !oType.includes('ready')) return false;
        }
      }

      return true;
    });
  }, [allOrders, ledgerSearch, searchQuery, ledgerStatusFilter, ledgerVerticalFilter]);

  // Customer Leaderboard sorted by lifetime spend
  const customerRevenueList = useMemo(() => {
    const q = (ledgerSearch || searchQuery).toLowerCase().trim();

    return allCustomers
      .map((cust) => {
        const custClean = (cust.phone || '').replace(/\D/g, '').slice(-10);
        const custOrders = allOrders.filter((o) => {
          if (o.customerId && o.customerId === cust.id) return true;
          if (o.customerPhone === cust.phone) return true;
          const ordClean = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
          if (custClean && ordClean && custClean === ordClean) return true;
          return false;
        });
        const totalSpent = cust.totalSpent || custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const totalDue = custOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
        const lastDate = custOrders[0]?.createdDate || cust.lastOrderDate || 'Recent';

        return {
          ...cust,
          totalSpent,
          balanceDue: totalDue,
          ordersCount: custOrders.length || cust.ordersCount || 1,
          lastOrderDate: lastDate,
        };
      })
      .filter(
        (c) =>
          !q ||
          Boolean(c.name && typeof c.name === 'string' && c.name.toLowerCase().includes(q)) ||
          Boolean(c.phone && typeof c.phone === 'string' && c.phone.includes(q))
      )
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [allCustomers, allOrders, ledgerSearch, searchQuery]);

  // 1-Tap WhatsApp Statement Sender
  const sendWhatsAppStatement = (ord: TailorOrder) => {
    const bal = ord.balanceDue !== undefined ? ord.balanceDue : Math.max(0, (ord.totalAmount || 0) - (ord.advancePaid || 0));
    const msg = [
      `*🧾 Tailor Order & Ledger Statement*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `*Customer*: ${ord.customerName || 'Valued Client'}`,
      `*Order #*: ${ord.orderNumber || ord.id}`,
      `*Service / Item*: ${ord.garmentType || 'Custom Stitching'}`,
      `*Booking Date*: ${ord.createdDate || 'Recent'}`,
      `*Delivery Due*: ${ord.dueDate || 'Ready on Notice'}`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `*Total Amount*: ₹${(ord.totalAmount || 0).toLocaleString()}`,
      `*Advance Cleared*: ₹${(ord.advancePaid || 0).toLocaleString()}`,
      bal <= 0
        ? `*Payment Status*: ✅ Fully Cleared (₹0 Due)`
        : `*Balance Payable*: ⚠️ ₹${bal.toLocaleString()} Due on Handover`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `Thank you for trusting our tailoring boutique! Contact us if you need any adjustments.`,
    ].join('\n');

    const url = getWhatsAppUrl(ord.customerPhone, msg);
    window.open(url, '_blank');
  };

  // Toggle single-liner expansion
  const toggleCustomerExpansion = (customerId: string) => {
    setExpandedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  // Expand All / Collapse All
  const handleToggleExpandAll = () => {
    if (expandedCustomerIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setExpandedCustomerIds(new Set());
    } else {
      setExpandedCustomerIds(new Set(filteredCustomers.map((c) => c.id || c.phone)));
    }
  };

  // Helper to format key measurements string for chips
  const getMeasurementHighlights = (measurements?: MeasurementMap) => {
    if (!measurements) return [];
    const highlights: { label: string; val: string }[] = [];
    if (measurements.chest) highlights.push({ label: 'Chest', val: `${measurements.chest}"` });
    if (measurements.waist) highlights.push({ label: 'Waist', val: `${measurements.waist}"` });
    if (measurements.frontLength || measurements.pantLength) {
      highlights.push({
        label: 'Length',
        val: `${measurements.frontLength || measurements.pantLength}"`,
      });
    }
    if (measurements.shoulder) highlights.push({ label: 'Shoulder', val: `${measurements.shoulder}"` });
    if (measurements.sleeveLength) highlights.push({ label: 'Sleeves', val: `${measurements.sleeveLength}"` });
    if (measurements.hip) highlights.push({ label: 'Hip', val: `${measurements.hip}"` });
    if (measurements.bottomHem) highlights.push({ label: 'Mori', val: `${measurements.bottomHem}"` });
    return highlights;
  };

  // Start inline measurement editing
  const handleStartInlineEdit = (cust: TailorCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const custKey = cust.id || cust.phone;
    setDraftMeasurementsMap((prev) => ({
      ...prev,
      [custKey]: { ...(cust.measurements || {}) },
    }));
    setDraftNotesMap((prev) => ({
      ...prev,
      [custKey]: cust.notes || '',
    }));
    setEditingCustomerMap((prev) => ({
      ...prev,
      [custKey]: true,
    }));
  };

  // Save inline measurement changes
  const handleSaveInlineMeasurements = (cust: TailorCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const custKey = cust.id || cust.phone;
    const updatedDraft = draftMeasurementsMap[custKey] || cust.measurements || {};
    const updatedNotes = draftNotesMap[custKey] !== undefined ? draftNotesMap[custKey] : (cust.notes || '');

    const updatedCust: TailorCustomer = {
      ...cust,
      measurements: updatedDraft,
      notes: updatedNotes,
    };

    roomDb.saveCustomer(updatedCust);

    setAllCustomers((prev) =>
      prev.map((c) => (c.phone === updatedCust.phone || c.id === updatedCust.id ? updatedCust : c))
    );

    setEditingCustomerMap((prev) => ({
      ...prev,
      [custKey]: false,
    }));
  };

  // Copy measurements to clipboard
  const handleCopyMeasurements = (customer: TailorCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const m = customer.measurements || {};
    const lines = [`📏 *Measurements for ${customer.name}* (${customer.phone}):`];
    if (m.chest) lines.push(`• Chest/Bust: ${m.chest}"`);
    if (m.shoulder) lines.push(`• Shoulder: ${m.shoulder}"`);
    if (m.frontLength) lines.push(`• Front Length: ${m.frontLength}"`);
    if (m.backLength) lines.push(`• Back Length: ${m.backLength}"`);
    if (m.waist) lines.push(`• Waist: ${m.waist}"`);
    if (m.hip) lines.push(`• Hip: ${m.hip}"`);
    if (m.sleeveLength) lines.push(`• Sleeves: ${m.sleeveLength}"`);
    if (m.pantLength) lines.push(`• Pant Length: ${m.pantLength}"`);
    if (m.bottomHem) lines.push(`• Bottom/Mori: ${m.bottomHem}"`);
    if (m.neck) lines.push(`• Neck: ${m.neck}"`);
    if (customer.notes) lines.push(`📝 *Notes*: ${customer.notes}`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMeasurementsId(customer.id || customer.phone);
    setTimeout(() => setCopiedMeasurementsId(null), 2000);
  };

  // Handle open customer in full modal
  const handleOpenCustomerModal = (
    customer: TailorCustomer,
    defaultTab: 'measurements' | 'slips' | 'orders' = 'measurements',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setSelectedCustomer(customer);
    setModalMeasurementsDraft(customer.measurements || {});
    setModalNotesDraft(customer.notes || '');
    setIsEditingMeasurementsModal(false);
    setCustomerModalTab(defaultTab);
  };

  // Save Modal measurements
  const handleSaveModalMeasurements = () => {
    if (!selectedCustomer) return;

    const updatedCust: TailorCustomer = {
      ...selectedCustomer,
      measurements: modalMeasurementsDraft,
      notes: modalNotesDraft,
    };

    roomDb.saveCustomer(updatedCust);
    setSelectedCustomer(updatedCust);

    setAllCustomers((prev) =>
      prev.map((c) => (c.phone === updatedCust.phone || c.id === updatedCust.id ? updatedCust : c))
    );

    setIsEditingMeasurementsModal(false);
  };

  // Delete individual customer
  const handleDeleteCustomer = async (customer: TailorCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove customer "${customer.name}"? This will delete their measurement profile.`)) {
      await roomDb.deleteCustomer(customer.id);
      setAllCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(null);
      }
    }
  };

  // Clear all customers
  const handleClearAllCustomers = async () => {
    if (window.confirm('Are you sure you want to remove ALL customers from the database? This action cannot be undone.')) {
      await roomDb.clearAllCustomers();
      setAllCustomers([]);
      setSelectedCustomer(null);
    }
  };

  // Trigger file upload for paper slips
  const handleTriggerUpload = (customer: TailorCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveUploadCustomerId(customer.id || customer.phone);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle photo upload
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadCustomerId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      const targetCustomer = allCustomers.find(
        (c) => c.id === activeUploadCustomerId || c.phone === activeUploadCustomerId
      );

      if (targetCustomer) {
        const newSlipOrder: TailorOrder = {
          id: `SLIP-${Date.now().toString().slice(-4)}`,
          orderNumber: `SLIP-${Date.now().toString().slice(-4)}`,
          customerId: targetCustomer.id,
          customerName: targetCustomer.name,
          customerPhone: targetCustomer.phone,
          isRepeatCustomer: true,
          garmentType: 'Physical Fit Slip',
          orderType: 'Stitch',
          subTypeStyle: 'Measurement Slip Archive',
          genderCategory: targetCustomer.gender || 'Unisex',
          measurementMode: 'receipt',
          measurements: targetCustomer.measurements || {},
          specialNotes: 'Photo slip uploaded directly from Customer Fit Book.',
          voiceNoteUrl: null,
          voiceNoteDurationSec: 0,
          fabricPhotos: [],
          totalAmount: 0,
          advancePaid: 0,
          balanceDue: 0,
          paymentMode: 'Cash',
          paymentHistory: [],
          status: 'New / Cutting',
          createdDate: new Date().toISOString().split('T')[0],
          createdTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdBy: 'Owner',
          dueDate: new Date().toISOString().split('T')[0],
          dueTime: '18:00',
          receiptImageUrl: base64Url,
          assignedTailor: 'Self (Owner)',
          estimatedHours: 1,
          offerMessage: '',
          isOverdue: false,
          daysOverdue: 0,
          isArchived: false,
          updatedAt: new Date().toISOString(),
        };
        roomDb.saveOrder(newSlipOrder);
        setAllOrders(roomDb.getOrders());
      }
    };
    reader.readAsDataURL(file);
  };

  // Standard Measurement Keys based on Boutique Fitting Specifications
  const standardMeasurementKeys = [
    // Topwear / Upper Body
    { key: 'totalLength', label: 'Total Length' },
    { key: 'shoulder', label: 'Shoulder' },
    { key: 'chest', label: 'Chest / Bust' },
    { key: 'upperChest', label: 'Upper Chest' },
    { key: 'apexPoint', label: 'Apex / Bust Point' },
    { key: 'underBust', label: 'Under Bust / Choli' },
    { key: 'waist', label: 'Waist' },
    { key: 'hip', label: 'Seat / Hip' },
    { key: 'stomach', label: 'Stomach / Tummy' },
    { key: 'sideSlit', label: 'Side Slit / Chaak' },
    { key: 'frontNeckDepth', label: 'Front Neck Depth' },
    { key: 'backNeckDepth', label: 'Back Neck Depth' },
    { key: 'armhole', label: 'Armhole' },
    { key: 'sleeveLength', label: 'Sleeve Length' },
    { key: 'bicep', label: 'Bicep / Arm Round' },
    { key: 'wrist', label: 'Cuff / Wrist' },
    // Bottomwear / Lower Body
    { key: 'pantLength', label: 'Pant / Outseam Length' },
    { key: 'tyingWaist', label: 'Tying Waist' },
    { key: 'crotchFork', label: 'Crotch / Fork / Rise' },
    { key: 'thigh', label: 'Thigh Round' },
    { key: 'knee', label: 'Knee Round' },
    { key: 'calf', label: 'Calf Round' },
    { key: 'bottomOpening', label: 'Bottom / Ankle Opening' },
    { key: 'inseam', label: 'Inseam Length' },
  ];

  return (
    <div className="min-h-full bg-[#f5f6f8] text-[#323338] font-sans p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto pb-24 space-y-3.5">
      {/* Hidden File Input for Paper Slip Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/*"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* MONDAY.COM BOARD HEADER & SEARCH TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4.5 border border-[#d0d4e4] shadow-2xs space-y-3.5">
        {/* Row 1: Back Button + Title + Search Bar + Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-[#f0f3f8] hover:bg-[#e6e9ef] text-[#323338] border border-[#d0d4e4] transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-2xs font-semibold text-xs"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="sm:hidden font-bold">Back</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#0073ea] text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[#323338] tracking-tight flex items-center gap-2">
                  <span>Customer Hub & Fit Books</span>
                  <span className="px-2 py-0.2 rounded-full text-[11px] font-bold bg-[#e5f0ff] text-[#0073ea]">
                    {allCustomers.length}
                  </span>
                </h1>
                <p className="text-xs text-[#676879] hidden sm:block">
                  Unified client database, measurement fit books, slips & balance ledgers
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="flex-1 sm:flex-none bg-[#0073ea] hover:bg-[#0060c2] text-white px-3.5 py-2 rounded-lg font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Add Customer</span>
            </button>

            {onNewOrderForCustomer && (
              <button
                onClick={() => {
                  if (allCustomers[0]) {
                    onNewOrderForCustomer(allCustomers[0]);
                  } else {
                    onBack();
                  }
                }}
                className="flex-1 sm:flex-none bg-[#f0f3f8] hover:bg-[#e6e9ef] text-[#323338] border border-[#d0d4e4] px-3.5 py-2 rounded-lg font-semibold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5] text-emerald-800" />
                <span>New Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search Bar + Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1 border-t border-[#e6e9ef]">
          <div className="sm:col-span-12 relative">
            <Search className="w-4 h-4 text-[#676879] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                mainTab === 'customers'
                  ? t('custDir.search', 'Search customer name or phone (e.g. 98765...)...')
                  : mainTab === 'ledger'
                  ? t('revenue.searchLedger', 'Search orders, customers, phone, karigar...')
                  : 'Search leaderboard by name or phone...'
              }
              value={mainTab === 'customers' ? searchQuery : ledgerSearch}
              onChange={(e) => {
                if (mainTab === 'customers') {
                  setSearchQuery(e.target.value);
                } else {
                  setLedgerSearch(e.target.value);
                }
              }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0B4636] focus:ring-1 focus:ring-[#0B4636] outline-hidden text-slate-800 font-medium"
            />
            {(mainTab === 'customers' ? searchQuery : ledgerSearch) && (
              <button
                onClick={() => {
                  if (mainTab === 'customers') setSearchQuery('');
                  else setLedgerSearch('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Sub-Tabs & Board Mode Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {/* Main 3 Navigation Sub-Tabs in Modern style */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setMainTab('customers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                mainTab === 'customers'
                  ? 'bg-[#0B4636] text-amber-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('customers.title', 'Customers & Fit Books')}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  mainTab === 'customers' ? 'bg-black/25 text-amber-300' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {allCustomers.length}
              </span>
            </button>

            <button
              onClick={() => setMainTab('ledger')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                mainTab === 'ledger'
                  ? 'bg-[#0B4636] text-amber-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('revenue.tabLedger', 'Live Financial Ledger')}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  mainTab === 'ledger' ? 'bg-black/25 text-amber-300' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {ledgerOrders.length}
              </span>
            </button>

            <button
              onClick={() => setMainTab('leaderboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                mainTab === 'leaderboard'
                  ? 'bg-[#0B4636] text-amber-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{t('revenue.tabCustomers', 'Customer Leaderboard')}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  mainTab === 'leaderboard' ? 'bg-black/25 text-amber-300' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {customerRevenueList.length}
              </span>
            </button>
          </div>

          {/* Directory specific view toggles */}
          {mainTab === 'customers' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {allCustomers.length > 0 && (
                <button
                  onClick={handleClearAllCustomers}
                  className="px-2.5 py-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="Remove all customers from database"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span className="text-[11px]">Clear All Customers</span>
                </button>
              )}

              {viewMode === 'list' && (
                <button
                  onClick={handleToggleExpandAll}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="Expand or collapse all single-liner rows"
                >
                  {expandedCustomerIds.size === filteredCustomers.length && filteredCustomers.length > 0 ? (
                    <>
                      <Minimize2 className="w-3 h-3 text-slate-500" />
                      <span className="text-[11px]">Collapse All</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3 text-slate-500" />
                      <span className="text-[11px]">Expand All ({filteredCustomers.length})</span>
                    </>
                  )}
                </button>
              )}

              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-[#0B4636] shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Single-Liners</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#0B4636] shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Cards</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CUSTOMERS & FIT BOOKS DIRECTORY */}
      {/* ========================================================================= */}
      {mainTab === 'customers' && (
        <div className="space-y-3">
          {/* Filter Pills in Modern Style */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                { id: 'all', label: 'All Clients', count: allCustomers.length },
                {
                  id: 'repeat',
                  label: 'Repeat Clients',
                  count: allCustomers.filter((c) => c.isRepeat || c.ordersCount > 1).length,
                },
                {
                  id: 'pending_balance',
                  label: 'Pending Dues',
                  count: allCustomers.filter((c) => getCustomerOrders(c).some((o) => (o.balanceDue || 0) > 0)).length,
                },
                {
                  id: 'high_spenders',
                  label: 'VIP (₹3k+)',
                  count: allCustomers.filter((c) => (c.totalSpent || 0) >= 3000).length,
                },
                {
                  id: 'has_fitbook',
                  label: 'With Fit Book',
                  count: allCustomers.filter((c) => Object.keys(c.measurements || {}).some((k) => !!c.measurements[k])).length,
                },
                {
                  id: 'has_slips',
                  label: 'With Slips',
                  count: allCustomers.filter((c) => getCustomerOrders(c).some((o) => !!o.receiptImageUrl)).length,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  filterType === tab.id
                    ? 'bg-[#0B4636] text-amber-300 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    filterType === tab.id ? 'bg-black/25 text-amber-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* SINGLE-LINER LIST VIEW */}
          {viewMode === 'list' ? (
            <div className="space-y-2.5">
              {filteredCustomers.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs px-4">
                  <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <h3 className="text-sm font-bold text-slate-800">No Customers Found</h3>
                  <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or active filter.</p>
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const custKey = cust.id || cust.phone;
                  const isExpanded = expandedCustomerIds.has(custKey);
                  const custOrders = getCustomerOrders(cust);
                  const custSlips = getCustomerSlips(cust);
                  const totalSpent = cust.totalSpent || custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                  const totalDue = custOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
                  const lastOrder = custOrders[0];
                  const highlights = getMeasurementHighlights(cust.measurements);
                  const hasMeasurements =
                    Object.keys(cust.measurements || {}).filter((k) => !!cust.measurements[k]).length > 0;
                  const fitCount = Object.keys(cust.measurements || {}).filter((k) => !!cust.measurements[k]).length;
                  const isEditingInline = editingCustomerMap[custKey] || false;
                  const activeInlineTab = inlineTabs[custKey] || 'measurements';

                  const initials = cust.name
                    ? cust.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0].toUpperCase())
                        .join('')
                    : 'C';

                  return (
                    <div
                      key={custKey}
                      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'border-[#0B4636] ring-2 ring-[#0B4636]/15 shadow-md'
                          : 'border-slate-200 shadow-xs hover:border-[#0B4636] hover:shadow-md'
                      }`}
                    >
                      {/* ======================================================= */}
                      {/* 1. THE SINGLE-LINER HEADER ROW (CLICK TO EXPAND/COLLAPSE) */}
                      {/* ======================================================= */}
                      <div
                        onClick={() => toggleCustomerExpansion(custKey)}
                        className={`p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-3 cursor-pointer select-none transition-colors relative ${
                          isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Accent Strip Left */}
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 ${
                            totalDue > 0
                              ? 'bg-rose-500'
                              : cust.isRepeat
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                        />

                        {/* Section 1: Client & Contact Profile */}
                        <div className="flex items-center gap-3 min-w-0 flex-1 pl-1.5">
                          {/* Avatar Initials Badge */}
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 border border-slate-200 text-[#0B4636] font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-2xs">
                            {initials}
                          </div>

                          {/* Name & Phone & Badges in tight layout */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate group-hover:text-[#0B4636] transition-colors">
                                {cust.name}
                              </span>

                              {cust.isRepeat && (
                                <span className="px-2 py-0.2 rounded-md text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                  Repeat
                                </span>
                              )}

                              {totalSpent >= 3000 && (
                                <span className="px-2 py-0.2 rounded-md text-[9px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200 shrink-0">
                                  VIP
                                </span>
                              )}

                              <span className="px-2 py-0.2 rounded-md text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                {custOrders.length} {custOrders.length === 1 ? 'Order' : 'Orders'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
                              <a
                                href={`tel:${clean10DigitPhone(cust.phone)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 font-mono text-slate-600 hover:text-[#0073ea] transition-colors"
                              >
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{formatDisplayPhone(cust.phone)}</span>
                              </a>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 text-[10px] truncate">
                                Last: {lastOrder?.createdDate || cust.lastOrderDate || 'Recent'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Fit Status & Slips Quick Glance (visible on medium+ screens) */}
                        <div className="hidden lg:flex items-center gap-1.5 flex-wrap shrink-0 px-1">
                          {hasMeasurements ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0 shadow-2xs">
                              <Scissors className="w-3 h-3 text-emerald-700" />
                              <span>{fitCount} Fits</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200 flex items-center gap-1 shrink-0">
                              <BookOpen className="w-3 h-3 text-slate-400" />
                              <span>No Fit Book</span>
                            </span>
                          )}

                          {custSlips.length > 0 && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1 shrink-0">
                              <Camera className="w-3 h-3 text-purple-700" />
                              <span>
                                {custSlips.length} Slip{custSlips.length > 1 ? 's' : ''}
                              </span>
                            </span>
                          )}

                          {highlights.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-600 flex-wrap">
                              {highlights.slice(0, 2).map((h) => (
                                <span key={h.label} className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                  {h.label[0]}:{h.val}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 3: Financials & Quick Actions (Never overlaps) */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-1.5 md:pt-0 border-t md:border-t-0 border-slate-100">
                          {/* Spend + Balance Pill */}
                          <div className="flex items-center md:flex-col md:items-end gap-1.5 md:gap-0.5 shrink-0 min-w-[90px]">
                            <div className="text-xs font-black font-mono text-slate-900 leading-tight">
                              ₹{totalSpent.toLocaleString('en-IN')}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block border ${
                                totalDue > 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-mono'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {totalDue > 0 ? `Due: ₹${totalDue.toLocaleString('en-IN')}` : '✓ Paid'}
                            </span>
                          </div>

                          <div className="hidden sm:block w-px h-6 bg-slate-200 shrink-0" />

                          {/* Quick Action Buttons Group */}
                          <div className="flex items-center justify-end gap-1.5 shrink-0">
                            {/* Quick 1-Tap WhatsApp Button */}
                            <a
                              href={getWhatsAppUrl(
                                cust.phone,
                                `Hello ${cust.name}, greetings from ${shopProfile?.shopName || 'our shop'}!`
                              )}
                              onClick={(e) => e.stopPropagation()}
                              target="_blank"
                              rel="noreferrer"
                              className="h-7.5 w-7.5 rounded-lg bg-[#25D366] hover:bg-[#1faa4b] text-white flex items-center justify-center shadow-2xs transition-transform active:scale-95 cursor-pointer shrink-0"
                              title="Open WhatsApp Chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-white" />
                            </a>

                            {/* Quick Call Button */}
                            <a
                              href={`tel:${clean10DigitPhone(cust.phone)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="h-7.5 w-7.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              title="Call Customer"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>

                            {/* Delete Customer Button */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomer(cust, e)}
                              className="h-7.5 w-7.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              title="Delete customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* + Order Button */}
                            {onNewOrderForCustomer && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNewOrderForCustomer(cust);
                                }}
                                className="h-7.5 px-2.5 rounded-lg bg-[#0B4636] hover:bg-[#073024] active:scale-95 text-amber-300 font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer shrink-0 transition-all"
                                title="Create Order for this customer"
                              >
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                                <span>Order</span>
                              </button>
                            )}

                            {/* Expand / Collapse Indicator */}
                            <div className="h-7.5 w-7.5 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center transition-transform shrink-0 border border-slate-200">
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[#0B4636]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ======================================================= */}
                      {/* 2. THE INLINE EXPANDED DETAILS DASHBOARD (ACCORDION BODY) */}
                      {/* ======================================================= */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-white p-3.5 sm:p-4 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                          {/* Top Action Ribbon inside Expanded Panel */}
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            {/* Sub-tab Pills */}
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                              <button
                                type="button"
                                onClick={() =>
                                  setInlineTabs((prev) => ({ ...prev, [custKey]: 'measurements' }))
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  activeInlineTab === 'measurements'
                                    ? 'bg-[#0B4636] text-amber-300 shadow-2xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                <Scissors className="w-3.5 h-3.5" />
                                <span>
                                  Fit Book ({fitCount})
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setInlineTabs((prev) => ({ ...prev, [custKey]: 'slips' }))
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  activeInlineTab === 'slips'
                                    ? 'bg-[#0B4636] text-amber-300 shadow-2xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                <Camera className="w-3.5 h-3.5 text-amber-600" />
                                <span>Physical Slips ({custSlips.length})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setInlineTabs((prev) => ({ ...prev, [custKey]: 'orders' }))
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  activeInlineTab === 'orders'
                                    ? 'bg-[#0B4636] text-amber-300 shadow-2xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Orders ({custOrders.length})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setInlineTabs((prev) => ({ ...prev, [custKey]: 'ledger' }))
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  activeInlineTab === 'ledger'
                                    ? 'bg-[#0B4636] text-amber-300 shadow-2xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                <span>Ledger</span>
                              </button>
                            </div>

                            {/* Quick Action Tools */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => handleCopyMeasurements(cust, e)}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="Copy measurements to WhatsApp format"
                              >
                                {copiedMeasurementsId === custKey ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Copy Fits</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleOpenCustomerModal(cust, 'measurements', e)}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="Open Fullscreen Customer Profile"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                <span className="hidden sm:inline text-[11px]">Full Profile</span>
                              </button>

                              {onNewOrderForCustomer && (
                                <button
                                  type="button"
                                  onClick={() => onNewOrderForCustomer(cust)}
                                  className="px-3 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>New Order</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* ------------------------------------------------------------- */}
                          {/* SUB-SECTION 1: FIT BOOK MEASUREMENTS & FITTING PROFILE */}
                          {/* ------------------------------------------------------------- */}
                          {activeInlineTab === 'measurements' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-[#0073ea]" />
                                  <h4 className="text-xs font-bold text-[#323338] uppercase tracking-wider">
                                    Saved Fit Book Measurements
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2">
                                  {!isEditingInline ? (
                                    <button
                                      type="button"
                                      onClick={(e) => handleStartInlineEdit(cust, e)}
                                      className="px-2.5 py-1 bg-[#f0f3f8] hover:bg-[#e6e9ef] text-[#323338] border border-[#d0d4e4] font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Edit Fit Book</span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingCustomerMap((prev) => ({ ...prev, [custKey]: false }))
                                        }
                                        className="px-2 py-1 bg-[#f0f3f8] hover:bg-[#e6e9ef] text-[#676879] font-bold rounded-lg text-xs cursor-pointer border border-[#d0d4e4]"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleSaveInlineMeasurements(cust, e)}
                                        className="px-3 py-1 bg-[#00c875] hover:bg-[#00a862] text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Save Fit Book</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 12-Measurements Matrix Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {standardMeasurementKeys.map(({ key, label }) => {
                                  const draftVal = draftMeasurementsMap[custKey]?.[key];
                                  const currentVal = cust.measurements?.[key];
                                  const val = isEditingInline ? (draftVal !== undefined ? draftVal : '') : currentVal;

                                  return (
                                    <div
                                      key={key}
                                      className={`p-2 rounded-xl border transition-all ${
                                        val
                                          ? 'bg-slate-50 border-slate-200/90'
                                          : 'bg-slate-50/40 border-slate-200/50'
                                      }`}
                                    >
                                      <label className="text-[10px] font-bold text-slate-500 block truncate">
                                        {label}
                                      </label>
                                      {isEditingInline ? (
                                        <input
                                          type="number"
                                          step="0.25"
                                          value={val || ''}
                                          onChange={(e) => {
                                            const num = e.target.value ? Number(e.target.value) : undefined;
                                            setDraftMeasurementsMap((prev) => ({
                                              ...prev,
                                              [custKey]: {
                                                ...(prev[custKey] || {}),
                                                [key]: num,
                                              },
                                            }));
                                          }}
                                          placeholder="0.0"
                                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-900 mt-1 focus:ring-2 focus:ring-[#0B4636] focus:outline-none"
                                        />
                                      ) : (
                                        <div className="text-xs font-black text-slate-900 mt-0.5 flex items-baseline gap-0.5">
                                          {val ? (
                                            <>
                                              <span>{val}</span>
                                              <span className="text-[10px] text-slate-400 font-medium">in</span>
                                            </>
                                          ) : (
                                            <span className="text-slate-300 font-normal text-[11px]">--</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Fitting Preferences Notes */}
                              <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/70">
                                <label className="text-[10px] font-bold text-amber-900 uppercase block">
                                  Fitting Notes & Style Instructions
                                </label>
                                {isEditingInline ? (
                                  <textarea
                                    value={
                                      draftNotesMap[custKey] !== undefined
                                        ? draftNotesMap[custKey]
                                        : cust.notes || ''
                                    }
                                    onChange={(e) =>
                                      setDraftNotesMap((prev) => ({
                                        ...prev,
                                        [custKey]: e.target.value,
                                      }))
                                    }
                                    placeholder="e.g., Prefers loose armholes, deep back neck, slim taper on hem..."
                                    className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-medium text-slate-800 mt-1 focus:ring-2 focus:ring-[#0B4636] focus:outline-none"
                                    rows={2}
                                  />
                                ) : (
                                  <p className="text-xs text-slate-700 mt-0.5 italic">
                                    {cust.notes || 'No special fitting preferences noted yet.'}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ------------------------------------------------------------- */}
                          {/* SUB-SECTION 2: PHYSICAL SLIP PHOTOS */}
                          {/* ------------------------------------------------------------- */}
                          {activeInlineTab === 'slips' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-xs font-black text-slate-900">
                                    Paper Measurement Slips & Receipts
                                  </h4>
                                  <p className="text-[10px] text-slate-500">
                                    Photos of handwritten tailors' measurement slips.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => handleTriggerUpload(cust, e)}
                                  className="px-2.5 py-1 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>+ Upload Slip</span>
                                </button>
                              </div>

                              {custSlips.length === 0 ? (
                                <div className="py-6 text-center bg-slate-50 rounded-xl border border-slate-200 px-4">
                                  <Camera className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                                  <p className="text-xs font-bold text-slate-600">No physical slips uploaded</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Tap '+ Upload Slip' to capture a photo of the handwritten customer slip.
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                  {custSlips.map((slip, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() => setZoomSlipUrl(slip.url)}
                                      className="group relative bg-slate-900 rounded-xl overflow-hidden aspect-3/4 border border-slate-200 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                                    >
                                      {slip.url && slip.url.trim() !== '' ? (
                                        <img
                                          src={slip.url}
                                          alt={slip.title}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                      ) : null}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1.5 text-white">
                                        <span className="text-[9px] font-bold truncate">{slip.title}</span>
                                        <span className="text-[8px] text-slate-300">{slip.date}</span>
                                      </div>
                                      <div className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ZoomIn className="w-3 h-3" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ------------------------------------------------------------- */}
                          {/* SUB-SECTION 3: COMPLETE ORDER HISTORY */}
                          {/* ------------------------------------------------------------- */}
                          {activeInlineTab === 'orders' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-[#323338]">
                                  Order History ({custOrders.length})
                                </h4>
                                {onNewOrderForCustomer && (
                                  <button
                                    type="button"
                                    onClick={() => onNewOrderForCustomer(cust)}
                                    className="text-xs font-bold text-[#0073ea] hover:underline flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>New Order for {cust.name}</span>
                                  </button>
                                )}
                              </div>

                              {custOrders.length === 0 ? (
                                <div className="py-6 text-center bg-[#f8f9fb] rounded-xl border border-[#d0d4e4]">
                                  <Scissors className="w-7 h-7 text-[#676879] mx-auto mb-1 opacity-50" />
                                  <p className="text-xs font-bold text-[#676879]">No orders recorded yet</p>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {custOrders.map((ord) => (
                                    <div
                                      key={ord.id}
                                      onClick={() => {
                                        if (onSelectOrder) onSelectOrder(ord);
                                      }}
                                      className="bg-[#f8f9fb] hover:bg-[#f0f3f8] p-2.5 rounded-xl border border-[#d0d4e4] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-mono text-[10px] font-bold text-[#676879]">
                                            #{ord.orderNumber || ord.id}
                                          </span>
                                          <span className="font-bold text-xs text-[#323338] truncate">
                                            {ord.garmentType}
                                          </span>
                                          <span
                                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                              ord.status === 'Delivered'
                                                ? 'bg-[#e5f9f1] text-[#00854d] border border-[#b3efd4]'
                                                : ord.status === 'Completed'
                                                ? 'bg-[#e5f0ff] text-[#0073ea] border border-[#cce1ff]'
                                                : ord.isOverdue
                                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                                : 'bg-[#fff1e0] text-[#fdab3d] border border-[#ffdbb2]'
                                            }`}
                                          >
                                            {ord.isOverdue ? '⚠️ Overdue' : ord.status}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-[#676879] font-medium mt-0.5">
                                          Due: <strong className="text-[#323338]">{ord.dueDate}</strong> • Tailor:{' '}
                                          {ord.assignedTailor || ord.assignedTailorName || 'Self'}
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0 flex items-center gap-2">
                                        <div>
                                          <div className="text-xs font-bold text-[#323338]">
                                            ₹{ord.totalAmount}
                                          </div>
                                          <div
                                            className={`text-[9px] font-bold ${
                                              ord.balanceDue > 0 ? 'text-[#e2445c]' : 'text-[#00854d]'
                                            }`}
                                          >
                                            {ord.balanceDue > 0 ? `₹${ord.balanceDue} Due` : 'Paid'}
                                          </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[#676879]" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ------------------------------------------------------------- */}
                          {/* SUB-SECTION 4: FINANCIAL LEDGER */}
                          {/* ------------------------------------------------------------- */}
                          {activeInlineTab === 'ledger' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                                    Total Booked
                                  </span>
                                  <span className="font-black text-slate-900 text-sm">
                                    ₹{totalSpent.toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                                  <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                                    Advance Received
                                  </span>
                                  <span className="font-black text-emerald-800 text-sm">
                                    ₹
                                    {custOrders
                                      .reduce((sum, o) => sum + (o.advancePaid || 0), 0)
                                      .toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <div
                                  className={`p-2.5 rounded-xl border ${
                                    totalDue > 0
                                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  }`}
                                >
                                  <span className="text-[9px] font-bold uppercase block">Balance Due</span>
                                  <span className="font-black text-sm">
                                    {totalDue > 0 ? `₹${totalDue.toLocaleString('en-IN')}` : '₹0 (Cleared)'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                <span>
                                  Total lifetime orders placed: <strong>{custOrders.length}</strong>
                                </span>
                                <a
                                  href={getWhatsAppUrl(
                                    cust.phone,
                                    `Hello ${cust.name}, here is your account balance statement from your tailor boutique. Total pending due: ₹${totalDue}.`
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-[#00A884] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Send WhatsApp Statement</span>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* GRID VIEW (CARDS) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCustomers.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs px-4">
                  <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <h3 className="text-sm font-bold text-slate-800">No Customers Found</h3>
                  <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filter.</p>
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const custOrders = getCustomerOrders(cust);
                  const custSlips = getCustomerSlips(cust);
                  const totalSpent = cust.totalSpent || custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                  const totalDue = custOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
                  const lastOrder = custOrders[0];
                  const highlights = getMeasurementHighlights(cust.measurements);
                  const fitCount = Object.keys(cust.measurements || {}).filter((k) => !!cust.measurements[k]).length;
                  const initials = cust.name
                    ? cust.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0].toUpperCase())
                        .join('')
                    : 'C';

                  return (
                    <div
                      key={cust.id || cust.phone}
                      onClick={() => handleOpenCustomerModal(cust, 'measurements')}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md hover:border-[#0B4636] transition-all flex flex-col justify-between space-y-3 cursor-pointer group relative overflow-hidden"
                    >
                      {/* Left Status Bar */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          totalDue > 0
                            ? 'bg-rose-500'
                            : cust.isRepeat
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                      />

                      <div className="pl-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-[#0B4636] font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-sm text-slate-900 group-hover:text-[#0B4636] transition-colors flex items-center gap-1.5 truncate">
                                <span className="truncate">{cust.name}</span>
                                {cust.isRepeat && (
                                  <span className="px-1.5 py-0.2 rounded-md text-[8px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                    Repeat
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span className="font-mono text-slate-600">{formatDisplayPhone(cust.phone)}</span>
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                            {custOrders.length} {custOrders.length === 1 ? 'Ord' : 'Ords'}
                          </span>
                        </div>

                        {/* Customer Stats Strip */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs">
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Spend</span>
                            <span className="font-black text-slate-900 text-xs font-mono">₹{totalSpent.toLocaleString('en-IN')}</span>
                          </div>
                          <div className={`p-2 rounded-xl border ${totalDue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                            <span className={`text-[9px] font-bold uppercase block ${totalDue > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>Pending Due</span>
                            <span
                              className={`font-black text-xs font-mono ${
                                totalDue > 0 ? 'text-rose-700' : 'text-emerald-800'
                              }`}
                            >
                              {totalDue > 0 ? `₹${totalDue.toLocaleString('en-IN')}` : '✓ Cleared'}
                            </span>
                          </div>
                        </div>

                        {/* Measurements & Slips Strip in Grid Card */}
                        <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                            <span className="flex items-center gap-1 text-emerald-800 font-extrabold">
                              <Scissors className="w-3 h-3 text-emerald-700" />
                              <span>{fitCount > 0 ? `${fitCount} Fits Recorded` : 'No Fit Book'}</span>
                            </span>
                            {custSlips.length > 0 && (
                              <span className="text-purple-800 font-bold flex items-center gap-0.5">
                                <Camera className="w-3 h-3 text-purple-700" />
                                <span>{custSlips.length} Slip{custSlips.length > 1 ? 's' : ''}</span>
                              </span>
                            )}
                          </div>

                          {highlights.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-700 font-medium">
                              {highlights.slice(0, 3).map((h) => (
                                <span key={h.label} className="bg-white text-slate-800 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                  {h.label[0]}: {h.val}
                                </span>
                              ))}
                              {highlights.length > 3 && (
                                <span className="text-slate-500 font-medium">+{highlights.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No measurements recorded</span>
                          )}
                        </div>
                      </div>

                      {/* Footer Bar */}
                      <div className="pt-2.5 pl-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="truncate">
                          Last: {lastOrder?.createdDate || cust.lastOrderDate || 'Recently'}
                        </span>

                        <div className="flex items-center gap-1">
                          <a
                            href={getWhatsAppUrl(
                              cust.phone,
                              `Hello ${cust.name}, greetings from ${shopProfile?.shopName || 'our shop'}!`
                            )}
                            onClick={(e) => e.stopPropagation()}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-md bg-[#25D366] text-white hover:bg-[#1faa4b] cursor-pointer"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3 fill-white" />
                          </a>
                          <span className="text-[#0B4636] font-extrabold flex items-center gap-0.5 group-hover:underline cursor-pointer shrink-0">
                            <span>Profile</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: LIVE FINANCIAL LEDGER */}
      {/* ========================================================================= */}
      {mainTab === 'ledger' && (
        <div className="space-y-3">
          {/* Quick Filter Bar */}
          <div className="bg-white rounded-xl p-3 border border-[#d0d4e4] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-semibold text-[#676879] shrink-0">Status:</span>
              {(
                [
                  { id: 'all', label: t('revenue.filterAll', 'All') },
                  { id: 'paid', label: t('revenue.filterPaid', 'Cleared') },
                  { id: 'pending', label: t('revenue.filterPending', 'Balance Due') },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  onClick={() => setLedgerStatusFilter(st.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    ledgerStatusFilter === st.id
                      ? 'bg-[#0073ea] text-white shadow-2xs'
                      : 'bg-[#f0f3f8] text-[#323338] hover:bg-[#e6e9ef]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Vertical Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-[11px] font-semibold text-[#676879] shrink-0">Service:</span>
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'stitching', label: 'Stitching' },
                  { id: 'alteration', label: 'Alterations' },
                  { id: 'retail', label: 'Retail' },
                ] as const
              ).map((vf) => (
                <button
                  key={vf.id}
                  onClick={() => setLedgerVerticalFilter(vf.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    ledgerVerticalFilter === vf.id
                      ? 'bg-[#fff1e0] text-[#fdab3d] border border-[#ffdbb2] font-bold'
                      : 'text-[#676879] hover:bg-[#f0f3f8]'
                  }`}
                >
                  {vf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Transactions Stream */}
          <div className="bg-white rounded-xl border border-[#d0d4e4] shadow-2xs overflow-hidden">
            <div className="bg-[#f8f9fb] p-3.5 border-b border-[#e6e9ef] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#0073ea]" />
                <span>{t('revenue.tabLedger', 'Live Financial Ledger')}</span>
              </h3>
              <span className="text-xs font-semibold text-[#676879]">
                {ledgerOrders.length} Transactions
              </span>
            </div>

            {ledgerOrders.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Receipt className="w-8 h-8 text-[#676879] mx-auto opacity-50" />
                <p className="text-xs font-bold text-[#676879]">
                  {t('revenue.noTransactions', 'No transaction records found in this view.')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e6e9ef]">
                {ledgerOrders.map((ord) => {
                  const bal =
                    ord.balanceDue !== undefined
                      ? ord.balanceDue
                      : Math.max(0, (ord.totalAmount || 0) - (ord.advancePaid || 0));
                  const isFullyPaid = bal <= 0;

                  return (
                    <div
                      key={ord.id}
                      className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f8f9fb] transition-all text-xs border-l-4 ${
                        !isFullyPaid ? 'border-l-[#e2445c]' : 'border-l-[#00c875]'
                      }`}
                    >
                      {/* Order info & Customer */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#e5f0ff] text-[#0073ea] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#cce1ff]">
                          {ord.orderNumber ? `#${ord.orderNumber.replace(/[^0-9]/g, '').slice(-3) || '01'}` : 'TX'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#323338] text-sm">
                              {ord.customerName || 'Walk-in Client'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f0f3f8] text-[#676879] border border-[#d0d4e4]">
                              {ord.garmentType || 'Stitching'}
                            </span>
                            {ord.orderType && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#e5f0ff] text-[#0073ea] border border-[#cce1ff]">
                                {ord.orderType}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-[#676879] font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                            <a
                              href={`tel:${clean10DigitPhone(ord.customerPhone)}`}
                              className="hover:text-[#0073ea] flex items-center gap-0.5"
                            >
                              <Phone className="w-2.5 h-2.5 text-[#676879]" />
                              <span>{formatDisplayPhone(ord.customerPhone)}</span>
                            </a>
                            <span>•</span>
                            <span>Booked: {ord.createdDate || 'Recently'}</span>
                            {ord.assignedTailorName && (
                              <>
                                <span>•</span>
                                <span className="text-[#323338] font-bold">
                                  Karigar: {ord.assignedTailorName}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span className="text-[#676879] font-semibold">{ord.paymentMode || 'Cash'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Amounts & 1-Tap Statement Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e6e9ef]">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-sm text-[#323338]">
                            ₹{(ord.totalAmount || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] font-semibold flex items-center gap-1.5">
                            <span className="text-[#00854d]">
                              Adv: ₹{(ord.advancePaid || 0).toLocaleString()}
                            </span>
                            <span className="text-slate-300">|</span>
                            {isFullyPaid ? (
                              <span className="text-[#00854d] font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3 text-[#00c875]" />
                                <span>Cleared</span>
                              </span>
                            ) : (
                              <span className="text-[#e2445c] font-bold">Due: ₹{bal.toLocaleString()}</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => sendWhatsAppStatement(ord)}
                          className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                          title="Send Statement on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-white" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: CUSTOMER LIFETIME SPEND LEADERBOARD */}
      {/* ========================================================================= */}
      {mainTab === 'leaderboard' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-[#d0d4e4] shadow-2xs overflow-hidden">
            <div className="bg-[#f8f9fb] p-3.5 border-b border-[#e6e9ef] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>{t('revenue.tabCustomers', 'Customer Lifetime Spend Leaderboard')}</span>
              </h3>
              <span className="text-xs font-semibold text-[#676879]">
                {customerRevenueList.length} Clients
              </span>
            </div>

            <div className="divide-y divide-[#e6e9ef]">
              {customerRevenueList.map((c, idx) => (
                <div
                  key={c.id || c.phone}
                  className="p-3.5 flex items-center justify-between hover:bg-[#f8f9fb] transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shadow-2xs ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-[#f0f3f8] text-[#676879]'
                      }`}
                    >
                      {idx === 0 ? <Crown className="w-4 h-4 text-amber-950" /> : idx + 1}
                    </div>

                    <div>
                      <div className="font-bold text-[#323338] flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm">{c.name}</span>
                        {c.isRepeat && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#fff1e0] text-[#fdab3d] border border-[#ffdbb2]">
                            Repeat
                          </span>
                        )}
                        {c.totalSpent >= 3000 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#f4ebff] text-[#a25ddc] border border-[#e0c7ff]">
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#676879] mt-0.5 flex items-center gap-2 flex-wrap">
                        <a
                          href={`tel:${clean10DigitPhone(c.phone)}`}
                          className="hover:text-[#0073ea] flex items-center gap-0.5"
                        >
                          <Phone className="w-2.5 h-2.5 text-[#676879]" />
                          <span>{formatDisplayPhone(c.phone)}</span>
                        </a>
                        <span>•</span>
                        <span>{c.ordersCount} Orders</span>
                        <span>•</span>
                        <span>Last: {c.lastOrderDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="font-bold text-sm text-[#323338]">
                        ₹{c.totalSpent.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#676879] font-semibold">
                        {c.balanceDue > 0 ? (
                          <span className="text-[#e2445c] font-bold">
                            Due: ₹{c.balanceDue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[#00854d] font-bold">✓ Cleared</span>
                        )}
                      </div>
                    </div>

                    <a
                      href={getWhatsAppUrl(
                        c.phone,
                        `Hello ${c.name}, greetings from your tailor boutique!`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer"
                      title="WhatsApp Customer"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-700" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED CUSTOMER PROFILE & MEASUREMENTS / SLIPS MODAL */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header Banner */}
            <div className="bg-[#0B4636] text-white p-3.5 sm:p-4 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#0B4636] font-black text-sm flex items-center justify-center shadow shrink-0">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black truncate">{selectedCustomer.name}</h2>
                    {selectedCustomer.isRepeat && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-300 text-[#0B4636]">
                        Repeat
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-amber-200 font-semibold flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {formatDisplayPhone(selectedCustomer.phone)}
                    </span>
                    <span>•</span>
                    <span>{getCustomerOrders(selectedCustomer).length} Orders</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={getWhatsAppUrl(
                    selectedCustomer.phone,
                    `Hello ${selectedCustomer.name}, this is from your boutique.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-all cursor-pointer"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>

                <a
                  href={`tel:${clean10DigitPhone(selectedCustomer.phone)}`}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={(e) => handleDeleteCustomer(selectedCustomer, e)}
                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white transition-all cursor-pointer"
                  title="Delete Customer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Financial Ledger Quick Strip in Modal */}
            <div className="bg-amber-50 px-3.5 sm:px-4 py-2 border-b border-amber-200 flex items-center justify-between gap-2 text-xs shrink-0">
              <div className="grid grid-cols-3 gap-3 flex-1">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Booked</span>
                  <span className="font-black text-slate-900 text-xs">
                    ₹
                    {(
                      selectedCustomer.totalSpent ||
                      getCustomerOrders(selectedCustomer).reduce((sum, o) => sum + (o.totalAmount || 0), 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-emerald-800 uppercase block">Advance</span>
                  <span className="font-black text-emerald-800 text-xs">
                    ₹
                    {getCustomerOrders(selectedCustomer)
                      .reduce((sum, o) => sum + (o.advancePaid || 0), 0)
                      .toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-rose-700 uppercase block">Balance Due</span>
                  <span className="font-black text-rose-700 text-xs">
                    ₹
                    {getCustomerOrders(selectedCustomer)
                      .reduce((sum, o) => sum + (o.balanceDue || 0), 0)
                      .toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {onNewOrderForCustomer && (
                <button
                  onClick={() => {
                    const cust = selectedCustomer;
                    setSelectedCustomer(null);
                    onNewOrderForCustomer(cust);
                  }}
                  className="px-2.5 py-1 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-lg text-[11px] shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>New Order</span>
                </button>
              )}
            </div>

            {/* Modal Sub-tab Navigation */}
            <div className="px-3.5 sm:px-4 pt-2 border-b border-slate-200 flex items-center gap-3 text-xs font-bold shrink-0 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setCustomerModalTab('measurements')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  customerModalTab === 'measurements'
                    ? 'border-[#0B4636] text-[#0B4636]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Measurements</span>
              </button>

              <button
                onClick={() => setCustomerModalTab('slips')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  customerModalTab === 'slips'
                    ? 'border-[#0B4636] text-[#0B4636]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-amber-700" />
                <span>Physical Slips ({getCustomerSlips(selectedCustomer).length})</span>
              </button>

              <button
                onClick={() => setCustomerModalTab('orders')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  customerModalTab === 'orders'
                    ? 'border-[#0B4636] text-[#0B4636]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Orders ({getCustomerOrders(selectedCustomer).length})</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-3">
              {/* TAB 1: SAVED BODY MEASUREMENTS */}
              {customerModalTab === 'measurements' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-emerald-900/5 p-2.5 rounded-xl border border-emerald-800/10 flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-black text-[#0B4636] uppercase tracking-wider">
                        Customer Measurement Record
                      </h4>
                      <p className="text-[10px] text-slate-600">
                        Default saved body measurements for repeat orders.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopyMeasurements(selectedCustomer, e)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-[11px] flex items-center gap-1 border border-slate-200 shadow-2xs cursor-pointer"
                        title="Copy to Clipboard"
                      >
                        {copiedMeasurementsId === (selectedCustomer.id || selectedCustomer.phone) ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {!isEditingMeasurementsModal ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingMeasurementsModal(true)}
                          className="px-2.5 py-1 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSaveModalMeasurements}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Measurements Input / Display Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {standardMeasurementKeys.map(({ key, label }) => {
                      const val = isEditingMeasurementsModal
                        ? modalMeasurementsDraft[key] || ''
                        : selectedCustomer.measurements?.[key] || '';

                      return (
                        <div key={key} className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 block truncate">{label}</label>
                          {isEditingMeasurementsModal ? (
                            <input
                              type="number"
                              step="0.25"
                              value={val}
                              onChange={(e) =>
                                setModalMeasurementsDraft((prev) => ({
                                  ...prev,
                                  [key]: e.target.value ? Number(e.target.value) : undefined,
                                }))
                              }
                              placeholder="0.0"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-900 mt-1 focus:ring-2 focus:ring-[#0B4636] focus:outline-none"
                            />
                          ) : (
                            <div className="text-xs font-black text-slate-900 mt-0.5">
                              {val ? `${val}"` : <span className="text-slate-300 font-normal">--</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes / Fitting Preferences */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 block">
                      Fitting Notes & Preferences
                    </label>
                    {isEditingMeasurementsModal ? (
                      <textarea
                        value={modalNotesDraft}
                        onChange={(e) => setModalNotesDraft(e.target.value)}
                        placeholder="e.g., Deep back neck, loose armhole, preferred style..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 mt-1 focus:ring-2 focus:ring-[#0B4636] focus:outline-none"
                        rows={2}
                      />
                    ) : (
                      <p className="text-xs text-slate-700 mt-0.5 italic">
                        {selectedCustomer.notes || 'No special fitting notes specified.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PHYSICAL SLIP PHOTOS */}
              {customerModalTab === 'slips' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">Physical Order Slips & Receipts</h4>
                      <p className="text-[10px] text-slate-500">
                        Camera photos of handwritten measurement slips.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleTriggerUpload(selectedCustomer, e)}
                      className="px-2.5 py-1 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Slip</span>
                    </button>
                  </div>

                  {getCustomerSlips(selectedCustomer).length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200 px-4">
                      <Camera className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-600">No physical slips photographed</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Slips captured during order creation will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {getCustomerSlips(selectedCustomer).map((slip, idx) => (
                        <div
                          key={idx}
                          onClick={() => setZoomSlipUrl(slip.url)}
                          className="group relative bg-slate-900 rounded-xl overflow-hidden aspect-3/4 border border-slate-200 cursor-pointer shadow-xs"
                        >
                          {slip.url && slip.url.trim() !== '' ? (
                            <img
                              src={slip.url}
                              alt={slip.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
                            <span className="text-[10px] font-bold truncate">{slip.title}</span>
                            <span className="text-[8px] text-slate-300">{slip.date}</span>
                          </div>
                          <div className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-3 h-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ORDER HISTORY */}
              {customerModalTab === 'orders' && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900">
                    Order History ({getCustomerOrders(selectedCustomer).length})
                  </h4>

                  {getCustomerOrders(selectedCustomer).length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <Scissors className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-600">No orders placed yet</p>
                    </div>
                  ) : (
                    getCustomerOrders(selectedCustomer).map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => {
                          if (onSelectOrder) {
                            setSelectedCustomer(null);
                            onSelectOrder(ord);
                          }
                        }}
                        className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-slate-500">
                              #{ord.orderNumber || ord.id}
                            </span>
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {ord.garmentType}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                ord.status === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'Completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Due: {ord.dueDate} • Assigned: {ord.assignedTailor || ord.assignedTailorName || 'Self'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-900">₹{ord.totalAmount}</div>
                          <div
                            className={`text-[9px] font-bold ${
                              ord.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {ord.balanceDue > 0 ? `₹${ord.balanceDue} Due` : 'Paid'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD NEW CUSTOMER MODAL */}
      {/* ========================================================================= */}
      {isAddCustomerOpen && (
        <div
          onClick={() => setIsAddCustomerOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn font-sans"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="p-4 bg-[#0B4636] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Add New Customer</h3>
                  <p className="text-[11px] text-amber-200 font-medium">
                    Profile & measurements saved to boutique customer collection
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCustName.trim() || !newCustPhone.trim()) {
                  alert('Please enter both customer name and mobile number.');
                  return;
                }
                setIsSavingNewCust(true);
                try {
                  const cleanPhone = clean10DigitPhone(newCustPhone);
                  const newCust: TailorCustomer = {
                    id: `cust-${Date.now()}`,
                    name: newCustName.trim(),
                    phone: cleanPhone || newCustPhone.trim(),
                    gender: newCustGender,
                    notes: newCustNotes.trim(),
                    isRepeat: false,
                    ordersCount: 0,
                    lastOrderDate: 'New Customer',
                    totalSpent: 0,
                    measurements: newCustMeasurements,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  await roomDb.saveCustomer(newCust);
                  setAllCustomers((prev) => [newCust, ...prev]);
                  setIsAddCustomerOpen(false);
                  setNewCustName('');
                  setNewCustPhone('');
                  setNewCustNotes('');
                  setNewCustMeasurements({});
                } finally {
                  setIsSavingNewCust(false);
                }
              }}
              className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs"
            >
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4636] font-bold text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4636] font-mono font-bold text-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Gender / Category */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Ladies', 'Gents', 'Kids'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNewCustGender(g)}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        newCustGender === g
                          ? 'bg-[#0B4636] text-amber-300 border-[#0B4636] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes & Style Preferences */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  Style Preferences / Fitting Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prefers comfort loose fit, deep back neck, padded blouse..."
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4636] font-medium text-slate-900 text-xs"
                />
              </div>

              {/* Initial Body Measurements (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black text-slate-700">
                    Fit Book Measurements (Inches)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Optional - can add later</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                  {[
                    { key: 'chest', label: 'Chest / Bust' },
                    { key: 'shoulder', label: 'Shoulder' },
                    { key: 'frontLength', label: 'Front Length' },
                    { key: 'waist', label: 'Waist' },
                    { key: 'hip', label: 'Seat / Hip' },
                    { key: 'sleeveLength', label: 'Sleeves' },
                    { key: 'pantLength', label: 'Pant Length' },
                    { key: 'bottomHem', label: 'Bottom / Mori' },
                    { key: 'neck', label: 'Neck Depth' },
                  ].map((field) => (
                    <div key={field.key}>
                      <span className="text-[10px] font-bold text-slate-500 block truncate">
                        {field.label}
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. 36"
                        value={newCustMeasurements[field.key] || ''}
                        onChange={(e) =>
                          setNewCustMeasurements((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0B4636]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewCust}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#0B4636] hover:bg-[#073024] text-amber-300 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingNewCust ? 'Saving...' : 'Save Customer Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ZOOM SLIP LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      {zoomSlipUrl && (
        <div
          onClick={() => setZoomSlipUrl(null)}
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl max-h-[88vh] bg-black rounded-2xl overflow-hidden border border-white/20 shadow-2xl flex flex-col"
          >
            {zoomSlipUrl && zoomSlipUrl.trim() !== '' ? (
              <img src={zoomSlipUrl} alt="Slip Full" className="w-full h-full max-h-[80vh] object-contain" />
            ) : null}
            <button
              onClick={() => setZoomSlipUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
