import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './firebase.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function getFirebaseApp(): FirebaseApp {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

// Use AsyncStorage persistence on native to survive app restarts.
// getAuth() returns the existing auth instance if already initialized (safe for hot reload).
function getFirebaseAuth(): Auth {
  try {
    return Platform.OS === 'web'
      ? getAuth(app)
      : initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
  } catch {
    // initializeAuth throws if already initialized; fall back to getAuth
    return getAuth(app);
  }
}

export const auth: Auth = getFirebaseAuth();
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export default app;

