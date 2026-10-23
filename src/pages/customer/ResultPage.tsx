import { CheckCircle2, Printer, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getBooking } from '../../api/bookings.api';
import TicketView from '../../components/booking/TicketView';
import { ErrorBox, Skeleton } from '../../components/common';
import { useAsync, useDocumentTitle } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import { useBookingStore } from '../../stores/bookingStore';

/** /dat-ve/ket-qua?bookingId= — Stripe redirect về đây (bản thật poll tới khi PAID). */
export default function ResultPage() {
  const [params] = useSearchParams();
  const bookingId = Number(params.get('bookingId'));
  const user = useAuthStore((s) => s.user);
  const guestToken = useBookingStore((s) => s.guestTickets[bookingId]?.guestToken);
  const { data: b, loading, error } = useAsync(() => getBooking(bookingId, user?.id ?? null, guestToken), [bookingId]);
  useDocumentTitle('Kết quả đặt vé');

  if (loading) return <div className="container-x py-6"><Skeleton className="h-96" /></div>;
  if (error) return <div className="container-x py-6"><ErrorBox message={error} /></div>;
  const ok = b!.status === 'PAID' || b!.status === 'COMPLETED';

  return (
    <div className="container-x max-w-3xl space-y-4 py-6">
      <div className="no-print text-center">
        {ok ? <CheckCircle2 size={56} className="mx-auto text-success" /> : <XCircle size={56} className="mx-auto text-danger" />}
        <h1 className="mb-1 mt-2 text-xl font-bold">{ok ? 'Đặt vé thành công!' : 'Đơn chưa được thanh toán'}</h1>
        <p className="mt-0 text-sm text-muted">
          {ok
            ? `Vé điện tử đã gửi tới ${b!.contactEmail}. Lưu lại mã vé để tra cứu.`
            : b!.status === 'PENDING'
              ? 'Bạn có thể thanh toán tiếp trước khi hết hạn giữ chỗ.'
              : 'Đơn đã huỷ hoặc hết hạn. Ghế đã được trả lại.'}
        </p>
      </div>
      <TicketView b={b!} />
      {b!.guest && ok && (
        <div className="no-print card flex flex-wrap items-center gap-3 bg-primary-light p-4 text-sm">
          <span className="flex-1">
            <b>Tạo tài khoản để quản lý vé và nhận ưu đãi.</b> Sau khi đăng ký, dùng “Thêm vé đã đặt” với mã {b!.bookingCode} + SĐT để gắn vé này.
          </span>
          <Link to={`/dang-ky?name=${encodeURIComponent(b!.contactName)}&email=${encodeURIComponent(b!.contactEmail)}`} className="btn-primary">
            Tạo tài khoản
          </Link>
        </div>
      )}
      <div className="no-print flex flex-wrap justify-center gap-2">
        {b!.status === 'PENDING' && (
          <Link to={`/dat-ve/thanh-toan/${b!.id}`} className="btn-cta">
            Thanh toán tiếp
          </Link>
        )}
        {ok && (
          <button className="btn-ghost" onClick={() => window.print()}>
            <Printer size={16} /> In vé / Lưu PDF
          </button>
        )}
        <Link to={user ? '/tai-khoan/don-hang' : '/tra-cuu-ve'} className="btn-ghost">
          {user ? 'Đơn hàng của tôi' : 'Tra cứu vé'}
        </Link>
        <Link to="/" className="btn-primary">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
