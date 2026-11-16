/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** "true" để hiện ô "Tìm bằng AI" ở trang chủ. Mặc định tắt. */
  readonly VITE_FEATURE_AI_SEARCH?: string;
  /** "true" để hiện trang admin Hoàn tiền. Mặc định tắt. */
  readonly VITE_FEATURE_ADMIN_REFUNDS?: string;
}
