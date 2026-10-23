import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (s: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

/**
 * Phiên đăng nhập. Bản thật (HUONG_DAN_FRONTEND B6) giữ accessToken trong bộ nhớ và chỉ lưu
 * refreshToken; ở chế độ dữ liệu cứng lưu cả user để F5 không bị đăng xuất.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'xego-auth' },
  ),
);

export const useIsAdmin = () => useAuthStore((s) => s.user?.role === 'ADMIN');
