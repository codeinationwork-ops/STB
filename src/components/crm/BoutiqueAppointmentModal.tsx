import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Check,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Search,
  CheckCircle2,
  Loader2,
  UserPlus,
  Scissors,
} from 'lucide-react';
import { BoutiqueAppointment, TailorOrder, AppointmentType } from '../../types';
import { useLanguage } from '../../lib/LanguageContext';
import { clean10DigitPhone, sanitizePhoneInput } from '../../lib/phoneUtils';
import { getLocalDateStr, getOffsetDateStr, normalizeDateStr } from '../../lib/dateUtils';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { roomDb, sanitizeForFirestore } from '../../lib/localRoomDb';

interface BoutiqueAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAppointment: (appt: BoutiqueAppointment) => Promise<void> | void;
  orders?: TailorOrder[];
  existingAppointment?: BoutiqueAppointment | null;
}

export const BoutiqueAppointmentModal: React.FC<BoutiqueAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSaveAppointment,
  orders = [],
  existingAppointment,
}) => {
  const { t } = useLanguage();

  const todayStr = useMemo(() => getLocalDateStr(), []);

  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState('11:30 AM');
  const [apptType, setApptType] = useState<AppointmentType>('Trial & Fitting');
  const [otherPurposeNotes, setOtherPurposeNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Customer search state (direct from Firestore customer collection in default database)
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchStatus, setSearchStatus] = useState<{ found: boolean; message: string } | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState<string | undefined>(undefined);

  // Voice Note state
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [voiceNoteDuration, setVoiceNoteDuration] = useState<number>(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingTimer, setRecordingTimer] = useState<number>(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Search Customer directly from Firestore default database (customer collection)
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
      // 1. Direct Firestore default database lookup (single canonical 'customers' collection)
      const custId = `cust_${cleanDigits}`;
      let custSnap = await getDoc(doc(db, 'customers', custId)).catch(() => null);
      if (!custSnap || !custSnap.exists()) {
        custSnap = await getDoc(doc(db, 'customers', cleanDigits)).catch(() => null);
      }

      let foundData: any = null;

      if (custSnap && custSnap.exists()) {
        foundData = custSnap.data();
      }

      if (foundData && foundData.name) {
        setCustomerName(foundData.name);
        if (foundData.phone) {
          setCustomerPhone(clean10DigitPhone(foundData.phone));
        }
        setSearchStatus({
          found: true,
          message: `Existing Client Found in Database: ${foundData.name}`,
        });
      } else {
        setSearchStatus({
          found: false,
          message: 'New customer! Name and number will be saved to database on booking.',
        });
      }
    } catch (e) {
      console.warn('Customer search notice:', e);
      setSearchStatus({
        found: false,
        message: 'Ready for new client details.',
      });
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  // Initialize or reset when opened
  useEffect(() => {
    if (isOpen) {
      if (existingAppointment) {
        setCustomerName(existingAppointment.customerName || '');
        setCustomerPhone(clean10DigitPhone(existingAppointment.customerPhone || ''));
        setDate(existingAppointment.date || todayStr);
        setTime(existingAppointment.time || '11:30 AM');
        setApptType(existingAppointment.type || 'Trial & Fitting');
        setOtherPurposeNotes(existingAppointment.notes || '');
        setVoiceNoteUrl(existingAppointment.voiceNoteUrl || null);
        setVoiceNoteDuration(existingAppointment.voiceNoteDuration || 0);
        setLinkedOrderId(existingAppointment.orderId);
        setSearchStatus(null);
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setDate(todayStr);
        setTime('11:30 AM');
        setApptType('Trial & Fitting');
        setOtherPurposeNotes('');
        setVoiceNoteUrl(null);
        setVoiceNoteDuration(0);
        setLinkedOrderId(undefined);
        setSearchStatus(null);
      }
      setIsRecordingVoice(false);
      setRecordingTimer(0);
      setIsPlayingVoice(false);
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
        audioPlaybackRef.current = null;
      }
      setIsRecordingVoice(false);
      setRecordingTimer(0);
      setIsPlayingVoice(false);
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
        audioPlaybackRef.current = null;
      }
    }
  }, [isOpen, existingAppointment]);

  // Clean up audio playback on unmount or close
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
    };
  }, []);

  if (!isOpen) return null;

  // Format mm:ss
  const formatVoiceDuration = (totalSec: number) => {
    if (!totalSec || totalSec <= 0) return '0:00';
    const mins = Math.floor(totalSec / 60);
    const secs = Math.round(totalSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Start recording voice note
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

          const tempAudio = new Audio(base64Audio);
          tempAudio.onloadedmetadata = () => {
            if (tempAudio.duration && isFinite(tempAudio.duration) && tempAudio.duration > 0) {
              const dur = Math.round(tempAudio.duration);
              setVoiceNoteDuration(dur);
              setRecordingTimer(dur);
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
      alert('Unable to access microphone. Please allow microphone permissions in your browser.');
    }
  };

  // Stop recording voice note
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Toggle voice playback
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
      audioPlaybackRef.current
        .play()
        .then(() => setIsPlayingVoice(true))
        .catch((err) => {
          console.error('Audio play error:', err);
          setIsPlayingVoice(false);
        });
    }
  };

  // Delete voice note
  const deleteVoiceNote = () => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current = null;
    }
    setVoiceNoteUrl(null);
    setVoiceNoteDuration(0);
    setIsPlayingVoice(false);
    setRecordingTimer(0);
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = sanitizePhoneInput(val);
    setCustomerPhone(cleaned);
    if (cleaned.length === 10) {
      handleSearchCustomer(cleaned);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setSaveError('Please enter the customer name');
      return;
    }

    const cleanedDigits = clean10DigitPhone(customerPhone);
    const finalPhone = cleanedDigits.length === 10 ? `+91 ${cleanedDigits}` : (customerPhone.trim() || '+91 9876543210');
    const normalizedDate = normalizeDateStr(date) || todayStr;
    const custId = cleanedDigits.length >= 5 ? `cust_${cleanedDigits}` : `cust-${Date.now()}`;

    setIsSaving(true);
    setSaveError(null);

    try {
      // 1. Check if customer exists in Firestore customers collection (Default Database)
      let resolvedCustomerId = custId;
      let existingCustDoc: any = null;

      if (cleanedDigits.length >= 5) {
        let custSnap = await getDoc(doc(db, 'customers', custId)).catch(() => null);
        if (!custSnap || !custSnap.exists()) {
          custSnap = await getDoc(doc(db, 'customers', cleanedDigits)).catch(() => null);
        }

        if (custSnap && custSnap.exists()) {
          existingCustDoc = custSnap.data();
          resolvedCustomerId = custSnap.id || custId;
          // Update last appointment date in single 'customers' database collection
          const updateData = sanitizeForFirestore({
            lastAppointmentDate: normalizedDate,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(db, 'customers', resolvedCustomerId), updateData, { merge: true }).catch(() => {});
        } else {
          // Customer does NOT exist -> Save name and number to single 'customers' collection
          const newCustRecord = sanitizeForFirestore({
            id: custId,
            name: customerName.trim(),
            phone: finalPhone,
            cleanPhone: cleanedDigits || null,
            isRepeat: false,
            ordersCount: 0,
            totalSpent: 0,
            gender: 'Female',
            lastAppointmentDate: normalizedDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(db, 'customers', custId), newCustRecord, { merge: true });
        }
        // Remove from legacy customer singular collection if exists
        await deleteDoc(doc(db, 'customer', resolvedCustomerId)).catch(() => {});
        await deleteDoc(doc(db, 'customer', custId)).catch(() => {});
      }

      const newAppt: BoutiqueAppointment = {
        id: existingAppointment?.id || `appt-${Date.now()}`,
        appointmentId: existingAppointment?.id || `appt-${Date.now()}`,
        customerId: resolvedCustomerId,
        customerName: customerName.trim(),
        customerPhone: finalPhone,
        cleanPhone: cleanedDigits || undefined,
        date: normalizedDate,
        time,
        orderId: linkedOrderId || existingAppointment?.orderId || undefined,
        notes: apptType === 'Others' ? (otherPurposeNotes.trim() || 'Others') : (existingAppointment?.notes || ''),
        voiceNoteUrl: voiceNoteUrl || null,
        voiceNoteDuration: voiceNoteDuration || (recordingTimer > 0 ? recordingTimer : undefined),
        type: apptType,
        garmentReady: existingAppointment?.garmentReady ?? false,
        accessoriesReady: existingAppointment?.accessoriesReady ?? false,
        measurementsLoaded: existingAppointment?.measurementsLoaded ?? true,
        status: existingAppointment?.status || 'Scheduled',
        createdAt: existingAppointment?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const sanitizedAppt = sanitizeForFirestore(newAppt);

      // 2. Save appointment to single Firestore collection: 'appointments'
      const apptDocRef = doc(db, 'appointments', newAppt.id);
      await setDoc(apptDocRef, sanitizedAppt, { merge: true });

      // Synchronize in-memory state and UI
      if (onSaveAppointment) {
        await onSaveAppointment(newAppt);
      } else {
        await roomDb.saveAppointment(newAppt);
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving appointment:', err);
      setSaveError(err?.message || 'Failed to save appointment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const timeSlots = ['10:30 AM', '12:00 PM', '02:30 PM', '04:00 PM', '05:30 PM', '07:00 PM'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn font-sans text-slate-900">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-emerald-900 flex items-center justify-center font-black shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">
                {existingAppointment ? t('appts.modalTitleEdit', 'Edit Appointment') : t('appts.addAppt', 'Add Appointment')}
              </h2>
              <p className="text-[11px] text-emerald-200 font-medium">
                Customer phone search, date, time & voice note
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {/* Customer Mobile Number with INLINE SEARCH (Exactly matching New Order format) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-700" />
                <span>10-Digit Mobile Number</span>
              </label>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  customerPhone.length === 10
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {customerPhone.length}/10 Digits
              </span>
            </div>

            <div
              className={`flex items-center gap-1 bg-slate-50 border rounded-xl p-1 focus-within:bg-white transition-all ${
                customerPhone.length === 10
                  ? 'border-emerald-500 focus-within:border-emerald-600'
                  : 'border-slate-300 focus-within:border-emerald-700'
              }`}
            >
              <span className="text-xs font-extrabold text-slate-600 px-2 border-r border-slate-300 select-none">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                maxLength={10}
                autoFocus
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-transparent px-2 py-1.5 text-xs font-bold text-slate-900 outline-none"
              />
              <button
                type="button"
                onClick={() => handleSearchCustomer()}
                disabled={isSearchingCustomer}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-2xs"
              >
                {isSearchingCustomer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              Enter 10 digits to search existing customer or add new.
            </p>
          </div>

          {/* Search Status Banner */}
          {searchStatus && (
            <div
              className={`p-2 rounded-xl border text-[11px] font-semibold flex items-center justify-between animate-fadeIn ${
                searchStatus.found
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {searchStatus.found ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span>{searchStatus.message}</span>
              </div>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-emerald-700" />
              <span>Customer Name *</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master Priya Sharma"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-700 outline-none"
            />
          </div>

          {/* Date & Quick Date Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-700" />
                <span>Appointment Date *</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${
                    normalizeDateStr(date) === todayStr
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getOffsetDateStr(1))}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${
                    normalizeDateStr(date) === getOffsetDateStr(1)
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getOffsetDateStr(3))}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${
                    normalizeDateStr(date) === getOffsetDateStr(3)
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  +3 Days
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-700 outline-none"
            />
          </div>

          {/* Time & Slot Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-700" />
              <span>Appointment Time *</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mb-1.5">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`py-1 px-1 rounded-lg text-[10px] font-bold text-center cursor-pointer transition-all border ${
                    time === slot
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs font-black'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. 11:30 AM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-700 outline-none"
            />
          </div>

          {/* Visit Purpose / Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Scissors className="w-3 h-3 text-emerald-700" />
              <span>Visit Purpose / Type *</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                'Trial & Fitting',
                'Bridal Consultation',
                'Final Pickup & Delivery',
                'Measurements',
                'Alteration',
                'Others',
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setApptType(t as AppointmentType)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-center cursor-pointer transition-all border ${
                    apptType === t
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs font-black'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {apptType === 'Others' && (
              <div className="mt-2 animate-fadeIn">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Specify Visit Purpose:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fabric selection, urgent fitting, jewelry check"
                  value={otherPurposeNotes}
                  onChange={(e) => setOtherPurposeNotes(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-700 outline-none"
                />
              </div>
            )}
          </div>

          {/* Voice Note (Optional) */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                <Mic className="w-3.5 h-3.5 text-emerald-700" />
                <span>Voice Note (Optional)</span>
              </label>
              {voiceNoteUrl && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" />
                  <span>Recorded ({formatVoiceDuration(voiceNoteDuration || recordingTimer)})</span>
                </span>
              )}
            </div>

            {!voiceNoteUrl ? (
              <div>
                {!isRecordingVoice ? (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="w-full py-2 px-3 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white text-emerald-900 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs hover:bg-emerald-50/50"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                      <Mic className="w-3 h-3" />
                    </div>
                    <span>Record Voice Note (Fitting details, requirements)</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-rose-50 border border-rose-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                      <span className="text-[11px] font-black text-rose-800">
                        Recording... {formatVoiceDuration(recordingTimer)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Done</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <button
                  type="button"
                  onClick={toggleVoicePlayback}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isPlayingVoice
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900'
                  }`}
                >
                  {isPlayingVoice ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Playing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Listen ({formatVoiceDuration(voiceNoteDuration || recordingTimer)})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={deleteVoiceNote}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                  title="Delete voice note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {saveError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
              {saveError}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-1.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Adding Appointment...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{existingAppointment ? 'Update Appointment' : 'Add Appointment'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
