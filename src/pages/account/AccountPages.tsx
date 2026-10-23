import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { changePassword, getMyProfile, updateMyProfile } from '../../api/auth.api';
import { cancelBooking, claimBooking, getBooking, listMyBookings } from '../../api/bookings.api';
import { errorMessage } from '../../api/client';
import { createReview, deleteReview, listMyReviews, updateReview } from '../../api/reviews.api';
import { HoldTimer } from '../../components/booking';
import TicketView from '../../components/booking/TicketView';
import { CompanyLogo, Empty, ErrorBox, Field, Modal, Skeleton, StatusBadge, Stars, toast } from '../../components/common';
import { useAsync, useCountdown, useDocumentTitle } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import type { BookingResponse, BookingStatus, UserProfile } from '../../types';
import { PHONE_REGEX, formatCountdown, formatDate, formatTime, formatVND } from '../../utils/format';

// ---------------- Thông tin tài khoản ----------------
export function ProfilePage() {
  useDocumentTitle('Thông tin tài khoản');
  const user = useAuthStore((s) => s.user)!;
  const updateUser = useAuthStore((s) => s.updateUser);
  const { data, loading, error, reload } = useAsync(() => getMyProfile(user.id), [user.id]);
  const [form, setForm] = useState<Pick<UserProfile, 'fullName' | 'phone' | 'dob' | 'gender'> | null>(null);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (data) setForm({ fullName: data.fullName, phone: data.phone, dob: data.dob, gender: data.gender });
  }, [data]);

  if (loading || !form) return <Skeleton className="h-80" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.phone && !/^\+?[0-9]{9,15}$/.test(form.phone)) return setPhoneError('SĐT gồm 9-15 chữ số, có thể bắt đầu bằng +');
    setPhoneError('');
    setSaving(true);
    try {
      const p = await updateMyProfile(user.id, form);
      updateUser({ fullName: p.fullName });
      toast.success('Đã lưu thông tin');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5">
      <h1 className="mb-4 mt-0 text-lg font-bold">Thông tin tài khoản</h1>
      <form className="grid max-w-xl gap-3 md:grid-cols-2" onSubmit={save}>
        <div className="md:col-span-2">
          <Field label="Họ và tên">
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </Field>
        </div>
        <Field label="Số điện thoại" error={phoneError}>
          <input className="input" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value || null })} />
        </Field>
        <Field label="Ngày sinh">
          <input className="input" type="date" value={form.dob ?? ''} onChange={(e) => setForm({ ...form, dob: e.target.value || null })} />
        </Field>
        <Field label="Giới tính">
          <select className="input" value={form.gender ?? ''} onChange={(e) => setForm({ ...form, gender: (e.target.value || null) as UserProfile['gender'] })}>
            <option value="">Chưa chọn</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </Field>
        <Field label="Email (đổi ở mục Bảo mật)">
          <input className="input bg-bg" value={data!.email} readOnly />
        </Field>
        <div className="md:col-span-2">
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------- Đơn hàng của tôi ----------------
const TABS: { key: string; label: string; statuses: BookingStatus[] }[] = [
  { key: 'current', label: 'Hiện tại', statuses: ['PENDING', 'PAID'] },
  { key: 'done', label: 'Đã đi', statuses: ['COMPLETED'] },
  { key: 'cancelled', label: 'Đã huỷ', statuses: ['CANCELLED', 'EXPIRED'] },
];

