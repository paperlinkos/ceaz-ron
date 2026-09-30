import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

/**
 * Config comes exclusively from Vite env vars (see .env.production).
 * There is deliberately NO hardcoded fallback: a silent default would let a
 * misconfigured build write campaign data into the wrong Firebase project
 * instead of failing loudly.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = !firebaseConfig.projectId || !firebaseConfig.apiKey;

if (missingConfig) {
  const message =
    'Firebase is not configured. Set VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_API_KEY in .env.production (or your Vercel environment variables).';
  // Production must fail loudly rather than risk writing campaign data into
  // an unintended project. Tests and tooling only import this module, so they
  // get a warning instead of taking the whole suite down.
  if (import.meta.env.PROD) {
    throw new Error(message);
  }
  console.warn(message);
}

/**
 * Named database id. The campaign uses the project's default database, so
 * this resolves to "(default)" unless a named database is configured.
 */
const firestoreDatabaseId =
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';

export const isFirebaseConfigured = Boolean(firebaseConfig.projectId);
export const CURRENT_PROJECT_ID = firebaseConfig.projectId;
export const CURRENT_DATABASE_ID = firestoreDatabaseId;

export const ENVIRONMENT_TYPE: 'PRODUCTION' | 'DEVELOPMENT' = 'PRODUCTION';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  try {
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    db = getFirestore(app);
  }
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization warning:', error);
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, db, auth };
