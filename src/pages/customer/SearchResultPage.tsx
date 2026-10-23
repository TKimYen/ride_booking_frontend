import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getCompanies } from '../../api/catalog.api';
import { getStopPointOptions, searchTrips, type TripSort } from '../../api/trips.api';
import { Empty, ErrorBox, Skeleton } from '../../components/common';
import SearchForm from '../../components/search/SearchForm';
import TripCard from '../../components/trip/TripCard';
import { useAsync, useDocumentTitle } from '../../hooks';
import { locations } from '../../mock/db';
import type { BusType, TripSearchItemResponse } from '../../types';
import { BUS_TYPE_NAME, formatShortDate } from '../../utils/format';

const TIME_SLOTS = [
  { key: '0', label: '00:00 - 06:00', from: '00:00', to: '05:59' },
  { key: '1', label: '06:00 - 12:00', from: '06:00', to: '11:59' },
  { key: '2', label: '12:00 - 18:00', from: '12:00', to: '17:59' },
  { key: '3', label: '18:00 - 24:00', from: '18:00', to: '23:59' },
];
const SORTS: { key: TripSort; label: string }[] = [
  { key: 'departureAsc', label: 'Giờ đi sớm nhất' },
  { key: 'departureDesc', label: 'Giờ đi muộn nhất' },
  { key: 'priceAsc', label: 'Giá thấp nhất' },
  { key: 'priceDesc', label: 'Giá cao nhất' },
];
const PRICE_MAX = 1500000;

