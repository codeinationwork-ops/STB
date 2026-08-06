import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Catch background database closing/hidden events when tabs or frames are hidden/closed
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('indexeddb') ||
      msg.includes('database is closing/hidden') ||
      msg.includes('failed to get document')
    ) {
      event.preventDefault();
      console.warn('Handled background database closing/hidden rejection gracefully:', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.error?.message || event.message || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('indexeddb') ||
      msg.includes('database is closing/hidden') ||
      msg.includes('failed to get document')
    ) {
      event.preventDefault();
      console.warn('Handled background database closing/hidden error gracefully:', event.message);
    }
  });
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

export const db = getFirestore(app, dbId);

export const auth = getAuth(app);
export default app;