export function MyBookingsPage() {
  useDocumentTitle('Đơn hàng của tôi');
  const user = useAuthStore((s) => s.user)!;
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.key === params.get('tab')) ?? TABS[0];
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useAsync(() => listMyBookings(user.id, tab.statuses, page, 10), [tab.key, page]);
  const [claimOpen, setClaimOpen] = useState(false);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-lg font-bold">Đơn hàng của tôi</h1>
        <button className="btn-ghost h-9" onClick={() => setClaimOpen(true)}>
          + Thêm vé đã đặt
        </button>
      </div>
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={t.key === tab.key ? 'chip-active' : 'chip'}
            onClick={() => {
              setParams({ tab: t.key });
              setPage(0);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading && !data ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data!.content.length === 0 ? (
        <Empty
          title={tab.key === 'done' ? 'Chưa có chuyến nào đã đi' : tab.key === 'cancelled' ? 'Không có đơn đã huỷ' : 'Bạn chưa có vé nào sắp đi'}
          action={<Link to="/" className="btn-primary">Tìm chuyến xe</Link>}
        />
      ) : (
        <div className="space-y-3">
          {data!.content.map((b) => (
            <BookingCard key={b.id} b={b} onChanged={reload} />
          ))}
          {data!.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <button className="btn-ghost h-8" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
              <span>{page + 1}/{data!.totalPages}</span>
              <button className="btn-ghost h-8" disabled={!data!.hasNext} onClick={() => setPage(page + 1)}>Sau</button>
            </div>
          )}
        </div>
      )}
      <ClaimModal open={claimOpen} onClose={() => setClaimOpen(false)} onDone={reload} />
    </div>
  );
}

function BookingCard({ b, onChanged }: { b: BookingResponse; onChanged: () => void }) {
  const user = useAuthStore((s) => s.user)!;
  const left = useCountdown(b.status === 'PENDING' ? b.expiresAt : null);
  const cancel = async () => {
    if (!confirm('Huỷ giữ chỗ cho đơn này?')) return;
    try {
      await cancelBooking(b.id, user.id);
      toast.success('Đã huỷ đơn');
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <CompanyLogo name={b.trip.companyName} id={b.trip.companyId} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{b.trip.routeName}</span>
            <StatusBadge status={b.status} />
            {b.trip.status === 'CANCELLED' && <span className="text-xs text-danger">Nhà xe huỷ chuyến</span>}
          </div>
          <div className="text-sm text-muted">
            {formatTime(b.trip.departureTime)} · {formatDate(b.trip.departureTime)} · {b.trip.companyName}
          </div>
          <div className="text-sm">
            Ghế {b.seats.map((s) => s.seatName).join(', ')} · Mã vé <b className="font-mono">{b.bookingCode}</b>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-primary">{formatVND(b.totalPrice)}</div>
          {b.status === 'PENDING' && <div className="text-xs text-danger">Còn {formatCountdown(left)} để thanh toán</div>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2 border-0 border-t border-solid border-line pt-3">
        {b.status === 'PENDING' && left > 0 && (
          <>
            <button className="btn-danger h-9" onClick={cancel}>Huỷ</button>
            <Link to={`/dat-ve/thanh-toan/${b.id}`} className="btn-cta h-9">Thanh toán</Link>
          </>
        )}
        {(b.status === 'PAID' || b.status === 'COMPLETED') && (
          <Link to={`/tai-khoan/don-hang/${b.id}`} className="btn-ghost h-9">Xem vé</Link>
        )}
        {b.status === 'COMPLETED' &&
          (b.reviewed ? (
            <Link to="/tai-khoan/danh-gia" className="btn-ghost h-9">Xem đánh giá</Link>
          ) : (
            <Link to={`/tai-khoan/danh-gia/${b.id}`} className="btn-primary h-9">Đánh giá</Link>
          ))}
        {(b.status === 'CANCELLED' || b.status === 'EXPIRED') && (
          <Link to="/" className="btn-ghost h-9">Đặt lại chuyến tương tự</Link>
        )}
      </div>
    </div>
  );
}

function ClaimModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const user = useAuthStore((s) => s.user)!;
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    if (!PHONE_REGEX.test(phone)) return setError('Số điện thoại không hợp lệ');
    try {
      await claimBooking(user.id, code, phone);
      toast.success('Đã thêm vé vào tài khoản');
      onClose();
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm vé đã đặt khi chưa đăng nhập"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Đóng</button>
          <button className="btn-primary" onClick={submit}>Thêm vé</button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Mã vé">
          <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label="Số điện thoại đã đặt">
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        {error && <p className="m-0 text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

// ---------------- Chi tiết vé ----------------
export function BookingDetailPage() {
  const id = Number(useParams().id);
  const user = useAuthStore((s) => s.user)!;
  const { data, loading, error } = useAsync(() => getBooking(id, user.id), [id]);
  useDocumentTitle(data ? `Vé ${data.bookingCode}` : 'Chi tiết vé');
  if (loading) return <Skeleton className="h-96" />;
  if (error) return <ErrorBox message={error} />;
  return (
    <div className="space-y-3">
      <Link to="/tai-khoan/don-hang" className="no-print text-sm text-primary">← Đơn hàng của tôi</Link>
      {data!.status === 'PENDING' && (
        <div className="no-print flex items-center justify-between rounded-card bg-primary p-3 text-sm text-white">
          Đơn đang giữ chỗ <HoldTimer expiresAt={data!.expiresAt} />
        </div>
      )}
      <TicketView b={data!} />
      <div className="no-print flex justify-end gap-2">
        <button className="btn-ghost" onClick={() => window.print()}>In vé</button>
      </div>
    </div>
  );
}

// ---------------- Viết đánh giá ----------------
const LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];
const QUICK = ['Đúng giờ', 'Xe sạch', 'Tài xế thân thiện', 'Ghế thoải mái', 'Đón trả đúng điểm'];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i} sao`}
            className={`cursor-pointer border-0 bg-transparent p-0 text-4xl leading-none ${i <= shown ? 'text-cta' : 'text-line'}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
          >
            ★
          </button>
        ))}
      </div>
      <div className="h-5 text-sm text-muted">{LABELS[shown]}</div>
    </div>
  );
}

