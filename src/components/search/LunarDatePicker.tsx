import dayjs from 'dayjs';
import { Solar } from 'lunar-javascript';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../../utils/format';

/** Ngày âm của một ngày dương. Thư viện tính theo lịch Trung Hoa (UTC+8), rất hiếm khi lệch lịch Việt 1 ngày. */
function lunarOf(d: dayjs.Dayjs) {
  const lunar = Solar.fromYmd(d.year(), d.month() + 1, d.date()).getLunar();
  return { day: lunar.getDay() as number, month: Math.abs(lunar.getMonth() as number) };
}

const SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': 'Tết Dương lịch',
  '04-30': 'Giải phóng miền Nam',
  '05-01': 'Quốc tế Lao động',
  '09-02': 'Quốc khánh',
};
const LUNAR_HOLIDAYS: Record<string, string> = {
  '1-1': 'Tết Nguyên đán',
  '1-2': 'Tết Nguyên đán',
  '1-3': 'Tết Nguyên đán',
  '3-10': 'Giỗ Tổ Hùng Vương',
  '8-15': 'Tết Trung thu',
};

const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Ô chọn ngày đi: không cho chọn ngày quá khứ; công tắc "Hiện lịch âm" hiện ngày âm dưới mỗi ô,
 * tô đỏ mùng 1 / rằm và ngày lễ (HUONG_DAN_FRONTEND B7.1).
 */
export default function LunarDatePicker({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (date: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showLunar, setShowLunar] = useState(true);
  const [month, setMonth] = useState(dayjs(value).startOf('month'));
  const ref = useRef<HTMLDivElement>(null);
  const today = dayjs().startOf('day');

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    setMonth(dayjs(value).startOf('month'));
  }, [value]);

  const first = month.startOf('month');
  const offset = (first.day() + 6) % 7; // T2 là cột đầu
  const days = Array.from({ length: offset + first.daysInMonth() }, (_, i) =>
    i < offset ? null : first.add(i - offset, 'day'),
  );
  const selectedLunar = lunarOf(dayjs(value));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`flex w-full cursor-pointer items-center gap-2 rounded-input border border-solid border-line bg-white px-3 text-left ${compact ? 'h-10' : 'h-14'}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
      >
        <Calendar size={18} className="shrink-0 text-primary" />
        <span className="min-w-0">
          {!compact && <span className="block text-xs text-muted">Ngày đi</span>}
          <span className="block truncate text-sm font-semibold">
            {formatDate(value)}
            {showLunar && (
              <span className="ml-1 font-normal text-muted">
                ({selectedLunar.day}/{selectedLunar.month} ÂL)
              </span>
            )}
          </span>
        </span>
      </button>
      {open && (
        <div role="dialog" className="absolute left-0 top-full z-40 mt-2 w-[320px] rounded-card bg-white p-3 shadow-xl sm:w-[360px]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="cursor-pointer rounded border-0 bg-transparent p-1 disabled:opacity-30"
              disabled={!month.isAfter(today.startOf('month'))}
              onClick={() => setMonth(month.subtract(1, 'month'))}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="font-semibold">Tháng {month.format('MM/YYYY')}</div>
            <button
              type="button"
              className="cursor-pointer rounded border-0 bg-transparent p-1"
              onClick={() => setMonth(month.add(1, 'month'))}
              aria-label="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-muted">
            {WEEK.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const past = d.isBefore(today);
              const selected = d.format('YYYY-MM-DD') === value;
              const lunar = lunarOf(d);
              const holiday = SOLAR_HOLIDAYS[d.format('MM-DD')] ?? LUNAR_HOLIDAYS[`${lunar.month}-${lunar.day}`];
              const redLunar = lunar.day === 1 || lunar.day === 15;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={past}
                  title={holiday}
                  onClick={() => {
                    onChange(d.format('YYYY-MM-DD'));
                    setOpen(false);
                  }}
                  className={`flex h-11 cursor-pointer flex-col items-center justify-center rounded border-0 text-sm disabled:cursor-not-allowed disabled:opacity-30 ${
                    selected ? 'bg-primary text-white' : 'bg-transparent hover:bg-primary-light'
                  } ${holiday && !selected ? 'text-danger' : ''}`}
                >
                  <span className="font-medium leading-none">{d.date()}</span>
                  {showLunar && (
                    <span
                      className={`mt-0.5 text-[10px] leading-none ${selected ? 'text-white/80' : redLunar ? 'text-danger' : 'text-muted'}`}
                    >
                      {lunar.day === 1 ? `${lunar.day}/${lunar.month}` : lunar.day}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={showLunar} onChange={(e) => setShowLunar(e.target.checked)} />
            Hiện lịch âm
          </label>
        </div>
      )}
    </div>
  );
}
