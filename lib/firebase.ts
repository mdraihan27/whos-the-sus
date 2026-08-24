import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Lets the UI show a "finish your setup" notice instead of crashing when the
 * `.env.local` values are still missing.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;

  authInstance = getAuth(getFirebaseApp());
  // Already the web default, but we set it explicitly: the session is kept in
  // IndexedDB/localStorage so a player stays signed in until they sign out.
  // Only browsers with storage fully blocked reject here, and Firebase falls
  // back to in-memory persistence on its own.
  setPersistence(authInstance, browserLocalPersistence).catch(() => {});

  return authInstance;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
