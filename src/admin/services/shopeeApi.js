import { BASE_URL } from "../../api";

// =====================================================
// API URL
// =====================================================

function normalizeApiUrl(url) {
  let base = String(url || "")
    .trim()
    .replace(/\/+$/, "");

  if (!base) {
    base = BASE_URL;
  }

  if (/\/api\/shopee$/i.test(base)) {
    return base;
  }

  if (/\/api$/i.test(base)) {
    return `${base}/shopee`;
  }

  return `${base}/api/shopee`;
}

const API_URL = normalizeApiUrl(BASE_URL);

// =====================================================
// AUTH
// =====================================================

function getToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}
// =====================================================
// SHOP QUERY HELPER
// =====================================================

const withShopId = (params = {}) => {
  const shopId = params.shop_id ?? params.shopId;

  if (!shopId) {
    throw new Error("Vui lòng chọn shop Shopee trước.");
  }

  return {
    ...params,
    shop_id: String(shopId),
    shopId: String(shopId),
  };
};

// =====================================================
// REQUEST
// =====================================================

async function request(endpoint, options = {}) {
  const token = getToken();

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      body:
        options.body && typeof options.body !== "string" && !isFormData
          ? JSON.stringify(options.body)
          : options.body,
    });
  } catch (error) {
    throw new Error(error?.message || "Không thể kết nối máy chủ Shopee.");
  }

  let result;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    const message =
      result?.message ||
      result?.error ||
      `Yêu cầu thất bại (${response.status})`;

    const error = new Error(message);

    error.status = response.status;
    error.data = result;

    if (response.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("accessToken");
    }

    throw error;
  }

  return result;
}

// =====================================================
// QUERY
// =====================================================

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          query.append(key, String(item));
        }
      });

      return;
    }

    if (typeof value === "object") {
      query.append(key, JSON.stringify(value));
      return;
    }

    query.append(key, String(value));
  });

  const result = query.toString();

  return result ? `?${result}` : "";
}

// =====================================================
// HTTP HELPERS
// =====================================================

const get = (url, params) => request(`${url}${buildQuery(params)}`);

const post = (url, data = {}) =>
  request(url, {
    method: "POST",
    body: data,
  });

const put = (url, data = {}) =>
  request(url, {
    method: "PUT",
    body: data,
  });

const del = (url) =>
  request(url, {
    method: "DELETE",
  });

// =====================================================
// URL HELPERS
// =====================================================

const encode = (value) => encodeURIComponent(String(value ?? ""));

// =====================================================
// SHOPEE API
// =====================================================

export const shopeeApi = {
  // ---------------------------------------------------
  // SHOP MANAGEMENT
  // ---------------------------------------------------

  connectShop: (data = {}) => post("/auth", data),

  getShops: () => get("/shops"),

  refreshToken: (data = {}) => post("/refresh-token", data),

  disconnectShop: (shopId) => del(`/shops/${encode(shopId)}`),

  // ---------------------------------------------------
  // ORDER MANAGEMENT
  // ---------------------------------------------------

  syncOrders: (data = {}) => post("/orders/sync", data),

  getOrders: (params = {}) => get("/orders", withShopId(params)),

  getOrderDetail: (orderSn, params = {}) =>
    get(`/orders/${encode(orderSn)}`, params),

  getSyncStatus: () => get("/sync/status"),

  updateOrderStatus: (orderSn, data = {}) =>
    put(`/orders/${encode(orderSn)}/status`, data),
  // ---------------------------------------------------
  // SKU MAPPING
  // ---------------------------------------------------

  getSkuMappings: (params = {}) =>
    get("/management/sku-mappings", withShopId(params)),

  createSkuMapping: (data = {}) => post("/management/sku-mappings", data),

  updateSkuMapping: (id, data = {}) =>
    put(`/management/sku-mappings/${encode(id)}`, data),

  deleteSkuMapping: (id) => del(`/management/sku-mappings/${encode(id)}`),

  autoMatchSkuMappings: (data = {}) =>
    post("/management/sku-mappings/auto-match", data),
  // ---------------------------------------------------
  // STOCK MANAGEMENT
  // ---------------------------------------------------

  getPendingStockOrders: (params = {}) => get("/stock/pending-orders", params),

  getStockSummary: (params = {}) => get("/stock/summary", params),

  getStockTransactions: (params = {}) => get("/stock/transactions", params),

  getOrderStockDetail: (orderSn, params = {}) =>
    get(`/orders/${encode(orderSn)}/stock`, params),

  reserveOrderStock: (orderSn, data = {}) =>
    post(`/orders/${encode(orderSn)}/stock/reserve`, data),

  releaseOrderStock: (orderSn, data = {}) =>
    post(`/orders/${encode(orderSn)}/stock/release`, data),

  previewStockDeduction: (orderSn, data = {}) =>
    post(`/orders/${encode(orderSn)}/stock/preview`, data),

  deductStock: (orderSn, data = {}) =>
    post(`/orders/${encode(orderSn)}/stock/deduct`, data),

  getStockHistory: (orderSn, params = {}) =>
    get(`/orders/${encode(orderSn)}/stock/history`, params),

  // ---------------------------------------------------
  // RETURNS
  // ---------------------------------------------------

  receiveReturn: (orderSn, data = {}) =>
    post(`/orders/${encode(orderSn)}/returns/receive`, data),

  // ---------------------------------------------------
  // AUTO STOCK MANAGEMENT
  // ---------------------------------------------------

  // Danh sách đơn cần tự động trừ kho
  getAutoStockOrders: (params = {}) => get("/auto-stock/orders", params),

  // Lịch sử chạy Job
  getAutoStockHistory: (params = {}) => get("/auto-stock/history", params),

  // Lấy cấu hình tự động
  getAutoStockSettings: () => get("/auto-stock/settings"),

  // Lưu cấu hình tự động
  saveAutoStockSettings: (data = {}) => put("/auto-stock/settings", data),

  // Chạy Job ngay
  runAutoStockNow: () => post("/auto-stock/run"),

  // Xử lý nhiều đơn
  processAutoStockSelected: (orderSns = []) =>
    post("/auto-stock/process-selected", { orderSns }),
  // ---------------------------------------------------
  // REVENUE & PROFIT MANAGEMENT
  // ---------------------------------------------------

  getRevenueOverview: (params = {}) => get("/revenue/overview", params),

  getRevenueReport: (params = {}) => get("/revenue/report", withShopId(params)),

  getRevenueOrders: (params = {}) => get("/revenue/orders", withShopId(params)),
};

export default shopeeApi;
