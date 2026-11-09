import type { BusType, PageResponse, SeatMapResponse, StopPointResponse, TripSearchItemResponse } from '../types';
import { get } from './client';

export type TripSort = 'departureAsc' | 'departureDesc' | 'priceAsc' | 'priceDesc';

export interface TripSearchParams {
  originId?: number;
  destinationId?: number;
  travelDate?: string;
  earliestDeparture?: string; // HH:mm
  latestDeparture?: string;
  /** BE việc 4.4: nhiều nhà xe, loại xe, điểm đón/trả */
  companyIds?: number[];
  busTypes?: BusType[];
  pickupPoints?: string[];
  dropoffPoints?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: TripSort;
  page?: number;
  size?: number;
}

/** "06:00" -> "06:00:00": backend nhận LocalTime dạng ISO đầy đủ. */
const isoTime = (t?: string) => (t && t.length === 5 ? `${t}:00` : t);

/** GET /api/trips — chỉ chuyến ACTIVE; mỗi dòng kèm số ghế trống, điểm nhà xe, điểm đón/trả. */
export const searchTrips = (p: TripSearchParams) =>
  get<PageResponse<TripSearchItemResponse>>('/api/trips', {
    ...p,
    earliestDeparture: isoTime(p.earliestDeparture),
    latestDeparture: isoTime(p.latestDeparture),
  });

/** GET /api/stop-points/options — tên điểm đón/trả để hiện checkbox lọc. */
export const getStopPointOptions = (originId?: number, destinationId?: number, travelDate?: string) =>
  get<{ pickups: string[]; dropoffs: string[] }>('/api/stop-points/options', { originId, destinationId, travelDate });

/** GET /api/trips/{id}/detail — một chuyến cùng hình dạng một dòng tìm kiếm. */
export const getTrip = (id: number) => get<TripSearchItemResponse>(`/api/trips/${id}/detail`);

/** GET /api/seats/trip/{tripId} */
export const getSeatMap = (tripId: number) => get<SeatMapResponse>(`/api/seats/trip/${tripId}`);

/** GET /api/stop-points/trip/{tripId} — điểm đón trước, theo stopOrder. */
export const getStopPoints = (tripId: number) => get<StopPointResponse[]>(`/api/stop-points/trip/${tripId}`);
