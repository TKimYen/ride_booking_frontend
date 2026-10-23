import { QRCodeSVG } from 'qrcode.react';
import type { BookingResponse } from '../../types';
import { BUS_TYPE_NAME, PAYMENT_STATUS, formatDate, formatDateTime, formatTime, formatVND } from '../../utils/format';
import { StatusBadge } from '../common';

/** Vé điện tử: mã vé + QR (sinh ở FE từ bookingCode), chuyến, ghế, điểm đón/trả, thanh toán. */
export default function TicketView({ b }: { b: BookingResponse }) {
  const showQr = b.status === 'PAID' || b.status === 'COMPLETED';
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary px-5 py-4 text-white">
        <div>
          <div className="text-xs opacity-80">Mã vé</div>
          <div className="font-mono text-2xl font-bold tracking-widest">{b.bookingCode}</div>
        </div>
        <StatusBadge status={b.status} />
      </div>
      {b.trip.status === 'CANCELLED' && (
        <div className="bg-red-50 px-5 py-2 text-sm text-danger">Nhà xe đã huỷ chuyến này. {b.payment && 'Bạn sẽ được hoàn tiền.'}</div>
      )}
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-base font-semibold">{b.trip.routeName}</div>
            <div className="text-muted">
              {b.trip.companyName} · {BUS_TYPE_NAME[b.trip.busType]}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Khởi hành" value={`${formatTime(b.trip.departureTime)} · ${formatDate(b.trip.departureTime)}`} />
            <Info label="Dự kiến đến" value={`${formatTime(b.trip.arrivalTime)} · ${formatDate(b.trip.arrivalTime)}`} />
            <Info label="Điểm đón" value={b.pickupPoint ? `${formatTime(b.pickupPoint.estimatedTime)} · ${b.pickupPoint.name}` : '—'} sub={b.pickupPoint?.address} />
            <Info label="Điểm trả" value={b.dropoffPoint?.name ?? '—'} sub={b.dropoffPoint?.address} />
            <Info label="Ghế" value={b.seats.map((s) => s.seatName).join(', ')} />
            <Info label="Hành khách" value={b.contactName} sub={`${b.contactPhone} · ${b.contactEmail}`} />
          </div>
          <div className="rounded-card bg-bg p-3">
            {b.seats.map((s) => (
              <div key={s.seatId} className="flex justify-between">
                <span>Ghế {s.seatName}</span>
                <span>{formatVND(s.price)}</span>
              </div>
            ))}
            {!!b.discountAmount && (
              <div className="flex justify-between text-success">
                <span>Giảm giá {b.promotionCode}</span>
                <span>-{formatVND(b.discountAmount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-0 border-t border-solid border-line pt-1 font-semibold">
              <span>Tổng tiền</span>
              <span className="text-primary">{formatVND(b.totalPrice)}</span>
            </div>
          </div>
          {b.payment && (
            <div className="text-xs text-muted">
              Thanh toán {b.payment.gateway} · {PAYMENT_STATUS[b.payment.status]} · Mã GD {b.payment.transactionNo} ·{' '}
              {formatDateTime(b.payment.createdAt)}
            </div>
          )}
          {b.cancelReason && <div className="text-xs text-danger">Lý do huỷ: {b.cancelReason}</div>}
        </div>
        {showQr && (
          <div className="flex flex-col items-center gap-2">
            <QRCodeSVG value={b.bookingCode} size={148} />
            <span className="text-xs text-muted">Xuất trình mã khi lên xe</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-medium">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
