import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDDMMfAgsX5wJNiFJIVIkoImD9HoDTcXSw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'model-webbing-p83d0.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'model-webbing-p83d0',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'model-webbing-p83d0.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '213247113725',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:213247113725:web:92ba864ae9d4ccfc630194',
};

const firestoreDatabaseId = 'ai-studio-ceaz1ronharvestt-70c3271b-2801-4466-80b8-3685c9b19297';

export const isFirebaseConfigured = Boolean(firebaseConfig.projectId);
export const CURRENT_PROJECT_ID = firebaseConfig.projectId;

export const ENVIRONMENT_TYPE: 'PRODUCTION' | 'DEVELOPMENT' = 'PRODUCTION';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app, firestoreDatabaseId);
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization warning:', error);
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app, firestoreDatabaseId);
  auth = getAuth(app);
}

export { app, db, auth };
