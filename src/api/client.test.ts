import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { ApiError, apiClient } from './client';

// logout() gọi thu hồi refresh token ở server — chặn lại để test không gửi request thật.
vi.mock('./auth.api', () => ({ logoutSession: vi.fn().mockResolvedValue(undefined) }));

const USER = { id: 7, email: 'khach@test.vn', fullName: 'Khách Test', role: 'USER' as const };

/** Promise mở sẵn để tự quyết lúc nào /api/auth/refresh trả về. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const response = (config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse => ({
  data,
  status,
  statusText: String(status),
  headers: {},
  config,
});

/**
 * Backend giả: token 'old' -> 401, token 'new' -> 200 kèm đường dẫn đã gọi.
 * Ghi lại header Authorization của từng lần gửi.
 */
function fakeBackend() {
  const calls: { url?: string; auth: unknown }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const auth = config.headers.get('Authorization');
    calls.push({ url: config.url, auth });
    if (auth === 'Bearer new') return response(config, 200, { url: config.url });
    const res = response(config, 401, { message: 'Token hết hạn' });
    throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, null, res);
  };
  return { adapter, calls };
}

let originalAdapter: typeof apiClient.defaults.adapter;

beforeEach(() => {
  originalAdapter = apiClient.defaults.adapter;
  useAuthStore.setState({ user: USER, accessToken: 'old', refreshToken: 'refresh-1' });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.restoreAllMocks();
});

describe('client.ts — tự làm mới token khi 401', () => {
  it('2 request cùng bị 401 -> chỉ gọi /api/auth/refresh 1 lần, rồi gửi lại cả 2 bằng token mới', async () => {
    const backend = fakeBackend();
    apiClient.defaults.adapter = backend.adapter;
    const refresh = deferred<{ data: unknown }>();
    const postSpy = vi.spyOn(axios, 'post').mockReturnValue(refresh.promise as never);

    const a = apiClient.get('/api/bookings');
    const b = apiClient.get('/api/users/me');

    // Đợi cả 2 request nhận 401 và cùng chờ một lần refresh.
    await vi.waitFor(() => expect(backend.calls).toHaveLength(2));
    await vi.waitFor(() => expect(postSpy).toHaveBeenCalled());
    refresh.resolve({ data: { accessToken: 'new', refreshToken: 'refresh-2' } });

    const [ra, rb] = await Promise.all([a, b]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toMatch(/\/api\/auth\/refresh$/);
    expect(postSpy.mock.calls[0][1]).toEqual({ refreshToken: 'refresh-1' });

    expect(ra.data).toEqual({ url: '/api/bookings' });
    expect(rb.data).toEqual({ url: '/api/users/me' });
    // 2 lần đầu bằng token cũ, 2 lần gửi lại bằng token mới.
    expect(backend.calls.map((c) => c.auth)).toEqual(['Bearer old', 'Bearer old', 'Bearer new', 'Bearer new']);

    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('new');
    expect(s.refreshToken).toBe('refresh-2');
    expect(s.user).toEqual(USER);
  });

  it('làm mới token thất bại -> đăng xuất, cả 2 request báo lỗi 401, chỉ gọi refresh 1 lần', async () => {
    const backend = fakeBackend();
    apiClient.defaults.adapter = backend.adapter;
    const refresh = deferred<{ data: unknown }>();
    const postSpy = vi.spyOn(axios, 'post').mockReturnValue(refresh.promise as never);

    const a = apiClient.get('/api/bookings');
    const b = apiClient.get('/api/users/me');
    await vi.waitFor(() => expect(backend.calls).toHaveLength(2));
    await vi.waitFor(() => expect(postSpy).toHaveBeenCalled());

    const refreshRes = response({ headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig, 401, {
      message: 'Refresh token không hợp lệ',
    });
    refresh.reject(new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, undefined, null, refreshRes));

    const results = await Promise.allSettled([a, b]);
    for (const r of results) {
      expect(r.status).toBe('rejected');
      const err = (r as PromiseRejectedResult).reason;
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
    }
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(backend.calls).toHaveLength(2); // không gửi lại khi refresh hỏng
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('sau lần refresh trước, lần 401 kế tiếp lại được làm mới (không kẹt promise cũ)', async () => {
    const backend = fakeBackend();
    apiClient.defaults.adapter = backend.adapter;
    const postSpy = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'new', refreshToken: 'refresh-2' } } as never);

    await apiClient.get('/api/bookings');
    useAuthStore.setState({ accessToken: 'old', refreshToken: 'refresh-2' });
    await apiClient.get('/api/bookings');

    expect(postSpy).toHaveBeenCalledTimes(2);
  });
});
