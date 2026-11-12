import { BASE_URL } from "../../../../api";

// =====================================================
// API URL
// =====================================================

const API_BASE = String(BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

const API_URL = `${API_BASE}/shopee/reviews/auto-reply`;

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

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      result.message || "Bạn không có quyền truy cập chức năng này.",
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Yêu cầu thất bại (${response.status})`);
  }

  return result;
}

// =====================================================
// API
// =====================================================

const shopeeAutoReviewApi = {
  // Lấy cấu hình và trạng thái cron
  getStatus() {
    return request("/status");
  },

  // Cập nhật cấu hình
  updateSettings(data = {}) {
    return request("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Bật tự động trả lời
  enable() {
    return request("/enable", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  // Tắt tự động trả lời
  disable() {
    return request("/disable", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  // Chạy thủ công
  runNow() {
    return request("/run", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  // Lịch sử tự động trả lời
  getHistory(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      ),
    ).toString();

    return request(`/history${query ? `?${query}` : ""}`);
  },
};

export default shopeeAutoReviewApi;
