import { App, Button, Card, Checkbox, Form, Image, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  adminAddImage,
  adminDeleteCompany,
  adminDeleteImage,
  adminDeleteLocation,
  adminDeletePolicy,
  adminDeleteRoute,
  adminSaveCompany,
  adminSaveLocation,
  adminSavePolicy,
  adminSaveRoute,
  adminSetAmenities,
  adminSetCancellationRules,
  type RouteForm,
} from '../../api/admin.api';
import { getAmenities, getCompanies, getCompanyProfile, getLocations, getRoutes } from '../../api/catalog.api';
import { errorMessage } from '../../api/client';
import { useAsync, useDocumentTitle } from '../../hooks';
import type { BusCompanyResponse, LocationResponse, PolicyType, RouteResponse } from '../../types';
import { formatDuration } from '../../utils/format';

/** Gọi API ghi, báo thành công/lỗi bằng message của antd rồi tải lại. */
function useSave() {
  const { message } = App.useApp();
  return async (fn: () => Promise<unknown>, ok: string, after?: () => void) => {
    try {
      await fn();
      message.success(ok);
      after?.();
      return true;
    } catch (e) {
      message.error(errorMessage(e));
      return false;
    }
  };
}

// ---------------- Địa điểm ----------------
export function LocationsPage() {
  useDocumentTitle('Địa điểm');
  const { data, loading, reload } = useAsync(() => getLocations(), []);
  const [editing, setEditing] = useState<LocationResponse | null | 'new'>(null);
  const [form] = Form.useForm<{ name: string; slug: string }>();
  const save = useSave();
  const [keyword, setKeyword] = useState('');

  return (
    <Card title="Địa điểm" extra={<Button type="primary" onClick={() => (form.resetFields(), setEditing('new'))}>+ Thêm địa điểm</Button>}>
      <Input.Search allowClear placeholder="Tìm địa điểm" className="mb-3" style={{ maxWidth: 280 }} onChange={(e) => setKeyword(e.target.value.toLowerCase())} />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.filter((l) => l.name.toLowerCase().includes(keyword))}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Slug (URL)', dataIndex: 'slug', render: (v) => <code>{v}</code> },
          {
            title: '',
            width: 160,
            render: (_, l) => (
              <Space>
                <Button size="small" onClick={() => (form.setFieldsValue(l), setEditing(l))}>Sửa</Button>
                <Popconfirm title="Xoá địa điểm?" onConfirm={() => save(() => adminDeleteLocation(l.id), 'Đã xoá', reload)}>
                  <Button size="small" danger type="text">Xoá</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={editing != null}
        title={editing === 'new' ? 'Thêm địa điểm' : 'Sửa địa điểm'}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => save(() => adminSaveLocation(editing === 'new' ? null : (editing as LocationResponse).id, v.name, v.slug), 'Đã lưu', () => (setEditing(null), reload()))}
        >
          <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
          <Form.Item name="slug" label="Slug" extra="Bỏ trống để tự sinh từ tên (vd: Hà Nội → ha-noi)"><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ---------------- Tuyến ----------------
export function RoutesPage() {
  useDocumentTitle('Tuyến');
  const routes = useAsync(getRoutes, []);
  const locations = useAsync(() => getLocations(), []);
  const [editing, setEditing] = useState<RouteResponse | null | 'new'>(null);
  const [form] = Form.useForm<RouteForm>();
  const save = useSave();
  const locOptions = locations.data?.map((l) => ({ value: l.id, label: l.name }));

  const suggestName = () => {
    const { originId, destinationId, name } = form.getFieldsValue();
    const o = locations.data?.find((l) => l.id === originId);
    const d = locations.data?.find((l) => l.id === destinationId);
    if (o && d && !name) form.setFieldValue('name', `${o.name} - ${d.name}`);
  };

  return (
    <Card title="Tuyến đường" extra={<Button type="primary" onClick={() => (form.resetFields(), setEditing('new'))}>+ Thêm tuyến</Button>}>
      <Table
        rowKey="id"
        loading={routes.loading}
        dataSource={routes.data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Khoảng cách', dataIndex: 'distanceKm', render: (v) => `${v} km`, width: 120 },
          { title: 'Thời lượng', dataIndex: 'durationMinutes', render: formatDuration, width: 110 },
          { title: 'Nổi bật', dataIndex: 'featured', render: (v) => (v ? <Tag color="gold">Trang chủ</Tag> : null), width: 110 },
          {
            title: '',
            width: 160,
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => (form.setFieldsValue(r), setEditing(r))}>Sửa</Button>
                <Popconfirm title="Xoá tuyến?" onConfirm={() => save(() => adminDeleteRoute(r.id), 'Đã xoá', routes.reload)}>
                  <Button size="small" danger type="text">Xoá</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal open={editing != null} title={editing === 'new' ? 'Thêm tuyến' : 'Sửa tuyến'} onCancel={() => setEditing(null)} onOk={() => form.submit()} destroyOnClose>
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => save(() => adminSaveRoute(editing === 'new' ? null : (editing as RouteResponse).id, v), 'Đã lưu tuyến', () => (setEditing(null), routes.reload()))}
        >
          <Space.Compact block>
            <Form.Item name="originId" label="Điểm đi" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select showSearch optionFilterProp="label" options={locOptions} onChange={suggestName} />
            </Form.Item>
            <Form.Item
              name="destinationId"
              label="Điểm đến"
              style={{ flex: 1 }}
              dependencies={['originId']}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({ validator: (_, v) => (v && v === getFieldValue('originId') ? Promise.reject(new Error('Phải khác điểm đi')) : Promise.resolve()) }),
              ]}
            >
              <Select showSearch optionFilterProp="label" options={locOptions} onChange={suggestName} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="name" label="Tên tuyến" rules={[{ required: true }]}><Input /></Form.Item>
          <Space>
            <Form.Item name="distanceKm" label="Khoảng cách (km)" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
            <Form.Item name="durationMinutes" label="Thời lượng (phút)" rules={[{ required: true }]}><InputNumber min={10} /></Form.Item>
          </Space>
          <Form.Item name="imageUrl" label="Ảnh (URL)"><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="featured" label="Hiện ở Trang chủ" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ---------------- Nhà xe ----------------
export function CompaniesPage() {
  useDocumentTitle('Nhà xe');
  const { data, loading, reload } = useAsync(() => getCompanies(), []);
  const [editing, setEditing] = useState<BusCompanyResponse | null | 'new'>(null);
  const [form] = Form.useForm();
  const save = useSave();
  return (
    <Card title="Nhà xe" extra={<Button type="primary" onClick={() => (form.resetFields(), setEditing('new'))}>+ Thêm nhà xe</Button>}>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data ?? []}
        pagination={false}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: 'Tên', dataIndex: 'name', render: (v, c) => <Link to={`/admin/nha-xe/${c.id}`}>{v}</Link> },
          { title: 'Mô tả', dataIndex: 'description' },
          {
            title: '',
            width: 240,
            render: (_, c) => (
              <Space>
                <Link to={`/admin/nha-xe/${c.id}`}><Button size="small">Nội dung</Button></Link>
                <Button size="small" onClick={() => (form.setFieldsValue(c), setEditing(c))}>Sửa</Button>
                <Popconfirm title="Xoá nhà xe?" onConfirm={() => save(() => adminDeleteCompany(c.id), 'Đã xoá', reload)}>
                  <Button size="small" danger type="text">Xoá</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal open={editing != null} title={editing === 'new' ? 'Thêm nhà xe' : 'Sửa nhà xe'} onCancel={() => setEditing(null)} onOk={() => form.submit()} destroyOnClose>
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => save(() => adminSaveCompany(editing === 'new' ? null : (editing as BusCompanyResponse).id, { logoUrl: '', description: '', ...v }), 'Đã lưu', () => (setEditing(null), reload()))}
        >
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="logoUrl" label="Logo (URL)"><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

const POLICY_LABEL: Record<PolicyType, string> = {
  CANCELLATION: 'Huỷ vé',
  LUGGAGE: 'Hành lý',
  CHILDREN: 'Trẻ em',
  PET: 'Thú cưng',
  DOCUMENT: 'Giấy tờ',
  OTHER: 'Khác',
};

/** /admin/nha-xe/:id — tab Hình ảnh · Tiện ích · Chính sách (+ bảng quy tắc hoàn huỷ). */
export function CompanyDetailPage() {
  const id = Number(useParams().id);
  const profile = useAsync(() => getCompanyProfile(id), [id]);
  const allAmenities = useAsync(getAmenities, []);
  const save = useSave();
  const [imgForm] = Form.useForm();
  const [polForm] = Form.useForm();
  const [policyEditing, setPolicyEditing] = useState<number | null | 'new'>(null);
  const [amenityIds, setAmenityIds] = useState<number[]>([]);
  const [rules, setRules] = useState<{ hoursBefore: number; refundPercent: number }[]>([]);
  useDocumentTitle(profile.data?.company.name ?? 'Nhà xe');

  useEffect(() => {
    if (!profile.data) return;
    setAmenityIds(profile.data.amenities.map((a) => a.id));
    setRules(profile.data.cancellationRules);
  }, [profile.data]);

  if (profile.loading && !profile.data) return <Card loading />;
  if (profile.error) return <Card>{profile.error}</Card>;
  const p = profile.data!;

  return (
    <Card title={<span><Link to="/admin/nha-xe">Nhà xe</Link> / {p.company.name}</span>}>
      <Tabs
        items={[
          {
            key: 'images',
            label: `Hình ảnh (${p.images.length})`,
            children: (
              <>
                <div className="mb-4 flex flex-wrap gap-3">
                  {p.images.map((img) => (
                    <div key={img.id} className="w-44">
                      <Image src={img.imageUrl} width={176} height={120} style={{ objectFit: 'cover', borderRadius: 6 }} />
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate">{img.sortOrder}. {img.caption}</span>
                        <Button size="small" type="link" danger onClick={() => save(() => adminDeleteImage(id, img.id), 'Đã xoá ảnh', profile.reload)}>Xoá</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Form form={imgForm} layout="inline" onFinish={(v) => save(() => adminAddImage(id, v.imageUrl, v.caption ?? ''), 'Đã thêm ảnh', () => (imgForm.resetFields(), profile.reload()))}>
                  <Form.Item name="imageUrl" rules={[{ required: true, type: 'url', message: 'Nhập URL ảnh hợp lệ' }]}><Input placeholder="URL ảnh" style={{ width: 300 }} /></Form.Item>
                  <Form.Item name="caption"><Input placeholder="Chú thích" /></Form.Item>
                  <Button type="primary" htmlType="submit">Thêm ảnh</Button>
                </Form>
              </>
            ),
          },
          {
            key: 'amenities',
            label: 'Tiện ích',
            children: (
              <>
                <Checkbox.Group value={amenityIds} onChange={(v) => setAmenityIds(v as number[])} options={allAmenities.data?.map((a) => ({ value: a.id, label: a.name }))} />
                <div className="mt-4">
                  <Button type="primary" onClick={() => save(() => adminSetAmenities(id, amenityIds), 'Đã lưu tiện ích', profile.reload)}>Lưu tiện ích</Button>
                </div>
              </>
            ),
          },
          {
            key: 'policies',
            label: 'Chính sách',
            children: (
              <>
                <Button className="mb-3" onClick={() => (polForm.resetFields(), setPolicyEditing('new'))}>+ Thêm chính sách</Button>
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={p.policies}
                  columns={[
                    { title: 'Loại', dataIndex: 'policyType', render: (v: PolicyType) => <Tag>{POLICY_LABEL[v]}</Tag>, width: 110 },
                    { title: 'Tiêu đề', dataIndex: 'title', width: 160 },
                    { title: 'Nội dung', dataIndex: 'content' },
                    {
                      title: '',
                      width: 140,
                      render: (_, pol) => (
                        <Space>
                          <Button size="small" onClick={() => (polForm.setFieldsValue(pol), setPolicyEditing(pol.id))}>Sửa</Button>
                          <Popconfirm title="Xoá?" onConfirm={() => save(() => adminDeletePolicy(id, pol.id), 'Đã xoá', profile.reload)}>
                            <Button size="small" danger type="text">Xoá</Button>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
                <h3 className="mb-2 mt-6 text-sm font-semibold">Quy tắc hoàn tiền khi huỷ</h3>
                {rules.map((r, i) => (
                  <Space key={i} className="mb-2">
                    Huỷ trước
                    <InputNumber min={0} value={r.hoursBefore} onChange={(v) => setRules(rules.map((x, j) => (j === i ? { ...x, hoursBefore: v ?? 0 } : x)))} />
                    giờ → hoàn
                    <InputNumber min={0} max={100} value={r.refundPercent} onChange={(v) => setRules(rules.map((x, j) => (j === i ? { ...x, refundPercent: v ?? 0 } : x)))} />%
                    <Button type="text" danger onClick={() => setRules(rules.filter((_, j) => j !== i))}>Xoá</Button>
                  </Space>
                ))}
                <Space className="mt-1 flex">
                  <Button onClick={() => setRules([...rules, { hoursBefore: 0, refundPercent: 0 }])}>+ Thêm mốc</Button>
                  <Button type="primary" onClick={() => save(() => adminSetCancellationRules(id, rules), 'Đã lưu bảng hoàn tiền', profile.reload)}>Lưu quy tắc</Button>
                </Space>
              </>
            ),
          },
        ]}
      />
      <Modal open={policyEditing != null} title="Chính sách" onCancel={() => setPolicyEditing(null)} onOk={() => polForm.submit()} destroyOnClose>
        <Form
          form={polForm}
          layout="vertical"
          initialValues={{ policyType: 'OTHER' }}
          onFinish={(v) => save(() => adminSavePolicy(id, policyEditing === 'new' ? null : (policyEditing as number), v), 'Đã lưu', () => (setPolicyEditing(null), profile.reload()))}
        >
          <Form.Item name="policyType" label="Loại"><Select options={(Object.keys(POLICY_LABEL) as PolicyType[]).map((k) => ({ value: k, label: POLICY_LABEL[k] }))} /></Form.Item>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
