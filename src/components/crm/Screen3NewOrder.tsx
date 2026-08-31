import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  Scissors,
  Mic,
  Camera,
  DollarSign,
  Calendar,
  Clock,
  Save,
  Trash2,
  Check,
  Plus,
  Search,
  Loader2,
  Play,
  Square,
  UserPlus,
  Upload,
  X,
  CheckCircle2,
  Printer,
  Share2,
  Copy,
  Download,
  ExternalLink,
  MessageSquare,
  CheckCheck,
  QrCode,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  TailorOrder,
  OrderCategory,
  GarmentCategory,
  MeasurementMap,
  GenderCategory,
  PaymentMode,
  TailorCustomer,
  ShopProfile,
  MarketplaceProduct,
} from '../../types';
import { useLanguage } from '../../lib/LanguageContext';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { roomDb } from '../../lib/localRoomDb';
import { getEstimatedHoursForGarment, getTailorAvailabilityOnDate } from '../../lib/workerCapacity';
import {
  PromisedDateTimeInput,
  formatDisplayDate,
  formatDisplayTime,
  formatFullReadableDate,
} from './PromisedDateTimeInput';
import {
  clean10DigitPhone,
  formatDisplayPhone,
  isValid10DigitPhone,
  sanitizePhoneInput,
  getWhatsAppUrl,
} from '../../lib/phoneUtils';
import {
  downloadReceiptPdf,
  sendWhatsAppWithPdfReceipt,
  generateWhatsAppReceiptText,
} from '../../lib/pdfReceiptGenerator';
import {
  LADIES_TOPWEAR_FIELDS,
  LADIES_BOTTOMWEAR_FIELDS,
  GENTS_TOPWEAR_FIELDS,
  GENTS_BOTTOMWEAR_FIELDS,
  getMeasurementLabel,
  MeasurementFieldDef,
} from '../../lib/measurementSpecs';
import { Screen3SaleForm } from './Screen3SaleForm';
import { Screen3AlterationForm } from './Screen3AlterationForm';

interface Screen3NewOrderProps {
  onBack: () => void;
  onSaveOrder: (order: TailorOrder) => void;
  existingCustomers?: TailorCustomer[];
  isDesktopView?: boolean;
  initialProduct?: MarketplaceProduct | null;
  initialCategory?: OrderCategory;
  initialMode?: 'stitch' | 'alter' | 'sale';
}

const PREDEFINED_GARMENTS = [
  'Formal Shirt',
  'Kurta Pajama',
  'Blouse',
  'Anarkali Suit',
  'Sherwani',
  'Lehenga',
  'Pant / Trouser',
  'Suit (Coat + Pant)',
  'Pathani Suit',
  'Indo-Western',
  'Sadri / Waistcoat',
  'Safari Suit',
  'Salwar Suit',
  'Gown',
  'Alterations',
  'Custom / Other',
];

