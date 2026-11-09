import type { AuthUser, Role, UserProfile } from '../types';
import { apiClient, get } from './client';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** user-service lưu giới tính bằng tiếng Việt ("Nam" | "Nữ" | "Khác"); trang dùng mã cố định. */
const GENDER_TO_API: Record<NonNullable<UserProfile['gender']>, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
const GENDER_FROM_API: Record<string, UserProfile['gender']> = { Nam: 'MALE', 'Nữ': 'FEMALE', Khác: 'OTHER' };

interface UserBody {
  id: number;
  fullName: string;
  phone: string | null;
  email: string;
  dob: string | null;
  gender: string | null;
  role: Role;
  createdAt: string;
}

interface AuthBody {
  accessToken: string;
  refreshToken: string;
  user: UserBody;
}

const toAuthUser = (u: UserBody): AuthUser => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role });

const toProfile = (u: UserBody): UserProfile => ({
  ...u,
  gender: u.gender ? (GENDER_FROM_API[u.gender] ?? 'OTHER') : null,
});

const toSession = (b: AuthBody): AuthResponse => ({
  accessToken: b.accessToken,
  refreshToken: b.refreshToken,
  user: toAuthUser(b.user),
});

/** POST /api/auth/login — 401 sai mật khẩu, 423 tài khoản tạm khoá. */
export const login = async (email: string, password: string) =>
  toSession((await apiClient.post<AuthBody>('/api/auth/login', { email: email.trim(), password })).data);

/**
 * POST /api/auth/register — backend tạo tài khoản, gửi email xác minh và trả luôn cặp token,
 * nên đăng ký xong là đã đăng nhập.
 */
export const register = async (fullName: string, email: string, password: string) =>
  toSession((await apiClient.post<AuthBody>('/api/auth/register', { fullName: fullName.trim(), email: email.trim(), password })).data);

/** POST /api/auth/logout — thu hồi refresh token. Lỗi mạng thì bỏ qua, trang vẫn xoá phiên. */
export const logoutSession = async (refreshToken: string | null) => {
  if (!refreshToken) return;
  try {
    await apiClient.post('/api/auth/logout', { refreshToken });
  } catch {
    /* phiên ở máy này vẫn bị xoá; refresh token sẽ tự hết hạn */
  }
};

/** POST /api/auth/forgot-password — luôn trả 200 để không lộ email có tồn tại hay không. */
export const forgotPassword = async (email: string) => {
  await apiClient.post('/api/auth/forgot-password', { email: email.trim() });
};

/** POST /api/auth/reset-password — token lấy từ link trong email. */
export const resetPassword = async (token: string, newPassword: string) => {
  await apiClient.post('/api/auth/reset-password', { token, newPassword });
};

/** POST /api/auth/verify-email — token lấy từ link trong email. */
export const verifyEmail = async (token: string) => {
  await apiClient.post('/api/auth/verify-email', { token });
};

/** PUT /api/auth/password */
export const changePassword = async (currentPassword: string, newPassword: string) => {
  await apiClient.put('/api/auth/password', { currentPassword, newPassword });
};

/** GET /api/users/me */
export const getMyProfile = async () => toProfile(await get<UserBody>('/api/users/me'));

/** PUT /api/users/me */
export const updateMyProfile = async (body: Pick<UserProfile, 'fullName' | 'phone' | 'dob' | 'gender'>) =>
  toProfile(
    (
      await apiClient.put<UserBody>('/api/users/me', {
        fullName: body.fullName.trim(),
        phone: body.phone?.trim() || '',
        dob: body.dob || null,
        gender: body.gender ? GENDER_TO_API[body.gender] : '',
      })
    ).data,
  );
