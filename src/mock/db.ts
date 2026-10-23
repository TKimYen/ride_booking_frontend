/**
 * "Database" dữ liệu cứng chạy trong bộ nhớ trình duyệt.
 *
 * Danh mục (địa điểm, nhà xe, tuyến) lấy theo SeedDataLoader của booking-service để FE trông
 * giống dữ liệu thật. Chuyến, ghế, đơn, đánh giá sinh tất định theo ngày hôm nay (random có seed)
 * nên mỗi lần F5 ra cùng một bộ dữ liệu. Thao tác ghi (đặt vé, CRUD admin) sửa mảng trong bộ nhớ,
 * F5 là về lại ban đầu.
 *
 * Khi backend xong API: thay phần thân các hàm trong src/api/*.ts bằng lời gọi HTTP, KHÔNG cần sửa trang.
 */
import dayjs from 'dayjs';
import type {
  BookingResponse,
  BusCompanyResponse,
  BusType,
  CompanyProfileResponse,
  LocationResponse,
  PromotionResponse,
  ReviewResponse,
  RouteResponse,
  StopPointResponse,
  TripResponse,
  TripSeatResponse,
  UserProfile,
} from '../types';
import { BUS_TYPE_NAME } from '../utils/format';

// ---------- random có seed ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261023);
const pick = <T,>(arr: T[], r = rand) => arr[Math.floor(r() * arr.length)];

const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DDTHH:mm:ss');
const TODAY = dayjs().startOf('day');

const slugify = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// ---------- Địa điểm ----------
const LOCATION_NAMES = [
  'Hà Nội', 'Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Hội An', 'Cần Thơ',
  'Huế', 'Nha Trang', 'Vũng Tàu', 'Hạ Long',
  'Sa Pa', 'Đà Lạt', 'Buôn Ma Thuột', 'Pleiku', 'Quy Nhơn',
  'Thanh Hóa', 'Nam Định', 'Vinh', 'Hà Giang', 'Tuyên Quang',
];
export const locations: LocationResponse[] = LOCATION_NAMES.map((name, i) => ({
  id: i + 1,
  name,
  slug: slugify(name),
}));
const loc = (name: string) => locations.find((l) => l.name === name)!;

// ---------- Nhà xe ----------
const COMPANY_ROWS: [string, string][] = [
  ['G8 SAPA OPEN TOUR', 'Xe limousine 9 chỗ và 11 chỗ, tuyến Tây Bắc.'],
  ['HATOUR', 'Xe giường nằm Hà Nội - miền Nam, đi nhiều chuyến trong ngày.'],
  ['KINGBUS', 'Hạng trọng 2 tầng, có Wi-Fi và ổ cắm sạc.'],
  ['DUONG DAT', 'Xe ghế ngồi, phù hợp tuyến nội thành và đường ngắn.'],
  ['SAI GON - HANOI', 'Xe giường nằm chạy Bắc - Nam, đón trực tiếp tại nhà.'],
  ['AN PHU', 'Xe ghế mềm tuyến miền Trung.'],
];
export const companies: BusCompanyResponse[] = COMPANY_ROWS.map(([name, description], i) => ({
  id: i + 1,
  name,
  description,
  logoUrl: '',
}));

