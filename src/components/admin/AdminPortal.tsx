import React, { useState, useEffect, useMemo } from 'react';
import { AdminTab, AdminUser, PlatformShop, TailorOrder, StaffTailor, TailorCustomer, ShopProfile, RevenueAnalytics } from '../../types';
import { AdminAuth } from './AdminAuth';
import { AdminLayout } from './AdminLayout';
import { AdminPlatformService } from '../../lib/adminPlatformData';
import { roomDb } from '../../lib/localRoomDb';
import { OrderReceiptModal } from '../crm/OrderReceiptModal';
import { AdminVerificationView } from './views/AdminVerificationView';
import { AdminShopsView } from './views/AdminShopsView';

interface AdminPortalProps {
  onExitToShop: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExitToShop }) => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<TailorOrder | null>(null);

  // Active Admin Tab initialized from URL if present - strictly 2 options
  const [currentTab, setCurrentTab] = useState<AdminTab>(() => {
    const rawPath = (window.location.pathname || '').toLowerCase();
    const rawHash = (window.location.hash || '').toLowerCase();
    const source = rawHash.replace(/^#\/?/, '') || rawPath.replace(/^\/+/, '');
    const parts = source.replace(/^admin\/?/, '').split('/');
    if (parts[0] && ['shops', 'directory'].includes(parts[0])) {
      return 'shops';
    }
    return 'verifications';
  });

  const handleSelectAdminTab = (tab: AdminTab) => {
    setCurrentTab(tab);
    try {
      const cleanPath = tab === 'verifications' ? '/admin' : `/admin/${tab}`;
      window.history.pushState(null, '', cleanPath);
    } catch {
      // ignore
    }
  };

  // Live platform and shop state directly initialized from roomDb
  const [shops, setShops] = useState<PlatformShop[]>(() => AdminPlatformService.getShops());
  const [orders, setOrders] = useState<TailorOrder[]>(() => roomDb.getOrders());
  const [tailors, setTailors] = useState<StaffTailor[]>(() => roomDb.getTailors());
  const [customers, setCustomers] = useState<TailorCustomer[]>(() => roomDb.getCustomers());
  const [shopProfile, setShopProfile] = useState<ShopProfile>(() => roomDb.getShopProfile());
  const [analytics, setAnalytics] = useState<RevenueAnalytics>(() => roomDb.getRevenueAnalytics());

  // Metrics for badges
  const pendingCount = useMemo(() => {
    return shops.filter((s) => s.status === 'Pending Verification' || s.isVerified === false).length;
  }, [shops]);

  const verifiedCount = useMemo(() => {
    return shops.filter((s) => s.status === 'Active' || s.isVerified === true).length;
  }, [shops]);

  // Initialize and check token
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_auth_token');
    if (!savedToken) {
      setVerifyingSession(false);
      return;
    }

    // Verify token with server
    fetch('/api/admin/verify', {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Invalid session');
      })
      .then((data) => {
        setAdminToken(savedToken);
        setAdminUser(data.admin);
      })
      .catch(() => {
        localStorage.removeItem('admin_auth_token');
        setAdminToken(null);
        setAdminUser(null);
      })
      .finally(() => {
        setVerifyingSession(false);
      });
  }, []);

  // Load platform data & subscribe to roomDb and Firestore real-time changes
  useEffect(() => {
    const refreshData = () => {
      setShops(AdminPlatformService.getShops());
      setOrders(roomDb.getOrders());
      setTailors(roomDb.getTailors());
      setCustomers(roomDb.getCustomers());
      setShopProfile(roomDb.getShopProfile());
      setAnalytics(roomDb.getRevenueAnalytics());
    };

    refreshData();
    const unsubRoom = roomDb.subscribe(refreshData);
    const unsubShops = AdminPlatformService.subscribe((updatedShops) => {
      setShops(updatedShops);
    });

    return () => {
      unsubRoom();
      unsubShops();
    };
  }, []);

  const handleLoginSuccess = (token: string, user: AdminUser) => {
    localStorage.setItem('admin_auth_token', token);
    setAdminToken(token);
    setAdminUser(user);
  };

  const handleLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (e) {
        console.warn('Logout API failed:', e);
      }
    }
    localStorage.removeItem('admin_auth_token');
    setAdminToken(null);
    setAdminUser(null);
  };

  if (verifyingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
            Verifying Admin Authorization...
          </span>
        </div>
      </div>
    );
  }

  if (!adminToken) {
    return <AdminAuth onAuthSuccess={handleLoginSuccess} onBackToApp={onExitToShop} />;
  }

  return (
    <AdminLayout
      currentTab={currentTab}
      onSelectTab={handleSelectAdminTab}
      adminUser={adminUser}
      pendingCount={pendingCount}
      verifiedCount={verifiedCount}
      onLogout={handleLogout}
      onExitToShop={onExitToShop}
    >
      {(currentTab === 'verifications' || currentTab === 'overview') && (
        <AdminVerificationView
          shops={shops}
          onUpdateShops={setShops}
          onNavigateToVerifiedShops={() => handleSelectAdminTab('shops')}
        />
      )}

      {currentTab === 'shops' && (
        <AdminShopsView shops={shops} onUpdateShops={setShops} />
      )}

      {selectedReceiptOrder && (
        <OrderReceiptModal
          order={selectedReceiptOrder}
          shopProfile={shopProfile}
          onClose={() => setSelectedReceiptOrder(null)}
          onUpdateStatus={(id, status) => {
            roomDb.updateOrderStatus(id, status);
          }}
          onDeliverOrder={(id) => {
            roomDb.updateOrderStatus(id, 'Delivered');
          }}
          onRecordPayment={(orderId, amount, mode, note) => {
            roomDb.recordPayment(orderId, amount, mode, note);
          }}
        />
      )}
    </AdminLayout>
  );
};
