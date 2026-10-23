/**
 * API khu Admin (dữ liệu cứng). Endpoint tương ứng ghi ở comment từng hàm;
 * "Mới" = backend chưa có, tên đã chốt ở HUONG_DAN_FRONTEND.md B10.
 */
import dayjs from 'dayjs';
import {
  addTrip,
  amenities,
  bookings,
  companies,
  fmt,
  layoutOf,
  locations,
  profiles,
  promotions,
  reviews,
  routes,
  seatsOf,
  slugify,
  stopPoints,
  trips,
  users,
} from '../mock/db';
import type {
  BookingResponse,
  BookingStatus,
  BusType,
  DailyRevenuePoint,
  DashboardSummary,
  PageResponse,
  PointType,
  PolicyType,
  PromotionResponse,
  ReviewResponse,
  RouteResponse,
  TopRouteItem,
  TripResponse,
  TripStatus,
  UpcomingTripItem,
} from '../types';
import { BUS_TYPE_NAME, normalizeVN } from '../utils/format';
import { expireStale, viewBooking } from './bookings.api';
import { ApiError, mock, paginate } from './client';

// ============ Chuyến xe ============
export interface AdminTripRow {
  trip: TripResponse;
  booked: number;
  holding: number;
  total: number;
}

const tripRow = (t: TripResponse): AdminTripRow => {
  const seats = seatsOf(t.id);
  return {
    trip: t,
    booked: seats.filter((s) => s.status === 'BOOKED').length,
    holding: seats.filter((s) => s.status === 'HOLDING').length,
    total: seats.length,
  };
};

/** Mới — GET /api/admin/trips?status&routeId&companyId&from&to */
export const adminListTrips = (q: {
  status?: TripStatus;
  routeId?: number;
  companyId?: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}) =>
  mock((): PageResponse<AdminTripRow> => {
    let list = trips;
    if (q.status) list = list.filter((t) => t.status === q.status);
    if (q.routeId) list = list.filter((t) => t.routeId === q.routeId);
    if (q.companyId) list = list.filter((t) => t.companyId === q.companyId);
    if (q.from) list = list.filter((t) => t.departureTime.slice(0, 10) >= q.from!);
    if (q.to) list = list.filter((t) => t.departureTime.slice(0, 10) <= q.to!);
    list = [...list].sort((a, b) => b.departureTime.localeCompare(a.departureTime));
    const p = paginate(list, q.page ?? 0, q.size ?? 20);
    return { ...p, content: p.content.map(tripRow) };
  });

/** Mới — GET /api/admin/trips/{id} */
export const adminGetTrip = (id: number) =>
  mock(() => {
    const t = trips.find((x) => x.id === id);
    if (!t) throw new ApiError(404, `Không tìm thấy chuyến xe với id ${id}`);
    return tripRow(t);
  });

export interface TripForm {
  routeId: number;
  companyId: number;
  busType: BusType;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
}

/** POST /api/admin/trips — ghế sinh tự động theo loại xe. */
export const adminCreateTrip = (form: TripForm) =>
  mock(() => {
    if (!dayjs(form.arrivalTime).isAfter(dayjs(form.departureTime)))
      throw new ApiError(400, 'Giờ đến phải sau giờ khởi hành');
    const route = routes.find((r) => r.id === form.routeId)!;
    const t = addTrip(route, form.companyId, form.busType, dayjs(form.departureTime));
    t.arrivalTime = fmt(dayjs(form.arrivalTime));
    t.basePrice = form.basePrice;
    t.status = 'ACTIVE';
    return tripRow(t);
  });

/** PUT /api/admin/trips/{id} — không đổi được loại xe khi đã có ghế giữ/bán. */
export const adminUpdateTrip = (id: number, form: TripForm) =>
  mock(() => {
    const t = trips.find((x) => x.id === id);
    if (!t) throw new ApiError(404, `Không tìm thấy chuyến xe với id ${id}`);
    if (!dayjs(form.arrivalTime).isAfter(dayjs(form.departureTime)))
      throw new ApiError(400, 'Giờ đến phải sau giờ khởi hành');
    const row = tripRow(t);
    if (t.busType !== form.busType && row.booked + row.holding > 0)
      throw new ApiError(409, `Chuyến đã bán ${row.booked} ghế, hãy huỷ chuyến thay vì xoá hoặc đổi loại xe`);
    const route = routes.find((r) => r.id === form.routeId)!;
    const company = companies.find((c) => c.id === form.companyId)!;
    Object.assign(t, {
      routeId: route.id,
      routeName: route.name,
      originId: route.originId,
      originName: route.originName,
      destinationId: route.destinationId,
      destinationName: route.destinationName,
      companyId: company.id,
      companyName: company.name,
      busType: form.busType,
      busTypeName: BUS_TYPE_NAME[form.busType],
      totalSeats: layoutOf(form.busType).length,
      departureTime: fmt(dayjs(form.departureTime)),
      arrivalTime: fmt(dayjs(form.arrivalTime)),
      basePrice: form.basePrice,
    });
    seatsOf(t.id).forEach((s) => (s.totalPrice = t.basePrice + s.extraPrice));
    return tripRow(t);
  });

