import dayjs from 'dayjs';
import { promotions, trips } from '../mock/db';
import type { PromotionResponse, PromotionValidateResponse } from '../types';
import { ApiError, apiClient } from './client';

export const isUsable = (p: PromotionResponse, now = dayjs()) =>
  p.active &&
  !now.isBefore(dayjs(p.startsAt)) &&
  now.isBefore(dayjs(p.endsAt)) &&
  (p.usageLimit == null || p.usedCount < p.usageLimit);

/** Số tiền giảm — giống Promotion.discountFor() ở backend. */
export function discountFor(p: PromotionResponse, subtotal: number) {
  if (subtotal < p.minOrderValue) return 0;
  let discount = p.discountType === 'PERCENT' ? Math.floor((subtotal * p.discountValue) / 100) : p.discountValue;
  if (p.maxDiscount != null) discount = Math.min(discount, p.maxDiscount);
  return Math.min(discount, subtotal);
}

/**
 * Kiểm tra mã cho một chuyến + tổng tiền. Dùng chung cho validate và holdSeats
 * (backend việc 9: tính giảm giá ở server, không tin số tiền từ client).
 */
export function applyPromotion(code: string, tripId: number, subtotal: number) {
  const p = promotions.find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
  if (!p || !p.active) throw new ApiError(409, 'Mã giảm giá không tồn tại');
  const trip = trips.find((t) => t.id === tripId)!;
  const now = dayjs();
  if (now.isBefore(dayjs(p.startsAt))) throw new ApiError(409, 'Mã giảm giá chưa đến thời gian áp dụng');
  if (!now.isBefore(dayjs(p.endsAt))) throw new ApiError(409, 'Mã giảm giá đã hết hạn');
  if (p.usageLimit != null && p.usedCount >= p.usageLimit) throw new ApiError(409, 'Mã giảm giá đã hết lượt sử dụng');
  if (p.companyId && p.companyId !== trip.companyId)
    throw new ApiError(409, `Mã chỉ áp dụng cho nhà xe ${p.companyName}`);
  if (p.routeId && p.routeId !== trip.routeId) throw new ApiError(409, `Mã chỉ áp dụng cho tuyến ${p.routeName}`);
  if (subtotal < p.minOrderValue)
    throw new ApiError(409, `Đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(p.minOrderValue)}đ để dùng mã này`);
  return { promotion: p, discount: discountFor(p, subtotal) };
}

/** GET /api/promotions?featured=true — Ưu đãi nổi bật ở Trang chủ. */
export const getFeaturedPromotions = () => apiClient.get<PromotionResponse[]>('/api/promotions', { params: { featured: true } }).then((r) => r.data);

/** GET /api/promotions — trang Ưu đãi. */
export const getActivePromotions = () => apiClient.get<PromotionResponse[]>('/api/promotions').then((r) => r.data);

/** GET /api/promotions?tripId= — tab Giảm giá. */
export const getPromotionsForTrip = (tripId: number) =>
  apiClient.get<PromotionResponse[]>('/api/promotions', { params: { tripId } }).then((r) => r.data);

/** POST /api/promotions/validate {tripId, seatIds, code} */
export const validatePromotion = (tripId: number, seatIds: number[], code: string) =>
  apiClient
    .post<PromotionValidateResponse>('/api/promotions/validate', { tripId, seatIds, code })
    .then((r) => r.data);
