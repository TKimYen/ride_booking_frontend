import {
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Download, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  adminAddStopPoint,
  adminCancelTrip,
  adminCompleteTrip,
  adminCreateTrip,
  adminDeleteStopPoint,
  adminDeleteTrip,
  adminGetTrip,
  adminListBookings,
  adminListTrips,
  adminUpdateTrip,
  type AdminTripRow,
} from '../../api/admin.api';
import { getBusTypes, getCompanies, getRoutes } from '../../api/catalog.api';
import { errorMessage } from '../../api/client';
import { getSeatMap, getStopPoints } from '../../api/trips.api';
import SeatMap, { SeatLegend } from '../../components/seat/SeatMap';
import { useAsync, useDocumentTitle } from '../../hooks';
import type { BookingResponse, BusType, TripStatus } from '../../types';
import { BOOKING_STATUS, TRIP_STATUS, formatDateTime, formatTime, formatVND } from '../../utils/format';

function useCatalog() {
  const routes = useAsync(getRoutes, []);
  const companies = useAsync(() => getCompanies(), []);
  const busTypes = useAsync(getBusTypes, []);
  return { routes: routes.data ?? [], companies: companies.data ?? [], busTypes: busTypes.data ?? [] };
}

interface FormValues {
  routeId: number;
  companyId: number;
  busType: BusType;
  departureTime: Dayjs;
  arrivalTime: Dayjs;
  basePrice: number;
}

