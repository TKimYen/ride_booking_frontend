import dayjs from 'dayjs';
import { amenities, busTypeInfo, companies, locations, profiles, routes, reviews, trips } from '../mock/db';
import type { CompanyProfileResponse, RouteResponse } from '../types';
import { normalizeVN } from '../utils/format';
import { ApiError, mock } from './client';

/** GET /api/locations?keyword= */
export const getLocations = (keyword = '') =>
  mock(() => {
    const k = normalizeVN(keyword);
    return k ? locations.filter((l) => normalizeVN(l.name).includes(k)) : locations;
  }, 80);

/** GET /api/bus-companies?keyword= */
export const getCompanies = (keyword = '') =>
  mock(() => {
    const k = normalizeVN(keyword);
    return k ? companies.filter((c) => normalizeVN(c.name).includes(k)) : companies;
  }, 80);

/** GET /api/trips/bus-types */
export const getBusTypes = () => mock(() => busTypeInfo, 50);

/** GET /api/routes */
export const getRoutes = () => mock(() => routes, 80);

/** Mới — GET /api/routes/popular?limit= (BE việc 4.3): tuyến nổi bật kèm giá thấp nhất sắp tới. */
export const getPopularRoutes = (limit = 6) =>
  mock(() => {
    const now = dayjs();
    const withPrice = (r: RouteResponse): RouteResponse => ({
      ...r,
      minPrice: Math.min(
        ...trips
          .filter((t) => t.routeId === r.id && t.status === 'ACTIVE' && dayjs(t.departureTime).isAfter(now))
          .map((t) => t.basePrice),
      ),
    });
    const featured = routes.filter((r) => r.featured);
    const rest = routes.filter((r) => !r.featured);
    return [...featured, ...rest].slice(0, limit).map(withPrice);
  });

export function ratingOfCompany(companyId: number) {
  const list = reviews.filter((r) => r.companyId === companyId && !r.hidden);
  if (!list.length) return { averageRating: null, totalReviews: 0 };
  const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
  return { averageRating: Math.round(avg * 10) / 10, totalReviews: list.length };
}

/** Mới — GET /api/bus-companies/{id}/profile (BE việc 8.3) */
export const getCompanyProfile = (companyId: number) =>
  mock((): CompanyProfileResponse => {
    const company = companies.find((c) => c.id === companyId);
    if (!company) throw new ApiError(404, `Không tìm thấy nhà xe với id ${companyId}`);
    return { company, rating: ratingOfCompany(companyId), ...profiles.get(companyId)! };
  });

/** Mới — GET /api/admin/amenities */
export const getAmenities = () => mock(() => amenities, 50);
