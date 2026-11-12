import { BASE_URL } from "../../../../api";

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
  // SHOPEE CHAT
  // ---------------------------------------------------
  getChatConversations: (params = {}) => get("/chat/conversations", withShopId(params)),
  getChatMessages: (conversationId, params = {}) =>
    get(`/chat/conversations/${encode(conversationId)}/messages`, withShopId(params)),
  sendChatMessage: (conversationId, data = {}) =>
    post(`/chat/conversations/${encode(conversationId)}/messages`, data),
  markChatRead: (conversationId, data = {}) =>
    post(`/chat/conversations/${encode(conversationId)}/read`, data),

  // Compatibility aliases for older Shopee Chat components.
  getShopeeChatConversations: (params = {}) => get("/chat/conversations", withShopId(params)),
  getShopeeChatMessages: (conversationId, params = {}) =>
    get(`/chat/conversations/${encode(conversationId)}/messages`, withShopId(params)),
  sendShopeeChatMessage: (conversationId, data = {}) =>
    post(`/chat/conversations/${encode(conversationId)}/messages`, data),
  readShopeeChatConversation: (conversationId, data = {}) =>
    post(`/chat/conversations/${encode(conversationId)}/read`, data),
  getChatReviewTasks: (params = {}) => get("/chat/review-tasks", withShopId(params)),
  updateChatReviewTask: (taskId, data = {}) =>
    request(`/chat/review-tasks/${encode(taskId)}${buildQuery({ shopId: data.shopId })}`, { method: "PATCH", body: data }),

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

  // Lấy dữ liệu vận đơn Shopee để tự thiết kế PDF.
  getWaybillData: (orderSn, data = {}) =>
    post(`/orders/${encode(orderSn)}/waybill-data`, data),

  // Vận đơn PDF gốc do Shopee tạo.
  getOfficialWaybillParameters: (data = {}) => post("/waybills/parameters", data),
  createOfficialWaybills: (data = {}) => post("/waybills/create", data),
  getOfficialWaybillResult: (data = {}) => post("/waybills/result", data),
  downloadOfficialWaybills: async (data = {}) => {
    const token = getToken();
    let response;
    try {
      response = await fetch(`${API_URL}/waybills/download`, {
        method: "POST",
        headers: {
          Accept: "application/pdf, application/octet-stream, text/html, application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      throw new Error(error?.message || "Không thể tải vận đơn Shopee.");
    }
    if (!response.ok) {
      let payload = null;
      try { payload = await response.json(); } catch {}
      throw new Error(payload?.message || `Tải vận đơn thất bại (${response.status})`);
    }
    return {
      blob: await response.blob(),
      contentType: response.headers.get("content-type") || "application/pdf",
    };
  },

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
  // SHOPEE RETURNS
  // ---------------------------------------------------

  // Đồng bộ cả khách trả hàng và giao hàng thất bại
  syncReturns: (data = {}) =>
    post("/returns/sync", {
      ...data,
      ...withShopId(data),
    }),

  // Danh sách hàng hoàn
  getReturns: (params = {}) => get("/returns", withShopId(params)),

  // Chi tiết phiếu hàng hoàn
  getReturnDetail: (returnSn, params = {}) =>
    get(`/returns/${encode(returnSn)}`, withShopId(params)),

  // Xác nhận đã nhận kiện hàng
  receiveShopeeReturn: (returnSn, data = {}) =>
    post(`/returns/${encode(returnSn)}/receive`, {
      ...data,
      ...withShopId(data),
    }),

  // Lưu kết quả kiểm tra hàng
  inspectShopeeReturn: (returnSn, data = {}) =>
    post(`/returns/${encode(returnSn)}/inspect`, {
      ...data,
      ...withShopId(data),
    }),

  // Quyết định nhập kho hoặc không nhập kho
  resolveShopeeReturn: (returnSn, data = {}) =>
    post(`/returns/${encode(returnSn)}/resolve`, {
      ...data,
      ...withShopId(data),
    }),

  // ---------------------------------------------------
  // AUTO STOCK MANAGEMENT
  // ---------------------------------------------------

  getAutoStockOrders: (params = {}) => get("/auto-stock/orders", params),

  getAutoStockHistory: (params = {}) => get("/auto-stock/history", params),

  getAutoStockSettings: () => get("/auto-stock/settings"),

  saveAutoStockSettings: (data = {}) => put("/auto-stock/settings", data),

  runAutoStockNow: () => post("/auto-stock/run"),

  processAutoStockSelected: (orderSns = []) =>
    post("/auto-stock/process-selected", { orderSns }),

  // ---------------------------------------------------
  // REVENUE & PROFIT MANAGEMENT
  // ---------------------------------------------------

  getRevenueOverview: (params = {}) => get("/revenue/overview", params),

  getRevenueReport: (params = {}) => get("/revenue/report", withShopId(params)),

  getRevenueOrders: (params = {}) => get("/revenue/orders", withShopId(params)),

  // =====================================================
  // SHOPEE REVIEW MANAGEMENT
  // =====================================================

  // Lấy một trang đánh giá
  getReviews: (params = {}) => get("/reviews", withShopId(params)),

  // Quét đánh giá trên toàn bộ sản phẩm
  getAllReviews: (params = {}) => get("/reviews/all", withShopId(params)),

  // Tạo nội dung gợi ý
  suggestReviewReply: (data = {}) => post("/reviews/suggest", data),

  // Gửi phản hồi
  replyReview: (data = {}) => post("/reviews/reply", data),

  // =====================================================
  // REVIEW TEMPLATES
  // =====================================================

  getReviewTemplates: (params = {}) =>
    get("/reviews/templates", withShopId(params)),

  createReviewTemplate: (data = {}) => post("/reviews/templates", data),

  updateReviewTemplate: (id, data = {}) =>
    put(`/reviews/templates/${encode(id)}`, data),

  deleteReviewTemplate: (id, shopId) =>
    request(`/reviews/templates/${encode(id)}${buildQuery({ shopId })}`, {
      method: "DELETE",
    }),
  // =====================================================
  // SHOPEE REVIEW AUTO REPLY HISTORY
  // =====================================================

  // Lấy lịch sử tự động trả lời
  getReviewReplyLogs: (params = {}) =>
    get("/reviews/reply-logs", withShopId(params)),

  // Thống kê tự động trả lời
  getReviewReplyStatistics: (params = {}) =>
    get("/reviews/reply-logs/statistics", withShopId(params)),

  // Chi tiết một lịch sử trả lời
  getReviewReplyLogDetail: (commentId, params = {}) =>
    get(`/reviews/reply-logs/${encode(commentId)}`, withShopId(params)),
  // =====================================================
  // SHOPEE LIVE PRODUCT MANAGEMENT
  // =====================================================

  // Danh sách sản phẩm Shopee
  getManagedProducts: (params = {}) =>
    get("/management/products", withShopId(params)),

  // Chi tiết sản phẩm
  getManagedProductDetail: (itemId, params = {}) =>
    get(`/management/products/${encode(itemId)}`, withShopId(params)),

  // Cập nhật thông tin cơ bản
  updateManagedProduct: (itemId, data = {}) =>
    put(`/management/products/${encode(itemId)}`, data),

  // Cập nhật giá các phân loại
  updateManagedProductPrices: (itemId, data = {}) =>
    put(`/management/products/${encode(itemId)}/prices`, data),

  // Cập nhật tồn kho các phân loại
  updateManagedProductStock: (itemId, data = {}) =>
    put(`/management/products/${encode(itemId)}/stock`, data),
};

export default shopeeApi;
