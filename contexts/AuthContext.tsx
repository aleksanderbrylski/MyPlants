import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sign in failed';
      setError(message);
      throw e;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName?: string
  ) => {
    setError(null);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      if (displayName?.trim()) {
        await updateProfile(newUser, { displayName: displayName.trim() });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sign up failed';
      setError(message);
      throw e;
    }
  };

  const signInWithGoogleIdToken = async (idToken: string) => {
    setError(null);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Google sign-in failed';
      setError(message);
      throw e;
    }
  };

  const signOut = async () => {
    setError(null);
    await firebaseSignOut(auth);
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogleIdToken,
    signOut,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