/** DELETE /api/admin/trips/{id} — từ chối nếu đã có ghế bán/giữ. */
export const adminDeleteTrip = (id: number) =>
  mock(() => {
    const t = trips.find((x) => x.id === id);
    if (!t) throw new ApiError(404, `Không tìm thấy chuyến xe với id ${id}`);
    const row = tripRow(t);
    if (row.booked > 0) throw new ApiError(409, `Chuyến đã bán ${row.booked} ghế, hãy huỷ chuyến thay vì xoá hoặc đổi loại xe`);
    if (row.holding > 0) throw new ApiError(409, `Chuyến đang có ${row.holding} ghế được giữ, đợi hết giờ giữ rồi hãy làm tiếp`);
    trips.splice(trips.indexOf(t), 1);
    return { ok: true };
  });

/** Mới — POST /api/admin/trips/{id}/cancel: trả ghế, huỷ đơn PENDING/PAID, trả DS đơn cần hoàn tiền. */
export const adminCancelTrip = (id: number) =>
  mock(() => {
    const t = trips.find((x) => x.id === id);
    if (!t) throw new ApiError(404, `Không tìm thấy chuyến xe với id ${id}`);
    if (t.status === 'COMPLETED') throw new ApiError(409, 'Chuyến đã chạy xong, không thể huỷ');
    let releasedSeats = 0;
    seatsOf(id).forEach((s) => {
      if (s.status !== 'AVAILABLE') {
        s.status = 'AVAILABLE';
        s.holdingUntil = null;
        releasedSeats++;
      }
    });
    const affected = bookings.filter((b) => b.trip.id === id && (b.status === 'PENDING' || b.status === 'PAID'));
    const paidBookingIdsToRefund = affected.filter((b) => b.status === 'PAID').map((b) => b.id);
    affected.forEach((b) => {
      b.status = 'CANCELLED';
      b.cancelReason = 'Nhà xe huỷ chuyến';
    });
    bookings.filter((b) => b.trip.id === id).forEach((b) => (b.trip.status = 'CANCELLED'));
    t.status = 'CANCELLED';
    return { tripId: id, cancelledBookings: affected.length, releasedSeats, paidBookingIdsToRefund };
  });

/** Mới — POST /api/admin/trips/{id}/complete: "Hoàn tất ngay" để demo. */
export const adminCompleteTrip = (id: number) =>
  mock(() => {
    const t = trips.find((x) => x.id === id);
    if (!t) throw new ApiError(404, `Không tìm thấy chuyến xe với id ${id}`);
    if (t.status !== 'ACTIVE') throw new ApiError(409, 'Chỉ hoàn tất được chuyến đang bán');
    let completed = 0;
    bookings
      .filter((b) => b.trip.id === id)
      .forEach((b) => {
        if (b.status === 'PAID') {
          b.status = 'COMPLETED';
          completed++;
        } else if (b.status === 'PENDING') b.status = 'EXPIRED';
        b.trip.status = 'COMPLETED';
      });
    seatsOf(id).forEach((s) => {
      if (s.status === 'HOLDING') {
        s.status = 'AVAILABLE';
        s.holdingUntil = null;
      }
    });
    t.status = 'COMPLETED';
    return { tripId: id, completedBookings: completed };
  });

