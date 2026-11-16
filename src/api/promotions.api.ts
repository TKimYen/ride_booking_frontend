import dayjs from 'dayjs';
import type { PromotionResponse, PromotionValidateResponse } from '../types';
import { apiClient, get } from './client';

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

/** GET /api/promotions?featured=true — Ưu đãi nổi bật ở Trang chủ. */
export const getFeaturedPromotions = () => get<PromotionResponse[]>('/api/promotions', { featured: true });

/** GET /api/promotions — trang Ưu đãi. */
export const getActivePromotions = () => get<PromotionResponse[]>('/api/promotions');

/** GET /api/promotions?tripId= — tab Giảm giá. Server lọc theo nhà xe/tuyến của chuyến. */
export const getPromotionsForTrip = (tripId: number) => get<PromotionResponse[]>('/api/promotions', { tripId });

/** POST /api/promotions/validate {tripId, seatIds, code} */
export const validatePromotion = (tripId: number, seatIds: number[], code: string) =>
  apiClient
    .post<PromotionValidateResponse>('/api/promotions/validate', { tripId, seatIds, code })
    .then((r) => r.data);
