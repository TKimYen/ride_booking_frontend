/**
 * API khu Admin — tất cả đã nối API thật qua gateway: chuyến xe, điểm dừng, danh mục, đơn hàng,
 * khuyến mãi, thống kê (booking-service) và người dùng (user-service + auth-service).
 */
import dayjs from 'dayjs';
import type {
  BookingResponse,
  BookingStatus,
  BusCompanyResponse,
  BusType,
  DailyRevenuePoint,
  LocationResponse,
  PageResponse,
  PointType,
  PolicyType,
  PromotionResponse,
  RouteResponse,
  StatsOverview,
  StopPointResponse,
  TopRouteItem,
  TripResponse,
  TripSearchItemResponse,
  TripStatus,
  UpcomingTripItem,
  UserProfile,
} from '../types';
import { getCompanyProfile } from './catalog.api';
import { ApiError, apiClient, get } from './client';

const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data);
const put = <T>(url: string, body?: unknown) => apiClient.put<T>(url, body).then((r) => r.data);
const del = (url: string) => apiClient.delete(url).then(() => ({ ok: true }));

// ============ Chuyến xe ============
/** Một dòng ở bảng chuyến. `taken` = ghế đã bán hoặc đang giữ (backend gộp hai loại). */
export interface AdminTripRow {
  trip: TripResponse;
  taken: number;
  total: number;
}

export interface AdminTripDetail extends AdminTripRow {
  /** Số đơn theo trạng thái; trạng thái không có đơn thì không có khoá. */
  bookingsByStatus: Partial<Record<BookingStatus, number>>;
}

const tripRow = (item: TripSearchItemResponse): AdminTripRow => ({
  trip: item.trip,
  taken: item.unavailableSeats,
  total: item.availableSeats + item.unavailableSeats,
});

