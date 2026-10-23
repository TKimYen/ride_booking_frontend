import dayjs from 'dayjs';
import { ArrowLeftRight, Clock, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocations } from '../../api/catalog.api';
import { useAsync, useDebounce } from '../../hooks';
import { loadRecentSearches, pushRecentSearch } from '../../stores/bookingStore';
import type { LocationResponse } from '../../types';
import { normalizeVN } from '../../utils/format';
import { toast } from '../common';
import LunarDatePicker from './LunarDatePicker';

function LocationPicker({
  label,
  value,
  onChange,
  compact,
}: {
  label: string;
  value: LocationResponse | null;
  onChange: (l: LocationResponse) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword);
  const { data } = useAsync(() => getLocations(debounced), [debounced]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const recentIds = [...new Set(loadRecentSearches().flatMap((r) => [r.originId, r.destinationId]))];
  const recent = !keyword && data ? data.filter((l) => recentIds.includes(l.id)).slice(0, 4) : [];

  return (
    <div className="relative min-w-0 flex-1" ref={ref}>
      <div
        className={`flex items-center gap-2 rounded-input border border-solid border-line bg-white px-3 ${compact ? 'h-10' : 'h-14'}`}
        onClick={() => setOpen(true)}
      >
        <MapPin size={18} className="shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          {!compact && <div className="text-xs text-muted">{label}</div>}
          <input
            className="w-full border-0 bg-transparent p-0 text-sm font-semibold outline-none"
            placeholder={compact ? label : 'Chọn địa điểm'}
            value={open ? keyword : (value?.name ?? '')}
            onFocus={() => {
              setOpen(true);
              setKeyword('');
            }}
            onChange={(e) => setKeyword(e.target.value)}
            aria-label={label}
          />
        </div>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 min-w-[240px] overflow-auto rounded-card bg-white py-2 shadow-xl">
          {recent.length > 0 && (
            <>
              <div className="px-4 py-1 text-xs font-semibold text-muted">Gần đây</div>
              {recent.map((l) => (
                <LocationOption key={`r${l.id}`} l={l} recent onPick={() => (onChange(l), setOpen(false))} />
              ))}
              <div className="px-4 py-1 text-xs font-semibold text-muted">Tất cả địa điểm</div>
            </>
          )}
          {data?.map((l) => <LocationOption key={l.id} l={l} onPick={() => (onChange(l), setOpen(false))} />)}
          {data?.length === 0 && <div className="px-4 py-3 text-sm text-muted">Không tìm thấy “{keyword}”</div>}
        </div>
      )}
    </div>
  );
}

function LocationOption({ l, onPick, recent }: { l: LocationResponse; onPick: () => void; recent?: boolean }) {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-2 text-left text-sm hover:bg-bg"
      onClick={onPick}
    >
      {recent ? <Clock size={14} className="text-muted" /> : <MapPin size={14} className="text-muted" />}
      {l.name}
    </button>
  );
}

/**
 * Form tìm chuyến: dùng ở hero Trang chủ (to) và đầu trang kết quả (compact).
 * Điều hướng tới URL thân thiện /xe-khach/{slugĐi}-di-{slugĐến}?date=YYYY-MM-DD.
 */
export default function SearchForm({
  initialOrigin = null,
  initialDestination = null,
  initialDate,
  compact = false,
}: {
  initialOrigin?: LocationResponse | null;
  initialDestination?: LocationResponse | null;
  initialDate?: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<LocationResponse | null>(initialOrigin);
  const [destination, setDestination] = useState<LocationResponse | null>(initialDestination);
  const [date, setDate] = useState(initialDate ?? dayjs().format('YYYY-MM-DD'));

  useEffect(() => {
    setOrigin(initialOrigin);
  }, [initialOrigin]);
  useEffect(() => {
    setDestination(initialDestination);
  }, [initialDestination]);
  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  const submit = () => {
    if (!origin || !destination) return toast.error('Vui lòng chọn nơi xuất phát và nơi đến');
    if (normalizeVN(origin.name) === normalizeVN(destination.name))
      return toast.error('Nơi xuất phát và nơi đến phải khác nhau');
    pushRecentSearch({
      originId: origin.id,
      originName: origin.name,
      originSlug: origin.slug,
      destinationId: destination.id,
      destinationName: destination.name,
      destinationSlug: destination.slug,
      date,
    });
    navigate(`/xe-khach/${origin.slug}-di-${destination.slug}?date=${date}`);
  };

  return (
    <form
      className={`flex flex-col gap-2 ${compact ? 'md:flex-row' : 'lg:flex-row'} md:items-stretch`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="relative flex flex-1 flex-col gap-2 sm:flex-row">
        <LocationPicker label="Nơi xuất phát" value={origin} onChange={setOrigin} compact={compact} />
        <button
          type="button"
          className="absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-solid border-line bg-white text-primary shadow"
          onClick={() => {
            setOrigin(destination);
            setDestination(origin);
          }}
          aria-label="Đổi chiều"
        >
          <ArrowLeftRight size={14} />
        </button>
        <LocationPicker label="Nơi đến" value={destination} onChange={setDestination} compact={compact} />
      </div>
      <div className={compact ? 'md:w-64' : 'lg:w-72'}>
        <LunarDatePicker value={date} onChange={setDate} compact={compact} />
      </div>
      <button type="submit" className={`btn-cta ${compact ? 'h-10' : 'h-14 text-base'} px-8`}>
        Tìm kiếm
      </button>
    </form>
  );
}
