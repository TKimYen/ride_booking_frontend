import {
  Bath,
  BedDouble,
  Check,
  Cookie,
  Copy,
  CupSoda,
  PanelLeft,
  PlugZap,
  Snowflake,
  Tag,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { getCompanyProfile } from '../../api/catalog.api';
import { getPromotionsForTrip } from '../../api/promotions.api';
import { getCompanyReviewSummary, listCompanyReviews } from '../../api/reviews.api';
import { getStopPoints } from '../../api/trips.api';
import { useAsync } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import type { PromotionResponse, TripResponse } from '../../types';
import { formatDate, formatTime, formatVND } from '../../utils/format';
import { ErrorBox, Modal, Spinner, Stars, toast } from '../common';

export type DetailTab = 'promo' | 'stops' | 'reviews' | 'policy' | 'images' | 'amenities';
export const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'promo', label: 'Giảm giá' },
  { key: 'stops', label: 'Đón/trả' },
  { key: 'reviews', label: 'Đánh giá' },
  { key: 'policy', label: 'Chính sách' },
  { key: 'images', label: 'Hình ảnh' },
  { key: 'amenities', label: 'Tiện ích' },
];

const AMENITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  'cup-soda': CupSoda,
  bed: BedDouble,
  'plug-zap': PlugZap,
  'panel-left': PanelLeft,
  snowflake: Snowflake,
  bath: Bath,
  cookie: Cookie,
};

export const promoText = (p: PromotionResponse) =>
  p.discountType === 'PERCENT'
    ? `Giảm ${p.discountValue}%${p.maxDiscount ? ` (tối đa ${formatVND(p.maxDiscount)})` : ''}`
    : `Giảm ${formatVND(p.discountValue)}`;

export function PromotionCard({ p }: { p: PromotionResponse }) {
  const copy = () => {
    navigator.clipboard?.writeText(p.code).catch(() => undefined);
    toast.success(`Đã sao chép mã ${p.code}`);
  };
  return (
    <div className="flex items-center gap-3 rounded-card border border-dashed border-primary/40 bg-primary-light/40 p-3">
      <Tag className="shrink-0 text-primary" size={22} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{p.title}</div>
        <div className="text-xs text-muted">
          {promoText(p)}
          {p.minOrderValue > 0 && ` · Đơn từ ${formatVND(p.minOrderValue)}`} · HSD {formatDate(p.endsAt)}
        </div>
      </div>
      <button className="btn-ghost h-8 px-3 text-xs" onClick={copy}>
        <Copy size={14} /> {p.code}
      </button>
    </div>
  );
}

function PromoTab({ tripId }: { tripId: number }) {
  const { data, loading, error, reload } = useAsync(() => getPromotionsForTrip(tripId), [tripId]);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data?.length) return <p className="text-sm text-muted">Chuyến này chưa có mã giảm giá.</p>;
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {data.map((p) => (
        <PromotionCard key={p.id} p={p} />
      ))}
    </div>
  );
}

function StopsTab({ tripId }: { tripId: number }) {
  const { data, loading, error, reload } = useAsync(() => getStopPoints(tripId), [tripId]);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const col = (type: 'PICKUP' | 'DROPOFF', title: string) => (
    <div>
      <div className="mb-2 font-semibold">{title}</div>
      <ol className="m-0 list-none space-y-3 p-0">
        {data!
          .filter((s) => s.pointType === type)
          .map((s) => (
            <li key={s.id} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 font-semibold">{formatTime(s.estimatedTime)}</span>
              <span>
                <span className="block font-medium">{s.name}</span>
                <span className="text-muted">{s.address}</span>
              </span>
            </li>
          ))}
      </ol>
    </div>
  );
  return (
    <div>
      <p className="mb-3 mt-0 rounded-input bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Lưu ý: giờ đón/trả là dự kiến. Vui lòng có mặt tại điểm đón trước 15 phút.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {col('PICKUP', 'Điểm đón')}
        {col('DROPOFF', 'Điểm trả')}
      </div>
    </div>
  );
}