// ============ Điểm đón/trả ============
/** POST /api/admin/trips/{tripId}/stop-points */
export const adminAddStopPoint = (
  tripId: number,
  body: { name: string; address: string; pointType: PointType; estimatedTime: string },
) =>
  mock(() => {
    const t = trips.find((x) => x.id === tripId)!;
    if (t.status === 'CANCELLED') throw new ApiError(409, 'Không thể thêm điểm dừng cho chuyến đã huỷ');
    const order = Math.max(0, ...stopPoints.filter((s) => s.tripId === tripId && s.pointType === body.pointType).map((s) => s.stopOrder)) + 1;
    const sp = {
      id: Math.max(...stopPoints.map((s) => s.id)) + 1,
      tripId,
      ...body,
      estimatedTime: fmt(dayjs(body.estimatedTime)),
      stopOrder: order,
    };
    stopPoints.push(sp);
    return sp;
  });

/** DELETE /api/admin/trips/{tripId}/stop-points/{id} — đánh số lại các điểm cùng loại. */
export const adminDeleteStopPoint = (tripId: number, id: number) =>
  mock(() => {
    const idx = stopPoints.findIndex((s) => s.id === id && s.tripId === tripId);
    if (idx < 0) throw new ApiError(404, 'Không tìm thấy điểm dừng');
    const [removed] = stopPoints.splice(idx, 1);
    stopPoints
      .filter((s) => s.tripId === tripId && s.pointType === removed.pointType)
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .forEach((s, i) => (s.stopOrder = i + 1));
    return { ok: true };
  });

// ============ Danh mục ============
/** POST/PUT/DELETE /api/admin/locations */
export const adminSaveLocation = (id: number | null, name: string, slug?: string) =>
  mock(() => {
    const finalSlug = slug?.trim() || slugify(name);
    if (locations.some((l) => l.slug === finalSlug && l.id !== id)) throw new ApiError(409, `Slug '${finalSlug}' đã tồn tại`);
    if (id == null) {
      const l = { id: Math.max(...locations.map((x) => x.id)) + 1, name: name.trim(), slug: finalSlug };
      locations.push(l);
      return l;
    }
    const l = locations.find((x) => x.id === id)!;
    Object.assign(l, { name: name.trim(), slug: finalSlug });
    return l;
  });
export const adminDeleteLocation = (id: number) =>
  mock(() => {
    if (routes.some((r) => r.originId === id || r.destinationId === id))
      throw new ApiError(409, 'Địa điểm đang được dùng trong tuyến, không thể xoá');
    locations.splice(locations.findIndex((l) => l.id === id), 1);
    return { ok: true };
  });

export interface RouteForm {
  originId: number;
  destinationId: number;
  name: string;
  distanceKm: number;
  durationMinutes: number;
  imageUrl?: string;
  featured?: boolean;
}
/** POST/PUT /api/admin/routes */
export const adminSaveRoute = (id: number | null, f: RouteForm) =>
  mock((): RouteResponse => {
    if (f.originId === f.destinationId) throw new ApiError(400, 'Điểm xuất phát và điểm đến không được là một');
    if (routes.some((r) => r.name.toLowerCase() === f.name.trim().toLowerCase() && r.id !== id))
      throw new ApiError(409, `Tuyến '${f.name.trim()}' đã tồn tại`);
    const o = locations.find((l) => l.id === f.originId)!;
    const d = locations.find((l) => l.id === f.destinationId)!;
    const data = {
      ...f,
      name: f.name.trim(),
      originName: o.name,
      destinationName: d.name,
    };
    if (id == null) {
      const r = { id: Math.max(...routes.map((x) => x.id)) + 1, ...data };
      routes.push(r);
      return r;
    }
    const r = routes.find((x) => x.id === id)!;
    Object.assign(r, data);
    return r;
  });
export const adminDeleteRoute = (id: number) =>
  mock(() => {
    if (trips.some((t) => t.routeId === id)) throw new ApiError(409, 'Tuyến đã có chuyến, không thể xoá');
    routes.splice(routes.findIndex((r) => r.id === id), 1);
    return { ok: true };
  });

/** POST/PUT /api/admin/bus-companies */
export const adminSaveCompany = (id: number | null, f: { name: string; description: string; logoUrl: string }) =>
  mock(() => {
    if (companies.some((c) => c.name.toLowerCase() === f.name.trim().toLowerCase() && c.id !== id))
      throw new ApiError(409, `Nhà xe '${f.name.trim()}' đã tồn tại`);
    if (id == null) {
      const c = { id: Math.max(...companies.map((x) => x.id)) + 1, ...f, name: f.name.trim() };
      companies.push(c);
      profiles.set(c.id, { images: [], amenities: [], policies: [], cancellationRules: [] });
      return c;
    }
    const c = companies.find((x) => x.id === id)!;
    Object.assign(c, { ...f, name: f.name.trim() });
    return c;
  });
