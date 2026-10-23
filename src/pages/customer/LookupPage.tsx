import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking, lookupBooking } from '../../api/bookings.api';
import { errorMessage } from '../../api/client';
import TicketView from '../../components/booking/TicketView';
import { Field, toast } from '../../components/common';
import { useDocumentTitle } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import { useBookingStore } from '../../stores/bookingStore';
import type { BookingResponse } from '../../types';

/** /tra-cuu-ve — mã vé + SĐT. Sai thông tin luôn báo chung, không tiết lộ mã có tồn tại. */
export default function LookupPage() {
  useDocumentTitle('Tra cứu vé');
  const user = useAuthStore((s) => s.user);
  const saveGuestTicket = useBookingStore((s) => s.saveGuestTicket);
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BookingResponse | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!code.trim() || !phone.trim()) return setError('Vui lòng nhập đủ mã vé và số điện thoại');
    setLoading(true);
    try {
      const b = await lookupBooking(code, phone);
      if (b.guestToken) saveGuestTicket({ bookingId: b.id, bookingCode: b.bookingCode, phone: b.contactPhone, guestToken: b.guestToken });
      setResult(b);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    if (!result || !confirm('Huỷ giữ chỗ cho đơn này?')) return;
    try {
      setResult(await cancelBooking(result.id, user?.id ?? null, useBookingStore.getState().guestTickets[result.id]?.guestToken));
      toast.success('Đã huỷ đơn');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="container-x max-w-3xl space-y-4 py-8">
      <div className="card p-5">
        <h1 className="mb-1 mt-0 text-xl font-bold">Tra cứu vé</h1>
        <p className="mb-4 mt-0 text-sm text-muted">Nhập mã vé (8 ký tự trong email/tin nhắn) và số điện thoại đã dùng khi đặt.</p>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={submit}>
          <Field label="Mã vé">
            <input className="input font-mono uppercase" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: K7M2Q9XA" />
          </Field>
          <Field label="Số điện thoại">
            <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
          </Field>
          <button className="btn-primary" disabled={loading}>
            <Search size={16} /> {loading ? 'Đang tìm...' : 'Tra cứu'}
          </button>
        </form>
        {error && <p className="mb-0 mt-3 text-sm text-danger">{error}</p>}
      </div>
      {result && (
        <>
          <TicketView b={result} />
          <div className="flex flex-wrap gap-2">
            {result.status === 'PENDING' && (result.holdSecondsRemaining ?? 0) > 0 && (
              <>
                <Link to={`/dat-ve/thanh-toan/${result.id}`} className="btn-cta">
                  Thanh toán tiếp
                </Link>
                <button className="btn-danger" onClick={cancel}>
                  Huỷ giữ chỗ
                </button>
              </>
            )}
            {!result.guest && !user && <span className="text-sm text-muted">Vé thuộc một tài khoản — đăng nhập để thao tác.</span>}
          </div>
        </>
      )}
    </div>
  );
}
