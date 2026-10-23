import { Check, Timer } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useCountdown } from '../../hooks';
import { formatCountdown } from '../../utils/format';
import { Logo } from '../../layouts/CustomerLayout';

export const STEPS = ['Chọn chỗ', 'Điểm đón/trả', 'Thông tin', 'Thanh toán'];

export function BookingStepper({ current }: { current: number }) {
  return (
    <ol className="m-0 flex list-none items-center gap-2 overflow-x-auto p-0 text-sm">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={s} className="flex shrink-0 items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                done ? 'bg-success text-white' : active ? 'bg-primary text-white' : 'bg-line text-muted'
              }`}
            >
              {done ? <Check size={14} /> : n}
            </span>
            <span className={active ? 'font-semibold' : 'text-muted'}>{s}</span>
            {n < STEPS.length && <span className="mx-1 h-px w-6 bg-line md:w-12" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Đồng hồ giữ chỗ: tính từ expiresAt server, < 2 phút chuyển đỏ. */
export function HoldTimer({ expiresAt }: { expiresAt: string | null }) {
  const left = useCountdown(expiresAt);
  if (!expiresAt) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${left < 120 ? 'bg-danger text-white' : 'bg-white/15 text-white'}`}
      aria-live="polite"
    >
      <Timer size={16} /> {formatCountdown(left)}
    </span>
  );
}

/** Header tối giản cho luồng đặt vé — không có menu để khách không lạc khỏi luồng. */
export function BookingLayout() {
  return (
    <div className="min-h-screen">
      <header className="no-print bg-primary text-white">
        <div className="container-x flex h-14 items-center justify-between">
          <Logo />
          <Link to="/" className="text-sm text-white/85">
            Về trang chủ
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
