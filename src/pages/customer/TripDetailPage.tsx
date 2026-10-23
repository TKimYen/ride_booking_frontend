import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTrip } from '../../api/trips.api';
import { CompanyLogo, ErrorBox, Skeleton, Stars } from '../../components/common';
import TripDetailTabs, { type DetailTab } from '../../components/trip/TripDetailTabs';
import { useAsync, useDocumentTitle } from '../../hooks';
import { durationBetween, formatDate, formatTime, formatVND } from '../../utils/format';

/** /chuyen/:tripId — cùng panel với thẻ kết quả, mở được bằng link trực tiếp. */
export default function TripDetailPage() {
  const tripId = Number(useParams().tripId);
  const { data, loading, error, reload } = useAsync(() => getTrip(tripId), [tripId]);
  const [tab, setTab] = useState<DetailTab>('stops');
  useDocumentTitle(data ? `${data.trip.routeName} ${formatTime(data.trip.departureTime)} – ${data.trip.companyName}` : 'Chi tiết chuyến');

  if (loading) return <div className="container-x py-6"><Skeleton className="h-64" /></div>;
  if (error) return <div className="container-x py-6"><ErrorBox message={error} onRetry={reload} /></div>;
  const { trip, availableSeats } = data!;
  const bookable = trip.status === 'ACTIVE' && availableSeats > 0;

  return (
    <div className="container-x space-y-4 py-6">
      <div className="card flex flex-col gap-4 p-5 md:flex-row md:items-center">
        <CompanyLogo name={trip.companyName} id={trip.companyId} size={64} />
        <div className="flex-1">
          <h1 className="m-0 text-xl font-bold">{trip.routeName}</h1>
          <div className="text-sm text-muted">
            {trip.companyName} · {trip.busTypeName}
            {data!.rating != null && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Stars value={data!.rating} size={12} /> {data!.rating} ({data!.ratingCount})
              </span>
            )}
          </div>
          <div className="mt-2 text-sm">
            {formatDate(trip.departureTime)} · <b>{formatTime(trip.departureTime)}</b> → <b>{formatTime(trip.arrivalTime)}</b> (
            {durationBetween(trip.departureTime, trip.arrivalTime)})
          </div>
        </div>
        <div className="md:text-right">
          <div className="text-2xl font-bold text-primary">{formatVND(trip.basePrice)}</div>
          <div className="mb-2 text-sm text-muted">
            {trip.status === 'CANCELLED' ? 'Chuyến đã bị huỷ' : trip.status === 'COMPLETED' ? 'Chuyến đã chạy' : `Còn ${availableSeats} chỗ`}
          </div>
          {bookable ? (
            <Link to={`/dat-ve/${trip.id}`} className="btn-cta">
              Chọn chuyến
            </Link>
          ) : (
            <button className="btn-ghost" disabled>
              Không thể đặt
            </button>
          )}
        </div>
      </div>
      <div className="card p-5">
        <TripDetailTabs trip={trip} tab={tab} onTab={setTab} />
      </div>
    </div>
  );
}