function ReviewsTab({ companyId }: { companyId: number }) {
  const viewerId = useAuthStore((s) => s.user?.id ?? null);
  const [rating, setRating] = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const summary = useAsync(() => getCompanyReviewSummary(companyId), [companyId]);
  const list = useAsync(() => listCompanyReviews(companyId, viewerId, rating, page), [companyId, rating, page]);

  if (summary.loading) return <Spinner />;
  const s = summary.data!;
  if (!s.totalReviews) return <p className="text-sm text-muted">Nhà xe chưa có đánh giá nào.</p>;
  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold">{s.averageRating}</span>
          <span className="pb-1 text-sm text-muted">/ 5</span>
        </div>
        <Stars value={s.averageRating ?? 0} size={16} />
        <div className="mb-3 text-xs text-muted">{s.totalReviews} đánh giá</div>
        {[5, 4, 3, 2, 1].map((lv) => (
          <button
            key={lv}
            className={`mb-1 flex w-full cursor-pointer items-center gap-2 rounded border-0 px-1 py-0.5 text-xs ${rating === lv ? 'bg-primary-light' : 'bg-transparent'}`}
            onClick={() => {
              setRating(rating === lv ? undefined : lv);
              setPage(0);
            }}
          >
            <span className="w-6">{lv}★</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
              <span
                className="block h-full rounded-full bg-cta"
                style={{ width: `${(s.ratingBreakdown[lv] / s.totalReviews) * 100}%` }}
              />
            </span>
            <span className="w-6 text-right text-muted">{s.ratingBreakdown[lv]}</span>
          </button>
        ))}
      </div>
      <div>
        {list.loading && <Spinner />}
        {list.data?.content.length === 0 && <p className="text-sm text-muted">Không có đánh giá {rating} sao.</p>}
        <ul className="m-0 list-none space-y-4 p-0">
          {list.data?.content.map((r) => (
            <li key={r.id} className="border-0 border-b border-solid border-line pb-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {r.userDisplayName} {r.mine && <span className="text-xs font-normal text-primary">(bạn)</span>}
                </span>
                <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
              </div>
              <Stars value={r.rating} size={12} />
              <p className="mb-0 mt-1 text-sm">{r.comment}</p>
              <p className="m-0 text-xs text-muted">Tuyến {r.routeName}</p>
            </li>
          ))}
        </ul>
        {list.data && list.data.totalPages > 1 && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <button className="btn-ghost h-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Trước
            </button>
            <span>
              {page + 1}/{list.data.totalPages}
            </span>
            <button className="btn-ghost h-8" disabled={!list.data.hasNext} onClick={() => setPage(page + 1)}>
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ companyId, kind }: { companyId: number; kind: 'policy' | 'images' | 'amenities' }) {
  const { data, loading, error, reload } = useAsync(() => getCompanyProfile(companyId), [companyId]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const p = data!;

  if (kind === 'images') {
    if (!p.images.length) return <p className="text-sm text-muted">Nhà xe chưa cập nhật hình ảnh.</p>;
    return (
      <>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {p.images.map((img, i) => (
            <button key={img.id} className="cursor-pointer overflow-hidden rounded-card border-0 p-0" onClick={() => setLightbox(i)}>
              <img src={img.imageUrl} alt={img.caption} className="block aspect-[4/3] w-full object-cover transition hover:scale-105" loading="lazy" />
            </button>
          ))}
        </div>
        <Modal open={lightbox != null} onClose={() => setLightbox(null)} title={p.images[lightbox ?? 0]?.caption} width="max-w-3xl">
          {lightbox != null && <img src={p.images[lightbox].imageUrl} alt="" className="block w-full rounded-card" />}
          <div className="mt-3 flex justify-between">
            <button className="btn-ghost" disabled={lightbox === 0} onClick={() => setLightbox((lightbox ?? 1) - 1)}>
              Ảnh trước
            </button>
            <button className="btn-ghost" disabled={lightbox === p.images.length - 1} onClick={() => setLightbox((lightbox ?? 0) + 1)}>
              Ảnh sau
            </button>
          </div>
        </Modal>
      </>
    );
  }

  if (kind === 'amenities') {
    if (!p.amenities.length) return <p className="text-sm text-muted">Nhà xe chưa cập nhật tiện ích.</p>;
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {p.amenities.map((a) => {
          const Icon = AMENITY_ICONS[a.icon] ?? Check;
          return (
            <div key={a.id} className="flex items-center gap-2 rounded-card bg-bg px-3 py-2 text-sm">
              <Icon size={18} className="text-primary" /> {a.name}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {p.policies.map((pol) => (
        <details key={pol.id} className="rounded-card border border-solid border-line px-4 py-2" open={pol.policyType === 'CANCELLATION'}>
          <summary className="cursor-pointer text-sm font-semibold">{pol.title}</summary>
          <p className="mb-1 text-sm text-muted">{pol.content}</p>
          {pol.policyType === 'CANCELLATION' && p.cancellationRules.length > 0 && (
            <table className="mb-2 w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 font-medium">Huỷ trước giờ khởi hành</th>
                  <th className="py-1 font-medium">Hoàn tiền</th>
                </tr>
              </thead>
              <tbody>
                {p.cancellationRules.map((r) => (
                  <tr key={r.hoursBefore} className="border-0 border-t border-solid border-line">
                    <td className="py-1">{r.hoursBefore > 0 ? `Từ ${r.hoursBefore} giờ` : 'Dưới mốc nhỏ nhất'}</td>
                    <td className="py-1 font-semibold">{r.refundPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </details>
      ))}
    </div>
  );
}

/** Panel chi tiết chuyến: xổ trong thẻ kết quả, hoặc dùng ở trang /chuyen/:tripId. */
export default function TripDetailTabs({
  trip,
  tab,
  onTab,
}: {
  trip: TripResponse;
  tab: DetailTab;
  onTab: (t: DetailTab) => void;
}) {
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-0 border-b border-solid border-line" role="tablist">
        {DETAIL_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`shrink-0 cursor-pointer border-0 border-b-2 border-solid bg-transparent px-3 py-2 text-sm ${
              tab === t.key ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted'
            }`}
            onClick={() => onTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {tab === 'promo' && <PromoTab tripId={trip.id} />}
        {tab === 'stops' && <StopsTab tripId={trip.id} />}
        {tab === 'reviews' && <ReviewsTab companyId={trip.companyId} />}
        {(tab === 'policy' || tab === 'images' || tab === 'amenities') && (
          <ProfileTab companyId={trip.companyId} kind={tab} />
        )}
      </div>
    </div>
  );
}