// ---------- Tuyến ----------
const ROUTE_ROWS: [string, string, number, number][] = [
  ['Hà Nội', 'Sa Pa', 465, 510],
  ['Sa Pa', 'Hà Nội', 465, 510],
  ['Hà Nội', 'Hạ Long', 165, 180],
  ['Hà Nội', 'Hải Phòng', 120, 150],
  ['Hà Nội', 'Nam Định', 60, 75],
  ['Hà Nội', 'Thanh Hóa', 185, 220],
  ['Hà Nội', 'Vinh', 285, 330],
  ['Hà Nội', 'Đà Nẵng', 845, 960],
  ['Đà Nẵng', 'Huế', 85, 105],
  ['Hội An', 'Huế', 85, 105],
  ['Hồ Chí Minh', 'Vũng Tàu', 100, 120],
  ['Hồ Chí Minh', 'Nha Trang', 415, 480],
  ['Hồ Chí Minh', 'Đà Lạt', 300, 390],
  ['Hồ Chí Minh', 'Cần Thơ', 165, 200],
  ['Đà Nẵng', 'Đà Lạt', 245, 330],
];
const FEATURED_ROUTE_IMAGES: Record<string, string> = {
  'Hà Nội - Sa Pa': 'sapa',
  'Hà Nội - Hạ Long': 'halong',
  'Hồ Chí Minh - Đà Lạt': 'dalat',
  'Hồ Chí Minh - Nha Trang': 'nhatrang',
  'Hồ Chí Minh - Vũng Tàu': 'vungtau',
  'Đà Nẵng - Huế': 'hue',
};
export const routes: RouteResponse[] = ROUTE_ROWS.map(([o, d, km, min], i) => {
  const name = `${o} - ${d}`;
  const img = FEATURED_ROUTE_IMAGES[name];
  return {
    id: i + 1,
    originId: loc(o).id,
    originName: o,
    destinationId: loc(d).id,
    destinationName: d,
    name,
    distanceKm: km,
    durationMinutes: min,
    imageUrl: img ? `https://picsum.photos/seed/xego-${img}/600/400` : undefined,
    featured: Boolean(img),
  };
});

// ---------- Điểm đón/trả ----------
const STOP_NAMES: Record<string, [string, string][]> = {
  'Hà Nội': [
    ['Bến xe Mỹ Đình', '20 Phạm Hùng, Nam Từ Liêm'],
    ['Bến xe Giáp Bát', 'Km 6 Giải Phóng, Hoàng Mai'],
    ['Văn phòng Trần Nhật Duật', '12 Trần Nhật Duật, Hoàn Kiếm'],
  ],
  'Hồ Chí Minh': [
    ['Bến xe Miền Đông mới', '501 Hoàng Hữu Nam, TP. Thủ Đức'],
    ['Bến xe Miền Tây', '395 Kinh Dương Vương, Bình Tân'],
    ['Văn phòng Phạm Ngũ Lão', '272 Phạm Ngũ Lão, Quận 1'],
  ],
  'Đà Nẵng': [
    ['Bến xe Trung tâm Đà Nẵng', '201 Tôn Đức Thắng, Liên Chiểu'],
    ['Ngã ba Huế', 'Ngã ba Huế, Thanh Khê'],
  ],
  'Sa Pa': [
    ['Bến xe Sa Pa', 'Đường Điện Biên Phủ, Sa Pa'],
    ['Nhà thờ đá Sa Pa', 'Trung tâm thị xã Sa Pa'],
  ],
  'Đà Lạt': [
    ['Bến xe liên tỉnh Đà Lạt', '1 Tô Hiến Thành, Phường 3'],
    ['Chợ Đà Lạt', 'Nguyễn Thị Minh Khai, Phường 1'],
  ],
};
const stopsOf = (city: string): [string, string][] =>
  STOP_NAMES[city] ?? [[`Bến xe ${city}`, `Bến xe trung tâm ${city}`]];

// ---------- Ghế (giống BusType.layout() backend) ----------
const DOUBLE_SURCHARGE = 250000;
const DOUBLE_AISLE_EXTRA = 50000;
const rowLetter = (n: number) => String.fromCharCode(64 + n);

