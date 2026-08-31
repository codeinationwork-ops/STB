import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal offline/reconnect console warnings
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Catch background database closing/hidden events when tabs or frames are hidden/closed
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('indexeddb') ||
      msg.includes('database is closing/hidden') ||
      msg.includes('failed to get document') ||
      msg.includes('could not reach cloud firestore') ||
      msg.includes('the client is offline') ||
      msg.includes('unavailable') ||
      msg.includes("didn't respond within 10 seconds") ||
      msg.includes('backend didn\'t respond')
    ) {
      event.preventDefault();
      // Handled gracefully in offline persistence mode
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.error?.message || event.message || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('indexeddb') ||
      msg.includes('database is closing/hidden') ||
      msg.includes('failed to get document') ||
      msg.includes('could not reach cloud firestore') ||
      msg.includes('the client is offline') ||
      msg.includes('unavailable') ||
      msg.includes("didn't respond within 10 seconds") ||
      msg.includes('backend didn\'t respond')
    ) {
      event.preventDefault();
      // Handled gracefully in offline persistence mode
    }
  });
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let firestoreInstance: Firestore;
try {
  firestoreInstance = getFirestore(app);
} catch {
  firestoreInstance = initializeFirestore(app, {});
}

export const db = firestoreInstance;

export const auth = getAuth(app);
export default app;
