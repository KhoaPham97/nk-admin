import { BASE_URL } from "../../api";

const API_URL = `${String(BASE_URL || "").replace(/\/+$/, "")}/shopee/reviews/auto-reply`;

function getToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Yêu cầu thất bại (${response.status})`);
  }

  return result;
}

const shopeeAutoReviewApi = {
  getStatus() {
    return request("/status");
  },

  updateSettings(data = {}) {
    return request("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  enable() {
    return request("/enable", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  disable() {
    return request("/disable", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  runNow() {
    return request("/run", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  getHistory(params = {}) {
    const query = new URLSearchParams(params).toString();

    return request(`/history${query ? `?${query}` : ""}`);
  },
};

export default shopeeAutoReviewApi;