interface SeatSpec {
  name: string;
  floor: number;
  seatType: 'STANDARD' | 'DOUBLE' | 'SINGLE';
  extraPrice: number;
}
export function layoutOf(busType: BusType): SeatSpec[] {
  const seats: SeatSpec[] = [];
  const doubleRow = (floor: number, row: number) => {
    seats.push({ name: `${floor}${rowLetter(row)}1`, floor, seatType: 'DOUBLE', extraPrice: DOUBLE_SURCHARGE });
    seats.push({
      name: `${floor}${rowLetter(row)}2`,
      floor,
      seatType: 'DOUBLE',
      extraPrice: DOUBLE_SURCHARGE + DOUBLE_AISLE_EXTRA,
    });
  };
  if (busType === 'LIMOUSINE_29') {
    for (let r = 1; r <= 5; r++) doubleRow(1, r);
    seats.push({ name: '1FL', floor: 1, seatType: 'SINGLE', extraPrice: 0 });
    for (let r = 1; r <= 9; r++) doubleRow(2, r);
  } else if (busType === 'CABIN_DOUBLE_22') {
    for (let f = 1; f <= 2; f++)
      for (let r = 1; r <= 11; r++)
        for (let c = 1; c <= 2; c++)
          seats.push({ name: `${f}${rowLetter(r)}${c}`, floor: f, seatType: 'DOUBLE', extraPrice: DOUBLE_SURCHARGE });
  } else {
    for (let r = 1; r <= 15; r++)
      for (let c = 1; c <= 3; c++)
        seats.push({ name: `${rowLetter(r)}${c}`, floor: 1, seatType: 'STANDARD', extraPrice: 0 });
  }
  return seats;
}
const SEAT_COUNT: Record<BusType, number> = { LIMOUSINE_29: 29, CABIN_DOUBLE_22: 44, SLEEPER_45: 45 };
const FLOORS: Record<BusType, number> = { LIMOUSINE_29: 2, CABIN_DOUBLE_22: 2, SLEEPER_45: 1 };
export const busTypeInfo = (Object.keys(SEAT_COUNT) as BusType[]).map((code) => ({
  code,
  name: BUS_TYPE_NAME[code],
  seatCount: SEAT_COUNT[code],
  floors: FLOORS[code],
}));

// ---------- Chuyến ----------
export const trips: TripResponse[] = [];
export const stopPoints: StopPointResponse[] = [];
const BUS_TYPES: BusType[] = ['LIMOUSINE_29', 'SLEEPER_45', 'CABIN_DOUBLE_22'];
let tripSeq = 1;
let stopSeq = 1;

function addTrip(route: RouteResponse, companyId: number, busType: BusType, departure: dayjs.Dayjs) {
  const company = companies.find((c) => c.id === companyId)!;
  // Giá ~1.200đ/km, làm tròn 10.000đ; limousine đắt hơn 40%.
  let price = Math.round((route.distanceKm * 1200) / 10000) * 10000;
  price = Math.max(price, 90000);
  if (busType === 'LIMOUSINE_29') price = Math.round((price * 1.4) / 10000) * 10000;
  const arrival = departure.add(route.durationMinutes, 'minute');
  const trip: TripResponse = {
    id: tripSeq++,
    routeId: route.id,
    routeName: route.name,
    originId: route.originId,
    originName: route.originName,
    destinationId: route.destinationId,
    destinationName: route.destinationName,
    companyId: company.id,
    companyName: company.name,
    companyLogoUrl: company.logoUrl,
    busType,
    busTypeName: BUS_TYPE_NAME[busType],
    totalSeats: SEAT_COUNT[busType],
    departureTime: fmt(departure),
    arrivalTime: fmt(arrival),
    basePrice: price,
    status: arrival.isBefore(dayjs()) ? 'COMPLETED' : 'ACTIVE',
  };
  trips.push(trip);

  const pickups = stopsOf(route.originName);
  pickups.forEach(([name, address], i) =>
    stopPoints.push({
      id: stopSeq++,
      tripId: trip.id,
      name,
      address,
      pointType: 'PICKUP',
      estimatedTime: fmt(departure.add(i * 20 - 10, 'minute')),
      stopOrder: i + 1,
    }),
  );
  const drops = stopsOf(route.destinationName);
  drops.forEach(([name, address], i) =>
    stopPoints.push({
      id: stopSeq++,
      tripId: trip.id,
      name,
      address,
      pointType: 'DROPOFF',
      estimatedTime: fmt(arrival.add(i * 15, 'minute')),
      stopOrder: i + 1,
    }),
  );
  return trip;
}

