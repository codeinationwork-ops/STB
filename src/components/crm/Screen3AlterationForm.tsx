import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  User,
  Phone,
  Clock,
  Calendar,
  DollarSign,
  AlertTriangle,
  Camera,
  Mic,
  Play,
  Square,
  Trash2,
  CheckCircle2,
  Sparkles,
  Save,
  Loader2,
  ArrowLeft,
  X,
  Plus,
  Tag,
  Check,
  Printer,
  Upload,
  Search,
  UserPlus,
  UserCheck,
  ChevronDown,
  History,
} from 'lucide-react';
import { TailorOrder, PaymentMode, ShopProfile, TailorCustomer, StaffTailor } from '../../types';
import { clean10DigitPhone, formatDisplayPhone } from '../../lib/phoneUtils';
import { roomDb } from '../../lib/localRoomDb';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { PromisedDateTimeInput } from './PromisedDateTimeInput';
import { useLanguage } from '../../lib/LanguageContext';

interface Screen3AlterationFormProps {
  onSaveOrder: (order: TailorOrder) => void;
  onBack: () => void;
  shopProfile?: ShopProfile | null;
  existingCustomers?: TailorCustomer[];
  isDesktopView?: boolean;
}

const ALTERATION_GARMENT_OPTIONS = [
  'Jeans / Denim',
  'Formal Pant / Trouser',
  'Kurta / Kurti',
  'Saree Blouse',
  'Formal Shirt',
  'Lehenga / Ghagra',
  'Suit / Blazer',
  'Salwar / Churidar',
  'Evening Gown',
  'Sadri / Waistcoat',
  'Other Garment',
];

const ALTERATION_TASK_CATALOG = [
  { id: 'waist_fit', key: 'alter.taskWaist', label: 'Waist Tightening / Loosening', icon: '📏', defaultPrice: 150 },
  { id: 'length_hem', key: 'alter.taskLength', label: 'Length Shortening / Hemming', icon: '✂️', defaultPrice: 120 },
  { id: 'sleeve_fit', key: 'alter.taskSleeve', label: 'Sleeve Length / Slimming', icon: '👔', defaultPrice: 150 },
  { id: 'shoulder_fit', key: 'alter.taskShoulder', label: 'Shoulder & Armhole Fitting', icon: '🪡', defaultPrice: 200 },
  { id: 'side_seam', key: 'alter.taskSide', label: 'Side Seam Resizing (Body Fit)', icon: '👗', defaultPrice: 180 },
  { id: 'zip_replace', key: 'alter.taskZip', label: 'Zipper / Chain Replacement', icon: '🔄', defaultPrice: 150 },
  { id: 'button_hook', key: 'alter.taskButton', label: 'Buttons / Hooks / Eyelets Fix', icon: '🔘', defaultPrice: 80 },
  { id: 'neck_collar', key: 'alter.taskNeck', label: 'Neckline & Collar Adjustment', icon: '🧵', defaultPrice: 160 },
  { id: 'lining_patch', key: 'alter.taskDarning', label: 'Darning / Inner Lining / Tear Repair', icon: '🧷', defaultPrice: 250 },
];

