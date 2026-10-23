import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import type { BookingStatus, BusType, PaymentStatus, TripStatus } from '../types';

dayjs.locale('vi');

const vnd = new Intl.NumberFormat('vi-VN');

/** 250000 -> "250.000đ" */
export const formatVND = (value: number | null | undefined) =>
  value == null ? '—' : `${vnd.format(Math.round(value))}đ`;

/** "2026-10-20T07:00:00" -> "07:00" */
export const formatTime = (iso: string) => dayjs(iso).format('HH:mm');

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** -> "T2, 20/10/2026" */
export const formatDate = (iso: string | Date) => {
  const d = dayjs(iso);
  return `${WEEKDAYS[d.day()]}, ${d.format('DD/MM/YYYY')}`;
};

/** -> "T2 20/10" (dải ngày) */
export const formatShortDate = (iso: string | Date) => {
  const d = dayjs(iso);
  return `${WEEKDAYS[d.day()]} ${d.format('DD/MM')}`;
};

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? dayjs(iso).format('HH:mm DD/MM/YYYY') : '—';

/** 330 -> "5h30m" */
export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}m`;
};

export const durationBetween = (from: string, to: string) =>
  formatDuration(dayjs(to).diff(dayjs(from), 'minute'));

/** mm:ss từ số giây */
export const formatCountdown = (seconds: number) => {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const BUS_TYPE_NAME: Record<BusType, string> = {
  LIMOUSINE_29: 'Limousine 29 chỗ',
  CABIN_DOUBLE_22: 'Cabin đôi 22 phòng',
  SLEEPER_45: 'Giường nằm 45 chỗ',
};

export const BOOKING_STATUS: Record<BookingStatus, { label: string; color: string; tag: string }> = {
  PENDING: { label: 'Chờ thanh toán', color: 'text-amber-600 bg-amber-50', tag: 'gold' },
  PAID: { label: 'Đã thanh toán', color: 'text-success bg-green-50', tag: 'green' },
  COMPLETED: { label: 'Đã đi', color: 'text-primary bg-primary-light', tag: 'blue' },
  CANCELLED: { label: 'Đã huỷ', color: 'text-danger bg-red-50', tag: 'red' },
  EXPIRED: { label: 'Hết hạn thanh toán', color: 'text-muted bg-bg', tag: 'default' },
};

export const TRIP_STATUS: Record<TripStatus, { label: string; tag: string }> = {
  ACTIVE: { label: 'Đang bán', tag: 'green' },
  CANCELLED: { label: 'Đã huỷ', tag: 'red' },
  COMPLETED: { label: 'Đã chạy', tag: 'blue' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  PENDING: 'Đang xử lý',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu. */
export const normalizeVN = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

/** Khớp regex SĐT ở backend (HoldSeatsRequest). */
export const PHONE_REGEX = /^[0-9+][0-9 .-]{7,19}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