/** GET /api/admin/trips?status&originId&destinationId&companyId&from&to — mới nhất trước. */
export const adminListTrips = async (q: {
  status?: TripStatus;
  originId?: number;
  destinationId?: number;
  companyId?: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminTripRow>> => {
  const p = await get<PageResponse<TripSearchItemResponse>>('/api/admin/trips', q);
  return { ...p, content: p.content.map(tripRow) };
};

/** GET /api/admin/trips/{id} — mọi trạng thái, kèm số ghế và số đơn theo trạng thái. */
export const adminGetTrip = async (id: number): Promise<AdminTripDetail> => {
  const d = await get<{ seats: TripSearchItemResponse; bookingsByStatus: AdminTripDetail['bookingsByStatus'] }>(
    `/api/admin/trips/${id}`,
  );
  return { ...tripRow(d.seats), bookingsByStatus: d.bookingsByStatus };
};

export interface TripForm {
  routeId: number;
  companyId: number;
  busType: BusType;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
}

/** POST /api/admin/trips — ghế sinh tự động theo loại xe. */
export const adminCreateTrip = (form: TripForm) => post<TripResponse>('/api/admin/trips', form);

/** PUT /api/admin/trips/{id} — backend chặn đổi loại xe khi đã có ghế giữ/bán (409). */
export const adminUpdateTrip = (id: number, form: TripForm) => put<TripResponse>(`/api/admin/trips/${id}`, form);

/** DELETE /api/admin/trips/{id} — từ chối nếu chuyến đã có đơn (409). */
export const adminDeleteTrip = (id: number) => del(`/api/admin/trips/${id}`);

export interface RefundItem {
  bookingId: number;
  bookingCode: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  amount: number;
  gateway: string;
  transactionNo: string | null;
}

export interface TripCancellationResult {
  trip: TripResponse;
  cancelledBookings: number;
  releasedSeats: number;
  /** Đơn đã thu tiền, cần hoàn. Hệ thống chưa tự hoàn tiền. */
  refunds: RefundItem[];
  totalRefundAmount: number;
}

/** POST /api/admin/trips/{id}/cancel — trả ghế, huỷ đơn PENDING/PAID, trả DS đơn cần hoàn tiền. */
export const adminCancelTrip = (id: number) => post<TripCancellationResult>(`/api/admin/trips/${id}/cancel`);

/** POST /api/admin/trips/{id}/complete — chỉ chuyến đã khởi hành; đơn PAID thành COMPLETED. */
export const adminCompleteTrip = (id: number) =>
  post<{ trip: TripResponse; completedBookings: number }>(`/api/admin/trips/${id}/complete`);

// ============ Điểm đón/trả ============
/** POST /api/admin/trips/{tripId}/stop-points — thứ tự tự đánh ở backend. */
export const adminAddStopPoint = (
  tripId: number,
  body: { name: string; address: string; pointType: PointType; estimatedTime: string },
) => post<StopPointResponse>(`/api/admin/trips/${tripId}/stop-points`, body);

/** DELETE /api/admin/trips/{tripId}/stop-points/{id} — backend đánh số lại các điểm cùng loại. */
export const adminDeleteStopPoint = (tripId: number, id: number) => del(`/api/admin/trips/${tripId}/stop-points/${id}`);

// ============ Danh mục ============
/** GET /api/admin/locations — đủ mọi địa điểm (API công khai chỉ trả gợi ý theo từ khoá). */
export const adminListLocations = () => get<LocationResponse[]>('/api/admin/locations');

/** POST/PUT /api/admin/locations — bỏ trống slug thì backend tự sinh từ tên. */
export const adminSaveLocation = (id: number | null, name: string, slug?: string) => {
  const body = { name: name.trim(), slug: slug?.trim() || null };
  return id == null ? post<LocationResponse>('/api/admin/locations', body) : put<LocationResponse>(`/api/admin/locations/${id}`, body);
};
export const adminDeleteLocation = (id: number) => del(`/api/admin/locations/${id}`);

export interface RouteForm {
  originId: number;
  destinationId: number;
  name: string;
  distanceKm: number;
  durationMinutes: number;
}
/** GET /api/admin/routes */
export const adminListRoutes = () => get<RouteResponse[]>('/api/admin/routes');
/** POST/PUT /api/admin/routes */
export const adminSaveRoute = (id: number | null, f: RouteForm) => {
  const body = { ...f, name: f.name.trim() };
  return id == null ? post<RouteResponse>('/api/admin/routes', body) : put<RouteResponse>(`/api/admin/routes/${id}`, body);
};
export const adminDeleteRoute = (id: number) => del(`/api/admin/routes/${id}`);

/** GET /api/admin/bus-companies */
export const adminListCompanies = () => get<BusCompanyResponse[]>('/api/admin/bus-companies');
/** POST/PUT /api/admin/bus-companies */
export const adminSaveCompany = (id: number | null, f: { name: string; description: string; logoUrl: string }) => {
  const body = { name: f.name.trim(), description: f.description || null, logoUrl: f.logoUrl || null };
  return id == null
    ? post<BusCompanyResponse>('/api/admin/bus-companies', body)
    : put<BusCompanyResponse>(`/api/admin/bus-companies/${id}`, body);
};
export const adminDeleteCompany = (id: number) => del(`/api/admin/bus-companies/${id}`);

// ---- Nội dung nhà xe [4.1] ----
const companyUrl = (companyId: number) => `/api/admin/bus-companies/${companyId}`;

export const adminAddImage = (companyId: number, imageUrl: string, caption: string) =>
  post(`${companyUrl(companyId)}/images`, { imageUrl: imageUrl.trim(), caption: caption || null });
export const adminDeleteImage = (companyId: number, imageId: number) => del(`${companyUrl(companyId)}/images/${imageId}`);

/** PUT /api/admin/bus-companies/{id}/amenities — thay toàn bộ danh sách tiện ích. */
export const adminSetAmenities = (companyId: number, amenityIds: number[]) =>
  put(`${companyUrl(companyId)}/amenities`, { amenityIds });

export const adminSavePolicy = (companyId: number, id: number | null, f: { policyType: PolicyType; title: string; content: string }) =>
  id == null ? post(`${companyUrl(companyId)}/policies`, f) : put(`${companyUrl(companyId)}/policies/${id}`, f);
export const adminDeletePolicy = (companyId: number, id: number) => del(`${companyUrl(companyId)}/policies/${id}`);

/**
 * Thay bảng mốc hoàn tiền. Backend chỉ có thêm/sửa/xoá từng mốc nên làm 3 bước: kiểm tra ở
 * client, xoá mốc cũ, thêm mốc mới. Lỗi giữa chừng thì bảng có thể thiếu mốc — tải lại và lưu lần nữa.
 */
export const adminSetCancellationRules = async (companyId: number, rules: { hoursBefore: number; refundPercent: number }[]) => {
  if (rules.some((r) => r.refundPercent < 0 || r.refundPercent > 100)) throw new ApiError(400, '% hoàn tiền từ 0 đến 100');
  if (new Set(rules.map((r) => r.hoursBefore)).size !== rules.length) throw new ApiError(400, 'Mốc giờ bị trùng');
  const current = await getCompanyProfile(companyId);
  for (const r of current.cancellationRules) {
    if (r.id != null) await del(`${companyUrl(companyId)}/cancellation-rules/${r.id}`);
  }
  for (const r of rules) await post(`${companyUrl(companyId)}/cancellation-rules`, r);
  return { ok: true };
};

// ============ Đơn hàng [4.5] ============
/** GET /api/admin/bookings?tripId&status&keyword&from&to — keyword khớp mã vé/tên/SĐT/email. */
export const adminListBookings = (q: {
  tripId?: number;
  statuses?: BookingStatus[];
  keyword?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}) =>
  get<PageResponse<BookingResponse>>('/api/admin/bookings', {
    tripId: q.tripId,
    status: q.statuses,
    keyword: q.keyword?.trim(),
    from: q.from,
    to: q.to,
    page: q.page,
    size: q.size,
  });

/** POST /api/admin/bookings/{id}/cancel {reason} — bắt buộc lý do; đơn đã thu tiền thì có `refund`. */
export const adminCancelBooking = (id: number, reason: string) =>
  post<{ booking: BookingResponse; refund: RefundItem | null }>(`/api/admin/bookings/${id}/cancel`, { reason: reason.trim() });

// ============ Khuyến mãi — /api/admin/promotions (booking-service) ============
export type PromotionForm = Omit<PromotionResponse, 'id' | 'usedCount' | 'companyName' | 'routeName'>;

/** GET /api/admin/promotions — mới nhất trước. */
export const adminListPromotions = () => get<PromotionResponse[]>('/api/admin/promotions');

/** POST/PUT /api/admin/promotions — backend chặn trùng mã (409) và ngày sai (400). */
export const adminSavePromotion = (id: number | null, f: PromotionForm) => {
  if (!dayjs(f.endsAt).isAfter(dayjs(f.startsAt))) return Promise.reject(new ApiError(400, 'Thời gian kết thúc phải sau bắt đầu'));
  const body = {
    ...f,
    code: f.code.trim().toUpperCase(),
    description: f.description || null,
    bannerUrl: f.bannerUrl || null,
  };
  return id == null
    ? post<PromotionResponse>('/api/admin/promotions', body)
    : put<PromotionResponse>(`/api/admin/promotions/${id}`, body);
};

/** DELETE /api/admin/promotions/{id} — mã đã có lượt dùng thì backend từ chối (409), hãy tắt thay vì xoá. */
export const adminDeletePromotion = (id: number) => del(`/api/admin/promotions/${id}`);

// ============ Đánh giá ============
// Đã nối API thật ở reviews.api.ts (BE việc 3.4); giữ tên cũ để trang admin không phải đổi import.
export { adminListReviews, adminSetReviewHidden } from './reviews.api';

// ============ Người dùng ============
/** GET /api/admin/users?keyword&page&size (user-service) — tìm theo tên/email/SĐT, mới nhất trước. */
export const adminListUsers = (q: { keyword?: string; page?: number; size?: number }) =>
  get<PageResponse<UserProfile>>('/api/admin/users', { keyword: q.keyword?.trim(), page: q.page, size: q.size ?? 20 });

/**
 * PATCH /api/admin/users/{id}/unlock (auth-service) — xoá bộ đếm đăng nhập sai. Backend không trả
 * cờ "đang bị khoá" nên nút hiện ở mọi tài khoản; gọi khi tài khoản không bị khoá cũng không sao.
 */
export const adminUnlockUser = (id: number) => apiClient.patch<UserProfile>(`/api/admin/users/${id}/unlock`).then((r) => r.data);

// ============ Dashboard [3.5] — /api/admin/stats/* ============
export interface StatsRange {
  from: string;
  to: string;
  companyId?: number;
}

/** GET /api/admin/stats/overview — doanh thu, vé bán, đơn mới/huỷ, chuyến sắp chạy. */
export const statsOverview = (r: StatsRange) => get<StatsOverview>('/api/admin/stats/overview', { ...r });

/** GET /api/admin/stats/revenue — đủ mọi ngày, ngày trống = 0. */
export const statsRevenueDaily = (r: StatsRange) => get<DailyRevenuePoint[]>('/api/admin/stats/revenue', { ...r });

/** GET /api/admin/stats/bookings-by-status — luôn đủ 5 trạng thái. */
export const statsBookingsByStatus = (r: StatsRange) =>
  get<{ status: BookingStatus; count: number }[]>('/api/admin/stats/bookings-by-status', { ...r });

/** GET /api/admin/stats/top-routes — xếp theo doanh thu. */
export const statsTopRoutes = (r: StatsRange, limit = 8) => get<TopRouteItem[]>('/api/admin/stats/top-routes', { ...r, limit });

/**
 * Chuyến ACTIVE khởi hành trong `hours` giờ tới. Không có API riêng: lấy từ danh sách chuyến
 * của admin trong hai ngày rồi lọc theo giờ.
 */
export const statsUpcomingTrips = async (hours = 24, companyId?: number): Promise<UpcomingTripItem[]> => {
  const now = dayjs();
  const until = now.add(hours, 'hour');
  const page = await adminListTrips({
    status: 'ACTIVE',
    companyId,
    from: now.format('YYYY-MM-DD'),
    to: until.format('YYYY-MM-DD'),
    size: 100,
  });
  return page.content
    .filter((r) => dayjs(r.trip.departureTime).isAfter(now) && dayjs(r.trip.departureTime).isBefore(until))
    .sort((a, b) => a.trip.departureTime.localeCompare(b.trip.departureTime))
    .map((r) => ({
      tripId: r.trip.id,
      routeName: r.trip.routeName,
      companyName: r.trip.companyName,
      departureTime: r.trip.departureTime,
      booked: r.taken,
      total: r.total,
    }));
};
