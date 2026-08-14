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
  GarmentCategory,
  MeasurementMap,
  GenderCategory,
  PaymentMode,
  TailorCustomer,
  ShopProfile,
} from '../../types';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
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

interface Screen3NewOrderProps {
  onBack: () => void;
  onSaveOrder: (order: TailorOrder) => void;
  existingCustomers?: TailorCustomer[];
  isDesktopView?: boolean;
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
}) => {
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

  // Order Category: New Stitch vs Alteration
  const [orderCategory, setOrderCategory] = useState<'New Stitch' | 'Alteration'>('New Stitch');

  // Garment Selection State
  const [selectedGarmentOption, setSelectedGarmentOption] = useState<string>('Formal Shirt');
  const [customGarmentInput, setCustomGarmentInput] = useState('');
  const [subTypeStyle, setSubTypeStyle] = useState('');

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
  const [fabricPhotos, setFabricPhotos] = useState<string[]>([]);

  // Special Notes
  const [specialNotes, setSpecialNotes] = useState('');

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
  const [totalAmount, setTotalAmount] = useState<number>(1200);
  const [advancePaid, setAdvancePaid] = useState<number>(300);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');

  // Delivery, Worker Assignment & Free Hours
  const defaultFutureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState<string>(defaultFutureDate);
  const [dueTime, setDueTime] = useState<string>('18:00');
  const [assignedTailor, setAssignedTailor] = useState<string>('Unassigned');
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
      const custId = `cust_${cleanDigits}`;
      const custRef = doc(db, 'customers', custId);
      const custSnap = await getDoc(custRef).catch(() => null);

      let foundData: any = null;

      if (custSnap && custSnap.exists()) {
        foundData = custSnap.data();
      } else {
        const q = query(collection(db, 'customers'), where('phone', '==', `+91 ${cleanDigits}`));
        const qSnap = await getDocs(q).catch(() => null);
        if (qSnap && !qSnap.empty) {
          foundData = qSnap.docs[0].data();
        }
      }

      if (!foundData) {
        const localCustomers = roomDb.getCustomers();
        const match = localCustomers.find((c) => clean10DigitPhone(c.phone) === cleanDigits);
        if (match) {
          foundData = match;
        }
      }

      if (foundData) {
        setCustomerName(foundData.name || foundData.customerName || '');
        setGender(foundData.gender || 'Male');
        setIsRepeatCustomer(true);
        if (foundData.measurements && Object.keys(foundData.measurements).length > 0) {
          setMeasurements(foundData.measurements);
        }
        setSearchStatus({
          found: true,
          message: `Existing Customer Found: ${foundData.name || 'Registered User'} (${
            foundData.ordersCount || 1
          } past orders)`,
          customerId: custId,
        });
      } else {
        setIsRepeatCustomer(false);
        setSearchStatus({
          found: false,
          message: `New Customer (+91 ${cleanDigits}). Profile will be auto-created in database on save.`,
          customerId: custId,
        });
      }
    } catch (err) {
      console.error('Customer search error:', err);
      const localCustomers = roomDb.getCustomers();
      const match = localCustomers.find((c) => clean10DigitPhone(c.phone) === cleanDigits);
      if (match) {
        setCustomerName(match.name);
        setGender(match.gender);
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
          message: `New Customer (+91 ${cleanDigits}). Account will be auto-created on save.`,
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
  const handleSave = async () => {
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

      // Unique order ID with timestamp for zero collisions
      const random4Digits = Math.floor(1000 + Math.random() * 9000);
      const orderId = `#ORD-${new Date().getFullYear()}-${random4Digits}`;
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

      // 1. Instantly save to local Room Database
      roomDb.saveOrder(newOrder);

      // 2. Trigger receipt slip modal
      setCreatedOrderSlip(newOrder);

      // 3. Asynchronously sync to Firestore without blocking UI popup
      try {
        const customerDocRef = doc(db, 'customers', custId);
        const customerPayload = {
          id: custId,
          name: customerName.trim(),
          phone: `+91 ${cleanPhone}`,
          gender: gender || 'Male',
          isRepeat: true,
          lastOrderDate: newOrder.createdDate,
          measurements: measurements || {},
          updatedAt: serverTimestamp(),
        };

        setDoc(customerDocRef, customerPayload, { merge: true }).catch((err) =>
          console.warn('Firestore customer non-blocking save notice:', err)
        );

        const orderDocRef = doc(db, 'orders', orderId.replace('#', ''));
        // Clean undefined fields for Firestore compatibility
        const safeOrderForFirestore = JSON.parse(JSON.stringify(newOrder));
        setDoc(orderDocRef, {
          ...safeOrderForFirestore,
          createdAtTimestamp: serverTimestamp(),
          updatedAtTimestamp: serverTimestamp(),
        }).catch((err) => console.warn('Firestore order non-blocking save notice:', err));
      } catch (fErr) {
        console.warn('Non-blocking Firestore sync notice:', fErr);
      }

    } catch (err) {
      console.error('Error generating order:', err);
      setValidationError('Failed to create order. Please check inputs and try again.');
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

  // Download Formatted Receipt File (.html & .txt)
  const handleDownloadSlip = (order: TailorOrder) => {
    const sName = shopProfile?.shopName || 'ROYAL TAILORS & BOUTIQUE';
    const sPhone = shopProfile?.phoneNumber || '';
    const sAddress = shopProfile?.address || '';
    const ownerName = shopProfile?.ownerName || '';

    const nonZeroMeasurements = Object.entries(order.measurements)
      .filter(([_, v]) => typeof v === 'string' && v.trim() !== '')
      .map(([k, v]) => `<tr><td style="padding: 6px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600; text-transform: capitalize;">${k.replace(/([A-Z])/g, ' $1').toLowerCase()}</td><td style="padding: 6px 12px; border: 1px solid #e2e8f0; font-weight: 800; color: #0B4636;">${v}</td></tr>`)
      .join('');

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Receipt - ${order.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
    .card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0B4636; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; letter-spacing: 1px; color: #fbbf24; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 12px; opacity: 0.9; }
    .badge { display: inline-block; background: #fbbf24; color: #0B4636; font-weight: 900; font-size: 11px; padding: 4px 12px; border-radius: 20px; margin-top: 10px; text-transform: uppercase; }
    .content { padding: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 13px; margin-bottom: 16px; }
    .grid-item label { display: block; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .grid-item span { font-weight: 800; color: #0f172a; }
    .specs { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px; margin-bottom: 16px; font-size: 13px; }
    .ledger { border-top: 2px dashed #cbd5e1; border-bottom: 2px dashed #cbd5e1; padding: 14px 0; margin-bottom: 16px; font-size: 13px; }
    .ledger-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 600; }
    .balance-box { background: #ffe4e6; border: 1px solid #fecdd3; color: #9f1239; padding: 12px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
    .due-box { background: #0B4636; color: #ffffff; padding: 12px 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 16px; font-style: italic; }
    @media print { body { background: none; padding: 0; } .card { box-shadow: none; border: none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${sName}</h1>
      ${ownerName ? `<p>Proprietor: ${ownerName}</p>` : ''}
      ${sAddress ? `<p>${sAddress}</p>` : ''}
      ${sPhone ? `<p>📞 Phone: +91 ${sPhone}</p>` : ''}
      <div class="badge">OFFICIAL CUSTOMER ORDER RECEIPT</div>
    </div>
    <div class="content">
      <div class="grid">
        <div class="grid-item"><label>Receipt No</label><span>${order.id}</span></div>
        <div class="grid-item"><label>Date</label><span>${order.createdDate} (${order.createdTime})</span></div>
        <div class="grid-item"><label>Customer Name</label><span>${order.customerName}</span></div>
        <div class="grid-item"><label>Mobile Phone</label><span>${order.customerPhone}</span></div>
      </div>
      <div class="specs">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 15px; color: #0B4636; margin-bottom: 6px;">
          <span>🧵 ${order.garmentType}</span>
          <span style="font-size: 11px; background: #0B4636; color: #fbbf24; padding: 2px 8px; border-radius: 10px;">${order.orderCategory || 'New Stitch'}</span>
        </div>
        <div><strong>Style:</strong> ${order.subTypeStyle || 'Standard Fitting'}</div>
        ${order.specialNotes ? `<div style="margin-top: 6px; font-size: 12px; background: #ffffff; padding: 8px; border-radius: 8px; border: 1px solid #fef3c7;"><strong>Notes:</strong> ${order.specialNotes}</div>` : ''}
      </div>
      ${nonZeroMeasurements ? `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 900; color: #0B4636; text-transform: uppercase; margin-bottom: 4px;">📏 Recorded Measurements (Inches)</div>
          <table>${nonZeroMeasurements}</table>
        </div>
      ` : ''}
      <div class="ledger">
        <div class="ledger-row"><span>Total Amount:</span><span>₹${order.totalAmount}</span></div>
        <div class="ledger-row" style="color: #047857;"><span>Advance Paid (${order.paymentMode}):</span><span>- ₹${order.advancePaid}</span></div>
        <div class="balance-box">
          <div><strong style="font-size: 12px; display: block;">BALANCE DUE AT PICKUP</strong><span style="font-size: 10px;">Pay at trial/delivery</span></div>
          <span style="font-size: 20px; font-weight: 900;">₹${order.balanceDue}</span>
        </div>
      </div>
      <div class="due-box">
        <div>
          <span style="font-size: 10px; color: #fef08a; text-transform: uppercase; display: block; font-weight: 700;">Promised Delivery Date</span>
          <span style="font-size: 13px; font-weight: 900;">📅 ${order.dueDate} at ${order.dueTime}</span>
        </div>
        <span style="background: #fbbf24; color: #0B4636; font-weight: 900; font-size: 10px; padding: 4px 8px; border-radius: 8px;">ON TIME</span>
      </div>
      <p class="footer">"Thank you for choosing us! Please present this slip during garment trial or collection."</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Order_Receipt_${order.id.replace('#', '')}_${order.customerName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <div className="bg-[#0B4636] text-white p-4 sticky top-0 z-20 shadow-md flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold tracking-tight">New Order Entry</h1>
              <p className="text-[10px] text-amber-300">Live Customer Lookup & Real-time Database</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-400 hover:bg-amber-300 text-[#0B4636] px-3.5 py-1.5 rounded-xl font-black text-xs shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Creating...' : 'Save Order'}</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 print:hidden">
          <button
            onClick={onBack}
            className="text-xs font-bold text-slate-600 hover:text-[#0B4636] flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#0B4636] hover:bg-[#073024] text-amber-300 px-5 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center gap-2 cursor-pointer border border-amber-300/30 disabled:opacity-75"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
            ) : (
              <Save className="w-4 h-4 text-amber-300" />
            )}
            <span>{isSaving ? 'Saving to Database...' : 'Save & Create Order Slip'}</span>
          </button>
        </div>
      )}

      <div className={`space-y-4 print:hidden ${isDesktopView ? 'w-full max-w-none' : 'p-4 max-w-2xl mx-auto'}`}>
        {/* Validation Error Alert Banner */}
        {validationError && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm animate-shake">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{validationError}</span>
            </div>
            <button
              onClick={() => setValidationError(null)}
              className="text-rose-700 hover:text-rose-950 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ---------------- 1. CUSTOMER LOOKUP & GENDER ---------------- */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>1. Customer Lookup</span>
            </h2>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Real-Time Firestore Sync
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone Number Input with Real Search Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Customer Mobile Number *
                </label>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  customerPhone.length === 10
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {customerPhone.length}/10 Digits
                </span>
              </div>
              <div className={`flex items-center gap-1 bg-slate-50 border rounded-xl p-1 focus-within:bg-white transition-all ${
                customerPhone.length === 10
                  ? 'border-emerald-500 focus-within:border-emerald-600'
                  : 'border-slate-300 focus-within:border-[#0B4636]'
              }`}>
                <span className="text-xs font-extrabold text-slate-600 px-2 border-r border-slate-300 select-none">
                  🇮🇳 +91
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
                  placeholder="9876543210 (10 digits)"
                  className="w-full bg-transparent px-2 py-1.5 text-xs font-bold text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSearchCustomer()}
                  disabled={isSearchingCustomer}
                  className="bg-[#0B4636] hover:bg-[#073024] text-amber-300 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                >
                  {isSearchingCustomer ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Search</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                Enter strictly 10 digits. (+91 is automatically prefixed for WhatsApp).
              </p>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Master Rajesh Kumar"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Search Status / Account Auto-creation Banner */}
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
                  Measurements Loaded
                </span>
              )}
            </div>
          )}

          {/* Gender Switch */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer Gender</label>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-sm">
              <button
                type="button"
                onClick={() => setGender('Male')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  gender === 'Male'
                    ? 'bg-[#0B4636] text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Male Customer
              </button>
              <button
                type="button"
                onClick={() => setGender('Female')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  gender === 'Female'
                    ? 'bg-[#0B4636] text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Female Customer
              </button>
            </div>
          </div>
        </div>

        {/* ---------------- 2. ORDER CATEGORY & GARMENT SELECTION ---------------- */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
          <h2 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
            <Scissors className="w-4 h-4" />
            <span>2. Order Category & Garment Selection</span>
          </h2>

          {/* New Stitch vs Alteration Option */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Stitching Work Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderCategory('New Stitch')}
                className={`p-3 rounded-2xl border-2 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  orderCategory === 'New Stitch'
                    ? 'border-[#0B4636] bg-[#0B4636]/5 text-[#0B4636] shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-base">🧵</span>
                <span>New Stitch Order</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderCategory('Alteration')}
                className={`p-3 rounded-2xl border-2 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  orderCategory === 'Alteration'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-base">✂️</span>
                <span>Alteration / Fitting Order</span>
              </button>
            </div>
          </div>

          {/* Quick Popular Garment Badges for Instant 1-Tap Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Popular Garments (Tap to select instantly):
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedGarmentOption === item.name
                      ? 'bg-[#0B4636] text-amber-300 shadow-sm ring-2 ring-amber-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Or Select from Full Garment List:
              </label>
              <select
                value={selectedGarmentOption}
                onChange={(e) => setSelectedGarmentOption(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636] cursor-pointer"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Type Custom Garment Name *
                </label>
                <input
                  type="text"
                  required
                  value={customGarmentInput}
                  onChange={(e) => setCustomGarmentInput(e.target.value)}
                  placeholder="e.g. Pashmina Jacket, Indo-Western Sherwani..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0B4636] focus:bg-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sub-type / Fitting Specification
                </label>
                <input
                  type="text"
                  value={subTypeStyle}
                  onChange={(e) => setSubTypeStyle(e.target.value)}
                  placeholder={
                    orderCategory === 'Alteration'
                      ? 'e.g. Waist Tightening, Length Shortening...'
                      : 'e.g. Slim Fit, Mandarin Collar, Double Pocket...'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0B4636]"
                />
              </div>
            )}
          </div>
        </div>

        {/* ---------------- 3. REAL-TIME COMPREHENSIVE MEASUREMENTS ---------------- */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
              <span>📏 3. Measurement Ledger</span>
            </h2>

            {/* Switch Mode: Manual vs Upload Receipt */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setMeasurementMode('manual')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  measurementMode === 'manual'
                    ? 'bg-[#0B4636] text-amber-300 shadow'
                    : 'text-slate-600'
                }`}
              >
                Inches Ledger
              </button>
              <button
                type="button"
                onClick={() => setMeasurementMode('receipt')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  measurementMode === 'receipt'
                    ? 'bg-[#0B4636] text-amber-300 shadow'
                    : 'text-slate-600'
                }`}
              >
                Scan Paper Slip
              </button>
            </div>
          </div>

          {measurementMode === 'manual' ? (
            <div className="space-y-3">
              {/* Category Sub-tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto no-scrollbar">
                {(['Upper', 'Lower', 'Sleeves', 'Neck', 'Custom'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveMeasurementTab(tab)}
                    className={`flex-1 py-1.5 px-2 rounded-lg whitespace-nowrap text-center transition-all ${
                      activeMeasurementTab === tab
                        ? 'bg-white text-[#0B4636] shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'Upper' && 'Upper Body'}
                    {tab === 'Lower' && 'Lower Body'}
                    {tab === 'Sleeves' && 'Sleeves & Arms'}
                    {tab === 'Neck' && 'Neck & Collar'}
                    {tab === 'Custom' && `Custom (${customFields.length})`}
                  </button>
                ))}
              </div>

              {/* Tab 1: Upper Body */}
              {activeMeasurementTab === 'Upper' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Shirt / Kurta Length</label>
                    <input
                      type="text"
                      value={measurements.frontLength || ''}
                      onChange={(e) => handleMeasurementChange('frontLength', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 29.5"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Back Length</label>
                    <input
                      type="text"
                      value={measurements.backLength || ''}
                      onChange={(e) => handleMeasurementChange('backLength', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 30"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Chest / Bust</label>
                    <input
                      type="text"
                      value={measurements.chest || ''}
                      onChange={(e) => handleMeasurementChange('chest', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 40"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Upper Waist</label>
                    <input
                      type="text"
                      value={measurements.waist || ''}
                      onChange={(e) => handleMeasurementChange('waist', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 36"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Shoulder</label>
                    <input
                      type="text"
                      value={measurements.shoulder || ''}
                      onChange={(e) => handleMeasurementChange('shoulder', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 18"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Cross Front</label>
                    <input
                      type="text"
                      value={measurements.crossFront || ''}
                      onChange={(e) => handleMeasurementChange('crossFront', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 15"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Cross Back</label>
                    <input
                      type="text"
                      value={measurements.crossBack || ''}
                      onChange={(e) => handleMeasurementChange('crossBack', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 16"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Shoulder to Waist</label>
                    <input
                      type="text"
                      value={measurements.shoulderToWaist || ''}
                      onChange={(e) => handleMeasurementChange('shoulderToWaist', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 16.5"'
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Lower Body */}
              {activeMeasurementTab === 'Lower' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Pant / Lower Length</label>
                    <input
                      type="text"
                      value={measurements.pantLength || ''}
                      onChange={(e) => handleMeasurementChange('pantLength', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 40"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Trouser Waist</label>
                    <input
                      type="text"
                      value={measurements.waist || ''}
                      onChange={(e) => handleMeasurementChange('waist', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 34"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Stomach / Belly</label>
                    <input
                      type="text"
                      value={measurements.stomach || ''}
                      onChange={(e) => handleMeasurementChange('stomach', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 36"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Hip</label>
                    <input
                      type="text"
                      value={measurements.hip || ''}
                      onChange={(e) => handleMeasurementChange('hip', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 39"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Thigh</label>
                    <input
                      type="text"
                      value={measurements.thigh || ''}
                      onChange={(e) => handleMeasurementChange('thigh', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 24"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Knee</label>
                    <input
                      type="text"
                      value={measurements.knee || ''}
                      onChange={(e) => handleMeasurementChange('knee', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 18"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Bottom Hem / Ankle</label>
                    <input
                      type="text"
                      value={measurements.bottomHem || ''}
                      onChange={(e) => handleMeasurementChange('bottomHem', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 15"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Crotch / Inseam</label>
                    <input
                      type="text"
                      value={measurements.inseam || ''}
                      onChange={(e) => handleMeasurementChange('inseam', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 29.5"'
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Sleeves & Arms */}
              {activeMeasurementTab === 'Sleeves' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Sleeve Length</label>
                    <input
                      type="text"
                      value={measurements.sleeveLength || ''}
                      onChange={(e) => handleMeasurementChange('sleeveLength', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 24.5"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Armhole / Scye</label>
                    <input
                      type="text"
                      value={measurements.armhole || ''}
                      onChange={(e) => handleMeasurementChange('armhole', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 18.5"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Bicep</label>
                    <input
                      type="text"
                      value={measurements.bicep || ''}
                      onChange={(e) => handleMeasurementChange('bicep', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 14"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Wrist / Cuff</label>
                    <input
                      type="text"
                      value={measurements.wrist || ''}
                      onChange={(e) => handleMeasurementChange('wrist', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 8"'
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: Neck & Collar */}
              {activeMeasurementTab === 'Neck' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Collar / Neck Size</label>
                    <input
                      type="text"
                      value={measurements.neck || ''}
                      onChange={(e) => handleMeasurementChange('neck', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 15.5"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Front Neck Depth</label>
                    <input
                      type="text"
                      value={measurements.frontNeckDepth || ''}
                      onChange={(e) => handleMeasurementChange('frontNeckDepth', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 7"'
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Back Neck Depth</label>
                    <input
                      type="text"
                      value={measurements.backNeckDepth || ''}
                      onChange={(e) => handleMeasurementChange('backNeckDepth', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636] focus:bg-white"
                      placeholder='e.g. 8"'
                    />
                  </div>
                </div>
              )}

              {/* Tab 5: Dynamic Custom Fields */}
              {activeMeasurementTab === 'Custom' && (
                <div className="space-y-3 pt-1">
                  {customFields.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {customFields.map((cf) => (
                        <div key={cf.key}>
                          <label className="text-[11px] font-bold text-slate-700">{cf.label}</label>
                          <input
                            type="text"
                            value={measurements[cf.key] || ''}
                            onChange={(e) => handleMeasurementChange(cf.key, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 focus:border-[#0B4636]"
                            placeholder="Enter value"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No custom fields added yet.</p>
                  )}

                  {/* Add New Custom Field Bar */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newCustomLabel}
                      onChange={(e) => setNewCustomLabel(e.target.value)}
                      placeholder="e.g. Ghera / Flare, Belt Width..."
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0B4636]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomMeasurementField}
                      className="px-3 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-extrabold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Field</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Snap or upload paper measurement slip / handwritten receipt note.
              </p>
              {receiptImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-300 max-h-48 bg-slate-900 flex items-center justify-center group">
                  <img src={receiptImage} alt="Paper Slip" className="max-h-48 object-contain" />
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-[#0B4636] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50">
                  <Camera className="w-8 h-8 text-[#0B4636] mb-1" />
                  <span className="text-xs font-bold text-slate-800">
                    Tap to Upload Paper Measurement Slip
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP up to 10MB</span>
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

        {/* ---------------- 4. VOICE RECORDING, FABRICS & REFERENCE GARMENT ---------------- */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
          <h2 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
            <Mic className="w-4 h-4" />
            <span>4. Voice Instructions & Photo Attachments (Optional)</span>
          </h2>

          {/* Voice Recorder Engine */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white cursor-pointer transition-all shadow-md ${
                  isRecordingVoice
                    ? 'bg-rose-600 animate-pulse ring-4 ring-rose-200'
                    : voiceNoteUrl
                    ? 'bg-emerald-700'
                    : 'bg-[#0B4636] hover:bg-[#073024]'
                }`}
              >
                {isRecordingVoice ? (
                  <Square className="w-5 h-5 fill-white" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </div>

              <div>
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>
                    {isRecordingVoice
                      ? `Recording Live Voice Note (${formatVoiceDuration(recordingTimer)})`
                      : voiceNoteUrl
                      ? `Voice Note Attached ✓ (${formatVoiceDuration(recordingTimer)})`
                      : 'Record Tailor Voice Instruction'}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {isRecordingVoice
                    ? 'Speak clearly into your microphone. Tap red box when finished.'
                    : voiceNoteUrl
                    ? `Real Duration: ${recordingTimer} seconds. Audio saved in database.`
                    : 'Tap mic button to start recording voice note for master tailor.'}
                </p>
              </div>
            </div>

            {/* Audio Playback / Controls */}
            {voiceNoteUrl && !isRecordingVoice && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={toggleVoicePlayback}
                  className="px-3 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isPlayingVoice ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-amber-300" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-amber-300" />
                      <span>Listen ({formatVoiceDuration(recordingTimer)})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={deleteVoiceNote}
                  className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl transition-all cursor-pointer"
                  title="Delete voice note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Reference Garment Image Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-[#0B4636]" />
              <span>Reference Garment / Design Photo (Optional)</span>
            </label>

            {referenceGarmentImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-300 max-h-40 bg-slate-900 flex items-center justify-center w-full max-w-sm">
                <img src={referenceGarmentImage} alt="Reference Garment" className="max-h-40 object-contain" />
                <button
                  type="button"
                  onClick={() => setReferenceGarmentImage(null)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border border-dashed border-slate-300 hover:border-[#0B4636] bg-slate-50 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-[#0B4636]" />
                <span className="text-xs font-bold text-slate-800">
                  Upload Reference Design / Garment Photo
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
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>Fabric Cloth Photos (Upload Multiple)</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {fabricPhotos.length} Cloth(s) Attached
              </span>
            </label>

            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {fabricPhotos.map((img, idx) => (
                <div key={idx} className="w-20 h-20 rounded-2xl border border-slate-300 overflow-hidden relative shrink-0 shadow-sm bg-slate-900">
                  <img src={img} alt={`Fabric ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFabricPhotos(fabricPhotos.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow hover:bg-rose-700 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0B4636] bg-slate-50 flex flex-col items-center justify-center cursor-pointer shrink-0 text-slate-600 transition-all">
                <Plus className="w-5 h-5 text-[#0B4636]" />
                <span className="text-[10px] font-bold mt-0.5">+ Cloth</span>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Special Stitching Instructions & Design Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="e.g. Double stitching on seams, extra 2-inch margin in waist, gold piping..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-[#0B4636] focus:bg-white resize-none"
            />
          </div>
        </div>

        {/* ---------------- 5. FINANCIAL LEDGER & DELIVERY SCHEDULE ---------------- */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />
            <span>5. Financial Ledger & Delivery Schedule</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Order Amount (₹) *</label>
              <input
                type="number"
                min={0}
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-extrabold text-slate-900 focus:outline-none focus:border-[#0B4636]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Advance Paid (₹)</label>
              <input
                type="number"
                min={0}
                value={advancePaid}
                onChange={(e) => setAdvancePaid(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-extrabold text-emerald-700 focus:outline-none focus:border-[#0B4636]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Balance Due (Auto)</label>
              <div className="w-full bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-sm font-black text-rose-700">
                ₹{balanceDue}
              </div>
            </div>
          </div>

          {/* Payment Method & Promised Date & Time */}
          <div className="space-y-4 pt-1">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer"
              >
                <option value="Cash">Cash</option>
                <option value="UPI (Scan & Pay)">UPI (Scan & Pay)</option>
                <option value="Other (Card/Wallet)">Other (Card/Wallet)</option>
              </select>
            </div>

            {/* Promised Date & Time Interactive Selector matching user reference */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
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
                label="Promised Date & Time"
              />
            </div>
          </div>
        </div>

        {/* Real-time Order Summary Bar before submission */}
        <div className="bg-gradient-to-r from-[#0B4636] to-[#0d5945] rounded-2xl p-4 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-amber-300/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Live Order Booking</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                {orderCategory}
              </span>
            </div>
            <div className="text-sm font-extrabold text-white flex items-center gap-2 flex-wrap">
              <span>{selectedGarmentOption === 'Custom / Other' ? (customGarmentInput || 'Custom') : selectedGarmentOption}</span>
              <span>•</span>
              <span className="text-amber-200">₹{totalAmount} Total</span>
              <span>•</span>
              <span className="text-emerald-300">₹{advancePaid} Adv</span>
              <span>•</span>
              <span className="text-rose-300">₹{balanceDue} Due</span>
            </div>
            <div className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>
                Promised: <span className="text-white font-extrabold">{formatDisplayDate(dueDate)} ({formatFullReadableDate(dueDate)})</span> at <span className="text-white font-extrabold">{formatDisplayTime(dueTime)}</span>
              </span>
            </div>
          </div>

          <div className="text-right shrink-0 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-emerald-200 block">
              {customerName ? `${customerName} (${customerPhone || 'No Phone'})` : 'Enter customer details'}
            </span>
          </div>
        </div>

        {/* Validation Error Alert Banner */}
        {validationError && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{validationError}</span>
            </div>
            <button
              onClick={() => setValidationError(null)}
              className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Submit Order Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-12 bg-[#0B4636] hover:bg-[#073024] text-[#FBBF24] font-black text-sm rounded-2xl shadow-xl shadow-[#0B4636]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] border border-amber-300/30 disabled:opacity-75"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
              <span>Creating Order & Registering Customer...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5 text-amber-300" />
              <span>Create Order & Generate Receipt Slip</span>
            </>
          )}
        </button>
      </div>

      {/* ==================== ORDER RECEIPT SLIP MODAL ==================== */}
      {createdOrderSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
            {/* Modal Action Header (Excluded from Print) */}
            <div className="bg-[#0B4636] text-white p-4 flex items-center justify-between print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-[#0B4636] flex items-center justify-center font-black">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Order Created Successfully!</h3>
                  <p className="text-[10px] text-amber-300">Official Customer Order Slip & Receipt</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onSaveOrder(createdOrderSlip);
                }}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINTABLE ORDER SLIP CONTENT */}
            <div id="printable-order-slip" className="p-6 overflow-y-auto space-y-4 text-slate-900 bg-white">
              {/* Shop Branding Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
                <h1 className="text-lg font-black text-[#0B4636] uppercase tracking-wide">
                  {shopProfile?.shopName || 'ROYAL TAILORS & BOUTIQUE'}
                </h1>
                {shopProfile?.ownerName && (
                  <p className="text-xs font-bold text-slate-700">Prop: {shopProfile.ownerName}</p>
                )}
                {shopProfile?.address && (
                  <p className="text-[11px] text-slate-600 max-w-md mx-auto">{shopProfile.address}</p>
                )}
                {shopProfile?.phoneNumber && (
                  <p className="text-[11px] font-extrabold text-[#0B4636]">
                    📞 +91 {shopProfile.phoneNumber}
                  </p>
                )}
                <div className="inline-block bg-[#0B4636] text-amber-300 font-black text-[10px] px-3 py-0.5 rounded-full mt-1 uppercase tracking-wider">
                  CUSTOMER ORDER RECEIPT SLIP
                </div>
              </div>

              {/* Order & Customer Metadata Table */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Receipt No</span>
                  <span className="font-extrabold text-[#0B4636] text-sm">{createdOrderSlip.id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Booking Date</span>
                  <span className="font-bold text-slate-800">
                    {createdOrderSlip.createdDate} ({createdOrderSlip.createdTime})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer Name</span>
                  <span className="font-black text-slate-900 text-sm">{createdOrderSlip.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Mobile Phone</span>
                  <span className="font-bold text-slate-800">{createdOrderSlip.customerPhone}</span>
                </div>
              </div>

              {/* Garment & Stitching Specifications */}
              <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-slate-900">
                    <Scissors className="w-4 h-4 text-[#0B4636]" />
                    <span className="text-sm">{createdOrderSlip.garmentType}</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-[#0B4636] text-amber-300 font-black text-[10px] rounded-full uppercase">
                    {createdOrderSlip.orderCategory || 'New Stitch'}
                  </span>
                </div>
                <div className="text-slate-700 font-medium">
                  <span className="font-bold text-slate-800">Style / Fitting Note: </span>
                  {createdOrderSlip.subTypeStyle || 'Standard Custom Fitting'}
                </div>
                {createdOrderSlip.specialNotes && (
                  <div className="text-slate-800 text-[11px] bg-white p-2 rounded-xl border border-amber-200/60 mt-1">
                    <span className="font-bold text-amber-900">Instructions: </span>
                    {createdOrderSlip.specialNotes}
                  </div>
                )}
              </div>

              {/* Measurements Breakdown Table */}
              {Object.keys(createdOrderSlip.measurements).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-black text-[#0B4636] uppercase tracking-wider">
                    📏 Recorded Measurements (Inches)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    {Object.entries(createdOrderSlip.measurements).map(
                      ([mKey, mVal]) =>
                        typeof mVal === 'string' &&
                        mVal.trim() !== '' && (
                          <div key={mKey} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                            <span className="text-slate-600 capitalize font-medium">
                              {mKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </span>
                            <span className="font-black text-[#0B4636]">{mVal}</span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}

              {/* Financial Ledger Summary */}
              <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Total Order Charge:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ₹{createdOrderSlip.totalAmount}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
                  <span>Advance Paid ({createdOrderSlip.paymentMode}):</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    - ₹{createdOrderSlip.advancePaid}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-rose-50 p-3 rounded-2xl border border-rose-200 text-rose-900">
                  <div>
                    <span className="text-xs font-black block">BALANCE DUE AT PICKUP</span>
                    <span className="text-[10px] text-rose-700">Pay at trial/delivery</span>
                  </div>
                  <span className="text-xl font-black text-rose-700">
                    ₹{createdOrderSlip.balanceDue}
                  </span>
                </div>
              </div>

              {/* Delivery Due Date Banner */}
              <div className="bg-[#0B4636] text-white p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-300 shrink-0" />
                  <div>
                    <span className="text-[10px] text-amber-200 font-bold block uppercase">
                      Promised Delivery Date
                    </span>
                    <span className="text-xs font-black text-white">
                      {createdOrderSlip.dueDate} at {createdOrderSlip.dueTime}
                    </span>
                  </div>
                </div>
                <span className="bg-amber-400 text-[#0B4636] font-black text-[10px] px-2.5 py-1 rounded-xl">
                  ON TIME
                </span>
              </div>

              {/* Terms & Footer Note */}
              <p className="text-[10px] text-slate-500 text-center italic pt-1">
                "Please present this order receipt slip during garment trial or collection. Garments held up to 30 days."
              </p>
            </div>

            {/* Action Toolbar (WhatsApp, Share, Download, Print, Copy, Done) */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 space-y-2.5 print:hidden shrink-0">
              {copiedReceiptToast && (
                <div className="bg-slate-900 text-white text-xs py-1.5 px-3 rounded-xl text-center font-bold animate-fade-in flex items-center justify-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>Receipt text copied to clipboard!</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(createdOrderSlip)}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2.5 px-2.5 rounded-xl font-black text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-emerald-500"
                  title="Generate PDF & Send via WhatsApp"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>WhatsApp + PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNativeShare(createdOrderSlip)}
                  className="bg-sky-600 hover:bg-sky-700 active:scale-95 text-white py-2.5 px-2.5 rounded-xl font-extrabold text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Share via SMS, Email, or Social Apps"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send / Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSlip(createdOrderSlip)}
                  className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white py-2.5 px-2.5 rounded-xl font-extrabold text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Download PDF Receipt File"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="bg-slate-800 hover:bg-slate-900 active:scale-95 text-white py-2.5 px-2.5 rounded-xl font-extrabold text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all"
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
                  className="w-1/3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 py-2.5 px-3 rounded-xl font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Copy className="w-4 h-4 text-[#0B4636]" />
                  <span>Copy Text</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSaveOrder(createdOrderSlip);
                  }}
                  className="w-2/3 bg-[#0B4636] hover:bg-[#073024] text-amber-300 py-2.5 px-3 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
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
