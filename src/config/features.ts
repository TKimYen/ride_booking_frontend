/**
 * Cờ tính năng, đọc từ biến môi trường lúc build (Vite thay `import.meta.env.*` bằng giá trị cố định).
 * Chỉ "true" hoặc "1" là bật; bỏ trống / giá trị khác là TẮT, để bản deploy không vô tình lộ tính năng dở.
 * Đổi cờ trên Vercel thì phải Redeploy mới có hiệu lực.
 *
 * Tắt cờ: ẩn menu/nút, và vào thẳng đường dẫn thì bị chuyển về trang chủ (không phải 404) — xem RequireFeature.
 */
export const isOn = (value: string | undefined) => {
  const v = value?.trim().toLowerCase();
  return v === 'true' || v === '1';
};

export const FEATURES = {
  /** Ô "Tìm bằng AI" ở trang chủ (Gemini — POST /api/ai/trip-search). */
  aiSearch: isOn(import.meta.env.VITE_FEATURE_AI_SEARCH),
  /** Trang admin xem/thử lại khoản hoàn tiền lỗi (GET /api/admin/refunds). */
  adminRefunds: isOn(import.meta.env.VITE_FEATURE_ADMIN_REFUNDS),
} as const;

export type FeatureName = keyof typeof FEATURES;
