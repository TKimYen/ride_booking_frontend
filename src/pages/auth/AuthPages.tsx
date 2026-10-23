import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { forgotPassword, login, register } from '../../api/auth.api';
import { ApiError, errorMessage } from '../../api/client';
import { Field, toast } from '../../components/common';
import { useDocumentTitle } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import { EMAIL_REGEX } from '../../utils/format';

function AuthCard({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-x flex justify-center py-10">
      <div className="card w-full max-w-md p-6">
        <h1 className="mb-5 mt-0 text-xl font-bold">{title}</h1>
        {children}
        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}

/** Đăng nhập dùng chung cho khách và admin; role ADMIN thì về /admin. */
export function LoginPage() {
  useDocumentTitle('Đăng nhập');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const redirect = params.get('redirect');

  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : (redirect ?? '/')} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      setSession(res);
      toast.success(`Xin chào ${res.user.fullName}`);
      navigate(res.user.role === 'ADMIN' && !redirect ? '/admin' : (redirect ?? '/'), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Đăng nhập"
      footer={
        <>
          Chưa có tài khoản? <Link to="/dang-ky" className="text-primary">Đăng ký</Link>
        </>
      }
    >
      <form className="space-y-3" onSubmit={submit}>
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Mật khẩu">
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <div className="text-right text-sm">
          <Link to="/quen-mat-khau" className="text-primary">Quên mật khẩu?</Link>
        </div>
        {error && <p className="m-0 text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
      <div className="mt-4 rounded-input bg-bg p-3 text-xs text-muted">
        <b>Tài khoản dữ liệu mẫu</b>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" className="chip h-7 text-xs" onClick={() => (setEmail('user@xego.vn'), setPassword('123456'))}>
            Khách: user@xego.vn / 123456
          </button>
          <button type="button" className="chip h-7 text-xs" onClick={() => (setEmail('admin@xego.vn'), setPassword('admin123'))}>
            Admin: admin@xego.vn / admin123
          </button>
        </div>
      </div>
    </AuthCard>
  );
}

export function RegisterPage() {
  useDocumentTitle('Đăng ký');
  const [params] = useSearchParams();
  const [form, setForm] = useState({ fullName: params.get('name') ?? '', email: params.get('email') ?? '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!form.fullName.trim()) er.fullName = 'Vui lòng nhập họ tên';
    if (!EMAIL_REGEX.test(form.email)) er.email = 'Email không hợp lệ';
    if (form.password.length < 8) er.password = 'Mật khẩu tối thiểu 8 ký tự';
    if (form.confirm !== form.password) er.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      const res = await register(form.fullName, form.email, form.password);
      setDone(res.email);
    } catch (err) {
      setErrors({ email: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Kiểm tra email của bạn">
        <MailCheck size={48} className="text-success" />
        <p className="text-sm">
          Đã gửi liên kết xác minh tới <b>{done}</b>. Bấm vào liên kết trong email để kích hoạt tài khoản (môi trường local: xem ở Mailpit
          http://localhost:8025).
        </p>
        <Link to="/dang-nhap" className="btn-primary w-full">
          Tới trang đăng nhập
        </Link>
      </AuthCard>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <AuthCard
      title="Tạo tài khoản"
      footer={
        <>
          Đã có tài khoản? <Link to="/dang-nhap" className="text-primary">Đăng nhập</Link>
        </>
      }
    >
      <form className="space-y-3" onSubmit={submit}>
        <Field label="Họ và tên" error={errors.fullName}>
          <input className="input" value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className="input" type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Mật khẩu" error={errors.password}>
          <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Nhập lại mật khẩu" error={errors.confirm}>
          <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </Field>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Đang tạo...' : 'Đăng ký'}
        </button>
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordPage() {
  useDocumentTitle('Quên mật khẩu');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await forgotPassword(email);
    setSent(true);
  };
  return (
    <AuthCard title="Quên mật khẩu" footer={<Link to="/dang-nhap" className="text-primary">Quay lại đăng nhập</Link>}>
      {sent ? (
        <p className="text-sm">Nếu email {email} tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.</p>
      ) : (
        <form className="space-y-3" onSubmit={submit}>
          <Field label="Email đã đăng ký">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <button className="btn-primary w-full">Gửi liên kết đặt lại</button>
        </form>
      )}
    </AuthCard>
  );
}
