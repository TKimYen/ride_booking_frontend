import dayjs from 'dayjs';
import { BadgePercent, Clock3, Headphones, ShieldCheck, Bus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getPopularRoutes } from '../../api/catalog.api';
import { getFeaturedPromotions } from '../../api/promotions.api';
import { Modal, Skeleton } from '../../components/common';
import SearchForm from '../../components/search/SearchForm';
import { PromotionCard, promoText } from '../../components/trip/TripDetailTabs';
import { useAsync, useDocumentTitle } from '../../hooks';
import { loadRecentSearches } from '../../stores/bookingStore';
import type { PromotionResponse } from '../../types';
import { formatShortDate, formatVND } from '../../utils/format';
import { locations } from '../../mock/db';

export default function HomePage() {
  useDocumentTitle('');
  const promos = useAsync(getFeaturedPromotions, []);
  const popular = useAsync(() => getPopularRoutes(6), []);
  const [promo, setPromo] = useState<PromotionResponse | null>(null);
  const recent = loadRecentSearches().filter((r) => !dayjs(r.date).isBefore(dayjs(), 'day'));
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

  return (
    <>
      <section
        className="relative bg-primary bg-cover bg-center pb-16 pt-10 md:pb-24 md:pt-16"
        style={{ backgroundImage: 'linear-gradient(rgba(20,60,130,.55),rgba(20,60,130,.7)),url(https://picsum.photos/seed/xego-hero/1600/700)' }}
      >
        <div className="container-x">
          <h1 className="m-0 text-center text-2xl font-bold text-white md:text-4xl">Đặt vé xe khách liên tỉnh</h1>
          <p className="mb-6 mt-2 text-center text-white/85">Giữ chỗ 10 phút · Hàng trăm chuyến mỗi ngày · Thanh toán an toàn</p>
          <div className="card mx-auto max-w-5xl p-4">
            <SearchForm />
            {recent.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">Tìm kiếm gần đây:</span>
                {recent.map((r) => (
                  <Link
                    key={`${r.originId}-${r.destinationId}`}
                    to={`/xe-khach/${r.originSlug}-di-${r.destinationSlug}?date=${r.date}`}
                    className="chip h-7 text-xs"
                  >
                    {r.originName} → {r.destinationName} ({formatShortDate(r.date)})
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-x mt-10">
        <h2 className="mb-4 text-xl font-bold">Ưu đãi nổi bật</h2>
        <div className="flex snap-x gap-4 overflow-x-auto pb-2">
          {promos.loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-80 shrink-0" />)}
          {promos.data?.map((p) => (
            <button
              key={p.id}
              className="card w-80 shrink-0 cursor-pointer snap-start overflow-hidden p-0 text-left"
              onClick={() => setPromo(p)}
            >
              <img src={p.bannerUrl} alt="" className="block h-32 w-full object-cover" loading="lazy" />
              <div className="p-3">
                <div className="font-semibold">{p.title}</div>
                <div className="text-xs text-muted">
                  {promoText(p)} · Mã <b className="text-primary">{p.code}</b>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="container-x mt-10">
        <h2 className="mb-4 text-xl font-bold">Tuyến đường phổ biến</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {popular.loading && [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48" />)}
          {popular.data?.map((r) => {
            const o = locations.find((l) => l.id === r.originId)!;
            const d = locations.find((l) => l.id === r.destinationId)!;
            return (
              <Link key={r.id} to={`/xe-khach/${o.slug}-di-${d.slug}?date=${tomorrow}`} className="card group overflow-hidden">
                <div className="h-28 overflow-hidden bg-primary-light md:h-36">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-primary">
                      <Bus size={40} />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-semibold">{r.name}</div>
                  {Number.isFinite(r.minPrice) && <div className="text-sm text-muted">Từ <b className="text-primary">{formatVND(r.minPrice!)}</b></div>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-x mt-10">
        <h2 className="mb-4 text-xl font-bold">Vì sao chọn XeGo</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Bus, title: 'Nhiều nhà xe', text: 'So sánh giá, giờ, đánh giá của nhiều nhà xe uy tín.' },
            { icon: Clock3, title: 'Giữ chỗ 10 phút', text: 'Chọn ghế xong được giữ chỗ để bạn thanh toán thong thả.' },
            { icon: ShieldCheck, title: 'Thanh toán an toàn', text: 'Thanh toán thẻ qua cổng Stripe, nhận mã vé ngay.' },
            { icon: Headphones, title: 'Hỗ trợ 24/7', text: 'Hotline 1900 1234 hỗ trợ đổi, huỷ vé mọi lúc.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-4">
              <Icon className="text-primary" />
              <div className="mt-2 font-semibold">{title}</div>
              <div className="text-sm text-muted">{text}</div>
            </div>
          ))}
        </div>
      </section>

      <Modal open={promo != null} onClose={() => setPromo(null)} title={promo?.title}>
        {promo && (
          <>
            <img src={promo.bannerUrl} alt="" className="mb-3 block w-full rounded-card" />
            <p className="mt-0 text-sm">{promo.description}</p>
            <PromotionCard p={promo} />
            <p className="mb-0 text-xs text-muted">
              <BadgePercent size={12} className="inline" /> Nhập mã ở bước chọn ghế để được giảm giá.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