/** Drawer tạo/sửa chuyến. Giờ đến gợi ý = giờ đi + thời lượng tuyến. */
function TripFormDrawer({ open, row, onClose, onSaved }: { open: boolean; row: AdminTripRow | null; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const { routes, companies, busTypes } = useCatalog();
  const [saving, setSaving] = useState(false);
  const locked = row != null && row.booked + row.holding > 0;

  const suggestArrival = () => {
    const { routeId, departureTime } = form.getFieldsValue();
    const r = routes.find((x) => x.id === routeId);
    if (r && departureTime) form.setFieldValue('arrivalTime', departureTime.add(r.durationMinutes, 'minute'));
  };

  const submit = async (v: FormValues) => {
    setSaving(true);
    try {
      const body = { ...v, departureTime: v.departureTime.format('YYYY-MM-DDTHH:mm:ss'), arrivalTime: v.arrivalTime.format('YYYY-MM-DDTHH:mm:ss') };
      if (row) await adminUpdateTrip(row.trip.id, body);
      else await adminCreateTrip(body);
      message.success(row ? 'Đã cập nhật chuyến' : 'Đã thêm chuyến, ghế đã được sinh tự động');
      onSaved();
      onClose();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={row ? `Sửa chuyến #${row.trip.id}` : 'Thêm chuyến xe'}
      open={open}
      onClose={onClose}
      width={460}
      destroyOnClose
      afterOpenChange={(o) =>
        o &&
        form.setFieldsValue(
          row
            ? {
                routeId: row.trip.routeId,
                companyId: row.trip.companyId,
                busType: row.trip.busType,
                departureTime: dayjs(row.trip.departureTime),
                arrivalTime: dayjs(row.trip.arrivalTime),
                basePrice: row.trip.basePrice,
              }
            : { busType: 'LIMOUSINE_29', basePrice: 300000 },
        )
      }
      extra={<Button type="primary" loading={saving} onClick={() => form.submit()}>Lưu</Button>}
    >
      <Form form={form} layout="vertical" onFinish={submit} preserve={false}>
        <Form.Item name="routeId" label="Tuyến" rules={[{ required: true, message: 'Chọn tuyến' }]}>
          <Select showSearch optionFilterProp="label" options={routes.map((r) => ({ value: r.id, label: r.name }))} onChange={suggestArrival} />
        </Form.Item>
        <Form.Item name="companyId" label="Nhà xe" rules={[{ required: true, message: 'Chọn nhà xe' }]}>
          <Select showSearch optionFilterProp="label" options={companies.map((c) => ({ value: c.id, label: c.name }))} />
        </Form.Item>
        <Form.Item name="busType" label="Loại xe" rules={[{ required: true }]} extra={locked ? 'Đã có ghế bán/giữ nên không đổi được loại xe' : undefined}>
          <Select disabled={locked} options={busTypes.map((b) => ({ value: b.code, label: `${b.name} · ${b.seatCount} ghế · ${b.floors} tầng` }))} />
        </Form.Item>
        <Form.Item name="departureTime" label="Giờ khởi hành" rules={[{ required: true, message: 'Chọn giờ đi' }]}>
          <DatePicker showTime={{ format: 'HH:mm' }} format="HH:mm DD/MM/YYYY" style={{ width: '100%' }} onChange={suggestArrival} />
        </Form.Item>
        <Form.Item
          name="arrivalTime"
          label="Giờ đến"
          dependencies={['departureTime']}
          rules={[
            { required: true, message: 'Chọn giờ đến' },
            ({ getFieldValue }) => ({
              validator: (_, v: Dayjs) =>
                !v || !getFieldValue('departureTime') || v.isAfter(getFieldValue('departureTime')) ? Promise.resolve() : Promise.reject(new Error('Giờ đến phải sau giờ khởi hành')),
            }),
          ]}
        >
          <DatePicker showTime={{ format: 'HH:mm' }} format="HH:mm DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="basePrice" label="Giá cơ bản (đ)" rules={[{ required: true }, { type: 'number', min: 10000, message: 'Giá tối thiểu 10.000đ' }]}>
          <InputNumber style={{ width: '100%' }} step={10000} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(v) => Number(v?.replace(/\./g, ''))} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

/** Hành động trên một chuyến, dùng chung ở bảng và trang chi tiết. */
function useTripActions(onDone: () => void) {
  const { message, modal } = App.useApp();
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      message.success(ok);
      onDone();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };
  return {
    remove: (id: number) => run(() => adminDeleteTrip(id), 'Đã xoá chuyến'),
    complete: (id: number) => run(() => adminCompleteTrip(id), 'Đã hoàn tất chuyến, đơn PAID chuyển sang Đã đi'),
    cancel: (row: AdminTripRow) =>
      modal.confirm({
        title: `Huỷ chuyến ${row.trip.routeName} ${formatTime(row.trip.departureTime)}?`,
        content: `Trả lại ${row.booked + row.holding} ghế, huỷ mọi đơn chờ thanh toán và đã thanh toán. Không hoàn tác được.`,
        okText: 'Huỷ chuyến',
        okButtonProps: { danger: true },
        cancelText: 'Đóng',
        onOk: async () => {
          try {
            const r = await adminCancelTrip(row.trip.id);
            modal.info({
              title: 'Đã huỷ chuyến',
              content: (
                <div>
                  <p>Đã huỷ {r.cancelledBookings} đơn, trả {r.releasedSeats} ghế.</p>
                  {r.paidBookingIdsToRefund.length > 0 ? (
                    <p>Đơn cần hoàn tiền: <b>{r.paidBookingIdsToRefund.map((id) => `#${id}`).join(', ')}</b></p>
                  ) : (
                    <p>Không có đơn nào cần hoàn tiền.</p>
                  )}
                </div>
              ),
            });
            onDone();
          } catch (e) {
            message.error(errorMessage(e));
          }
        },
      }),
  };
}

function TripActions({ row, onEdit, actions }: { row: AdminTripRow; onEdit: () => void; actions: ReturnType<typeof useTripActions> }) {
  const active = row.trip.status === 'ACTIVE';
  return (
    <Space size={4} wrap>
      <Button size="small" onClick={onEdit} disabled={!active}>Sửa</Button>
      {active && <Popconfirm title="Đánh dấu chuyến đã chạy xong?" onConfirm={() => actions.complete(row.trip.id)}><Button size="small">Hoàn tất ngay</Button></Popconfirm>}
      {active && <Button size="small" danger onClick={() => actions.cancel(row)}>Huỷ chuyến</Button>}
      {row.booked + row.holding === 0 && (
        <Popconfirm title="Xoá chuyến này?" onConfirm={() => actions.remove(row.trip.id)}>
          <Button size="small" danger type="text">Xoá</Button>
        </Popconfirm>
      )}
    </Space>
  );
}

export function TripsPage() {
  useDocumentTitle('Quản lý chuyến xe');
  const [params, setParams] = useSearchParams();
  const { routes, companies } = useCatalog();
  const q = {
    status: (params.get('status') as TripStatus) || undefined,
    routeId: params.get('routeId') ? Number(params.get('routeId')) : undefined,
    companyId: params.get('companyId') ? Number(params.get('companyId')) : undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    page: Number(params.get('page') ?? 0),
    size: 20,
  };
  const { data, loading, reload } = useAsync(() => adminListTrips(q), [params.toString()]);
  const [drawer, setDrawer] = useState<{ open: boolean; row: AdminTripRow | null }>({ open: false, row: null });
  const actions = useTripActions(reload);
  const set = (patch: Record<string, string | number | undefined | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v == null || v === '' ? next.delete(k) : next.set(k, String(v))));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  return (
    <Card
      title="Chuyến xe"
      extra={<Button type="primary" onClick={() => setDrawer({ open: true, row: null })}>+ Thêm chuyến</Button>}
    >
      <Space wrap className="mb-4">
        <Select allowClear placeholder="Trạng thái" style={{ width: 140 }} value={q.status} onChange={(v) => set({ status: v })} options={(Object.keys(TRIP_STATUS) as TripStatus[]).map((s) => ({ value: s, label: TRIP_STATUS[s].label }))} />
        <Select allowClear showSearch optionFilterProp="label" placeholder="Tuyến" style={{ width: 220 }} value={q.routeId} onChange={(v) => set({ routeId: v })} options={routes.map((r) => ({ value: r.id, label: r.name }))} />
        <Select allowClear placeholder="Nhà xe" style={{ width: 180 }} value={q.companyId} onChange={(v) => set({ companyId: v })} options={companies.map((c) => ({ value: c.id, label: c.name }))} />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          value={q.from && q.to ? [dayjs(q.from), dayjs(q.to)] : null}
          onChange={(v) => set({ from: v?.[0]?.format('YYYY-MM-DD'), to: v?.[1]?.format('YYYY-MM-DD') })}
        />
      </Space>
      <Table
        rowKey={(r) => r.trip.id}
        loading={loading}
        dataSource={data?.content}
        scroll={{ x: 1100 }}
        pagination={{ current: (q.page ?? 0) + 1, pageSize: 20, total: data?.totalElements, showSizeChanger: false, onChange: (p) => set({ page: p - 1 }) }}
        columns={[
          { title: 'ID', render: (_, r) => <Link to={`/admin/chuyen-xe/${r.trip.id}`}>#{r.trip.id}</Link>, width: 70 },
          { title: 'Tuyến', render: (_, r) => r.trip.routeName },
          { title: 'Nhà xe', render: (_, r) => r.trip.companyName },
          { title: 'Loại xe', render: (_, r) => r.trip.busTypeName },
          { title: 'Khởi hành', render: (_, r) => formatDateTime(r.trip.departureTime), width: 140 },
          { title: 'Giá', render: (_, r) => formatVND(r.trip.basePrice), width: 110 },
          {
            title: 'Đã bán/Tổng',
            width: 140,
            render: (_, r) => (
              <div>
                <Progress percent={Math.round((r.booked / r.total) * 100)} size="small" showInfo={false} />
                <span className="text-xs">{r.booked}/{r.total}{r.holding > 0 && ` · ${r.holding} đang giữ`}</span>
              </div>
            ),
          },
          { title: 'Trạng thái', width: 100, render: (_, r) => <Tag color={TRIP_STATUS[r.trip.status].tag}>{TRIP_STATUS[r.trip.status].label}</Tag> },
          { title: 'Hành động', width: 260, render: (_, r) => <TripActions row={r} actions={actions} onEdit={() => setDrawer({ open: true, row: r })} /> },
        ]}
      />
      <TripFormDrawer open={drawer.open} row={drawer.row} onClose={() => setDrawer({ open: false, row: null })} onSaved={reload} />
    </Card>
  );
}

// ---------------- Chi tiết chuyến ----------------
function passengersCsv(rows: BookingResponse[]) {
  const header = ['Ghế', 'Tên', 'SĐT', 'Điểm đón', 'Điểm trả', 'Trạng thái', 'Mã vé'];
  const lines = rows.flatMap((b) =>
    b.seats.map((s) => [s.seatName, b.contactName, b.contactPhone, b.pickupPoint?.name ?? '', b.dropoffPoint?.name ?? '', BOOKING_STATUS[b.status].label, b.bookingCode]),
  );
  const csv = [header, ...lines].map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hanh-khach.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function TripDetailAdminPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const trip = useAsync(() => adminGetTrip(id), [id]);
  const seats = useAsync(() => getSeatMap(id), [id]);
  const stops = useAsync(() => getStopPoints(id), [id]);
  const passengers = useAsync(() => adminListBookings({ tripId: id, statuses: ['PENDING', 'PAID', 'COMPLETED'], size: 100 }), [id]);
  const [drawer, setDrawer] = useState(false);
  const [stopForm] = Form.useForm();
  const reloadAll = () => {
    trip.reload();
    seats.reload();
    passengers.reload();
  };
  const actions = useTripActions(reloadAll);
  useDocumentTitle(`Chuyến #${id}`);

  if (trip.loading && !trip.data) return <Card loading />;
  if (trip.error) return <Card>{trip.error} <Button onClick={() => navigate('/admin/chuyen-xe')}>Quay lại</Button></Card>;
  const row = trip.data!;
  const t = row.trip;
  const owner = new Map<number, string>();
  passengers.data?.content.forEach((b) => b.seats.forEach((s) => owner.set(s.seatId, `${b.contactName} (${b.contactPhone})`)));
  const sortedPassengers = [...(passengers.data?.content ?? [])].sort((a, b) => (a.pickupPoint?.name ?? '').localeCompare(b.pickupPoint?.name ?? ''));

  const addStop = async (v: { name: string; address: string; pointType: 'PICKUP' | 'DROPOFF'; estimatedTime: Dayjs }) => {
    try {
      await adminAddStopPoint(id, { ...v, estimatedTime: v.estimatedTime.format('YYYY-MM-DDTHH:mm:ss') });
      message.success('Đã thêm điểm dừng');
      stopForm.resetFields();
      stops.reload();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  return (
    <Card
      title={
        <span>
          <Link to="/admin/chuyen-xe">Chuyến xe</Link> / #{t.id} {t.routeName} <Tag color={TRIP_STATUS[t.status].tag}>{TRIP_STATUS[t.status].label}</Tag>
        </span>
      }
      extra={<TripActions row={row} actions={actions} onEdit={() => setDrawer(true)} />}
    >
      <Tabs
        items={[
          {
            key: 'info',
            label: 'Thông tin',
            children: (
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div><div className="text-muted">Nhà xe</div><b>{t.companyName}</b></div>
                <div><div className="text-muted">Loại xe</div><b>{t.busTypeName}</b></div>
                <div><div className="text-muted">Giá cơ bản</div><b>{formatVND(t.basePrice)}</b></div>
                <div><div className="text-muted">Khởi hành</div><b>{formatDateTime(t.departureTime)}</b></div>
                <div><div className="text-muted">Đến</div><b>{formatDateTime(t.arrivalTime)}</b></div>
                <div><div className="text-muted">Ghế</div><b>{row.booked} đã bán · {row.holding} đang giữ · {row.total} tổng</b></div>
              </div>
            ),
          },
          {
            key: 'stops',
            label: 'Điểm đón/trả',
            children: (
              <>
                <Table
                  size="small"
                  rowKey="id"
                  loading={stops.loading}
                  dataSource={stops.data ?? []}
                  pagination={false}
                  columns={[
                    { title: 'Loại', dataIndex: 'pointType', render: (v) => (v === 'PICKUP' ? <Tag color="blue">Đón</Tag> : <Tag color="purple">Trả</Tag>), width: 80 },
                    { title: 'Thứ tự', dataIndex: 'stopOrder', width: 70 },
                    { title: 'Tên', dataIndex: 'name' },
                    { title: 'Địa chỉ', dataIndex: 'address' },
                    { title: 'Giờ dự kiến', dataIndex: 'estimatedTime', render: formatDateTime, width: 140 },
                    {
                      title: '',
                      width: 60,
                      render: (_, s) => (
                        <Popconfirm title="Xoá điểm này?" onConfirm={() => adminDeleteStopPoint(id, s.id).then(stops.reload)}>
                          <Button size="small" danger type="text">Xoá</Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
                {t.status !== 'CANCELLED' && (
                  <Form form={stopForm} layout="inline" className="mt-4" onFinish={addStop} initialValues={{ pointType: 'PICKUP' }}>
                    <Form.Item name="pointType"><Select style={{ width: 90 }} options={[{ value: 'PICKUP', label: 'Đón' }, { value: 'DROPOFF', label: 'Trả' }]} /></Form.Item>
                    <Form.Item name="name" rules={[{ required: true, message: 'Nhập tên' }]}><Input placeholder="Tên điểm" /></Form.Item>
                    <Form.Item name="address"><Input placeholder="Địa chỉ" /></Form.Item>
                    <Form.Item name="estimatedTime" rules={[{ required: true, message: 'Chọn giờ' }]}><DatePicker showTime={{ format: 'HH:mm' }} format="HH:mm DD/MM" /></Form.Item>
                    <Button type="primary" htmlType="submit">Thêm</Button>
                  </Form>
                )}
              </>
            ),
          },
          {
            key: 'seats',
            label: 'Sơ đồ ghế',
            children: seats.data && (
              <div className="space-y-3">
                <SeatLegend />
                <SeatMap busType={t.busType} seats={seats.data.seats} selected={[]} readOnly ownerOf={(sid) => owner.get(sid)} />
                <p className="m-0 text-xs text-muted">Di chuột vào ghế đã bán để xem tên hành khách.</p>
              </div>
            ),
          },
          {
            key: 'passengers',
            label: `Hành khách (${sortedPassengers.reduce((n, b) => n + b.seats.length, 0)})`,
            children: (
              <>
                <Space className="no-print mb-3">
                  <Button icon={<Printer size={14} />} onClick={() => window.print()}>In danh sách</Button>
                  <Button icon={<Download size={14} />} onClick={() => passengersCsv(sortedPassengers)}>Xuất CSV</Button>
                </Space>
                <Table
                  size="small"
                  rowKey={(r) => `${r.booking.id}-${r.seat}`}
                  loading={passengers.loading}
                  pagination={false}
                  dataSource={sortedPassengers.flatMap((b) => b.seats.map((s) => ({ booking: b, seat: s.seatName })))}
                  columns={[
                    { title: 'Ghế', dataIndex: 'seat', width: 70 },
                    { title: 'Tên', render: (_, r) => r.booking.contactName },
                    { title: 'SĐT', render: (_, r) => r.booking.contactPhone },
                    { title: 'Điểm đón', render: (_, r) => r.booking.pickupPoint?.name },
                    { title: 'Điểm trả', render: (_, r) => r.booking.dropoffPoint?.name },
                    { title: 'Thanh toán', render: (_, r) => <Tag color={BOOKING_STATUS[r.booking.status].tag}>{BOOKING_STATUS[r.booking.status].label}</Tag> },
                    { title: 'Mã vé', render: (_, r) => <span className="font-mono">{r.booking.bookingCode}</span> },
                  ]}
                />
              </>
            ),
          },
        ]}
      />
      <TripFormDrawer open={drawer} row={row} onClose={() => setDrawer(false)} onSaved={reloadAll} />
    </Card>
  );
}