// 10 ngày trước (đã chạy, cho tab "Đã đi") + 14 ngày tới; mỗi tuyến 4 khung giờ.
const SLOTS = [6, 9, 14, 21];
for (let day = -10; day <= 14; day++) {
  routes.forEach((route, ri) => {
    SLOTS.forEach((hour, si) => {
      if (day < 0 && si % 2 === 1) return; // quá khứ ít chuyến hơn cho nhẹ
      const idx = ri + si + day + 100;
      const companyId = (idx % companies.length) + 1;
      const busType = BUS_TYPES[idx % 3];
      const minute = [0, 15, 30, 45][(ri + si) % 4];
      addTrip(route, companyId, busType, TODAY.add(day, 'day').hour(hour).minute(minute));
    });
  });
}
// Một chuyến bị nhà xe huỷ để demo trạng thái CANCELLED.
trips.find((t) => t.status === 'ACTIVE' && t.routeId === 3 && dayjs(t.departureTime).isAfter(TODAY.add(2, 'day')))!.status =
  'CANCELLED';

// ---------- Ghế theo chuyến (sinh khi cần) ----------
const seatStore = new Map<number, TripSeatResponse[]>();
let seatSeq = 1;
export function seatsOf(tripId: number): TripSeatResponse[] {
  let seats = seatStore.get(tripId);
  if (seats) return seats;
  const trip = trips.find((t) => t.id === tripId)!;
  const r = mulberry32(tripId * 7919);
  // Chuyến gần ngày đi bán được nhiều hơn.
  const daysAhead = dayjs(trip.departureTime).diff(TODAY, 'day');
  const soldRatio = trip.status === 'COMPLETED' ? 0.75 : Math.max(0.05, 0.65 - daysAhead * 0.06);
  seats = layoutOf(trip.busType).map((spec) => {
    const roll = r();
    const status = roll < soldRatio ? 'BOOKED' : roll < soldRatio + 0.04 && trip.status === 'ACTIVE' ? 'HOLDING' : 'AVAILABLE';
    return {
      id: seatSeq++,
      tripId,
      seatName: spec.name,
      floor: spec.floor,
      seatType: spec.seatType,
      extraPrice: spec.extraPrice,
      totalPrice: trip.basePrice + spec.extraPrice,
      status: trip.status === 'CANCELLED' ? 'AVAILABLE' : status,
      holdingUntil: status === 'HOLDING' ? fmt(dayjs().add(8, 'minute')) : null,
    } as TripSeatResponse;
  });
  seatStore.set(tripId, seats);
  return seats;
}

// ---------- Người dùng ----------
export const DEMO_PASSWORD: Record<string, string> = {
  'user@xego.vn': '123456',
  'admin@xego.vn': 'admin123',
};
const FIRST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
const MIDDLE = ['Văn', 'Thị', 'Minh', 'Quốc', 'Thu', 'Hoàng', 'Ngọc', 'Anh'];
const LAST = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Hải', 'Huy', 'Lan', 'Long', 'Mai', 'Nam', 'Phúc', 'Quân', 'Trang', 'Tú', 'Vy'];
export const users: UserProfile[] = [
  {
    id: 1, fullName: 'Quản trị viên', phone: '0900000000', email: 'admin@xego.vn', dob: null, gender: null,
    role: 'ADMIN', createdAt: fmt(TODAY.subtract(120, 'day')), emailVerified: true, lastLoginAt: fmt(dayjs()), bookingCount: 0,
  },
  {
    id: 2, fullName: 'Nguyễn Minh Anh', phone: '0901234567', email: 'user@xego.vn', dob: '2002-05-14', gender: 'FEMALE',
    role: 'USER', createdAt: fmt(TODAY.subtract(60, 'day')), emailVerified: true, lastLoginAt: fmt(dayjs().subtract(1, 'day')),
  },
];
for (let i = 3; i <= 40; i++) {
  const fullName = `${pick(FIRST)} ${pick(MIDDLE)} ${pick(LAST)}`;
  users.push({
    id: i,
    fullName,
    phone: `09${String(Math.floor(rand() * 1e8)).padStart(8, '0')}`,
    email: `${slugify(fullName).replace(/-/g, '.')}${i}@gmail.com`,
    dob: null,
    gender: pick(['MALE', 'FEMALE', null]),
    role: 'USER',
    createdAt: fmt(TODAY.subtract(Math.floor(rand() * 100) + 1, 'day')),
    emailVerified: rand() > 0.2,
    lastLoginAt: rand() > 0.3 ? fmt(TODAY.subtract(Math.floor(rand() * 20), 'day')) : null,
    locked: rand() > 0.93,
  });
}

