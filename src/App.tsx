import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { SavingsRadar } from './components/SavingsRadar';
import { NicheDiscovery } from './components/NicheDiscovery';
import { ProductGrid } from './components/ProductGrid';
import { GeminiSearchLanding } from './components/GeminiSearchLanding';
import { ExpressDrawer } from './components/ExpressDrawer';
import { OmniSearchModal } from './components/OmniSearchModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { AddressVaultModal } from './components/AddressVaultModal';
import { HandoffSuccessModal } from './components/HandoffSuccessModal';
import { SavingsAnalyticsModal } from './components/SavingsAnalyticsModal';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { Forbidden403 } from './components/Forbidden403';
import { GptTryOnStudio } from './components/GptTryOnStudio';
import { PolicyPages, PolicyType } from './components/PolicyPages';

import {
  INITIAL_PRODUCTS,
  CATEGORIES,
  MOCK_ADDRESSES,
  INITIAL_COMMUNITY_SAVINGS,
  SAVINGS_CHART_DATA
} from './data/mockData';

import { Product, UserAddress, UserSession } from './types';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  getOrSeedProducts,
  subscribeWishlist,
  toggleWishlistInDb,
  saveOrderToDb,
  saveUserProfileToDb
} from './lib/firestoreService';
import { preloadImageUrls } from './lib/imageUtils';

