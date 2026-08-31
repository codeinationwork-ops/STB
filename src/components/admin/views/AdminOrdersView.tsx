import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Download,
  Check,
  ChevronDown,
  X,
  FileText,
  DollarSign,
  Send,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { TailorOrder, OrderStatus, StaffTailor, ShopProfile } from '../../../types';
import { roomDb } from '../../../lib/localRoomDb';
import { clean10DigitPhone, getWhatsAppUrl } from '../../../lib/phoneUtils';

interface AdminOrdersViewProps {
  orders: TailorOrder[];
  tailors: StaffTailor[];
  shopProfile: ShopProfile;
  onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void;
  onSelectOrder?: (order: TailorOrder) => void;
}

export const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({
  orders,
  tailors,
  shopProfile,
  onUpdateOrderStatus,
  onSelectOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus | 'Overdue'>('ALL');
  const [garmentFilter, setGarmentFilter] = useState<string>('ALL');
  const [tailorFilter, setTailorFilter] = useState<string>('ALL');

  // Selected Order for Inspection Modal
  const [inspectOrder, setInspectOrder] = useState<TailorOrder | null>(null);

  // Status Change State
  const [statusDropdownOrderId, setStatusDropdownOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = (searchQuery || '').toLowerCase();
      const matchSearch =
        !q ||
        Boolean(ord.id && typeof ord.id === 'string' && ord.id.toLowerCase().includes(q)) ||
        Boolean(ord.customerName && typeof ord.customerName === 'string' && ord.customerName.toLowerCase().includes(q)) ||
        Boolean(ord.customerPhone && typeof ord.customerPhone === 'string' && ord.customerPhone.includes(searchQuery)) ||
        Boolean(ord.garmentType && typeof ord.garmentType === 'string' && ord.garmentType.toLowerCase().includes(q)) ||
        Boolean(ord.assignedTailor && typeof ord.assignedTailor === 'string' && ord.assignedTailor.toLowerCase().includes(q));

      let matchStatus = true;
      if (statusFilter === 'Overdue') {
        matchStatus = ord.isOverdue && !ord.isArchived && ord.status !== 'Completed' && ord.status !== 'Delivered';
      } else if (statusFilter !== 'ALL') {
        matchStatus = ord.status === statusFilter;
      }

      const matchGarment = garmentFilter === 'ALL' || ord.garmentType === garmentFilter;
      const matchTailor = tailorFilter === 'ALL' || ord.assignedTailor === tailorFilter;

      return matchSearch && matchStatus && matchGarment && matchTailor;
    });
  }, [orders, searchQuery, statusFilter, garmentFilter, tailorFilter]);

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    roomDb.updateOrderStatus(orderId, newStatus);
    if (onUpdateOrderStatus) onUpdateOrderStatus(orderId, newStatus);
    if (inspectOrder && inspectOrder.id === orderId) {
      setInspectOrder({ ...inspectOrder, status: newStatus });
    }
    setStatusDropdownOrderId(null);
  };

  const handleExportOrdersCSV = () => {
    const headers = ['Order ID', 'Customer', 'Phone', 'Garment', 'Status', 'Due Date', 'Assigned Tailor', 'Total (INR)', 'Advance (INR)', 'Balance Due'];
    const rows = filteredOrders.map((o) => [
      o.id,
      `"${o.customerName}"`,
      `"${o.customerPhone}"`,
      `"${o.garmentType}"`,
      `"${o.status}"`,
      `"${o.dueDate || ''}"`,
      `"${o.assignedTailor || 'Unassigned'}"`,
      o.totalAmount,
      o.advancePaid,
      o.balanceDue,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShopScopers_Master_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const garmentTypes = Array.from(new Set(orders.map((o) => o.garmentType).filter(Boolean)));

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Master Production Ledger</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {orders.length} Total Platform Orders
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Master Orders Ledger & Production Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status updates, customer measurement inspection, assignment tracking, and settlement checks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportOrdersCSV}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Orders CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, customer name, phone, or tailor..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
            />
          </div>

          {/* Garment Type Dropdown */}
          <select
            value={garmentFilter}
            onChange={(e) => setGarmentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700"
          >
            <option value="ALL">All Garments</option>
            {garmentTypes.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Assigned Tailor Dropdown */}
          <select
            value={tailorFilter}
            onChange={(e) => setTailorFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700"
          >
            <option value="ALL">All Karigars</option>
            {tailors.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 pt-2 border-t border-slate-100">
          {(['ALL', 'New / Cutting', 'Assigned', 'Stitching in Progress', 'Trial', 'Completed', 'Delivered', 'Overdue'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? st === 'Overdue'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-emerald-800 text-white shadow-xs'
                  : st === 'Overdue'
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No orders match the selected filters or search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 pl-4">Order ID</th>
                  <th className="py-3.5">Customer Details</th>
                  <th className="py-3.5">Garment & Type</th>
                  <th className="py-3.5">Promised Due</th>
                  <th className="py-3.5">Assigned Tailor</th>
                  <th className="py-3.5">Financials</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => {
                  const cleanPhone = clean10DigitPhone(ord.customerPhone);
                  const whatsappUrl = getWhatsAppUrl(
                    cleanPhone,
                    `Hello ${ord.customerName}, update regarding your order ${ord.id} (${ord.garmentType}): Current status is ${ord.status}. Promised delivery: ${ord.dueDate}.`
                  );

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pl-4">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                          {ord.id}
                        </span>
                        <div className="text-slate-400 text-[10px] mt-0.5">{ord.createdDate}</div>
                      </td>

                      <td className="py-3">
                        <div className="font-bold text-slate-900">{ord.customerName}</div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{ord.customerPhone}</span>
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="font-semibold text-slate-800">{ord.garmentType}</div>
                        <div className="text-slate-400 text-[10px]">{ord.genderCategory} • {ord.subTypeStyle || 'Custom Stitch'}</div>
                      </td>

                      <td className="py-3">
                        <div className={`font-bold flex items-center gap-1 ${ord.isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                          {ord.isOverdue && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
                          <span>{ord.dueDate || 'Standard'}</span>
                        </div>
                        <div className="text-slate-400 text-[10px]">{ord.dueTime || '18:00'}</div>
                      </td>

                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {ord.assignedTailor || 'Unassigned'}
                        </span>
                      </td>

                      <td className="py-3">
                        <div className="font-bold text-slate-900">₹{ord.totalAmount}</div>
                        <div className="text-[10px]">
                          {ord.balanceDue > 0 ? (
                            <span className="text-amber-600 font-semibold">Due: ₹{ord.balanceDue}</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">Fully Paid</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 relative">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setStatusDropdownOrderId(statusDropdownOrderId === ord.id ? null : ord.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                              ord.status === 'Delivered'
                                ? 'bg-slate-100 text-slate-700'
                                : ord.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'Trial'
                                ? 'bg-teal-100 text-teal-800'
                                : ord.status === 'Stitching in Progress'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <span>{ord.status}</span>
                            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                          </button>

                          {statusDropdownOrderId === ord.id && (
                            <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-1 text-xs space-y-0.5">
                              {(['New / Cutting', 'Assigned', 'Stitching in Progress', 'Trial', 'Completed', 'Delivered'] as OrderStatus[]).map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleUpdateStatus(ord.id, st)}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 text-[11px] flex items-center justify-between"
                                >
                                  <span>{st}</span>
                                  {ord.status === st && <Check className="w-3 h-3 text-emerald-700" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                            title="WhatsApp Customer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setInspectOrder(ord)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Slip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Inspection Modal (Measurement Vault & Specs) */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">{inspectOrder.id}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-700 text-white">
                    {inspectOrder.status}
                  </span>
                </div>
                <h3 className="font-bold text-base mt-0.5">{inspectOrder.customerName} • {inspectOrder.garmentType}</h3>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Customer & Due Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Contact</span>
                  <div className="font-bold text-slate-900">{inspectOrder.customerName}</div>
                  <div className="text-slate-600">{inspectOrder.customerPhone}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Promised Delivery</span>
                  <div className={`font-bold ${inspectOrder.isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                    {inspectOrder.dueDate || 'Not set'} at {inspectOrder.dueTime || '18:00'}
                  </div>
                  <div className="text-slate-500">Assigned: {inspectOrder.assignedTailor || 'Unassigned'}</div>
                </div>
              </div>

              {/* Measurement Vault */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-emerald-700" />
                  Measurement Matrix (Inches)
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {Object.entries(inspectOrder.measurements || {}).map(([key, val]) => {
                    if (!val) return null;
                    return (
                      <div key={key} className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-black text-slate-900 text-sm">{val}"</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Ledger */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                  Financial Settlement
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Stitching / Order Value:</span>
                  <span className="font-bold text-slate-900">₹{inspectOrder.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Advance Received ({inspectOrder.paymentMode}):</span>
                  <span className="font-bold text-emerald-700">₹{inspectOrder.advancePaid}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Balance Due:</span>
                  <span className={`font-black ${inspectOrder.balanceDue > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                    ₹{inspectOrder.balanceDue}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectOrder(null)}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer hover:bg-emerald-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
