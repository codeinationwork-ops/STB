import React, { useState, useEffect } from 'react';
import {
  Home,
  Bell,
  Plus,
  BarChart3,
  Settings as SettingsIcon,
  AlertTriangle,
  Scissors,
  CheckCircle,
  Code2,
  FileText,
} from 'lucide-react';
import {
  TailorOrder,
  TailorCustomer,
  StaffTailor,
  ShopProfile,
  RevenueAnalytics,
  OrderStatus,
  PaymentMode,
} from './types';
import { roomDb } from './lib/localRoomDb';

// Screens
import { Screen1Auth } from './components/crm/Screen1Auth';
import { Screen2Dashboard } from './components/crm/Screen2Dashboard';
import { Screen3NewOrder } from './components/crm/Screen3NewOrder';
import { Screen4OrderDetails } from './components/crm/Screen4OrderDetails';
import { Screen5OrdersManager } from './components/crm/Screen5OrdersManager';
import { Screen6AssignTimeline } from './components/crm/Screen6AssignTimeline';
import { Screen7ProfileSettings } from './components/crm/Screen7ProfileSettings';
import { Screen8RevenueReports } from './components/crm/Screen8RevenueReports';
import { Screen9CustomersDirectory } from './components/crm/Screen9CustomersDirectory';
import { AndroidSourceCodeModal } from './components/crm/AndroidSourceCodeModal';

import { DesktopLayout } from './components/crm/DesktopLayout';

