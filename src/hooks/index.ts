import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client';

/**
 * Gọi một hàm async và giữ data/loading/error. Thay cho TanStack Query khi còn dùng dữ liệu cứng;
 * `deps` đổi thì gọi lại, `reload()` để gọi lại tay (nút "Thử lại").
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, setData, loading, error, reload };
}

/** Số giây còn lại tới `expiresAt` (giờ server), cập nhật mỗi giây. */
export function useCountdown(expiresAt: string | null | undefined) {
  const calc = () => (expiresAt ? Math.max(0, dayjs(expiresAt).diff(dayjs(), 'second')) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!expiresAt) return;
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);
  return left;
}

export function useDebounce<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} – XeGo` : 'XeGo – Đặt vé xe khách trực tuyến';
  }, [title]);
}