export function WriteReviewPage() {
  useDocumentTitle('Đánh giá chuyến đi');
  const bookingId = Number(useParams().bookingId);
  const user = useAuthStore((s) => s.user)!;
  const navigate = useNavigate();
  const { data: b, loading, error } = useAsync(() => getBooking(bookingId, user.id), [bookingId]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading) return <Skeleton className="h-80" />;
  if (error) return <ErrorBox message={error} />;
  if (b!.status !== 'COMPLETED') return <ErrorBox message="Bạn chỉ đánh giá được chuyến mình đã đi." />;
  if (b!.reviewed) return <Empty title="Bạn đã đánh giá chuyến này" action={<Link to="/tai-khoan/danh-gia" className="btn-primary">Xem đánh giá</Link>} />;

  const submit = async () => {
    if (!rating) return toast.error('Vui lòng chọn số sao');
    setSaving(true);
    try {
      await createReview(user.id, bookingId, rating, comment);
      toast.success('Cảm ơn bạn đã đánh giá!');
      navigate('/tai-khoan/danh-gia');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card max-w-2xl p-5">
      <h1 className="mb-1 mt-0 text-lg font-bold">Đánh giá chuyến đi</h1>
      <p className="mt-0 text-sm text-muted">
        {b!.trip.routeName} · {b!.trip.companyName} · {formatDate(b!.trip.departureTime)}
      </p>
      <StarPicker value={rating} onChange={setRating} />
      <div className="my-3 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button key={q} type="button" className="chip h-7 text-xs" onClick={() => setComment((c) => (c ? `${c}, ${q.toLowerCase()}` : q))}>
            {q}
          </button>
        ))}
      </div>
      <textarea
        className="input h-32 py-2"
        maxLength={1000}
        placeholder="Chia sẻ trải nghiệm của bạn (không bắt buộc)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="text-right text-xs text-muted">{comment.length}/1000</div>
      <button className="btn-primary mt-2" onClick={submit} disabled={saving}>
        {saving ? 'Đang gửi...' : 'Gửi đánh giá'}
      </button>
    </div>
  );
}

