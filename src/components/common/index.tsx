import { AlertCircle, Inbox, Loader2, Star, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import type { BookingStatus } from '../../types';
import { BOOKING_STATUS } from '../../utils/format';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-primary ${className}`} size={20} aria-label="Đang tải" />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-line/60 ${className}`} />;
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Inbox size={40} className="text-muted" />
      <div className="font-semibold">{title}</div>
      {hint && <div className="text-sm text-muted">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <AlertCircle size={36} className="text-danger" />
      <div className="text-sm">{message}</div>
      {onRetry && (
        <button className="btn-ghost mt-2" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-cta text-cta' : 'text-line'} />
      ))}
    </span>
  );
}

const LOGO_COLORS = ['#2474E5', '#27AE60', '#E67E22', '#8E44AD', '#16A085', '#C0392B'];
export function CompanyLogo({ name, id, size = 44 }: { name: string; id: number; size?: number }) {
  const initials = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-card font-bold text-white"
      style={{ width: size, height: size, background: LOGO_COLORS[id % LOGO_COLORS.length], fontSize: size / 3 }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = BOOKING_STATUS[status];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.color}`}>{s.label}</span>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${width} max-h-[90vh] overflow-auto rounded-t-2xl bg-white shadow-xl sm:rounded-card`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-0 border-b border-solid border-line px-5 py-3">
          <div className="text-base font-semibold">{title}</div>
          <button className="cursor-pointer border-0 bg-transparent p-1 text-muted" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-0 border-t border-solid border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Toast ----------
interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}
const useToastStore = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, 'id'>) => void; remove: (id: number) => void }>(
  (set) => ({
    items: [],
    push: (t) => {
      const id = Date.now() + Math.random();
      set((s) => ({ items: [...s.items, { ...t, id }] }));
      setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 3500);
    },
    remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  }),
);
export const toast = {
  success: (text: string) => useToastStore.getState().push({ type: 'success', text }),
  error: (text: string) => useToastStore.getState().push({ type: 'error', text }),
  info: (text: string) => useToastStore.getState().push({ type: 'info', text }),
};
export function Toaster() {
  const items = useToastStore((s) => s.items);
  const remove = useToastStore((s) => s.remove);
  const color = { success: 'bg-success', error: 'bg-danger', info: 'bg-ink' };
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[1100] flex w-[92vw] max-w-sm -translate-x-1/2 flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2 rounded-card px-4 py-3 text-sm text-white shadow-lg ${color[t.type]}`}
          onClick={() => remove(t.id)}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
