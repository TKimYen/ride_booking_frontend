import { Card, Col, DatePicker, Progress, Row, Segmented, Select, Skeleton, Statistic, Table, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { statsRevenueDaily, statsSummary, statsTopRoutes, statsUpcomingTrips } from '../../api/admin.api';
import { getCompanies } from '../../api/catalog.api';
import { useAsync, useDocumentTitle } from '../../hooks';
import type { BookingStatus } from '../../types';
import { BOOKING_STATUS, formatTime, formatVND } from '../../utils/format';

const STATUS_COLORS: Record<BookingStatus, string> = {
  PAID: '#27AE60',
  COMPLETED: '#2474E5',
  PENDING: '#F2C94C',
  CANCELLED: '#EB5757',
  EXPIRED: '#BDBDBD',
};
const compactVND = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}tr` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v));

export default function DashboardPage() {
  useDocumentTitle('Tổng quan');
  const [preset, setPreset] = useState<string>('30');
  const [custom, setCustom] = useState<[Dayjs, Dayjs] | null>(null);
  const [companyId, setCompanyId] = useState<number | undefined>();
  const to = preset === 'custom' && custom ? custom[1] : dayjs();
  const from = preset === 'custom' && custom ? custom[0] : preset === '0' ? dayjs() : dayjs().subtract(Number(preset) - 1, 'day');
  const range = { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD'), companyId };
  const key = JSON.stringify(range);
  // Kỳ trước cùng độ dài để so sánh ▲▼.
  const days = to.diff(from, 'day') + 1;
  const prevRange = { from: from.subtract(days, 'day').format('YYYY-MM-DD'), to: from.subtract(1, 'day').format('YYYY-MM-DD'), companyId };

  const summary = useAsync(() => statsSummary(range), [key]);
  const prev = useAsync(() => statsSummary(prevRange), [key]);
  const daily = useAsync(() => statsRevenueDaily(range), [key]);
  const top = useAsync(() => statsTopRoutes(range, 8), [key]);
  const upcoming = useAsync(() => statsUpcomingTrips(24), []);
  const companies = useAsync(() => getCompanies(), []);

  const s = summary.data;
  const p = prev.data;
  const delta = (cur?: number, old?: number) => {
    if (cur == null || old == null || old === 0) return null;
    const pct = ((cur - old) / old) * 100;
    return <span className={pct >= 0 ? 'text-success' : 'text-danger'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%</span>;
  };
  const donut = s ? (Object.keys(s.bookingsByStatus) as BookingStatus[]).map((k) => ({ status: k, name: BOOKING_STATUS[k].label, value: s.bookingsByStatus[k] })).filter((d) => d.value > 0) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 mr-auto text-xl font-bold">Tổng quan</h1>
        <Segmented
          value={preset}
          onChange={(v) => setPreset(String(v))}
          options={[
            { label: 'Hôm nay', value: '0' },
            { label: '7 ngày', value: '7' },
            { label: '30 ngày', value: '30' },
            { label: 'Tuỳ chọn', value: 'custom' },
          ]}
        />
        {preset === 'custom' && <DatePicker.RangePicker value={custom} onChange={(v) => setCustom(v as [Dayjs, Dayjs])} format="DD/MM/YYYY" />}
        <Select allowClear placeholder="Tất cả nhà xe" style={{ width: 200 }} value={companyId} onChange={setCompanyId} options={companies.data?.map((c) => ({ value: c.id, label: c.name }))} />
      </div>

      <Row gutter={[16, 16]}>
        {[
          { title: 'Doanh thu', value: s ? formatVND(s.revenue) : '', d: delta(s?.revenue, p?.revenue) },
          { title: 'Vé bán', value: s?.ticketsSold, d: delta(s?.ticketsSold, p?.ticketsSold) },
          { title: 'Tỷ lệ lấp đầy', value: s ? `${(s.occupancyRate * 100).toFixed(1)}%` : '', d: `${s?.tripsDeparted ?? 0} chuyến khởi hành` },
          { title: 'Đơn chờ thanh toán', value: s?.pendingBookings, d: `${s?.totalBookings ?? 0} đơn trong kỳ` },
        ].map((k) => (
          <Col key={k.title} xs={24} sm={12} xl={6}>
            <Card>
              {summary.loading ? <Skeleton active paragraph={{ rows: 1 }} /> : <Statistic title={k.title} value={k.value} />}
              <div className="mt-1 text-xs text-muted">{k.d ?? 'Không có dữ liệu kỳ trước'}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Doanh thu theo ngày">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={daily.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => dayjs(d).format('DD/MM')} fontSize={12} />
                <YAxis tickFormatter={compactVND} fontSize={12} />
                <Tooltip formatter={(v: number, n) => (n === 'Doanh thu' ? formatVND(v) : v)} labelFormatter={(d) => dayjs(d).format('DD/MM/YYYY')} />
                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#2474E5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Đơn theo trạng thái">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {donut.map((d) => (
                    <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Vé bán theo tuyến (top 8)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top.data ?? []} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="routeName" width={150} fontSize={12} />
                <Tooltip />
                <Bar dataKey="ticketsSold" name="Vé bán" fill="#2474E5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Chuyến sắp chạy (24 giờ tới)">
            <Table
              size="small"
              rowKey="tripId"
              loading={upcoming.loading}
              dataSource={upcoming.data ?? []}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Giờ đi', dataIndex: 'departureTime', render: (v: string) => `${formatTime(v)} ${dayjs(v).format('DD/MM')}`, width: 100 },
                { title: 'Tuyến', dataIndex: 'routeName', render: (v: string, r) => <Link to={`/admin/chuyen-xe/${r.tripId}`}>{v}</Link> },
                { title: 'Nhà xe', dataIndex: 'companyName', responsive: ['lg'] },
                {
                  title: 'Lấp đầy',
                  render: (_, r) => (
                    <div style={{ minWidth: 110 }}>
                      <Progress percent={Math.round((r.booked / r.total) * 100)} size="small" />
                      <span className="text-xs text-muted">{r.booked}/{r.total}</span>
                    </div>
                  ),
                },
              ]}
            />
            {upcoming.data?.length === 0 && <Tag>Không có chuyến nào trong 24 giờ tới</Tag>}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
