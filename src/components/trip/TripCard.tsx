import { Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TripSearchItemResponse } from '../../types';
import { durationBetween, formatTime, formatVND } from '../../utils/format';
import { CompanyLogo } from '../common';
import TripDetailTabs, { DETAIL_TABS, type DetailTab } from './TripDetailTabs';

/** Thẻ một chuyến ở trang kết quả. Bấm tab để xổ panel chi tiết ngay trong thẻ (giống Vexere). */
export default function TripCard({ item }: { item: TripSearchItemResponse }) {
  const { trip, availableSeats } = item;
  const [tab, setTab] = useState<DetailTab | null>(null);
  const soldOut = availableSeats === 0;

  return (
    <article className={`card overflow-hidden ${soldOut ? 'opacity-70' : ''}`}>
      <div className="flex flex-col gap-4 p-4 md:flex-row">
        <CompanyLogo name={trip.companyName} id={trip.companyId} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="m-0 text-base font-semibold">{trip.companyName}</h3>
            {item.rating != null && (
              <span className="inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-white">
                <Star size={11} className="fill-white" /> {item.rating}
                <span className="font-normal opacity-80">({item.ratingCount})</span>
              </span>
            )}
          </div>
          <div className="text-sm text-muted">{trip.busTypeName}</div>

          <div className="mt-3 flex items-center gap-3">
            <div>
              <div className="text-xl font-bold">{formatTime(trip.departureTime)}</div>
              <div className="max-w-[140px] truncate text-xs text-muted">{item.pickupPreview}</div>
            </div>
            <div className="flex flex-1 flex-col items-center text-xs text-muted">
              {durationBetween(trip.departureTime, trip.arrivalTime)}
              <div className="relative my-1 h-px w-full bg-line">
                <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full border-2 border-solid border-primary bg-white" />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">{formatTime(trip.arrivalTime)}</div>
              <div className="max-w-[140px] truncate text-xs text-muted">{item.dropoffPreview}</div>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 md:w-44 md:flex-col md:items-end">
          <div className="md:text-right">
            <div className="text-xs text-muted">Từ</div>
            <div className="text-xl font-bold text-primary">{formatVND(trip.basePrice)}</div>
            <div className={`text-xs ${availableSeats <= 5 ? 'font-semibold text-danger' : 'text-muted'}`}>
              {soldOut ? 'Hết chỗ' : `Còn ${availableSeats} chỗ trống`}
            </div>
          </div>
          {soldOut ? (
            <button className="btn-ghost" disabled>
              Hết chỗ
            </button>
          ) : (
            <Link to={`/dat-ve/${trip.id}`} className="btn-cta">
              Chọn chuyến
            </Link>
          )}
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-0 border-t border-solid border-line px-2">
        {DETAIL_TABS.map((t) => (
          <button
            key={t.key}
            className={`shrink-0 cursor-pointer border-0 bg-transparent px-3 py-2 text-xs ${tab === t.key ? 'font-semibold text-primary' : 'text-muted hover:text-primary'}`}
            onClick={() => setTab(tab === t.key ? null : t.key)}
            aria-expanded={tab === t.key}
          >
            {t.label}
          </button>
        ))}
        <Link to={`/chuyen/${trip.id}`} className="ml-auto shrink-0 px-3 py-2 text-xs text-primary">
          Xem trang chi tiết
        </Link>
      </div>
      {tab && (
        <div className="border-0 border-t border-solid border-line bg-white px-4 pb-4">
          <TripDetailTabs trip={trip} tab={tab} onTab={setTab} />
        </div>
      )}
    </article>
  );
}
