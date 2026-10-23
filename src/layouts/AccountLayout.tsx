import { LogOut, Shield, Star, Ticket, User } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const MENU = [
  { to: '/tai-khoan/thong-tin', label: 'Thông tin tài khoản', icon: User },
  { to: '/tai-khoan/don-hang', label: 'Đơn hàng của tôi', icon: Ticket },
  { to: '/tai-khoan/danh-gia', label: 'Đánh giá của tôi', icon: Star },
  { to: '/tai-khoan/bao-mat', label: 'Bảo mật', icon: Shield },
];

export default function AccountLayout() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return (
    <div className="container-x grid gap-6 py-6 md:grid-cols-[240px_1fr]">
      <aside className="card h-fit min-w-0 p-2">
        <div className="flex items-center gap-3 border-0 border-b border-solid border-line px-3 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-white">
            {user.fullName[0]}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold">{user.fullName}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto py-2 md:flex-col">
          {MENU.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded px-3 py-2 text-sm ${isActive ? 'bg-primary-light font-semibold text-primary' : 'hover:bg-bg'}`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
          <button
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-3 py-2 text-left text-sm text-danger hover:bg-bg"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </nav>
      </aside>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