// ---------- Khuyến mãi ----------
const promo = (p: Omit<PromotionResponse, 'companyName' | 'routeName'>): PromotionResponse => ({
  ...p,
  companyName: p.companyId ? companies.find((c) => c.id === p.companyId)!.name : null,
  routeName: p.routeId ? routes.find((r) => r.id === p.routeId)!.name : null,
});
export const promotions: PromotionResponse[] = [
  promo({
    id: 1, code: 'XEGO10', title: 'Giảm 10% cho mọi chuyến', description: 'Áp dụng cho đơn từ 200.000đ, giảm tối đa 50.000đ.',
    bannerUrl: 'https://picsum.photos/seed/xego-promo1/800/400', discountType: 'PERCENT', discountValue: 10, maxDiscount: 50000,
    minOrderValue: 200000, companyId: null, routeId: null, startsAt: fmt(TODAY.subtract(5, 'day')), endsAt: fmt(TODAY.add(30, 'day')),
    usageLimit: 1000, usedCount: 312, featured: true, active: true,
  }),
  promo({
    id: 2, code: 'SAPA50K', title: 'Lên Sa Pa giảm 50K', description: 'Tuyến Hà Nội - Sa Pa, đơn từ 400.000đ.',
    bannerUrl: 'https://picsum.photos/seed/xego-promo2/800/400', discountType: 'FIXED', discountValue: 50000, maxDiscount: null,
    minOrderValue: 400000, companyId: null, routeId: 1, startsAt: fmt(TODAY.subtract(2, 'day')), endsAt: fmt(TODAY.add(20, 'day')),
    usageLimit: 200, usedCount: 87, featured: true, active: true,
  }),
  promo({
    id: 3, code: 'KINGBUS15', title: 'KINGBUS giảm 15%', description: 'Mọi tuyến của nhà xe KINGBUS, giảm tối đa 80.000đ.',
    bannerUrl: 'https://picsum.photos/seed/xego-promo3/800/400', discountType: 'PERCENT', discountValue: 15, maxDiscount: 80000,
    minOrderValue: 0, companyId: 3, routeId: null, startsAt: fmt(TODAY.subtract(1, 'day')), endsAt: fmt(TODAY.add(14, 'day')),
    usageLimit: null, usedCount: 45, featured: true, active: true,
  }),
  promo({
    id: 4, code: 'SINHVIEN', title: 'Ưu đãi sinh viên 30K', description: 'Giảm 30.000đ cho đơn từ 150.000đ.',
    bannerUrl: 'https://picsum.photos/seed/xego-promo4/800/400', discountType: 'FIXED', discountValue: 30000, maxDiscount: null,
    minOrderValue: 150000, companyId: null, routeId: null, startsAt: fmt(TODAY.subtract(10, 'day')), endsAt: fmt(TODAY.add(60, 'day')),
    usageLimit: 500, usedCount: 498, featured: false, active: true,
  }),
  promo({
    id: 5, code: 'TET2026', title: 'Chào Tết 2026', description: 'Chương trình đã kết thúc.',
    bannerUrl: 'https://picsum.photos/seed/xego-promo5/800/400', discountType: 'PERCENT', discountValue: 20, maxDiscount: 100000,
    minOrderValue: 300000, companyId: null, routeId: null, startsAt: fmt(TODAY.subtract(90, 'day')), endsAt: fmt(TODAY.subtract(30, 'day')),
    usageLimit: 300, usedCount: 300, featured: false, active: false,
  }),
];

