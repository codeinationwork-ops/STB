import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Receipt,
  QrCode,
  CreditCard,
  Banknote,
  CheckCircle2,
  User,
  Phone,
  Tag,
  Check,
  Save,
  Loader2,
  X,
  Search,
  Copy,
  Sparkles,
  UserPlus,
  Package,
  Boxes,
  Edit2,
  Scissors,
  Clock,
  Calendar,
  AlertTriangle,
  Camera,
  Mic,
  Play,
  Square,
  Upload,
} from 'lucide-react';
import {
  TailorOrder,
  SaleItem,
  PaymentMode,
  ShopProfile,
  TailorCustomer,
  InventoryItem,
  StaffTailor,
} from '../../types';
import { clean10DigitPhone, sanitizePhoneInput } from '../../lib/phoneUtils';
import { useLanguage } from '../../lib/LanguageContext';
import { roomDb } from '../../lib/localRoomDb';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Screen3SaleFormProps {
  onSaveOrder: (order: TailorOrder, addAnother?: boolean) => void;
  onBack: () => void;
  shopProfile?: ShopProfile | null;
  existingCustomers?: TailorCustomer[];
  isDesktopView?: boolean;
}

const ALTERATION_TASK_CATALOG = [
  { id: 'waist_fit', key: 'alter.taskWaist', label: 'Waist Tightening / Loosening', icon: '📏' },
  { id: 'length_hem', key: 'alter.taskLength', label: 'Length Shortening / Hemming', icon: '✂️' },
  { id: 'sleeve_fit', key: 'alter.taskSleeve', label: 'Sleeve Length / Slimming', icon: '👔' },
  { id: 'shoulder_fit', key: 'alter.taskShoulder', label: 'Shoulder & Armhole Fitting', icon: '🪡' },
  { id: 'side_seam', key: 'alter.taskSide', label: 'Side Seam Resizing (Body Fit)', icon: '👗' },
  { id: 'zip_replace', key: 'alter.taskZip', label: 'Zipper / Chain Replacement', icon: '🔄' },
  { id: 'button_hook', key: 'alter.taskButton', label: 'Buttons / Hooks / Eyelets Fix', icon: '🔘' },
  { id: 'neck_collar', key: 'alter.taskNeck', label: 'Neckline & Collar Adjustment', icon: '🧵' },
  { id: 'lining_patch', key: 'alter.taskDarning', label: 'Darning / Inner Lining / Tear Repair', icon: '🧷' },
];

