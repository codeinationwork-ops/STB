import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home,
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
  MarketplaceProduct,
  UploadedCatalogueDoc,
  BoutiqueAppointment,
  InventoryItem,
} from './types';
import { roomDb } from './lib/localRoomDb';
import { getLocalDateStr, normalizeDateStr } from './lib/dateUtils';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  buildRoutePath,
  parseRouteFromUrl,
  setUrlPath,
  RouteState,
  AppScreen,
} from './lib/appRouter';

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
import { ScreenMarketplaceCatalogue } from './components/crm/ScreenMarketplaceCatalogue';
import { ScreenAppointmentsManager } from './components/crm/ScreenAppointmentsManager';
import { ScreenInventoryManager } from './components/crm/ScreenInventoryManager';
import { LivePublicCataloguePage } from './components/crm/LivePublicCataloguePage';
import { OrderReceiptModal } from './components/crm/OrderReceiptModal';
import { ModernOrderPopups, ModernOrderPopupType } from './components/crm/ModernOrderPopups';

import { DesktopLayout } from './components/crm/DesktopLayout';
import { AdminPortal } from './components/admin/AdminPortal';
import { CustomerPortal } from './components/crm/CustomerPortal';
import { CustomerIndexPage } from './components/crm/CustomerIndexPage';
import { BoutiqueVerificationLockScreen } from './components/crm/BoutiqueVerificationLockScreen';

type AppViewScreen = AppScreen;

