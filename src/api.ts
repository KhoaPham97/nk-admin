export const BASE_URL = window.location.href.includes("localhost")
  ? "http://localhost:3001/api"
  : "https://nkbike.onrender.com/api";

export const DEFAUL_URL = window.location.href.includes("localhost")
  ? "http://localhost:3001"
  : "https://nkbike.onrender.com";

export const API_ENDPOINTS = {
  // =========================
  // AUTH
  // =========================
  SIGNIN: `${BASE_URL}/signin`,
  SIGNUP: `${BASE_URL}/signup`,
  LOGIN: `${BASE_URL}/customers/login`,

  // =========================
  // PRODUCTS
  // =========================
  PRODUCTS: `${BASE_URL}/products`,
  PRODUCTS_CATEGORIES: `${BASE_URL}/categorys`,
  PRODUCTS_SEARCH: `${BASE_URL}/products/search`,
  PRODUCTS_CATEGORY: `${BASE_URL}/products/category`,
  PRODUCTS_ID: `${BASE_URL}/product/:id`,
  PRODUCTS_CATEGORY_ID: `${BASE_URL}/products/category/:id`,
  PRODUCTS_CATEGORY_ID_PRODUCTS: `${BASE_URL}/products/category/:id/products`,
  PRODUCTS_CATEGORY_ID_PRODUCTS_ID: `${BASE_URL}/products/category/:id/products/:id`,
  PRODUCTS_CATEGORY_ID_PRODUCTS_ID_PRODUCTS: `${BASE_URL}/products/category/:id/products/:id/products`,

  // =========================
  // VEHICLES
  // =========================

  // Danh sách xe
  VEHICLES: `${BASE_URL}/vehicles`,

  // Chi tiết xe
  VEHICLE_ID: `${BASE_URL}/vehicles/:id`,

  // Danh sách phụ tùng tương thích với xe
  VEHICLE_ID_PRODUCTS: `${BASE_URL}/vehicles/:id/products`,

  // Danh sách hãng xe
  VEHICLE_BRANDS: `${BASE_URL}/vehicles/brands`,

  // Danh sách xe theo hãng
  VEHICLES_BY_BRAND: `${BASE_URL}/vehicles/by-brand`,

  // =========================
  // USER
  // =========================
  USER: `${BASE_URL}/user/:id`,
  CARTUSER: `${BASE_URL}/user/:id/move-cart-to-db`,

  // =========================
  // CUSTOMERS
  // =========================
  CUSTOMERS: `${BASE_URL}/customers`,

  // =========================
  // ORDERS
  // =========================
  ORDER: `${BASE_URL}/order`,
  SYNC_ORDER_VARIANTS: `${BASE_URL}/order/sync-variants`,

  // =========================
  // CHATGPT
  // =========================
  CHATGPT: `${BASE_URL}/chatgpt`,

  // =========================
  // ANALYTICS
  // =========================
  ANALYTICS_DASHBOARD: `${BASE_URL}/analytics/dashboard`,
  ANALYTICS_TRACK: `${BASE_URL}/analytics/track`,

  // =========================
  // SETTINGS
  // =========================
  SETTINGS: `${BASE_URL}/settings`,

  // =========================
  // ADMIN
  // =========================
  CHANGE_ADMIN_PASSWORD: `${BASE_URL}/admin/change-password`,

  // =========================
  // INVENTORY
  // =========================
  INVENTORY_HISTORY: `${BASE_URL}/inventory-history`,
  INVENTORY_RECEIPTS: `${BASE_URL}/inventory`,
};
