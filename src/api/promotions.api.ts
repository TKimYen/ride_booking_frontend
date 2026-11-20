import dayjs from 'dayjs';
import type { PromotionResponse, PromotionValidateResponse } from '../types';
import { apiClient, get } from './client';

export type PromotionStatus = 'active' | 'upcoming' | 'expired' | 'exhausted' | 'disabled';

export const getPromotionStatus = (p: PromotionResponse, now = dayjs()): PromotionStatus => {
  if (!p.active) return 'disabled';
  if (now.isBefore(dayjs(p.startsAt))) return 'upcoming';
  if (!now.isBefore(dayjs(p.endsAt))) return 'expired';
  if (p.usageLimit != null && p.usedCount >= p.usageLimit) return 'exhausted';
  return 'active';
};

export const isUsable = (p: PromotionResponse, now = dayjs()) => getPromotionStatus(p, now) === 'active';

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
