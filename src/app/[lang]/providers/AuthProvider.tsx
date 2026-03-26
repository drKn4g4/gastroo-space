'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  User,
} from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { UserViewMode } from '@/types/organization';

export interface UserProfileData {
  isGastronaut: boolean;
  organization: string[];
  onboardingCompleted: boolean;
  viewMode: UserViewMode;
  userCode?: string;
}

type AuthContextType = {
  user: User | null;
  loading: boolean;
  /** User profile merged from Firestore doc + Auth custom claims. null while loading or when logged out. */
  profile: UserProfileData | null;
  /** Force-refresh profile by re-reading custom claims (e.g. after role change). */
  refreshProfile: () => void;
  /** Toggle between foodie/gastronaut view mode. Persists to Firestore. */
  setViewMode: (mode: UserViewMode) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
  refreshProfile: () => {},
  setViewMode: async () => {},
});

// Set persistence once at module level (client-side only)
if (typeof window !== 'undefined') {
  setPersistence(auth, indexedDBLocalPersistence)
    .catch(() => setPersistence(auth, browserLocalPersistence))
    .catch(console.error);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [profileVersion, setProfileVersion] = useState(0);

  const refreshProfile = useCallback(() => setProfileVersion((v) => v + 1), []);

  const setViewMode = useCallback(async (mode: UserViewMode) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      viewMode: mode,
      updatedAt: serverTimestamp(),
    });
    setProfile((prev) => prev ? { ...prev, viewMode: mode } : prev);
  }, [user]);

  // Firebase Auth state listener + Firestore user doc listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      // Read custom claims (cached, no network)
      currentUser.getIdTokenResult(false).then((result) => {
        const isGastronaut = result.claims.isGastronaut === true;
        setProfile((prev) => ({
          isGastronaut,
          organization: Array.isArray(result.claims.organization)
            ? (result.claims.organization as string[])
            : [],
          onboardingCompleted: isGastronaut ? true : (prev?.onboardingCompleted ?? false),
          viewMode: prev?.viewMode ?? 'foodie',
          userCode: prev?.userCode,
        }));
      }).catch(() => {
        setProfile((prev) => ({
          isGastronaut: false,
          organization: [],
          onboardingCompleted: prev?.onboardingCompleted ?? false,
          viewMode: prev?.viewMode ?? 'foodie',
          userCode: prev?.userCode,
        }));
      }).finally(() => {
        setLoading(false);
      });
    });
    return unsubscribe;
  }, []);

  // Listen to Firestore user doc for onboardingCompleted, viewMode, gastronaut
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const isGastronaut = data.gastronaut === true;
      setProfile((prev) => ({
        isGastronaut,
        organization: Array.isArray(data.organizations) ? data.organizations : (prev?.organization ?? []),
        onboardingCompleted: isGastronaut ? true : (data.onboardingCompleted === true),
        viewMode: (data.viewMode as UserViewMode) || 'foodie',
        userCode: data.userCode || prev?.userCode,
      }));
    });

    return unsub;
  }, [user]);

  // Force-refresh claims only when explicitly triggered
  useEffect(() => {
    if (profileVersion === 0 || !user) return;

    let cancelled = false;
    user.getIdTokenResult(true).then((result) => {
      if (cancelled) return;
      const isGastronaut = result.claims.isGastronaut === true || (profile?.isGastronaut === true);
      setProfile((prev) => ({
        isGastronaut,
        organization: Array.isArray(result.claims.organization)
          ? (result.claims.organization as string[])
          : (prev?.organization ?? []),
        onboardingCompleted: isGastronaut ? true : (prev?.onboardingCompleted ?? false),
        viewMode: prev?.viewMode ?? 'foodie',
        userCode: prev?.userCode,
      }));
    }).catch(() => {
      if (cancelled) return;
      setProfile((prev) => ({
        isGastronaut: prev?.isGastronaut ?? false,
        organization: prev?.organization ?? [],
        onboardingCompleted: prev?.onboardingCompleted ?? false,
        viewMode: prev?.viewMode ?? 'foodie',
        userCode: prev?.userCode,
      }));
    });

    return () => { cancelled = true; };
  }, [user, profileVersion]);

  return (
    <AuthContext.Provider value={{ user, loading, profile, refreshProfile, setViewMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
