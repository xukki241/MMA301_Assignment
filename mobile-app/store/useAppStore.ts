import { create } from 'zustand';

export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: 'Teacher' | 'Student' | 'Admin';
  avatarURL?: string;
}

interface AppState {
  user: User | null;
  accessToken: string | null;
  activeClassId: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setActiveClassId: (classId: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  accessToken: null,
  activeClassId: null,
  login: (user, token) => set({ user, accessToken: token }),
  logout: () => set({ user: null, accessToken: null, activeClassId: null }),
  setActiveClassId: (classId) => set({ activeClassId: classId }),
}));
