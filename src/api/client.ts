/**
 * Lớp giả lập gọi API. Mọi hàm trong src/api trả Promise và ném ApiError giống
 * format lỗi backend ({status, message}) để trang xử lý lỗi y như khi nối thật.
 *
 * Nối backend thật: thay `mock(() => ...)` bằng axios gọi tới VITE_API_BASE_URL.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const LATENCY_MS = 250;

export function mock<T>(fn: () => T, latency = LATENCY_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // structuredClone: trang sửa object nhận được không làm hỏng "database".
        resolve(structuredClone(fn()));
      } catch (e) {
        reject(e);
      }
    }, latency);
  });
}

export function paginate<T>(items: T[], page = 0, size = 10) {
  const safeSize = Math.min(Math.max(size, 1), 100);
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const content = items.slice(page * safeSize, page * safeSize + safeSize);
  return {
    content,
    page,
    size: safeSize,
    totalElements: items.length,
    totalPages,
    hasNext: (page + 1) * safeSize < items.length,
  };
}

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Lỗi hệ thống, vui lòng thử lại';
