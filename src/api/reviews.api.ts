import dayjs from 'dayjs';
import { bookings, fmt, reviews, users } from '../mock/db';
import type { PageResponse, ReviewResponse, ReviewSummaryResponse } from '../types';
import { ApiError, mock, paginate } from './client';

const withMine = (r: ReviewResponse, viewerId: number | null) => ({ ...r, mine: viewerId != null && r.userId === viewerId });

function summarize(list: ReviewResponse[]): ReviewSummaryResponse {
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  list.forEach((r) => (breakdown[r.rating] += 1));
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : null;
  return {
    averageRating: avg == null ? null : Math.round(avg * 10) / 10,
    totalReviews: list.length,
    ratingBreakdown: breakdown,
  };
}

const visibleOfCompany = (companyId: number) =>
  reviews.filter((r) => r.companyId === companyId && !r.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Mới — GET /api/reviews/company/{companyId}?rating= (điểm theo nhà xe, PROJECT_STATUS Q3) */
export const listCompanyReviews = (companyId: number, viewerId: number | null, rating?: number, page = 0, size = 5) =>
  mock((): PageResponse<ReviewResponse> => {
    const list = visibleOfCompany(companyId).filter((r) => !rating || r.rating === rating);
    const p = paginate(list, page, size);
    return { ...p, content: p.content.map((r) => withMine(r, viewerId)) };
  });

/** Mới — GET /api/reviews/company/{companyId}/summary */
export const getCompanyReviewSummary = (companyId: number) => mock(() => summarize(visibleOfCompany(companyId)));

/** Mới — GET /api/reviews/me */
export const listMyReviews = (userId: number) =>
  mock(() => reviews.filter((r) => r.userId === userId).map((r) => withMine(r, userId)));

/** Mới — POST /api/reviews {bookingId, rating, comment} */
export const createReview = (userId: number, bookingId: number, rating: number, comment: string) =>
  mock((): ReviewResponse => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) throw new ApiError(404, `Không tìm thấy đơn với id ${bookingId}`);
    if (b.userId !== userId) throw new ApiError(403, 'Bạn chỉ đánh giá được đơn của mình');
    if (b.status !== 'COMPLETED') throw new ApiError(409, 'Bạn chỉ đánh giá được chuyến mình đã đi');
    if (rating < 1 || rating > 5) throw new ApiError(400, 'rating: Số sao từ 1 đến 5');
    if (comment.length > 1000) throw new ApiError(400, 'comment: Bình luận tối đa 1000 ký tự');
    if (reviews.some((r) => r.bookingId === bookingId || (r.userId === userId && r.tripId === b.trip.id)))
      throw new ApiError(409, 'Bạn đã đánh giá chuyến này, hãy sửa đánh giá cũ');
    const author = users.find((u) => u.id === userId)!;
    const review: ReviewResponse = {
      id: Math.max(0, ...reviews.map((r) => r.id)) + 1,
      tripId: b.trip.id,
      userId,
      userDisplayName: author.fullName,
      rating,
      comment: comment.trim(),
      createdAt: fmt(dayjs()),
      mine: true,
      bookingId,
      companyId: b.trip.companyId,
      companyName: b.trip.companyName,
      routeName: b.trip.routeName,
      hidden: false,
    };
    reviews.push(review);
    b.reviewed = true;
    return review;
  }, 500);

/** Mới — PUT /api/reviews/{id} */
export const updateReview = (userId: number, reviewId: number, rating: number, comment: string) =>
  mock(() => {
    const r = reviews.find((x) => x.id === reviewId);
    if (!r) throw new ApiError(404, `Không tìm thấy đánh giá với id ${reviewId}`);
    if (r.userId !== userId) throw new ApiError(403, 'Bạn không thể sửa đánh giá của người khác');
    r.rating = rating;
    r.comment = comment.trim();
    return withMine(r, userId);
  });

/** Mới — DELETE /api/reviews/{id} (chủ đánh giá hoặc admin) */
export const deleteReview = (userId: number, isAdmin: boolean, reviewId: number) =>
  mock(() => {
    const idx = reviews.findIndex((x) => x.id === reviewId);
    if (idx < 0) throw new ApiError(404, `Không tìm thấy đánh giá với id ${reviewId}`);
    if (!isAdmin && reviews[idx].userId !== userId) throw new ApiError(403, 'Bạn không thể xoá đánh giá của người khác');
    const [removed] = reviews.splice(idx, 1);
    const b = bookings.find((x) => x.id === removed.bookingId);
    if (b) b.reviewed = false;
    return { ok: true };
  });
