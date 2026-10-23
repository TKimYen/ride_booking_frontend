import { Bus, ChevronDown, LogOut, Menu, Phone, Ticket, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <Link to="/" className={`flex items-center gap-2 text-xl font-bold ${light ? 'text-white' : 'text-primary'}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${light ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
        <Bus size={18} />
      </span>
      XeGo
    </Link>
  );
}

function UserMenu() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        className="flex cursor-pointer items-center gap-2 rounded-full border-0 bg-white/15 py-1 pl-1 pr-3 text-sm text-white"
        onClick={() => setOpen(!open)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-semibold text-primary">
          {user.fullName[0]}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{user.fullName}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-card bg-white py-1 text-sm text-ink shadow-xl" onClick={() => setOpen(false)}>
          {user.role === 'ADMIN' && (
            <Link to="/admin" className="block px-4 py-2 hover:bg-bg">
              Trang quản trị
            </Link>
          )}
          <Link to="/tai-khoan/don-hang" className="flex items-center gap-2 px-4 py-2 hover:bg-bg">
            <Ticket size={16} /> Đơn hàng của tôi
          </Link>
          <Link to="/tai-khoan/thong-tin" className="flex items-center gap-2 px-4 py-2 hover:bg-bg">
            <User size={16} /> Tài khoản
          </Link>
          <button
            className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-2 text-left text-sm text-danger hover:bg-bg"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { to: '/', label: 'Xe khách', end: true },
  { to: '/uu-dai', label: 'Ưu đãi' },
  { to: '/tra-cuu-ve', label: 'Tra cứu vé' },
];

export function Header() {
  const user = useAuthStore((s) => s.user);
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);
  const loginLink = `/dang-nhap?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <header className="no-print sticky top-0 z-30 bg-primary text-white shadow">
      <div className="container-x flex h-16 items-center gap-6">
        <Logo />
        <nav className="hidden gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <a href="tel:19001234" className="hidden items-center gap-1 text-sm lg:flex">
            <Phone size={16} /> 1900 1234
          </a>
          {user ? (
            <UserMenu />
          ) : (
            <div className="hidden gap-2 sm:flex">
              <Link to={loginLink} className="btn h-9 bg-white text-primary hover:bg-white/90">
                Đăng nhập
              </Link>
              <Link to="/dang-ky" className="btn h-9 border border-solid border-white/60 bg-transparent text-white hover:bg-white/10">
                Đăng ký
              </Link>
            </div>
          )}
          <button className="cursor-pointer border-0 bg-transparent p-1 text-white md:hidden" onClick={() => setDrawer(true)} aria-label="Mở menu">
            <Menu />
          </button>
        </div>
      </div>
      {drawer && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setDrawer(false)}>
          <div className="ml-auto h-full w-72 bg-white p-4 text-ink" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <Logo light={false} />
              <button className="cursor-pointer border-0 bg-transparent" onClick={() => setDrawer(false)} aria-label="Đóng menu">
                <X />
              </button>
            </div>
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="block rounded px-2 py-3 hover:bg-bg">
                {n.label}
              </Link>
            ))}
            {!user && (
              <div className="mt-4 flex flex-col gap-2">
                <Link to={loginLink} className="btn-primary">
                  Đăng nhập
                </Link>
                <Link to="/dang-ky" className="btn-ghost">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="no-print mt-16 bg-ink text-white/80">
      <div className="container-x grid gap-8 py-10 text-sm md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 text-white/60">Đặt vé xe khách liên tỉnh nhanh chóng, giữ chỗ 10 phút, thanh toán an toàn.</p>
        </div>
        <div>
          <div className="mb-2 font-semibold text-white">Tuyến phổ biến</div>
          <Link to="/xe-khach/ha-noi-di-sa-pa" className="block py-1 hover:text-white">Hà Nội - Sa Pa</Link>
          <Link to="/xe-khach/ho-chi-minh-di-da-lat" className="block py-1 hover:text-white">Hồ Chí Minh - Đà Lạt</Link>
          <Link to="/xe-khach/ha-noi-di-ha-long" className="block py-1 hover:text-white">Hà Nội - Hạ Long</Link>
        </div>
        <div>
          <div className="mb-2 font-semibold text-white">Hỗ trợ</div>
          <Link to="/tra-cuu-ve" className="block py-1 hover:text-white">Tra cứu vé</Link>
          <Link to="/uu-dai" className="block py-1 hover:text-white">Ưu đãi</Link>
          <span className="block py-1">Hotline: 1900 1234</span>
        </div>
        <div>
          <div className="mb-2 font-semibold text-white">Đồ án J2EE</div>
          <p className="m-0 text-white/60">Sản phẩm học tập, không phải dịch vụ thật. Dữ liệu là dữ liệu mẫu.</p>
        </div>
      </div>
    </footer>
  );
}

export default function CustomerLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
