import dayjs from 'dayjs';
import { DEMO_PASSWORD, fmt, users } from '../mock/db';
import type { AuthUser, UserProfile } from '../types';
import { ApiError, mock } from './client';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const toAuthUser = (u: UserProfile): AuthUser => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role });

/** POST /api/auth/login */
export const login = (email: string, password: string) =>
  mock((): AuthResponse => {
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    const expected = DEMO_PASSWORD[user?.email ?? ''] ?? '12345678';
    if (!user || password !== expected) throw new ApiError(401, 'Email hoặc mật khẩu không đúng');
    if (user.locked) throw new ApiError(423, 'Tài khoản tạm khoá do đăng nhập sai nhiều lần. Thử lại sau 15 phút.');
    user.lastLoginAt = fmt(dayjs());
    return { accessToken: `mock-access-${user.id}`, refreshToken: `mock-refresh-${user.id}`, user: toAuthUser(user) };
  }, 400);

/** POST /api/auth/register — backend gửi email xác minh qua Mailpit. */
export const register = (fullName: string, email: string, password: string) =>
  mock(() => {
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw new ApiError(409, 'Email đã được sử dụng');
    const user: UserProfile = {
      id: Math.max(...users.map((u) => u.id)) + 1,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: null,
      dob: null,
      gender: null,
      role: 'USER',
      createdAt: fmt(dayjs()),
      emailVerified: false,
      lastLoginAt: null,
      bookingCount: 0,
    };
    users.push(user);
    DEMO_PASSWORD[user.email] = password;
    return { email: user.email };
  }, 500);

/** POST /api/auth/forgot-password — luôn trả 200 để không lộ email có tồn tại hay không. */
export const forgotPassword = (email: string) => mock(() => ({ ok: true, email: email.trim() }), 500);

/** PUT /api/auth/password */
export const changePassword = (userId: number, current: string, next: string) =>
  mock(() => {
    const user = users.find((u) => u.id === userId)!;
    const expected = DEMO_PASSWORD[user.email] ?? '12345678';
    if (current !== expected) throw new ApiError(400, 'Mật khẩu hiện tại không đúng');
    DEMO_PASSWORD[user.email] = next;
    return { ok: true };
  });

/** GET /api/users/me */
export const getMyProfile = (userId: number) =>
  mock(() => {
    const user = users.find((u) => u.id === userId);
    if (!user) throw new ApiError(401, 'Phiên đăng nhập đã hết hạn');
    return user;
  }, 120);

/** PUT /api/users/me */
export const updateMyProfile = (
  userId: number,
  body: Pick<UserProfile, 'fullName' | 'phone' | 'dob' | 'gender'>,
) =>
  mock(() => {
    const user = users.find((u) => u.id === userId)!;
    Object.assign(user, body);
    return user;
  });