// ---------- Nội dung nhà xe ----------
const AMENITIES = [
  { id: 1, code: 'WIFI', name: 'Wi-Fi', icon: 'wifi' },
  { id: 2, code: 'WATER', name: 'Nước uống', icon: 'cup-soda' },
  { id: 3, code: 'BLANKET', name: 'Chăn đắp', icon: 'bed' },
  { id: 4, code: 'CHARGER', name: 'Sạc điện thoại', icon: 'plug-zap' },
  { id: 5, code: 'CURTAIN', name: 'Rèm cửa', icon: 'panel-left' },
  { id: 6, code: 'AIR_CONDITIONER', name: 'Điều hoà', icon: 'snowflake' },
  { id: 7, code: 'TOILET', name: 'Nhà vệ sinh', icon: 'bath' },
  { id: 8, code: 'SNACK', name: 'Đồ ăn nhẹ', icon: 'cookie' },
];
export const amenities = AMENITIES;
export const profiles = new Map<number, Omit<CompanyProfileResponse, 'company' | 'rating'>>();
companies.forEach((c) => {
  const r = mulberry32(c.id * 131);
  profiles.set(c.id, {
    images: [1, 2, 3, 4].map((n) => ({
      id: c.id * 10 + n,
      imageUrl: `https://picsum.photos/seed/xego-bus-${c.id}-${n}/800/520`,
      caption: ['Ngoại thất xe', 'Khoang ghế', 'Không gian bên trong', 'Văn phòng nhà xe'][n - 1],
      sortOrder: n,
    })),
    amenities: AMENITIES.filter(() => r() > 0.35),
    policies: [
      { id: c.id * 10 + 1, policyType: 'CANCELLATION', title: 'Huỷ vé', content: 'Huỷ trước giờ khởi hành theo bảng hoàn tiền bên dưới. Liên hệ hotline nhà xe để được hỗ trợ.' },
      { id: c.id * 10 + 2, policyType: 'LUGGAGE', title: 'Hành lý', content: 'Mỗi khách mang tối đa 20kg hành lý ký gửi và 7kg xách tay. Không vận chuyển hàng dễ cháy nổ.' },
      { id: c.id * 10 + 3, policyType: 'CHILDREN', title: 'Trẻ em', content: 'Trẻ dưới 5 tuổi hoặc dưới 1m đi cùng người lớn được miễn vé nếu ngồi chung ghế.' },
      { id: c.id * 10 + 4, policyType: 'DOCUMENT', title: 'Giấy tờ', content: 'Xuất trình mã vé (QR) và CCCD khi lên xe. Có mặt tại điểm đón trước 15 phút.' },
    ],
    cancellationRules: [
      { hoursBefore: 24, refundPercent: 90 },
      { hoursBefore: 12, refundPercent: 50 },
      { hoursBefore: 0, refundPercent: 0 },
    ],
  });
});

// ---------- Đơn hàng ----------
export const bookings: BookingResponse[] = [];
let bookingSeq = 1;
let paymentSeq = 1;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newBookingCode = (r = Math.random) =>
  Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(r() * CODE_CHARS.length)]).join('');

export function createBookingRecord(params: {
  trip: TripResponse;
  seats: TripSeatResponse[];
  userId: number | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: BookingResponse['status'];
  createdAt: dayjs.Dayjs;
  pickupPointId?: number | null;
  dropoffPointId?: number | null;
  promotionCode?: string | null;
  discount?: number;
  r?: () => number;
}): BookingResponse {
  const { trip, seats, status, createdAt } = params;
  const subtotal = seats.reduce((sum, s) => sum + s.totalPrice, 0);
  const discount = params.discount ?? 0;
  const tripStops = stopPoints.filter((s) => s.tripId === trip.id);
  const pickup =
    tripStops.find((s) => s.id === params.pickupPointId) ?? tripStops.find((s) => s.pointType === 'PICKUP') ?? null;
  const dropoff =
    tripStops.find((s) => s.id === params.dropoffPointId) ?? tripStops.find((s) => s.pointType === 'DROPOFF') ?? null;
  const paid = status === 'PAID' || status === 'COMPLETED';
  const booking: BookingResponse = {
    id: bookingSeq++,
    bookingCode: newBookingCode(params.r),
    userId: params.userId,
    guest: params.userId == null,
    trip: {
      id: trip.id,
      routeName: trip.routeName,
      originName: trip.originName,
      destinationName: trip.destinationName,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      companyId: trip.companyId,
      companyName: trip.companyName,
      busType: trip.busType,
      basePrice: trip.basePrice,
      status: trip.status,
    },
    pickupPoint: pickup,
    dropoffPoint: dropoff,
    contactName: params.contactName,
    contactPhone: params.contactPhone,
    contactEmail: params.contactEmail,
    subtotalPrice: subtotal,
    discountAmount: discount,
    promotionCode: params.promotionCode ?? null,
    totalPrice: subtotal - discount,
    status,
    createdAt: fmt(createdAt),
    expiresAt: fmt(createdAt.add(10, 'minute')),
    holdSecondsRemaining: null,
    seats: seats.map((s) => ({ seatId: s.id, seatName: s.seatName, floor: s.floor, seatType: s.seatType, price: s.totalPrice })),
    payment: paid
      ? {
          id: paymentSeq++,
          gateway: 'STRIPE',
          transactionNo: `pi_${Math.floor((params.r ?? Math.random)() * 1e12).toString(36)}`,
          amount: subtotal - discount,
          bankCode: null,
          responseCode: '00',
          status: 'SUCCESS',
          createdAt: fmt(createdAt.add(3, 'minute')),
        }
      : null,
    reviewed: false,
    cancelReason: null,
  };
  bookings.push(booking);
  return booking;
}

