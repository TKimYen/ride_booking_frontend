import { ShieldX } from 'lucide-react';
import { lazy, Suspense, type ComponentType } from 'react';
import { Link, Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import { BookingLayout } from '../components/booking';
import AccountLayout from '../layouts/AccountLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import {
  BookingDetailPage,
  MyBookingsPage,
  MyReviewsPage,
  ProfilePage,
  SecurityPage,
  WriteReviewPage,
} from '../pages/account/AccountPages';
import { ForgotPasswordPage, LoginPage, RegisterPage } from '../pages/auth/AuthPages';
import BookingPage from '../pages/customer/BookingPage';
import HomePage from '../pages/customer/HomePage';
import LookupPage from '../pages/customer/LookupPage';
import PaymentPage from '../pages/customer/PaymentPage';
import PromotionsPage from '../pages/customer/PromotionsPage';
import ResultPage from '../pages/customer/ResultPage';
import SearchResultPage from '../pages/customer/SearchResultPage';
import TripDetailPage from '../pages/customer/TripDetailPage';
import { Spinner } from '../components/common';
import { useAuthStore } from '../stores/authStore';

// Khu admin (Ant Design + Recharts) tách bundle riêng: khách hàng không phải tải.
function lazyPage<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) {
  const Page = lazy(() => load().then((m) => ({ default: m[name] as ComponentType })));
  return (
    <Suspense fallback={<div className="flex justify-center p-10"><Spinner /></div>}>
      <Page />
    </Suspense>
  );
}
const catalog = () => import('../pages/admin/CatalogPages');
const other = () => import('../pages/admin/OtherAdminPages');
const tripsAdmin = () => import('../pages/admin/TripsPage');

/** Chưa đăng nhập -> /dang-nhap?redirect=<url hiện tại>. */
function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to={`/dang-nhap?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <Outlet />;
}

/** Sai role -> trang 403. */
function RequireAdmin() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to={`/dang-nhap?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.role !== 'ADMIN') return <ErrorPage code={403} />;
  return <Outlet />;
}

function ErrorPage({ code }: { code: 403 | 404 }) {
  return (
    <div className="container-x flex flex-col items-center py-20 text-center">
      {code === 403 ? <ShieldX size={56} className="text-danger" /> : <div className="text-6xl font-bold text-primary">404</div>}
      <h1 className="mb-1 mt-3 text-xl font-bold">{code === 403 ? 'Bạn không có quyền truy cập trang này' : 'Không tìm thấy trang'}</h1>
      <p className="mt-0 text-sm text-muted">{code === 403 ? 'Trang chỉ dành cho quản trị viên.' : 'Đường dẫn có thể đã bị đổi hoặc không tồn tại.'}</p>
      <Link to="/" className="btn-primary">Về trang chủ</Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/xe-khach/:route', element: <SearchResultPage /> },
      { path: '/chuyen/:tripId', element: <TripDetailPage /> },
      { path: '/dat-ve/ket-qua', element: <ResultPage /> },
      { path: '/tra-cuu-ve', element: <LookupPage /> },
      { path: '/uu-dai', element: <PromotionsPage /> },
      { path: '/dang-nhap', element: <LoginPage /> },
      { path: '/dang-ky', element: <RegisterPage /> },
      { path: '/quen-mat-khau', element: <ForgotPasswordPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/tai-khoan',
            element: <AccountLayout />,
            children: [
              { index: true, element: <Navigate to="thong-tin" replace /> },
              { path: 'thong-tin', element: <ProfilePage /> },
              { path: 'don-hang', element: <MyBookingsPage /> },
              { path: 'don-hang/:id', element: <BookingDetailPage /> },
              { path: 'danh-gia', element: <MyReviewsPage /> },
              { path: 'danh-gia/:bookingId', element: <WriteReviewPage /> },
              { path: 'bao-mat', element: <SecurityPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <ErrorPage code={404} /> },
    ],
  },
  {
    element: <BookingLayout />,
    children: [
      { path: '/dat-ve/:tripId', element: <BookingPage /> },
      { path: '/dat-ve/thanh-toan/:bookingId', element: <PaymentPage /> },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        path: '/admin',
        element: lazyPage(() => import('../layouts/AdminLayout'), 'default'),
        children: [
          { index: true, element: lazyPage(() => import('../pages/admin/DashboardPage'), 'default') },
          { path: 'chuyen-xe', element: lazyPage(tripsAdmin, 'TripsPage') },
          { path: 'chuyen-xe/:id', element: lazyPage(tripsAdmin, 'TripDetailAdminPage') },
          { path: 'tuyen', element: lazyPage(catalog, 'RoutesPage') },
          { path: 'dia-diem', element: lazyPage(catalog, 'LocationsPage') },
          { path: 'nha-xe', element: lazyPage(catalog, 'CompaniesPage') },
          { path: 'nha-xe/:id', element: lazyPage(catalog, 'CompanyDetailPage') },
          { path: 'don-hang', element: lazyPage(other, 'BookingsAdminPage') },
          { path: 'khuyen-mai', element: lazyPage(other, 'PromotionsAdminPage') },
          { path: 'danh-gia', element: lazyPage(other, 'ReviewsAdminPage') },
          { path: 'nguoi-dung', element: lazyPage(other, 'UsersAdminPage') },
        ],
      },
    ],
  },
], {
  // Bật sẵn hành vi của React Router v7 (cũng tắt cảnh báo "Future Flag Warning" trên Console).
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
