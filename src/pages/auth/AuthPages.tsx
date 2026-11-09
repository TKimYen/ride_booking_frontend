import { CircleCheck, CircleX, MailCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { forgotPassword, login, register, resetPassword, verifyEmail } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { Field, Spinner, toast } from '../../components/common';
import { useDocumentTitle } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import { EMAIL_REGEX } from '../../utils/format';

/** Giống @StrongPassword ở auth-service: 8–72 ký tự, có cả chữ và số. Danh sách mật khẩu phổ biến để backend kiểm. */
function passwordProblem(password: string) {
  if (password.length < 8 || password.length > 72) return 'Mật khẩu từ 8 đến 72 ký tự';
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'Mật khẩu phải có cả chữ và chữ số';
  return '';
}

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
      setError(errorMessage(err));
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
      {import.meta.env.DEV && (
        <div className="mt-4 rounded-input bg-bg p-3 text-xs text-muted">
          <b>Tài khoản admin mặc định (môi trường local)</b>
          <div className="mt-1">
            <button
              type="button"
              className="chip h-7 text-xs"
              onClick={() => (setEmail('admin@ridebooking.local'), setPassword('Admin@12345'))}
            >
              admin@ridebooking.local / Admin@12345
            </button>
          </div>
        </div>
      )}
    </AuthCard>
  );
}

export function RegisterPage() {
  useDocumentTitle('Đăng ký');
  const [params] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({ fullName: params.get('name') ?? '', email: params.get('email') ?? '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!form.fullName.trim()) er.fullName = 'Vui lòng nhập họ tên';
    if (!EMAIL_REGEX.test(form.email.trim())) er.email = 'Email không hợp lệ';
    const pw = passwordProblem(form.password);
    if (pw) er.password = pw;
    if (form.confirm !== form.password) er.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      const res = await register(form.fullName, form.email, form.password);
      // Backend trả luôn cặp token: đăng ký xong là đăng nhập, email xác minh gửi song song.
      setSession(res);
      setDone(res.user.email);
    } catch (err) {
      const message = errorMessage(err);
      setErrors(/mật khẩu/i.test(message) ? { password: message } : { email: message });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Tạo tài khoản thành công">
        <MailCheck size={48} className="text-success" />
        <p className="text-sm">
          Bạn đã được đăng nhập. Chúng tôi cũng đã gửi liên kết xác minh tới <b>{done}</b> — hãy bấm vào liên kết trong email để
          xác minh địa chỉ (môi trường local: xem ở Mailpit http://localhost:8025).
        </p>
        <Link to="/" className="btn-primary w-full">
          Bắt đầu tìm chuyến
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
          <input className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Mật khẩu" error={errors.password}>
          <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Nhập lại mật khẩu" error={errors.confirm}>
          <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </Field>
        <p className="m-0 text-xs text-muted">Mật khẩu 8–72 ký tự, có cả chữ và chữ số.</p>
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      // 429: gửi quá nhiều lần trong thời gian ngắn.
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthCard title="Quên mật khẩu" footer={<Link to="/dang-nhap" className="text-primary">Quay lại đăng nhập</Link>}>
      {sent ? (
        <p className="text-sm">
          Nếu email <b>{email}</b> đã đăng ký và đã xác minh, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút. Liên kết có hiệu
          lực 30 phút.
        </p>
      ) : (
        <form className="space-y-3" onSubmit={submit}>
          <Field label="Email đã đăng ký" error={error}>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

/** /reset-password?token= — link trong email quên mật khẩu (auth-service EmailTemplates). */
export function ResetPasswordPage() {
  useDocumentTitle('Đặt lại mật khẩu');
  const token = useSearchParams()[0].get('token') ?? '';
  const navigate = useNavigate();
  const [form, setForm] = useState({ next: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthCard title="Liên kết không hợp lệ" footer={<Link to="/quen-mat-khau" className="text-primary">Gửi lại liên kết</Link>}>
        <p className="m-0 text-sm">Liên kết đặt lại mật khẩu thiếu mã. Hãy mở lại đúng liên kết trong email.</p>
      </AuthCard>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = passwordProblem(form.next);
    if (pw) return setError(pw);
    if (form.next !== form.confirm) return setError('Mật khẩu nhập lại không khớp');
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, form.next);
      toast.success('Đã đặt lại mật khẩu, hãy đăng nhập lại');
      navigate('/dang-nhap', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Đặt lại mật khẩu" footer={<Link to="/quen-mat-khau" className="text-primary">Gửi lại liên kết</Link>}>
      <form className="space-y-3" onSubmit={submit}>
        <Field label="Mật khẩu mới">
          <input className="input" type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required />
        </Field>
        <Field label="Nhập lại mật khẩu mới">
          <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
        </Field>
        {error && <p className="m-0 text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
        </button>
      </form>
    </AuthCard>
  );
}

/** /verify-email?token= — link xác minh gửi lúc đăng ký. */
export function VerifyEmailPage() {
  useDocumentTitle('Xác minh email');
  const token = useSearchParams()[0].get('token') ?? '';
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'error'; message?: string }>({ status: 'loading' });
  // StrictMode gọi effect hai lần; token chỉ dùng được một lần nên chặn lần gọi thứ hai.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) return setState({ status: 'error', message: 'Liên kết xác minh thiếu mã.' });
    verifyEmail(token)
      .then(() => setState({ status: 'ok' }))
      .catch((e) => setState({ status: 'error', message: errorMessage(e) }));
  }, [token]);

  return (
    <AuthCard title="Xác minh email">
      {state.status === 'loading' && <Spinner />}
      {state.status === 'ok' && (
        <>
          <CircleCheck size={48} className="text-success" />
          <p className="text-sm">Email của bạn đã được xác minh.</p>
          <Link to="/" className="btn-primary w-full">Về trang chủ</Link>
        </>
      )}
      {state.status === 'error' && (
        <>
          <CircleX size={48} className="text-danger" />
          <p className="text-sm">{state.message}</p>
          <Link to="/dang-nhap" className="btn-ghost w-full">Tới trang đăng nhập</Link>
        </>
      )}
    </AuthCard>
  );
}
