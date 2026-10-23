import { App, Button, Card, DatePicker, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Rate, Select, Space, Switch, Table, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  adminCancelBooking,
  adminDeletePromotion,
  adminListBookings,
  adminListPromotions,
  adminListReviews,
  adminListUsers,
  adminSavePromotion,
  adminSetReviewHidden,
  adminUnlockUser,
  type PromotionForm,
} from '../../api/admin.api';
import { getCompanies, getRoutes } from '../../api/catalog.api';
import { errorMessage } from '../../api/client';
import { isUsable } from '../../api/promotions.api';
import { useAsync, useDocumentTitle } from '../../hooks';
import type { BookingResponse, BookingStatus, PromotionResponse } from '../../types';
import { BOOKING_STATUS, PAYMENT_STATUS, formatDateTime, formatVND } from '../../utils/format';

function useQueryState() {
  const [params, setParams] = useSearchParams();
  const set = (patch: Record<string, string | number | boolean | undefined | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v == null || v === '' ? next.delete(k) : next.set(k, String(v))));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };
  return { params, set };
}

// ---------------- Đơn hàng ----------------
export function BookingsAdminPage() {
  useDocumentTitle('Quản lý đơn hàng');
  const { message } = App.useApp();
  const { params, set } = useQueryState();
  const q = {
    keyword: params.get('keyword') || undefined,
    statuses: (params.get('status')?.split(',').filter(Boolean) ?? []) as BookingStatus[],
    tripId: params.get('tripId') ? Number(params.get('tripId')) : undefined,
    guest: params.get('guest') == null ? undefined : params.get('guest') === 'true',
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    page: Number(params.get('page') ?? 0),
    size: 20,
  };
  const { data, loading, reload } = useAsync(() => adminListBookings(q), [params.toString()]);
  const [detail, setDetail] = useState<BookingResponse | null>(null);
  const [cancelling, setCancelling] = useState<BookingResponse | null>(null);
  const [reason, setReason] = useState('');

  const doCancel = async () => {
    if (!cancelling) return;
    try {
      const r = await adminCancelBooking(cancelling.id, reason);
      message.success(r.needRefund ? `Đã huỷ đơn ${r.bookingCode}. Đơn đã thanh toán — nhớ hoàn tiền ${formatVND(r.totalPrice)}.` : `Đã huỷ đơn ${r.bookingCode}`);
      setCancelling(null);
      setDetail(null);
      setReason('');
      reload();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  return (
    <Card title="Đơn hàng">
      <Space wrap className="mb-4">
        <Input.Search allowClear placeholder="Mã vé, tên, SĐT, email" defaultValue={q.keyword} onSearch={(v) => set({ keyword: v })} style={{ width: 260 }} />
        <Select
          mode="multiple"
          allowClear
          placeholder="Trạng thái"
          style={{ minWidth: 200 }}
          value={q.statuses}
          onChange={(v: string[]) => set({ status: v.join(',') })}
          options={(Object.keys(BOOKING_STATUS) as BookingStatus[]).map((s) => ({ value: s, label: BOOKING_STATUS[s].label }))}
        />
        <Select allowClear placeholder="Loại khách" style={{ width: 140 }} value={q.guest == null ? undefined : String(q.guest)} onChange={(v) => set({ guest: v })} options={[{ value: 'true', label: 'Khách vãng lai' }, { value: 'false', label: 'Thành viên' }]} />
        <DatePicker.RangePicker format="DD/MM/YYYY" value={q.from && q.to ? [dayjs(q.from), dayjs(q.to)] : null} onChange={(v) => set({ from: v?.[0]?.format('YYYY-MM-DD'), to: v?.[1]?.format('YYYY-MM-DD') })} />
        {q.tripId && <Tag closable onClose={() => set({ tripId: null })}>Chuyến #{q.tripId}</Tag>}
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.content}
        scroll={{ x: 1100 }}
        onRow={(b) => ({ onClick: () => setDetail(b), style: { cursor: 'pointer' } })}
        pagination={{ current: q.page + 1, pageSize: 20, total: data?.totalElements, showSizeChanger: false, onChange: (p) => set({ page: p - 1 }) }}
        columns={[
          { title: 'Mã vé', dataIndex: 'bookingCode', render: (v) => <span className="font-mono font-semibold">{v}</span>, width: 110 },
          {
            title: 'Khách',
            render: (_, b) => (
              <div>
                <div>{b.contactName} {b.guest ? <Tag>Guest</Tag> : <Tag color="blue">Thành viên</Tag>}</div>
                <div className="text-xs text-muted">{b.contactPhone} · {b.contactEmail}</div>
              </div>
            ),
          },
          { title: 'Chuyến', render: (_, b) => <div><div>{b.trip.routeName}</div><div className="text-xs text-muted">{formatDateTime(b.trip.departureTime)}</div></div> },
          { title: 'Ghế', render: (_, b) => b.seats.map((s) => s.seatName).join(', '), width: 110 },
          { title: 'Tổng tiền', dataIndex: 'totalPrice', render: formatVND, width: 110 },
          { title: 'Trạng thái', dataIndex: 'status', render: (s: BookingStatus) => <Tag color={BOOKING_STATUS[s].tag}>{BOOKING_STATUS[s].label}</Tag>, width: 140 },
          { title: 'Thanh toán', render: (_, b) => (b.payment ? <span className="text-xs">{b.payment.gateway}<br />{b.payment.transactionNo}</span> : '—'), width: 150 },
          { title: 'Đặt lúc', dataIndex: 'createdAt', render: formatDateTime, width: 130 },
        ]}
      />
      <Drawer title={detail ? `Đơn ${detail.bookingCode}` : ''} open={detail != null} onClose={() => setDetail(null)} width={520}>
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Trạng thái"><Tag color={BOOKING_STATUS[detail.status].tag}>{BOOKING_STATUS[detail.status].label}</Tag></Descriptions.Item>
              <Descriptions.Item label="Khách">{detail.contactName} · {detail.contactPhone} · {detail.contactEmail} {detail.guest && <Tag>Guest</Tag>}</Descriptions.Item>
              <Descriptions.Item label="Chuyến"><Link to={`/admin/chuyen-xe/${detail.trip.id}`}>#{detail.trip.id} {detail.trip.routeName}</Link> · {formatDateTime(detail.trip.departureTime)}</Descriptions.Item>
              <Descriptions.Item label="Nhà xe">{detail.trip.companyName}</Descriptions.Item>
              <Descriptions.Item label="Ghế">{detail.seats.map((s) => `${s.seatName} (${formatVND(s.price)})`).join(', ')}</Descriptions.Item>
              <Descriptions.Item label="Điểm đón">{detail.pickupPoint?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Điểm trả">{detail.dropoffPoint?.name ?? '—'}</Descriptions.Item>
              {!!detail.discountAmount && <Descriptions.Item label="Giảm giá">{detail.promotionCode} · -{formatVND(detail.discountAmount)}</Descriptions.Item>}
              <Descriptions.Item label="Tổng tiền"><b>{formatVND(detail.totalPrice)}</b></Descriptions.Item>
              <Descriptions.Item label="Thanh toán">
                {detail.payment ? `${detail.payment.gateway} · ${PAYMENT_STATUS[detail.payment.status]} · ${detail.payment.transactionNo} · ${formatDateTime(detail.payment.createdAt)}` : 'Chưa thanh toán'}
              </Descriptions.Item>
              <Descriptions.Item label="Đặt lúc">{formatDateTime(detail.createdAt)}</Descriptions.Item>
              {detail.cancelReason && <Descriptions.Item label="Lý do huỷ">{detail.cancelReason}</Descriptions.Item>}
            </Descriptions>
            <Space className="mt-4">
              {(detail.status === 'PENDING' || detail.status === 'PAID') && <Button danger onClick={() => setCancelling(detail)}>Huỷ đơn</Button>}
              <Button onClick={() => message.info('Đã gửi lại email vé (giả lập)')} disabled={detail.status !== 'PAID'}>Gửi lại email vé</Button>
            </Space>
          </>
        )}
      </Drawer>
      <Modal open={cancelling != null} title={`Huỷ đơn ${cancelling?.bookingCode}`} onCancel={() => setCancelling(null)} onOk={doCancel} okText="Huỷ đơn" okButtonProps={{ danger: true }}>
        {cancelling?.status === 'PAID' && <p className="text-danger">Đơn đã thanh toán {formatVND(cancelling.totalPrice)} — cần hoàn tiền cho khách sau khi huỷ.</p>}
        <Input.TextArea rows={3} placeholder="Lý do huỷ (gửi cho khách)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </Card>
  );
}

// ---------------- Khuyến mãi ----------------
type PromoFormValues = Omit<PromotionForm, 'startsAt' | 'endsAt'> & { period: [Dayjs, Dayjs] };

export function PromotionsAdminPage() {
  useDocumentTitle('Khuyến mãi');
  const { message } = App.useApp();
  const { data, loading, reload } = useAsync(adminListPromotions, []);
  const companies = useAsync(() => getCompanies(), []);
  const routes = useAsync(getRoutes, []);
  const [editing, setEditing] = useState<PromotionResponse | null | 'new'>(null);
  const [form] = Form.useForm<PromoFormValues>();
  const discountType = Form.useWatch('discountType', form);

  const open = (p: PromotionResponse | 'new') => {
    form.resetFields();
    if (p !== 'new') form.setFieldsValue({ ...p, period: [dayjs(p.startsAt), dayjs(p.endsAt)] });
    setEditing(p);
  };
  const submit = async (v: PromoFormValues) => {
    const { period, ...rest } = v;
    try {
      await adminSavePromotion(editing === 'new' ? null : (editing as PromotionResponse).id, {
        ...rest,
        description: rest.description ?? '',
        bannerUrl: rest.bannerUrl ?? '',
        maxDiscount: rest.maxDiscount ?? null,
        minOrderValue: rest.minOrderValue ?? 0,
        companyId: rest.companyId ?? null,
        routeId: rest.routeId ?? null,
        usageLimit: rest.usageLimit ?? null,
        startsAt: period[0].format('YYYY-MM-DDTHH:mm:ss'),
        endsAt: period[1].format('YYYY-MM-DDTHH:mm:ss'),
      });
      message.success('Đã lưu khuyến mãi');
      setEditing(null);
      reload();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  return (
    <Card title="Khuyến mãi" extra={<Button type="primary" onClick={() => open('new')}>+ Thêm mã</Button>}>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data ?? []}
        scroll={{ x: 1000 }}
        columns={[
          { title: 'Mã', dataIndex: 'code', render: (v) => <span className="font-mono font-semibold">{v}</span>, width: 120 },
          { title: 'Tiêu đề', dataIndex: 'title' },
          { title: 'Giảm', render: (_, p) => (p.discountType === 'PERCENT' ? `${p.discountValue}%${p.maxDiscount ? ` (≤ ${formatVND(p.maxDiscount)})` : ''}` : formatVND(p.discountValue)), width: 160 },
          { title: 'Phạm vi', render: (_, p) => p.companyName ?? p.routeName ?? 'Toàn hệ thống', width: 160 },
          { title: 'Thời gian', render: (_, p) => `${dayjs(p.startsAt).format('DD/MM')} – ${dayjs(p.endsAt).format('DD/MM/YYYY')}`, width: 150 },
          { title: 'Đã dùng', render: (_, p) => `${p.usedCount}/${p.usageLimit ?? '∞'}`, width: 90 },
          {
            title: 'Trạng thái',
            width: 130,
            render: (_, p) => (
              <Space size={2} wrap>
                {isUsable(p) ? <Tag color="green">Hiệu lực</Tag> : <Tag>{p.active ? 'Hết hạn/hết lượt' : 'Đã tắt'}</Tag>}
                {p.featured && <Tag color="gold">Nổi bật</Tag>}
              </Space>
            ),
          },
          {
            title: '',
            width: 130,
            render: (_, p) => (
              <Space>
                <Button size="small" onClick={() => open(p)}>Sửa</Button>
                <Popconfirm title="Xoá mã?" onConfirm={() => adminDeletePromotion(p.id).then(reload).catch((e) => message.error(errorMessage(e)))}>
                  <Button size="small" danger type="text">Xoá</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal open={editing != null} title={editing === 'new' ? 'Thêm khuyến mãi' : 'Sửa khuyến mãi'} onCancel={() => setEditing(null)} onOk={() => form.submit()} width={640} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={submit} initialValues={{ discountType: 'PERCENT', active: true, featured: false, minOrderValue: 0 }}>
          <Space.Compact block>
            <Form.Item name="code" label="Mã" rules={[{ required: true }]} style={{ flex: 1 }}><Input style={{ textTransform: 'uppercase' }} /></Form.Item>
            <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]} style={{ flex: 2 }}><Input /></Form.Item>
          </Space.Compact>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="bannerUrl" label="Banner (URL)"><Input /></Form.Item>
          <Space wrap>
            <Form.Item name="discountType" label="Loại giảm"><Select style={{ width: 130 }} options={[{ value: 'PERCENT', label: 'Phần trăm' }, { value: 'FIXED', label: 'Số tiền' }]} /></Form.Item>
            <Form.Item name="discountValue" label={discountType === 'PERCENT' ? 'Giá trị (%)' : 'Giá trị (đ)'} rules={[{ required: true }]}><InputNumber min={1} max={discountType === 'PERCENT' ? 100 : undefined} /></Form.Item>
            {discountType === 'PERCENT' && <Form.Item name="maxDiscount" label="Giảm tối đa (đ)"><InputNumber min={0} step={10000} /></Form.Item>}
            <Form.Item name="minOrderValue" label="Đơn tối thiểu (đ)"><InputNumber min={0} step={10000} /></Form.Item>
          </Space>
          <Space wrap>
            <Form.Item name="companyId" label="Nhà xe"><Select allowClear placeholder="Mọi nhà xe" style={{ width: 200 }} options={companies.data?.map((c) => ({ value: c.id, label: c.name }))} /></Form.Item>
            <Form.Item name="routeId" label="Tuyến"><Select allowClear showSearch optionFilterProp="label" placeholder="Mọi tuyến" style={{ width: 220 }} options={routes.data?.map((r) => ({ value: r.id, label: r.name }))} /></Form.Item>
          </Space>
          <Space wrap>
            <Form.Item name="period" label="Thời gian áp dụng" rules={[{ required: true }]}><DatePicker.RangePicker showTime={{ format: 'HH:mm' }} format="HH:mm DD/MM/YYYY" /></Form.Item>
            <Form.Item name="usageLimit" label="Giới hạn lượt"><InputNumber min={1} placeholder="Không giới hạn" /></Form.Item>
          </Space>
          <Space>
            <Form.Item name="featured" label="Nổi bật ở Trang chủ" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="active" label="Bật" valuePropName="checked"><Switch /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}

// ---------------- Đánh giá ----------------
export function ReviewsAdminPage() {
  useDocumentTitle('Kiểm duyệt đánh giá');
  const { params, set } = useQueryState();
  const q = {
    companyId: params.get('companyId') ? Number(params.get('companyId')) : undefined,
    rating: params.get('rating') ? Number(params.get('rating')) : undefined,
    page: Number(params.get('page') ?? 0),
  };
  const { data, loading, reload } = useAsync(() => adminListReviews(q), [params.toString()]);
  const companies = useAsync(() => getCompanies(), []);
  return (
    <Card title="Đánh giá">
      <Space wrap className="mb-4">
        <Select allowClear placeholder="Nhà xe" style={{ width: 200 }} value={q.companyId} onChange={(v) => set({ companyId: v })} options={companies.data?.map((c) => ({ value: c.id, label: c.name }))} />
        <Select allowClear placeholder="Số sao" style={{ width: 120 }} value={q.rating} onChange={(v) => set({ rating: v })} options={[5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} sao` }))} />
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.content}
        scroll={{ x: 900 }}
        pagination={{ current: q.page + 1, pageSize: 20, total: data?.totalElements, showSizeChanger: false, onChange: (p) => set({ page: p - 1 }) }}
        columns={[
          { title: 'Nhà xe', dataIndex: 'companyName', width: 150 },
          { title: 'Chuyến', dataIndex: 'routeName', width: 170 },
          { title: 'Người đánh giá', dataIndex: 'userDisplayName', width: 160 },
          { title: 'Sao', dataIndex: 'rating', render: (v) => <Rate disabled value={v} style={{ fontSize: 12 }} />, width: 130 },
          { title: 'Nội dung', dataIndex: 'comment' },
          { title: 'Ngày', dataIndex: 'createdAt', render: formatDateTime, width: 130 },
          {
            title: 'Hiển thị',
            width: 100,
            render: (_, r) => <Switch checked={!r.hidden} checkedChildren="Hiện" unCheckedChildren="Ẩn" onChange={(on) => adminSetReviewHidden(r.id, !on).then(reload)} />,
          },
        ]}
      />
    </Card>
  );
}

// ---------------- Người dùng ----------------
export function UsersAdminPage() {
  useDocumentTitle('Người dùng');
  const { message } = App.useApp();
  const { params, set } = useQueryState();
  const q = { keyword: params.get('keyword') || undefined, page: Number(params.get('page') ?? 0) };
  const { data, loading, reload } = useAsync(() => adminListUsers(q), [params.toString()]);
  return (
    <Card title="Người dùng">
      <Input.Search allowClear className="mb-4" style={{ maxWidth: 320 }} placeholder="Tên, email, SĐT" defaultValue={q.keyword} onSearch={(v) => set({ keyword: v })} />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.content}
        scroll={{ x: 1000 }}
        pagination={{ current: q.page + 1, pageSize: 20, total: data?.totalElements, showSizeChanger: false, onChange: (p) => set({ page: p - 1 }) }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: 'Họ tên', dataIndex: 'fullName' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'SĐT', dataIndex: 'phone', width: 120 },
          { title: 'Vai trò', dataIndex: 'role', render: (v) => <Tag color={v === 'ADMIN' ? 'purple' : 'default'}>{v}</Tag>, width: 90 },
          { title: 'Xác minh email', dataIndex: 'emailVerified', render: (v) => (v ? <Tag color="green">Đã xác minh</Tag> : <Tag>Chưa</Tag>), width: 130 },
          { title: 'Đăng nhập cuối', dataIndex: 'lastLoginAt', render: formatDateTime, width: 140 },
          { title: 'Số đơn', dataIndex: 'bookingCount', width: 80 },
          {
            title: '',
            width: 110,
            render: (_, u) =>
              u.locked ? (
                <Button size="small" onClick={() => adminUnlockUser(u.id).then(() => (message.success('Đã gỡ khoá đăng nhập'), reload()))}>Gỡ khoá</Button>
              ) : null,
          },
        ]}
      />
    </Card>
  );
}