// ---------------- Đánh giá của tôi ----------------
export function MyReviewsPage() {
  useDocumentTitle('Đánh giá của tôi');
  const user = useAuthStore((s) => s.user)!;
  const { data, loading, error, reload } = useAsync(() => listMyReviews(user.id), [user.id]);
  const [editing, setEditing] = useState<{ id: number; rating: number; comment: string } | null>(null);

  const save = async () => {
    if (!editing) return;
    try {
      await updateReview(user.id, editing.id, editing.rating, editing.comment);
      toast.success('Đã cập nhật đánh giá');
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const remove = async (id: number) => {
    if (!confirm('Xoá đánh giá này?')) return;
    await deleteReview(user.id, false, id);
    toast.success('Đã xoá đánh giá');
    reload();
  };

  if (loading) return <Skeleton className="h-64" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div>
      <h1 className="mb-3 mt-0 text-lg font-bold">Đánh giá của tôi</h1>
      {data!.length === 0 ? (
        <Empty title="Bạn chưa có đánh giá nào" hint="Sau mỗi chuyến đã đi, vào tab “Đã đi” để đánh giá nhà xe." action={<Link to="/tai-khoan/don-hang?tab=done" className="btn-primary">Chuyến đã đi</Link>} />
      ) : (
        <div className="space-y-3">
          {data!.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{r.companyName} · {r.routeName}</span>
                <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
              </div>
              <Stars value={r.rating} />
              {r.hidden && <span className="ml-2 text-xs text-danger">Đã bị ẩn do vi phạm</span>}
              <p className="mb-2 mt-1 text-sm">{r.comment || <i className="text-muted">Không có bình luận</i>}</p>
              <div className="flex gap-2">
                <button className="btn-ghost h-8" onClick={() => setEditing({ id: r.id, rating: r.rating, comment: r.comment })}>Sửa</button>
                <button className="btn-danger h-8" onClick={() => remove(r.id)}>Xoá</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal
        open={editing != null}
        onClose={() => setEditing(null)}
        title="Sửa đánh giá"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Huỷ</button>
            <button className="btn-primary" onClick={save}>Lưu</button>
          </>
        }
      >
        {editing && (
          <>
            <StarPicker value={editing.rating} onChange={(v) => setEditing({ ...editing, rating: v })} />
            <textarea className="input mt-2 h-28 py-2" maxLength={1000} value={editing.comment} onChange={(e) => setEditing({ ...editing, comment: e.target.value })} />
          </>
        )}
      </Modal>
    </div>
  );
}

// ---------------- Bảo mật ----------------
export function SecurityPage() {
  useDocumentTitle('Bảo mật');
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.next.length < 8) return setError('Mật khẩu mới tối thiểu 8 ký tự');
    if (form.next !== form.confirm) return setError('Mật khẩu nhập lại không khớp');
    try {
      await changePassword(user.id, form.current, form.next);
      toast.success('Đã đổi mật khẩu');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h1 className="mb-4 mt-0 text-lg font-bold">Đổi mật khẩu</h1>
        <form className="max-w-sm space-y-3" onSubmit={submit}>
          <Field label="Mật khẩu hiện tại">
            <input className="input" type="password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required />
          </Field>
          <Field label="Mật khẩu mới">
            <input className="input" type="password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required />
          </Field>
          <Field label="Nhập lại mật khẩu mới">
            <input className="input" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
          </Field>
          {error && <p className="m-0 text-sm text-danger">{error}</p>}
          <button className="btn-primary">Đổi mật khẩu</button>
        </form>
      </div>
      <div className="card p-5">
        <h2 className="mb-2 mt-0 text-base font-semibold">Phiên đăng nhập</h2>
        <p className="mt-0 text-sm text-muted">Đăng xuất khỏi mọi thiết bị đang đăng nhập tài khoản này.</p>
        <button
          className="btn-danger"
          onClick={() => {
            logout();
            toast.info('Đã đăng xuất mọi thiết bị');
            navigate('/dang-nhap');
          }}
        >
          Đăng xuất mọi thiết bị
        </button>
      </div>
    </div>
  );
}