export const adminDeleteCompany = (id: number) =>
  mock(() => {
    if (trips.some((t) => t.companyId === id)) throw new ApiError(409, 'Nhà xe đã có chuyến, không thể xoá');
    companies.splice(companies.findIndex((c) => c.id === id), 1);
    return { ok: true };
  });

// ---- Nội dung nhà xe (Mới — BE việc 8.4) ----
const profileOf = (companyId: number) => {
  if (!profiles.has(companyId)) profiles.set(companyId, { images: [], amenities: [], policies: [], cancellationRules: [] });
  return profiles.get(companyId)!;
};
export const adminAddImage = (companyId: number, imageUrl: string, caption: string) =>
  mock(() => {
    const p = profileOf(companyId);
    const img = { id: Date.now(), imageUrl, caption, sortOrder: p.images.length + 1 };
    p.images.push(img);
    return img;
  });
export const adminDeleteImage = (companyId: number, imageId: number) =>
  mock(() => {
    const p = profileOf(companyId);
    p.images = p.images.filter((i) => i.id !== imageId).map((i, idx) => ({ ...i, sortOrder: idx + 1 }));
    return { ok: true };
  });
export const adminSetAmenities = (companyId: number, amenityIds: number[]) =>
  mock(() => {
    profileOf(companyId).amenities = amenities.filter((a) => amenityIds.includes(a.id));
    return { ok: true };
  });
export const adminSavePolicy = (companyId: number, id: number | null, f: { policyType: PolicyType; title: string; content: string }) =>
  mock(() => {
    const p = profileOf(companyId);
    if (id == null) p.policies.push({ id: Date.now(), ...f });
    else Object.assign(p.policies.find((x) => x.id === id)!, f);
    return { ok: true };
  });
export const adminDeletePolicy = (companyId: number, id: number) =>
  mock(() => {
    const p = profileOf(companyId);
    p.policies = p.policies.filter((x) => x.id !== id);
    return { ok: true };
  });
export const adminSetCancellationRules = (companyId: number, rules: { hoursBefore: number; refundPercent: number }[]) =>
  mock(() => {
    if (rules.some((r) => r.refundPercent < 0 || r.refundPercent > 100)) throw new ApiError(400, '% hoàn tiền từ 0 đến 100');
    if (new Set(rules.map((r) => r.hoursBefore)).size !== rules.length) throw new ApiError(400, 'Mốc giờ bị trùng');
    profileOf(companyId).cancellationRules = [...rules].sort((a, b) => b.hoursBefore - a.hoursBefore);
    return { ok: true };
  });