export const Screen3AlterationForm: React.FC<Screen3AlterationFormProps> = ({
  onSaveOrder,
  onBack,
  shopProfile,
  existingCustomers = [],
  isDesktopView = false,
}) => {
  const { t } = useLanguage();

  // Customer State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isRepeatCustomer, setIsRepeatCustomer] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchStatus, setSearchStatus] = useState<{
    found: boolean;
    message: string;
    customerData?: any;
  } | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<TailorCustomer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Garment & Intake Details
  const [selectedGarment, setSelectedGarment] = useState('Jeans / Denim');
  const [garmentBrandColor, setGarmentBrandColor] = useState('');
  const [urgency, setUrgency] = useState<'Standard (2-3 Days)' | 'Same Day (24h)' | 'Urgent Express (1-2h)'>('Standard (2-3 Days)');

  // Alteration Tasks Checklist
  const [selectedTasks, setSelectedTasks] = useState<string[]>([
    'Waist Tightening / Loosening',
    'Length Shortening / Hemming',
  ]);
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [defectNotes, setDefectNotes] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  // Financials
  const [alterationRate, setAlterationRate] = useState<number>(270);
  const [advancePaid, setAdvancePaid] = useState<number>(270);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');

  // Timeline & Karigar
  const [dueDate, setDueDate] = useState<string>(() => {
    return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  });
  const [dueTime, setDueTime] = useState<string>('18:00');
  const [assignedTailor, setAssignedTailor] = useState<string>('Unassigned');
  const [staffList, setStaffList] = useState<StaffTailor[]>([]);

  // Photos & Voice
  const [defectPhotos, setDefectPhotos] = useState<string[]>([]);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Validation & Saving
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const staff = roomDb.getTailors();
      setStaffList(staff);
    } catch (e) {
      console.warn('Error loading staff tailors:', e);
    }
  }, []);

  // Customer Search Function (Checks local cache, prop, and direct Firestore customer collection)
  const handleSearchCustomer = async (phoneToSearch?: string) => {
    const rawPhone = phoneToSearch !== undefined ? phoneToSearch : customerPhone;
    const cleanDigits = clean10DigitPhone(rawPhone);

    if (cleanDigits.length < 4) {
      setSearchStatus({
        found: false,
        message: 'Please enter at least 4 digits to search customer',
      });
      return;
    }

    setIsSearchingCustomer(true);
    setSearchStatus(null);

    try {
      let foundData: any = null;

      // 1. Check in-memory database customers
      const localCustomers = roomDb.getCustomers();
      const localMatch = localCustomers.find((c) => {
        const cClean = clean10DigitPhone(c.phone || '');
        return (
          cClean === cleanDigits ||
          cClean.slice(-10) === cleanDigits.slice(-10) ||
          cClean.includes(cleanDigits) ||
          cleanDigits.includes(cClean)
        );
      });

      if (localMatch) {
        foundData = localMatch;
      }

      // 2. Check existingCustomers prop
      if (!foundData && existingCustomers && existingCustomers.length > 0) {
        const propMatch = existingCustomers.find((c) => {
          const cClean = clean10DigitPhone(c.phone || '');
          return (
            cClean === cleanDigits ||
            cClean.slice(-10) === cleanDigits.slice(-10) ||
            cClean.includes(cleanDigits) ||
            cleanDigits.includes(cClean)
          );
        });
        if (propMatch) {
          foundData = propMatch;
        }
      }

      // 3. Direct Firestore customers collection lookup
      if (!foundData) {
        try {
          const custDocRef = doc(db, 'customers', `cust_${cleanDigits}`);
          const snap = await getDoc(custDocRef);
          if (snap.exists()) {
            foundData = { id: snap.id, ...snap.data() };
          } else {
            // Also try plain phone number doc ID
            const snap2 = await getDoc(doc(db, 'customers', cleanDigits));
            if (snap2.exists()) {
              foundData = { id: snap2.id, ...snap2.data() };
            }
          }
        } catch (fbErr) {
          console.warn('Firestore customer search notice:', fbErr);
        }
      }

      // 4. Check past orders for customer details
      if (!foundData) {
        const localOrders = roomDb.getOrders();
        const orderMatch = localOrders.find((o) => {
          const oClean = clean10DigitPhone(o.customerPhone || '');
          return oClean === cleanDigits || oClean.slice(-10) === cleanDigits.slice(-10);
        });
        if (orderMatch) {
          foundData = {
            id: orderMatch.customerId || `cust_${cleanDigits}`,
            name: orderMatch.customerName,
            phone: orderMatch.customerPhone,
            isRepeat: true,
          };
        }
      }

      if (foundData) {
        setCustomerName(foundData.name || '');
        if (foundData.phone) {
          setCustomerPhone(clean10DigitPhone(foundData.phone));
        }
        setIsRepeatCustomer(true);
        setSearchStatus({
          found: true,
          message: `VIP Customer Found: ${foundData.name} (${foundData.ordersCount || 1} previous orders)`,
          customerData: foundData,
        });
        setShowSuggestions(false);
      } else {
        setIsRepeatCustomer(false);
        setSearchStatus({
          found: false,
          message: `New Customer (+91 ${cleanDigits}) — A new client record will be auto-saved upon ticket creation.`,
        });
      }
    } catch (err) {
      console.warn('Search customer notice:', err);
      setSearchStatus({
        found: false,
        message: 'Could not fetch cloud data. You can proceed with typing customer name manually.',
      });
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handlePhoneInputChange = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(cleanDigits);

    if (cleanDigits.length >= 3) {
      const allCust = [...roomDb.getCustomers(), ...(existingCustomers || [])];
      const matches = allCust.filter((c) => {
        const cp = clean10DigitPhone(c.phone || '');
        const cn = (c.name || '').toLowerCase();
        return cp.includes(cleanDigits) || cn.includes(cleanDigits.toLowerCase());
      });
      // Deduplicate
      const unique = Array.from(new Map(matches.map((item) => [clean10DigitPhone(item.phone || item.id), item])).values());
      setCustomerSuggestions(unique.slice(0, 5));
      setShowSuggestions(unique.length > 0);
    } else {
      setShowSuggestions(false);
      setCustomerSuggestions([]);
    }

    if (cleanDigits.length === 10) {
      handleSearchCustomer(cleanDigits);
    } else {
      setSearchStatus(null);
    }
  };

  const handleSelectSuggestedCustomer = (c: TailorCustomer) => {
    const cleanP = clean10DigitPhone(c.phone || '');
    setCustomerPhone(cleanP);
    setCustomerName(c.name || '');
    setIsRepeatCustomer(true);
    setShowSuggestions(false);
    setSearchStatus({
      found: true,
      message: `Selected Customer: ${c.name} (${c.ordersCount || 1} past orders)`,
      customerData: c,
    });
  };

  // Update due date based on urgency selection
  const handleSelectUrgency = (level: typeof urgency) => {
    setUrgency(level);
    const now = new Date();
    if (level === 'Urgent Express (1-2h)') {
      setDueDate(now.toISOString().split('T')[0]);
      const futureHours = (now.getHours() + 2) % 24;
      setDueTime(`${String(futureHours).padStart(2, '0')}:00`);
    } else if (level === 'Same Day (24h)') {
      setDueDate(now.toISOString().split('T')[0]);
      setDueTime('20:00');
    } else {
      const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      setDueDate(future.toISOString().split('T')[0]);
      setDueTime('18:00');
    }
  };

  const toggleTask = (taskLabel: string, defaultPrice: number) => {
    if (selectedTasks.includes(taskLabel)) {
      const filtered = selectedTasks.filter((t) => t !== taskLabel);
      setSelectedTasks(filtered);
      setAlterationRate(Math.max(50, alterationRate - defaultPrice));
      setAdvancePaid(Math.max(50, alterationRate - defaultPrice));
    } else {
      setSelectedTasks([...selectedTasks, taskLabel]);
      setAlterationRate(alterationRate + defaultPrice);
      setAdvancePaid(alterationRate + defaultPrice);
    }
  };

  const handleAddCustomTask = () => {
    if (!customTaskInput.trim()) return;
    if (!selectedTasks.includes(customTaskInput.trim())) {
      setSelectedTasks([...selectedTasks, customTaskInput.trim()]);
      setAlterationRate(alterationRate + 150);
      setAdvancePaid(alterationRate + 150);
    }
    setCustomTaskInput('');
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setCustomerPhone(clean);

    if (clean.length === 10) {
      const found = existingCustomers.find((c) => c.phone && c.phone.includes(clean));
      if (found) {
        setCustomerName(found.name);
        setIsRepeatCustomer(true);
      }
    }
  };

  // Voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setVoiceNoteUrl(reader.result as string);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecordingVoice(true);
      setRecordingTimer(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const toggleVoicePlayback = () => {
    if (!voiceNoteUrl) return;
    if (!audioPlaybackRef.current) {
      audioPlaybackRef.current = new Audio(voiceNoteUrl);
      audioPlaybackRef.current.onended = () => setIsPlayingVoice(false);
    }

    if (isPlayingVoice) {
      audioPlaybackRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      audioPlaybackRef.current.play().then(() => setIsPlayingVoice(true)).catch(console.error);
    }
  };

  const deleteVoiceNote = () => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current = null;
    }
    setVoiceNoteUrl(null);
    setIsPlayingVoice(false);
    setRecordingTimer(0);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setDefectPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const buildAlterationOrder = (): TailorOrder | null => {
    const cleanPhone = clean10DigitPhone(customerPhone);

    if (!customerName.trim()) {
      setValidationError('Please provide the customer name.');
      return null;
    }
    if (cleanPhone.length !== 10) {
      setValidationError('Please enter a valid 10-digit mobile number.');
      return null;
    }
    if (selectedTasks.length === 0) {
      setValidationError('Please select at least one alteration task required on the garment.');
      return null;
    }

    const random4 = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ALT-${new Date().getFullYear()}-${random4}`;
    const custId = `cust_${cleanPhone}`;

    const totalAmt = Number(alterationRate) || 100;
    const advAmt = Number(advancePaid) || 0;
    const balDue = Math.max(0, totalAmt - advAmt);

    const tasksText = selectedTasks.join(', ');

    return {
      id: orderId,
      customerId: custId,
      customerName: customerName.trim(),
      customerPhone: `+91 ${cleanPhone}`,
      isRepeatCustomer: Boolean(isRepeatCustomer),
      garmentType: selectedGarment,
      orderCategory: 'Alteration',
      subTypeStyle: garmentBrandColor.trim() ? `${selectedGarment} (${garmentBrandColor.trim()})` : selectedGarment,
      genderCategory: 'Unisex',
      measurementMode: 'manual',
      measurements: {
        alterationWork: tasksText,
        urgencyLevel: urgency,
      },
      receiptImageUrl: null,
      referenceGarmentUrl: defectPhotos[0] || null,
      specialNotes: `Alteration Work: ${tasksText}${defectNotes.trim() ? ` | Defect/Condition: ${defectNotes.trim()}` : ''}${specialNotes.trim() ? ` | Notes: ${specialNotes.trim()}` : ''}`,
      voiceNoteUrl: voiceNoteUrl || null,
      voiceNoteDurationSec: recordingTimer,
      fabricPhotos: defectPhotos,
      totalAmount: totalAmt,
      advancePaid: advAmt,
      balanceDue: balDue,
      paymentMode: paymentMode,
      paymentHistory: [
        {
          id: `pay-${Date.now()}`,
          date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          amount: advAmt,
          type: advAmt >= totalAmt ? 'Full Payment' : 'Advance',
          mode: paymentMode,
          note: 'Advance on alteration booking',
        },
      ],
      status: 'In Alteration / Fitting',
      createdDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdBy: 'Alteration Desk',
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      dueTime: dueTime || '18:00',
      assignedTailor: assignedTailor || 'Unassigned',
      estimatedHours: urgency.includes('Express') ? 1 : 2,
      offerMessage: `Hello ${customerName.trim()}, your alteration for ${selectedGarment} is logged. Promised trial/pickup: ${dueDate} at ${dueTime}.`,
      isOverdue: false,
      daysOverdue: 0,
      isArchived: false,
      updatedAt: new Date().toISOString(),

      // Specific category fields
      alterationTasks: selectedTasks,
      alterationUrgency: urgency,
      defectNotes: defectNotes.trim(),
      alterationGarmentProvided: garmentBrandColor.trim() || selectedGarment,
    };
  };

  const handleSaveAlterationOrder = async (printAfter: boolean = false) => {
    setValidationError(null);
    const order = buildAlterationOrder();
    if (!order) return;

    setIsSaving(true);
    try {
      onSaveOrder(order);
      if (printAfter) {
        setTimeout(() => {
          window.print();
        }, 400);
      }
    } catch (err) {
      console.error('Error saving alteration:', err);
      setValidationError('Failed to record alteration ticket. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#d0d4e4]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#323338] flex items-center gap-2">
              <span>{t('alter.title', 'Alteration, Fitting & Repair Ticket')}</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                Express Fitting Desk
              </span>
            </h2>
            <p className="text-xs text-[#676879] font-normal">
              {t('alter.subtitle', 'Garment intake, work checklist, defect notes & trial scheduling')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSaveAlterationOrder(true)}
            disabled={isSaving}
            className="bg-white hover:bg-[#f8f9fb] text-[#323338] border border-[#d0d4e4] px-3.5 py-2 rounded-lg font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
          >
            <Printer className="w-4 h-4 text-[#676879]" />
            <span>{t('alter.printBillBtn', 'Print Bill')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAlterationOrder(false)}
            disabled={isSaving}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
            <span>{isSaving ? t('alter.saving', 'Saving Alteration...') : t('alter.saveBtn', 'Save Alteration Ticket')}</span>
          </button>
        </div>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="bg-[#fde8eb] border border-[#fbd0d5] text-[#e2445c] p-3 rounded-lg flex items-center justify-between text-xs font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{validationError}</span>
          </div>
          <button onClick={() => setValidationError(null)} className="text-[#e2445c] hover:opacity-80 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Customer Info & Direct Lookup */}
      <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-emerald-800 shadow-2xs space-y-3 relative">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-800" />
            <span>{t('alter.secCustomer', '1. Customer Details & Directory Search')}</span>
          </h3>
          <span className="text-[10px] font-bold text-[#676879] bg-[#f8f9fb] border border-[#d0d4e4] px-2 py-0.5 rounded">
            {t('order.realtimeSync', 'Real-Time Customer Lookup')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Phone Number Input with Real Search Button */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#323338]">
                {t('order.customerPhone', 'Customer Mobile Number *')}
              </label>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  customerPhone.length === 10
                    ? 'bg-[#dff0d8] text-[#00854d]'
                    : 'bg-[#f0f2f7] text-[#676879]'
                }`}
              >
                {customerPhone.length}/10 Digits
              </span>
            </div>
            <div
              className={`flex items-center gap-1 bg-[#f8f9fb] border rounded-lg p-1 focus-within:bg-white transition-all ${
                customerPhone.length === 10
                  ? 'border-[#00c875] focus-within:border-[#00854d]'
                  : 'border-[#d0d4e4] focus-within:border-emerald-700'
              }`}
            >
              <span className="text-xs font-bold text-[#676879] px-2 border-r border-[#d0d4e4] select-none">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                maxLength={10}
                required
                value={customerPhone}
                onChange={(e) => handlePhoneInputChange(e.target.value)}
                placeholder={t('order.phonePlaceholder', '9876543210 (10 digits)')}
                className="w-full bg-transparent px-2 py-1.5 text-xs font-bold text-[#323338] outline-none"
              />
              <button
                type="button"
                onClick={() => handleSearchCustomer()}
                disabled={isSearchingCustomer}
                className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
              >
                {isSearchingCustomer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>
            </div>
            <p className="text-[10px] text-[#676879] mt-1 font-normal">
              {t('order.phoneHelp', 'Enter 10 digits or search customer name to auto-fetch details.')}
            </p>

            {/* Auto-suggest dropdown when typing digits/name */}
            {showSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#d0d4e4] rounded-lg shadow-xl overflow-hidden divide-y divide-[#e6e9ef]">
                <div className="p-2 bg-[#f8f9fb] text-[10px] font-bold text-[#676879] uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Directory Clients</span>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="text-[#676879] hover:text-[#323338] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {customerSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestedCustomer(item)}
                    className="w-full text-left p-2.5 hover:bg-[#f8f9fb] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#323338]">{item.name}</div>
                      <div className="text-[11px] text-[#676879] font-medium">{item.phone}</div>
                    </div>
                    <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      Select
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-[#323338] mb-1">
              {t('order.customerName', 'Customer Name *')}
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t('order.namePlaceholder', 'e.g. Rahul Sharma')}
              className="w-full bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-emerald-700 focus:bg-white transition-all"
            />
            {isRepeatCustomer && (
              <p className="text-[10px] text-[#00854d] font-bold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#00c875]" />
                <span>Verified Client Profile</span>
              </p>
            )}
          </div>
        </div>

        {/* Search Status Banner */}
        {searchStatus && (
          <div
            className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
              searchStatus.found
                ? 'bg-[#dff0d8] border-[#c2e4b4] text-[#00854d]'
                : 'bg-[#fff5e5] border-[#fed699] text-[#bb781e]'
            }`}
          >
            <div className="flex items-center gap-2">
              {searchStatus.found ? (
                <CheckCircle2 className="w-4 h-4 text-[#00c875] shrink-0" />
              ) : (
                <UserPlus className="w-4 h-4 text-[#fdab3d] shrink-0" />
              )}
              <span>{searchStatus.message}</span>
            </div>
            {searchStatus.found && (
              <span className="text-[10px] font-bold uppercase bg-[#00c875] text-white px-2 py-0.5 rounded shrink-0">
                VIP Client
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Alteration Urgency & Garment Details */}
      <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-[#579bfc] shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-[#579bfc]" />
          <span>{t('alter.secGarmentUrgency', '2. Garment Intake & Urgency Level')}</span>
        </h3>

        {/* Urgency Badge Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#323338] mb-1.5">{t('alter.urgencyTimeline', 'Select Urgency Timeline:')}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { level: 'Standard (2-3 Days)', labelKey: 'alter.standardDays', icon: '📅', descKey: 'alter.standardDesc', defaultDesc: 'Regular fitting' },
              { level: 'Same Day (24h)', labelKey: 'alter.sameDay', icon: '⏱️', descKey: 'alter.sameDayDesc', defaultDesc: 'Evening pickup' },
              { level: 'Urgent Express (1-2h)', labelKey: 'alter.urgentExpress', icon: '⚡', descKey: 'alter.urgentDesc', defaultDesc: 'Express rush' },
            ].map((u) => (
              <button
                key={u.level}
                type="button"
                onClick={() => handleSelectUrgency(u.level as any)}
                className={`p-2.5 rounded-lg border text-center font-bold text-xs cursor-pointer transition-all ${
                  urgency === u.level
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-800 shadow-2xs'
                    : 'border-[#d0d4e4] bg-[#f8f9fb] text-[#676879] hover:border-[#a0a4b8]'
                }`}
              >
                <div className="text-base mb-0.5">{u.icon}</div>
                <div className="font-bold text-[11px]">{t(u.labelKey, u.level)}</div>
                <div className="text-[10px] text-[#676879] font-normal">{t(u.descKey, u.defaultDesc)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Garment Type */}
          <div>
            <label className="block text-xs font-semibold text-[#323338] mb-1">{t('alter.garmentType', 'Customer Garment Type')}</label>
            <select
              value={selectedGarment}
              onChange={(e) => setSelectedGarment(e.target.value)}
              className="w-full bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              {ALTERATION_GARMENT_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Garment Brand / Color / Spec */}
          <div>
            <label className="block text-xs font-semibold text-[#323338] mb-1">{t('alter.brandColor', 'Brand, Color & Distinguishing Marks')}</label>
            <input
              type="text"
              value={garmentBrandColor}
              onChange={(e) => setGarmentBrandColor(e.target.value)}
              placeholder={t('alter.brandColorPlaceholder', "e.g. Levi's 511 Blue Denim 32W, Zara Navy Blazer...")}
              className="w-full bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-medium text-[#323338] focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>
      </div>

      {/* 3. Interactive Alteration Tasks Checklist */}
      <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-[#a25ddc] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-1.5">
            <Scissors className="w-4 h-4 text-[#a25ddc]" />
            <span>{t('alter.checklistTitle', '3. Alteration Work Checklist')} ({selectedTasks.length} {t('alter.selected', 'Selected')})</span>
          </h3>
          <span className="text-[11px] font-bold text-emerald-800">{t('alter.tapSelectTasks', 'Tap to Select Tasks')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALTERATION_TASK_CATALOG.map((task) => {
            const isSelected = selectedTasks.includes(task.label);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => toggleTask(task.label, task.defaultPrice)}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between text-xs font-bold cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-800 shadow-2xs'
                    : 'border-[#d0d4e4] bg-[#f8f9fb] text-[#323338] hover:border-[#a0a4b8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{task.icon}</span>
                  <span className="font-bold">{t(task.key, task.label)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border ${
                      isSelected ? 'bg-emerald-800 text-white border-emerald-800' : 'border-[#d0d4e4] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Add Custom Alteration Task */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customTaskInput}
            onChange={(e) => setCustomTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTask()}
            placeholder={t('alter.customTaskPlaceholder', '+ Type specific custom repair (e.g. Taper 1.5 inches at knee, replace hook)')}
            className="flex-1 bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-medium text-[#323338] focus:outline-none focus:border-emerald-700"
          />
          <button
            type="button"
            onClick={handleAddCustomTask}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all"
          >
            {t('alter.addTaskBtn', 'Add Task')}
          </button>
        </div>

        {/* Existing Defect / Intake Condition Note */}
        <div className="p-3 bg-[#fff5e5] border border-[#fed699] rounded-lg space-y-1.5">
          <label className="block text-xs font-bold text-[#bb781e] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#bb781e]" />
            <span>{t('alter.defectNoteTitle', 'Pre-existing Defects / Customer Garment Condition Note:')}</span>
          </label>
          <input
            type="text"
            value={defectNotes}
            onChange={(e) => setDefectNotes(e.target.value)}
            placeholder={t('alter.defectNotePlaceholder', 'e.g. Existing fabric stain on pocket, right knee slightly scuffed before taking...')}
            className="w-full bg-white border border-[#fed699] rounded-lg px-3 py-1.5 text-xs font-medium text-[#323338] focus:outline-none focus:border-[#bb781e]"
          />
        </div>
      </div>

      {/* Voice Note & Defect Photos Section */}
      <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-[#fdab3d] shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-[#fdab3d]" />
          <span>{t('alter.voiceInstructions', 'Voice Note & Defect Photo Instructions')}</span>
        </h3>

        {/* Voice Recorder */}
        <div className="p-3 rounded-lg bg-[#f8f9fb] border border-[#d0d4e4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-white cursor-pointer transition-all shadow-2xs ${
                isRecordingVoice
                  ? 'bg-[#e2445c] animate-pulse ring-2 ring-[#fbd0d5]'
                  : voiceNoteUrl
                  ? 'bg-[#00c875]'
                  : 'bg-emerald-800 hover:bg-emerald-900'
              }`}
            >
              {isRecordingVoice ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#323338]">
                {isRecordingVoice
                  ? `${t('order.recordingLive', 'Recording Live Voice Note')} (${recordingTimer}s)`
                  : voiceNoteUrl
                  ? `${t('order.voiceAttached', 'Voice Note Attached ✓')} (${recordingTimer}s)`
                  : t('order.recordVoiceTitle', 'Record Tailor Voice Instruction')}
              </h4>
              <p className="text-[10px] text-[#676879]">
                {isRecordingVoice
                  ? t('order.voiceHelpRecording', 'Speak clearly. Tap square when done.')
                  : voiceNoteUrl
                  ? t('order.voiceHelpAttached', 'Audio instruction saved.')
                  : t('order.voiceHelpRecord', 'Record defect description or specific fitting instructions.')}
              </p>
            </div>
          </div>

          {voiceNoteUrl && !isRecordingVoice && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={toggleVoicePlayback}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {isPlayingVoice ? (
                  <>
                    <Square className="w-3 h-3 fill-white" />
                    <span>{t('order.pauseVoice', 'Pause')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-white" />
                    <span>{t('order.listenVoice', 'Listen')}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={deleteVoiceNote}
                className="p-1.5 bg-[#fde8eb] text-[#e2445c] hover:bg-[#fbd0d5] rounded-lg transition-all cursor-pointer"
                title="Delete voice note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Defect / Reference Photo Upload */}
        <div>
          <label className="block text-xs font-semibold text-[#323338] mb-2 flex items-center justify-between">
            <span>{t('order.fabricPhotosTitle', 'Garment Defect & Fit Photos')}</span>
            <span className="text-[10px] text-[#676879] font-normal">
              {defectPhotos.length} {t('order.clothsAttached', 'Photos Attached')}
            </span>
          </label>

          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {defectPhotos.map((img, idx) => (
              img && img.trim() !== '' ? (
                <div key={idx} className="w-16 h-16 rounded-lg border border-[#d0d4e4] overflow-hidden relative shrink-0 shadow-2xs bg-slate-900">
                  <img src={img} alt={`Defect ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setDefectPhotos(defectPhotos.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-[#e2445c] text-white p-1 rounded-full shadow hover:opacity-90 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : null
            ))}

            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[#d0d4e4] hover:border-emerald-700 bg-[#f8f9fb] flex flex-col items-center justify-center cursor-pointer shrink-0 text-[#676879] transition-all">
              <Camera className="w-4 h-4 text-emerald-800" />
              <span className="text-[10px] font-bold mt-0.5">+ Photo</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* 4. Financials & Delivery Schedule */}
      <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-[#00c875] shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-[#00c875]" />
          <span>{t('alter.secChargesSchedule', '4. Alteration Charges & Delivery Schedule')}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#323338] mb-1">{t('alter.totalCharge', 'Total Alteration Charge (₹) *')}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[#676879] font-bold text-xs">₹</span>
              <input
                type="number"
                min={0}
                value={alterationRate || ''}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setAlterationRate(val);
                  setAdvancePaid(val);
                }}
                className="w-full bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg pl-7 pr-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#323338] mb-1">{t('alter.advanceReceived', 'Advance Received (₹)')}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[#676879] font-bold text-xs">₹</span>
              <input
                type="number"
                min={0}
                value={advancePaid || ''}
                onChange={(e) => setAdvancePaid(Number(e.target.value) || 0)}
                className="w-full bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg pl-7 pr-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#323338] mb-1">{t('alter.paymentMode', 'Payment Mode')}</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              <option value="Cash">{t('order.cashOption', 'Cash')}</option>
              <option value="UPI (Scan & Pay)">{t('order.upiOption', 'UPI / QR (Scan & Pay)')}</option>
              <option value="Other (Card/Wallet)">{t('order.otherOption', 'Card / Wallet')}</option>
            </select>
          </div>
        </div>

        {/* Delivery Schedule */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-[#323338] mb-1">{t('alter.promisedPickup', 'Promised Trial / Pickup Date & Time')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-emerald-700"
            />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons: Save & Print Bill + Save Ticket */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleSaveAlterationOrder(true)}
          disabled={isSaving}
          className="h-11 bg-white hover:bg-[#f8f9fb] text-[#323338] border border-[#d0d4e4] font-bold text-xs rounded-lg shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-75"
        >
          <Printer className="w-4 h-4 text-[#676879]" />
          <span>{t('alter.saveAndPrint', 'Save & Print Bill')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSaveAlterationOrder(false)}
          disabled={isSaving}
          className="h-11 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-75"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>{t('alter.saving', 'Saving Alteration...')}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-white" />
              <span>{t('alter.saveBtn', 'Save Alteration Ticket')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
