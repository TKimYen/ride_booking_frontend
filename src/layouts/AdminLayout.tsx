import { App as AntApp, Avatar, Breadcrumb, ConfigProvider, Dropdown, Layout, Menu, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import {
  Building2,
  Bus,
  LayoutDashboard,
  LogOut,
  MapPin,
  Route as RouteIcon,
  Star,
  Tag,
  Ticket,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ITEMS = [
  { key: '/admin', icon: <LayoutDashboard size={16} />, label: 'Tổng quan' },
  { key: '/admin/chuyen-xe', icon: <Bus size={16} />, label: 'Chuyến xe' },
  { key: '/admin/tuyen', icon: <RouteIcon size={16} />, label: 'Tuyến' },
  { key: '/admin/dia-diem', icon: <MapPin size={16} />, label: 'Địa điểm' },
  { key: '/admin/nha-xe', icon: <Building2 size={16} />, label: 'Nhà xe' },
  { key: '/admin/don-hang', icon: <Ticket size={16} />, label: 'Đơn hàng' },
  { key: '/admin/khuyen-mai', icon: <Tag size={16} />, label: 'Khuyến mãi' },
  { key: '/admin/danh-gia', icon: <Star size={16} />, label: 'Đánh giá' },
  { key: '/admin/nguoi-dung', icon: <Users size={16} />, label: 'Người dùng' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const active = [...ITEMS].reverse().find((i) => pathname === i.key || pathname.startsWith(i.key + '/'))?.key ?? '/admin';
  const current = ITEMS.find((i) => i.key === active)!;

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { colorPrimary: '#2474E5', borderRadius: 6, fontFamily: "'Be Vietnam Pro', Inter, system-ui, sans-serif" },
      }}
    >
      <AntApp>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={220} theme="light" breakpoint="lg">
          <Link to="/admin" className="flex h-16 items-center gap-2 px-5 font-bold text-primary">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <Bus size={18} />
            </span>
            {!collapsed && <span>XeGo Admin</span>}
          </Link>
          <Menu mode="inline" selectedKeys={[active]} items={ITEMS} onClick={(e) => navigate(e.key)} style={{ borderInlineEnd: 0 }} />
        </Layout.Sider>
        <Layout>
          <Layout.Header
            style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}
          >
            <Breadcrumb items={[{ title: <Link to="/admin">Quản trị</Link> }, { title: current.label }]} />
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm text-primary">
                Xem trang khách
              </Link>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'logout',
                      icon: <LogOut size={14} />,
                      label: 'Đăng xuất',
                      onClick: () => {
                        logout();
                        navigate('/dang-nhap');
                      },
                    },
                  ],
                }}
              >
                <span className="flex cursor-pointer items-center gap-2 text-sm">
                  <Avatar style={{ background: '#2474E5' }}>{user.fullName[0]}</Avatar>
                  {user.fullName}
                </span>
              </Dropdown>
            </div>
          </Layout.Header>
          <Layout.Content style={{ padding: 24 }}>
            <Outlet />
          </Layout.Content>
        </Layout>
      </Layout>
      </AntApp>
    </ConfigProvider>
  );
}
