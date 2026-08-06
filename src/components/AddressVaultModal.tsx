import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Plus, CheckCircle2, ShieldCheck, Phone, User, Home, Building } from 'lucide-react';
import { UserAddress } from '../types';

interface AddressVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: UserAddress[];
  defaultAddress: UserAddress;
  onSelectDefaultAddress: (address: UserAddress) => void;
  onAddNewAddress: (address: UserAddress) => void;
}

export const AddressVaultModal: React.FC<AddressVaultModalProps> = ({
  isOpen,
  onClose,
  addresses,
  defaultAddress,
  onSelectDefaultAddress,
  onAddNewAddress
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPincode, setNewPincode] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newStreet || !newCity) return;
    const created: UserAddress = {
      id: `addr-${Date.now()}`,
      label: newLabel,
      name: newName,
      phone: newPhone || '+91 98765 43210',
      street: newStreet,
      city: newCity,
      state: newState || 'Karnataka',
      pincode: newPincode || '560001',
      isDefault: false
    };
    onAddNewAddress(created);
    setShowAddForm(false);
    setNewName('');
    setNewStreet('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-12 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl z-10 p-6 space-y-4 text-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-600 text-white shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Express Address Vault</h3>
                <p className="text-xs text-slate-500 font-mono">1-Click Auto-Fill Shipping Credentials</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Address List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">
              <span>Saved Vault Addresses</span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-red-600 hover:underline flex items-center gap-1 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Address</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {addresses.map((addr) => {
                const isSelected = defaultAddress.id === addr.id;
                return (
                  <div
                    key={addr.id}
                    onClick={() => onSelectDefaultAddress(addr)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-red-50/60 border-red-500 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-red-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{addr.name}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-red-600 text-white font-bold">
                          {addr.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">
                        {addr.street}, {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">Phone: {addr.phone}</p>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Address Form Drawer */}
          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSave}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
            >
              <div className="font-mono text-xs font-bold text-slate-900">Add New Shipping Vault Address</div>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="p-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-red-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="p-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-red-500"
                />
              </div>

              <input
                type="text"
                placeholder="Street / Apartment Address"
                value={newStreet}
                onChange={(e) => setNewStreet(e.target.value)}
                className="w-full p-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-red-500"
                required
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="City"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="p-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-red-500"
                  required
                />
                <input
                  type="text"
                  placeholder="State"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  className="p-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-red-500"
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={newPincode}
                  onChange={(e) => setNewPincode(e.target.value)}
                  className="p-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-mono text-xs font-bold shadow"
                >
                  Save to Vault
                </button>
              </div>
            </motion.form>
          )}

          {/* Footer Security Badge */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1.5 text-red-600 font-bold">
              <ShieldCheck className="w-4 h-4 text-red-600" />
              AES-256 Encrypted Address Storage
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