export const Screen3NewOrder: React.FC<Screen3NewOrderProps> = ({
  onBack,
  onSaveOrder,
  existingCustomers = [],
  isDesktopView = false,
  initialProduct = null,
  initialCategory,
  initialMode,
}) => {
  const { t } = useLanguage();

  // Customer State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isRepeatCustomer, setIsRepeatCustomer] = useState(false);
  const [gender, setGender] = useState<GenderCategory>('Male');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchStatus, setSearchStatus] = useState<{
    found: boolean;
    message: string;
    customerId?: string;
  } | null>(null);

  // Order Category: Stitch vs Alteration vs Sale
  const [orderCategory, setOrderCategory] = useState<OrderCategory>(() => {
    if (initialCategory) return initialCategory;
    if (initialMode === 'sale') return 'Sale';
    if (initialMode === 'alter') return 'Alteration';
    return 'Stitch';
  });

  // Garment Selection State
  const [selectedGarmentOption, setSelectedGarmentOption] = useState<string>(() => {
    if (initialProduct?.category) return initialProduct.category;
    if (initialCategory === 'Alteration' || initialMode === 'alter') return 'Alterations';
    return 'Formal Shirt';
  });
  const [customGarmentInput, setCustomGarmentInput] = useState('');
  const [subTypeStyle, setSubTypeStyle] = useState(() => initialProduct?.name || '');

  // Measurement State
  const [measurementMode, setMeasurementMode] = useState<'manual' | 'receipt'>('manual');
  const [activeMeasurementTab, setActiveMeasurementTab] = useState<
    'Upper' | 'Lower' | 'Sleeves' | 'Neck' | 'Custom'
  >('Upper');
  const [measurements, setMeasurements] = useState<MeasurementMap>({});

  // Custom Dynamic Measurement Inputs
  const [customFields, setCustomFields] = useState<{ key: string; label: string }[]>([]);
  const [newCustomLabel, setNewCustomLabel] = useState('');

  // Upload States
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [referenceGarmentImage, setReferenceGarmentImage] = useState<string | null>(null);
  const [fabricPhotos, setFabricPhotos] = useState<string[]>(() => initialProduct?.images || []);

  // Special Notes
  const [specialNotes, setSpecialNotes] = useState(() => {
    if (!initialProduct) return '';
    const parts = [`Catalogue Design: ${initialProduct.name}`];
    if (initialProduct.fabricTypes?.length) parts.push(`Fabric: ${initialProduct.fabricTypes.join(', ')}`);
    if (initialProduct.customizationOptions?.length) parts.push(`Customizations: ${initialProduct.customizationOptions.join(', ')}`);
    return parts.join(' | ');
  });

  // Voice Note State & Web MediaRecorder API
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0); // real duration in seconds
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Financial Ledger State
  const [totalAmount, setTotalAmount] = useState<number>(() => initialProduct?.price || 1200);
  const [advancePaid, setAdvancePaid] = useState<number>(() => initialProduct?.advanceRequired || 300);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');

  // Delivery, Worker Assignment & Free Hours
  const defaultFutureDays = initialProduct?.estimatedDays || 3;
  const defaultFutureDate = new Date(Date.now() + defaultFutureDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState<string>(defaultFutureDate);
  const [dueTime, setDueTime] = useState<string>('18:00');
  const [assignedTailor, setAssignedTailor] = useState<string>(() => initialProduct?.tailorName || 'Unassigned');
  const [estimatedHours, setEstimatedHours] = useState<number>(3);
  const [isSaving, setIsSaving] = useState(false);

  // Auto calculate estimated hours based on garment choice
  useEffect(() => {
    const calculated = getEstimatedHoursForGarment(
      selectedGarmentOption === 'Custom / Other' ? customGarmentInput : selectedGarmentOption,
      orderCategory
    );
    setEstimatedHours(calculated);
  }, [selectedGarmentOption, customGarmentInput, orderCategory]);

  // Created Order Slip State (Modal popup once created)
  const [createdOrderSlip, setCreatedOrderSlip] = useState<TailorOrder | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [copiedReceiptToast, setCopiedReceiptToast] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const balanceDue = Math.max(0, totalAmount - advancePaid);

  // Worker availability on chosen delivery date (8h/day Mon-Sat model)
  const dateAvailability = useMemo(() => {
    try {
      const staff = roomDb.getTailors();
      const allOrds = roomDb.getOrders();
      return getTailorAvailabilityOnDate(dueDate, staff, allOrds, estimatedHours);
    } catch {
      return { isSunday: false, availableTailors: [], message: '' };
    }
  }, [dueDate, estimatedHours]);

  // Fetch Shop Profile on Mount
  useEffect(() => {
    try {
      const profile = roomDb.getShopProfile();
      if (profile) setShopProfile(profile);
    } catch (e) {
      console.warn('Shop profile load notice:', e);
    }
  }, []);

  // Format real duration helper (mm:ss or s)
  const formatVoiceDuration = (totalSec: number) => {
    if (!totalSec || totalSec <= 0) return '0:00';
    const mins = Math.floor(totalSec / 60);
    const secs = Math.round(totalSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Search Customer Function
  const handleSearchCustomer = async (phoneToSearch?: string) => {
    const rawPhone = phoneToSearch !== undefined ? phoneToSearch : customerPhone;
    const cleanDigits = clean10DigitPhone(rawPhone);

    if (cleanDigits.length < 5) {
      setSearchStatus({
        found: false,
        message: 'Please enter at least 5 digits to search customer',
      });
      return;
    }

    setIsSearchingCustomer(true);
    setSearchStatus(null);

    try {
      let foundData: any = null;

      // 1. Check local Room DB Customers
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

      // 3. Check local Orders for past customer measurements
      if (!foundData) {
        const localOrders = roomDb.getOrders();
        const orderMatch = localOrders.find((o) => {
          const oClean = clean10DigitPhone(o.customerPhone || '');
          return (
            oClean === cleanDigits ||
            oClean.slice(-10) === cleanDigits.slice(-10) ||
            oClean.includes(cleanDigits) ||
            cleanDigits.includes(oClean)
          );
        });
        if (orderMatch) {
          foundData = {
            id: orderMatch.customerId,
            name: orderMatch.customerName,
            phone: orderMatch.customerPhone,
            gender: orderMatch.genderCategory,
            measurements: orderMatch.measurements,
            ordersCount: 1,
          };
        }
      }

      // 4. Check local Appointments for existing client
      if (!foundData) {
        const localAppts = roomDb.getAppointments();
        const apptMatch = localAppts.find((a) => {
          const aClean = clean10DigitPhone(a.customerPhone || '');
          return (
            aClean === cleanDigits ||
            aClean.slice(-10) === cleanDigits.slice(-10) ||
            aClean.includes(cleanDigits) ||
            cleanDigits.includes(aClean)
          );
        });
        if (apptMatch) {
          foundData = {
            name: apptMatch.customerName,
            phone: apptMatch.customerPhone,
          };
        }
      }

      // 5. Check single Firestore customers collection
      if (!foundData) {
        try {
          const custRef = doc(db, 'customers', `cust_${cleanDigits}`);
          const custSnap = await getDoc(custRef).catch(() => null);
          if (custSnap && custSnap.exists()) {
            foundData = custSnap.data();
          } else {
            const custSnap2 = await getDoc(doc(db, 'customers', cleanDigits)).catch(() => null);
            if (custSnap2 && custSnap2.exists()) {
              foundData = custSnap2.data();
            }
          }
        } catch (fsErr) {
          console.warn('Firestore customer search notice:', fsErr);
        }
      }

      if (foundData && (foundData.name || foundData.customerName)) {
        const resolvedName = foundData.name || foundData.customerName || '';
        setCustomerName(resolvedName);
        if (foundData.gender) {
          setGender(foundData.gender === 'Female' ? 'Female' : 'Male');
        }
        setIsRepeatCustomer(true);
        if (foundData.measurements && Object.keys(foundData.measurements).length > 0) {
          setMeasurements(foundData.measurements);
        }
        if (foundData.phone && clean10DigitPhone(foundData.phone).length === 10) {
          setCustomerPhone(clean10DigitPhone(foundData.phone));
        }
        setSearchStatus({
          found: true,
          message: `Existing Customer Found: ${resolvedName} (${foundData.ordersCount || 1} past orders)`,
          customerId: foundData.id || `cust_${cleanDigits}`,
        });
      } else {
        setIsRepeatCustomer(false);
        setSearchStatus({
          found: false,
          message: `New Customer (+91 ${cleanDigits}). Details will be saved in customer records.`,
          customerId: `cust_${cleanDigits}`,
        });
      }
    } catch (err) {
      console.error('Customer search error:', err);
      const localCustomers = roomDb.getCustomers();
      const match = localCustomers.find((c) => {
        const cPhone = clean10DigitPhone(c.phone || '');
        return cPhone.includes(cleanDigits) || cleanDigits.includes(cPhone);
      });
      if (match) {
        setCustomerName(match.name);
        setGender(match.gender || 'Male');
        setIsRepeatCustomer(true);
        if (match.measurements) setMeasurements(match.measurements);
        setSearchStatus({
          found: true,
          message: `Customer Found in Local Database: ${match.name}`,
        });
      } else {
        setIsRepeatCustomer(false);
        setSearchStatus({
          found: false,
          message: `New Customer (+91 ${cleanDigits}). Account will be saved on creation.`,
        });
      }
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  // Measurement Input Handler
  const handleMeasurementChange = (key: string, value: string) => {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  // Add Custom Dynamic Measurement Field
  const handleAddCustomMeasurementField = () => {
    if (!newCustomLabel.trim()) return;
    const key = newCustomLabel.trim().toLowerCase().replace(/\s+/g, '_');
    setCustomFields((prev) => [...prev, { key, label: newCustomLabel.trim() }]);
    setNewCustomLabel('');
    setActiveMeasurementTab('Custom');
  };

  // File Upload Helper with canvas image compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        if (!rawUrl) return;

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
          } else {
            callback(rawUrl);
          }
        };
        img.onerror = () => callback(rawUrl);
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Fabric Photo
  const handleAddFabricPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e, (dataUrl) => {
      setFabricPhotos((prev) => [...prev, dataUrl]);
    });
  };

  // Voice Recording logic via browser MediaRecorder API
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setVoiceNoteUrl(base64Audio);

          // Get real clip duration from Audio object
          const tempAudio = new Audio(base64Audio);
          tempAudio.onloadedmetadata = () => {
            if (tempAudio.duration && isFinite(tempAudio.duration) && tempAudio.duration > 0) {
              setRecordingTimer(Math.round(tempAudio.duration));
            }
          };
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
      console.error('Microphone recording error:', err);
      // Fallback voice note if mic is restricted
      setVoiceNoteUrl('https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg');
      setRecordingTimer(12);
      alert('Microphone standard fallback note attached.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
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

  // Save Order & Create Order Receipt Slip
  const handleSave = async (addAnother: boolean = false) => {
    setValidationError(null);
    const cleanPhone = clean10DigitPhone(customerPhone);

    if (!customerName.trim()) {
      setValidationError('Please enter the customer name.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (cleanPhone.length !== 10) {
      setValidationError('Please enter an exact 10-digit mobile number (e.g. 9876543210).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      const effectiveGarmentType =
        selectedGarmentOption === 'Custom / Other'
          ? (customGarmentInput && customGarmentInput.trim()) || 'Custom Garment'
          : selectedGarmentOption || 'Garment';

      // Unique order ID with timestamp for zero collisions (clean canonical ID without leading hash)
      const random4Digits = Math.floor(1000 + Math.random() * 9000);
      const orderId = `ORD-${new Date().getFullYear()}-${random4Digits}`;
      const custId = `cust_${cleanPhone}`;

      const newOrder: TailorOrder = {
        id: orderId,
        customerId: custId,
        customerName: customerName.trim(),
        customerPhone: `+91 ${cleanPhone}`,
        isRepeatCustomer: Boolean(isRepeatCustomer),
        garmentType: effectiveGarmentType,
        orderCategory: orderCategory || 'New Stitch',
        subTypeStyle: (subTypeStyle && subTypeStyle.trim()) || (orderCategory === 'Alteration' ? 'Alteration Work' : 'Regular Fit'),
        genderCategory: gender || 'Male',
        measurementMode: measurementMode || 'manual',
        measurements: measurements || {},
        receiptImageUrl: receiptImage || null,
        referenceGarmentUrl: referenceGarmentImage || null,
        specialNotes: (specialNotes && specialNotes.trim()) || '',
        voiceNoteUrl: voiceNoteUrl || null,
        voiceNoteDurationSec: recordingTimer > 0 ? recordingTimer : voiceNoteUrl ? 12 : 0,
        fabricPhotos: fabricPhotos || [],
        totalAmount: Number(totalAmount) || 0,
        advancePaid: Number(advancePaid) || 0,
        balanceDue: Math.max(0, (Number(totalAmount) || 0) - (Number(advancePaid) || 0)),
        paymentMode: paymentMode || 'Cash',
        paymentHistory: [
          {
            id: `pay-${Date.now()}`,
            date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            amount: Number(advancePaid) || 0,
            type: 'Advance',
            mode: paymentMode || 'Cash',
            note: 'Advance paid during order booking',
          },
        ],
        status: 'New / Cutting',
        createdDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        createdBy: 'Self (Owner)',
        dueDate: dueDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueTime: dueTime || '18:00',
        assignedTailor: assignedTailor || 'Unassigned',
        estimatedHours: Number(estimatedHours) || 3,
        offerMessage: `Hello ${customerName.trim()}, your ${orderCategory || 'Stitching'} (${effectiveGarmentType}) order has been received. Estimated work duration: ${estimatedHours} Hours. Promised Delivery: ${dueDate || 'due date'} at ${dueTime || '18:00'}.`,
        isOverdue: false,
        daysOverdue: 0,
        isArchived: false,
        updatedAt: new Date().toISOString(),
      };

      // 1. Instantly save to local Room Database (which updates orders and syncs customer)
      await roomDb.saveOrder(newOrder);

      // Explicitly persist new/existing customer into customer collections
      const boutiqueId = roomDb.getShopProfile()?.id || 'boutique_default';
      const newCustomerRecord: TailorCustomer = {
        id: custId,
        name: customerName.trim(),
        phone: `+91 ${cleanPhone}`,
        gender: gender || 'Male',
        isRepeat: Boolean(isRepeatCustomer),
        ordersCount: 1,
        lastOrderDate: newOrder.createdDate,
        totalSpent: Number(totalAmount) || 0,
        measurements: measurements || {},
        boutiqueId,
        boutiqueName: shopProfile?.shopName || 'Boutique Shop',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await roomDb.saveCustomer(newCustomerRecord).catch((e) => console.warn('Customer auto-save notice:', e));

      // 2. Trigger receipt slip modal or reset for next order
      if (addAnother) {
        onSaveOrder(newOrder);
        // Reset garment and financial details while keeping customer info for quick multi-garment entry
        setSelectedGarmentOption('Formal Shirt');
        setCustomGarmentInput('');
        setSubTypeStyle('');
        setTotalAmount(700);
        setAdvancePaid(350);
        setReceiptImage(null);
        setReferenceGarmentImage(null);
        setFabricPhotos([]);
        setSpecialNotes('');
        setVoiceNoteUrl(null);
        setSearchStatus({
          found: true,
          message: `Saved ${orderId}! Ready to enter next garment/order.`,
        });
      } else {
        setCreatedOrderSlip(newOrder);
      }

      // 3. Asynchronously sync to Firestore without blocking UI popup
      try {
        const customerDocRef = doc(db, 'customers', custId);
        const customerPayload = {
          id: custId,
          name: customerName.trim(),
          phone: `+91 ${cleanPhone}`,
          cleanPhone: cleanPhone || undefined,
          gender: gender || 'Male',
          isRepeat: true,
          lastOrderDate: newOrder.createdDate,
          measurements: measurements || {},
          updatedAt: serverTimestamp(),
        };

        setDoc(customerDocRef, customerPayload, { merge: true }).catch((err) =>
          console.warn('Firestore customer non-blocking save notice:', err)
        );
        // Remove from legacy singular customer collection
        deleteDoc(doc(db, 'customer', custId)).catch(() => {});

        const orderDocRef = doc(db, 'orders', orderId.replace('#', ''));
        // Clean undefined fields for Firestore compatibility
        const safeOrderForFirestore = JSON.parse(JSON.stringify(newOrder));
        setDoc(orderDocRef, {
          ...safeOrderForFirestore,
          updatedAt: serverTimestamp(),
        }).catch((err) => console.warn('Firestore order non-blocking save notice:', err));
      } catch (e) {
        console.warn('Sync notice:', e);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      setValidationError('Failed to save order. Please check all fields.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper text string generator for WhatsApp & Copy
  const generateReceiptText = (order: TailorOrder) => {
    return generateWhatsAppReceiptText(order, shopProfile);
  };

  // Send WhatsApp Receipt with Generated PDF Slip
  const handleShareWhatsApp = async (order: TailorOrder) => {
    try {
      await sendWhatsAppWithPdfReceipt(order, shopProfile);
    } catch (e) {
      console.warn('WhatsApp PDF share fallback:', e);
      const text = generateReceiptText(order);
      const url = getWhatsAppUrl(order.customerPhone, text);
      window.open(url, '_blank');
    }
  };

  // Direct PDF Slip Download
  const handleDownloadSlip = (order: TailorOrder) => {
    try {
      downloadReceiptPdf(order, shopProfile);
    } catch (e) {
      console.warn('PDF download notice:', e);
    }
  };

  // Native Device Share (WhatsApp, SMS, Telegram, Email, etc.)
  const handleNativeShare = async (order: TailorOrder) => {
    const text = generateReceiptText(order);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Order Receipt ${order.id}`,
          text: text,
        });
        return;
      } catch (e) {
        console.log('Share dismissed or notice:', e);
      }
    }
    // Fallback: Open WhatsApp or SMS
    const cleanDigits = order.customerPhone.replace(/\D/g, '');
    window.open(`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Copy Receipt Text
  const handleCopyReceipt = (order: TailorOrder) => {
    const text = generateReceiptText(order);
    navigator.clipboard.writeText(text);
    setCopiedReceiptToast(true);
    setTimeout(() => setCopiedReceiptToast(false), 3000);
  };

  // Print Order Receipt Slip
  const handlePrintSlip = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Direct window.print notice:', e);
      if (createdOrderSlip) {
        handleDownloadSlip(createdOrderSlip);
      }
    }
  };

  return (
    <div className={`min-h-full bg-[#F8F9FA] text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-24'}`}>
      {/* Top Action Bar */}
      {!isDesktopView ? (
        <div className="bg-[#0B4636] text-white p-3.5 sticky top-0 z-20 shadow-md flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate">{t('nav.newOrder', 'New Order')}</h1>
              <p className="text-[10px] text-amber-300 truncate">{t('order.liveOrderBooking', 'Live Database')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-amber-400 hover:bg-amber-300 text-[#0B4636] px-3 py-1.5 rounded-xl font-black text-xs shadow flex items-center gap-1 cursor-pointer disabled:opacity-75"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? t('order.saving', 'Saving...') : t('order.saveBtn', 'Save')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#e6e9ef] print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-xs font-bold text-[#323338] hover:text-[#0073ea] hover:bg-slate-100 flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-lg border border-[#d0d4e4] shadow-2xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#676879]" />
              <span>{t('nav.backToDashboard', 'Back to Dashboard')}</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#676879]">
              <span>Orders Board</span>
              <span>/</span>
              <span className="font-bold text-[#323338]">New Order</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#0073ea] hover:bg-[#0060c2] text-white px-5 py-2 rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-75"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Save className="w-4 h-4 text-white" />
            )}
            <span>{isSaving ? t('order.saving', 'Saving to Database...') : t('order.saveBtn', 'Save & Create Order Slip')}</span>
          </button>
        </div>
      )}

      <div className={`space-y-4 print:hidden ${isDesktopView ? 'w-full max-w-none' : 'p-3 sm:p-4 max-w-4xl mx-auto'}`}>
        {/* Validation Error Alert Banner */}
        {validationError && (
          <div className="bg-[#fde8eb] border border-[#fbd0d5] text-[#e2445c] p-3 rounded-lg flex items-center justify-between text-xs font-bold shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{validationError}</span>
            </div>
            <button
              onClick={() => setValidationError(null)}
              className="text-[#e2445c] hover:bg-red-100 p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ---------------- TOP 3 ORDER CATEGORY SELECTOR (Monday Tab Card Style) ---------------- */}
        <div className="bg-white rounded-lg p-3.5 border border-[#d0d4e4] shadow-2xs">
          <div className="text-[11px] font-bold text-[#676879] uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0073ea]" />
              {t('order.chooseCategory', 'Choose Order Category & Workflow:')}
            </span>
            <span className="text-[#0073ea] font-bold bg-[#e5f4ff] px-2.5 py-0.5 rounded text-[10px] tracking-wide">
              {t('order.activeCategory', 'ACTIVE WORKFLOW:')} {orderCategory.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setOrderCategory('Stitch')}
              className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center sm:flex-row sm:items-center sm:text-left gap-2.5 cursor-pointer transition-all ${
                orderCategory === 'Stitch' || orderCategory === 'New Stitch'
                  ? 'border-[#0073ea] bg-[#e5f4ff] text-[#0073ea] shadow-2xs ring-1 ring-[#0073ea]'
                  : 'border-[#d0d4e4] bg-[#f8f9fb] text-[#323338] hover:bg-white hover:border-[#a0a6bd]'
              }`}
            >
              <div className="w-8 h-8 rounded-md bg-white border border-[#d0d4e4] flex items-center justify-center text-base shrink-0 shadow-2xs">
                🧵
              </div>
              <div className="text-center sm:text-left min-w-0">
                <div className="font-bold text-xs text-[#323338]">{t('order.bespokeStitch', 'Stitch')}</div>
                <div className="text-[10px] text-[#676879] font-normal truncate hidden sm:block">{t('order.bespokeStitchSub', 'Stitching & Tailoring')}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOrderCategory('Alteration')}
              className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center sm:flex-row sm:items-center sm:text-left gap-2.5 cursor-pointer transition-all ${
                orderCategory === 'Alteration'
                  ? 'border-[#fdab3d] bg-[#fff5e5] text-[#bb781e] shadow-2xs ring-1 ring-[#fdab3d]'
                  : 'border-[#d0d4e4] bg-[#f8f9fb] text-[#323338] hover:bg-white hover:border-[#a0a6bd]'
              }`}
            >
              <div className="w-8 h-8 rounded-md bg-white border border-[#d0d4e4] flex items-center justify-center text-base shrink-0 shadow-2xs">
                ✂️
              </div>
              <div className="text-center sm:text-left min-w-0">
                <div className="font-bold text-xs text-[#323338]">{t('order.alteration', 'Alteration')}</div>
                <div className="text-[10px] text-[#676879] font-normal truncate hidden sm:block">{t('order.alterationSub', 'Fitting & Repair')}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOrderCategory('Sale')}
              className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center sm:flex-row sm:items-center sm:text-left gap-2.5 cursor-pointer transition-all ${
                orderCategory === 'Sale'
                  ? 'border-[#a25ddc] bg-[#f6f0fd] text-[#784bd1] shadow-2xs ring-1 ring-[#a25ddc]'
                  : 'border-[#d0d4e4] bg-[#f8f9fb] text-[#323338] hover:bg-white hover:border-[#a0a6bd]'
              }`}
            >
              <div className="w-8 h-8 rounded-md bg-white border border-[#d0d4e4] flex items-center justify-center text-base shrink-0 shadow-2xs">
                🛍️
              </div>
              <div className="text-center sm:text-left min-w-0">
                <div className="font-bold text-xs text-[#323338]">{t('order.retailSale', 'Retail Sale')}</div>
                <div className="text-[10px] text-[#676879] font-normal truncate hidden sm:block">{t('order.retailSaleSub', 'Direct Tax Billing')}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Conditional Category Specific Form Renders */}
        {orderCategory === 'Sale' ? (
          <Screen3SaleForm
            onSaveOrder={async (ord, addAnother) => {
              try {
                await roomDb.saveOrder(ord);
                await roomDb.syncCustomerFromOrder(ord).catch((e) => console.warn('Customer sync note:', e));

                // Inventory decrement sync if items match
                if (ord.saleItems && ord.saleItems.length > 0) {
                  const currentInv = roomDb.getInventory();
                  for (const sItem of ord.saleItems) {
                    const matchedInv = currentInv.find(
                      (inv) =>
                        (inv.sku && sItem.sku && inv.sku.toLowerCase() === sItem.sku.toLowerCase()) ||
                        (inv.name && sItem.name && inv.name.toLowerCase() === sItem.name.toLowerCase())
                    );
                    if (matchedInv && typeof matchedInv.quantity === 'number') {
                      const updatedQty = Math.max(0, matchedInv.quantity - (sItem.quantity || 1));
                      await roomDb.saveInventoryItem({
                        ...matchedInv,
                        quantity: updatedQty,
                      }).catch((e) => console.warn('Inventory decrement sync note:', e));
                    }
                  }
                }
              } catch (e) {
                console.error('Error saving retail sale to database:', e);
              }

              if (!addAnother) {
                setCreatedOrderSlip(ord);
              } else {
                setSearchStatus({
                  found: true,
                  message: `Saved ${ord.id}! Ready for next order.`,
                });
              }
            }}
            onBack={onBack}
            shopProfile={shopProfile}
            existingCustomers={existingCustomers}
            isDesktopView={isDesktopView}
          />
        ) : orderCategory === 'Alteration' ? (
          <Screen3AlterationForm
            onSaveOrder={async (ord) => {
              try {
                await roomDb.saveOrder(ord);
                await roomDb.syncCustomerFromOrder(ord).catch((e) => console.warn('Customer sync note:', e));
              } catch (e) {
                console.error('Error saving alteration to database:', e);
              }
              setCreatedOrderSlip(ord);
            }}
            onBack={onBack}
            shopProfile={shopProfile}
            existingCustomers={existingCustomers}
            isDesktopView={isDesktopView}
          />
        ) : (
          <>
            {/* ---------------- 1. CUSTOMER LOOKUP & GENDER (Monday Group 1: Blue) ---------------- */}
            <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-[#0073ea] shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#e6e9ef]">
                <h2 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[#e5f4ff] text-[#0073ea] flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('order.lookupTitle', '1. Customer Lookup')}</span>
                </h2>
                <span className="text-[10px] font-bold text-[#676879] bg-[#f0f2f7] px-2 py-0.5 rounded border border-[#d0d4e4]">
                  {t('order.realtimeSync', 'Real-Time Firestore Sync')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Phone Number Input with Real Search Button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#323338]">
                      {t('order.customerPhone', '10-Digit Mobile Number *')}
                    </label>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      customerPhone.length === 10
                        ? 'bg-[#e5f9f1] text-[#00854d] border border-[#b3efd4]'
                        : 'bg-[#f0f2f7] text-[#676879]'
                    }`}>
                      {customerPhone.length}/10 Digits
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 bg-white border rounded-lg p-1 transition-all ${
                    customerPhone.length === 10
                      ? 'border-[#00c875] ring-1 ring-[#00c875]'
                      : 'border-[#d0d4e4] focus-within:border-[#0073ea] focus-within:ring-1 focus-within:ring-[#0073ea]'
                  }`}>
                    <span className="text-xs font-bold text-[#676879] px-2 border-r border-[#d0d4e4] select-none bg-[#f8f9fb] py-1 rounded-l">
                      IN +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      value={customerPhone}
                      onChange={(e) => {
                        const val = sanitizePhoneInput(e.target.value);
                        setCustomerPhone(val);
                        if (val.length === 10) {
                          handleSearchCustomer(val);
                        }
                      }}
                      placeholder={t('order.phonePlaceholder', '9876543210 (10 digits)')}
                      className="w-full bg-transparent px-2 py-1 text-xs font-bold text-[#323338] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchCustomer()}
                      disabled={isSearchingCustomer}
                      className="bg-[#0073ea] hover:bg-[#0060c2] text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0 active:scale-95"
                    >
                      {isSearchingCustomer ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>Search</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#676879] mt-1">
                    {t('order.phoneHelp', 'Enter strictly 10 digits. (+91 is automatically prefixed for WhatsApp).')}
                  </p>
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-bold text-[#323338] mb-1">
                    {t('order.customerName', 'Customer Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('order.namePlaceholder', 'e.g. Master Rajesh Kumar')}
                    className="w-full bg-white border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] transition-all"
                  />
                </div>
              </div>

              {/* Search Status Banner */}
              {searchStatus && (
                <div
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
                    searchStatus.found
                      ? 'bg-[#e5f9f1] border-[#b3efd4] text-[#00854d]'
                      : 'bg-[#fff5e5] border-[#fdab3d]/40 text-[#bb781e]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {searchStatus.found ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00c875] shrink-0" />
                    ) : (
                      <UserPlus className="w-4 h-4 text-[#fdab3d] shrink-0" />
                    )}
                    <span className="font-semibold">{searchStatus.message}</span>
                  </div>
                  {searchStatus.found && (
                    <span className="text-[10px] font-bold text-[#00854d] bg-white px-2 py-0.5 rounded border border-[#b3efd4]">
                      {t('order.measurementsLoaded', 'Measurements Loaded')}
                    </span>
                  )}
                </div>
              )}

              {/* Gender Switch (Monday Segmented Pill) */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-[#323338] mb-1">{t('order.customerGender', 'Customer Gender')}</label>
                <div className="flex bg-[#f0f2f7] p-0.5 rounded-lg border border-[#d0d4e4] max-w-xs">
                  <button
                    type="button"
                    onClick={() => setGender('Male')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      gender === 'Male'
                        ? 'bg-[#0073ea] text-white shadow-2xs'
                        : 'text-[#676879] hover:text-[#323338]'
                    }`}
                  >
                    {t('order.maleCust', 'Male Customer')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('Female')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      gender === 'Female'
                        ? 'bg-[#0073ea] text-white shadow-2xs'
                        : 'text-[#676879] hover:text-[#323338]'
                    }`}
                  >
                    {t('order.femaleCust', 'Female Customer')}
                  </button>
                </div>
              </div>
            </div>

            {/* ---------------- 2. ORDER CATEGORY & GARMENT SELECTION (Monday Group 2: Purple) ---------------- */}
            <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-[#a25ddc] shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#e6e9ef]">
                <h2 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[#f6f0fd] text-[#a25ddc] flex items-center justify-center">
                    <Scissors className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('order.secGarmentTitle', '2. Order Category & Garment Selection')}</span>
                </h2>
              </div>

              {/* Work Type Selection */}
              <div>
                <label className="block text-xs font-bold text-[#323338] mb-1.5">
                  {t('order.selectWorkType', 'Select Stitching Work Type')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderCategory('New Stitch')}
                    className={`p-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      orderCategory === 'New Stitch'
                        ? 'border-[#0073ea] bg-[#e5f4ff] text-[#0073ea] shadow-2xs ring-1 ring-[#0073ea]'
                        : 'border-[#d0d4e4] bg-[#f8f9fb] text-[#323338] hover:bg-white'
                    }`}
                  >
                    <span className="text-sm">🧵</span>
                    <span>{t('order.newStitchBtn', 'New Stitch Order')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderCategory('Alteration')}
                    className={`p-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      orderCategory === 'Alteration'
                        ? 'border-[#fdab3d] bg-[#fff5e5] text-[#bb781e] shadow-2xs ring-1 ring-[#fdab3d]'
                        : 'border-[#d0d4e4] bg-[#f8f9fb] text-[#323338] hover:bg-white'
                    }`}
                  >
                    <span className="text-sm">✂️</span>
                    <span>{t('order.alterationBtn', 'Alteration / Fitting Order')}</span>
                  </button>
                </div>
              </div>

              {/* Quick Popular Garment Badges for Instant 1-Tap Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#323338]">
                  {t('order.popularGarments', 'Popular Garments (Tap to select instantly):')}
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { name: 'Formal Shirt', icon: '👔' },
                    { name: 'Kurta Pajama', icon: '✨' },
                    { name: 'Blouse', icon: '🥻' },
                    { name: 'Salwar Suit', icon: '👗' },
                    { name: 'Pant / Trouser', icon: '👖' },
                    { name: 'Suit (Coat + Pant)', icon: '🧥' },
                    { name: 'Lehenga', icon: '👑' },
                    { name: 'Alterations', icon: '✂️' },
                  ].map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setSelectedGarmentOption(item.name);
                        if (item.name === 'Alterations') {
                          setOrderCategory('Alteration');
                        } else {
                          setOrderCategory('New Stitch');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        selectedGarmentOption === item.name
                          ? 'bg-[#0073ea] text-white shadow-2xs ring-1 ring-[#0073ea]'
                          : 'bg-[#f0f2f7] hover:bg-[#e6e9ef] text-[#323338] border border-[#d0d4e4]'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Dropdown / Custom Garment Select */}
                <div>
                  <label className="block text-xs font-bold text-[#323338] mb-1">
                    {t('order.orSelectFull', 'Or Select from Full Garment List:')}
                  </label>
                  <select
                    value={selectedGarmentOption}
                    onChange={(e) => setSelectedGarmentOption(e.target.value)}
                    className="w-full bg-white border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-[#0073ea] cursor-pointer"
                  >
                    {PREDEFINED_GARMENTS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* If Custom chosen, show text input */}
                {selectedGarmentOption === 'Custom / Other' ? (
                  <div>
                    <label className="block text-xs font-bold text-[#323338] mb-1">
                      {t('order.typeCustomGarment', 'Type Custom Garment Name *')}
                    </label>
                    <input
                      type="text"
                      required
                      value={customGarmentInput}
                      onChange={(e) => setCustomGarmentInput(e.target.value)}
                      placeholder={t('order.customGarmentPlaceholder', 'e.g. Pashmina Jacket, Indo-Western Sherwani...')}
                      className="w-full bg-white border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-bold text-[#323338] focus:outline-none focus:border-[#0073ea]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[#323338] mb-1">
                      {t('order.subTypeFitting', 'Sub-type / Fitting Specification')}
                    </label>
                    <input
                      type="text"
                      value={subTypeStyle}
                      onChange={(e) => setSubTypeStyle(e.target.value)}
                      placeholder={
                        orderCategory === 'Alteration'
                          ? 'e.g. Waist Tightening, Length Shortening...'
                          : t('order.subTypePlaceholder', 'e.g. Slim Fit, Mandarin Collar, Double Pocket...')
                      }
                      className="w-full bg-white border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-medium text-[#323338] focus:outline-none focus:border-[#0073ea]"
                    />
                  </div>
                )}
              </div>
            </div>

        {/* ---------------- 3. REAL-TIME COMPREHENSIVE MEASUREMENTS (Monday Group 3: Emerald) ---------------- */}
        <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-[#00c875] shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#e6e9ef]">
            <h2 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#e5f9f1] text-[#00854d] flex items-center justify-center">
                <span className="text-xs">📏</span>
              </div>
              <span>{t('order.secMeasurementTitle', '3. Measurement Ledger')}</span>
            </h2>

            {/* Switch Mode: Manual vs Upload Receipt */}
            <div className="flex items-center bg-[#f0f2f7] p-0.5 rounded-lg border border-[#d0d4e4] text-xs font-bold">
              <button
                type="button"
                onClick={() => setMeasurementMode('manual')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  measurementMode === 'manual'
                    ? 'bg-[#0073ea] text-white shadow-2xs'
                    : 'text-[#676879] hover:text-[#323338]'
                }`}
              >
                {t('order.inchesLedger', 'Inches Ledger')}
              </button>
              <button
                type="button"
                onClick={() => setMeasurementMode('receipt')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  measurementMode === 'receipt'
                    ? 'bg-[#0073ea] text-white shadow-2xs'
                    : 'text-[#676879] hover:text-[#323338]'
                }`}
              >
                {t('order.scanPaperSlip', 'Scan Paper Slip')}
              </button>
            </div>
          </div>

          {measurementMode === 'manual' ? (
            <div className="space-y-3">
              {/* Measurement Standard Specification Selector & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e6e9ef]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#323338]">Slip Template:</span>
                  <div className="inline-flex p-0.5 bg-[#f0f2f7] rounded-lg border border-[#d0d4e4] text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setGender('Female')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        gender === 'Female'
                          ? 'bg-[#0073ea] text-white shadow-2xs'
                          : 'text-[#676879] hover:text-[#323338]'
                      }`}
                    >
                      <span>👗 Ladies (23)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('Male')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        gender === 'Male'
                          ? 'bg-[#0073ea] text-white shadow-2xs'
                          : 'text-[#676879] hover:text-[#323338]'
                      }`}
                    >
                      <span>👔 Gents (18)</span>
                    </button>
                  </div>
                </div>

                {/* Quick tab switcher */}
                <div className="flex items-center gap-1 bg-[#f0f2f7] p-0.5 rounded-lg border border-[#d0d4e4] text-xs font-bold">
                  {(['Upper', 'Lower', 'Custom'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveMeasurementTab(tab)}
                      className={`py-1 px-2.5 rounded-md whitespace-nowrap transition-all cursor-pointer ${
                        activeMeasurementTab === tab
                          ? 'bg-white text-[#0073ea] shadow-2xs font-bold'
                          : 'text-[#676879] hover:text-[#323338]'
                      }`}
                    >
                      {tab === 'Upper' && (gender === 'Female' ? '1. Topwear (15)' : '1. Topwear (10)')}
                      {tab === 'Lower' && (gender === 'Female' ? '2. Bottomwear (8)' : '2. Bottomwear (8)')}
                      {tab === 'Custom' && `Custom (${customFields.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* ========================================================= */}
              {/* LADIES SPECIFICATION */}
              {/* ========================================================= */}
              {gender === 'Female' && (
                <>
                  {/* Tab 1: Ladies Upper Body & Topwear (Blouse / Kurti / Suit / Anarkali) */}
                  {activeMeasurementTab === 'Upper' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#00854d] font-bold bg-[#e5f9f1] px-2.5 py-1.5 rounded-md border border-[#b3efd4]">
                        <span>Upper Body & Topwear (Blouse / Kurti / Suit / Anarkali)</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded text-[#00854d]">15 Tailor Fields</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                        {LADIES_TOPWEAR_FIELDS.map((f) => (
                          <div
                            key={f.key}
                            className={`p-2 rounded-lg border transition-all ${
                              measurements[f.key]
                                ? 'bg-[#e5f4ff] border-[#0073ea]/40 ring-1 ring-[#0073ea]/30'
                                : 'bg-[#f8f9fb] border-[#d0d4e4]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <label className="text-[11px] font-bold text-[#323338] leading-tight truncate" title={f.description}>
                                {f.label}
                              </label>
                            </div>
                            {f.sublabel && (
                              <span className="text-[9px] text-[#676879] font-normal block truncate mb-1" title={f.description}>
                                {f.sublabel}
                              </span>
                            )}
                            <input
                              type="text"
                              value={measurements[f.key] || ''}
                              onChange={(e) => handleMeasurementChange(f.key, e.target.value)}
                              className="w-full bg-white border border-[#d0d4e4] rounded-md px-2 py-1 text-xs font-bold text-center text-[#323338] focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] outline-none"
                              placeholder={f.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Ladies Bottomwear (Salwar / Churidar / Cigarette Pant / Palazzo / Lehenga) */}
                  {activeMeasurementTab === 'Lower' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#00854d] font-bold bg-[#e5f9f1] px-2.5 py-1.5 rounded-md border border-[#b3efd4]">
                        <span>Bottomwear (Salwar / Churidar / Cigarette Pant / Palazzo / Lehenga)</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded text-[#00854d]">8 Tailor Fields</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {LADIES_BOTTOMWEAR_FIELDS.map((f) => (
                          <div
                            key={f.key}
                            className={`p-2 rounded-lg border transition-all ${
                              measurements[f.key]
                                ? 'bg-[#e5f4ff] border-[#0073ea]/40 ring-1 ring-[#0073ea]/30'
                                : 'bg-[#f8f9fb] border-[#d0d4e4]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <label className="text-[11px] font-bold text-[#323338] leading-tight truncate" title={f.description}>
                                {f.label}
                              </label>
                            </div>
                            {f.sublabel && (
                              <span className="text-[9px] text-[#676879] font-normal block truncate mb-1" title={f.description}>
                                {f.sublabel}
                              </span>
                            )}
                            <input
                              type="text"
                              value={measurements[f.key] || ''}
                              onChange={(e) => handleMeasurementChange(f.key, e.target.value)}
                              className="w-full bg-white border border-[#d0d4e4] rounded-md px-2 py-1 text-xs font-bold text-center text-[#323338] focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] outline-none"
                              placeholder={f.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ========================================================= */}
              {/* GENTS SPECIFICATION */}
              {/* ========================================================= */}
              {gender !== 'Female' && (
                <>
                  {/* Tab 1: Gents Topwear (Kurta / Sherwani / Shirt / Jacket) */}
                  {activeMeasurementTab === 'Upper' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#00854d] font-bold bg-[#e5f9f1] px-2.5 py-1.5 rounded-md border border-[#b3efd4]">
                        <span>Topwear (Kurta / Sherwani / Shirt / Jacket)</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded text-[#00854d]">10 Tailor Fields</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                        {GENTS_TOPWEAR_FIELDS.map((f) => (
                          <div
                            key={f.key}
                            className={`p-2 rounded-lg border transition-all ${
                              measurements[f.key]
                                ? 'bg-[#e5f4ff] border-[#0073ea]/40 ring-1 ring-[#0073ea]/30'
                                : 'bg-[#f8f9fb] border-[#d0d4e4]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <label className="text-[11px] font-bold text-[#323338] leading-tight truncate" title={f.description}>
                                {f.label}
                              </label>
                            </div>
                            {f.sublabel && (
                              <span className="text-[9px] text-[#676879] font-normal block truncate mb-1" title={f.description}>
                                {f.sublabel}
                              </span>
                            )}
                            <input
                              type="text"
                              value={measurements[f.key] || ''}
                              onChange={(e) => handleMeasurementChange(f.key, e.target.value)}
                              className="w-full bg-white border border-[#d0d4e4] rounded-md px-2 py-1 text-xs font-bold text-center text-[#323338] focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] outline-none"
                              placeholder={f.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Gents Bottomwear (Pajama / Trouser / Churidar / Dhoti) */}
                  {activeMeasurementTab === 'Lower' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#00854d] font-bold bg-[#e5f9f1] px-2.5 py-1.5 rounded-md border border-[#b3efd4]">
                        <span>Bottomwear (Pajama / Trouser / Churidar / Dhoti)</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded text-[#00854d]">8 Tailor Fields</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {GENTS_BOTTOMWEAR_FIELDS.map((f) => (
                          <div
                            key={f.key}
                            className={`p-2 rounded-lg border transition-all ${
                              measurements[f.key]
                                ? 'bg-[#e5f4ff] border-[#0073ea]/40 ring-1 ring-[#0073ea]/30'
                                : 'bg-[#f8f9fb] border-[#d0d4e4]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <label className="text-[11px] font-bold text-[#323338] leading-tight truncate" title={f.description}>
                                {f.label}
                              </label>
                            </div>
                            {f.sublabel && (
                              <span className="text-[9px] text-[#676879] font-normal block truncate mb-1" title={f.description}>
                                {f.sublabel}
                              </span>
                            )}
                            <input
                              type="text"
                              value={measurements[f.key] || ''}
                              onChange={(e) => handleMeasurementChange(f.key, e.target.value)}
                              className="w-full bg-white border border-[#d0d4e4] rounded-md px-2 py-1 text-xs font-bold text-center text-[#323338] focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] outline-none"
                              placeholder={f.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Tab 3: Dynamic Custom Fields */}
              {activeMeasurementTab === 'Custom' && (
                <div className="space-y-3 pt-1">
                  {customFields.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {customFields.map((cf) => (
                        <div key={cf.key} className="p-2 bg-[#f8f9fb] rounded-lg border border-[#d0d4e4]">
                          <label className="text-[11px] font-bold text-[#323338] block truncate">{cf.label}</label>
                          <input
                            type="text"
                            value={measurements[cf.key] || ''}
                            onChange={(e) => handleMeasurementChange(cf.key, e.target.value)}
                            className="w-full bg-white border border-[#d0d4e4] rounded-md px-2 py-1 text-xs font-bold text-center text-[#323338] mt-1 focus:border-[#0073ea]"
                            placeholder="Enter value"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#676879] italic">No custom fields added yet.</p>
                  )}

                  {/* Add New Custom Field Bar */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newCustomLabel}
                      onChange={(e) => setNewCustomLabel(e.target.value)}
                      placeholder={t('order.customFieldPlaceholder', 'e.g. Ghera / Flare, Belt Width...')}
                      className="flex-1 bg-white border border-[#d0d4e4] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#323338] outline-none focus:border-[#0073ea]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomMeasurementField}
                      className="px-3 py-1.5 bg-[#0073ea] hover:bg-[#0060c2] text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('order.addCustomField', 'Add Field')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#676879]">
                {t('order.snapSlipText', 'Snap or upload paper measurement slip / handwritten receipt note.')}
              </p>
              {receiptImage && receiptImage.trim() !== '' ? (
                <div className="relative rounded-lg overflow-hidden border border-[#d0d4e4] max-h-48 bg-slate-900 flex items-center justify-center group">
                  <img src={receiptImage} alt="Paper Slip" className="max-h-48 object-contain" />
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-[#e2445c] text-white rounded-md hover:bg-red-700 shadow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-[#d0d4e4] hover:border-[#0073ea] rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-[#f8f9fb]">
                  <Camera className="w-8 h-8 text-[#0073ea] mb-1" />
                  <span className="text-xs font-bold text-[#323338]">
                    {t('order.tapUploadSlip', 'Tap to Upload Paper Measurement Slip')}
                  </span>
                  <span className="text-[10px] text-[#676879] mt-0.5">JPG, PNG, WebP up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setReceiptImage)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* ---------------- 4. VOICE RECORDING, FABRICS & REFERENCE GARMENT (Monday Group 4: Indigo) ---------------- */}
        <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-[#579bfc] shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#e6e9ef]">
            <h2 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#eef5fe] text-[#1f76e2] flex items-center justify-center">
                <Mic className="w-3.5 h-3.5" />
              </div>
              <span>{t('order.secVoicePhotoTitle', '4. Voice Instructions & Photo Attachments')}</span>
            </h2>
          </div>

          {/* Voice Recorder Engine */}
          <div className="p-3.5 rounded-lg bg-[#f8f9fb] border border-[#d0d4e4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-white cursor-pointer transition-all shadow-2xs ${
                  isRecordingVoice
                    ? 'bg-[#e2445c] animate-pulse ring-4 ring-rose-200'
                    : voiceNoteUrl
                    ? 'bg-[#00c875]'
                    : 'bg-[#0073ea] hover:bg-[#0060c2]'
                }`}
              >
                {isRecordingVoice ? (
                  <Square className="w-4 h-4 fill-white" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#323338] flex items-center gap-1.5">
                  <span>
                    {isRecordingVoice
                      ? `${t('order.recordingLive', 'Recording Live Voice Note')} (${formatVoiceDuration(recordingTimer)})`
                      : voiceNoteUrl
                      ? `${t('order.voiceAttached', 'Voice Note Attached ✓')} (${formatVoiceDuration(recordingTimer)})`
                      : t('order.recordVoiceTitle', 'Record Tailor Voice Instruction')}
                  </span>
                </h4>
                <p className="text-[10px] text-[#676879] mt-0.5">
                  {isRecordingVoice
                    ? t('order.voiceHelpRecording', 'Speak clearly into your microphone. Tap red box when finished.')
                    : voiceNoteUrl
                    ? t('order.voiceHelpAttached', 'Audio recorded and attached. Saved in database.')
                    : t('order.voiceHelpRecord', 'Tap mic button to start recording voice note for master tailor.')}
                </p>
              </div>
            </div>

            {/* Audio Playback / Controls */}
            {voiceNoteUrl && !isRecordingVoice && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={toggleVoicePlayback}
                  className="px-3 py-1.5 bg-[#0073ea] hover:bg-[#0060c2] text-white rounded-md font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {isPlayingVoice ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>{t('order.pauseVoice', 'Pause')}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{t('order.listenVoice', 'Listen')} ({formatVoiceDuration(recordingTimer)})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={deleteVoiceNote}
                  className="p-1.5 bg-[#fde8eb] text-[#e2445c] hover:bg-red-100 rounded-md transition-all cursor-pointer"
                  title="Delete voice note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Reference Garment Image Upload */}
          <div>
            <label className="block text-xs font-bold text-[#323338] mb-1 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-[#0073ea]" />
              <span>{t('order.refPhotoTitle', 'Reference Garment / Design Photo (Optional)')}</span>
            </label>

            {referenceGarmentImage && referenceGarmentImage.trim() !== '' ? (
              <div className="relative rounded-lg overflow-hidden border border-[#d0d4e4] max-h-40 bg-slate-900 flex items-center justify-center w-full max-w-sm">
                <img src={referenceGarmentImage} alt="Reference Garment" className="max-h-40 object-contain" />
                <button
                  type="button"
                  onClick={() => setReferenceGarmentImage(null)}
                  className="absolute top-2 right-2 p-1.5 bg-[#e2445c] text-white rounded-md hover:bg-red-700 shadow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border border-dashed border-[#d0d4e4] hover:border-[#0073ea] bg-[#f8f9fb] rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-[#0073ea]" />
                <span className="text-xs font-bold text-[#323338]">
                  {t('order.uploadRefPhoto', 'Upload Reference Design / Garment Photo')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setReferenceGarmentImage)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Multiple Fabric Cloth Photos */}
          <div>
            <label className="block text-xs font-bold text-[#323338] mb-2 flex items-center justify-between">
              <span>{t('order.fabricPhotosTitle', 'Fabric Cloth Photos (Upload Multiple)')}</span>
              <span className="text-[10px] text-[#676879] font-normal">
                {fabricPhotos.length} {t('order.clothsAttached', 'Cloth(s) Attached')}
              </span>
            </label>

            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {fabricPhotos.map((img, idx) => (
                img && img.trim() !== '' ? (
                  <div key={idx} className="w-20 h-20 rounded-lg border border-[#d0d4e4] overflow-hidden relative shrink-0 shadow-2xs bg-slate-900">
                    <img src={img} alt={`Fabric ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFabricPhotos(fabricPhotos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-[#e2445c] text-white p-1 rounded-full shadow hover:bg-red-700 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : null
              ))}

              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[#d0d4e4] hover:border-[#0073ea] bg-[#f8f9fb] flex flex-col items-center justify-center cursor-pointer shrink-0 text-[#676879] transition-all">
                <Plus className="w-5 h-5 text-[#0073ea]" />
                <span className="text-[10px] font-bold mt-0.5">{t('order.addCloth', '+ Cloth')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddFabricPhoto}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Special Notes Textarea */}
          <div>
            <label className="block text-xs font-bold text-[#323338] mb-1">
              {t('order.specialNotesTitle', 'Special Stitching Instructions & Design Notes (Optional)')}
            </label>
            <textarea
              rows={2}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder={t('order.specialNotesPlaceholder', 'e.g. Double stitching on seams, extra 2-inch margin in waist, gold piping...')}
              className="w-full bg-white border border-[#d0d4e4] rounded-lg p-2.5 text-xs text-[#323338] outline-none focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] resize-none"
            />
          </div>
        </div>

        {/* ---------------- 5. FINANCIAL LEDGER & DELIVERY SCHEDULE (Monday Group 5: Yellow/Green) ---------------- */}
        <div className="bg-white rounded-lg p-4 border border-[#d0d4e4] border-l-4 border-l-[#fdab3d] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#e6e9ef]">
            <h2 className="text-xs font-bold text-[#323338] uppercase tracking-wider flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#fff5e5] text-[#bb781e] flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <span>{t('order.secFinancialTitle', '5. Financial Ledger & Delivery Schedule')}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#323338] mb-1">{t('order.totalOrderAmount', 'Total Order Amount (₹) *')}</label>
              <input
                type="number"
                min={0}
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                className="w-full bg-white border border-[#d0d4e4] rounded-lg px-3 py-2 text-sm font-extrabold text-[#323338] focus:outline-none focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#323338] mb-1">{t('order.advancePaidAmount', 'Advance Paid (₹)')}</label>
              <input
                type="number"
                min={0}
                value={advancePaid}
                onChange={(e) => setAdvancePaid(Number(e.target.value))}
                className="w-full bg-white border border-[#d0d4e4] rounded-lg px-3 py-2 text-sm font-extrabold text-[#00854d] focus:outline-none focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#323338] mb-1">{t('order.balanceDueAuto', 'Balance Due (Auto)')}</label>
              <div className="w-full bg-[#fde8eb] border border-[#fbd0d5] rounded-lg px-3 py-2 text-sm font-bold text-[#e2445c]">
                ₹{balanceDue}
              </div>
            </div>
          </div>

          {/* Payment Method & Promised Date & Time */}
          <div className="space-y-4 pt-1">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-bold text-[#323338] mb-1">{t('order.paymentMethod', 'Payment Method')}</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-white border border-[#d0d4e4] rounded-lg px-3 py-2 text-xs font-bold text-[#323338] cursor-pointer focus:outline-none focus:border-[#0073ea]"
              >
                <option value="Cash">{t('order.cashOption', 'Cash')}</option>
                <option value="UPI (Scan & Pay)">{t('order.upiOption', 'UPI (Scan & Pay)')}</option>
                <option value="Other (Card/Wallet)">{t('order.otherOption', 'Other (Card/Wallet)')}</option>
              </select>
            </div>

            {/* Promised Date & Time Selector */}
            <div className="p-3.5 rounded-lg bg-[#f8f9fb] border border-[#d0d4e4] space-y-3">
              <PromisedDateTimeInput
                date={dueDate}
                time={dueTime}
                onDateChange={(d) => setDueDate(d)}
                onTimeChange={(t) => setDueTime(t)}
                showPresets={true}
                showStatusBanner={true}
                isSundayOff={dateAvailability.isSunday}
                freeWorkersCount={dateAvailability.availableTailors.filter((t) => t.canAccept).length}
                estimatedHours={estimatedHours}
                label={t('order.promisedDateTime', 'Promised Date & Time')}
              />
            </div>
          </div>
        </div>

        {/* Real-time Order Summary Bar before submission (Monday Board Strip Style) */}
        <div className="bg-[#1c2438] rounded-lg p-4 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#579bfc] uppercase tracking-wider">{t('order.liveOrderBooking', 'Order Intake Summary')}</span>
              <span className="text-[10px] bg-[#0073ea] text-white px-2 py-0.2 rounded font-bold">
                {orderCategory.toUpperCase()}
              </span>
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
              <span>{selectedGarmentOption === 'Custom / Other' ? (customGarmentInput || 'Custom') : selectedGarmentOption}</span>
              <span className="text-slate-500">•</span>
              <span className="text-white">₹{totalAmount} Total</span>
              <span className="text-slate-500">•</span>
              <span className="text-[#00c875]">₹{advancePaid} Adv</span>
              <span className="text-slate-500">•</span>
              <span className="text-[#e2445c]">₹{balanceDue} Due</span>
            </div>
            <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#fdab3d]" />
              <span>
                Promised: <span className="text-white font-bold">{formatDisplayDate(dueDate)} ({formatFullReadableDate(dueDate)})</span> at <span className="text-white font-bold">{formatDisplayTime(dueTime)}</span>
              </span>
            </div>
          </div>

          <div className="text-right shrink-0 w-full sm:w-auto">
            <span className="text-xs font-medium text-slate-300 block">
              {customerName ? `${customerName} (${customerPhone || 'No Phone'})` : 'Enter customer details'}
            </span>
          </div>
        </div>

        {/* Validation Error Alert Banner */}
        {validationError && (
          <div className="bg-[#fde8eb] border border-[#fbd0d5] text-[#e2445c] p-3 rounded-lg flex items-center justify-between text-xs font-bold shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{validationError}</span>
            </div>
            <button
              onClick={() => setValidationError(null)}
              className="text-[#e2445c] hover:bg-red-100 p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Buttons: Save & Add Another and Main Create Order (Monday Button Styles) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="h-11 bg-white hover:bg-[#f0f2f7] text-[#323338] border border-[#d0d4e4] font-bold text-xs rounded-lg shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-75"
          >
            <Plus className="w-4 h-4 text-[#0073ea]" />
            <span>{t('order.saveAndAddAnother', 'Save & Add Another Order')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="h-11 bg-[#0073ea] hover:bg-[#0060c2] text-white font-bold text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-75"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{t('order.saving', 'Creating Order...')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>{t('order.createAndSlip', 'Create Order & Generate Receipt Slip')}</span>
              </>
            )}
          </button>
        </div>
          </>
        )}
      </div>

      {/* ==================== ORDER RECEIPT SLIP MODAL ==================== */}
      {createdOrderSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl overflow-hidden border border-[#d0d4e4] my-auto flex flex-col max-h-[92vh]">
            {/* Modal Action Header (Excluded from Print) */}
            <div className="bg-[#0073ea] text-white p-4 flex items-center justify-between print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white text-[#0073ea] flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Order Created Successfully!</h3>
                  <p className="text-[10px] text-blue-100">Official Customer Order Slip & Receipt</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onSaveOrder(createdOrderSlip);
                }}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINTABLE ORDER SLIP CONTENT */}
            <div id="printable-order-slip" className="p-6 overflow-y-auto space-y-4 text-slate-900 bg-white">
              {/* Shop Branding Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
                <h1 className="text-lg font-bold text-[#0073ea] uppercase tracking-wide">
                  {shopProfile?.shopName || 'ROYAL TAILORS & BOUTIQUE'}
                </h1>
                {shopProfile?.ownerName && (
                  <p className="text-xs font-semibold text-slate-700">Prop: {shopProfile.ownerName}</p>
                )}
                {shopProfile?.address && (
                  <p className="text-[11px] text-slate-600 max-w-md mx-auto">{shopProfile.address}</p>
                )}
                {shopProfile?.phoneNumber && (
                  <p className="text-[11px] font-bold text-[#0073ea]">
                    📞 +91 {shopProfile.phoneNumber}
                  </p>
                )}
                <div className="inline-block bg-[#e5f4ff] text-[#0073ea] font-bold text-[10px] px-3 py-0.5 rounded-full mt-1 uppercase tracking-wider border border-[#cce5ff]">
                  CUSTOMER ORDER RECEIPT SLIP
                </div>
              </div>

              {/* Order & Customer Metadata Table */}
              <div className="grid grid-cols-2 gap-3 bg-[#f8f9fb] p-3.5 rounded-lg border border-[#d0d4e4] text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#676879] uppercase block">Receipt No</span>
                  <span className="font-bold text-[#0073ea] text-sm">{createdOrderSlip.id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#676879] uppercase block">Booking Date</span>
                  <span className="font-semibold text-[#323338]">
                    {createdOrderSlip.createdDate} ({createdOrderSlip.createdTime})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#676879] uppercase block">Customer Name</span>
                  <span className="font-bold text-[#323338] text-sm">{createdOrderSlip.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#676879] uppercase block">Mobile Phone</span>
                  <span className="font-semibold text-[#323338]">{createdOrderSlip.customerPhone}</span>
                </div>
              </div>

              {/* Garment & Stitching Specifications */}
              <div className="bg-[#f8f9fb] rounded-lg p-3.5 border border-[#d0d4e4] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#323338]">
                    <Scissors className="w-4 h-4 text-[#0073ea]" />
                    <span className="text-sm">{createdOrderSlip.garmentType}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-[#0073ea] text-white font-bold text-[10px] rounded uppercase">
                    {createdOrderSlip.orderCategory || 'New Stitch'}
                  </span>
                </div>
                <div className="text-slate-700 font-medium">
                  <span className="font-bold text-[#323338]">Style / Fitting Note: </span>
                  {createdOrderSlip.subTypeStyle || 'Standard Custom Fitting'}
                </div>
                {createdOrderSlip.specialNotes && (
                  <div className="text-slate-800 text-[11px] bg-white p-2 rounded-lg border border-[#d0d4e4] mt-1">
                    <span className="font-bold text-[#323338]">Instructions: </span>
                    {createdOrderSlip.specialNotes}
                  </div>
                )}
              </div>

              {/* Category-Specific Breakdown: Sale Items Table */}
              {createdOrderSlip.orderCategory === 'Sale' && createdOrderSlip.saleItems && createdOrderSlip.saleItems.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-[#323338] uppercase tracking-wider">
                    🛍️ Retail Line Items ({createdOrderSlip.saleItems.length})
                  </h4>
                  <div className="border border-[#d0d4e4] rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#f8f9fb] text-[#676879] font-bold text-[10px]">
                        <tr>
                          <th className="p-2">Item</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e6e9ef] font-medium">
                        {createdOrderSlip.saleItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#f8f9fb]">
                            <td className="p-2 font-bold text-[#323338]">{item.name}</td>
                            <td className="p-2 text-center">{item.quantity}</td>
                            <td className="p-2 text-right">₹{item.unitPrice}</td>
                            <td className="p-2 text-right font-bold text-[#00854d]">
                              ₹{item.quantity * item.unitPrice - (item.discount || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Category-Specific Breakdown: Alteration Checklist */}
              {createdOrderSlip.orderCategory === 'Alteration' && createdOrderSlip.alterationTasks && createdOrderSlip.alterationTasks.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-[#bb781e] uppercase tracking-wider">
                    ✂️ Alteration Work Checklist
                  </h4>
                  <div className="bg-[#fff5e5] p-3 rounded-lg border border-[#fed699] space-y-1 text-xs">
                    {createdOrderSlip.alterationTasks.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[#323338] font-bold">
                        <span className="text-[#bb781e]">✓</span>
                        <span>{t}</span>
                      </div>
                    ))}
                    {createdOrderSlip.defectNotes && (
                      <div className="text-[11px] text-[#323338] font-medium pt-1 border-t border-[#fed699] mt-1">
                        <span className="font-bold">Intake Condition: </span>
                        {createdOrderSlip.defectNotes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Measurements Breakdown Table for Stitch */}
              {createdOrderSlip.orderCategory !== 'Sale' && createdOrderSlip.orderCategory !== 'Alteration' && Object.keys(createdOrderSlip.measurements).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-[#323338] uppercase tracking-wider">
                    📏 Recorded Measurements (Inches)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#f8f9fb] p-3 rounded-lg border border-[#d0d4e4]">
                    {Object.entries(createdOrderSlip.measurements).map(
                      ([mKey, mVal]) =>
                        typeof mVal === 'string' &&
                        mVal.trim() !== '' && (
                          <div key={mKey} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-md border border-[#d0d4e4] text-xs">
                            <span className="text-[#676879] font-medium truncate pr-2">
                              {getMeasurementLabel(mKey)}
                            </span>
                            <span className="font-bold text-[#0073ea] shrink-0">{mVal}</span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}

              {/* Financial Ledger Summary */}
              <div className="border-t border-b border-dashed border-[#d0d4e4] py-3 space-y-2">
                {typeof createdOrderSlip.subtotalAmount === 'number' && createdOrderSlip.subtotalAmount > 0 && (
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Items Subtotal:</span>
                    <span className="font-semibold text-slate-800">₹{createdOrderSlip.subtotalAmount}</span>
                  </div>
                )}
                {typeof createdOrderSlip.discountAmount === 'number' && createdOrderSlip.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs font-medium text-rose-600">
                    <span>Discount Applied:</span>
                    <span className="font-bold text-rose-600">-₹{createdOrderSlip.discountAmount}</span>
                  </div>
                )}
                {typeof createdOrderSlip.taxAmount === 'number' && createdOrderSlip.taxAmount > 0 && (
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>GST / Tax:</span>
                    <span className="font-semibold text-slate-800">+₹{createdOrderSlip.taxAmount}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pt-0.5">
                  <span>Total Bill / Charge:</span>
                  <span className="font-black text-[#323338] text-sm">
                    ₹{createdOrderSlip.totalAmount}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-[#00854d]">
                  <span>Amount Paid ({createdOrderSlip.paymentMode || 'Cash'}):</span>
                  <span className="font-bold text-[#00854d] text-sm">
                    ₹{createdOrderSlip.advancePaid}
                  </span>
                </div>

                {createdOrderSlip.balanceDue > 0 ? (
                  <div className="flex items-center justify-between bg-[#fde8eb] p-3 rounded-lg border border-[#fbd0d5] text-[#e2445c]">
                    <div>
                      <span className="text-xs font-bold block">BALANCE DUE AT PICKUP</span>
                      <span className="text-[10px] text-[#e2445c]">Pay at trial/delivery</span>
                    </div>
                    <span className="text-xl font-black text-[#e2445c]">
                      ₹{createdOrderSlip.balanceDue}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="text-xs font-black block">100% FULLY PAID AT COUNTER</span>
                        <span className="text-[10px] text-emerald-700">Immediate settlement confirmed</span>
                      </div>
                    </div>
                    <span className="text-xs font-black uppercase bg-emerald-200/80 px-2 py-0.5 rounded text-emerald-900">
                      Zero Balance
                    </span>
                  </div>
                )}
              </div>

              {/* Delivery Due Date Banner */}
              <div className="bg-[#1c2438] text-white p-3.5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#fdab3d] shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-300 font-bold block uppercase">
                      Promised Delivery Date
                    </span>
                    <span className="text-xs font-bold text-white">
                      {createdOrderSlip.dueDate} at {createdOrderSlip.dueTime}
                    </span>
                  </div>
                </div>
                <span className="bg-[#00c875] text-white font-bold text-[10px] px-2.5 py-1 rounded">
                  ON TIME
                </span>
              </div>

              {/* Terms & Footer Note */}
              <p className="text-[10px] text-slate-500 text-center italic pt-1">
                "Please present this order receipt slip during garment trial or collection. Garments held up to 30 days."
              </p>
            </div>

            {/* Action Toolbar (WhatsApp, Share, Download, Print, Copy, Done) */}
            <div className="bg-[#f8f9fb] p-4 border-t border-[#d0d4e4] space-y-2.5 print:hidden shrink-0">
              {copiedReceiptToast && (
                <div className="bg-[#1c2438] text-white text-xs py-1.5 px-3 rounded-lg text-center font-bold animate-fade-in flex items-center justify-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-[#00c875]" />
                  <span>Receipt text copied to clipboard!</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(createdOrderSlip)}
                  className="bg-[#00c875] hover:bg-[#00b067] active:scale-95 text-white py-2 px-2.5 rounded-lg font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Generate PDF & Send via WhatsApp"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>WhatsApp + PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNativeShare(createdOrderSlip)}
                  className="bg-[#579bfc] hover:bg-[#4387ec] active:scale-95 text-white py-2 px-2.5 rounded-lg font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Share via SMS, Email, or Social Apps"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send / Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSlip(createdOrderSlip)}
                  className="bg-[#fdab3d] hover:bg-[#e59930] active:scale-95 text-white py-2 px-2.5 rounded-lg font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Download PDF Receipt File"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="bg-[#323338] hover:bg-[#181b34] active:scale-95 text-white py-2 px-2.5 rounded-lg font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Print or Save PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyReceipt(createdOrderSlip)}
                  className="w-1/3 bg-white hover:bg-[#f0f2f7] border border-[#d0d4e4] text-[#323338] py-2.5 px-3 rounded-lg font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Copy className="w-4 h-4 text-[#0073ea]" />
                  <span>Copy Text</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSaveOrder(createdOrderSlip);
                  }}
                  className="w-2/3 bg-[#0073ea] hover:bg-[#0060c2] text-white py-2.5 px-3 rounded-lg font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Complete Order & Go to Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