export default function App() {
  const initialSession = roomDb.getAuthSession();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!initialSession?.isAuthenticated);
  const [userPhone, setUserPhone] = useState<string>(() => initialSession?.phoneNumber || '');

  // Parse initial route from browser URL
  const initialParsedRoute = useMemo(() => parseRouteFromUrl(!!initialSession?.isAuthenticated), []);

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => initialParsedRoute.screen === 'admin');
  const [currentScreen, setCurrentScreen] = useState<AppViewScreen>(() => initialParsedRoute.screen);
  const [ordersInitialTab, setOrdersInitialTab] = useState<'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived'>(
    () => initialParsedRoute.ordersTab || 'all'
  );
  const [prefilledProductForNewOrder, setPrefilledProductForNewOrder] = useState<MarketplaceProduct | null>(null);
  const [newOrderInitialCategory, setNewOrderInitialCategory] = useState<'New Stitch' | 'Alteration' | 'Sale'>(
    () => initialParsedRoute.newOrderCategory || 'New Stitch'
  );
  const [newOrderInitialMode, setNewOrderInitialMode] = useState<'stitch' | 'alter' | 'sale'>(
    () => initialParsedRoute.newOrderMode || 'stitch'
  );
  const [landingSection, setLandingSection] = useState<'features' | 'how-it-works' | 'pricing' | 'testimonials' | undefined>(
    initialParsedRoute.landingSection
  );
  const [landingAuthModal, setLandingAuthModal] = useState<'login' | 'signup' | 'customer' | null>(
    (initialParsedRoute.authModal as 'login' | 'signup' | 'customer' | null) || null
  );
  const [routeShopPhone, setRouteShopPhone] = useState<string | undefined>(initialParsedRoute.shopPhone);
  const [routeShopScoperCode, setRouteShopScoperCode] = useState<string | undefined>(initialParsedRoute.shopScoperCode);

  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('boutique_customer_phone') || '';
    } catch {
      return '';
    }
  });

  const [orders, setOrders] = useState<TailorOrder[]>([]);
  const [customers, setCustomers] = useState<TailorCustomer[]>([]);
  const [tailors, setTailors] = useState<StaffTailor[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [catalogueDocs, setCatalogueDocs] = useState<UploadedCatalogueDoc[]>([]);
  const [appointments, setAppointments] = useState<BoutiqueAppointment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shopProfile, setShopProfile] = useState<ShopProfile>(roomDb.getShopProfile());
  const [analytics, setAnalytics] = useState<RevenueAnalytics>(roomDb.getRevenueAnalytics());

  const [selectedOrder, setSelectedOrder] = useState<TailorOrder | null>(null);
  const [receiptModalOrder, setReceiptModalOrder] = useState<TailorOrder | null>(null);
  const [activeOrderPopup, setActiveOrderPopup] = useState<ModernOrderPopupType>(null);

  // Central Router Navigation Function
  const navigate = useCallback((target: AppScreen | RouteState, replace: boolean = false) => {
    const route: RouteState = typeof target === 'string' ? { screen: target } : target;

    if (route.screen === 'admin') {
      setIsAdminRoute(true);
      setCurrentScreen('admin');
      setUrlPath(route, replace);
      return;
    }

    setIsAdminRoute(false);
    setCurrentScreen(route.screen);

    if (route.ordersTab) {
      setOrdersInitialTab(route.ordersTab);
    }
    if (route.newOrderCategory) {
      setNewOrderInitialCategory(route.newOrderCategory);
    }
    if (route.newOrderMode) {
      setNewOrderInitialMode(route.newOrderMode);
    }
    if (route.landingSection) {
      setLandingSection(route.landingSection);
    }
    if (route.authModal !== undefined) {
      setLandingAuthModal(route.authModal);
    }
    if (route.shopPhone !== undefined) {
      setRouteShopPhone(route.shopPhone);
    }
    if (route.shopScoperCode !== undefined) {
      setRouteShopScoperCode(route.shopScoperCode);
    }

    if (route.orderId) {
      const all = roomDb.getOrders();
      const cleanTarget = route.orderId.toLowerCase().replace(/^#/, '');
      const found = all.find(
        (o) =>
          o.id.toLowerCase() === route.orderId?.toLowerCase() ||
          o.id.toLowerCase().replace(/^#/, '') === cleanTarget
      );
      if (found) {
        setSelectedOrder(found);
      }
    }

    setUrlPath(route, replace);
  }, []);

  // Listen to browser URL changes (popstate / hashchange) for back/forward navigation
  useEffect(() => {
    const handleLocationCheck = () => {
      const parsed = parseRouteFromUrl(isAuthenticated);
      if (parsed.screen === 'admin') {
        setIsAdminRoute(true);
        setCurrentScreen('admin');
        return;
      }

      setIsAdminRoute(false);
      setCurrentScreen(parsed.screen);

      if (parsed.ordersTab) setOrdersInitialTab(parsed.ordersTab);
      if (parsed.newOrderCategory) setNewOrderInitialCategory(parsed.newOrderCategory);
      if (parsed.newOrderMode) setNewOrderInitialMode(parsed.newOrderMode);
      if (parsed.landingSection) setLandingSection(parsed.landingSection);
      if (parsed.authModal !== undefined) setLandingAuthModal(parsed.authModal);
      if (parsed.shopPhone !== undefined) setRouteShopPhone(parsed.shopPhone);
      if (parsed.shopScoperCode !== undefined) setRouteShopScoperCode(parsed.shopScoperCode);

      if (parsed.orderId) {
        const all = roomDb.getOrders();
        const cleanTarget = parsed.orderId.toLowerCase().replace(/^#+/, '');
        const found = all.find(
          (o) =>
            o.id.toLowerCase() === parsed.orderId?.toLowerCase() ||
            o.id.toLowerCase().replace(/^#+/, '') === cleanTarget
        );
        if (found) {
          setSelectedOrder(found);
        }
      }
    };

    // Clean up any initial hash in the address bar on mount
    if (window.location.hash) {
      const parsed = parseRouteFromUrl(isAuthenticated);
      setUrlPath(parsed, true);
    } else {
      handleLocationCheck();
    }

    window.addEventListener('popstate', handleLocationCheck);
    window.addEventListener('hashchange', handleLocationCheck);
    return () => {
      window.removeEventListener('popstate', handleLocationCheck);
      window.removeEventListener('hashchange', handleLocationCheck);
    };
  }, [isAuthenticated]);

  // Subscribe to Room DB & Firebase Auth Session state
  useEffect(() => {
    const load = () => {
      setOrders(roomDb.getOrders());
      setCustomers(roomDb.getCustomers());
      setTailors(roomDb.getTailors());
      setProducts(roomDb.getProducts());
      setCatalogueDocs(roomDb.getCatalogueDocs());
      setAppointments(roomDb.getAppointments());
      setInventory(roomDb.getInventory());
      setShopProfile(roomDb.getShopProfile());
      setAnalytics(roomDb.getRevenueAnalytics());

      // Sync active session if available
      const activeSession = roomDb.getAuthSession();
      if (activeSession?.isAuthenticated) {
        setIsAuthenticated(true);
        if (activeSession.phoneNumber) {
          setUserPhone(activeSession.phoneNumber);
        }
      }
    };

    load();
    const unsubscribeRoomDb = roomDb.subscribe(load);

    // Also listen for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const currentSession = roomDb.getAuthSession();
        if (!currentSession?.isAuthenticated) {
          roomDb.saveAuthSession({
            isAuthenticated: true,
            phoneNumber: user.phoneNumber || user.email || '',
            loginTimestamp: new Date().toISOString(),
            role: 'BoutiqueOwner',
          });
        }
        setIsAuthenticated(true);
        if (user.phoneNumber || user.email) {
          setUserPhone(user.phoneNumber || user.email || '');
        }
      }
    });

    return () => {
      unsubscribeRoomDb();
      unsubscribeAuth();
    };
  }, []);

  const overdueCount = orders.filter((o) => o.isOverdue && !o.isArchived).length;
  const lowStockCount = inventory.filter((i) => i.quantity <= i.minStockAlert).length;

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

    // Persist login session on this device indefinitely until explicit logout
    roomDb.saveAuthSession({
      isAuthenticated: true,
      phoneNumber: phone,
      loginTimestamp: new Date().toISOString(),
      shopName: shopDetails?.shopName,
      ownerName: shopDetails?.ownerName,
    });

    setIsAuthenticated(true);
    navigate('dashboard');
  };

  const handleCustomerAuthSuccess = (phone: string) => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    setCustomerPhone(clean);
    try {
      localStorage.setItem('boutique_customer_phone', clean);
    } catch {}
    navigate({ screen: 'customer_portal' });
  };

  const handleCustomerLogout = () => {
    setCustomerPhone('');
    try {
      localStorage.removeItem('boutique_customer_phone');
    } catch {}
    navigate('auth');
  };

  const handleLogout = () => {
    // Clear persisted session and local data on this device
    roomDb.clearAuthSession();
    roomDb.clearAllLocalData();
    setIsAuthenticated(false);
    setUserPhone('');
    navigate('auth');
  };

  const handleSaveNewOrder = (order: TailorOrder) => {
    roomDb.saveOrder(order);
    setSelectedOrder(order);
    navigate('dashboard');
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
    navigate({ screen: 'orders', ordersTab: tab });
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
    navigate({ screen: 'order_details', orderId });
  };

  const handleTriggerSync = async () => {
    await roomDb.triggerCloudSync();
  };

  const handleSaveProduct = async (product: MarketplaceProduct) => {
    await roomDb.saveProduct(product);
  };

  const handleDeleteProduct = async (productId: string) => {
    await roomDb.deleteProduct(productId);
  };

  const handleToggleProductStatus = async (
    productId: string,
    status: 'Available' | 'Made to Order' | 'Out of Stock' | 'Draft'
  ) => {
    await roomDb.toggleProductStatus(productId, status);
  };

  const handleBulkSaveProducts = async (newProducts: MarketplaceProduct[]) => {
    await roomDb.bulkSaveProducts(newProducts);
  };

  const handleClearAllProducts = async () => {
    await roomDb.clearAllProducts();
  };

  const handleSaveCatalogueDoc = async (doc: UploadedCatalogueDoc) => {
    await roomDb.saveCatalogueDoc(doc);
  };

  const handleDeleteCatalogueDoc = async (docId: string) => {
    await roomDb.deleteCatalogueDoc(docId);
  };

  const handleCreateOrderFromProduct = (product: MarketplaceProduct) => {
    setPrefilledProductForNewOrder(product);
    setActiveOrderPopup('stitch');
  };

  const handleStartStitch = () => {
    setPrefilledProductForNewOrder(null);
    setActiveOrderPopup('stitch');
  };

  const handleStartAlter = () => {
    setPrefilledProductForNewOrder(null);
    setActiveOrderPopup('alter');
  };

  const handleStartSale = () => {
    setPrefilledProductForNewOrder(null);
    setActiveOrderPopup('sale');
  };

  const handleStartAppointment = () => {
    setActiveOrderPopup('appointment');
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
          onBack={() => navigate(isAuthenticated ? 'dashboard' : 'auth')}
        />
      );
    }

    if (currentScreen === 'customer_portal') {
      return (
        <CustomerPortal
          customerPhone={customerPhone}
          onExitToLogin={handleCustomerLogout}
          onNavigateHome={() => navigate('auth')}
        />
      );
    }

    if (currentScreen === 'customer_index') {
      if (customerPhone) {
        return (
          <CustomerPortal
            customerPhone={customerPhone}
            onExitToLogin={handleCustomerLogout}
            onNavigateHome={() => navigate('auth')}
          />
        );
      }
      return (
        <CustomerIndexPage
          onCustomerAuthSuccess={handleCustomerAuthSuccess}
          onNavigateOwnerLogin={() => navigate('auth')}
          onNavigatePolicy={(p) => navigate(p)}
          onNavigateCatalogue={() => navigate('public_catalogue')}
        />
      );
    }

    // Public Live Inventory Catalogue - accessible by anyone without login
    if (currentScreen === 'public_catalogue' || (!isAuthenticated && currentScreen === 'inventory')) {
      return (
        <LivePublicCataloguePage
          shopPhoneParam={routeShopPhone}
          shopScoperCodeParam={routeShopScoperCode}
          shopProfile={shopProfile}
          inventory={inventory}
          onNavigateHome={() => navigate(isAuthenticated ? 'dashboard' : 'auth')}
        />
      );
    }

    if (!isAuthenticated || currentScreen === 'auth') {
      return (
        <Screen1Auth
          onAuthSuccess={handleAuthSuccess}
          onCustomerAuthSuccess={handleCustomerAuthSuccess}
          defaultMode="landing"
          initialAuthModal={landingAuthModal}
          initialSection={landingSection}
          onNavigatePolicy={(p) => navigate(p)}
          onNavigateCatalogue={() => navigate('public_catalogue')}
          onNavigateCustomerIndex={() => navigate('customer_index')}
        />
      );
    }

    // Portal Lockout: If the boutique is pending verification, lock all features until admin approves
    const isPendingVerification =
      shopProfile.isVerified === false ||
      shopProfile.status === 'Pending Verification' ||
      shopProfile.verificationStatus === 'pending';

    if (isPendingVerification) {
      return (
        <BoutiqueVerificationLockScreen
          shopProfile={shopProfile}
          userPhone={userPhone}
          onLogout={handleLogout}
          onVerificationApproved={() => {
            const fresh = roomDb.getShopProfile();
            setShopProfile(fresh);
          }}
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
            appointments={appointments}
            inventory={inventory}
            onInventoryClick={() => navigate('inventory')}
            userPhone={userPhone}
            isDesktopView={isDesktopView}
            onNewOrderClick={handleStartStitch}
            onNewStitchClick={handleStartStitch}
            onNewAlterClick={handleStartAlter}
            onNewSaleClick={handleStartSale}
            onNewAppointmentClick={handleStartAppointment}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setReceiptModalOrder(ord);
            }}
            onAssignTimelineClick={(ord) => {
              if (ord) setSelectedOrder(ord);
              navigate('assign_timeline');
            }}
            onProfileClick={() => navigate('profile')}
            onOverdueClick={() => handleNavigateToOrders('overdue')}
            onOrdersClick={(tab) => handleNavigateToOrders(tab || 'all')}
            onReportsClick={() => navigate('reports')}
            onMarketplaceClick={() => navigate('marketplace')}
            onCustomersClick={() => navigate('customers')}
            onSaveAppointment={(appt) => roomDb.saveAppointment(appt)}
            onDeleteAppointment={(id) => roomDb.deleteAppointment(id)}
            onToggleAppointmentChecklist={(id, field, val) =>
              roomDb.toggleAppointmentChecklist(id, field, val)
            }
            onRecordQuickPayment={(orderId, amount, mode, note) =>
              roomDb.recordPayment(orderId, amount, mode, note)
            }
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
            initialProduct={prefilledProductForNewOrder}
            initialCategory={newOrderInitialCategory}
            initialMode={newOrderInitialMode}
            onBack={() => {
              setPrefilledProductForNewOrder(null);
              navigate('dashboard');
            }}
            onSaveOrder={(ord) => {
              setPrefilledProductForNewOrder(null);
              handleSaveNewOrder(ord);
            }}
            existingCustomers={customers}
          />
        );
      case 'marketplace':
        return (
          <ScreenInventoryManager
            roomDb={roomDb}
            onNavigateBack={() => navigate('dashboard')}
          />
        );
      case 'order_details':
        return (
          <Screen2Dashboard
            orders={orders}
            tailors={tailors}
            analytics={analytics}
            shopProfile={shopProfile}
            userPhone={userPhone}
            isDesktopView={isDesktopView}
            onNewOrderClick={handleStartStitch}
            onNewStitchClick={handleStartStitch}
            onNewAlterClick={handleStartAlter}
            onNewSaleClick={handleStartSale}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setReceiptModalOrder(ord);
            }}
            onAssignTimelineClick={(ord) => {
              if (ord) setSelectedOrder(ord);
              navigate('assign_timeline');
            }}
            onProfileClick={() => navigate('profile')}
            onOverdueClick={() => handleNavigateToOrders('overdue')}
            onOrdersClick={(tab) => handleNavigateToOrders(tab || 'all')}
            onReportsClick={() => navigate('reports')}
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
            existingCustomers={customers}
            initialTab={currentScreen === 'overdue' ? 'overdue' : ordersInitialTab}
            isDesktopView={isDesktopView}
            onBack={() => navigate('dashboard')}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setReceiptModalOrder(ord);
            }}
            onArchiveOrder={handleArchiveOrder}
            onUnarchiveOrder={handleUnarchiveOrder}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeliverOrder={handleDeliverOrder}
            onSaveOrder={handleSaveNewOrder}
            onAssignTimelineClick={(ord) => {
              if (ord) setSelectedOrder(ord);
              navigate('assign_timeline');
            }}
            onNewOrderClick={handleStartStitch}
            onNewStitchClick={handleStartStitch}
            onNewAlterClick={handleStartAlter}
            onNewSaleClick={handleStartSale}
            onNewAppointmentClick={handleStartAppointment}
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
            onBack={() => navigate('dashboard')}
            onConfirmAssignment={handleConfirmAssignment}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setReceiptModalOrder(ord);
            }}
          />
        );
      case 'customers':
        return (
          <Screen9CustomersDirectory
            customers={customers}
            orders={orders}
            isDesktopView={isDesktopView}
            onBack={() => navigate('dashboard')}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setReceiptModalOrder(ord);
            }}
            onNewOrderForCustomer={(cust) => {
              setActiveOrderPopup('stitch');
            }}
          />
        );
      case 'customer_portal':
        return (
          <CustomerPortal
            customerPhone={customerPhone || userPhone}
            onExitToLogin={handleCustomerLogout}
            onNavigateHome={() => navigate('dashboard')}
          />
        );
      case 'public_catalogue':
        return (
          <LivePublicCataloguePage
            shopPhoneParam={routeShopPhone}
            shopScoperCodeParam={routeShopScoperCode}
            shopProfile={shopProfile}
            inventory={inventory}
            onNavigateHome={() => navigate(isAuthenticated ? 'dashboard' : 'auth')}
          />
        );
      case 'profile':
        return (
          <Screen7ProfileSettings
            profile={shopProfile}
            tailors={tailors}
            inventory={inventory}
            isDesktopView={isDesktopView}
            onBack={() => navigate('dashboard')}
            onUpdateProfile={(prof) => roomDb.updateShopProfile(prof)}
            onAddTailor={(name, phone, role) => roomDb.addTailor(name, phone, role)}
            onDeleteTailor={(id) => roomDb.deleteTailor(id)}
            onTriggerSync={handleTriggerSync}
            onLogout={handleLogout}
          />
        );
      case 'reports':
        return (
          <Screen8RevenueReports
            analytics={analytics}
            isDesktopView={isDesktopView}
            onBack={() => navigate('dashboard')}
          />
        );
      case 'appointments':
        return (
          <ScreenAppointmentsManager
            appointments={appointments}
            orders={orders}
            onSaveAppointment={(appt) => roomDb.saveAppointment(appt)}
            onDeleteAppointment={(id) => roomDb.deleteAppointment(id)}
            onToggleAppointmentChecklist={(id, field, val) =>
              roomDb.toggleAppointmentChecklist(id, field, val)
            }
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setReceiptModalOrder(ord);
            }}
            onNavigateToNewOrder={() => navigate('new_order')}
          />
        );
      case 'inventory':
        return (
          <ScreenInventoryManager
            roomDb={roomDb}
            onNavigateBack={() => navigate('dashboard')}
          />
        );
      default:
        return (
          <Screen2Dashboard
            orders={orders}
            tailors={tailors}
            analytics={analytics}
            shopProfile={shopProfile}
            appointments={appointments}
            userPhone={userPhone}
            isDesktopView={isDesktopView}
            onNewOrderClick={() => navigate('new_order')}
            onNewStitchClick={handleStartStitch}
            onNewAlterClick={handleStartAlter}
            onNewSaleClick={handleStartSale}
            onNewAppointmentClick={() => navigate('appointments')}
            onSelectOrder={(ord) => {
              setSelectedOrder(ord);
              setReceiptModalOrder(ord);
            }}
            onAssignTimelineClick={(ord) => {
              if (ord) setSelectedOrder(ord);
              navigate('assign_timeline');
            }}
            onProfileClick={() => navigate('profile')}
            onOverdueClick={() => handleNavigateToOrders('overdue')}
            onOrdersClick={(tab) => handleNavigateToOrders(tab || 'all')}
            onReportsClick={() => navigate('reports')}
            onMarketplaceClick={() => navigate('marketplace')}
            onCustomersClick={() => navigate('customers')}
            onSaveAppointment={(appt) => roomDb.saveAppointment(appt)}
            onDeleteAppointment={(id) => roomDb.deleteAppointment(id)}
            onToggleAppointmentChecklist={(id, field, val) =>
              roomDb.toggleAppointmentChecklist(id, field, val)
            }
            onRecordQuickPayment={(orderId, amount, mode, note) =>
              roomDb.recordPayment(orderId, amount, mode, note)
            }
            onDeliverOrder={handleDeliverOrder}
            onQuickAssignTailor={(orderId, tailorName, estimatedHours, dueDate, dueTime) => {
              const ord = orders.find((o) => o.id === orderId);
              if (ord) {
                const finalDueDate =
                  dueDate ||
                  ord.dueDate ||
                  new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0];
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

  const todayStr = useMemo(() => getLocalDateStr(), []);
  const todayAppointmentCount = useMemo(() => {
    return appointments.filter(
      (a) => normalizeDateStr(a.date) === todayStr && a.status !== 'Completed' && a.status !== 'Cancelled'
    ).length;
  }, [appointments, todayStr]);

  // Render Admin Portal if on /admin route or admin screen
  if (isAdminRoute || currentScreen === 'admin') {
    return (
      <AdminPortal
        onExitToShop={() => {
          navigate(isAuthenticated ? 'dashboard' : 'auth');
        }}
      />
    );
  }

  return (
    <>
      <DesktopLayout
        isAuthenticated={isAuthenticated}
        userPhone={userPhone}
        shopProfile={shopProfile}
        currentScreen={currentScreen}
        overdueCount={overdueCount}
        todayAppointmentCount={todayAppointmentCount}
        lowStockCount={lowStockCount}
        onNavigate={(sc) => {
          if (sc === 'admin') {
            navigate('admin');
            return;
          }
          if (sc === 'overdue') {
            navigate({ screen: 'orders', ordersTab: 'overdue' });
            return;
          }
          navigate(sc);
        }}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onTriggerSync={handleTriggerSync}
        onNewStitchClick={handleStartStitch}
        onNewAlterClick={handleStartAlter}
        onNewSaleClick={handleStartSale}
        onNewAppointmentClick={handleStartAppointment}
      >
        {renderActiveScreen(true)}
      </DesktopLayout>

      {/* Global Modern Order Popups (Stitch, Alter, Sale, Appointment) */}
      <ModernOrderPopups
        isOpen={activeOrderPopup !== null}
        activeType={activeOrderPopup}
        onClose={() => {
          setActiveOrderPopup(null);
          setPrefilledProductForNewOrder(null);
        }}
        onSaveOrder={(ord) => {
          handleSaveNewOrder(ord);
          setActiveOrderPopup(null);
          setPrefilledProductForNewOrder(null);
        }}
        shopProfile={shopProfile}
        existingCustomers={customers}
        tailors={tailors}
        isDesktopView={true}
        initialProduct={prefilledProductForNewOrder}
      />

      {/* Global Order Receipt Modal Popup */}
      {receiptModalOrder && (
        <OrderReceiptModal
          order={receiptModalOrder}
          shopProfile={shopProfile}
          onClose={() => setReceiptModalOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
          onDeliverOrder={handleDeliverOrder}
          onRecordPayment={(orderId, amount, mode, note) => {
            roomDb.recordPayment(orderId, amount, mode, note);
          }}
          onAssignTimelineClick={(ord) => {
            setReceiptModalOrder(null);
            setSelectedOrder(ord);
            navigate('assign_timeline');
          }}
        />
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
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
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