// Đơn của các khách khác: lấy từ ghế BOOKED của chuyến trong 30 ngày qua tới 7 ngày tới (cho dashboard, admin).
{
  const r = mulberry32(99);
  const window = trips.filter((t) => {
    const d = dayjs(t.departureTime).diff(TODAY, 'day');
    return d >= -10 && d <= 7 && t.status !== 'CANCELLED';
  });
  for (const trip of window) {
    const booked = seatsOf(trip.id).filter((s) => s.status === 'BOOKED');
    // Gom 1-3 ghế liền nhau thành một đơn; chỉ lấy một phần để danh sách admin không quá dài.
    for (let i = 0; i < booked.length; ) {
      const n = Math.min(booked.length - i, 1 + Math.floor(r() * 3));
      if (r() < 0.25) {
        const customer = users[2 + Math.floor(r() * (users.length - 2))];
        const guest = r() < 0.3;
        const daysBefore = 1 + Math.floor(r() * 12);
        createBookingRecord({
          trip,
          seats: booked.slice(i, i + n),
          userId: guest ? null : customer.id,
          contactName: customer.fullName,
          contactPhone: customer.phone!,
          contactEmail: customer.email,
          status: trip.status === 'COMPLETED' ? 'COMPLETED' : 'PAID',
          createdAt: dayjs(trip.departureTime).subtract(daysBefore, 'day').hour(8 + Math.floor(r() * 12)),
          r,
        });
      }
      i += n;
    }
  }
  // Vài đơn huỷ / hết hạn
  for (let k = 0; k < 25; k++) {
    const trip = pick(window, r);
    const seat = seatsOf(trip.id).find((s) => s.status === 'AVAILABLE');
    if (!seat) continue;
    const customer = users[2 + Math.floor(r() * (users.length - 2))];
    const b = createBookingRecord({
      trip, seats: [seat], userId: customer.id, contactName: customer.fullName, contactPhone: customer.phone!,
      contactEmail: customer.email, status: r() < 0.5 ? 'CANCELLED' : 'EXPIRED',
      createdAt: dayjs(trip.departureTime).subtract(2, 'day'), r,
    });
    if (b.status === 'CANCELLED') b.cancelReason = 'Khách huỷ';
  }
}

