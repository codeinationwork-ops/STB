import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
  Radio,
  Clock,
  Filter,
  X,
} from 'lucide-react';
import { AdminBroadcastItem } from '../../../types';

interface AdminBroadcastsViewProps {
  adminToken: string;
}

export const AdminBroadcastsView: React.FC<AdminBroadcastsViewProps> = ({ adminToken }) => {
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AdminBroadcastItem['type']>('info');
  const [targetAudience, setTargetAudience] = useState<AdminBroadcastItem['targetAudience']>('all');
  const [submitting, setSubmitting] = useState(false);

  const fetchBroadcasts = async () => {
    try {
      const res = await fetch('/api/admin/broadcasts', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.broadcasts) setBroadcasts(data.broadcasts);
      }
    } catch (e) {
      console.warn('Failed to fetch broadcasts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, [adminToken]);

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          targetAudience,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.broadcast) {
          setBroadcasts([data.broadcast, ...broadcasts]);
        }
        setShowModal(false);
        setTitle('');
        setMessage('');
      }
    } catch (e) {
      console.warn('Failed to create broadcast:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        setBroadcasts(broadcasts.filter((b) => b.id !== id));
      }
    } catch (e) {
      console.warn('Failed to delete broadcast:', e);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tenant Messaging</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Push Alert Broadcast
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            System Broadcasts & Tenant Announcements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deliver maintenance notifications, festival peak workload advisories, and feature updates across shops.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New System Broadcast</span>
        </button>
      </div>

      {/* Broadcasts Feed */}
      <div className="space-y-4">
        {broadcasts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
            No active broadcast announcements published.
          </div>
        ) : (
          broadcasts.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'urgent'
                      ? 'bg-rose-100 text-rose-700'
                      : item.type === 'warning'
                      ? 'bg-amber-100 text-amber-700'
                      : item.type === 'feature'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-teal-100 text-teal-700'
                  }`}
                >
                  {item.type === 'urgent' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : item.type === 'feature' ? (
                    <Sparkles className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        item.type === 'urgent'
                          ? 'bg-rose-100 text-rose-800'
                          : item.type === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : item.type === 'feature'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      Audience: {item.targetAudience}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{item.message}</p>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                    <span>Published by {item.author}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteBroadcast(item.id)}
                className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors shrink-0 self-end sm:self-start cursor-pointer"
                title="Delete Announcement"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* New Broadcast Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">New Platform Broadcast</h3>
                <p className="text-xs text-emerald-200 mt-0.5">Send a message to all tenant tailor boutiques</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Headline / Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Diwali Rush Capacity Guidelines"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Alert Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                >
                  <option value="info">Information</option>
                  <option value="feature">New Feature / Release</option>
                  <option value="warning">Workload Warning</option>
                  <option value="urgent">Urgent Platform Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                >
                  <option value="all">All Tenant Shops</option>
                  <option value="active_shops">Active Shops Only</option>
                  <option value="trial">Trial Boutiques</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Message Content *</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type the message body that will appear on shop dashboards..."
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Broadcasting...' : 'Publish Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
