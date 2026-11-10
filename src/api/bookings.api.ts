import dayjs from 'dayjs';
import { bookings, seatsOf } from '../mock/db';
import type { BookingResponse, BookingStatus, HoldSeatsRequest, PageResponse } from '../types';
import { ApiError, apiClient, mock, paginate } from './client';

/** bookingId -> token gốc của khách vãng lai (backend chỉ lưu hash). */
const guestTokens = new Map<number, string>();

/**
 * Đơn PENDING quá hạn coi như EXPIRED và trả ghế — backend làm việc này bằng BookingExpiryJob.
 * Gọi trước mỗi lần đọc để dữ liệu cứng hành xử giống thật.
 */
function expireStale() {
  const now = dayjs();
  for (const b of bookings) {
    if (b.status === 'PENDING' && b.expiresAt && !dayjs(b.expiresAt).isAfter(now)) {
      b.status = 'EXPIRED';
      const seats = seatsOf(b.trip.id);
      b.seats.forEach((bs) => {
        const seat = seats.find((s) => s.id === bs.seatId);
        if (seat && seat.status === 'HOLDING') {
          seat.status = 'AVAILABLE';
          seat.holdingUntil = null;
        }
      });
    }
  }
}

function view(b: BookingResponse): BookingResponse {
  const holdSecondsRemaining =
    b.status === 'PENDING' && b.expiresAt ? Math.max(0, dayjs(b.expiresAt).diff(dayjs(), 'second')) : null;
  return { ...b, holdSecondsRemaining };
}

/**
 * POST /api/bookings — giữ ghế 10 phút, tạo đơn PENDING.
 * Đã đăng nhập: interceptor gắn Bearer token. Khách vãng lai: bắt buộc email,
 * backend trả guestToken đúng một lần (trang đặt vé lưu lại để thanh toán/tra cứu).
 */
export const holdSeats = (userId: number | null, req: HoldSeatsRequest) =>
  (void userId, apiClient)
    .post<BookingResponse>('/api/bookings', {
      ...req,
      contactEmail: req.contactEmail?.trim() || undefined,
      promotionCode: req.promotionCode?.trim() || undefined,
    })
    .then((r) => r.data);

/** POST /api/bookings/{id}/pay — thanh toán demo (môi trường dev). */
export const payDemo = (id: number, userId: number | null, guestToken?: string | null) =>
  (void userId, apiClient)
    .post<BookingResponse>(`/api/bookings/${id}/pay`, {
      gateway: 'VNPAY',
      responseCode: '00',
    }, { guestToken: guestToken ?? undefined })
    .then((r) => r.data);

export const createStripeCheckoutSession = (id: number, guestToken?: string | null) =>
  apiClient
    .post<{ bookingId: number; sessionId: string; checkoutUrl: string; amount: number; currency: string; expiresAt: string }>(
      '/api/payments/checkout-session',
      { bookingId: id },
      { guestToken: guestToken ?? undefined },
    )
    .then((r) => r.data);

/** POST /api/bookings/{id}/cancel — chỉ đơn PENDING còn hạn. */
export const cancelBooking = (id: number, userId: number | null, guestToken?: string | null) =>
  (void userId, apiClient)
    .post<BookingResponse>(`/api/bookings/${id}/cancel`, undefined, { guestToken: guestToken ?? undefined })
    .then((r) => r.data);

/** GET /api/bookings/{id} */
export const getBooking = (id: number, userId: number | null, guestToken?: string | null, isAdmin = false) =>
  (void userId, void isAdmin, apiClient.get<BookingResponse>(`/api/bookings/${id}`, { guestToken: guestToken ?? undefined })).then((r) => r.data);

/** GET /api/bookings?status=A,B — Đơn hàng của tôi */
export const listMyBookings = (userId: number, statuses: BookingStatus[], page = 0, size = 10) =>
  mock((): PageResponse<BookingResponse> => {
    expireStale();
    const list = bookings
      .filter((b) => b.userId === userId && (!statuses.length || statuses.includes(b.status)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(view);
    return paginate(list, page, size);
  });

/** POST /api/bookings/lookup {bookingCode, phone} — đơn khách vãng lai được cấp token mới. */
export const lookupBooking = (bookingCode: string, phone: string) =>
  apiClient
    .post<BookingResponse>('/api/bookings/lookup', { bookingCode, phone })
    .then((r) => r.data);

/** POST /api/bookings/claim {bookingCode, phone} — gắn vé khách vãng lai vào tài khoản. */
export const claimBooking = (userId: number, bookingCode: string, phone: string) =>
  mock((): BookingResponse => {
    const b = bookings.find(
      (x) => x.bookingCode === bookingCode.trim().toUpperCase() && x.contactPhone === phone.trim(),
    );
    if (!b) throw new ApiError(404, 'Không tìm thấy vé với mã và số điện thoại này');
    if (!b.guest && b.userId !== userId) throw new ApiError(409, 'Vé này đã thuộc một tài khoản khác');
    b.userId = userId;
    b.guest = false;
    guestTokens.delete(b.id);
    return view(b);
  });

export { expireStale, view as viewBooking };
