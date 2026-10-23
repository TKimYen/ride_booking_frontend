import { CreditCard, FlaskConical, Lock, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { cancelBooking, getBooking, payDemo } from '../../api/bookings.api';
import { errorMessage } from '../../api/client';
import { BookingStepper, HoldTimer } from '../../components/booking';
import { ErrorBox, Modal, Skeleton, toast } from '../../components/common';
import { useAsync, useCountdown, useDocumentTitle } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import { useBookingStore } from '../../stores/bookingStore';
import { formatDate, formatTime, formatVND } from '../../utils/format';

type Method = 'STRIPE' | 'DEMO';

/** /dat-ve/thanh-toan/:bookingId — bước 4: đếm ngược theo expiresAt, chặn rời trang khi chưa thanh toán. */
export default function PaymentPage() {
  const bookingId = Number(useParams().bookingId);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const guestToken = useBookingStore((s) => s.guestTickets[bookingId]?.guestToken);
  const { data: b, loading, error } = useAsync(() => getBooking(bookingId, user?.id ?? null, guestToken), [bookingId]);
  const [method, setMethod] = useState<Method>('STRIPE');
  const [paying, setPaying] = useState(false);
  const [stripeOpen, setStripeOpen] = useState(false);
  const [done, setDone] = useState(false);
  useDocumentTitle('Thanh toán');

  const left = useCountdown(b?.expiresAt);
  const pending = b?.status === 'PENDING' && !done;
  const timedOut = pending && left === 0;
  // Ref chứ không phải state: navigate() ngay sau khi thanh toán chạy trước lần render kế tiếp.
  const leaving = useRef(false);

  // Chặn rời trang: F5/đóng tab (beforeunload) và điều hướng trong app (useBlocker).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leaving.current && Boolean(pending && !timedOut) && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!pending) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [pending]);

  useEffect(() => {
    if (b && b.status !== 'PENDING' && !done) navigate(`/dat-ve/ket-qua?bookingId=${b.id}`, { replace: true });
  }, [b, done, navigate]);

  const pay = async () => {
    setPaying(true);
    try {
      await payDemo(bookingId, user?.id ?? null, guestToken);
      setDone(true);
      leaving.current = true;
      navigate(`/dat-ve/ket-qua?bookingId=${bookingId}&status=success`, { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPaying(false);
      setStripeOpen(false);
    }
  };

  const cancelAndLeave = async () => {
    try {
      await cancelBooking(bookingId, user?.id ?? null, guestToken);
      toast.info('Đã huỷ giữ chỗ');
    } catch (e) {
      toast.error(errorMessage(e));
    }
    blocker.proceed?.();
  };

  if (loading) return <div className="container-x py-6"><Skeleton className="h-80" /></div>;
  if (error) return <div className="container-x py-6"><ErrorBox message={error} /></div>;
  if (!b) return null;

  return (
    <div className="container-x py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card bg-primary px-4 py-3 text-white">
        <span className="text-sm">
          {b.trip.routeName} · {formatDate(b.trip.departureTime)} · {formatTime(b.trip.departureTime)} · {b.trip.companyName}
        </span>
        {pending && <HoldTimer expiresAt={b.expiresAt} />}
      </div>
      <div className="card mb-4 px-4 py-3">
        <BookingStepper current={4} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="card p-4">
          <h2 className="mb-3 mt-0 text-base font-semibold">Chọn phương thức thanh toán</h2>
          <div className="space-y-2">
            <MethodOption checked={method === 'STRIPE'} onClick={() => setMethod('STRIPE')} icon={<CreditCard className="text-primary" />} title="Thẻ quốc tế (Visa, Master, JCB)" sub="Thanh toán qua cổng Stripe" />
            <MethodOption checked={method === 'DEMO'} onClick={() => setMethod('DEMO')} icon={<FlaskConical className="text-amber-600" />} title="Thanh toán demo" sub="Chỉ dùng cho môi trường phát triển" />
            {['VNPAY', 'MoMo', 'ZaloPay'].map((n) => (
              <MethodOption key={n} disabled icon={<Wallet className="text-muted" />} title={n} sub="Sắp ra mắt" />
            ))}
          </div>
          <p className="mb-0 mt-4 flex items-center gap-1 text-xs text-muted">
            <Lock size={12} /> Ghế được giữ tới hết thời gian đếm ngược. Mã vé: <b>{b.bookingCode}</b>
          </p>
        </div>
        <aside className="card h-fit p-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Ghế</span>
              <span className="font-medium">{b.seats.map((s) => s.seatName).join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tạm tính</span>
              <span>{formatVND(b.subtotalPrice ?? b.totalPrice)}</span>
            </div>
            {!!b.discountAmount && (
              <div className="flex justify-between text-success">
                <span>Giảm giá ({b.promotionCode})</span>
                <span>-{formatVND(b.discountAmount)}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-0 border-t border-solid border-line pt-3">
            <span className="font-semibold">Tổng thanh toán</span>
            <span className="text-xl font-bold text-primary">{formatVND(b.totalPrice)}</span>
          </div>
          <button className="btn-cta mt-4 w-full" disabled={paying || timedOut} onClick={() => (method === 'STRIPE' ? setStripeOpen(true) : pay())}>
            {paying ? 'Đang xử lý...' : 'Thanh toán'}
          </button>
        </aside>
      </div>

      {/* Giả lập trang Stripe Checkout (bản thật: window.location = checkoutUrl) */}
      <Modal open={stripeOpen} onClose={() => !paying && setStripeOpen(false)} title="Stripe Checkout (giả lập)">
        <div className="space-y-3 text-sm">
          <div className="rounded-input bg-bg px-3 py-2">
            Số tiền: <b>{formatVND(b.totalPrice)}</b>
          </div>
          <input className="input" defaultValue="4242 4242 4242 4242" aria-label="Số thẻ" />
          <div className="flex gap-2">
            <input className="input" defaultValue="12/30" aria-label="Hạn thẻ" />
            <input className="input" defaultValue="123" aria-label="CVC" />
          </div>
          <p className="m-0 text-xs text-muted">Dùng thẻ test 4242… của Stripe. Ở bản thật trang này do Stripe hiển thị.</p>
          <button className="btn-primary w-full" disabled={paying} onClick={pay}>
            {paying ? 'Đang thanh toán...' : `Trả ${formatVND(b.totalPrice)}`}
          </button>
        </div>
      </Modal>

      <Modal open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} title="Giữ chỗ hay huỷ chỗ?">
        <p className="mt-0 text-sm">
          Đơn <b>{b.bookingCode}</b> chưa thanh toán. Ghế vẫn được giữ tới khi hết giờ đếm ngược.
        </p>
        <div className="flex flex-col gap-2">
          <button className="btn-cta" onClick={() => blocker.reset?.()}>
            Tiếp tục thanh toán
          </button>
          <button className="btn-ghost" onClick={() => blocker.proceed?.()}>
            Giữ chỗ, thanh toán sau
          </button>
          <button className="btn-danger" onClick={cancelAndLeave}>
            Huỷ chỗ
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(timedOut)} onClose={() => navigate(`/dat-ve/${b.trip.id}`, { replace: true })} title="Hết thời gian giữ chỗ">
        <p className="mt-0 text-sm">Đơn đã hết hạn thanh toán và ghế đã được trả lại. Vui lòng chọn lại ghế.</p>
        <button className="btn-primary w-full" onClick={() => navigate(`/dat-ve/${b.trip.id}`, { replace: true })}>
          Chọn lại ghế
        </button>
      </Modal>
    </div>
  );
}

function MethodOption({
  checked,
  onClick,
  icon,
  title,
  sub,
  disabled,
}: {
  checked?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-card border border-solid bg-white p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'border-primary ring-2 ring-primary/15' : 'border-line'
      }`}
    >
      <input type="radio" readOnly checked={Boolean(checked)} disabled={disabled} tabIndex={-1} />
      {icon}
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted">{sub}</span>
      </span>
    </button>
  );
}
