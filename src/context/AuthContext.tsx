import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as firebaseUpdateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import type {
  FavoriteProductRecord,
  FeeSettings,
  RankHistoryEntry,
  SavedKeywordRecord,
  SavedListingRecord,
  SearchHistoryRecord,
  TrackedCompetitorRecord,
  UserProfileRecord,
} from '../types';
import { useToast } from '../components/Toast';

export interface WorkspaceData {
  savedKeywords: SavedKeywordRecord[];
  trackedCompetitors: TrackedCompetitorRecord[];
  savedListings: SavedListingRecord[];
  searchHistory: SearchHistoryRecord[];
  rankHistory: RankHistoryEntry[];
  favoriteProducts: FavoriteProductRecord[];
}

const EMPTY_WORKSPACE: WorkspaceData = {
  savedKeywords: [],
  trackedCompetitors: [],
  savedListings: [],
  searchHistory: [],
  rankHistory: [],
  favoriteProducts: [],
};

export const DEFAULT_FEE_SETTINGS: FeeSettings = {
  transactionFeePercent: 6.5,
  listingFeeFixed: 0.2,
  paymentPercent: 3.0,
  paymentFixed: 0.25,
  regulatoryPercent: 0,
};

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  workspaceLoading: boolean;
  profile: UserProfileRecord | null;
  workspace: WorkspaceData;
  feeSettings: FeeSettings;
  setFeeSettings: (next: FeeSettings) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string, shopName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  updateProfile: (patch: {
    displayName?: string;
    shopName?: string;
    etsyMarketplace?: string;
    currency?: string;
  }) => Promise<void>;
  saveKeyword: (payload: {
    keyword: string;
    monthlySearches: number;
    competitionLabel: string;
    opportunityScore: number;
    avgPriceUsd: string | number;
    trend: string;
    notes?: string;
  }) => Promise<void>;
  deleteKeyword: (id: number) => Promise<void>;
  trackCompetitor: (payload: {
    shopName: string;
    shopUrl?: string;
    estimatedPriceRange?: string;
    estimatedOrders?: string;
    notes?: string;
  }) => Promise<void>;
  removeCompetitor: (id: number) => Promise<void>;
  saveListing: (payload: {
    title: string;
    tags: string[];
    description: string;
    priceUsd: number | string;
    category: string;
    seoScore?: number;
    sourceTool?: string;
    status?: string;
  }) => Promise<void>;
  deleteListing: (id: number) => Promise<void>;
  logSearch: (toolName: string, query: string, summary?: string) => Promise<void>;
  recordRank: (payload: {
    target: string;
    avgPosition: number;
    pageOneCount: number;
    totalKeywords: number;
  }) => Promise<void>;
  saveFavoriteProduct: (payload: {
    title: string;
    category: string;
    priceUsd: number | string;
    demandLevel: string;
    competitionLevel: string;
    relatedKeywords: string[];
  }) => Promise<void>;
  removeFavoriteProduct: (id: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not yet enabled in Firebase Console. Use "Continue with Google" below or enable Email/Password provider in Authentication > Sign-in method.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters long.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in popup was closed before completing authentication.';
  }
  return err instanceof Error ? err.message : 'Authentication request failed.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData>(EMPTY_WORKSPACE);
  const [feeSettings, setFeeSettingsState] = useState<FeeSettings>(() => {
    try {
      const raw = localStorage.getItem('craftrank_fee_settings_v1');
      return raw ? { ...DEFAULT_FEE_SETTINGS, ...(JSON.parse(raw) as Partial<FeeSettings>) } : DEFAULT_FEE_SETTINGS;
    } catch {
      return DEFAULT_FEE_SETTINGS;
    }
  });

  const setFeeSettings = useCallback((next: FeeSettings) => {
    setFeeSettingsState(next);
    try {
      localStorage.setItem('craftrank_fee_settings_v1', JSON.stringify(next));
    } catch {
      // Ignore storage quota issues
    }
  }, []);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}, overrideUser?: User) => {
    const activeUser = overrideUser ?? auth.currentUser;
    if (!activeUser) {
      throw new Error('Sign in to sync your Etsy workspace.');
    }
    // ID token stays strictly in JS memory
    const token = await activeUser.getIdToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server request failed.');
    }
    return data;
  }, []);

  const loadMe = useCallback(
    async (activeUser: User) => {
      setWorkspaceLoading(true);
      try {
        const data = await authFetch('/api/user/me', { method: 'GET' }, activeUser);
        setProfile(data.user ?? null);
        const ws = data.workspace ?? {};
        const mappedRanks: RankHistoryEntry[] = Array.isArray(ws.rankHistory)
          ? ws.rankHistory.map((r: Record<string, unknown>) => ({
              id: String(r.id ?? ''),
              target: String(r.target ?? ''),
              checkedAt: String(r.checkedAt ?? new Date().toISOString()),
              avgPosition: Number(r.avgPosition ?? 0),
              pageOneCount: Number(r.pageOneCount ?? 0),
              totalKeywords: Number(r.totalKeywords ?? 0),
            }))
          : [];
        setWorkspace({
          savedKeywords: Array.isArray(ws.savedKeywords) ? ws.savedKeywords : [],
          trackedCompetitors: Array.isArray(ws.trackedCompetitors) ? ws.trackedCompetitors : [],
          savedListings: Array.isArray(ws.savedListings) ? ws.savedListings : [],
          searchHistory: Array.isArray(ws.searchHistory) ? ws.searchHistory : [],
          rankHistory: mappedRanks,
          favoriteProducts: Array.isArray(ws.favoriteProducts) ? ws.favoriteProducts : [],
        });
      } catch (err) {
        console.error('Failed loading workspace:', err);
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setAuthLoading(false);
      if (fbUser) {
        void loadMe(fbUser);
      } else {
        setProfile(null);
        setWorkspace(EMPTY_WORKSPACE);
      }
    });
    return () => unsub();
  }, [loadMe]);

  const refreshWorkspace = useCallback(async () => {
    if (auth.currentUser) {
      await loadMe(auth.currentUser);
    }
  }, [loadMe]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      await loadMe(cred.user);
      showToast('Signed in with Google.', 'success');
    } catch (err) {
      const msg = friendlyFirebaseError(err);
      showToast(msg, 'error');
      throw new Error(msg);
    }
  }, [loadMe, showToast]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await loadMe(cred.user);
        showToast('Welcome back to CraftRank.', 'success');
      } catch (err) {
        const msg = friendlyFirebaseError(err);
        showToast(msg, 'error');
        throw new Error(msg);
      }
    },
    [loadMe, showToast]
  );

  const registerWithEmail = useCallback(
    async (email: string, password: string, displayName: string, shopName?: string) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await firebaseUpdateProfile(cred.user, { displayName: displayName.trim() });
        }
        await loadMe(cred.user);
        if (shopName?.trim() || displayName.trim()) {
          const data = await authFetch(
            '/api/user/profile',
            {
              method: 'PATCH',
              body: JSON.stringify({
                displayName: displayName.trim() || undefined,
                shopName: shopName?.trim() || undefined,
              }),
            },
            cred.user
          );
          if (data.user) setProfile(data.user);
        }
        showToast('Account created and synced to your workspace.', 'success');
      } catch (err) {
        const msg = friendlyFirebaseError(err);
        showToast(msg, 'error');
        throw new Error(msg);
      }
    },
    [authFetch, loadMe, showToast]
  );

  const resetPassword = useCallback(
    async (email: string) => {
      try {
        await sendPasswordResetEmail(auth, email.trim());
        showToast('Password reset email sent if an account exists.', 'info');
      } catch (err) {
        const msg = friendlyFirebaseError(err);
        showToast(msg, 'error');
        throw new Error(msg);
      }
    },
    [showToast]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
    setWorkspace(EMPTY_WORKSPACE);
    showToast('Signed out of your workspace.', 'info');
  }, [showToast]);

  const updateProfile = useCallback(
    async (patch: { displayName?: string; shopName?: string; etsyMarketplace?: string; currency?: string }) => {
      const data = await authFetch('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (data.user) setProfile(data.user);
      showToast('Profile settings saved.', 'success');
    },
    [authFetch, showToast]
  );

  const saveKeyword = useCallback(
    async (payload: {
      keyword: string;
      monthlySearches: number;
      competitionLabel: string;
      opportunityScore: number;
      avgPriceUsd: string | number;
      trend: string;
      notes?: string;
    }) => {
      const data = await authFetch('/api/user/keywords', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.record) {
        setWorkspace((prev) => ({
          ...prev,
          savedKeywords: [
            data.record as SavedKeywordRecord,
            ...prev.savedKeywords.filter(
              (k) => k.keyword.toLowerCase() !== payload.keyword.toLowerCase()
            ),
          ],
        }));
      }
      showToast(`Saved "${payload.keyword}" to Saved Bank.`, 'success');
    },
    [authFetch, showToast]
  );

  const deleteKeyword = useCallback(
    async (id: number) => {
      await authFetch(`/api/user/keywords/${id}`, { method: 'DELETE' });
      setWorkspace((prev) => ({
        ...prev,
        savedKeywords: prev.savedKeywords.filter((k) => k.id !== id),
      }));
      showToast('Removed saved keyword.', 'info');
    },
    [authFetch, showToast]
  );

  const trackCompetitor = useCallback(
    async (payload: {
      shopName: string;
      shopUrl?: string;
      estimatedPriceRange?: string;
      estimatedOrders?: string;
      notes?: string;
    }) => {
      const data = await authFetch('/api/user/competitors', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.record) {
        setWorkspace((prev) => ({
          ...prev,
          trackedCompetitors: [
            data.record as TrackedCompetitorRecord,
            ...prev.trackedCompetitors.filter(
              (c) => c.shopName.toLowerCase() !== payload.shopName.toLowerCase()
            ),
          ],
        }));
      }
      showToast(`Tracking competitor "${payload.shopName}".`, 'success');
    },
    [authFetch, showToast]
  );

  const removeCompetitor = useCallback(
    async (id: number) => {
      await authFetch(`/api/user/competitors/${id}`, { method: 'DELETE' });
      setWorkspace((prev) => ({
        ...prev,
        trackedCompetitors: prev.trackedCompetitors.filter((c) => c.id !== id),
      }));
      showToast('Stopped tracking competitor.', 'info');
    },
    [authFetch, showToast]
  );

  const saveListing = useCallback(
    async (payload: {
      title: string;
      tags: string[];
      description: string;
      priceUsd: number | string;
      category: string;
      seoScore?: number;
      sourceTool?: string;
      status?: string;
    }) => {
      const data = await authFetch('/api/user/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.record) {
        setWorkspace((prev) => ({
          ...prev,
          savedListings: [data.record as SavedListingRecord, ...prev.savedListings],
        }));
      }
      showToast('Listing saved to your database library.', 'success');
    },
    [authFetch, showToast]
  );

  const deleteListing = useCallback(
    async (id: number) => {
      await authFetch(`/api/user/listings/${id}`, { method: 'DELETE' });
      setWorkspace((prev) => ({
        ...prev,
        savedListings: prev.savedListings.filter((l) => l.id !== id),
      }));
      showToast('Listing deleted.', 'info');
    },
    [authFetch, showToast]
  );

  const logSearch = useCallback(
    async (toolName: string, query: string, summary = '') => {
      if (!auth.currentUser || !query.trim()) return;
      try {
        const data = await authFetch('/api/user/searches', {
          method: 'POST',
          body: JSON.stringify({ toolName, query, summary }),
        });
        if (data.record) {
          setWorkspace((prev) => ({
            ...prev,
            searchHistory: [data.record as SearchHistoryRecord, ...prev.searchHistory].slice(0, 40),
          }));
        }
      } catch {
        // Non-blocking background history log
      }
    },
    [authFetch]
  );

  const recordRank = useCallback(
    async (payload: {
      target: string;
      avgPosition: number;
      pageOneCount: number;
      totalKeywords: number;
    }) => {
      if (!auth.currentUser) return;
      const data = await authFetch('/api/user/ranks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.record) {
        const r = data.record as Record<string, unknown>;
        const mapped: RankHistoryEntry = {
          id: String(r.id ?? Date.now()),
          target: String(r.target ?? payload.target),
          checkedAt: String(r.checkedAt ?? new Date().toISOString()),
          avgPosition: Number(r.avgPosition ?? payload.avgPosition),
          pageOneCount: Number(r.pageOneCount ?? payload.pageOneCount),
          totalKeywords: Number(r.totalKeywords ?? payload.totalKeywords),
        };
        setWorkspace((prev) => ({
          ...prev,
          rankHistory: [mapped, ...prev.rankHistory].slice(0, 20),
        }));
      }
    },
    [authFetch]
  );

  const saveFavoriteProduct = useCallback(
    async (payload: {
      title: string;
      category: string;
      priceUsd: number | string;
      demandLevel: string;
      competitionLevel: string;
      relatedKeywords: string[];
    }) => {
      const data = await authFetch('/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.record) {
        setWorkspace((prev) => ({
          ...prev,
          favoriteProducts: [data.record as FavoriteProductRecord, ...prev.favoriteProducts],
        }));
      }
      showToast('Product saved to Favorites.', 'success');
    },
    [authFetch, showToast]
  );

  const removeFavoriteProduct = useCallback(
    async (id: number) => {
      await authFetch(`/api/user/favorites/${id}`, { method: 'DELETE' });
      setWorkspace((prev) => ({
        ...prev,
        favoriteProducts: prev.favoriteProducts.filter((f) => f.id !== id),
      }));
      showToast('Removed product from Favorites.', 'info');
    },
    [authFetch, showToast]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        workspaceLoading,
        profile,
        workspace,
        feeSettings,
        setFeeSettings,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        refreshWorkspace,
        updateProfile,
        saveKeyword,
        deleteKeyword,
        trackCompetitor,
        removeCompetitor,
        saveListing,
        deleteListing,
        logSearch,
        recordRank,
        saveFavoriteProduct,
        removeFavoriteProduct,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
