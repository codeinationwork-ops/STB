import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, PlusCircle, CheckCircle2, Building2, Globe, User, Mail, Phone, FileText, Sparkles, Loader2 } from 'lucide-react';
import { submitBrandRemovalRequest, submitBrandAdditionRequest } from '../lib/firestoreService';

interface BrandRequestModalsProps {
  removalOpen: boolean;
  additionOpen: boolean;
  onCloseRemoval: () => void;
  onCloseAddition: () => void;
}

export const BrandRequestModals: React.FC<BrandRequestModalsProps> = ({
  removalOpen,
  additionOpen,
  onCloseRemoval,
  onCloseAddition,
}) => {
  // Removal Form State
  const [remBrandName, setRemBrandName] = useState('');
  const [remWebsiteUrl, setRemWebsiteUrl] = useState('');
  const [remContactName, setRemContactName] = useState('');
  const [remContactEmail, setRemContactEmail] = useState('');
  const [remContactPhone, setRemContactPhone] = useState('');
  const [remReason, setRemReason] = useState('');
  const [remSubmitting, setRemSubmitting] = useState(false);
  const [remSuccess, setRemSuccess] = useState(false);
  const [remError, setRemError] = useState('');

  // Addition Form State
  const [addBrandName, setAddBrandName] = useState('');
  const [addWebsiteUrl, setAddWebsiteUrl] = useState('');
  const [addContactName, setAddContactName] = useState('');
  const [addContactEmail, setAddContactEmail] = useState('');
  const [addContactPhone, setAddContactPhone] = useState('');
  const [addCategory, setAddCategory] = useState('Streetwear & Apparel');
  const [addDetails, setAddDetails] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState('');

  const handleRemovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remBrandName.trim() || !remContactEmail.trim() || !remContactName.trim()) {
      setRemError('Please fill in all required fields (Brand Name, Contact Name, Email).');
      return;
    }
    setRemSubmitting(true);
    setRemError('');

    const ok = await submitBrandRemovalRequest({
      brandName: remBrandName.trim(),
      websiteUrl: remWebsiteUrl.trim(),
      contactName: remContactName.trim(),
      contactEmail: remContactEmail.trim(),
      contactPhone: remContactPhone.trim(),
      reason: remReason.trim(),
    });

    setRemSubmitting(false);
    if (ok) {
      setRemSuccess(true);
    } else {
      setRemError('Submission failed. Please try again or check your network.');
    }
  };

  const handleAdditionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBrandName.trim() || !addWebsiteUrl.trim() || !addContactEmail.trim() || !addContactName.trim()) {
      setAddError('Please fill in all required fields (Brand Name, Website URL, Contact Name, Email).');
      return;
    }
    setAddSubmitting(true);
    setAddError('');

    const ok = await submitBrandAdditionRequest({
      brandName: addBrandName.trim(),
      websiteUrl: addWebsiteUrl.trim(),
      contactName: addContactName.trim(),
      contactEmail: addContactEmail.trim(),
      contactPhone: addContactPhone.trim(),
      category: addCategory,
      details: addDetails.trim(),
    });

    setAddSubmitting(false);
    if (ok) {
      setAddSuccess(true);
    } else {
      setAddError('Submission failed. Please try again or check your network.');
    }
  };

  const resetRemovalForm = () => {
    setRemBrandName('');
    setRemWebsiteUrl('');
    setRemContactName('');
    setRemContactEmail('');
    setRemContactPhone('');
    setRemReason('');
    setRemSuccess(false);
    setRemError('');
    onCloseRemoval();
  };

  const resetAdditionForm = () => {
    setAddBrandName('');
    setAddWebsiteUrl('');
    setAddContactName('');
    setAddContactEmail('');
    setAddContactPhone('');
    setAddCategory('Streetwear & Apparel');
    setAddDetails('');
    setAddSuccess(false);
    setAddError('');
    onCloseAddition();
  };

  return (
    <>
      {/* 1. BRAND REMOVAL MODAL */}
      <AnimatePresence>
        {removalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden my-8"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 relative">
                <button
                  onClick={resetRemovalForm}
                  className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Brand Removal Request</h3>
                    <p className="text-xs text-slate-300">Request removal of your brand listing from our directory</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {remSuccess ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">Request Submitted</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Your brand removal request for <strong>{remBrandName}</strong> has been logged into our database. Our compliance team will review and verify details within 24-48 hours.
                    </p>
                    <button
                      onClick={resetRemovalForm}
                      className="px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                      Close Window
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRemovalSubmit} className="space-y-4">
                    {remError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                        {remError}
                      </div>
                    )}

                    {/* Brand Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Brand Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={remBrandName}
                          onChange={(e) => setRemBrandName(e.target.value)}
                          placeholder="e.g. Snitch / Zara"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Website URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Brand Website URL</label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="url"
                          value={remWebsiteUrl}
                          onChange={(e) => setRemWebsiteUrl(e.target.value)}
                          placeholder="https://yourbrand.com"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Contact Person Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Contact Person <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={remContactName}
                            onChange={(e) => setRemContactName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Contact Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="email"
                            required
                            value={remContactEmail}
                            onChange={(e) => setRemContactEmail(e.target.value)}
                            placeholder="official@brand.com"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          value={remContactPhone}
                          onChange={(e) => setRemContactPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Removal / Notes</label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <textarea
                          rows={3}
                          value={remReason}
                          onChange={(e) => setRemReason(e.target.value)}
                          placeholder="Please describe why you wish to remove your brand from our index..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetRemovalForm}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={remSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {remSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <span>Submit Removal Request</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. BRAND ADDITION MODAL */}
      <AnimatePresence>
        {additionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden my-8"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 relative">
                <button
                  onClick={resetAdditionForm}
                  className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Add / List Your Brand</h3>
                    <p className="text-xs text-purple-200">Get your D2C brand discovered by thousands of shoppers</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {addSuccess ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 text-[#6C3BFF] flex items-center justify-center mx-auto">
                      <Sparkles className="w-10 h-10" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">Listing Application Received!</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Thank you for registering <strong>{addBrandName}</strong>! Our web crawler indexing engine will review your store catalog and index your products.
                    </p>
                    <button
                      onClick={resetAdditionForm}
                      className="px-6 py-2.5 rounded-full bg-[#6C3BFF] text-white text-xs font-bold hover:bg-purple-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAdditionSubmit} className="space-y-4">
                    {addError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                        {addError}
                      </div>
                    )}

                    {/* Brand Name & Website */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Brand Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={addBrandName}
                            onChange={(e) => setAddBrandName(e.target.value)}
                            placeholder="e.g. Super Apparel"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6C3BFF] focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Website URL <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="url"
                            required
                            value={addWebsiteUrl}
                            onChange={(e) => setAddWebsiteUrl(e.target.value)}
                            placeholder="https://superapparel.in"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6C3BFF] focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Contact Person <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={addContactName}
                            onChange={(e) => setAddContactName(e.target.value)}
                            placeholder="Founder / Manager"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6C3BFF] focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Contact Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="email"
                            required
                            value={addContactEmail}
                            onChange={(e) => setAddContactEmail(e.target.value)}
                            placeholder="hello@brand.in"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6C3BFF] focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Phone & Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="tel"
                            value={addContactPhone}
                            onChange={(e) => setAddContactPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6C3BFF] focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Primary Category</label>
                        <select
                          value={addCategory}
                          onChange={(e) => setAddCategory(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6C3BFF] focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all cursor-pointer font-medium"
                        >
                          <option value="Streetwear & Apparel">Streetwear & Apparel</option>
                          <option value="Fast Fashion">Fast Fashion</option>
                          <option value="Activewear & Gym">Activewear & Gym</option>
                          <option value="Ethnic & Fusion">Ethnic & Fusion</option>
                          <option value="Clean Beauty & Skincare">Clean Beauty & Skincare</option>
                          <option value="Indie Footwear">Indie Footwear</option>
                          <option value="Luxury & Premium">Luxury & Premium</option>
                          <option value="Tech & EDC">Tech & EDC</option>
                        </select>
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Brand Description / Story</label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <textarea
                          rows={3}
                          value={addDetails}
                          onChange={(e) => setAddDetails(e.target.value)}
                          placeholder="Tell us about your brand focus, top products, or Shopify store URL..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#6C3BFF] focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetAdditionForm}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6C3BFF] to-[#8B5CF6] hover:brightness-105 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {addSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <span>Submit Brand Listing</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
