/**
 * Shared HTTP client for backend APIs. Mock helpers remain available while
 * individual API modules are migrated from the demo data.
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useBookingStore } from '../stores/bookingStore';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

declare module 'axios' {
  interface AxiosRequestConfig {
    guestToken?: string;
    _retry?: boolean;
  }

  interface InternalAxiosRequestConfig {
    guestToken?: string;
    _retry?: boolean;
  }
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: number;
    email: string;
    fullName: string;
    role: 'USER' | 'ADMIN';
  };
}

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8088';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
        ? data.message
        : error.message || 'Không thể kết nối máy chủ';
    return new ApiError(error.response?.status ?? 0, message);
  }
  if (error instanceof Error) return new ApiError(0, error.message);
  return new ApiError(0, 'Không thể kết nối máy chủ');
}

function bookingIdFromBody(data: unknown): number | undefined {
  if (typeof data !== 'object' || data === null || !('bookingId' in data)) return undefined;
  return typeof data.bookingId === 'number' ? data.bookingId : undefined;
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const current = useAuthStore.getState();
  const refreshToken = current.refreshToken;
  if (!refreshToken || !current.user) {
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn');
  }

  const { data } = await axios.post<RefreshResponse>(
    `${baseURL}/api/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  const latest = useAuthStore.getState();
  if (latest.refreshToken !== refreshToken || !latest.user) {
    throw new ApiError(401, 'Phiên đăng nhập đã thay đổi');
  }

  latest.setSession({
    user: data.user ?? latest.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  return data.accessToken;
}

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);

  const bookingIdInPath = config.url?.match(/\/api\/bookings\/(\d+)(?:\/|$)/)?.[1];
  const bookingId =
    bookingIdInPath ??
    (config.url?.includes('/api/payments/checkout-session')
      ? bookingIdFromBody(config.data)?.toString()
      : undefined);
  const guestToken =
    config.guestToken ??
    (bookingId ? useBookingStore.getState().guestTickets[Number(bookingId)]?.guestToken : undefined);
  if (guestToken) config.headers.set('X-Guest-Token', guestToken);

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    const isRefreshRequest = config?.url?.includes('/api/auth/refresh');
    if (error.response?.status === 401 && config && !config._retry && !isRefreshRequest) {
      const { accessToken, refreshToken } = useAuthStore.getState();
      if (accessToken && refreshToken) {
        config._retry = true;
        try {
          refreshPromise ??= refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
          const renewedToken = await refreshPromise;
          config.headers.set('Authorization', `Bearer ${renewedToken}`);
          return apiClient(config);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          return Promise.reject(toApiError(refreshError));
        }
      }
    }
    return Promise.reject(toApiError(error));
  },
);

const LATENCY_MS = 250;

export function mock<T>(fn: () => T, latency = LATENCY_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // structuredClone: trang sửa object nhận được không làm hỏng "database".
        resolve(structuredClone(fn()));
      } catch (e) {
        reject(e);
      }
    }, latency);
  });
}

export function paginate<T>(items: T[], page = 0, size = 10) {
  const safeSize = Math.min(Math.max(size, 1), 100);
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const content = items.slice(page * safeSize, page * safeSize + safeSize);
  return {
    content,
    page,
    size: safeSize,
    totalElements: items.length,
    totalPages,
    hasNext: (page + 1) * safeSize < items.length,
  };
}

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Lỗi hệ thống, vui lòng thử lại';
