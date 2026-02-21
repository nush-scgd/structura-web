import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Role = 'admin' | 'student' | 'customer';

interface AuthState {
  viewAs: Role | null; // The currently selected "view as" role. null means "use actual role" or "default".
  setViewAs: (role: Role | null) => void;
  resetViewAs: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      viewAs: null,
      setViewAs: (role) => set({ viewAs: role }),
      resetViewAs: () => set({ viewAs: null }),
    }),
    {
      name: 'structura-auth-view',
    }
  )
);
