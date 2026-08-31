import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  Zap,
  TrendingUp,
  DollarSign,
  Plus,
  Phone,
  CheckCircle2,
  Filter,
  Search,
  UserCheck,
  Award,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { StaffTailor, TailorOrder, PlatformShop } from '../../../types';
import { calculateWorkerPerformances, WorkerPerformanceSummary } from '../../../lib/workerCapacity';
import { roomDb } from '../../../lib/localRoomDb';
import { clean10DigitPhone, getWhatsAppUrl } from '../../../lib/phoneUtils';

interface AdminWorkforceViewProps {
  tailors?: StaffTailor[];
  orders?: TailorOrder[];
  shops?: PlatformShop[];
}

export const AdminWorkforceView: React.FC<AdminWorkforceViewProps> = ({
  tailors = [],
  orders = [],
  shops = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSummary, setSelectedSummary] = useState<WorkerPerformanceSummary | null>(null);

  // Add Karigar modal state
  const [showAddKarigarModal, setShowAddKarigarModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Tailor' | 'Owner'>('Tailor');

  // Compute worker summaries safely
  const workerSummaries = useMemo(() => {
    try {
      return calculateWorkerPerformances(tailors || [], orders || []);
    } catch (e) {
      console.warn('Failed to calculate worker performances:', e);
      return [];
    }
  }, [tailors, orders]);

  // Filter workers based on search query
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return workerSummaries;
    const query = searchQuery.toLowerCase();
    return workerSummaries.filter(
      (w) =>
        Boolean(w.tailorName && typeof w.tailorName === 'string' && w.tailorName.toLowerCase().includes(query)) ||
        Boolean(w.phone && typeof w.phone === 'string' && w.phone.includes(query)) ||
        Boolean(w.role && typeof w.role === 'string' && w.role.toLowerCase().includes(query))
    );
  }, [workerSummaries, searchQuery]);

  const totalKarigarsAcrossNetwork = (tailors || []).length;

  const activeJobs = (orders || []).filter(
    (o) => o.status !== 'Completed' && o.status !== 'Delivered' && !o.isArchived
  ).length;

  const unassignedJobs = (orders || []).filter(
    (o) =>
      o.status !== 'Completed' &&
      o.status !== 'Delivered' &&
      !o.isArchived &&
      (!o.assignedTailor || o.assignedTailor === 'Unassigned')
  ).length;

  const handleAddKarigar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await roomDb.addTailor(name.trim(), phone.trim(), role);
    } catch (err) {
      console.warn('Error adding tailor:', err);
    }
    setShowAddKarigarModal(false);
    setName('');
    setPhone('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Workforce & Capacity</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {tailors.length} In-House Staff • {totalKarigarsAcrossNetwork} Across Network
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Workforce Capacity, Allocation & Karigar Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time workload balancing, daily 8h shift allocations, bottleneck prevention, and master tailor performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddKarigarModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Karigar / Master Tailor</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Active Queue</span>
          <div className="text-2xl font-black text-slate-900">{activeJobs} Orders</div>
          <span className="text-[11px] text-slate-500 font-medium">{unassignedJobs} Unassigned Orders</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Active Staff</span>
          <div className="text-2xl font-black text-slate-900">{tailors.length || 1}</div>
          <span className="text-[11px] text-emerald-700 font-semibold">100% Active Availability</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Daily Capacity</span>
          <div className="text-2xl font-black text-slate-900">{Math.max(1, tailors.length) * 8}h / day</div>
          <span className="text-[11px] text-slate-500 font-medium">8h standard shift per artisan</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Network Scale</span>
          <div className="text-2xl font-black text-emerald-800">{totalKarigarsAcrossNetwork} Karigars</div>
          <span className="text-[11px] text-slate-500 font-medium">Across {shops.length || 1} Tenant Boutiques</span>
        </div>
      </div>

      {/* Search Filter Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search karigars by name, phone number, or role..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Karigars Matrix Grid */}
      {filteredSummaries.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
          No tailor profiles match the query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSummaries.map((summary) => {
            const cleanPhone = summary.phone ? clean10DigitPhone(summary.phone) : '';
            const whatsappUrl = cleanPhone
              ? getWhatsAppUrl(cleanPhone, `Hello ${summary.tailorName}, update from ShopScopers Tailor Operations.`)
              : '';

            const isOwner = summary.role === 'Owner' || (summary.tailorName && summary.tailorName.includes('Owner'));
            const totalHoursBooked = summary.activeWorkloadHours || 0;
            // 8 hours shift capacity ratio
            const capacityRatio = Math.min(100, Math.round((totalHoursBooked / 16) * 100));
            const isFull = summary.capacityStatus === 'Full / Busy' || totalHoursBooked >= 16;

            return (
              <div
                key={summary.tailorId || summary.tailorName}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0">
                        {summary.initials || summary.tailorName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{summary.tailorName}</h3>
                          {isOwner && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{summary.phone || 'In-House Master Tailor'}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        isFull
                          ? 'bg-rose-100 text-rose-800'
                          : capacityRatio > 60
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {summary.capacityStatus}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                      <span>Shift Load</span>
                      <span>{totalHoursBooked}h committed</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isFull ? 'bg-rose-500' : capacityRatio > 60 ? 'bg-amber-500' : 'bg-emerald-700'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, capacityRatio))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs mb-3">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Active Pipeline</span>
                      <span className="font-bold text-slate-900 text-sm">{summary.activeOrdersCount} In-Progress</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Finished Stitches</span>
                      <span className="font-bold text-emerald-800 text-sm">{summary.completedOrdersCount} Orders</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {cleanPhone ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium italic">Master Craft Desk</span>
                  )}

                  <button
                    onClick={() => setSelectedSummary(summary)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Inspect Queue ({summary.activeOrdersCount})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Queue Inspection Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">{selectedSummary.tailorName}</h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                    {selectedSummary.role}
                  </span>
                </div>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Assigned Orders Queue • {selectedSummary.activeOrdersCount} Active Jobs ({selectedSummary.activeWorkloadHours}h)
                </p>
              </div>
              <button
                onClick={() => setSelectedSummary(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              {selectedSummary.activeOrders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                  No active orders currently assigned to this tailor.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedSummary.activeOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-800 text-[11px]">{ord.id}</span>
                          <span className="font-bold text-slate-900 text-sm">{ord.customerName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                            {ord.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {ord.garmentType} • Due: <span className="font-bold text-slate-800">{ord.dueDate || 'Standard'}</span> ({ord.dueTime || '18:00'})
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">₹{ord.totalAmount}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{ord.estimatedHours || 4}h Est.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Historical Summary Box */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-800 block">Lifetime Output</span>
                  <span className="text-slate-600">{selectedSummary.completedOrdersCount} Stitches Delivered</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-800 text-sm">
                    ₹{selectedSummary.completedRevenueGenerated.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500 block text-[10px]">Stitching Value Generated</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedSummary(null)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Close Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Karigar Modal */}
      {showAddKarigarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Add Karigar / Master Tailor</h3>
                <p className="text-xs text-emerald-200 mt-0.5">Register a workforce member for workload balancing</p>
              </div>
              <button
                onClick={() => setShowAddKarigarModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddKarigar} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Karigar / Master Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Master Rafiq"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Mobile Phone (Optional for WhatsApp updates)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Role Designation</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                >
                  <option value="Tailor">Master Tailor / Karigar</option>
                  <option value="Owner">Shop Owner / Co-Partner</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddKarigarModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer transition-colors"
                >
                  Save Karigar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
