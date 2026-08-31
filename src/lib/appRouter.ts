import { AdminTab, OrderStatus } from '../types';

export type AppScreen =
  | 'auth'
  | 'dashboard'
  | 'new_order'
  | 'order_details'
  | 'orders'
  | 'overdue'
  | 'appointments'
  | 'inventory'
  | 'assign_timeline'
  | 'marketplace'
  | 'public_catalogue'
  | 'customers'
  | 'customer_portal'
  | 'customer_index'
  | 'profile'
  | 'reports'
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'admin';

export interface RouteState {
  screen: AppScreen;
  orderId?: string;
  ordersTab?: 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived';
  newOrderMode?: 'stitch' | 'alter' | 'sale';
  newOrderCategory?: 'New Stitch' | 'Alteration' | 'Sale';
  adminTab?: AdminTab;
  landingSection?: 'features' | 'how-it-works' | 'pricing' | 'testimonials';
  authModal?: 'login' | 'signup' | 'customer' | null;
  shopPhone?: string;
  shopScoperCode?: string;
}

/**
 * Builds a clean URL path string for any given application state without any '#'
 */
export function buildRoutePath(route: RouteState): string {
  const { screen } = route;

  switch (screen) {
    case 'admin':
      return route.adminTab && route.adminTab !== 'overview'
        ? `/admin/${route.adminTab}`
        : '/admin';

    case 'dashboard':
      return '/dashboard';

    case 'new_order':
      if (route.newOrderMode === 'alter' || route.newOrderCategory === 'Alteration') {
        return '/new-order/alter';
      }
      if (route.newOrderMode === 'sale' || route.newOrderCategory === 'Sale') {
        return '/new-order/sale';
      }
      return '/new-order/stitch';

    case 'orders':
      if (route.ordersTab && route.ordersTab !== 'all') {
        return `/orders/${route.ordersTab}`;
      }
      return '/orders';

    case 'overdue':
      return '/orders/overdue';

    case 'order_details':
      if (route.orderId) {
        const cleanId = encodeURIComponent(route.orderId.replace(/^#+/, ''));
        return `/orders/${cleanId}`;
      }
      return '/orders';

    case 'appointments':
      return '/appointments';

    case 'inventory':
      return '/inventory';

    case 'assign_timeline':
      return '/staff';

    case 'marketplace':
      return '/marketplace';

    case 'public_catalogue':
      if (route.shopPhone) {
        return `/catalogue?shop=${encodeURIComponent(route.shopPhone)}${route.shopScoperCode ? `&code=${encodeURIComponent(route.shopScoperCode)}` : ''}`;
      }
      return '/catalogue';

    case 'customers':
      return '/customers';

    case 'customer_index':
      return '/customerindex';

    case 'customer_portal':
      return '/customer-portal';

    case 'reports':
      return '/reports';

    case 'profile':
      return '/profile';

    case 'terms':
      return '/terms';

    case 'privacy':
      return '/privacy';

    case 'refund':
      return '/refund';

    case 'auth':
    default:
      // Index page stays strictly at '/'
      return '/';
  }
}

// Backward compatibility alias
export const buildRouteHash = buildRoutePath;

/**
 * Parses current browser URL (clean pathname or legacy hash) into RouteState
 */
export function parseRouteFromUrl(isAuthenticated: boolean): RouteState {
  const rawPath = window.location.pathname.toLowerCase();
  const rawHash = window.location.hash.toLowerCase();
  const urlParams = new URLSearchParams(window.location.search);

  // Check query parameters first (e.g. ?route=catalogue, ?shop=..., ?code=..., ?scan=..., ?inventory=...)
  const routeParam = urlParams.get('route')?.toLowerCase();
  const tabParam = urlParams.get('tab')?.toLowerCase();
  const shopPhone = urlParams.get('shop') || urlParams.get('phone') || undefined;
  const shopScoperCode = urlParams.get('code') || urlParams.get('scancode') || undefined;

  if (
    routeParam === 'catalogue' ||
    routeParam === 'inventory' ||
    routeParam === 'public_catalogue' ||
    routeParam === 'scan' ||
    tabParam === 'inventory' ||
    urlParams.has('catalogue') ||
    urlParams.has('scan') ||
    urlParams.has('inventory') ||
    (shopPhone && !isAuthenticated) ||
    (shopScoperCode && !isAuthenticated)
  ) {
    return {
      screen: 'public_catalogue',
      shopPhone,
      shopScoperCode,
    };
  }

  // Check customer portal / customer index routes
  if (
    routeParam === 'customerindex' ||
    routeParam === 'customer_index' ||
    routeParam === 'track' ||
    routeParam === 'customer'
  ) {
    return { screen: 'customer_index' };
  }

  // Combine pathname and hash if someone entered a hash URL, then clean up
  let combined = rawPath;
  if (rawHash) {
    const cleanHash = rawHash.replace(/^#\/?/, '');
    if (cleanHash) {
      combined = `/${cleanHash}`;
    }
  }

  const clean = combined.replace(/^\/+/, '').trim();

  // Admin route check
  if (clean.startsWith('admin')) {
    let tab: AdminTab = 'overview';
    const parts = clean.replace(/^admin\/?/, '').split('/');
    if (parts[0] && ['overview', 'shops', 'orders', 'revenue', 'workforce', 'customers', 'broadcasts', 'health'].includes(parts[0])) {
      tab = parts[0] as AdminTab;
    }
    return { screen: 'admin', adminTab: tab };
  }

  // Check catalogue / ShopScoper live inventory scan route
  if (
    clean.startsWith('catalogue') ||
    clean.startsWith('shopscoper') ||
    clean.startsWith('scan') ||
    clean.startsWith('reels') ||
    clean.startsWith('collection') ||
    (clean.startsWith('inventory') && !isAuthenticated)
  ) {
    return {
      screen: 'public_catalogue',
      shopPhone,
      shopScoperCode,
    };
  }

  // Index / root path stays strictly index
  if (!clean || clean === 'home' || clean === '/') {
    return { screen: isAuthenticated ? 'dashboard' : 'auth' };
  }

  // Legal / Policy screens
  if (clean === 'terms' || clean === 'tos') return { screen: 'terms' };
  if (clean === 'privacy') return { screen: 'privacy' };
  if (clean === 'refund' || clean === 'refunds') return { screen: 'refund' };

  // Landing sections & auth modals
  if (clean === 'features') return { screen: isAuthenticated ? 'dashboard' : 'auth', landingSection: 'features' };
  if (clean === 'how-it-works' || clean === 'howitworks') return { screen: isAuthenticated ? 'dashboard' : 'auth', landingSection: 'how-it-works' };
  if (clean === 'pricing') return { screen: isAuthenticated ? 'dashboard' : 'auth', landingSection: 'pricing' };
  if (clean === 'testimonials') return { screen: isAuthenticated ? 'dashboard' : 'auth', landingSection: 'testimonials' };
  if (clean === 'login' || clean === 'signin') return { screen: isAuthenticated ? 'dashboard' : 'auth', authModal: 'login' };
  if (clean === 'register' || clean === 'signup') return { screen: isAuthenticated ? 'dashboard' : 'auth', authModal: 'signup' };
  if (
    clean === 'customerindex' ||
    clean === 'customer-index' ||
    clean === 'customer' ||
    clean === 'customer-login' ||
    clean === 'track'
  ) {
    return { screen: 'customer_index' };
  }
  if (clean === 'customer-portal' || clean === 'my-orders' || clean === 'fitbook' || clean === 'portal') {
    return { screen: 'customer_portal' };
  }

  // CRM Screens
  if (clean === 'dashboard') return { screen: 'dashboard' };

  if (clean.startsWith('new-order') || clean.startsWith('new_order')) {
    if (clean.includes('alter')) {
      return { screen: 'new_order', newOrderCategory: 'Alteration', newOrderMode: 'alter' };
    }
    if (clean.includes('sale')) {
      return { screen: 'new_order', newOrderCategory: 'Sale', newOrderMode: 'sale' };
    }
    return { screen: 'new_order', newOrderCategory: 'New Stitch', newOrderMode: 'stitch' };
  }

  if (clean.startsWith('orders/') || clean.startsWith('order/')) {
    const parts = clean.split('/');
    const sub = parts[1];
    if (['all', 'cutting', 'stitching', 'overdue', 'completed', 'archived'].includes(sub)) {
      return {
        screen: 'orders',
        ordersTab: sub as 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived',
      };
    }
    // Specific Order ID (e.g. /orders/ORD-2026-1001)
    if (sub) {
      const decodedId = decodeURIComponent(sub);
      return {
        screen: 'order_details',
        orderId: decodedId.replace(/^#+/, ''),
      };
    }
    return { screen: 'orders', ordersTab: 'all' };
  }

  if (clean === 'orders') return { screen: 'orders', ordersTab: 'all' };
  if (clean === 'overdue') return { screen: 'orders', ordersTab: 'overdue' };
  if (clean === 'appointments') return { screen: 'appointments' };
  if (clean === 'inventory') return { screen: 'inventory' };
  if (clean === 'staff' || clean === 'workforce' || clean === 'assign_timeline' || clean === 'assign-timeline') {
    return { screen: 'assign_timeline' };
  }
  // Check catalogue / ShopScoper live inventory scan route
  if (clean.startsWith('catalogue') || clean.startsWith('shopscoper') || clean.startsWith('scan')) {
    const urlParams = new URLSearchParams(window.location.search);
    const shopPhone = urlParams.get('shop') || urlParams.get('phone') || undefined;
    const shopScoperCode = urlParams.get('code') || urlParams.get('scancode') || undefined;
    return {
      screen: 'public_catalogue',
      shopPhone,
      shopScoperCode,
    };
  }

  if (clean === 'marketplace') return { screen: 'marketplace' };
  if (clean === 'customers' || clean === 'clients') return { screen: 'customers' };
  if (clean === 'reports' || clean === 'analytics') return { screen: 'reports' };
  if (clean === 'profile' || clean === 'settings') return { screen: 'profile' };

  // Fallback to root index / auth or dashboard
  return { screen: isAuthenticated ? 'dashboard' : 'auth' };
}

/**
 * Updates the browser's address bar to clean URLs without '#'
 */
export function setUrlPath(route: RouteState, replace: boolean = false): void {
  const targetPath = buildRoutePath(route);
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;

  // If there's a hash, clean it up always
  if (currentPath === targetPath && !currentHash) return;

  try {
    if (replace) {
      window.history.replaceState(null, '', targetPath);
    } else {
      window.history.pushState(null, '', targetPath);
    }
  } catch {
    // Fallback if pushState fails
  }
}

// Backward compatibility alias
export const setUrlHash = setUrlPath;