export const Screen3SaleForm: React.FC<Screen3SaleFormProps> = ({
  onSaveOrder,
  onBack,
  shopProfile: initialShopProfile,
  existingCustomers = [],
  isDesktopView = false,
}) => {
  const { t } = useLanguage();

  // ---------------- TAILOR & SHOP UPI STATE ----------------
  const [liveShopProfile, setLiveShopProfile] = useState<ShopProfile>(
    initialShopProfile || roomDb.getShopProfile()
  );
  const [tailorsList, setTailorsList] = useState<StaffTailor[]>(roomDb.getTailors());
  const [isEditingUpi, setIsEditingUpi] = useState<boolean>(false);
  const [customUpiInput, setCustomUpiInput] = useState<string>('');

  // Fetch live tailor & shop profile data from Firestore / RoomDb
  useEffect(() => {
    const fetchTailorProfile = async () => {
      try {
        const profile = roomDb.getShopProfile();
        setLiveShopProfile(profile);
        setTailorsList(roomDb.getTailors());

        // Try reading live from Firestore `boutiques` (single shop_<phone> document)
        const boutiqueId = roomDb.getBoutiqueId();
        const shopSnap = await getDoc(doc(db, 'boutiques', boutiqueId)).catch(() => null);
        if (shopSnap && shopSnap.exists()) {
          const remoteData = shopSnap.data() as ShopProfile;
          setLiveShopProfile(remoteData);
        }
      } catch (e) {
        console.warn('Using local shop profile:', e);
      }
    };
    fetchTailorProfile();
  }, [initialShopProfile]);

  // Derived UPI ID from tailor / shop profile
  const ownerTailor = tailorsList.find((tl) => tl.role === 'Owner') || tailorsList[0];
  const effectivePhone =
    liveShopProfile?.phoneNumber ||
    liveShopProfile?.gpayPhonePeNumber ||
    ownerTailor?.phone ||
    '';
  const cleanPhone = clean10DigitPhone(effectivePhone);

  const effectiveUpiId =
    liveShopProfile?.upiId?.trim() ||
    (cleanPhone && cleanPhone !== '0000000000' && cleanPhone.length === 10
      ? `${cleanPhone}@upi`
      : '7608807790@upi');

  const shopDisplayName =
    liveShopProfile?.shopName || ownerTailor?.name || 'Boutique Store';

  // ---------------- INVENTORY ITEMS STATE ----------------
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(() => roomDb.getInventory());
  useEffect(() => {
    // Initial fetch from in-memory and Firestore
    setInventoryList(roomDb.getInventory());
    roomDb.syncInventoryFromFirestoreNow();

    // Subscribe to real-time inventory updates
    const unsub = roomDb.subscribe(() => {
      setInventoryList(roomDb.getInventory());
    });
    return () => unsub();
  }, []);

  // ---------------- CUSTOMER STATE ----------------
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchStatus, setSearchStatus] = useState<{
    found: boolean;
    message: string;
    customer?: TailorCustomer;
  } | null>(null);

  // ---------------- NEW ITEM INPUT STATE (Image-2 Search & Auto-price) ----------------
  const [itemSearchText, setItemSearchText] = useState('');
  const [itemPriceInput, setItemPriceInput] = useState<string>(''); // Blank if not in inventory!
  const [itemQtyInput, setItemQtyInput] = useState<number>(1);
  const [matchedInventoryItem, setMatchedInventoryItem] = useState<InventoryItem | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Suggestions filtered from inventory
  const inventorySuggestions = useMemo(() => {
    if (!itemSearchText.trim()) return inventoryList.slice(0, 8);
    const query = itemSearchText.toLowerCase().trim();
    return inventoryList.filter(
      (inv) =>
        (inv.name && inv.name.toLowerCase().includes(query)) ||
        (inv.sku && inv.sku.toLowerCase().includes(query)) ||
        (inv.category && inv.category.toLowerCase().includes(query))
    );
  }, [itemSearchText, inventoryList]);

  // When user types in Item Search, check if exact or partial match exists
  const handleItemNameChange = (text: string) => {
    setItemSearchText(text);
    setShowSuggestions(true);

    const clean = text.trim().toLowerCase();
    const found = inventoryList.find(
      (inv) => inv.name && inv.name.trim().toLowerCase() === clean
    );

    if (found) {
      setMatchedInventoryItem(found);
      const effectivePrice = found.finalPrice ?? found.sellingPrice ?? found.price ?? '';
      setItemPriceInput(effectivePrice ? String(effectivePrice) : '');
    } else {
      setMatchedInventoryItem(null);
      // If NOT in inventory, leave price blank!
      setItemPriceInput('');
    }
  };

  const handleSelectInventorySuggestion = (inv: InventoryItem) => {
    setItemSearchText(inv.name);
    setMatchedInventoryItem(inv);
    const effectivePrice = inv.finalPrice ?? inv.sellingPrice ?? inv.price ?? '';
    if (effectivePrice !== '' && Number(effectivePrice) > 0) {
      setItemPriceInput(String(effectivePrice));
    } else {
      setItemPriceInput('');
    }
    setShowSuggestions(false);
  };

  // Add Item to Bill (Action labeled "+ Add")
  const handleAddItemToBill = () => {
    const name = itemSearchText.trim();
    if (!name) {
      setValidationError('Please enter an item name or description.');
      return;
    }

    const price = Number(itemPriceInput);
    if (isNaN(price) || price < 0) {
      setValidationError('Please enter a valid price for the item.');
      return;
    }

    const newItem: SaleItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: name,
      quantity: Math.max(1, itemQtyInput),
      unitPrice: price,
      discount: 0,
      sku: matchedInventoryItem?.sku || `SKU-${Math.floor(100 + Math.random() * 900)}`,
      category: matchedInventoryItem?.category || 'Ready-made',
    };

    setItems((prev) => [...prev, newItem]);

    // Reset adder state: clear input & leave price blank for next item
    setItemSearchText('');
    setItemPriceInput('');
    setItemQtyInput(1);
    setMatchedInventoryItem(null);
    setShowSuggestions(false);
    setValidationError(null);
  };

  // ---------------- LINE ITEMS IN BILL TABLE (Starts Empty - user adds items) ----------------
  const [items, setItems] = useState<SaleItem[]>([]);

  // ---------------- ALTERATION INTEGRATION (Image-1, Image-2, Image-3, Image-4) ----------------
  const [needsAlteration, setNeedsAlteration] = useState<boolean>(false);
  const [alterationUrgency, setAlterationUrgency] = useState<
    'Standard (2-3 Days)' | 'Same Day (24h)' | 'Urgent Express (1-2h)'
  >('Standard (2-3 Days)');
  const [selectedAlterationTasks, setSelectedAlterationTasks] = useState<string[]>([
    'Waist Tightening / Loosening',
    'Length Shortening / Hemming',
  ]);
  const [customAlterationTask, setCustomAlterationTask] = useState('');
  const [alterationDefectNotes, setAlterationDefectNotes] = useState('');
  const [alterationDueDate, setAlterationDueDate] = useState<string>(() => {
    return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  });
  const [alterationDueTime, setAlterationDueTime] = useState<string>('18:00');
  const [assignedTailor, setAssignedTailor] = useState<string>('Unassigned');

  // Alteration Photos & Voice Notes (Image-4)
  const [alterationPhotos, setAlterationPhotos] = useState<string[]>([]);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  const toggleAlterationTask = (taskLabel: string) => {
    const current = selectedAlterationTasks || [];
    if (current.includes(taskLabel)) {
      setSelectedAlterationTasks(current.filter((t) => t !== taskLabel));
    } else {
      setSelectedAlterationTasks([...current, taskLabel]);
    }
  };

  const handleAddCustomAlterationTask = () => {
    if (!customAlterationTask.trim()) return;
    const current = selectedAlterationTasks || [];
    if (!current.includes(customAlterationTask.trim())) {
      setSelectedAlterationTasks([...current, customAlterationTask.trim()]);
    }
    setCustomAlterationTask('');
  };

  const handleSelectUrgency = (level: typeof alterationUrgency) => {
    setAlterationUrgency(level);
    const now = new Date();
    if (level === 'Urgent Express (1-2h)') {
      setAlterationDueDate(now.toISOString().split('T')[0]);
      const futureHours = (now.getHours() + 2) % 24;
      setAlterationDueTime(`${String(futureHours).padStart(2, '0')}:00`);
    } else if (level === 'Same Day (24h)') {
      setAlterationDueDate(now.toISOString().split('T')[0]);
      setAlterationDueTime('20:00');
    } else {
      const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      setAlterationDueDate(future.toISOString().split('T')[0]);
      setAlterationDueTime('18:00');
    }
  };

  // Voice recording handlers
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setVoiceNoteUrl(audioUrl);
        setIsRecordingVoice(false);
        clearInterval(recordingIntervalRef.current);
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingTimer(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access not available or permitted:', err);
      alert('Microphone permission required for voice notes.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (loadEvt.target?.result) {
          setAlterationPhotos((prev) => [...prev, loadEvt.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ---------------- BILLING, TAX & DISCOUNT ----------------
  const [gstMode, setGstMode] = useState<'preset' | 'custom'>('preset');
  const [gstRate, setGstRate] = useState<number>(0);
  const [customGstInput, setCustomGstInput] = useState<string>('18');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [specialNotes, setSpecialNotes] = useState('');

  // ---------------- PAYMENT SETTLEMENT ----------------
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [isFullyPaid, setIsFullyPaid] = useState<boolean>(true);
  const [customAdvance, setCustomAdvance] = useState<number>(0);
  const [instantDelivery, setInstantDelivery] = useState<boolean>(true);
  const [upiConfirmed, setUpiConfirmed] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Saving State & Validation
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculations
  const effectiveGstRate = gstMode === 'custom' ? Number(customGstInput) || 0 : gstRate;
  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice - (item.discount || 0)),
    0
  );
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = effectiveGstRate > 0 ? Math.round((taxableSubtotal * effectiveGstRate) / 100) : 0;
  const grandTotal = taxableSubtotal + taxAmount;
  const advancePaid = isFullyPaid ? grandTotal : Math.min(grandTotal, customAdvance);
  const balanceDue = Math.max(0, grandTotal - advancePaid);

  // Dynamic UPI QR URI
  const upiQrPaymentUri = `upi://pay?pa=${effectiveUpiId}&pn=${encodeURIComponent(
    shopDisplayName
  )}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('Boutique Sale Bill')}`;

  // Customer Auto-Search
  const handleSearchCustomer = (phoneToSearch?: string) => {
    const raw = phoneToSearch !== undefined ? phoneToSearch : customerPhone;
    const clean = sanitizePhoneInput(raw);
    if (!clean || clean.length < 10) {
      setSearchStatus(null);
      return;
    }

    setIsSearchingCustomer(true);
    const matchedCustomer = existingCustomers.find((c) => c.phone && c.phone.includes(clean));

    if (matchedCustomer) {
      setCustomerName(matchedCustomer.name);
      setIsWalkIn(false);
      setSearchStatus({
        found: true,
        message: `Existing Client Found: ${matchedCustomer.name} (${matchedCustomer.totalOrdersCount || 1} past orders)`,
        customer: matchedCustomer,
      });
    } else {
      setSearchStatus({
        found: false,
        message: `New client with mobile +91 ${clean}. New account will be created on bill generation.`,
      });
    }
    setIsSearchingCustomer(false);
  };

  const handleUpdateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddBlankRow = () => {
    const newItem: SaleItem = {
      id: `item-${Date.now()}`,
      name: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      category: 'Ready-made',
    };
    setItems([...items, newItem]);
  };

  const handleToggleWalkIn = () => {
    if (!isWalkIn) {
      setIsWalkIn(true);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setSearchStatus(null);
    } else {
      setIsWalkIn(false);
      setCustomerName('');
      setCustomerPhone('');
      setSearchStatus(null);
    }
  };

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(effectiveUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirmUpiPayment = () => {
    setIsFullyPaid(true);
    setUpiConfirmed(true);
  };

  const handleSaveUpdatedUpiId = async () => {
    if (!customUpiInput.trim()) return;
    const cleanUpi = customUpiInput.trim();
    try {
      const updatedProfile: ShopProfile = {
        ...liveShopProfile,
        upiId: cleanUpi,
      };
      setLiveShopProfile(updatedProfile);
      await roomDb.updateShopProfile(updatedProfile);
      setIsEditingUpi(false);
    } catch (e) {
      console.error('Error saving updated UPI:', e);
    }
  };

  const buildSaleOrder = (): TailorOrder | null => {
    const validItems = items.filter(
      (i) => i.name.trim().length > 0 && i.quantity > 0 && i.unitPrice >= 0
    );
    if (validItems.length === 0) {
      setValidationError('Please add at least one valid line item with a name and price.');
      return null;
    }

    let cleanP = clean10DigitPhone(customerPhone);
    if (!isWalkIn) {
      if (!customerName.trim()) {
        setValidationError('Please provide the customer name.');
        return null;
      }
      if (cleanP.length !== 10) {
        setValidationError('Please enter a valid 10-digit mobile number for customer billing.');
        return null;
      }
    } else {
      if (cleanP.length !== 10) {
        cleanP = '0000000000';
      }
    }

    const random4 = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${random4}`;
    const orderId = `SALE-${new Date().getFullYear()}-${random4}`;
    const custId =
      isWalkIn && cleanP === '0000000000'
        ? `cust_walkin_${Date.now()}`
        : `cust_${cleanP}`;

    const itemsSummary = validItems.map((i) => `${i.name} (x${i.quantity})`).join(', ');

    let combinedNotes = specialNotes.trim();
    if (needsAlteration) {
      const altSummary = `Alteration (${alterationUrgency}): ${selectedAlterationTasks.join(', ')}`;
      const defectSummary = alterationDefectNotes ? ` | Condition: ${alterationDefectNotes}` : '';
      combinedNotes = combinedNotes
        ? `${combinedNotes} | ${altSummary}${defectSummary} | Items: ${itemsSummary}`
        : `${altSummary}${defectSummary} | Items: ${itemsSummary}`;
    } else {
      combinedNotes = combinedNotes ? `${combinedNotes} | Items: ${itemsSummary}` : `Items: ${itemsSummary}`;
    }

    // Determine status: if needs alteration and not instant delivery, set to 'In Progress' / 'Pending'
    const finalStatus: 'In Alteration / Fitting' | 'Delivered' | 'Completed' =
      needsAlteration && !instantDelivery
        ? 'In Alteration / Fitting'
        : instantDelivery
        ? 'Delivered'
        : 'Completed';

    return {
      id: orderId,
      customerId: custId,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: cleanP === '0000000000' ? 'Walk-in (Cash Counter)' : `+91 ${cleanP}`,
      isRepeatCustomer: !isWalkIn && existingCustomers.some((c) => c.phone && c.phone.includes(cleanP)),
      garmentType: validItems[0].name || 'Ready-made Apparel',
      orderCategory: 'Sale',
      subTypeStyle: needsAlteration
        ? `Sale + Alteration • ${validItems.length} Item${validItems.length > 1 ? 's' : ''}`
        : `Sale • ${validItems.length} Item${validItems.length > 1 ? 's' : ''}`,
      genderCategory: 'Unisex',
      measurementMode: 'manual',
      measurements: {},
      receiptImageUrl: null,
      referenceGarmentUrl: null,
      specialNotes: combinedNotes,
      voiceNoteUrl: voiceNoteUrl || null,
      voiceNoteDurationSec: recordingTimer || 0,
      fabricPhotos: alterationPhotos,
      totalAmount: grandTotal,
      advancePaid: advancePaid,
      balanceDue: balanceDue,
      paymentMode: paymentMode,
      paymentHistory: [
        {
          id: `pay-${Date.now()}`,
          date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          amount: advancePaid,
          type: isFullyPaid ? 'Full Payment' : 'Advance',
          mode: paymentMode,
          note: isFullyPaid ? 'Direct counter settlement' : 'Partial payment on sale booking',
        },
      ],
      status: finalStatus,
      deliveredDate: finalStatus === 'Delivered' ? new Date().toISOString().split('T')[0] : undefined,
      createdDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdBy: 'Boutique Counter',
      dueDate: needsAlteration ? alterationDueDate : new Date().toISOString().split('T')[0],
      dueTime: needsAlteration ? alterationDueTime : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      assignedTailor: needsAlteration ? assignedTailor : 'Counter Sales',
      estimatedHours: needsAlteration ? 1 : 0,
      offerMessage: `Invoice generated. Thank you for shopping with ${shopDisplayName}!`,
      isOverdue: false,
      daysOverdue: 0,
      isArchived: false,
      updatedAt: new Date().toISOString(),

      // Category attributes
      saleItems: validItems,
      subtotalAmount: subtotal,
      discountAmount: discountAmount,
      taxAmount: taxAmount,
      gstIncluded: effectiveGstRate > 0,
      invoiceNumber: invoiceNumber,

      // Alteration attributes if alteration was requested
      needsAlteration: needsAlteration,
      alterationTasks: needsAlteration ? selectedAlterationTasks : [],
      alterationUrgency: needsAlteration ? alterationUrgency : undefined,
      defectNotes: needsAlteration ? alterationDefectNotes : '',
      referencePhotos: alterationPhotos,
    };
  };

  const handleGenerateReceipt = async () => {
    setValidationError(null);
    const order = buildSaleOrder();
    if (!order) return;

    setIsSaving(true);
    try {
      await onSaveOrder(order, false);
    } catch (err) {
      console.error('Error saving sale order:', err);
      setValidationError('Failed to generate receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar (Image-1: Top button removed, replaced with Needs Alteration Toggle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black shrink-0 shadow-2xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>{t('sale.title', 'Sale')}</span>
              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                Fast POS
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t('sale.subtitle', 'Direct billing, itemized checkout & immediate receipt handover')}
            </p>
          </div>
        </div>

        {/* Image-1: Toggle for "Needs Alteration?" in header bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !needsAlteration;
              setNeedsAlteration(next);
              if (next) {
                setInstantDelivery(false);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-2xs ${
              needsAlteration
                ? 'bg-[#0B4636] text-amber-300 border-[#0B4636] font-black ring-2 ring-[#0B4636]/20'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>{needsAlteration ? '✓ Needs Alteration (Enabled)' : '+ Needs Alteration?'}</span>
          </button>
        </div>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{validationError}</span>
          </div>
          <button onClick={() => setValidationError(null)} className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---------------- 1. CUSTOMER & BILLING INFO (Matching Stitch Intake) ---------------- */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>{t('sale.secCustomer', '1. Customer & Billing Info')}</span>
          </h3>

          <button
            type="button"
            onClick={handleToggleWalkIn}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isWalkIn
                ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-xs font-extrabold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <span>{isWalkIn ? t('sale.walkIn', '🚶‍♂️ Walk-in Customer (Fast POS)') : t('sale.namedCustomer', '👤 Regular / Named Customer')}</span>
          </button>
        </div>

        {isWalkIn ? (
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-900">
              <span className="text-base">⚡</span>
              <div>
                <span className="font-extrabold">{t('sale.walkInNotice', 'Instant Walk-in Cash Counter Mode:')}</span>
                <span className="text-purple-700 ml-1">
                  {t('sale.walkInNoticeSub', 'Customer name & phone are optional for speedy counter sales.')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsWalkIn(false);
                setCustomerName('');
              }}
              className="text-xs font-bold text-purple-900 underline hover:text-purple-950 cursor-pointer"
            >
              {t('sale.addPhoneName', 'Add Phone / Name')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Mobile (10 Digits) with search button */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('sale.mobileNumber', 'Customer Mobile (10 Digits) *')}
                </label>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl p-1 focus-within:bg-white focus-within:border-[#0B4636] focus-within:ring-1 focus-within:ring-[#0B4636]">
                  <span className="text-xs font-extrabold text-slate-600 px-2 border-r border-slate-300">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => {
                      const val = sanitizePhoneInput(e.target.value);
                      setCustomerPhone(val);
                      if (val.length === 10) {
                        handleSearchCustomer(val);
                      } else {
                        setSearchStatus(null);
                      }
                    }}
                    placeholder="9876543210"
                    className="w-full bg-transparent px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchCustomer()}
                    disabled={isSearchingCustomer}
                    className="bg-[#0B4636] hover:bg-[#073024] text-amber-300 px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                  >
                    {isSearchingCustomer ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('sale.customerNameLabel', 'Customer Name *')}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Search Status Banner */}
            {searchStatus && (
              <div
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                  searchStatus.found
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {searchStatus.found ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{searchStatus.message}</span>
                </div>
                {searchStatus.found && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-md">
                    Verified Customer
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- 2. ITEM SELECTION WITH INVENTORY AUTO-LOOKUP (Image-2) ---------------- */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
            <Boxes className="w-4 h-4" />
            <span>2. Add Garment / Item</span>
          </label>
          <span className="text-[11px] font-semibold text-slate-400">
            {inventoryList.length > 0
              ? `Connected to Inventory (${inventoryList.length} SKUs in stock)`
              : 'Auto-fetches price if in inventory'}
          </span>
        </div>

        {/* Interactive Type & Search with Inventory Auto-Price or Blank */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Item Name Input with Smart Auto-Search Dropdown */}
            <div className="sm:col-span-6 relative">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Item / Garment Name (Type to search inventory or enter custom) *
              </label>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={itemSearchText}
                  onChange={(e) => handleItemNameChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="e.g. Designer Kurti, Banarasi Saree, Formal Shirt..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636] focus:ring-1 focus:ring-[#0B4636]"
                />
                {itemSearchText && (
                  <button
                    type="button"
                    onClick={() => {
                      setItemSearchText('');
                      setMatchedInventoryItem(null);
                      setItemPriceInput('');
                    }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete suggestions dropdown from inventory */}
              {showSuggestions && inventorySuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  <div className="p-2 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Matching Boutique Inventory</span>
                    <span>{inventorySuggestions.length} items</span>
                  </div>
                  {inventorySuggestions.map((inv) => {
                    const price = inv.finalPrice ?? inv.sellingPrice ?? inv.price ?? 0;
                    const photo = inv.photos?.[0] || inv.imageUrl;
                    return (
                      <div
                        key={inv.id}
                        onMouseDown={() => handleSelectInventorySuggestion(inv)}
                        className="p-2.5 hover:bg-emerald-50/70 flex items-center justify-between cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          {photo ? (
                            <img
                              src={photo}
                              alt={inv.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                              {inv.category?.slice(0, 2).toUpperCase() || 'IT'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{inv.name}</span>
                              {inv.sku && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                  {inv.sku}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {inv.category} • In Stock: <span className="font-bold text-emerald-700">{inv.quantity} {inv.unit || 'pcs'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-[#0B4636] text-xs">
                            ₹{price.toLocaleString('en-IN')}
                          </span>
                          <span className="block text-[9px] text-emerald-700 font-bold bg-emerald-100/70 px-1 rounded">Auto-Price</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Price Input (Auto-filled from inventory OR left blank if not present!) */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Rate (₹) {matchedInventoryItem ? '(from inventory)' : '(leave blank if custom)'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min={0}
                  value={itemPriceInput}
                  onChange={(e) => setItemPriceInput(e.target.value)}
                  placeholder={matchedInventoryItem ? String(matchedInventoryItem.sellingPrice) : 'Enter rate'}
                  className={`w-full bg-white border rounded-xl pl-7 pr-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-[#0B4636] ${
                    matchedInventoryItem
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t('sale.qty', 'Qty')}
              </label>
              <input
                type="number"
                min={1}
                value={itemQtyInput}
                onChange={(e) => setItemQtyInput(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-white border border-slate-300 rounded-xl px-1 py-2 text-xs font-black text-slate-900 text-center focus:outline-none focus:border-[#0B4636]"
              />
            </div>

            {/* Action Button: Labeled "+ Add" */}
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddItemToBill}
                className="w-full bg-[#0B4636] hover:bg-[#073024] text-amber-300 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 border border-amber-300/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('sale.addItemBtn', '+ Add')}</span>
              </button>
            </div>
          </div>

          {/* Inventory Match Status Notice */}
          {matchedInventoryItem ? (
            <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Found in Inventory: <b>{matchedInventoryItem.name}</b> (Stock: {matchedInventoryItem.quantity} {matchedInventoryItem.unit})
                </span>
              </span>
              <span className="text-emerald-900 font-black">
                Selling Price: ₹{matchedInventoryItem.sellingPrice?.toLocaleString('en-IN')}
              </span>
            </div>
          ) : itemSearchText.trim() ? (
            <div className="text-[11px] text-slate-500 font-medium px-1 flex items-center justify-between">
              <span>💡 Item not in catalogue — price field is blank for custom counter rate.</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------------- 3. ITEMIZED BILL TABLE ---------------- */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4" />
            <span>{t('sale.secBilling', '2. Itemized Retail Billing')} ({items.length} Items)</span>
          </h3>

          <button
            type="button"
            onClick={handleAddBlankRow}
            className="bg-[#0B4636]/10 hover:bg-[#0B4636]/20 text-[#0B4636] px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('order.addCustomField', 'Add Row')}</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                <th className="py-2.5 px-3">{t('sale.itemDesc', 'Item Description')}</th>
                <th className="py-2.5 px-2 w-24 text-center">{t('sale.qty', 'Qty')}</th>
                <th className="py-2.5 px-2 w-28 text-right">{t('sale.unitRate', 'Unit Rate (₹)')}</th>
                <th className="py-2.5 px-2 w-24 text-right">{t('sale.lineTotal', 'Line Total (₹)')}</th>
                <th className="py-2.5 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <ShoppingBag className="w-7 h-7 mx-auto text-slate-300 mb-1" />
                    <p className="text-xs font-bold text-slate-600">No items added to bill yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the item search above and tap "+ Add" or click "+ Add Row"</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice - (item.discount || 0);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="Item name / Product description..."
                          className="w-full bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636] focus:bg-white"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                            className="w-6 h-6 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-black text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, 'quantity', item.quantity + 1)}
                            className="w-6 h-6 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-slate-400 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice || ''}
                            onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value) || 0)}
                            className="w-full bg-slate-50/70 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-black text-slate-900 text-right focus:outline-none focus:border-[#0B4636] focus:bg-white"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-black text-slate-900">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Remove Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* GST & Discount Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* GST Selection */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-slate-700">{t('sale.gstOption', 'GST / Tax Invoice Option')}</label>
            <div className="grid grid-cols-5 gap-1">
              {[
                { label: t('sale.gstNone', '0% None'), val: 0, isCustom: false },
                { label: t('sale.gst5', '5% Apparel'), val: 5, isCustom: false },
                { label: t('sale.gst12', '12% Designer'), val: 12, isCustom: false },
                { label: t('sale.gst18', '18% Trims'), val: 18, isCustom: false },
                { label: t('sale.gstCustom', 'Custom %'), val: -1, isCustom: true },
              ].map((gst, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (gst.isCustom) {
                      setGstMode('custom');
                    } else {
                      setGstMode('preset');
                      setGstRate(gst.val);
                    }
                  }}
                  className={`py-1.5 px-1 rounded-lg text-center font-extrabold text-[10px] cursor-pointer transition-all ${
                    (gst.isCustom && gstMode === 'custom') || (!gst.isCustom && gstMode === 'preset' && gstRate === gst.val)
                      ? 'bg-[#0B4636] text-amber-300 shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {gst.label}
                </button>
              ))}
            </div>

            {/* Custom GST Input Field */}
            {gstMode === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <label className="text-[11px] font-bold text-slate-600 shrink-0">{t('sale.enterGstPercent', 'Enter GST %')}:</label>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={customGstInput}
                    onChange={(e) => setCustomGstInput(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full bg-white border border-[#0B4636] rounded-lg px-2.5 py-1 text-xs font-black text-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-1 font-black text-slate-500 text-xs">%</span>
                </div>
              </div>
            )}
          </div>

          {/* Bill Discount */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">{t('sale.billDiscount', 'Special Bill Discount (₹)')}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                min={0}
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded-xl pl-7 pr-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636]"
              />
            </div>
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="bg-[#0B4636]/5 border border-[#0B4636]/20 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
            <span>{t('sale.itemsSubtotal', 'Items Subtotal')}</span>
            <span>₹{subtotal.toLocaleString('en-IN')}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-rose-600 font-bold">
              <span>{t('sale.discountLabel', 'Bill Discount')}</span>
              <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
            </div>
          )}

          {effectiveGstRate > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
              <span>GST ({effectiveGstRate}%)</span>
              <span>+ ₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="border-t border-[#0B4636]/20 pt-2 flex items-center justify-between">
            <span className="text-sm font-black text-slate-900">{t('sale.grandTotalPayable', 'Grand Total Payable')}</span>
            <span className="text-xl font-black text-[#0B4636]">₹{grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* ---------------- ALTERATION DETAILS (Shown when Needs Alteration is enabled) (Images 2, 3, 4) ---------------- */}
      {needsAlteration && (
        <div className="bg-white rounded-2xl p-4 border-2 border-[#0B4636]/30 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#0B4636]" />
              <span>3. Alteration & Fitting Specifications</span>
            </h3>
            <span className="text-[11px] font-black text-[#0B4636] bg-[#0B4636]/10 px-2.5 py-1 rounded-lg">
              {selectedAlterationTasks.length} Alteration Task(s) Selected
            </span>
          </div>

          {/* Urgency Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Alteration Urgency & Timeline:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 'Standard (2-3 Days)', icon: '📅', desc: 'Regular fitting' },
                { level: 'Same Day (24h)', icon: '⏱️', desc: 'Evening pickup' },
                { level: 'Urgent Express (1-2h)', icon: '⚡', desc: 'Express rush' },
              ].map((u) => (
                <button
                  key={u.level}
                  type="button"
                  onClick={() => handleSelectUrgency(u.level as typeof alterationUrgency)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    alterationUrgency === u.level
                      ? 'border-[#0B4636] bg-[#0B4636] text-amber-300 shadow-sm ring-1 ring-[#0B4636]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-base">{u.icon}</div>
                  <div className="font-extrabold text-xs mt-0.5">{u.level}</div>
                  <div
                    className={`text-[10px] font-medium ${
                      alterationUrgency === u.level ? 'text-amber-200' : 'text-slate-500'
                    }`}
                  >
                    {u.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Alteration Work Checklist (All options with NO pricing badges) (Images 2, 3) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-slate-500" />
                <span>Alteration Work Checklist ({selectedAlterationTasks.length} Selected)</span>
              </label>
              <span className="text-[11px] font-black text-[#0B4636]">Tap to Select Tasks</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALTERATION_TASK_CATALOG.map((task) => {
                const isSelected = (selectedAlterationTasks || []).includes(task.label);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleAlterationTask(task.label)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#0B4636] bg-[#0B4636]/5 text-[#0B4636] shadow-xs ring-1 ring-[#0B4636]/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{task.icon}</span>
                      <span className="font-extrabold">{t(task.key, task.label)}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isSelected
                          ? 'bg-[#0B4636] text-white border-[#0B4636]'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Add Custom Alteration Task */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customAlterationTask}
                onChange={(e) => setCustomAlterationTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAlterationTask()}
                placeholder="+ Type specific custom repair (e.g. Taper 1.5 inches at knee, replace hook)"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0B4636]"
              />
              <button
                type="button"
                onClick={handleAddCustomAlterationTask}
                className="bg-[#0B4636] text-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-[#073024] transition-all"
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Pre-existing Defect / Intake Condition Note */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>Pre-existing Defects / Customer Garment Condition Note:</span>
            </label>
            <input
              type="text"
              value={alterationDefectNotes}
              onChange={(e) => setAlterationDefectNotes(e.target.value)}
              placeholder="e.g. Small stain on inner lining, missing right cuff button, fabric frayed near collar..."
              className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Voice Note & Defect Photo Instructions (Image-4) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-4 h-4" />
              <span>Voice Note & Defect Photo Instructions</span>
            </label>

            {/* Voice Recording Box */}
            <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                  className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-sm shrink-0 ${
                    isRecordingVoice
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-[#0B4636] text-white hover:bg-[#073024]'
                  }`}
                >
                  {isRecordingVoice ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <div>
                  <div className="text-xs font-black text-slate-900">
                    {isRecordingVoice
                      ? `Recording Voice Note... (${recordingTimer}s)`
                      : voiceNoteUrl
                      ? 'Voice Note Attached'
                      : 'Record Tailor Voice Instruction'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {isRecordingVoice
                      ? 'Tap square button to stop recording'
                      : 'Tap mic button to start recording voice note for master tailor.'}
                  </div>
                </div>
              </div>

              {/* Play / Delete audio if recorded */}
              {voiceNoteUrl && !isRecordingVoice && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (audioPlaybackRef.current) {
                        if (isPlayingVoice) {
                          audioPlaybackRef.current.pause();
                          setIsPlayingVoice(false);
                        } else {
                          audioPlaybackRef.current.play();
                          setIsPlayingVoice(true);
                        }
                      }
                    }}
                    className="bg-[#0B4636] text-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isPlayingVoice ? 'Pause' : 'Play'}</span>
                  </button>
                  <audio
                    ref={audioPlaybackRef}
                    src={voiceNoteUrl}
                    onEnded={() => setIsPlayingVoice(false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceNoteUrl(null);
                      setRecordingTimer(0);
                    }}
                    className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Photos (Upload Multiple) */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>Garment / Defect Photos (Upload Multiple)</span>
                <span className="text-slate-400">{alterationPhotos.length} Photo(s) Attached</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="w-18 h-18 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0B4636] bg-white flex flex-col items-center justify-center cursor-pointer transition-all">
                  <Camera className="w-5 h-5 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-600 mt-1">+ Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {alterationPhotos.map((photo, idx) => (
                  <div key={idx} className="relative w-18 h-18 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group">
                    <img src={photo} alt={`Defect ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAlterationPhotos(alterationPhotos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Due Date & Assign Tailor for Alteration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alteration Due Date
              </label>
              <input
                type="date"
                value={alterationDueDate}
                onChange={(e) => setAlterationDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Promised Time
              </label>
              <input
                type="time"
                value={alterationDueTime}
                onChange={(e) => setAlterationDueTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assign Karigar / Master Tailor
              </label>
              <select
                value={assignedTailor}
                onChange={(e) => setAssignedTailor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636] cursor-pointer"
              >
                <option value="Unassigned">Unassigned (General Queue)</option>
                {tailorsList.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({t.role || 'Tailor'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 4. PAYMENT SETTLEMENT & LIVE TAILOR UPI DETAILS ---------------- */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
        <h3 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
          <Banknote className="w-4 h-4" />
          <span>{t('sale.secSettlement', '4. Counter Payment Settlement')}</span>
        </h3>

        {/* Payment Mode Selector: Cash, UPI / QR, Card */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('sale.paymentMethod', 'Payment Method')}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { mode: 'Cash', label: 'Cash', icon: Banknote },
              { mode: 'UPI (Scan & Pay)', label: 'UPI / QR', icon: QrCode },
              { mode: 'Card', label: 'Card', icon: CreditCard },
            ].map((pm) => {
              const Icon = pm.icon;
              const isSelected = paymentMode === pm.mode;
              return (
                <button
                  key={pm.mode}
                  type="button"
                  onClick={() => setPaymentMode(pm.mode as PaymentMode)}
                  className={`p-3 rounded-xl border font-black text-xs flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#0B4636] bg-[#0B4636] text-amber-300 shadow-sm ring-2 ring-[#0B4636]/30'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* UPI Details & Dynamic QR Code fetched from tailor collection */}
        {paymentMode === 'UPI (Scan & Pay)' && (
          <div className="p-4 bg-purple-50/80 border-2 border-purple-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-800" />
                <span className="font-extrabold text-xs text-purple-950">
                  Instant UPI / QR Code Payment (₹{grandTotal.toLocaleString('en-IN')})
                </span>
              </div>
              <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                Scan & Pay
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs">
              {/* Dynamic QR Code based on Tailor UPI ID & Grand Total */}
              <div className="shrink-0 bg-white p-2 border-2 border-slate-800 rounded-xl shadow-xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                    upiQrPaymentUri
                  )}`}
                  alt="UPI QR Code"
                  className="w-28 h-28 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left w-full">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Boutique UPI ID
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingUpi(!isEditingUpi);
                        setCustomUpiInput(effectiveUpiId);
                      }}
                      className="text-[10px] text-purple-700 hover:text-purple-950 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isEditingUpi ? 'Cancel' : 'Change UPI'}</span>
                    </button>
                  </div>

                  {isEditingUpi ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={customUpiInput}
                        onChange={(e) => setCustomUpiInput(e.target.value)}
                        placeholder="e.g. 7608807790@upi"
                        className="flex-1 bg-slate-50 border border-purple-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                      <button
                        type="button"
                        onClick={handleSaveUpdatedUpiId}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                      <code className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {effectiveUpiId}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUpiId}
                        className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 font-medium">
                  Scan via Google Pay, PhonePe, Paytm, BHIM or any UPI app.
                </p>

                {/* Confirm UPI Payment Received Button */}
                <button
                  type="button"
                  onClick={handleConfirmUpiPayment}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${
                    upiConfirmed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {upiConfirmed
                      ? '✓ UPI Payment Received & Confirmed'
                      : t('sale.confirmUpi', '✓ Confirm UPI Payment Received')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full Settlement & Handover Option */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFullyPaid}
                onChange={(e) => setIsFullyPaid(e.target.checked)}
                className="w-4 h-4 text-[#0B4636] rounded focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-black text-emerald-900">
                {t('sale.fullySettled', '100% Fully Settled at Counter')} (₹{grandTotal.toLocaleString('en-IN')})
              </span>
            </label>
            <p className="text-[11px] text-emerald-700 font-medium pl-6">
              {t('sale.zeroBalance', 'Zero balance due. Receipt will indicate full payment received.')}
            </p>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={instantDelivery}
                onChange={(e) => setInstantDelivery(e.target.checked)}
                className="w-4 h-4 text-[#0B4636] rounded focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-black text-amber-900">
                {needsAlteration
                  ? 'Immediate Delivery (Alteration Done at Counter)'
                  : t('sale.instantHandover', 'Immediate Handover / Order Delivered Now')}
              </span>
            </label>
            <p className="text-[11px] text-amber-700 font-medium pl-6">
              {needsAlteration
                ? 'Uncheck if garment is kept in boutique queue for master tailor work.'
                : t('sale.instantHandoverSub', 'Marks status as Delivered immediately and bypasses cutting & stitching queues.')}
            </p>
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">{t('sale.invoiceNotes', 'Invoice Notes / Memo (Optional)')}</label>
          <input
            type="text"
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder={t('sale.invoiceNotesPlaceholder', 'e.g. Gift packaging requested, Sold with garment cover...')}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0B4636]"
          />
        </div>
      </div>

      {/* ---------------- 5. SINGLE PROMINENT ACTION BUTTON: GENERATE RECEIPT ---------------- */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleGenerateReceipt}
          disabled={isSaving}
          className="w-full h-13 bg-[#0B4636] hover:bg-[#073024] text-[#FBBF24] font-black text-base rounded-2xl shadow-xl shadow-[#0B4636]/20 flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-[0.99] border border-amber-300/30 disabled:opacity-75"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
              <span>{t('sale.saving', 'Generating Receipt...')}</span>
            </>
          ) : (
            <>
              <Receipt className="w-5 h-5 text-amber-300" />
              <span>{t('sale.saveBtn', 'Generate Receipt')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
