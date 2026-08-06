import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Upload,
  X,
  ArrowLeft,
  ChevronDown,
  RefreshCw,
  Check,
  Download,
  Shirt,
  User,
  AlertCircle,
  Eye,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { Product } from '../types';

interface VirtualTryOnStudioProps {
  isOpen: boolean;
  onClose: () => void;
  garmentProduct: Product | null;
  garmentImageUrl: string;
  onApplyGeneratedImage?: (newImageUrl: string) => void;
}

// Sample presets for instant 1-click test
const SAMPLE_MODELS = [
  {
    id: 'sample-female',
    name: 'Female Model',
    gender: 'Women',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'sample-male',
    name: 'Male Model',
    gender: 'Men',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'sample-unisex',
    name: 'Streetwear Model',
    gender: 'Unisex',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80'
  }
];

export const VirtualTryOnStudio: React.FC<VirtualTryOnStudioProps> = ({
  isOpen,
  onClose,
  garmentProduct,
  garmentImageUrl,
  onApplyGeneratedImage
}) => {
  const [userImageBase64, setUserImageBase64] = useState<string | null>(null);
  const [userImagePreviewUrl, setUserImagePreviewUrl] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('GEMINI_CUSTOM_TRYON_KEY') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const handleShare = async () => {
    if (!resultImageUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ShopScoper AI Try-On',
          text: 'Check out my AI Virtual Try-On photo!',
          url: window.location.href
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      // Ignore
    }
  };

  if (!isOpen) return null;

  // Convert uploaded file to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSelectedSampleId(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUserImagePreviewUrl(result);
      // Strip header
      const base64Clean = result.replace(/^data:image\/\w+;base64,/, '');
      setUserImageBase64(base64Clean);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file. Please try a different photo.');
    };
    reader.readAsDataURL(file);
  };

  // Select sample preset model
  const handleSelectSampleModel = async (sample: typeof SAMPLE_MODELS[0]) => {
    setErrorMsg(null);
    setSelectedSampleId(sample.id);
    setUserImagePreviewUrl(sample.url);

    try {
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Clean = result.replace(/^data:image\/\w+;base64,/, '');
        setUserImageBase64(base64Clean);
      };
      reader.readAsDataURL(blob);
    } catch {
      setErrorMsg('Failed to load sample image. Please upload your photo.');
    }
  };

  // Convert image URL to Base64
  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.replace(/^data:image\/\w+;base64,/, ''));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Trigger Gemini AI Virtual Try-On
  const handleGenerateTryOn = async () => {
    if (!userImageBase64) {
      setErrorMsg('Please upload a photo or select a sample model first.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setResultImageUrl(null);
    setGenerationStep('Preparing Virtual Try-On...');

    try {
      // Step 1: Prepare garment base64 if possible
      let garmentBase64 = '';
      try {
        garmentBase64 = await fetchImageAsBase64(garmentImageUrl);
      } catch {
        console.warn('Notice converting garment image to base64, server will fetch directly.');
      }

      if (customApiKey.trim()) {
        localStorage.setItem('GEMINI_CUSTOM_TRYON_KEY', customApiKey.trim());
      }

      setGenerationStep('Generating your Virtual Try-On photo...');

      // Call Express server endpoint
      const res = await fetch('/api/try-on', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userImageBase64: userImageBase64,
          garmentImageBase64: garmentBase64 || undefined,
          garmentImageUrl: garmentImageUrl,
          customApiKey: customApiKey.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 429 || data.error?.includes('429') || data.error?.includes('quota')) {
          setShowKeyInput(true);
        }
        throw new Error(data.error || 'Failed to generate Virtual Try-On photo.');
      }

      setResultImageUrl(data.resultImageUrl);
      setGenerationStep('Virtual Try-On complete!');
    } catch (err: any) {
      console.error('Try-On Generation Error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred during AI processing.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-lg bg-[#F6F5FB] rounded-[28px] p-4 sm:p-6 shadow-2xl border border-purple-100/60 overflow-hidden my-auto text-slate-900 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white shadow-xs border border-slate-100/80 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6C3BFF] fill-[#6C3BFF]/20" />
            <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#6C3BFF] via-[#8B5CFF] to-[#FF2D55] bg-clip-text text-transparent tracking-tight">
              Try-On
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white shadow-xs border border-slate-100/80 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-center text-xs font-medium text-slate-500 mt-1 mb-3">
          Upload your photo and see how the garment looks on you.
        </p>

        {/* Custom API Key Collapsible Panel (Optional) */}
        {showKeyInput && (
          <div className="mb-3 p-2.5 bg-purple-50/80 rounded-2xl border border-purple-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span className="text-xs font-mono font-bold text-purple-900 shrink-0">Gemini Key:</span>
            <input
              type="password"
              placeholder="Paste custom Gemini API key..."
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.value || e.target.value)}
              className="flex-1 px-3 py-1 rounded-xl border border-purple-200 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {customApiKey && (
              <button
                onClick={() => {
                  setCustomApiKey('');
                  localStorage.removeItem('GEMINI_CUSTOM_TRYON_KEY');
                }}
                className="text-[11px] font-mono text-red-600 hover:underline px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Main Content Body */}
        <div className="space-y-3 max-h-[80vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5">
          
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* If Result Image exists, show Generated Showcase */}
          {resultImageUrl ? (
            <div className="flex flex-col items-center space-y-3 text-center bg-white rounded-3xl p-4 border border-purple-50/80 shadow-xs">
              <div className="relative rounded-2xl overflow-hidden border border-purple-100 shadow-md bg-slate-900 max-w-xs w-full aspect-[3/4]">
                <img
                  src={resultImageUrl}
                  alt="AI Virtual Try-On Result"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span>Gemini AI Generated</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-xs">
                {onApplyGeneratedImage && (
                  <button
                    onClick={() => {
                      onApplyGeneratedImage(resultImageUrl);
                      onClose();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#6C3BFF] hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Apply</span>
                  </button>
                )}

                <a
                  href={resultImageUrl}
                  download={`ShopScoper-TryOn-${garmentProduct?.brand || 'Style'}.jpg`}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save</span>
                </a>

                <button
                  onClick={handleShare}
                  className="py-2.5 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#6C3BFF] font-extrabold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedShare ? 'Copied!' : 'Share'}</span>
                </button>

                <button
                  onClick={() => setResultImageUrl(null)}
                  className="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-slate-700 font-extrabold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          ) : (
            /* Mode Selection: Selected Garment & Upload Your Image */
            <div className="space-y-3">
              
              {/* Card 1: Selected Garment */}
              <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-purple-50/80 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs sm:text-sm">
                  <Shirt className="w-4 h-4 text-[#6C3BFF]" />
                  <span>Selected Garment</span>
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Garment Image */}
                  <div className="w-20 sm:w-24 h-24 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-2xs shrink-0">
                    <img
                      src={garmentImageUrl}
                      alt={garmentProduct?.name || 'Garment'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Garment Info & Dropdown */}
                  <div className="flex-1 space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                      {garmentProduct?.name || 'Polo T-shirt'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">
                      {garmentProduct?.brand || 'Stone Line Look'}
                    </p>

                    {/* Category / Name Selector Box */}
                    <div className="pt-1">
                      <div className="inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-purple-50/50 border border-purple-100/80 text-xs font-extrabold text-slate-800 w-full max-w-[180px]">
                        <span className="truncate">{garmentProduct?.name || 'Polo T-shirt'}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#6C3BFF] shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Upload Your Image */}
              <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-purple-50/80 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs sm:text-sm">
                  <User className="w-4 h-4 text-[#6C3BFF]" />
                  <span>Upload Your Image</span>
                </div>

                <label className="relative flex flex-col items-center justify-center p-3 sm:p-4 border-2 border-dashed border-purple-200/80 hover:border-[#6C3BFF] rounded-2xl bg-[#FAF9FE] hover:bg-purple-50/30 cursor-pointer transition-all text-center min-h-[140px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {userImagePreviewUrl ? (
                    <div className="relative w-full max-w-[200px] sm:max-w-[220px] h-32 sm:h-36 rounded-2xl overflow-hidden shadow-2xs border border-purple-100">
                      <img
                        src={userImagePreviewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-bold gap-1.5">
                        <Upload className="w-4 h-4" />
                        <span>Change Photo</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-2">
                      <div className="w-11 h-11 rounded-full bg-purple-100/80 text-[#6C3BFF] flex items-center justify-center mb-2 shadow-2xs">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm mb-0.5">
                        Upload your Image
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        JPG, PNG or WebP
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        (Max 10MB)
                      </span>
                    </div>
                  )}
                </label>


              </div>

              {/* Bottom Try-On Action Button */}
              <button
                onClick={handleGenerateTryOn}
                disabled={!userImageBase64 || isGenerating}
                className={`w-full py-3.5 px-5 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  !userImageBase64 || isGenerating
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-[#6C3BFF] via-[#8B5CFF] to-[#FF2D55] hover:opacity-95 text-white shadow-purple-500/25 active:scale-[0.99]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>Processing Try-On...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-white fill-white/20" />
                    <span>Try-On</span>
                  </>
                )}
              </button>

              {isGenerating && (
                <p className="text-xs font-semibold text-center text-[#6C3BFF] animate-pulse">
                  {generationStep}
                </p>
              )}

            </div>
          )}

        </div>

      </motion.div>
    </div>
  );
};