// Đơn của tài khoản demo user@xego.vn (id 2): đủ các tab Hiện tại / Đã đi / Đã huỷ.
{
  const me = users[1];
  const r = mulberry32(7);
  const findTrip = (routeId: number, dayOffset: number) =>
    trips.find((t) => t.routeId === routeId && dayjs(t.departureTime).diff(TODAY, 'day') === dayOffset && t.status !== 'CANCELLED')!;
  const takeSeats = (trip: TripResponse, n: number) => {
    const free = seatsOf(trip.id).filter((s) => s.status === 'AVAILABLE').slice(0, n);
    free.forEach((s) => (s.status = 'BOOKED'));
    return free;
  };
  const mine = (trip: TripResponse, n: number, status: BookingResponse['status'], createdAt: dayjs.Dayjs) =>
    createBookingRecord({
      trip, seats: takeSeats(trip, n), userId: me.id, contactName: me.fullName, contactPhone: me.phone!,
      contactEmail: me.email, status, createdAt, r,
    });

  mine(findTrip(1, 3), 2, 'PAID', dayjs().subtract(1, 'day'));
  mine(findTrip(13, 6), 1, 'PAID', dayjs().subtract(2, 'hour'));
  const done1 = mine(findTrip(3, -7), 2, 'COMPLETED', TODAY.subtract(9, 'day'));
  mine(findTrip(12, -4), 1, 'COMPLETED', TODAY.subtract(6, 'day'));
  done1.reviewed = true;
  const c = mine(findTrip(4, 2), 1, 'CANCELLED', dayjs().subtract(3, 'day'));
  c.cancelReason = 'Khách huỷ';
  // Đơn hết hạn: ghế trả lại
  const exp = mine(findTrip(11, 5), 1, 'EXPIRED', dayjs().subtract(1, 'day'));
  exp.seats.forEach((s) => (seatsOf(exp.trip.id).find((x) => x.id === s.seatId)!.status = 'AVAILABLE'));
}
users.forEach((u) => (u.bookingCount = bookings.filter((b) => b.userId === u.id).length));

// ---------- Đánh giá ----------
const COMMENTS: [number, string][] = [
  [5, 'Xe sạch sẽ, tài xế lái êm, đến nơi đúng giờ. Sẽ ủng hộ tiếp.'],
  [5, 'Ghế rộng, có chăn và nước. Nhân viên nhiệt tình.'],
  [4, 'Xe ổn, wifi hơi yếu nhưng chấp nhận được.'],
  [4, 'Đón đúng giờ, xe mới. Trừ 1 sao vì dừng nghỉ hơi lâu.'],
  [5, 'Rất hài lòng, giá hợp lý so với chất lượng.'],
  [3, 'Xe chạy trễ 30 phút so với lịch, còn lại ổn.'],
  [4, 'Phòng cabin riêng tư, ngủ ngon cả đêm.'],
  [2, 'Điều hoà lạnh quá, nhắc nhiều lần không chỉnh.'],
  [5, 'Tài xế thân thiện, hỗ trợ mang hành lý.'],
  [1, 'Xe đến điểm đón muộn gần 1 tiếng, không báo trước.'],
  [4, 'Đặt vé nhanh, lên xe chỉ cần quét mã.'],
  [5, 'Chuyến đi tuyệt vời, view đẹp, xe êm.'],
];
export const reviews: ReviewResponse[] = [];
{
  const r = mulberry32(555);
  let reviewSeq = 1;
  for (const b of bookings.filter((x) => x.status === 'COMPLETED' && x.userId != null)) {
    const isDemoUser = b.userId === 2;
    if (!isDemoUser && r() > 0.55) continue;
    if (isDemoUser && !b.reviewed) continue;
    const [rating, comment] = pick(COMMENTS, r);
    const author = users.find((u) => u.id === b.userId)!;
    reviews.push({
      id: reviewSeq++,
      tripId: b.trip.id,
      userId: author.id,
      userDisplayName: author.fullName,
      rating,
      comment,
      createdAt: fmt(dayjs(b.trip.arrivalTime).add(1 + Math.floor(r() * 30), 'hour')),
      mine: false,
      bookingId: b.id,
      companyId: b.trip.companyId,
      companyName: b.trip.companyName,
      routeName: b.trip.routeName,
      hidden: rating === 1 && r() > 0.5,
    });
    b.reviewed = true;
  }
}

export const sequences = {
  nextBooking: () => bookingSeq++,
  nextPayment: () => paymentSeq++,
  nextTrip: () => tripSeq++,
  nextStop: () => stopSeq++,
  nextSeat: () => seatSeq++,
};

export { addTrip, fmt, slugify, TODAY, SEAT_COUNT };