// ============ Đơn hàng ============
/** GET /api/admin/bookings?tripId&status&keyword&from&to (keyword/from/to: Mới — việc 4.5) */
export const adminListBookings = (q: {
  tripId?: number;
  statuses?: BookingStatus[];
  keyword?: string;
  from?: string;
  to?: string;
  guest?: boolean;
  page?: number;
  size?: number;
}) =>
  mock((): PageResponse<BookingResponse> => {
    expireStale();
    const k = q.keyword ? normalizeVN(q.keyword) : '';
    const list = bookings
      .filter(
        (b) =>
          (!q.tripId || b.trip.id === q.tripId) &&
          (!q.statuses?.length || q.statuses.includes(b.status)) &&
          (q.guest == null || b.guest === q.guest) &&
          (!q.from || b.createdAt.slice(0, 10) >= q.from) &&
          (!q.to || b.createdAt.slice(0, 10) <= q.to) &&
          (!k ||
            normalizeVN(b.bookingCode).includes(k) ||
            b.contactPhone.includes(k) ||
            normalizeVN(b.contactName).includes(k) ||
            normalizeVN(b.contactEmail).includes(k)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(viewBooking);
    return paginate(list, q.page ?? 0, q.size ?? 20);
  });

/** Mới — POST /api/admin/bookings/{id}/cancel {reason} (việc 4.5) */
export const adminCancelBooking = (id: number, reason: string) =>
  mock(() => {
    const b = bookings.find((x) => x.id === id);
    if (!b) throw new ApiError(404, `Không tìm thấy đơn đặt vé với id ${id}`);
    if (b.status !== 'PENDING' && b.status !== 'PAID') throw new ApiError(409, 'Đơn không thể huỷ ở trạng thái hiện tại');
    const seats = seatsOf(b.trip.id);
    b.seats.forEach((bs) => {
      const s = seats.find((x) => x.id === bs.seatId);
      if (s) {
        s.status = 'AVAILABLE';
        s.holdingUntil = null;
      }
    });
    const needRefund = b.status === 'PAID';
    b.status = 'CANCELLED';
    b.cancelReason = reason.trim() || 'Admin huỷ';
    return { ...viewBooking(b), needRefund };
  });

// ============ Khuyến mãi ============
export type PromotionForm = Omit<PromotionResponse, 'id' | 'usedCount' | 'companyName' | 'routeName'>;
/** Mới — GET /api/admin/promotions */
export const adminListPromotions = () => mock(() => [...promotions].sort((a, b) => b.id - a.id));
/** Mới — POST/PUT /api/admin/promotions */
export const adminSavePromotion = (id: number | null, f: PromotionForm) =>
  mock(() => {
    const code = f.code.trim().toUpperCase();
    if (promotions.some((p) => p.code === code && p.id !== id)) throw new ApiError(409, `Mã '${code}' đã tồn tại`);
    if (!dayjs(f.endsAt).isAfter(dayjs(f.startsAt))) throw new ApiError(400, 'Thời gian kết thúc phải sau bắt đầu');
    if (f.discountType === 'PERCENT' && (f.discountValue <= 0 || f.discountValue > 100))
      throw new ApiError(400, 'Giảm theo % phải từ 1 đến 100');
    const data = {
      ...f,
      code,
      companyName: f.companyId ? companies.find((c) => c.id === f.companyId)!.name : null,
      routeName: f.routeId ? routes.find((r) => r.id === f.routeId)!.name : null,
    };
    if (id == null) {
      const p = { id: Math.max(0, ...promotions.map((x) => x.id)) + 1, usedCount: 0, ...data };
      promotions.push(p);
      return p;
    }
    const p = promotions.find((x) => x.id === id)!;
    Object.assign(p, data);
    return p;
  });
export const adminDeletePromotion = (id: number) =>
  mock(() => {
    const p = promotions.find((x) => x.id === id)!;
    if (p.usedCount > 0) throw new ApiError(409, 'Mã đã được dùng, hãy tắt thay vì xoá');
    promotions.splice(promotions.indexOf(p), 1);
    return { ok: true };
  });

// ============ Đánh giá ============
/** Mới — GET /api/admin/reviews?companyId&rating (gồm cả đánh giá đã ẩn) */
export const adminListReviews = (q: { companyId?: number; rating?: number; page?: number; size?: number }) =>
  mock((): PageResponse<ReviewResponse> => {
    const list = reviews
      .filter((r) => (!q.companyId || r.companyId === q.companyId) && (!q.rating || r.rating === q.rating))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(list, q.page ?? 0, q.size ?? 20);
  });
/** Mới — PATCH /api/admin/reviews/{id}/hidden {hidden} */
export const adminSetReviewHidden = (id: number, hidden: boolean) =>
  mock(() => {
    const r = reviews.find((x) => x.id === id)!;
    r.hidden = hidden;
    return r;
  });

// ============ Người dùng ============
/** GET /api/admin/users?keyword (user-service) */
export const adminListUsers = (q: { keyword?: string; page?: number; size?: number }) =>
  mock(() => {
    const k = q.keyword ? normalizeVN(q.keyword) : '';
    const list = users.filter(
      (u) => !k || normalizeVN(u.fullName).includes(k) || u.email.includes(k) || (u.phone ?? '').includes(k),
    );
    return paginate(list, q.page ?? 0, q.size ?? 20);
  });
/** PATCH /api/admin/users/{id}/unlock (auth-service) */
export const adminUnlockUser = (id: number) =>
  mock(() => {
    users.find((u) => u.id === id)!.locked = false;
    return { ok: true };
  });

// ============ Dashboard (Mới — /api/admin/stats/*, định nghĩa PROJECT_STATUS Q4) ============
interface Range {
  from: string;
  to: string;
  companyId?: number;
}
const inRange = (iso: string, r: Range) => iso.slice(0, 10) >= r.from && iso.slice(0, 10) <= r.to;
const ofCompany = (b: BookingResponse, r: Range) => !r.companyId || b.trip.companyId === r.companyId;

function validateRange(r: Range) {
  if (r.from > r.to) throw new ApiError(400, 'Ngày bắt đầu phải trước ngày kết thúc');
  if (dayjs(r.to).diff(dayjs(r.from), 'day') > 366) throw new ApiError(400, 'Khoảng thời gian tối đa 366 ngày');
}

/** GET /api/admin/stats/summary?from&to&companyId */
export const statsSummary = (r: Range) =>
  mock((): DashboardSummary => {
    validateRange(r);
    expireStale();
    const paidLike = (b: BookingResponse) => b.status === 'PAID' || b.status === 'COMPLETED';
    const revenue = bookings
      .filter((b) => b.payment && b.payment.status === 'SUCCESS' && inRange(b.payment.createdAt, r) && ofCompany(b, r))
      .reduce((s, b) => s + b.payment!.amount, 0);
    const inPeriod = bookings.filter((b) => inRange(b.createdAt, r) && ofCompany(b, r));
    const byStatus = { PENDING: 0, PAID: 0, CANCELLED: 0, COMPLETED: 0, EXPIRED: 0 } as Record<BookingStatus, number>;
    inPeriod.forEach((b) => byStatus[b.status]++);
    const departed = trips.filter(
      (t) => t.status !== 'CANCELLED' && inRange(t.departureTime, r) && (!r.companyId || t.companyId === r.companyId),
    );
    let total = 0;
    let booked = 0;
    departed.forEach((t) => {
      const seats = seatsOf(t.id);
      total += seats.length;
      booked += seats.filter((s) => s.status === 'BOOKED').length;
    });
    return {
      from: r.from,
      to: r.to,
      revenue,
      ticketsSold: inPeriod.filter(paidLike).reduce((s, b) => s + b.seats.length, 0),
      totalBookings: inPeriod.length,
      bookingsByStatus: byStatus,
      tripsDeparted: departed.length,
      occupancyRate: total ? booked / total : 0,
      pendingBookings: bookings.filter((b) => b.status === 'PENDING' && ofCompany(b, r)).length,
    };
  }, 350);

/** GET /api/admin/stats/revenue-daily — điền 0 cho ngày trống để biểu đồ liền mạch. */
export const statsRevenueDaily = (r: Range) =>
  mock((): DailyRevenuePoint[] => {
    validateRange(r);
    const points: DailyRevenuePoint[] = [];
    for (let d = dayjs(r.from); !d.isAfter(dayjs(r.to)); d = d.add(1, 'day')) {
      const key = d.format('YYYY-MM-DD');
      const paid = bookings.filter((b) => b.payment?.status === 'SUCCESS' && b.payment.createdAt.startsWith(key) && ofCompany(b, r));
      points.push({
        date: key,
        revenue: paid.reduce((s, b) => s + b.payment!.amount, 0),
        ticketsSold: paid.reduce((s, b) => s + b.seats.length, 0),
      });
    }
    return points;
  });

/** GET /api/admin/stats/top-routes?limit */
export const statsTopRoutes = (r: Range, limit = 8) =>
  mock((): TopRouteItem[] => {
    const map = new Map<string, TopRouteItem>();
    bookings
      .filter((b) => (b.status === 'PAID' || b.status === 'COMPLETED') && inRange(b.createdAt, r) && ofCompany(b, r))
      .forEach((b) => {
        const routeId = trips.find((t) => t.id === b.trip.id)?.routeId ?? 0;
        const item = map.get(b.trip.routeName) ?? { routeId, routeName: b.trip.routeName, ticketsSold: 0, revenue: 0 };
        item.ticketsSold += b.seats.length;
        item.revenue += b.totalPrice;
        map.set(b.trip.routeName, item);
      });
    return [...map.values()].sort((a, b) => b.ticketsSold - a.ticketsSold).slice(0, limit);
  });

/** GET /api/admin/stats/upcoming-trips?hours=24 */
export const statsUpcomingTrips = (hours = 24) =>
  mock((): UpcomingTripItem[] => {
    const now = dayjs();
    return trips
      .filter((t) => t.status === 'ACTIVE' && dayjs(t.departureTime).isAfter(now) && dayjs(t.departureTime).isBefore(now.add(hours, 'hour')))
      .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
      .map((t) => {
        const seats = seatsOf(t.id);
        return {
          tripId: t.id,
          routeName: t.routeName,
          companyName: t.companyName,
          departureTime: t.departureTime,
          booked: seats.filter((s) => s.status === 'BOOKED').length,
          total: seats.length,
        };
      });
  });
