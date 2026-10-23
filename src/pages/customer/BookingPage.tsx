import { Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getMyProfile } from '../../api/auth.api';
import { holdSeats } from '../../api/bookings.api';
import { ApiError, errorMessage } from '../../api/client';
import { validatePromotion } from '../../api/promotions.api';
import { getSeatMap, getStopPoints, getTrip } from '../../api/trips.api';
import { BookingStepper } from '../../components/booking';
import { ErrorBox, Field, Skeleton, Spinner, toast } from '../../components/common';
import SeatMap, { SeatLegend } from '../../components/seat/SeatMap';
import { useAsync, useDocumentTitle } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import { useBookingStore } from '../../stores/bookingStore';
import type { PromotionValidateResponse, TripSeatResponse } from '../../types';
import { EMAIL_REGEX, PHONE_REGEX, formatDate, formatTime, formatVND } from '../../utils/format';

const MAX_SEATS = 10;

/** /dat-ve/:tripId — bước 1-3. Chỉ gọi API giữ ghế ở cuối bước 3 (tránh giữ ghế ảo khi khách mới xem). */
export default function BookingPage() {
  const tripId = Number(useParams().tripId);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const saveGuestTicket = useBookingStore((s) => s.saveGuestTicket);

  const trip = useAsync(() => getTrip(tripId), [tripId]);
  const seatMap = useAsync(() => getSeatMap(tripId), [tripId]);
  const stops = useAsync(() => getStopPoints(tripId), [tripId]);
  useDocumentTitle(trip.data ? `Đặt vé ${trip.data.trip.routeName}` : 'Đặt vé');

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [pickupId, setPickupId] = useState<number | null>(null);
  const [dropoffId, setDropoffId] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [promo, setPromo] = useState<PromotionValidateResponse | null>(null);
  const [promoError, setPromoError] = useState('');
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Tự điền thông tin liên hệ từ hồ sơ (đặt hộ thì sửa được).
  useEffect(() => {
    if (!user) return;
    getMyProfile(user.id).then((p) => setContact({ name: p.fullName, phone: p.phone ?? '', email: p.email }));
  }, [user]);

  // Mặc định điểm đón/trả đầu tiên.
  useEffect(() => {
    if (!stops.data) return;
    setPickupId((v) => v ?? stops.data!.find((s) => s.pointType === 'PICKUP')?.id ?? null);
    setDropoffId((v) => v ?? stops.data!.find((s) => s.pointType === 'DROPOFF')?.id ?? null);
  }, [stops.data]);

  // Làm mới sơ đồ mỗi 15 giây và khi tab lấy lại focus.
  const reloadSeats = seatMap.reload;
  useEffect(() => {
    const id = setInterval(reloadSeats, 15000);
    const onFocus = () => document.visibilityState === 'visible' && reloadSeats();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [reloadSeats]);

  // Ghế đang chọn mà vừa có người giữ -> bỏ chọn và báo.
  useEffect(() => {
    if (!seatMap.data) return;
    const lost = seatMap.data.seats.filter((s) => selected.includes(s.id) && s.status !== 'AVAILABLE');
    if (lost.length) {
      setSelected((sel) => sel.filter((id) => !lost.some((s) => s.id === id)));
      toast.error(`Ghế ${lost.map((s) => s.seatName).join(', ')} vừa có người đặt`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatMap.data]);

  const chosen = useMemo(
    () => (seatMap.data?.seats ?? []).filter((s) => selected.includes(s.id)),
    [seatMap.data, selected],
  );
  const subtotal = chosen.reduce((s, x) => s + x.totalPrice, 0);
  const discount = promo && promo.subtotal === subtotal ? promo.discount : 0;

  // Đổi ghế thì tổng tiền đổi -> kiểm tra lại mã.
  useEffect(() => {
    if (!promo || !chosen.length) return;
    validatePromotion(tripId, selected, promo.code)
      .then(setPromo)
      .catch((e) => {
        setPromo(null);
        setPromoError(errorMessage(e));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const toggleSeat = (seat: TripSeatResponse) => {
    if (selected.includes(seat.id)) return setSelected(selected.filter((id) => id !== seat.id));
    if (selected.length >= MAX_SEATS) return toast.error(`Mỗi đơn tối đa ${MAX_SEATS} ghế`);
    setSelected([...selected, seat.id]);
  };

  const applyCode = async () => {
    setPromoError('');
    if (!code.trim()) return;
    if (!selected.length) return setPromoError('Chọn ghế trước khi áp mã');
    try {
      setPromo(await validatePromotion(tripId, selected, code));
      toast.success('Đã áp dụng mã giảm giá');
    } catch (e) {
      setPromo(null);
      setPromoError(errorMessage(e));
    }
  };

  const validateContact = () => {
    const e: Record<string, string> = {};
    if (!contact.name.trim()) e.name = 'Vui lòng nhập họ tên';
    if (!PHONE_REGEX.test(contact.phone.trim())) e.phone = 'Số điện thoại không hợp lệ';
    if (!user && !contact.email.trim()) e.email = 'Khách chưa đăng nhập phải nhập email để nhận vé';
    else if (contact.email && !EMAIL_REGEX.test(contact.email.trim())) e.email = 'Email không hợp lệ';
    if (!agree) e.agree = 'Bạn cần đồng ý với chính sách';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validateContact()) return;
    setSubmitting(true);
    try {
      const b = await holdSeats(user?.id ?? null, {
        tripId,
        seatIds: selected,
        pickupPointId: pickupId,
        dropoffPointId: dropoffId,
        contactName: contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email,
        promotionCode: promo?.code,
      });
      if (b.guestToken) {
        saveGuestTicket({ bookingId: b.id, bookingCode: b.bookingCode, phone: b.contactPhone, guestToken: b.guestToken });
      }
      navigate(`/dat-ve/thanh-toan/${b.id}`, { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
      if (e instanceof ApiError && e.status === 409 && e.message.startsWith('Ghế')) {
        setStep(1);
        seatMap.reload();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (trip.loading || seatMap.loading) {
    return <div className="container-x py-6"><Skeleton className="h-96" /></div>;
  }
  if (trip.error) return <div className="container-x py-6"><ErrorBox message={trip.error} /></div>;
  const t = trip.data!.trip;
  if (t.status !== 'ACTIVE') {
    return (
      <div className="container-x py-6">
        <ErrorBox message={t.status === 'CANCELLED' ? 'Chuyến xe đã bị nhà xe huỷ.' : 'Chuyến xe đã khởi hành, không thể đặt vé.'} />
      </div>
    );
  }

  const next = () => {
    if (step === 1 && !selected.length) return toast.error('Vui lòng chọn ít nhất một ghế');
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  return (
    <div className="container-x py-4">
      <div className="mb-3 text-sm">
        <b>{t.routeName}</b> · {formatDate(t.departureTime)} · {formatTime(t.departureTime)} · {t.companyName}
      </div>
      <div className="card mb-4 px-4 py-3">
        <BookingStepper current={step} />
      </div>
      {!user && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card bg-primary-light px-4 py-3 text-sm">
          <Info size={16} className="text-primary" />
          <span className="flex-1">Đăng nhập để tự điền thông tin và quản lý vé dễ hơn.</span>
          <Link to={`/dang-nhap?redirect=${encodeURIComponent(location.pathname)}`} className="btn-primary h-8">
            Đăng nhập
          </Link>
          <span className="text-muted">hoặc tiếp tục không cần tài khoản</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="card min-w-0 p-4">
          {step === 1 && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-base font-semibold">Chọn ghế ({seatMap.data!.availableSeats} ghế trống)</h2>
                <SeatLegend />
              </div>
              <SeatMap busType={t.busType} seats={seatMap.data!.seats} selected={selected} onToggle={toggleSeat} />
            </>
          )}
          {step === 2 && (
            <div className="grid gap-6 md:grid-cols-2">
              {(['PICKUP', 'DROPOFF'] as const).map((type) => (
                <fieldset key={type} className="m-0 border-0 p-0">
                  <legend className="mb-2 font-semibold">{type === 'PICKUP' ? 'Điểm đón' : 'Điểm trả'}</legend>
                  {stops.loading && <Spinner />}
                  {stops.data
                    ?.filter((s) => s.pointType === type)
                    .map((s) => {
                      const checked = (type === 'PICKUP' ? pickupId : dropoffId) === s.id;
                      return (
                        <label
                          key={s.id}
                          className={`mb-2 flex cursor-pointer gap-3 rounded-card border border-solid p-3 text-sm ${checked ? 'border-primary bg-primary-light/50' : 'border-line'}`}
                        >
                          <input
                            type="radio"
                            name={type}
                            checked={checked}
                            onChange={() => (type === 'PICKUP' ? setPickupId(s.id) : setDropoffId(s.id))}
                          />
                          <span>
                            <b>{formatTime(s.estimatedTime)}</b> · {s.name}
                            <span className="block text-muted">{s.address}</span>
                          </span>
                        </label>
                      );
                    })}
                </fieldset>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="max-w-lg space-y-3">
              <h2 className="m-0 text-base font-semibold">Thông tin liên hệ</h2>
              <Field label="Họ và tên *" error={errors.name}>
                <input className="input" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              </Field>
              <Field label="Số điện thoại * (dùng để tra cứu vé)" error={errors.phone}>
                <input className="input" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </Field>
              <Field label={`Email ${user ? '' : '* (nhận vé điện tử)'}`} error={errors.email}>
                <input className="input" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>
                  Tôi đồng ý với chính sách huỷ vé, hành lý của nhà xe và điều khoản của XeGo.
                  {errors.agree && <span className="block text-xs text-danger">{errors.agree}</span>}
                </span>
              </label>
            </div>
          )}
        </div>

        <aside className="card h-fit p-4 lg:sticky lg:top-20">
          <h3 className="mb-3 mt-0 text-base font-semibold">Tóm tắt</h3>
          <div className="space-y-1 text-sm">
            <Row label="Ghế" value={chosen.length ? chosen.map((s) => s.seatName).join(', ') : '—'} />
            {chosen.length > 0 && <Row label={`Giá vé ${chosen.length} x`} value={formatVND(t.basePrice)} />}
            {chosen.some((s) => s.extraPrice > 0) && (
              <Row label="Phụ thu ghế đôi" value={`+${formatVND(chosen.reduce((s, x) => s + x.extraPrice, 0))}`} />
            )}
            {step >= 2 && pickupId && <Row label="Điểm đón" value={stops.data?.find((s) => s.id === pickupId)?.name ?? ''} />}
            {step >= 2 && dropoffId && <Row label="Điểm trả" value={stops.data?.find((s) => s.id === dropoffId)?.name ?? ''} />}
          </div>
          <div className="mt-3 flex gap-2">
            <input className="input h-9" placeholder="Mã giảm giá" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <button className="btn-ghost h-9 shrink-0" onClick={applyCode}>
              Áp dụng
            </button>
          </div>
          {promoError && <div className="mt-1 text-xs text-danger">{promoError}</div>}
          {discount > 0 && <Row className="mt-2 text-success" label={`Mã ${promo!.code}`} value={`-${formatVND(discount)}`} />}
          <div className="mt-3 flex items-center justify-between border-0 border-t border-solid border-line pt-3">
            <span className="font-semibold">Tổng tiền</span>
            <span className="text-xl font-bold text-primary">{formatVND(subtotal - discount)}</span>
          </div>
          <p className="mb-0 mt-1 text-xs text-muted">Số tiền cuối cùng do hệ thống tính khi giữ chỗ.</p>
          <div className="mt-4 flex gap-2">
            {step > 1 && (
              <button className="btn-ghost" onClick={() => setStep(step - 1)}>
                Quay lại
              </button>
            )}
            {step < 3 ? (
              <button className="btn-cta flex-1" onClick={next}>
                Tiếp tục
              </button>
            ) : (
              <button className="btn-cta flex-1" onClick={submit} disabled={submitting}>
                {submitting ? 'Đang giữ chỗ...' : 'Giữ chỗ & thanh toán'}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between gap-3 ${className}`}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
