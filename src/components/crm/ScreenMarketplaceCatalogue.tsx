import React, { useState, useMemo, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Scissors,
  Share2,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Tag,
  Layers,
  Image as ImageIcon,
  DollarSign,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Upload,
  X,
  Camera,
  Eye,
  Check,
  User,
  Star,
  RefreshCw,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  Store,
  Phone,
  Bookmark,
  Send,
  FileText,
  Download,
  FolderPlus,
  BookOpen,
  ArrowUpRight,
  AlertCircle,
  FileUp,
  Images,
} from 'lucide-react';
import {
  MarketplaceProduct,
  UploadedCatalogueDoc,
  StaffTailor,
  ShopProfile,
  GarmentCategory,
} from '../../types';

interface ScreenMarketplaceCatalogueProps {
  products: MarketplaceProduct[];
  catalogueDocs?: UploadedCatalogueDoc[];
  tailors: StaffTailor[];
  shopProfile: ShopProfile;
  isDesktopView?: boolean;
  onSaveProduct: (product: MarketplaceProduct) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onToggleStatus: (
    productId: string,
    status: 'Available' | 'Made to Order' | 'Out of Stock' | 'Draft'
  ) => Promise<void>;
  onBulkSaveProducts?: (products: MarketplaceProduct[]) => Promise<void>;
  onClearAllProducts?: () => Promise<void>;
  onSaveCatalogueDoc?: (doc: UploadedCatalogueDoc) => Promise<void>;
  onDeleteCatalogueDoc?: (docId: string) => Promise<void>;
  onCreateOrderFromProduct: (product: MarketplaceProduct) => void;
  onBack?: () => void;
}

const GARMENT_CATEGORIES: GarmentCategory[] = [
  'Formal Shirt',
  'Kurta Pajama',
  'Blouse',
  'Anarkali Suit',
  'Sherwani',
  'Lehenga',
  'Pant / Trouser',
  'Suit (Coat + Pant)',
  'Alterations',
  'Other',
];

const COMMON_FABRIC_PRESETS = [
  'Pure Raw Silk',
  'Banarasi Brocade',
  'Kanchipuram Silk',
  'Merino Wool',
  'Chanderi Cotton',
  'Pure Linen',
  'Velvet',
  'Terry Wool',
  'Georgette',
  'Mulberry Silk',
  'Cotton Poplin',
  'Tussar Silk',
];

const COMMON_CUSTOMIZATION_PRESETS = [
  'Zardozi Hand Embroidery',
  'Maggam / Aari Needlework',
  'Princess Cut Padding',
  'Double-Breasted Vest',
  'Mandarin Stand Collar',
  'Deep Back Cutout with Latkans',
  'Peak Lapels',
  'Handmade Metallic Buttons',
  'Contrast Piping & Facing',
  'Concealed Button Placket',
  'Side Pocket Slits',
];

const COMMON_MEASUREMENT_KEYS = [
  'Chest',
  'Shoulder',
  'Front Length',
  'Back Length',
  'Waist',
  'Stomach',
  'Hip',
  'Armhole',
  'Sleeve Length',
  'Neck',
  'Pant Length',
  'Inseam',
  'Thigh',
  'Bottom Hem',
  'Front Neck Depth',
  'Back Neck Depth',
];

