import dayjs from 'dayjs';
import { bookings, createBookingRecord, fmt, seatsOf, trips } from '../mock/db';
import type { BookingResponse, BookingStatus, HoldSeatsRequest, PageResponse } from '../types';
import { ApiError, apiClient, mock, paginate } from './client';
import { applyPromotion } from './promotions.api';

const HOLD_MINUTES = 10;
const MAX_SEATS = 10;

/** bookingId -> token gốc của khách vãng lai (backend chỉ lưu hash). */
const guestTokens = new Map<number, string>();
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');

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
 * userId = null là khách vãng lai: bắt buộc email, trả guestToken đúng một lần.
 */
export const holdSeats = (userId: number | null, req: HoldSeatsRequest) =>
  mock((): BookingResponse => {
    expireStale();
    const trip = trips.find((t) => t.id === req.tripId);
    if (!trip) throw new ApiError(404, `Không tìm thấy chuyến xe với id ${req.tripId}`);
    if (trip.status !== 'ACTIVE') throw new ApiError(409, 'Chuyến xe này không còn nhận đặt vé');
    if (!dayjs(trip.departureTime).isAfter(dayjs())) throw new ApiError(409, 'Chuyến xe đã khởi hành, không thể đặt vé');
    if (userId == null && !req.contactEmail?.trim())
      throw new ApiError(400, 'Khách chưa đăng nhập phải nhập email để nhận vé');
    const ids = [...new Set(req.seatIds)].sort((a, b) => a - b);
    if (!ids.length) throw new ApiError(400, 'Phải chọn ít nhất một ghế');
    if (ids.length > MAX_SEATS) throw new ApiError(400, `Mỗi đơn chỉ được đặt tối đa ${MAX_SEATS} ghế`);

    const all = seatsOf(trip.id);
    const seats = ids.map((id) => all.find((s) => s.id === id));
    if (seats.some((s) => !s)) throw new ApiError(404, 'Một hoặc nhiều ghế không tồn tại');
    const now = dayjs();
    const taken = seats.filter(
      (s) => s!.status === 'BOOKED' || (s!.status === 'HOLDING' && (!s!.holdingUntil || dayjs(s!.holdingUntil).isAfter(now))),
    );
    if (taken.length) throw new ApiError(409, `Ghế đã có người giữ hoặc đã bán: ${taken.map((s) => s!.seatName).join(', ')}`);

    const subtotal = seats.reduce((sum, s) => sum + s!.totalPrice, 0);
    let discount = 0;
    let promotionCode: string | null = null;
    if (req.promotionCode?.trim()) {
      const applied = applyPromotion(req.promotionCode, trip.id, subtotal);
      discount = applied.discount;
      promotionCode = applied.promotion.code;
    }

    const expiresAt = now.add(HOLD_MINUTES, 'minute');
    seats.forEach((s) => {
      s!.status = 'HOLDING';
      s!.holdingUntil = fmt(expiresAt);
    });
    const booking = createBookingRecord({
      trip,
      seats: seats as NonNullable<(typeof seats)[number]>[],
      userId,
      contactName: req.contactName.trim(),
      contactPhone: req.contactPhone.trim(),
      contactEmail: req.contactEmail.trim(),
      status: 'PENDING',
      createdAt: now,
      pickupPointId: req.pickupPointId,
      dropoffPointId: req.dropoffPointId,
      promotionCode,
      discount,
    });
    booking.expiresAt = fmt(expiresAt);
    if (userId == null) {
      const token = newToken();
      guestTokens.set(booking.id, token);
      return { ...view(booking), guestToken: token };
    }
    return view(booking);
  }, 500);

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
