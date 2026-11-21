// API dùng chung cho môi trường Local, Render và Cloudflare.
// Production mặc định tiếp tục dùng Backend Render đang hoạt động.
const RENDER_API_URL = "https://nkbike.onrender.com/api";

const configuredApiUrl =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

const normalizeApiUrl = (url: string) => String(url).trim().replace(/\\/+$/, "");
const isLocalApiUrl = (url: string) =>
  /^https?:\\/\\/(localhost|127\\.0\\.0\\.1|\\[::1\\])(?::\\d+)?(\\/|$)/i.test(url);

// Bỏ qua cấu hình localhost cũ để FE không gọi nhầm máy của người dùng.
// Có thể chủ động đổi API bằng VITE_API_URL khi cần.
const BASE_URL = normalizeApiUrl(
  configuredApiUrl && !isLocalApiUrl(configuredApiUrl)
    ? configuredApiUrl
    : RENDER_API_URL,
);

export { BASE_URL };
export const DEFAUL_URL = BASE_URL.replace(/\\/api$/i, "");
export const API_ENDPOINTS = {
  // AUTH
  SIGNIN: `${BASE_URL}/signin`,
  SIGNUP: `${BASE_URL}/signup`,
  LOGIN: `${BASE_URL}/customers/login`,

  // PRODUCTS
  PRODUCTS: `${BASE_URL}/products`,
  PRODUCTS_CATEGORIES: `${BASE_URL}/categorys`,
  PRODUCTS_SEARCH: `${BASE_URL}/products/search`,
  PRODUCTS_CATEGORY: `${BASE_URL}/products/category`,
  PRODUCTS_ID: `${BASE_URL}/product/:id`,
  PRODUCTS_CATEGORY_ID: `${BASE_URL}/products/category/:id`,
  PRODUCTS_CATEGORY_ID_PRODUCTS: `${BASE_URL}/products/category/:id/products`,
  PRODUCTS_CATEGORY_ID_PRODUCTS_ID: `${BASE_URL}/products/category/:id/products/:id`,
  PRODUCTS_CATEGORY_ID_PRODUCTS_ID_PRODUCTS: `${BASE_URL}/products/category/:id/products/:id/products`,

  // VEHICLES
  VEHICLES: `${BASE_URL}/vehicles`,
  VEHICLE_ID: `${BASE_URL}/vehicles/:id`,
  VEHICLE_ID_PRODUCTS: `${BASE_URL}/vehicles/:id/products`,
  VEHICLE_BRANDS: `${BASE_URL}/vehicles/brands`,
  VEHICLES_BY_BRAND: `${BASE_URL}/vehicles/by-brand`,

  // USER
  USER: `${BASE_URL}/user/:id`,
  CARTUSER: `${BASE_URL}/user/:id/move-cart-to-db`,

  // CUSTOMERS
  CUSTOMERS: `${BASE_URL}/customers`,

  // ORDERS
  ORDERS: `${BASE_URL}/order`,
  ORDER: `${BASE_URL}/order`,
  SYNC_ORDER_VARIANTS: `${BASE_URL}/order/sync-variants`,

  // ANALYTICS
  ANALYTICS_DASHBOARD: `${BASE_URL}/analytics/dashboard`,
  ANALYTICS_TRACK: `${BASE_URL}/analytics/track`,

  // SETTINGS
  SETTINGS: `${BASE_URL}/settings`,

  // ADMIN
  CHANGE_ADMIN_PASSWORD: `${BASE_URL}/admin/change-password`,

  // INVENTORY
  INVENTORY_HISTORY: `${BASE_URL}/inventory-history`,
  INVENTORY_RECEIPTS: `${BASE_URL}/inventory`,
  INVENTORY_BATCHES: `${BASE_URL}/inventory-batch`,
  INVENTORY_BATCH_IMPORT: `${BASE_URL}/inventory-batch/import`,
  INVENTORY_BATCH_IMPORT_MULTIPLE: `${BASE_URL}/inventory-batch/import-multiple`,
};
