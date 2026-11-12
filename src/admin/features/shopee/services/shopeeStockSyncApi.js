import { BASE_URL } from "../../../../api";

// =====================================================
// API URL
// =====================================================

const API_BASE = String(BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

const API_URL = `${API_BASE}/shopee/stock-sync`;

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
// REQUEST
// =====================================================

async function request(endpoint, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      error?.message || "Không thể kết nối máy chủ đồng bộ tồn kho Shopee.",
    );
  }

  const result = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      result.message || "Phiên đăng nhập hết hạn hoặc không có quyền truy cập.",
    );
  }

  if (!response.ok || result.success === false) {
    const error = new Error(
      result.message || `Yêu cầu thất bại (${response.status})`,
    );

    error.status = response.status;
    error.data = result;

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

    query.append(key, String(value));
  });

  const text = query.toString();

  return text ? `?${text}` : "";
}

// =====================================================
// API
// =====================================================

const shopeeStockSyncApi = {
  // Trạng thái đồng bộ
  getStatus() {
    return request("/status");
  },

  // Lấy cấu hình
  getSettings() {
    return request("/settings");
  },

  // Cập nhật cấu hình bật/tắt
  updateSettings(data = {}) {
    return request("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Chạy đồng bộ thủ công
  runNow() {
    return request("/run", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  // Lịch sử đồng bộ
  getHistory(params = {}) {
    return request(`/history${buildQuery(params)}`);
  },
};

export default shopeeStockSyncApi;
