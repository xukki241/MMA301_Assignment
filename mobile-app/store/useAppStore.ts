import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: 'Teacher' | 'Student' | 'Admin';
  avatarURL?: string;
}

interface AppState {
  // Session data
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeClassId: string | null;

  // Derived / UI helpers
  isAuthenticated: boolean;
  loading: boolean;

  // Actions
  login: (user: User, accessToken: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearSession: () => Promise<void>;
  setActiveClassId: (classId: string | null) => void;
}

// ---------------------------------------------------------------------------
// SecureStore helpers
// ---------------------------------------------------------------------------

const STORE_KEYS = {
  ACCESS_TOKEN: 'lms_access_token',
  REFRESH_TOKEN: 'lms_refresh_token',
  USER: 'lms_user',
} as const;

async function persistSession(
  accessToken: string,
  user: User,
  refreshToken?: string,
): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEYS.ACCESS_TOKEN, accessToken);
  await SecureStore.setItemAsync(STORE_KEYS.USER, JSON.stringify(user));
  if (refreshToken) {
    await SecureStore.setItemAsync(STORE_KEYS.REFRESH_TOKEN, refreshToken);
  }
}

async function deleteSession(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(STORE_KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(STORE_KEYS.USER);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  activeClassId: null,
  isAuthenticated: false,
  loading: true, // starts true until restoreSession completes

  // ------- login -------
  login: (user, accessToken, refreshToken) => {
    // Persist in background — fire-and-forget
    persistSession(accessToken, user, refreshToken).catch(console.error);

    set({
      user,
      accessToken,
      refreshToken: refreshToken ?? null,
      isAuthenticated: true,
      loading: false,
    });
  },

  // ------- logout -------
  logout: async () => {
    await deleteSession().catch(console.error);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeClassId: null,
      isAuthenticated: false,
      loading: false,
    });
  },

  // ------- restoreSession -------
  restoreSession: async () => {
    try {
      const [storedToken, storedRefresh, storedUser] = await Promise.all([
        SecureStore.getItemAsync(STORE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(STORE_KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(STORE_KEYS.USER),
      ]);

      if (storedToken && storedUser) {
        const user: User = JSON.parse(storedUser);
        set({
          user,
          accessToken: storedToken,
          refreshToken: storedRefresh,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  // ------- clearSession (alias used by guards / error handlers) -------
  clearSession: async () => {
    await deleteSession().catch(console.error);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeClassId: null,
      isAuthenticated: false,
      loading: false,
    });
  },

  // ------- setActiveClassId -------
  setActiveClassId: (classId) => set({ activeClassId: classId }),
}));
