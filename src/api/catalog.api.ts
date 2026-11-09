import type { BusCompanyResponse, BusType, CompanyProfileResponse, LocationResponse, PolicyType, RouteResponse } from '../types';
import { get } from './client';

/** GET /api/locations?keyword= — bỏ trống keyword thì backend trả toàn bộ danh sách. */
export const getLocations = (keyword = '') => get<LocationResponse[]>('/api/locations', { keyword: keyword.trim() });

let allLocations: Promise<LocationResponse[]> | null = null;

/**
 * Toàn bộ địa điểm, gọi một lần cho cả phiên — để đổi slug trên URL ("ha-noi-di-sa-pa")
 * sang id. Lỗi mạng thì xoá cache để lần sau gọi lại.
 */
export function getAllLocations() {
  allLocations ??= get<LocationResponse[]>('/api/locations/all').catch((e) => {
    allLocations = null;
    throw e;
  });
  return allLocations;
}

/** GET /api/bus-companies?keyword= */
export const getCompanies = (keyword = '') => get<BusCompanyResponse[]>('/api/bus-companies', { keyword: keyword.trim() });

/** GET /api/trips/bus-types */
export const getBusTypes = () =>
  get<{ code: BusType; name: string; seatCount: number; floors: number }[]>('/api/trips/bus-types');

/** GET /api/routes */
export const getRoutes = () => get<RouteResponse[]>('/api/routes');

/** GET /api/routes/popular?limit= — tuyến nổi bật + bán chạy, kèm giá thấp nhất sắp tới. */
export const getPopularRoutes = async (limit = 6) => {
  const list = await get<(RouteResponse & { minPrice: number | null })[]>('/api/routes/popular', { limit });
  // minPrice null = tuyến chưa có chuyến sắp chạy; trang chủ chỉ hiện "Từ ..." khi có số.
  return list.map((r) => ({ ...r, minPrice: r.minPrice ?? undefined }));
};

interface BusCompanyProfileBody {
  id: number;
  name: string;
  description: string;
  logoUrl: string;
  rating: { averageRating: number | null; totalReviews: number } | null;
  images: CompanyProfileResponse['images'];
  amenities: CompanyProfileResponse['amenities'];
  policies: { id: number; policyType: PolicyType; title: string; content: string }[];
  cancellationRules: { hoursBefore: number; refundPercent: number }[];
}

/** GET /api/bus-companies/{id}/profile — ảnh, tiện ích, chính sách, mốc hoàn tiền, điểm đánh giá. */
export const getCompanyProfile = async (companyId: number): Promise<CompanyProfileResponse> => {
  const p = await get<BusCompanyProfileBody>(`/api/bus-companies/${companyId}/profile`);
  return {
    company: { id: p.id, name: p.name, description: p.description, logoUrl: p.logoUrl },
    rating: p.rating ?? { averageRating: null, totalReviews: 0 },
    images: p.images,
    amenities: p.amenities,
    policies: p.policies,
    cancellationRules: p.cancellationRules,
  };
};

/** GET /api/admin/amenities (cần quyền admin) */
export const getAmenities = () => get<CompanyProfileResponse['amenities']>('/api/admin/amenities');
