import { CircleDot } from 'lucide-react';
import { useState } from 'react';
import type { BusType, TripSeatResponse } from '../../types';
import { formatVND } from '../../utils/format';
import { buildSeatGrid, seatLabel } from '../../utils/seatLayout';

export function SeatLegend() {
  const item = (cls: string, text: string) => (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className={`inline-block h-4 w-4 rounded ${cls}`} /> {text}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-4">
      {item('border-2 border-solid border-success bg-white', 'Còn trống')}
      {item('bg-primary', 'Đang chọn')}
      {item('bg-[#E0E0E0]', 'Đã bán / đang giữ')}
      {item('border-2 border-solid border-amber-400 bg-white', 'Ghế đôi (phụ thu)')}
    </div>
  );
}

/**
 * Sơ đồ ghế theo loại xe. Ghế là <button aria-pressed> để dùng được bằng bàn phím.
 * `readOnly` cho trang admin (hiện tên hành khách khi hover qua `ownerOf`).
 */
export default function SeatMap({
  busType,
  seats,
  selected,
  onToggle,
  readOnly = false,
  ownerOf,
}: {
  busType: BusType;
  seats: TripSeatResponse[];
  selected: number[];
  onToggle?: (seat: TripSeatResponse) => void;
  readOnly?: boolean;
  ownerOf?: (seatId: number) => string | undefined;
}) {
  const grid = buildSeatGrid(busType, seats);
  const [floor, setFloor] = useState(1);
  const twoFloors = grid.length > 1;

  const renderFloor = (f: (typeof grid)[number]) => (
    <div key={f.floor} className="inline-block rounded-2xl border-2 border-solid border-line bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>{twoFloors ? (f.floor === 1 ? 'Tầng dưới' : 'Tầng trên') : 'Sơ đồ ghế'}</span>
        {f.floor === 1 && (
          <span className="inline-flex items-center gap-1">
            <CircleDot size={16} /> Tài xế
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {f.rows.map((row, ri) => (
          <div key={ri} className={`flex gap-2 ${row.length === 1 ? 'justify-center' : ''}`}>
            {row.map((cell, ci) => {
              if (cell.aisle) return <div key={ci} className="w-6" />;
              if (!cell.seat) return <div key={ci} className="h-11 w-12" />;
              const seat = cell.seat;
              const isSelected = selected.includes(seat.id);
              const taken = seat.status !== 'AVAILABLE';
              const isDouble = seat.seatType === 'DOUBLE';
              const owner = ownerOf?.(seat.id);
              return (
                <button
                  key={ci}
                  type="button"
                  disabled={readOnly ? false : taken}
                  aria-pressed={isSelected}
                  aria-label={`Ghế ${seat.seatName}, ${formatVND(seat.totalPrice)}${taken ? ', đã có người' : ''}`}
                  title={`${seat.seatName} · ${formatVND(seat.totalPrice)}${owner ? ` · ${owner}` : ''}`}
                  onClick={() => !readOnly && onToggle?.(seat)}
                  className={`relative flex h-11 w-12 flex-col items-center justify-center rounded-lg border-2 border-solid text-xs font-semibold transition ${
                    readOnly ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'border-primary bg-primary text-white'
                      : taken
                        ? `border-[#E0E0E0] bg-[#E0E0E0] text-muted ${readOnly ? '' : 'cursor-not-allowed'}`
                        : isDouble
                          ? 'border-amber-400 bg-white text-ink hover:bg-amber-50'
                          : 'border-success bg-white text-ink hover:bg-green-50'
                  }`}
                >
                  {seatLabel(seat.seatName, busType)}
                  {seat.status === 'HOLDING' && <span className="text-[9px] font-normal">giữ</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {twoFloors && (
        <div className="mb-3 flex gap-2 md:hidden">
          {grid.map((f) => (
            <button key={f.floor} className={floor === f.floor ? 'chip-active' : 'chip'} onClick={() => setFloor(f.floor)}>
              {f.floor === 1 ? 'Tầng dưới' : 'Tầng trên'}
            </button>
          ))}
        </div>
      )}
      {/* Mobile: một tầng mỗi lần; desktop: hai tầng cạnh nhau */}
      <div className="md:hidden">{grid.filter((f) => f.floor === floor).map(renderFloor)}</div>
      <div className="hidden flex-wrap gap-6 md:flex">{grid.map(renderFloor)}</div>
    </div>
  );
}