export default function App() {
  // Current Authentication Session State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('shopscoper_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Distinct User ID for Wishlist & Orders per authenticated or guest session
  const effectiveUserId = useMemo(() => {
    if (currentUser?.email) {
      return currentUser.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_');
    }
    if (auth.currentUser?.uid) {
      return auth.currentUser.uid;
    }
    try {
      let guestId = localStorage.getItem('shopscoper_guest_id');
      if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('shopscoper_guest_id', guestId);
      }
      return guestId;
    } catch {
      return 'guest_user';
    }
  }, [currentUser]);

  // Navigation Route State ('landing' | 'login' | 'explore' | 'admin' | 'terms' | 'privacy' | 'refund')
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'explore' | 'admin' | 'terms' | 'privacy' | 'refund'>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/login')) return 'login';
    if (path.startsWith('/terms')) return 'terms';
    if (path.startsWith('/privacy')) return 'privacy';
    if (path.startsWith('/refund')) return 'refund';
    if (path.startsWith('/products') || path.startsWith('/explore') || path.startsWith('/dashboard')) return 'explore';
    return 'landing';
  });

  // Admin View Sub-State ('login' | 'dashboard' | 'denied') - Always defaults to 'login' when visiting /admin
  const [adminState, setAdminState] = useState<'login' | 'dashboard' | 'denied'>('login');

  // Ensure URL path matches current view
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (currentView === 'landing' && path !== '/') {
      window.history.replaceState({}, '', '/');
    } else if (currentView === 'admin' && !path.startsWith('/admin')) {
      window.history.replaceState({}, '', '/admin');
    } else if (currentView === 'login' && !path.startsWith('/login')) {
      window.history.replaceState({}, '', '/login');
    } else if (currentView === 'terms' && !path.startsWith('/terms')) {
      window.history.replaceState({}, '', '/terms');
    } else if (currentView === 'privacy' && !path.startsWith('/privacy')) {
      window.history.replaceState({}, '', '/privacy');
    } else if (currentView === 'refund' && !path.startsWith('/refund')) {
      window.history.replaceState({}, '', '/refund');
    } else if (currentView === 'explore' && !path.startsWith('/explore') && !path.startsWith('/products') && !path.startsWith('/dashboard')) {
      window.history.replaceState({}, '', '/explore');
    }
  }, [currentView]);

  // Handle URL navigation and browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/admin')) {
        setCurrentView('admin');
        setAdminState('login');
      }
      else if (path.startsWith('/login')) setCurrentView('login');
      else if (path.startsWith('/terms')) setCurrentView('terms');
      else if (path.startsWith('/privacy')) setCurrentView('privacy');
      else if (path.startsWith('/refund')) setCurrentView('refund');
      else if (path.startsWith('/products') || path.startsWith('/explore') || path.startsWith('/dashboard')) setCurrentView('explore');
      else setCurrentView('landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Firebase Auth State Listener & User Profile Persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const isAuthorizedAdmin = fbUser.email.trim().toLowerCase() === 'imamir760@gmail.com';
        const session: UserSession = {
          email: fbUser.email.trim().toLowerCase(),
          name: fbUser.displayName || fbUser.email.split('@')[0],
          role: isAuthorizedAdmin ? 'admin' : 'user',
          avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.email}`
        };
        setCurrentUser(session);
        try {
          localStorage.setItem('shopscoper_user_session', JSON.stringify(session));
        } catch (e) {}
        await saveUserProfileToDb(session);
      }
    });
    return () => unsubscribe();
  }, []);

  const navigateTo = (view: 'landing' | 'login' | 'explore' | 'admin' | 'terms' | 'privacy' | 'refund') => {
    setCurrentView(view);
    if (view === 'admin') {
      setAdminState('login');
    }
    const targetPath = view === 'landing' ? '/' : view === 'explore' ? '/explore' : `/${view}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const handleLoginSuccess = (session: UserSession) => {
    setCurrentUser(session);
    try {
      localStorage.setItem('shopscoper_user_session', JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save session:', e);
    }

    if (session.email === 'imamir760@gmail.com') {
      navigateTo('admin');
    } else {
      navigateTo('explore');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut notice:', e);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('shopscoper_user_session');
    } catch (e) {
      console.error('Failed to remove session:', e);
    }
    navigateTo('landing');
  };

  // State Initialization
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>(MOCK_ADDRESSES);
  const [defaultAddress, setDefaultAddress] = useState<UserAddress>(MOCK_ADDRESSES[0]);

  // Load / Seed Firestore Products
  useEffect(() => {
    getOrSeedProducts([]).then((loadedProducts) => {
      setProducts(loadedProducts);
      if (loadedProducts.length > 0) {
        setActiveExpressProduct(loadedProducts[0]);
      }
      // Preload images for instant switching & lightning fast action execution!
      const urlsToPreload = loadedProducts.flatMap((p) => p.images || []).filter(Boolean);
      preloadImageUrls(urlsToPreload);
    });
  }, []);

  // Subscribe to wishlist changes for the specific user
  useEffect(() => {
    if (!effectiveUserId) return;
    const unsubscribe = subscribeWishlist(effectiveUserId, (ids) => {
      setWishlistIds(ids);
    });

    return () => unsubscribe();
  }, [effectiveUserId]);

  // Modal / Drawer Controls
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);
  const [isExpressDrawerOpen, setIsExpressDrawerOpen] = useState<boolean>(false);
  const [isAddressVaultOpen, setIsAddressVaultOpen] = useState<boolean>(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState<boolean>(false);
  const [isSavingsAnalyticsOpen, setIsSavingsAnalyticsOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [isGptTryOnOpen, setIsGptTryOnOpen] = useState<boolean>(false);
  const [gptTryOnGarment, setGptTryOnGarment] = useState<{ product?: Product | null; imageUrl?: string | null }>({});

  const handleOpenGptTryOn = (product?: Product | null, imageUrl?: string | null) => {
    setGptTryOnGarment({ product, imageUrl });
    setIsGptTryOnOpen(true);
  };

  const handleProductsAddedFromCrawler = (newProducts: Product[]) => {
    setProducts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const filtered = newProducts.filter((p) => !existingIds.has(p.id));
      return [...filtered, ...prev];
    });
  };

  // Selected Active Items for Modals
  const [activeExpressProduct, setActiveExpressProduct] = useState<Product | null>(null);
  const [activeQuickViewProduct, setActiveQuickViewProduct] = useState<Product | null>(null);

  const [lastOrderInfo, setLastOrderInfo] = useState<{
    product: Product;
    address: UserAddress;
    totalAmount: number;
    orderId: string;
    trackingToken: string;
  } | null>(null);

  // Total Savings Calculated
  const totalSaved = useMemo(() => {
    return 4850;
  }, []);

  // Handlers
  const handleToggleWishlist = (product: Product) => {
    const isWishlisted = wishlistIds.some((id) => String(id) === String(product.id));
    setWishlistIds((prev) =>
      isWishlisted
        ? prev.filter((i) => String(i) !== String(product.id))
        : [...prev, product.id]
    );
    toggleWishlistInDb(effectiveUserId, product.id, isWishlisted);
  };

  const handleOpenExpressBuy = (product: Product) => {
    setActiveExpressProduct(product);
    setIsExpressDrawerOpen(true);
  };

  const handleOpenQuickView = (product: Product) => {
    setActiveQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleHandoffSuccess = (product: Product, address: UserAddress, finalTotal: number) => {
    setIsExpressDrawerOpen(false);
    const orderId = `ORD-D2C-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingToken = `TRK-${product.brand.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
    
    const orderObj = {
      userId: effectiveUserId,
      product,
      address,
      totalAmount: finalTotal,
      orderId,
      trackingToken
    };

    saveOrderToDb(orderObj);
    setLastOrderInfo(orderObj);
    setIsSuccessModalOpen(true);
  };

  const wishlistProducts = useMemo(() => {
    if (!wishlistIds || wishlistIds.length === 0) return [];
    const idSet = new Set(wishlistIds.map((id) => String(id)));
    return products.filter((p) => idSet.has(String(p.id)));
  }, [products, wishlistIds]);

  // --------------------------------------------------------------------------
  // ROUTE 1: Landing Page (/)
  // --------------------------------------------------------------------------
  if (currentView === 'landing') {
    return (
      <LandingPage
        onNavigateLogin={() => navigateTo('login')}
        onNavigateExplore={() => navigateTo('explore')}
        onNavigateAdmin={() => navigateTo('admin')}
        onNavigatePolicy={(pol) => navigateTo(pol)}
        isAuthenticated={!!currentUser}
        userName={currentUser?.name}
        onLogout={handleLogout}
        onProductsAddedToGlobalCatalog={(newProds) => setProducts(prev => [...newProds, ...prev])}
      />
    );
  }

  // --------------------------------------------------------------------------
  // ROUTE 1.5: Policy Standalone Pages (/terms, /privacy, /refund)
  // --------------------------------------------------------------------------
  if (currentView === 'terms' || currentView === 'privacy' || currentView === 'refund') {
    return (
      <PolicyPages
        policyType={currentView}
        onNavigateHome={() => navigateTo('landing')}
        onNavigatePolicy={(pol) => navigateTo(pol)}
      />
    );
  }

  // --------------------------------------------------------------------------
  // ROUTE 2: /login View
  // --------------------------------------------------------------------------
  if (currentView === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateHome={() => navigateTo('landing')}
      />
    );
  }

  // --------------------------------------------------------------------------
  // ROUTE 3: /admin Guard & Dashboard View
  // --------------------------------------------------------------------------
  if (currentView === 'admin') {
    // 1. Authorized Admin logged in & verified -> Render Admin Dashboard
    if (adminState === 'dashboard' && currentUser?.email === 'imamir760@gmail.com') {
      return (
        <AdminDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigateHome={() => navigateTo('landing')}
          onProductsAddedToGlobalCatalog={handleProductsAddedFromCrawler}
        />
      );
    }

    // 2. Login succeeded but account is NOT in admin whitelist -> Render Access Restricted page
    if (adminState === 'denied') {
      return (
        <Forbidden403
          currentUser={currentUser}
          onNavigateHome={() => navigateTo('landing')}
          onLogout={handleLogout}
          onSwitchUser={() => setAdminState('login')}
        />
      );
    }

    // 3. Default for /admin: Always show Admin Login Page first!
    return (
      <AdminLoginPage
        onAdminLoginSuccess={(session) => {
          setCurrentUser(session);
          try {
            localStorage.setItem('shopscoper_user_session', JSON.stringify(session));
          } catch (e) {}
          setAdminState('dashboard');
        }}
        onAdminLoginDenied={(session) => {
          setCurrentUser(session);
          try {
            localStorage.setItem('shopscoper_user_session', JSON.stringify(session));
          } catch (e) {}
          setAdminState('denied');
        }}
        onNavigateHome={() => navigateTo('landing')}
      />
    );
  }

  // --------------------------------------------------------------------------
  // ROUTE 4: Protected Explore / Dashboard View (/explore)
  // --------------------------------------------------------------------------
  // Authentication Guard: If user is not authenticated, redirect to /login
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateHome={() => navigateTo('landing')}
        initialErrorMessage="Authentication required. Please sign in with Google to access ShopScoper."
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white font-sans antialiased relative overflow-x-hidden">
      
      {/* Dynamic Background Mesh Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[160px]" />
      </div>

      {/* Main Search Engine & Discovery Screen */}
      <GeminiSearchLanding
        products={products}
        wishlistIds={wishlistIds}
        defaultAddress={defaultAddress}
        wishlistCount={wishlistProducts.length}
        totalSaved={totalSaved}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateAdmin={() => navigateTo('admin')}
        onToggleWishlist={handleToggleWishlist}
        onExpressBuy={handleOpenExpressBuy}
        onQuickView={handleOpenQuickView}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenAddressVault={() => setIsAddressVaultOpen(true)}
        onOpenGptTryOn={handleOpenGptTryOn}
      />

      {/* Slide-Over Drawers & Modals */}
      <GptTryOnStudio
        isOpen={isGptTryOnOpen}
        onClose={() => setIsGptTryOnOpen(false)}
        garmentProduct={gptTryOnGarment.product}
        garmentImageUrl={gptTryOnGarment.imageUrl}
      />
      <ExpressDrawer
        isOpen={isExpressDrawerOpen}
        onClose={() => setIsExpressDrawerOpen(false)}
        product={activeExpressProduct}
        userAddress={defaultAddress}
        onOpenAddressVault={() => setIsAddressVaultOpen(true)}
        onHandoffSuccess={handleHandoffSuccess}
      />

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistProducts={wishlistProducts}
        onRemoveFromWishlist={(id) => {
          setWishlistIds((prev) => prev.filter((i) => String(i) !== String(id)));
          toggleWishlistInDb(effectiveUserId, id, true);
        }}
        onExpressBuy={handleOpenExpressBuy}
        onTryOn={(p) => {
          setIsWishlistOpen(false);
          handleOpenGptTryOn(p);
        }}
      />

      <OmniSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={products}
        onSelectProduct={handleOpenQuickView}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
      />

      <QuickViewModal
        product={activeQuickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        isWishlisted={activeQuickViewProduct ? wishlistIds.some((id) => String(id) === String(activeQuickViewProduct.id)) : false}
        onToggleWishlist={handleToggleWishlist}
        onExpressBuy={handleOpenExpressBuy}
        onTryOn={(p) => {
          setIsQuickViewOpen(false);
          handleOpenGptTryOn(p);
        }}
        wishlistCount={wishlistProducts.length}
        onOpenSearch={() => {
          setIsQuickViewOpen(false);
          setIsSearchOpen(true);
        }}
        onOpenWishlist={() => {
          setIsQuickViewOpen(false);
          setIsWishlistOpen(true);
        }}
      />

      <AddressVaultModal
        isOpen={isAddressVaultOpen}
        onClose={() => setIsAddressVaultOpen(false)}
        addresses={addresses}
        defaultAddress={defaultAddress}
        onSelectDefaultAddress={(addr) => {
          setDefaultAddress(addr);
          setIsAddressVaultOpen(false);
        }}
        onAddNewAddress={(newAddr) => {
          setAddresses((prev) => [newAddr, ...prev]);
          setDefaultAddress(newAddr);
        }}
      />

      <HandoffSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        orderInfo={lastOrderInfo}
      />

      <SavingsAnalyticsModal
        isOpen={isSavingsAnalyticsOpen}
        onClose={() => setIsSavingsAnalyticsOpen(false)}
      />

    </div>
  );
}
