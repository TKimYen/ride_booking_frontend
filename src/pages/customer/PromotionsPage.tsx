import { getActivePromotions } from '../../api/promotions.api';
import { Empty, ErrorBox, Skeleton } from '../../components/common';
import { PromotionCard } from '../../components/trip/TripDetailTabs';
import { useAsync, useDocumentTitle } from '../../hooks';

export default function PromotionsPage() {
  useDocumentTitle('Ưu đãi');
  const { data, loading, error, reload } = useAsync(getActivePromotions, []);
  return (
    <div className="container-x py-8">
      <h1 className="mb-4 mt-0 text-xl font-bold">Ưu đãi đang diễn ra</h1>
      {loading && <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64" />)}</div>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data?.length === 0 && <Empty title="Chưa có ưu đãi nào" />}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            <img src={p.bannerUrl} alt="" className="block h-40 w-full object-cover" loading="lazy" />
            <div className="space-y-2 p-4">
              <p className="m-0 text-sm text-muted">{p.description}</p>
              <PromotionCard p={p} />
              <p className="m-0 text-xs text-muted">
                Phạm vi: {p.companyName ?? (p.routeName ? `Tuyến ${p.routeName}` : 'Mọi nhà xe, mọi tuyến')}
                {p.usageLimit != null && ` · Còn ${p.usageLimit - p.usedCount} lượt`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
