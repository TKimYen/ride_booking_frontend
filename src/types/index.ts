// DTO khớp với backend (booking-service, auth-service, user-service).
// Tên trường giữ đúng như JSON backend trả để sau này thay mock bằng API thật không phải sửa trang.

export type BusType = 'LIMOUSINE_29' | 'CABIN_DOUBLE_22' | 'SLEEPER_45';
export type TripStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
export type SeatStatus = 'AVAILABLE' | 'HOLDING' | 'BOOKED';
export type BookingStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type PointType = 'PICKUP' | 'DROPOFF';
export type PolicyType = 'CANCELLATION' | 'LUGGAGE' | 'CHILDREN' | 'PET' | 'DOCUMENT' | 'OTHER';
export type DiscountType = 'PERCENT' | 'FIXED';
export type Role = 'USER' | 'ADMIN';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface LocationResponse {
  id: number;
  name: string;
  slug: string;
}

export interface BusCompanyResponse {
  id: number;
  name: string;
  description: string;
  logoUrl: string;
}

export interface RouteResponse {
  id: number;
  originId: number;
  originName: string;
  destinationId: number;
  destinationName: string;
  name: string;
  distanceKm: number;
  durationMinutes: number;
  /** Mới (BE việc 4.3) */
  imageUrl?: string;
  featured?: boolean;
  minPrice?: number;
}

export interface TripResponse {
  id: number;
  routeId: number;
  routeName: string;
  originId: number;
  originName: string;
  destinationId: number;
  destinationName: string;
  companyId: number;
  companyName: string;
  companyLogoUrl: string;
  busType: BusType;
  busTypeName: string;
  totalSeats: number;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
  status: TripStatus;
}

export interface TripSearchItemResponse {
  trip: TripResponse;
  availableSeats: number;
  unavailableSeats: number;
  /** Mới (BE việc 4.4) */
  rating?: number | null;
  ratingCount?: number;
  pickupPreview?: string;
  dropoffPreview?: string;
}

export interface TripSeatResponse {
  id: number;
  tripId: number;
  seatName: string;
  floor: number;
  seatType: 'STANDARD' | 'DOUBLE' | 'SINGLE';
  extraPrice: number;
  totalPrice: number;
  status: SeatStatus;
  holdingUntil: string | null;
}

export interface SeatMapResponse {
  tripId: number;
  busTypeName: string;
  floors: number;
  totalSeats: number;
  availableSeats: number;
  basePrice: number;
  holdSecondsRemaining: number | null;
  seats: TripSeatResponse[];
}

export interface StopPointResponse {
  id: number;
  tripId: number;
  name: string;
  address: string;
  pointType: PointType;
  estimatedTime: string;
  stopOrder: number;
}

export interface ReviewResponse {
  id: number;
  tripId: number;
  userId: number;
  userDisplayName: string;
  rating: number;
  comment: string;
  createdAt: string;
  mine: boolean;
  /** Mới — dùng cho admin/“đánh giá của tôi” */
  bookingId?: number;
  companyId?: number;
  companyName?: string;
  routeName?: string;
  hidden?: boolean;
}

export interface ReviewSummaryResponse {
  averageRating: number | null;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
}

export interface CompanyProfileResponse {
  company: BusCompanyResponse;
  rating: { averageRating: number | null; totalReviews: number };
  images: { id: number; imageUrl: string; caption: string; sortOrder: number }[];
  amenities: { id: number; code: string; name: string; icon: string }[];
  policies: { id: number; policyType: PolicyType; title: string; content: string }[];
  cancellationRules: { hoursBefore: number; refundPercent: number }[];
}

export interface PromotionResponse {
  id: number;
  code: string;
  title: string;
  description: string;
  bannerUrl: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  companyId: number | null;
  companyName: string | null;
  routeId: number | null;
  routeName: string | null;
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  usedCount: number;
  featured: boolean;
  active: boolean;
}

export interface PromotionValidateResponse {
  code: string;
  subtotal: number;
  discount: number;
  total: number;
}

export interface BookingTripResponse {
  id: number;
  routeName: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  arrivalTime: string;
  companyId: number;
  companyName: string;
  busType: BusType;
  basePrice: number;
  /** Mới (BE việc 2) — biết chuyến bị nhà xe huỷ */
  status?: TripStatus;
}

export interface BookingSeatResponse {
  seatId: number;
  seatName: string;
  floor: number;
  seatType: string;
  price: number;
}

export interface PaymentResponse {
  id: number;
  gateway: 'STRIPE' | 'VNPAY' | 'MOMO' | 'ZALOPAY';
  transactionNo: string;
  amount: number;
  bankCode: string | null;
  responseCode: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface BookingResponse {
  id: number;
  bookingCode: string;
  userId: number | null;
  guest: boolean;
  trip: BookingTripResponse;
  pickupPoint: StopPointResponse | null;
  dropoffPoint: StopPointResponse | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  totalPrice: number;
  /** Mới (BE việc 9) */
  subtotalPrice?: number;
  discountAmount?: number;
  promotionCode?: string | null;
  status: BookingStatus;
  createdAt: string;
  expiresAt: string | null;
  holdSecondsRemaining: number | null;
  seats: BookingSeatResponse[];
  payment: PaymentResponse | null;
  guestToken?: string;
  /** Mới (BE việc 3.7) */
  reviewed?: boolean;
  cancelReason?: string | null;
}

export interface HoldSeatsRequest {
  tripId: number;
  seatIds: number[];
  pickupPointId: number | null;
  dropoffPointId: number | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  promotionCode?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

/** user-service UserResponse */
export interface UserProfile {
  id: number;
  fullName: string;
  phone: string | null;
  email: string;
  dob: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  role: Role;
  createdAt: string;
  /** Chỉ có ở trang admin (dữ liệu cứng) */
  emailVerified?: boolean;
  lastLoginAt?: string | null;
  bookingCount?: number;
  locked?: boolean;
}

export interface DashboardSummary {
  from: string;
  to: string;
  revenue: number;
  ticketsSold: number;
  totalBookings: number;
  bookingsByStatus: Record<BookingStatus, number>;
  tripsDeparted: number;
  occupancyRate: number;
  pendingBookings: number;
}

export interface DailyRevenuePoint {
  date: string;
  revenue: number;
  ticketsSold: number;
}

export interface TopRouteItem {
  routeId: number;
  routeName: string;
  ticketsSold: number;
  revenue: number;
}

export interface UpcomingTripItem {
  tripId: number;
  routeName: string;
  companyName: string;
  departureTime: string;
  booked: number;
  total: number;
}
