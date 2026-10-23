import dayjs from 'dayjs';
import { seatsOf, stopPoints, trips } from '../mock/db';
import type { BusType, PageResponse, SeatMapResponse, TripSearchItemResponse } from '../types';
import { ratingOfCompany } from './catalog.api';
import { ApiError, mock, paginate } from './client';

export type TripSort = 'departureAsc' | 'departureDesc' | 'priceAsc' | 'priceDesc';

export interface TripSearchParams {
  originId?: number;
  destinationId?: number;
  travelDate?: string;
  earliestDeparture?: string; // HH:mm
  latestDeparture?: string;
  /** Mới (BE việc 4.4): nhiều nhà xe, loại xe, điểm đón/trả */
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

const isFree = (status: string, holdingUntil: string | null, now: dayjs.Dayjs) =>
  status === 'AVAILABLE' || (status === 'HOLDING' && holdingUntil != null && dayjs(holdingUntil).isBefore(now));

function toItem(tripId: number): TripSearchItemResponse {
  const trip = trips.find((t) => t.id === tripId)!;
  const seats = seatsOf(trip.id);
  const now = dayjs();
  const available = seats.filter((s) => isFree(s.status, s.holdingUntil, now)).length;
  const rating = ratingOfCompany(trip.companyId);
  const stops = stopPoints.filter((s) => s.tripId === trip.id);
  return {
    trip,
    availableSeats: available,
    unavailableSeats: seats.length - available,
    rating: rating.averageRating,
    ratingCount: rating.totalReviews,
    pickupPreview: stops.find((s) => s.pointType === 'PICKUP')?.name,
    dropoffPreview: stops.filter((s) => s.pointType === 'DROPOFF').slice(-1)[0]?.name,
  };
}

/** GET /api/trips — chỉ chuyến ACTIVE chưa khởi hành. */
export const searchTrips = (p: TripSearchParams) =>
  mock((): PageResponse<TripSearchItemResponse> => {
    const now = dayjs();
    let list = trips.filter((t) => t.status === 'ACTIVE' && dayjs(t.departureTime).isAfter(now));
    if (p.originId) list = list.filter((t) => t.originId === p.originId);
    if (p.destinationId) list = list.filter((t) => t.destinationId === p.destinationId);
    if (p.travelDate) list = list.filter((t) => t.departureTime.startsWith(p.travelDate!));
    if (p.earliestDeparture) list = list.filter((t) => t.departureTime.slice(11, 16) >= p.earliestDeparture!);
    if (p.latestDeparture) list = list.filter((t) => t.departureTime.slice(11, 16) <= p.latestDeparture!);
    if (p.companyIds?.length) list = list.filter((t) => p.companyIds!.includes(t.companyId));
    if (p.busTypes?.length) list = list.filter((t) => p.busTypes!.includes(t.busType));
    if (p.minPrice != null) list = list.filter((t) => t.basePrice >= p.minPrice!);
    if (p.maxPrice != null) list = list.filter((t) => t.basePrice <= p.maxPrice!);
    const hasStop = (tripId: number, type: 'PICKUP' | 'DROPOFF', names: string[]) =>
      stopPoints.some((s) => s.tripId === tripId && s.pointType === type && names.includes(s.name));
    if (p.pickupPoints?.length) list = list.filter((t) => hasStop(t.id, 'PICKUP', p.pickupPoints!));
    if (p.dropoffPoints?.length) list = list.filter((t) => hasStop(t.id, 'DROPOFF', p.dropoffPoints!));

    const sort = p.sort ?? 'departureAsc';
    list = [...list].sort((a, b) => {
      if (sort === 'priceAsc') return a.basePrice - b.basePrice || a.departureTime.localeCompare(b.departureTime);
      if (sort === 'priceDesc') return b.basePrice - a.basePrice || a.departureTime.localeCompare(b.departureTime);
      if (sort === 'departureDesc') return b.departureTime.localeCompare(a.departureTime);
      return a.departureTime.localeCompare(b.departureTime);
    });
    const page = paginate(list, p.page ?? 0, p.size ?? 10);
    return { ...page, content: page.content.map((t) => toItem(t.id)) };
  });

/** Mới — GET /api/stop-points/options (BE việc 6.1): tên điểm đón/trả để hiện checkbox lọc. */
export const getStopPointOptions = (originId?: number, destinationId?: number, travelDate?: string) =>
  mock(() => {
    const ids = new Set(
      trips
        .filter(
          (t) =>
            t.status === 'ACTIVE' &&
            (!originId || t.originId === originId) &&
            (!destinationId || t.destinationId === destinationId) &&
            (!travelDate || t.departureTime.startsWith(travelDate)),
        )
        .map((t) => t.id),
    );
    const names = (type: 'PICKUP' | 'DROPOFF') =>
      [...new Set(stopPoints.filter((s) => ids.has(s.tripId) && s.pointType === type).map((s) => s.name))].sort();
    return { pickups: names('PICKUP'), dropoffs: names('DROPOFF') };
  }, 80);

/** GET /api/trips/{id} (kèm số ghế trống và rating như một dòng tìm kiếm) */
export const getTrip = (id: number) =>
  mock(() => {
    if (!trips.some((t) => t.id === id)) throw new ApiError(404, `Không tìm thấy chuyến xe với id ${id}`);
    return toItem(id);
  });

/** GET /api/seats/trip/{tripId} */
export const getSeatMap = (tripId: number) =>
  mock((): SeatMapResponse => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) throw new ApiError(404, `Không tìm thấy chuyến xe với id ${tripId}`);
    const now = dayjs();
    const seats = seatsOf(tripId).map((s) =>
      s.status === 'HOLDING' && isFree(s.status, s.holdingUntil, now)
        ? { ...s, status: 'AVAILABLE' as const, holdingUntil: null }
        : s,
    );
    return {
      tripId,
      busTypeName: trip.busTypeName,
      floors: trip.busType === 'SLEEPER_45' ? 1 : 2,
      totalSeats: seats.length,
      availableSeats: seats.filter((s) => s.status === 'AVAILABLE').length,
      basePrice: trip.basePrice,
      holdSecondsRemaining: null,
      seats,
    };
  }, 150);

/** GET /api/stop-points/trip/{tripId} — điểm đón trước, theo stopOrder. */
export const getStopPoints = (tripId: number) =>
  mock(() =>
    stopPoints
      .filter((s) => s.tripId === tripId)
      .sort((a, b) => (a.pointType === b.pointType ? a.stopOrder - b.stopOrder : a.pointType === 'PICKUP' ? -1 : 1)),
  );