type AppViewScreen =
  | 'auth'
  | 'dashboard'
  | 'new_order'
  | 'order_details'
  | 'orders'
  | 'overdue'
  | 'assign_timeline'
  | 'customers'
  | 'profile'
  | 'reports'
  | 'terms'
  | 'privacy'
  | 'refund';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // Start on Auth (Login / Sign Up)
  const [userPhone, setUserPhone] = useState<string>('');
  const [currentScreen, setCurrentScreen] = useState<AppViewScreen>('auth');
  const [ordersInitialTab, setOrdersInitialTab] = useState<'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived'>('all');

  const [orders, setOrders] = useState<TailorOrder[]>([]);
  const [customers, setCustomers] = useState<TailorCustomer[]>([]);
  const [tailors, setTailors] = useState<StaffTailor[]>([]);
  const [shopProfile, setShopProfile] = useState<ShopProfile>(roomDb.getShopProfile());
  const [analytics, setAnalytics] = useState<RevenueAnalytics>(roomDb.getRevenueAnalytics());

  const [selectedOrder, setSelectedOrder] = useState<TailorOrder | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);

  // Subscribe to Room Local Storage DB
  useEffect(() => {
    const load = () => {
      setOrders(roomDb.getOrders());
      setCustomers(roomDb.getCustomers());
      setTailors(roomDb.getTailors());
      setShopProfile(roomDb.getShopProfile());
      setAnalytics(roomDb.getRevenueAnalytics());
    };

    load();
    const unsubscribe = roomDb.subscribe(load);
    return () => unsubscribe();
  }, []);

  const overdueCount = orders.filter((o) => o.isOverdue && !o.isArchived).length;

  const handleAuthSuccess = (
    phone: string,
    shopDetails?: { shopName: string; ownerName: string }
  ) => {
    setUserPhone(phone);
    if (shopDetails) {
      roomDb.updateShopProfile({
        shopName: shopDetails.shopName,
        ownerName: shopDetails.ownerName,
        phoneNumber: phone,
      });
    }
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentScreen('auth');
  };

  const handleSaveNewOrder = (order: TailorOrder) => {
    roomDb.saveOrder(order);
    setSelectedOrder(order);
    setCurrentScreen('dashboard');
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    roomDb.updateOrderStatus(orderId, status);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status });
    }
  };

  const handleDeliverOrder = (
    orderId: string,
    balancePaid: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ) => {
    roomDb.deliverOrderWithSettlement(orderId, balancePaid, paymentMode, stitchedPhotos, notes);
    const updated = roomDb.getOrders().find((o) => o.id === orderId);
    if (updated && selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(updated);
    }
  };

  const handleArchiveOrder = (orderId: string) => {
    const allOrders = roomDb.getOrders();
    const ord = allOrders.find((o) => o.id === orderId);
    if (ord) {
      ord.isArchived = true;
      roomDb.saveOrder(ord);
    }
  };

  const handleUnarchiveOrder = (orderId: string) => {
    const allOrders = roomDb.getOrders();
    const ord = allOrders.find((o) => o.id === orderId);
    if (ord) {
      ord.isArchived = false;
      roomDb.saveOrder(ord);
    }
  };

  const handleNavigateToOrders = (
    tab: 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived' = 'all'
  ) => {
    setOrdersInitialTab(tab);
    setCurrentScreen('orders');
  };

  const handleConfirmAssignment = (
    orderId: string,
    assignedTailor: string,
    estimatedHours: number,
    offerMessage: string,
    dueDate: string,
    dueTime: string
  ) => {
    roomDb.updateOrderAssignment(orderId, assignedTailor, estimatedHours, offerMessage, dueDate, dueTime);
    const updated = roomDb.getOrders().find((o) => o.id === orderId);
    if (updated) setSelectedOrder(updated);
    setCurrentScreen('order_details');
  };

  const handleTriggerSync = async () => {
    await roomDb.triggerCloudSync();
  };

  const renderActiveScreen = (isDesktopView = false) => {
    // Policy pages can be accessed by authenticated or unauthenticated users
    if (['terms', 'privacy', 'refund'].includes(currentScreen)) {
      let title = 'Terms & Conditions';
      let content = (
        <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
          <p>
            Welcome to <strong>ShopScoper Tailor CRM & Ledger</strong> ("we", "our", "us"). By accessing or using our mobile and web applications, you agree to be bound by these Terms of Service.
          </p>
          <h3 className="text-sm font-bold text-slate-900 mt-3">1. Service Overview</h3>
          <p>
            ShopScoper provides an offline-first ledger, measurement vault, and order tracking system designed for tailors, boutiques, and custom garment designers. Your data is stored locally in an encrypted Room SQLite database and synchronized with cloud Firestore vaults.
          </p>
          <h3 className="text-sm font-bold text-slate-900 mt-3">2. User Responsibilities</h3>
          <p>
            You are responsible for maintaining the confidentiality of your 4-digit security PIN and mobile login credentials. You agree to use the service only for lawful business operations and customer order management.
          </p>
          <h3 className="text-sm font-bold text-slate-900 mt-3">3. Data Integrity & Sync</h3>
          <p>
            While ShopScoper employs automatic offline caching and cloud sync, shop owners are advised to periodically trigger manual cloud backup to ensure measurement records remain protected.
          </p>
        </div>
      );

      if (currentScreen === 'privacy') {
        title = 'Privacy Policy';
        content = (
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              Your privacy is paramount. ShopScoper is committed to protecting the measurement records, customer contact details, and financial ledgers created in your shop.
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-3">1. Information Collection</h3>
            <p>
              We collect shop details (Shop Name, Owner Name, Phone Number) and customer order specifications (garment measurements, due dates, advance payments) entered by you into the application.
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-3">2. Security & Encryption</h3>
            <p>
              All local data is stored using Android Room SQLite encryption. Cloud transfers use TLS encryption to Firebase Firestore. We never sell or distribute your customer database or phone numbers to third parties.
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-3">3. WhatsApp Communications</h3>
            <p>
              Order slips and WhatsApp updates generated by ShopScoper are triggered directly from your device using standard WhatsApp protocol links without storing messages on secondary servers.
            </p>
          </div>
        );
      } else if (currentScreen === 'refund') {
        title = 'Refund Policy';
        content = (
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              Thank you for choosing ShopScoper Tailor CRM. We aim to ensure total satisfaction for tailor shops and fashion designers using our software.
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-3">1. 7-Day Money Back Guarantee</h3>
            <p>
              If you purchase a premium multi-device cloud synchronization license and are not completely satisfied with the software, you are eligible for a full 100% refund within 7 days of subscription activation.
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-3">2. Refund Request Process</h3>
            <p>
              To initiate a refund, please send an email to <strong>support@shopscoper.com</strong> with your registered mobile number and shop name. Refunds are processed to the original payment method within 3 to 5 business days.
            </p>
          </div>
        );
      }

      return (
        <PolicyPage
          title={title}
          content={content}
          isAuthenticated={isAuthenticated}
          onBack={() => setCurrentScreen(isAuthenticated ? 'dashboard' : 'auth')}
        />
      );
    }

    if (!isAuthenticated || currentScreen === 'auth') {
      return (
        <Screen1Auth
          onAuthSuccess={handleAuthSuccess}
          defaultMode="landing"
          onNavigatePolicy={(p) => setCurrentScreen(p)}
        />
      );
    }

    switch (currentScreen) {
      case 'dashboard':
        return (
          <Screen2Dashboard
            orders={orders}
            tailors={tailors}
            analytics={analytics}
            shopProfile={shopProfile}
            userPhone={userPhone}
            isDesktopView={isDesktopView}
            onNewOrderClick={() => setCurrentScreen('new_order')}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setCurrentScreen('order_details');
            }}
            onAssignTimelineClick={(ord) => {
              if (ord) setSelectedOrder(ord);
              setCurrentScreen('assign_timeline');
            }}
            onProfileClick={() => setCurrentScreen('profile')}
            onOverdueClick={() => handleNavigateToOrders('overdue')}
            onOrdersClick={(tab) => handleNavigateToOrders(tab || 'all')}
            onReportsClick={() => setCurrentScreen('reports')}
            onQuickAssignTailor={(orderId, tailorName, estimatedHours, dueDate, dueTime) => {
              const ord = orders.find((o) => o.id === orderId);
              if (ord) {
                const finalDueDate = dueDate || ord.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const finalDueTime = dueTime || ord.dueTime || '18:00';
                const finalHours = estimatedHours || ord.estimatedHours || 4;
                const finalMsg = `Hello ${ord.customerName}, your ${ord.garmentType} order (${ord.id}) is assigned to ${tailorName}. Promised delivery: ${finalDueDate} at ${finalDueTime}.`;
                roomDb.updateOrderAssignment(
                  orderId,
                  tailorName,
                  finalHours,
                  finalMsg,
                  finalDueDate,
                  finalDueTime
                );
              }
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeliverOrder={handleDeliverOrder}
          />
        );
      case 'new_order':
        return (
          <Screen3NewOrder
            isDesktopView={isDesktopView}
            onBack={() => setCurrentScreen('dashboard')}
            onSaveOrder={handleSaveNewOrder}
            existingCustomers={customers}
          />
        );
      case 'order_details':
        return selectedOrder ? (
          <Screen4OrderDetails
            order={selectedOrder}
            shopProfile={shopProfile}
            isDesktopView={isDesktopView}
            onBack={() => setCurrentScreen('dashboard')}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeliverOrder={handleDeliverOrder}
            onAssignTimelineClick={(ord) => {
              setSelectedOrder(ord);
              setCurrentScreen('assign_timeline');
            }}
          />
        ) : (
          <Screen2Dashboard
            orders={orders}
            tailors={tailors}
            analytics={analytics}
            shopProfile={shopProfile}
            userPhone={userPhone}
            isDesktopView={isDesktopView}
            onNewOrderClick={() => setCurrentScreen('new_order')}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setCurrentScreen('order_details');
            }}
            onAssignTimelineClick={(ord) => {
              if (ord) setSelectedOrder(ord);
              setCurrentScreen('assign_timeline');
            }}
            onProfileClick={() => setCurrentScreen('profile')}
            onOverdueClick={() => handleNavigateToOrders('overdue')}
            onOrdersClick={(tab) => handleNavigateToOrders(tab || 'all')}
            onReportsClick={() => setCurrentScreen('reports')}
            onQuickAssignTailor={(orderId, tailorName, estimatedHours) => {
              const ord = orders.find((o) => o.id === orderId);
              if (ord) {
                roomDb.updateOrderAssignment(
                  orderId,
                  tailorName,
                  estimatedHours || ord.estimatedHours || 4,
                  ord.offerMessage || '',
                  ord.dueDate,
                  ord.dueTime
                );
              }
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeliverOrder={handleDeliverOrder}
          />
        );
      case 'orders':
      case 'overdue':
        return (
          <Screen5OrdersManager
            orders={orders}
            shopProfile={shopProfile}
            tailors={tailors}
            initialTab={currentScreen === 'overdue' ? 'overdue' : ordersInitialTab}
            isDesktopView={isDesktopView}
            onBack={() => setCurrentScreen('dashboard')}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setCurrentScreen('order_details');
            }}
            onArchiveOrder={handleArchiveOrder}
            onUnarchiveOrder={handleUnarchiveOrder}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeliverOrder={handleDeliverOrder}
            onAssignTimelineClick={(ord) => {
              if (ord) setSelectedOrder(ord);
              setCurrentScreen('assign_timeline');
            }}
            onNewOrderClick={() => setCurrentScreen('new_order')}
            onExtendDueDate={(orderId, newDate) => {
              const ord = orders.find((o) => o.id === orderId);
              if (ord) {
                ord.dueDate = newDate;
                ord.isOverdue = false;
                roomDb.saveOrder(ord);
              }
            }}
          />
        );
      case 'assign_timeline':
        return (
          <Screen6AssignTimeline
            order={selectedOrder}
            orders={orders}
            tailors={tailors}
            isDesktopView={isDesktopView}
            onBack={() => setCurrentScreen('dashboard')}
            onConfirmAssignment={handleConfirmAssignment}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setCurrentScreen('order_details');
            }}
          />
        );
      case 'customers':
        return (
          <Screen9CustomersDirectory
            customers={customers}
            orders={orders}
            isDesktopView={isDesktopView}
            onBack={() => setCurrentScreen('dashboard')}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setCurrentScreen('order_details');
            }}
            onNewOrderForCustomer={(cust) => {
              setCurrentScreen('new_order');
            }}
          />
        );
      case 'profile':
        return (
          <Screen7ProfileSettings
            profile={shopProfile}
            tailors={tailors}
            isDesktopView={isDesktopView}
            onBack={() => setCurrentScreen('dashboard')}
            onUpdateProfile={(prof) => roomDb.updateShopProfile(prof)}
            onAddTailor={(name, phone, role) => roomDb.addTailor(name, phone, role)}
            onDeleteTailor={(id) => roomDb.deleteTailor(id)}
            onTriggerSync={handleTriggerSync}
            onOpenSourceCodeModal={() => setShowCodeModal(true)}
            onLogout={handleLogout}
          />
        );
      case 'reports':
        return (
          <Screen8RevenueReports
            analytics={analytics}
            isDesktopView={isDesktopView}
            onBack={() => setCurrentScreen('dashboard')}
          />
        );
      default:
        return (
          <Screen2Dashboard
            orders={orders}
            tailors={tailors}
            analytics={analytics}
            userPhone={userPhone}
            isDesktopView={isDesktopView}
            onNewOrderClick={() => setCurrentScreen('new_order')}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setCurrentScreen('order_details');
            }}
            onAssignTimelineClick={(ord) => {
              if (ord) setSelectedOrder(ord);
              setCurrentScreen('assign_timeline');
            }}
            onProfileClick={() => setCurrentScreen('profile')}
            onOverdueClick={() => handleNavigateToOrders('overdue')}
            onOrdersClick={(tab) => handleNavigateToOrders(tab || 'all')}
            onReportsClick={() => setCurrentScreen('reports')}
            onQuickAssignTailor={(orderId, tailorName, estimatedHours, dueDate, dueTime) => {
              const ord = orders.find((o) => o.id === orderId);
              if (ord) {
                const finalDueDate = dueDate || ord.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const finalDueTime = dueTime || ord.dueTime || '18:00';
                const finalHours = estimatedHours || ord.estimatedHours || 4;
                const finalMsg = `Hello ${ord.customerName}, your ${ord.garmentType} order (${ord.id}) is assigned to ${tailorName}. Promised delivery: ${finalDueDate} at ${finalDueTime}.`;
                roomDb.updateOrderAssignment(
                  orderId,
                  tailorName,
                  finalHours,
                  finalMsg,
                  finalDueDate,
                  finalDueTime
                );
              }
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        );
    }
  };

  return (
    <>
      <DesktopLayout
        isAuthenticated={isAuthenticated}
        userPhone={userPhone}
        shopProfile={shopProfile}
        currentScreen={currentScreen}
        overdueCount={overdueCount}
        onNavigate={(sc) => {
          if (sc === 'orders') {
            setOrdersInitialTab('all');
          } else if (sc === 'overdue') {
            setOrdersInitialTab('overdue');
          }
          setCurrentScreen(sc);
        }}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onTriggerSync={handleTriggerSync}
        onOpenCodeModal={() => setShowCodeModal(true)}
      >
        {renderActiveScreen(true)}
      </DesktopLayout>

      {/* Android Jetpack Compose Source Code Inspector Modal */}
      {showCodeModal && (
        <AndroidSourceCodeModal onClose={() => setShowCodeModal(false)} />
      )}
    </>
  );
}

// Policy Page Sub-Component
function PolicyPage({
  title,
  content,
  isAuthenticated,
  onBack,
}: {
  title: string;
  content: React.ReactNode;
  isAuthenticated?: boolean;
  onBack: () => void;
}) {
  return (
    <div className="p-6 md:p-8 bg-white min-h-full font-sans max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
        >
          <span>{isAuthenticated ? '← Back to Dashboard' : '← Back to Home / Login'}</span>
        </button>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          ShopScoper Legal
        </span>
      </div>

      <h1 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{title}</h1>
      
      <div className="text-slate-700 bg-slate-50 p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        {content}
      </div>

      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>If you have questions regarding these policies, please write to <strong>support@shopscoper.com</strong></p>
      </div>
    </div>
  );
}