export const ScreenMarketplaceCatalogue: React.FC<ScreenMarketplaceCatalogueProps> = ({
  products,
  catalogueDocs = [],
  tailors,
  shopProfile,
  isDesktopView = false,
  onSaveProduct,
  onDeleteProduct,
  onToggleStatus,
  onBulkSaveProducts,
  onClearAllProducts,
  onSaveCatalogueDoc,
  onDeleteCatalogueDoc,
  onCreateOrderFromProduct,
  onBack,
}) => {
  // Main view navigation tabs
  const [activeTab, setActiveTab] = useState<'products' | 'docs'>('products');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTailorFilter, setSelectedTailorFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modals
  const [isSingleProductModalOpen, setIsSingleProductModalOpen] = useState(false);
  const [isDocUploadModalOpen, setIsDocUploadModalOpen] = useState(false);
  const [isBulkPhotoModalOpen, setIsBulkPhotoModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [selectedDocForViewing, setSelectedDocForViewing] = useState<UploadedCatalogueDoc | null>(null);

  // Single Product Form State
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<GarmentCategory>('Blouse');
  const [formPrice, setFormPrice] = useState<string>('1800');
  const [formFabricPrice, setFormFabricPrice] = useState<string>('');
  const [formAdvance, setFormAdvance] = useState<string>('500');
  const [formTailorId, setFormTailorId] = useState<string>('tailor-owner');
  const [formEstimatedDays, setFormEstimatedDays] = useState<number>(4);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formFabricTypes, setFormFabricTypes] = useState<string[]>([]);
  const [formCustomizations, setFormCustomizations] = useState<string[]>([]);
  const [formMeasurements, setFormMeasurements] = useState<string[]>(['Chest', 'Waist', 'Front Length']);
  const [formStatus, setFormStatus] = useState<'Available' | 'Made to Order' | 'Out of Stock' | 'Draft'>('Available');
  const [formIsFeatured, setFormIsFeatured] = useState<boolean>(false);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Document Upload Form State (PDF / E-Brochure / Digital Catalogue)
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('All Collection / Catalogue');
  const [docTailorId, setDocTailorId] = useState('tailor-owner');
  const [docDescription, setDocDescription] = useState('');
  const [docFilePayload, setDocFilePayload] = useState<{
    fileUrl: string;
    fileName: string;
    fileSize: string;
    fileType: 'pdf' | 'lookbook_images' | 'doc';
    previewThumbnail?: string;
  } | null>(null);

  // Bulk Photo Upload Form State
  const [bulkCategory, setBulkCategory] = useState<GarmentCategory>('Blouse');
  const [bulkPrice, setBulkPrice] = useState<string>('1500');
  const [bulkTailorId, setBulkTailorId] = useState('tailor-owner');
  const [bulkDays, setBulkDays] = useState<number>(4);
  const [bulkItems, setBulkItems] = useState<
    Array<{ id: string; name: string; image: string; price: string }>
  >([]);

  // Toast / Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const triggerToast = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // --- Handlers: Document Upload (PDF / Brochure) ---
  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const fileSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const fileType = isPdf ? 'pdf' : 'doc';

    if (!docTitle) {
      // Auto-set title from file name without extension
      const cleaned = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setDocTitle(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setDocFilePayload({
          fileUrl: result,
          fileName,
          fileSize,
          fileType,
          previewThumbnail: isPdf ? undefined : result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      alert('Please enter a catalogue title.');
      return;
    }
    if (!docFilePayload) {
      alert('Please select a PDF or catalogue document file to upload.');
      return;
    }

    setIsSaving(true);
    try {
      const assignedTailorObj = tailors.find((t) => t.id === docTailorId);
      const tailorName = assignedTailorObj ? assignedTailorObj.name : shopProfile.ownerName || 'Self (Owner)';

      const newDoc: UploadedCatalogueDoc = {
        id: `catdoc-${Date.now()}`,
        title: docTitle.trim(),
        category: docCategory,
        fileUrl: docFilePayload.fileUrl,
        fileName: docFilePayload.fileName,
        fileSize: docFilePayload.fileSize,
        fileType: docFilePayload.fileType,
        previewThumbnail: docFilePayload.previewThumbnail,
        description: docDescription.trim(),
        tailorId: docTailorId,
        tailorName: tailorName,
        uploadedAt: new Date().toISOString(),
        downloadCount: 0,
      };

      if (onSaveCatalogueDoc) {
        await onSaveCatalogueDoc(newDoc);
      }
      setIsDocUploadModalOpen(false);
      setDocTitle('');
      setDocDescription('');
      setDocFilePayload(null);
      setActiveTab('docs');
      triggerToast(`Catalogue "${newDoc.title}" uploaded successfully!`);
    } catch (err) {
      console.error(err);
      alert('Could not save catalogue document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handlers: Bulk Photo Upload ---
  const handleBulkPhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newBulk: Array<{ id: string; name: string; image: string; price: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (file) {
        const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            setBulkItems((prev) => [
              ...prev,
              {
                id: `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: formattedName || `Design ${prev.length + 1}`,
                image: base64,
                price: bulkPrice || '1500',
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveBulkUpload = async () => {
    if (bulkItems.length === 0) {
      alert('Please select at least 1 photo to upload.');
      return;
    }

    setIsSaving(true);
    try {
      const assignedTailorObj = tailors.find((t) => t.id === bulkTailorId);
      const tailorName = assignedTailorObj ? assignedTailorObj.name : shopProfile.ownerName || 'Self (Owner)';
      const tailorPhone = assignedTailorObj?.phone || shopProfile.phoneNumber || '';

      const generatedProducts: MarketplaceProduct[] = bulkItems.map((item, idx) => ({
        id: `prod-user-${Date.now()}-${idx}`,
        name: item.name.trim() || `${bulkCategory} Design ${idx + 1}`,
        description: `Handcrafted ${bulkCategory}. Custom stitched to your measurements.`,
        category: bulkCategory,
        price: Math.max(0, Number(item.price) || Number(bulkPrice) || 1500),
        advanceRequired: Math.max(0, Math.round((Number(item.price) || 1500) * 0.4)),
        images: [item.image],
        tailorId: bulkTailorId,
        tailorName,
        tailorPhone,
        estimatedDays: bulkDays || 4,
        fabricTypes: ['Custom Fabric / Client Material'],
        customizationOptions: ['Standard Fitted Pattern', 'Custom Neckline'],
        measurementsRequired: ['Chest', 'Waist', 'Length'],
        status: 'Available',
        isFeatured: idx === 0,
        tags: ['Custom Upload', bulkCategory],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      if (onBulkSaveProducts) {
        await onBulkSaveProducts(generatedProducts);
      } else {
        for (const p of generatedProducts) {
          await onSaveProduct(p);
        }
      }

      setIsBulkPhotoModalOpen(false);
      setBulkItems([]);
      setActiveTab('products');
      triggerToast(`Added ${generatedProducts.length} designs to your catalogue!`);
    } catch (err) {
      console.error(err);
      alert('Bulk upload failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handlers: Single Product Create & Edit ---
  const handleOpenCreateModal = (prefillTailorId?: string) => {
    const defaultTailor = tailors.find((t) => t.id === prefillTailorId) || tailors[0] || {
      id: 'tailor-owner',
      name: shopProfile.ownerName || 'Self (Owner)',
      role: 'Owner',
    };

    setEditingProduct(null);
    setFormName('');
    setFormDescription('');
    setFormCategory('Blouse');
    setFormPrice('1800');
    setFormFabricPrice('');
    setFormAdvance('500');
    setFormTailorId(defaultTailor.id);
    setFormEstimatedDays(4);
    setFormImages([]);
    setFormFabricTypes(['Pure Raw Silk']);
    setFormCustomizations(['Maggam / Aari Needlework', 'Princess Cut Padding']);
    setFormMeasurements(['Chest', 'Shoulder', 'Waist', 'Front Length']);
    setFormStatus('Available');
    setFormIsFeatured(false);
    setFormTags(['Stitch']);
    setIsSingleProductModalOpen(true);
  };

  const handleOpenEditModal = (prod: MarketplaceProduct) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormDescription(prod.description);
    setFormCategory((prod.category as GarmentCategory) || 'Other');
    setFormPrice(String(prod.price || 0));
    setFormFabricPrice(prod.fabricIncludedPrice ? String(prod.fabricIncludedPrice) : '');
    setFormAdvance(prod.advanceRequired ? String(prod.advanceRequired) : '');
    setFormTailorId(prod.tailorId || 'tailor-owner');
    setFormEstimatedDays(prod.estimatedDays || 3);
    setFormImages(prod.images || []);
    setFormFabricTypes(prod.fabricTypes || []);
    setFormCustomizations(prod.customizationOptions || []);
    setFormMeasurements(prod.measurementsRequired || []);
    setFormStatus(prod.status || 'Available');
    setFormIsFeatured(!!prod.isFeatured);
    setFormTags(prod.tags || []);
    setIsSingleProductModalOpen(true);
  };

  const handleSingleProductPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList.item(i);
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            setFormImages((prev) => [...prev, base64]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveSingleProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter a design/product name.');
      return;
    }

    setIsSaving(true);
    try {
      const assignedTailorObj = tailors.find((t) => t.id === formTailorId);
      const tailorName = assignedTailorObj ? assignedTailorObj.name : shopProfile.ownerName || 'Self (Owner)';
      const tailorPhone = assignedTailorObj?.phone || shopProfile.phoneNumber || '';

      const productPayload: MarketplaceProduct = {
        id: editingProduct ? editingProduct.id : `prod-user-${Date.now()}`,
        name: formName.trim(),
        description: formDescription.trim() || `Custom handcrafted ${formCategory}.`,
        category: formCategory,
        price: Math.max(0, Number(formPrice) || 0),
        fabricIncludedPrice: formFabricPrice ? Math.max(0, Number(formFabricPrice)) : undefined,
        advanceRequired: formAdvance ? Math.max(0, Number(formAdvance)) : undefined,
        images: formImages.length > 0 ? formImages : [],
        tailorId: formTailorId,
        tailorName,
        tailorPhone,
        estimatedDays: Math.max(1, formEstimatedDays || 3),
        fabricTypes: formFabricTypes,
        customizationOptions: formCustomizations,
        measurementsRequired: formMeasurements,
        status: formStatus,
        isFeatured: formIsFeatured,
        tags: formTags,
        createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveProduct(productPayload);
      setIsSingleProductModalOpen(false);
      triggerToast(`Saved "${productPayload.name}" to your catalogue!`);
    } catch (err) {
      console.error(err);
      alert('Could not save product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- WhatsApp Sharing Helper ---
  const handleShareProductWhatsApp = (prod: MarketplaceProduct) => {
    const shop = shopProfile.shopName || 'ShopScopers Tailor Boutique';
    const artisan = prod.tailorName || 'Master Artisan';
    const priceText = `*Stitching / Crafting Charge:* ₹${prod.price.toLocaleString('en-IN')}`;
    const fabricPriceText = prod.fabricIncludedPrice ? `\n*Complete with Fabric:* ₹${prod.fabricIncludedPrice.toLocaleString('en-IN')}` : '';
    const advanceText = prod.advanceRequired ? `\n*Booking Advance:* ₹${prod.advanceRequired.toLocaleString('en-IN')}` : '';

    const text = `✨ *${prod.name.toUpperCase()}*\n📍 *${shop}* (Crafted by ${artisan})\n\n🏷️ *Category:* ${prod.category}\n⏱️ *Turnaround:* ~${prod.estimatedDays} Days\n${priceText}${fabricPriceText}${advanceText}\n\n📝 *Details:* ${prod.description || 'Custom tailored to exact client measurements.'}\n\n🧵 *Fabric Options:* ${prod.fabricTypes.join(', ') || 'Custom Client Fabric'}\n✂️ *Customizations:* ${prod.customizationOptions.join(', ') || 'Custom fit'}\n\n💬 *To book this design or get measured, reply to this message.*`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    triggerToast(`Ready to share on WhatsApp!`, 'info');
  };

  const handleShareDocWhatsApp = (doc: UploadedCatalogueDoc) => {
    const shop = shopProfile.shopName || 'ShopScopers Tailor Boutique';
    const artisan = doc.tailorName || 'Master Tailor';
    const text = `📖 *${doc.title.toUpperCase()}*\n📍 *${shop}* (Boutique Catalogue by ${artisan})\n\n📂 *Category:* ${doc.category}\n📄 *File:* ${doc.fileName} (${doc.fileSize || 'Digital PDF'})\n\n📝 *Overview:* ${doc.description || 'Browse our stitched collections, custom patterns, and artisan catalogues.'}\n\n💬 *Contact us to book appointments or custom stitching.*`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    triggerToast(`Shared catalogue document details on WhatsApp!`, 'info');
  };

  // --- Clear / Reset Catalogue ---
  const handleClearDemoProducts = async () => {
    if (
      window.confirm(
        'Are you sure you want to clear all current catalogue items? This gives you a fresh empty canvas to upload only your own designs.'
      )
    ) {
      if (onClearAllProducts) {
        await onClearAllProducts();
        triggerToast('Catalogue cleared. You can now upload your own designs!', 'info');
      }
    }
  };

  // --- Filtered Products ---
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery.trim() === '' ||
        (prod.name && prod.name.toLowerCase().includes(q)) ||
        (prod.description && prod.description.toLowerCase().includes(q)) ||
        (prod.tailorName && prod.tailorName.toLowerCase().includes(q)) ||
        (prod.category && prod.category.toLowerCase().includes(q)) ||
        (prod.tags && prod.tags.some((t) => t && t.toLowerCase().includes(q)));

      const matchesCat = selectedCategory === 'all' || prod.category === selectedCategory;
      const matchesTailor =
        selectedTailorFilter === 'all' ||
        prod.tailorId === selectedTailorFilter ||
        (prod.tailorName || '').toLowerCase() === (selectedTailorFilter || '').toLowerCase();
      const matchesStatus = selectedStatusFilter === 'all' || prod.status === selectedStatusFilter;

      return matchesSearch && matchesCat && matchesTailor && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedTailorFilter, selectedStatusFilter]);

  // --- Grouped by Tailor ---
  const productsGroupedByTailor = useMemo(() => {
    const map = new Map<
      string,
      {
        tailor: StaffTailor | { id: string; name: string; role: string; phone?: string };
        items: MarketplaceProduct[];
        docs: UploadedCatalogueDoc[];
      }
    >();

    // Register active staff tailors
    tailors.forEach((t) => {
      map.set(t.id, { tailor: t, items: [], docs: [] });
    });

    // Bucket filtered products
    filteredProducts.forEach((prod) => {
      const key = prod.tailorId || 'tailor-owner';
      if (map.has(key)) {
        map.get(key)!.items.push(prod);
      } else {
        map.set(key, {
          tailor: {
            id: key,
            name: prod.tailorName || 'Master Tailor',
            role: 'Tailor',
            phone: prod.tailorPhone,
          },
          items: [prod],
          docs: [],
        });
      }
    });

    // Bucket catalogue docs
    catalogueDocs.forEach((docItem) => {
      const key = docItem.tailorId || 'tailor-owner';
      if (map.has(key)) {
        map.get(key)!.docs.push(docItem);
      }
    });

    return Array.from(map.values()).filter(
      (group) => group.items.length > 0 || group.docs.length > 0 || selectedTailorFilter === 'all'
    );
  }, [filteredProducts, catalogueDocs, tailors, selectedTailorFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white">{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-white/60 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Banner & Self-Serve Upload Hub */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-600/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold backdrop-blur-xs border border-white/10">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tailor Boutique Self-Serve Catalogue</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              My Design Catalogues
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              Upload your own PDF catalogues, digital brochures, or client photo albums. Assign stitching rates, showcase your artisans, and share directly on WhatsApp with clients to take custom orders.
            </p>
          </div>

          {/* Direct Upload Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsDocUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/20 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <FileUp className="w-4 h-4 text-emerald-300" />
              <span>Upload PDF Catalogue</span>
            </button>

            <button
              onClick={() => setIsBulkPhotoModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-100 font-bold text-xs sm:text-sm flex items-center gap-2 border border-emerald-400/30 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <Images className="w-4 h-4 text-emerald-300" />
              <span>Bulk Photos Upload</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal()}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-black/10 transition-all cursor-pointer active:scale-95 border border-emerald-200"
            >
              <Plus className="w-4 h-4 stroke-[3] text-emerald-700" />
              <span>+ Add Single Design</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Counts & Empty Reset Action */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <span className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-wider block">Uploaded Designs</span>
            <span className="text-xl font-black text-white mt-0.5 block">{products.length} Items</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <span className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-wider block">PDF Catalogues</span>
            <span className="text-xl font-black text-emerald-200 mt-0.5 block">{catalogueDocs.length} Documents</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <span className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-wider block">Specialist Artisans</span>
            <span className="text-xl font-black text-white mt-0.5 block">{tailors.length} Tailors</span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-wider block">Clean Canvas</span>
              <span className="text-xs text-emerald-100/70">Wipe demo items</span>
            </div>
            {products.length > 0 && (
              <button
                onClick={handleClearDemoProducts}
                title="Clear demo items to upload only your own catalogue"
                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-200 text-[10px] font-bold rounded-lg border border-red-400/30 transition-all cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs (Garment Designs vs PDF Catalogues vs Artisan Portfolios) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'products'
                ? 'bg-white text-emerald-800 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Garment Designs ({filteredProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'docs'
                ? 'bg-white text-emerald-800 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Catalogues & Brochures ({catalogueDocs.length})</span>
          </button>
        </div>

        {/* Quick Upload CTA */}
        <div className="flex items-center gap-2">
          {activeTab === 'docs' ? (
            <button
              onClick={() => setIsDocUploadModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Upload PDF Catalogue</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Design</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      {activeTab !== 'docs' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by design name, fabric, embroidery style, artisan..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tailor Filter */}
              <select
                value={selectedTailorFilter}
                onChange={(e) => setSelectedTailorFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Artisans / Tailors</option>
                {tailors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.role})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Made to Order">Made to Order</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Garment Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories ({products.length})
            </button>
            {GARMENT_CATEGORIES.map((cat) => {
              const count = products.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Main Body Content Based on Active Tab */}

      {/* TAB A: GARMENT DESIGNS GRID */}
      {activeTab === 'products' && (
        <div>
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">Your Catalogue is Ready for Uploads</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  You can upload photos of your handcrafted garments, wedding collections, or custom stitching styles directly from your camera or gallery.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsBulkPhotoModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Images className="w-4 h-4" />
                  <span>Upload Photos in Bulk</span>
                </button>
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add Single Design</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((prod) => {
                const coverImage = prod.images && prod.images.length > 0 ? prod.images[0] : null;

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                      {coverImage && coverImage.trim() !== '' ? (
                        <img
                          src={coverImage}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                          <Scissors className="w-10 h-10 stroke-[1.5] text-slate-300 mb-1" />
                          <span className="text-[11px] font-bold">Custom Tailored Fit</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider">
                          {prod.category}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-xs ${
                            prod.status === 'Available'
                              ? 'bg-emerald-500/90 text-white'
                              : prod.status === 'Made to Order'
                              ? 'bg-amber-500/90 text-white'
                              : 'bg-slate-700/90 text-slate-200'
                          }`}
                        >
                          {prod.status}
                        </span>
                      </div>

                      {/* Photo Count badge */}
                      {prod.images && prod.images.length > 1 && (
                        <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>{prod.images.length} photos</span>
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                            {prod.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {prod.description || 'Custom handcrafted tailored design.'}
                        </p>

                        {/* Tailor & Turnaround */}
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100">
                          <div className="flex items-center gap-1 font-semibold text-slate-700">
                            <User className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{prod.tailorName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>~{prod.estimatedDays} Days</span>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Stitching Rate</span>
                            <span className="text-base font-black text-emerald-800">
                              ₹{prod.price.toLocaleString('en-IN')}
                            </span>
                          </div>
                          {prod.fabricIncludedPrice ? (
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">With Fabric</span>
                              <span className="text-xs font-black text-emerald-600">
                                ₹{prod.fabricIncludedPrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                          ) : (
                            prod.advanceRequired && (
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Advance</span>
                                <span className="text-xs font-black text-slate-700">
                                  ₹{prod.advanceRequired.toLocaleString('en-IN')}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 space-y-2">
                        <button
                          onClick={() => onCreateOrderFromProduct(prod)}
                          className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Book Order with this Style</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleShareProductWhatsApp(prod)}
                            title="Share on WhatsApp with Client"
                            className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            title="Edit Design Details"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${prod.name}" from your catalogue?`)) {
                                onDeleteProduct(prod.id);
                              }
                            }}
                            title="Delete Design"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB B: PDF CATALOGUES & BROCHURES */}
      {activeTab === 'docs' && (
        <div className="space-y-6">
          {catalogueDocs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">No PDF Catalogues Uploaded Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Upload your boutique brochure, festive collection PDF, or digital catalogue document. Clients can view it or receive it on WhatsApp!
                </p>
              </div>
              <button
                onClick={() => setIsDocUploadModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <FileUp className="w-4 h-4" />
                <span>Upload First PDF Catalogue</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {catalogueDocs.map((docItem) => (
                <div
                  key={docItem.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider inline-block mb-1">
                          {docItem.category || 'Catalogue'}
                        </span>
                        <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-1">
                          {docItem.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{docItem.fileName}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {docItem.description || 'Digital boutique catalogue and tailored design booklet.'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="font-semibold text-slate-700">{docItem.tailorName || 'Master Tailor'}</span>
                      <span>{docItem.fileSize || 'PDF Document'}</span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => {
                        setSelectedDocForViewing(docItem);
                        setIsViewerModalOpen(true);
                      }}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Open Catalogue Viewer</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShareDocWhatsApp(docItem)}
                        className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Share on WhatsApp</span>
                      </button>

                      {onDeleteCatalogueDoc && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${docItem.title}"?`)) {
                              onDeleteCatalogueDoc(docItem.id);
                            }
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: UPLOAD PDF / E-BROCHURE / DIGITAL CATALOGUE DOCUMENT
         ========================================================================= */}
      {isDocUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileUp className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-black text-sm text-white">Upload Catalogue PDF / Brochure</h3>
                  <p className="text-[11px] text-emerald-200/80">Upload your complete digital catalogue file</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocUploadModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="p-6 space-y-4">
              {/* File Input Box */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select Catalogue Document (PDF or Brochure) *
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-700 rounded-2xl p-6 text-center bg-slate-50 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf"
                    onChange={handleDocFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {docFilePayload ? (
                    <div className="space-y-1 text-emerald-800">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <p className="text-xs font-black">{docFilePayload.fileName}</p>
                      <p className="text-[10px] text-slate-500">{docFilePayload.fileSize}</p>
                      <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 underline">
                        Change File
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">
                        Click to select PDF or drag & drop here
                      </p>
                      <p className="text-[10px] text-slate-400">PDF, Word documents up to 50MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catalogue Title *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Wedding & Festive Collection 2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Category & Tailor Attribution */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category Tag</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="All Collection / Catalogue">All Collection</option>
                    <option value="Bridal & Wedding">Bridal & Wedding</option>
                    <option value="Blouse Maggam Works">Blouse Maggam Works</option>
                    <option value="Men's Suits & Sherwanis">Men's Suits & Sherwanis</option>
                    <option value="Festive Kurtas">Festive Kurtas</option>
                    <option value="Boutique Designer Sets">Boutique Designer Sets</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Master Artisan</label>
                  <select
                    value={docTailorId}
                    onChange={(e) => setDocTailorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    {tailors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description / Note for Clients
                </label>
                <textarea
                  rows={2}
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Highlights of this catalogue, custom embroidery options, turnaround time..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDocUploadModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !docFilePayload}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isSaving ? 'Uploading...' : 'Save & Publish Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: BULK PHOTO UPLOAD TO CATALOGUE
         ========================================================================= */}
      {isBulkPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Images className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-black text-sm text-white">Bulk Upload Design Photos</h3>
                  <p className="text-[11px] text-emerald-200/80">
                    Select multiple garment photos from your gallery or camera
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkPhotoModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Batch Defaults */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Common Category</label>
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value as GarmentCategory)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    {GARMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Default Stitching ₹</label>
                  <input
                    type="number"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    placeholder="1500"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Artisan / Karigar</label>
                  <select
                    value={bulkTailorId}
                    onChange={(e) => setBulkTailorId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    {tailors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select Design Photos (Multiple Files Allowed)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-700 rounded-2xl p-6 text-center bg-slate-50 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleBulkPhotosSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="space-y-1.5">
                    <Camera className="w-8 h-8 text-emerald-700 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">
                      Click to choose photos from device or capture from camera
                    </p>
                    <p className="text-[10px] text-slate-400">JPEG, PNG, WEBP</p>
                  </div>
                </div>
              </div>

              {/* Preview Grid of Selected Photos */}
              {bulkItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">
                      Selected Designs ({bulkItems.length})
                    </span>
                    <button
                      onClick={() => setBulkItems([])}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Clear Selected
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
                    {bulkItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="bg-slate-50 rounded-xl border border-slate-200 p-2 space-y-1.5 relative group"
                      >
                        <div className="aspect-square rounded-lg bg-slate-200 overflow-hidden relative flex items-center justify-center">
                          {item.image && item.image.trim() !== '' ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Scissors className="w-5 h-5 text-slate-400" />
                          )}
                          <button
                            onClick={() => setBulkItems((prev) => prev.filter((i) => i.id !== item.id))}
                            className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white hover:bg-rose-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBulkItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, name: val } : it))
                            );
                          }}
                          placeholder={`Design ${idx + 1}`}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-semibold"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBulkItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, price: val } : it))
                              );
                            }}
                            placeholder="Price"
                            className="w-full px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-emerald-800"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkPhotoModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || bulkItems.length === 0}
                  onClick={handleSaveBulkUpload}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isSaving ? 'Uploading...' : `Upload ${bulkItems.length} Designs to Catalogue`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: SINGLE PRODUCT CREATE / EDIT
         ========================================================================= */}
      {isSingleProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-black text-sm text-white">
                    {editingProduct ? 'Edit Catalogue Design' : 'Add Custom Catalogue Design'}
                  </h3>
                  <p className="text-[11px] text-emerald-200/80">Configure style details and pricing ledger</p>
                </div>
              </div>
              <button
                onClick={() => setIsSingleProductModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Photo Upload Section */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Garment Photos (Upload from Gallery or Camera)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {formImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative group shrink-0"
                    >
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-md hover:bg-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white font-black text-[9px] text-center py-0.5 uppercase">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}

                  <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-700 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-700 cursor-pointer transition-all shrink-0">
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">+ Photo</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleSingleProductPhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Design / Style Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Royal Maggam Bridal Blouse"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Garment Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as GarmentCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    {GARMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Stitching Charge (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="1800"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-emerald-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    With Fabric (₹)
                  </label>
                  <input
                    type="number"
                    value={formFabricPrice}
                    onChange={(e) => setFormFabricPrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Advance Required (₹)
                  </label>
                  <input
                    type="number"
                    value={formAdvance}
                    onChange={(e) => setFormAdvance(e.target.value)}
                    placeholder="500"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              {/* Tailor Attribution & Estimated Days */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Artisan</label>
                  <select
                    value={formTailorId}
                    onChange={(e) => setFormTailorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    {tailors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Turnaround Days</label>
                  <input
                    type="number"
                    min={1}
                    value={formEstimatedDays}
                    onChange={(e) => setFormEstimatedDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Design Notes & Craftsmanship Details
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Pure raw silk base with hand zardozi floral motifs and double lining."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Availability Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Available', 'Made to Order', 'Out of Stock'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formStatus === st
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSingleProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isSaving ? 'Saving...' : 'Save Catalogue Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: IN-APP CATALOGUE / PDF VIEWER
         ========================================================================= */}
      {isViewerModalOpen && selectedDocForViewing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Viewer Header */}
            <div className="bg-emerald-900 p-4 px-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-black text-sm text-white">{selectedDocForViewing.title}</h3>
                  <p className="text-[11px] text-emerald-200/80">
                    {selectedDocForViewing.category} • Uploaded by {selectedDocForViewing.tailorName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShareDocWhatsApp(selectedDocForViewing)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </button>

                <a
                  href={selectedDocForViewing.fileUrl}
                  download={selectedDocForViewing.fileName}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => setIsViewerModalOpen(false)}
                  className="text-white/60 hover:text-white p-1.5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Render Area */}
            <div className="flex-1 bg-slate-900 overflow-auto p-4 flex items-center justify-center">
              {selectedDocForViewing.fileType === 'pdf' && selectedDocForViewing.fileUrl ? (
                <iframe
                  src={selectedDocForViewing.fileUrl}
                  title={selectedDocForViewing.title}
                  className="w-full h-full rounded-2xl bg-white border-0 shadow-xl"
                />
              ) : selectedDocForViewing.previewThumbnail && selectedDocForViewing.previewThumbnail.trim() !== '' ? (
                <img
                  src={selectedDocForViewing.previewThumbnail}
                  alt={selectedDocForViewing.title}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-xl"
                />
              ) : (
                <div className="text-center text-white space-y-3">
                  <FileText className="w-16 h-16 text-emerald-300 mx-auto" />
                  <p className="text-sm font-bold">{selectedDocForViewing.fileName}</p>
                  <a
                    href={selectedDocForViewing.fileUrl}
                    download={selectedDocForViewing.fileName}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File to View</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
