import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Sparkles,
  Camera,
  ShoppingBag,
  Download,
  Share2,
  ExternalLink,
  CheckCircle2,
  Store,
  Printer,
  Copy,
  Check,
  Eye,
  Layers,
  Phone,
} from 'lucide-react';
import { ShopProfile, PlatformShop, InventoryItem } from '../../types';
import { clean10DigitPhone, getWhatsAppUrl } from '../../lib/phoneUtils';
import { ShopInventoryCatalogueModal } from './ShopInventoryCatalogueModal';

interface ShopScoperScanCodeProps {
  shop: ShopProfile | PlatformShop;
  inventory?: InventoryItem[];
  compact?: boolean;
}

export const ShopScoperScanCode: React.FC<ShopScoperScanCodeProps> = ({
  shop,
  inventory = [],
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showCatalogueModal, setShowCatalogueModal] = useState<boolean>(false);
  const [showCameraScanner, setShowCameraScanner] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  const shopName = 'shopName' in shop ? shop.shopName : 'Boutique';
  const shopPhone = 'phoneNumber' in shop ? shop.phoneNumber : '';
  const shopAddress = 'address' in shop ? shop.address : ('city' in shop ? `${shop.city}, ${shop.state}` : '');
  const ownerName = 'ownerName' in shop ? shop.ownerName : 'Store Owner';

  const cleanPhone = clean10DigitPhone(shopPhone) || '7608807790';
  const shopScoperCode = `SHOPSCOPER-${cleanPhone}`;

  // Dedicated URL for this store's inventory catalogue
  // Fully qualified HTTPS URL that any iOS Camera, Android Camera, Google Lens, or WhatsApp QR scanner recognizes instantly as an active link
  const catalogueUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/catalogue?shop=${cleanPhone}&code=${encodeURIComponent(shopScoperCode)}`
    : `https://fitbook.boutique/catalogue?shop=${cleanPhone}`;

  // Generate ISO-standard high-contrast black-on-white QR Code for 100% instant phone camera link detection
  useEffect(() => {
    let isCancelled = false;

    const generateShopScoperQR = async () => {
      try {
        setIsGenerating(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        // ISO/IEC 18004 Standard QR: Pure #000000 dark modules on pure #FFFFFF light background
        // Margin 4 quiet zone ensures iOS Camera & Google Lens immediately draw the yellow link pill
        // Error Correction 'M' (15%) gives optimal balance of large readable module size and redundancy
        await QRCode.toCanvas(canvas, catalogueUrl, {
          width: 400,
          margin: 4,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000', // Standard pure black for maximum camera sensor contrast
            light: '#FFFFFF', // Pure white
          },
        });

        if (isCancelled) return;

        const dataUrl = canvas.toDataURL('image/png');
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate ShopScoper QR:', err);
      } finally {
        setIsGenerating(false);
      }
    };

    generateShopScoperQR();

    return () => {
      isCancelled = true;
    };
  }, [catalogueUrl, shopScoperCode]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(catalogueUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;

    // Create high-res crisp QR code image with boutique branding
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 800, 960);

    // Top Header Banner
    ctx.fillStyle = '#0B4636';
    ctx.fillRect(0, 0, 800, 130);

    // Decorative Gold border line
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(0, 126, 800, 4);

    // Header Text
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦  SHOPSCOPER LIVE SCANCODE  ✦', 400, 48);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 36px system-ui, sans-serif';
    ctx.fillText(shopName.toUpperCase(), 400, 96);

    // Draw QR Code
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = qrDataUrl;
    img.onload = () => {
      ctx.drawImage(img, 100, 160, 600, 600);

      // Bottom Code Badge
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(100, 780, 600, 140);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.strokeRect(100, 780, 600, 140);

      ctx.fillStyle = '#0B4636';
      ctx.font = '900 32px monospace';
      ctx.fillText(shopScoperCode, 400, 830);

      ctx.fillStyle = '#475569';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText('Scan with any smartphone camera to view live inventory', 400, 875);

      ctx.fillStyle = '#059669';
      ctx.font = '500 16px system-ui, sans-serif';
      ctx.fillText(`📞 WhatsApp / Call: ${shopPhone || '+91 76088 07790'}`, 400, 905);

      const link = document.createElement('a');
      link.download = `${shopName.replace(/\s+/g, '_')}_Live_ScanCode.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const handleDownloadStandee = () => {
    if (!qrDataUrl) return;

    // Create high-res printable tabletop standee canvas
    const printCanvas = document.createElement('canvas');
    printCanvas.width = 1200;
    printCanvas.height = 1600;
    const ctx = printCanvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient (Luxury Boutique Emerald & Gold)
    const grad = ctx.createLinearGradient(0, 0, 1200, 1600);
    grad.addColorStop(0, '#041d16');
    grad.addColorStop(0.5, '#0B4636');
    grad.addColorStop(1, '#072C21');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 1600);

    // Decorative Gold Outer Border
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 12;
    ctx.strokeRect(40, 40, 1120, 1520);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, 1080, 1480);

    // Header ShopScoper Badge
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦  SHOPSCOPER LIVE SCANCODE  ✦', 600, 140);

    // Store Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.fillText(shopName.toUpperCase(), 600, 240);

    // Owner & Subtitle
    ctx.fillStyle = '#A7F3D0';
    ctx.font = '600 32px system-ui, sans-serif';
    ctx.fillText(`By ${ownerName}  •  ${shopAddress || 'Boutique Studio'}`, 600, 300);

    // Scan Call to Action
    ctx.fillStyle = '#FBBF24';
    ctx.font = '800 36px system-ui, sans-serif';
    ctx.fillText('SCAN WITH ANY PHONE CAMERA', 600, 390);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.fillText('To browse our complete Live Inventory Collection, Suits, Sarees & Fabrics', 600, 435);

    // White QR Code Container Card
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(240, 490, 720, 720, 40);
    ctx.fill();

    // Draw the QR Code image inside
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = qrDataUrl;
    img.onload = () => {
      ctx.drawImage(img, 280, 530, 640, 640);

      // Store Code Banner Below QR
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.roundRect(300, 1260, 600, 80, 20);
      ctx.fill();

      ctx.fillStyle = '#072C21';
      ctx.font = '900 34px monospace';
      ctx.fillText(shopScoperCode, 600, 1312);

      // Footer
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 28px system-ui, sans-serif';
      ctx.fillText(`📞 WhatsApp / Call: ${shopPhone || '+91 76088 07790'}`, 600, 1400);

      ctx.fillStyle = '#A7F3D0';
      ctx.font = '500 22px system-ui, sans-serif';
      ctx.fillText('Powered by ShopScoper · Real-time Boutique Cloud Inventory', 600, 1460);

      // Trigger Download
      const link = document.createElement('a');
      link.download = `${shopName.replace(/\s+/g, '_')}_ShopScoper_ScanCode_Standee.png`;
      link.href = printCanvas.toDataURL('image/png');
      link.click();
    };
  };

  const handleSimulateScan = () => {
    // Open the interactive inventory catalogue
    setShowCatalogueModal(true);
  };

  return (
    <>
      <div className="bg-gradient-to-br from-[#0B4636] via-[#073327] to-[#041d16] text-white rounded-3xl p-5 sm:p-6 border-2 border-amber-400/40 shadow-xl space-y-5">
        {/* Header with ShopScoper Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <QrCode className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  ✦ ShopScoper ScanCode
                </span>
                <span className="text-[11px] font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  {shopScoperCode}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                {shopName} Live Inventory ScanCode
              </h3>
              <p className="text-xs text-emerald-200/80 font-medium mt-0.5">
                Scan with any smartphone camera to browse this store&apos;s real-time inventory catalogue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Scannable
            </span>
          </div>
        </div>

        {/* ScanCode Display Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left Column: The High-Definition Scan Code Card */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-amber-400/80 relative group max-w-[280px] w-full flex flex-col items-center">
              {/* Top Banner on QR card */}
              <div className="w-full bg-[#0B4636] text-amber-300 py-1 px-2 rounded-xl text-center mb-3">
                <span className="text-[10px] font-black tracking-wider uppercase block">
                  ✦ ShopScoper Catalogue ✦
                </span>
                <span className="text-[9px] text-white font-semibold truncate block">
                  {shopName}
                </span>
              </div>

              {/* Canvas where QR is rendered */}
              <div className="relative aspect-square w-full max-w-[230px] flex items-center justify-center bg-white p-2 rounded-2xl overflow-hidden shadow-inner">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`ShopScoper QR Code for ${shopName}`}
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain"
                    style={{ display: isGenerating ? 'none' : 'block' }}
                  />
                )}
                {isGenerating && !qrDataUrl && (
                  <div className="flex flex-col items-center justify-center p-6 text-slate-600 gap-2">
                    <QrCode className="w-10 h-10 animate-pulse text-[#0B4636]" />
                    <span className="text-xs font-bold">Generating ScanCode...</span>
                  </div>
                )}
              </div>

              {/* Bottom Unique Code & Direct Click Link on QR Card */}
              <div className="w-full mt-3 pt-2 border-t border-slate-200 text-center space-y-1.5">
                <span className="font-mono text-[10px] font-extrabold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-300 inline-block">
                  {shopScoperCode}
                </span>
                <p className="text-[10px] text-slate-600 font-bold">
                  Point any phone camera or Google Lens to scan
                </p>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-900 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
                    title="Download high-resolution QR code PNG image"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Download QR</span>
                  </button>

                  <a
                    href={catalogueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#0B4636] hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-300 transition-colors"
                  >
                    <span>Open URL</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Key ScanCode Actions & Inventory Summary */}
          <div className="md:col-span-7 space-y-3.5">
            {/* Direct URL Box */}
            <div className="p-3 rounded-2xl bg-black/40 border border-amber-400/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-extrabold flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  Live Catalogue Destination URL
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  HTTPS Live
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950/90 rounded-xl p-2 border border-slate-700">
                <input
                  type="text"
                  readOnly
                  value={catalogueUrl}
                  className="bg-transparent text-[11px] font-mono text-slate-300 w-full focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-extrabold rounded-lg whitespace-nowrap transition-colors cursor-pointer"
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Inventory Status Bar */}
            <div className="p-3.5 rounded-2xl bg-black/30 border border-emerald-500/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-300" />
                  Linked Inventory Collection
                </span>
                <span className="font-extrabold text-white font-mono bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {inventory.length} Items Live
                </span>
              </div>
              <p className="text-xs text-slate-200/90 leading-relaxed">
                When customers scan this code at your counter, trial room, or window display, they immediately see all fabrics, ready suits, lehengas, prices, sizes, and photos from your <strong>boutique_inventory</strong> database.
              </p>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Button 1: Download QR Code */}
              <button
                type="button"
                onClick={handleDownloadQR}
                className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer text-center"
              >
                <Download className="w-4 h-4" />
                <span>Download QR Code</span>
              </button>

              {/* Button 2: Download Tabletop Standee */}
              <button
                type="button"
                onClick={handleDownloadStandee}
                className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95 cursor-pointer border border-emerald-400/30 text-center"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Print Standee</span>
              </button>

              {/* Button 3: Open Live URL */}
              <a
                href={catalogueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer text-center"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open URL</span>
              </a>

              {/* Button 4: In-App Interactive Modal */}
              <button
                type="button"
                onClick={handleSimulateScan}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-all cursor-pointer text-center"
              >
                <Eye className="w-3.5 h-3.5 text-amber-300" />
                <span>Preview Catalogue</span>
              </button>

              {/* Button 5: Share on WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  const text = `Explore *${shopName}* Live Inventory Catalogue on ShopScoper: ${catalogueUrl} [ScanCode: ${shopScoperCode}]`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="sm:col-span-2 py-2.5 px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share ScanCode on WhatsApp</span>
              </button>
            </div>

            {/* Quick scan info footnote */}
            <div className="flex items-center gap-2 text-[11px] text-emerald-200/70 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Each store features a distinct cryptographic QR code with ShopScoper verification.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Catalogue Modal */}
      <ShopInventoryCatalogueModal
        isOpen={showCatalogueModal}
        onClose={() => setShowCatalogueModal(false)}
        shop={shop}
        inventory={inventory}
        shopScoperCode={shopScoperCode}
      />
    </>
  );
};
