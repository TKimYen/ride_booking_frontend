import type { PageResponse, ReviewResponse, ReviewSummaryResponse } from '../types';
import { apiClient, get } from './client';

/** GET /api/reviews/company/{companyId}?rating= — đánh giá không ẩn của mọi chuyến thuộc nhà xe. */
export const listCompanyReviews = (companyId: number, rating?: number, page = 0, size = 5) =>
  get<PageResponse<ReviewResponse>>(`/api/reviews/company/${companyId}`, { rating, page, size });

/** GET /api/reviews/company/{companyId}/summary */
export const getCompanyReviewSummary = (companyId: number) =>
  get<ReviewSummaryResponse>(`/api/reviews/company/${companyId}/summary`);

/** GET /api/reviews/me — gồm cả đánh giá đã bị admin ẩn. */
export const listMyReviews = async () =>
  (await get<PageResponse<ReviewResponse>>('/api/reviews/me', { page: 0, size: 100 })).content;

/** POST /api/reviews {bookingId, rating, comment} — chỉ cho đơn COMPLETED của chính mình. */
export const createReview = async (bookingId: number, rating: number, comment: string) =>
  (await apiClient.post<ReviewResponse>('/api/reviews', { bookingId, rating, comment })).data;

/** PUT /api/reviews/{id} */
export const updateReview = async (reviewId: number, rating: number, comment: string) =>
  (await apiClient.put<ReviewResponse>(`/api/reviews/${reviewId}`, { rating, comment })).data;

/** DELETE /api/reviews/{id} — chủ đánh giá hoặc admin. */
export const deleteReview = async (reviewId: number) => {
  await apiClient.delete(`/api/reviews/${reviewId}`);
};

/** GET /api/admin/reviews?companyId&rating&hidden — gồm cả đánh giá đã ẩn. */
export const adminListReviews = (q: { companyId?: number; rating?: number; hidden?: boolean; page?: number; size?: number }) =>
  get<PageResponse<ReviewResponse>>('/api/admin/reviews', { page: 0, size: 20, ...q });

/** PATCH /api/admin/reviews/{id}/hidden {hidden} */
export const adminSetReviewHidden = async (id: number, hidden: boolean) =>
  (await apiClient.patch<ReviewResponse>(`/api/admin/reviews/${id}/hidden`, { hidden })).data;
