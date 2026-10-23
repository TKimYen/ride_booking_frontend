import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface GuestTicket {
  bookingId: number;
  bookingCode: string;
  phone: string;
  guestToken: string;
}

interface BookingState {
  /** Token khách vãng lai theo đơn — gửi trong header X-Guest-Token. */
  guestTickets: Record<number, GuestTicket>;
  saveGuestTicket: (t: GuestTicket) => void;
  removeGuestTicket: (bookingId: number) => void;
}

/** sessionStorage như HUONG_DAN_FRONTEND B6: đóng tab là mất token, khách tra cứu lại bằng mã vé + SĐT. */
export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      guestTickets: {},
      saveGuestTicket: (t) => set((s) => ({ guestTickets: { ...s.guestTickets, [t.bookingId]: t } })),
      removeGuestTicket: (id) =>
        set((s) => {
          const next = { ...s.guestTickets };
          delete next[id];
          return { guestTickets: next };
        }),
    }),
    { name: 'xego-guest-tickets', storage: createJSONStorage(() => sessionStorage) },
  ),
);

/** Các khoá "Tìm kiếm gần đây" ở Trang chủ. */
export interface RecentSearch {
  originId: number;
  originName: string;
  originSlug: string;
  destinationId: number;
  destinationName: string;
  destinationSlug: string;
  date: string;
}
const RECENT_KEY = 'xego-recent-searches';
export function loadRecentSearches(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}
export function pushRecentSearch(s: RecentSearch) {
  try {
    const list = loadRecentSearches().filter(
      (x) => !(x.originId === s.originId && x.destinationId === s.destinationId),
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify([s, ...list].slice(0, 5)));
  } catch {
    /* bỏ qua: trình duyệt chặn localStorage */
  }
}