/** /xe-khach/:route?date=  — :route dạng "ha-noi-di-sa-pa". Mọi bộ lọc đồng bộ lên query string. */
export default function SearchResultPage() {
  const { route = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const [originSlug, destSlug] = route.split('-di-');
  const origin = locations.find((l) => l.slug === originSlug) ?? null;
  const destination = locations.find((l) => l.slug === destSlug) ?? null;
  const date = params.get('date') ?? dayjs().format('YYYY-MM-DD');
  const list = (k: string) => params.get(k)?.split(',').filter(Boolean) ?? [];
  const slot = params.get('slot') ?? '';
  const companyIds = list('companies').map(Number);
  const busTypes = list('busTypes') as BusType[];
  const pickups = list('pickups');
  const dropoffs = list('dropoffs');
  const maxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined;
  const sort = (params.get('sort') as TripSort) ?? 'departureAsc';
  const [pages, setPages] = useState(1);
  const [sheet, setSheet] = useState(false);

  useDocumentTitle(origin && destination ? `Vé xe ${origin.name} đi ${destination.name} ${formatShortDate(date)}` : 'Tìm chuyến');

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v == null || v === '') next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
    setPages(1);
  };
  const toggle = (k: string, current: string[], value: string) =>
    set(k, (current.includes(value) ? current.filter((x) => x !== value) : [...current, value]).join(','));

  const timeSlot = TIME_SLOTS.find((s) => s.key === slot);
  const query = {
    originId: origin?.id,
    destinationId: destination?.id,
    travelDate: date,
    earliestDeparture: timeSlot?.from,
    latestDeparture: timeSlot?.to,
    companyIds,
    busTypes,
    pickupPoints: pickups,
    dropoffPoints: dropoffs,
    maxPrice,
    sort,
    size: 10 * pages,
  };
  const result = useAsync(() => searchTrips(query), [JSON.stringify(query)]);
  const companies = useAsync(() => getCompanies(), []);
  const stopOptions = useAsync(() => getStopPointOptions(origin?.id, destination?.id, date), [origin?.id, destination?.id, date]);

  // Dải 7 ngày quanh ngày đang chọn, không lùi về quá khứ.
  const days = useMemo(() => {
    const today = dayjs().startOf('day');
    const wanted = dayjs(date).subtract(3, 'day');
    const start = wanted.isBefore(today) ? today : wanted;
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  }, [date]);

  const filterCount = (slot ? 1 : 0) + companyIds.length + busTypes.length + pickups.length + dropoffs.length + (maxPrice ? 1 : 0);

  const filters = (
    <div className="space-y-5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Bộ lọc {filterCount > 0 && `(${filterCount})`}</span>
        {filterCount > 0 && (
          <button
            className="cursor-pointer border-0 bg-transparent text-primary"
            onClick={() => {
              setParams(new URLSearchParams({ date, sort }), { replace: true });
            }}
          >
            Xoá lọc
          </button>
        )}
      </div>
      <FilterGroup title="Giờ đi">
        <div className="grid grid-cols-2 gap-2">
          {TIME_SLOTS.map((s) => (
            <button key={s.key} className={slot === s.key ? 'chip-active justify-center' : 'chip justify-center'} onClick={() => set('slot', slot === s.key ? null : s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Giá vé tối đa">
        <input
          type="range"
          className="w-full"
          min={100000}
          max={PRICE_MAX}
          step={50000}
          value={maxPrice ?? PRICE_MAX}
          onChange={(e) => set('maxPrice', Number(e.target.value) >= PRICE_MAX ? null : e.target.value)}
        />
        <div className="text-muted">{maxPrice ? `Đến ${new Intl.NumberFormat('vi-VN').format(maxPrice)}đ` : 'Không giới hạn'}</div>
      </FilterGroup>
      <FilterGroup title="Nhà xe">
        {companies.data?.map((c) => (
          <Check key={c.id} label={c.name} checked={companyIds.includes(c.id)} onChange={() => toggle('companies', companyIds.map(String), String(c.id))} />
        ))}
      </FilterGroup>
      <FilterGroup title="Loại xe">
        {(Object.keys(BUS_TYPE_NAME) as BusType[]).map((b) => (
          <Check key={b} label={BUS_TYPE_NAME[b]} checked={busTypes.includes(b)} onChange={() => toggle('busTypes', busTypes, b)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Điểm đón">
        {stopOptions.data?.pickups.map((n) => <Check key={n} label={n} checked={pickups.includes(n)} onChange={() => toggle('pickups', pickups, n)} />)}
      </FilterGroup>
      <FilterGroup title="Điểm trả">
        {stopOptions.data?.dropoffs.map((n) => <Check key={n} label={n} checked={dropoffs.includes(n)} onChange={() => toggle('dropoffs', dropoffs, n)} />)}
      </FilterGroup>
    </div>
  );

  return (
    <div className="pb-6">
      <div className="bg-primary pb-4 pt-3">
        <div className="container-x">
          <div className="card p-3">
            <SearchForm compact initialOrigin={origin} initialDestination={destination} initialDate={date} />
          </div>
        </div>
      </div>

      <div className="container-x">
        <div className="card mt-4 flex items-center gap-1 p-1">
          <button className="cursor-pointer rounded border-0 bg-transparent p-2" disabled={!dayjs(date).isAfter(dayjs(), 'day')} onClick={() => set('date', dayjs(date).subtract(1, 'day').format('YYYY-MM-DD'))} aria-label="Ngày trước">
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-1 gap-1 overflow-x-auto">
            {days.map((d) => {
              const key = d.format('YYYY-MM-DD');
              return (
                <button
                  key={key}
                  className={`flex-1 shrink-0 cursor-pointer rounded border-0 px-3 py-2 text-sm ${key === date ? 'bg-primary font-semibold text-white' : 'bg-transparent hover:bg-bg'}`}
                  onClick={() => set('date', key)}
                >
                  {formatShortDate(key)}
                </button>
              );
            })}
          </div>
          <button className="cursor-pointer rounded border-0 bg-transparent p-2" onClick={() => set('date', dayjs(date).add(1, 'day').format('YYYY-MM-DD'))} aria-label="Ngày sau">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="card hidden h-fit p-4 lg:block">{filters}</aside>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h1 className="m-0 mr-auto text-lg font-bold">
                {result.data ? `${result.data.totalElements} chuyến` : 'Đang tìm'} {origin?.name} → {destination?.name}
              </h1>
              <button className="btn-ghost h-9 lg:hidden" onClick={() => setSheet(true)}>
                <SlidersHorizontal size={16} /> Lọc {filterCount > 0 && `(${filterCount})`}
              </button>
              <div className="flex gap-1 overflow-x-auto">
                {SORTS.map((s) => (
                  <button key={s.key} className={sort === s.key ? 'chip-active shrink-0' : 'chip shrink-0'} onClick={() => set('sort', s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {!origin || !destination ? (
              <Empty title="Không nhận ra tuyến đường" hint="Hãy chọn lại nơi xuất phát và nơi đến ở ô tìm kiếm." />
            ) : result.error ? (
              <ErrorBox message={result.error} onRetry={result.reload} />
            ) : result.loading && !result.data ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}</div>
            ) : result.data!.content.length === 0 ? (
              <Empty
                title="Không có chuyến phù hợp"
                hint={filterCount ? 'Thử bỏ bớt bộ lọc.' : 'Thử chọn ngày khác trên dải ngày phía trên.'}
                action={
                  <button className="btn-primary" onClick={() => set('date', dayjs(date).add(1, 'day').format('YYYY-MM-DD'))}>
                    Xem ngày {formatShortDate(dayjs(date).add(1, 'day').toDate())}
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {result.data!.content.map((item: TripSearchItemResponse) => (
                  <TripCard key={item.trip.id} item={item} />
                ))}
                {result.data!.hasNext && (
                  <button className="btn-ghost w-full" onClick={() => setPages(pages + 1)} disabled={result.loading}>
                    {result.loading ? 'Đang tải...' : 'Xem thêm chuyến'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setSheet(false)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex justify-end">
              <button className="cursor-pointer border-0 bg-transparent" onClick={() => setSheet(false)} aria-label="Đóng">
                <X />
              </button>
            </div>
            {filters}
            <button className="btn-primary mt-4 w-full" onClick={() => setSheet(false)}>
              Xem {result.data?.totalElements ?? 0} chuyến
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-medium">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="truncate">{label}</span>
    </label>
  );
}
