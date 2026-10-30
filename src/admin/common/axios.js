import Axios from "axios";
import toast from "react-hot-toast";

const axios = Axios.create({});

const serverUrl = window.location.href.includes("localhost")
  ? "http://localhost:3001/api/"
  : "https://nkbike.onrender.com/api/";

export const baseURL = serverUrl;

axios.defaults.timeout = 120000;

// =====================================================
// AUTH SESSION
// =====================================================

let logoutTimer = null;
let isLoggingOut = false;

const getToken = () => {
  return (
    localStorage.getItem("adminToken") || localStorage.getItem("accessToken")
  );
};

// =====================================================
// DECODE JWT
// =====================================================

const getTokenPayload = (token) => {
  try {
    const payload = token.split(".")[1];

    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

// =====================================================
// CHECK TOKEN EXPIRED
// =====================================================

const isTokenExpired = (token) => {
  if (!token) return true;

  const payload = getTokenPayload(token);

  if (!payload?.exp) return true;

  return Date.now() >= payload.exp * 1000;
};

// =====================================================
// LOGOUT
// =====================================================

export const logoutAdmin = () => {
  if (isLoggingOut) return;

  isLoggingOut = true;

  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }

  localStorage.removeItem("adminToken");
  localStorage.removeItem("accessToken");

  if (window.location.pathname.startsWith("/admin")) {
    toast.error("Phiên đăng nhập đã hết hạn!");

    setTimeout(() => {
      window.location.replace("/admin/login");
    }, 500);
  } else {
    isLoggingOut = false;
  }
};

// =====================================================
// AUTO LOGOUT TIMER
// =====================================================

export const startAuthSession = () => {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }

  const token = getToken();

  if (!token) return;

  if (isTokenExpired(token)) {
    logoutAdmin();
    return;
  }

  const payload = getTokenPayload(token);

  const remainingTime = payload.exp * 1000 - Date.now();

  logoutTimer = setTimeout(
    () => {
      logoutAdmin();
    },
    Math.min(remainingTime, 2147483647),
  );
};

// =====================================================
// CHECK SESSION WHEN TAB ACTIVE
// =====================================================

const checkAuthSession = () => {
  if (!window.location.pathname.startsWith("/admin")) {
    return;
  }

  if (window.location.pathname === "/admin/login") {
    return;
  }

  const token = getToken();

  if (!token || isTokenExpired(token)) {
    logoutAdmin();
    return;
  }

  startAuthSession();
};

window.addEventListener("focus", checkAuthSession);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    checkAuthSession();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === "adminToken" || event.key === "accessToken") {
    checkAuthSession();
  }
});

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

axios.interceptors.request.use(
  async (config) => {
    const token = getToken();

    config.headers = config.headers || {};

    config.headers["Content-Type"] = "application/json";

    if (token) {
      if (isTokenExpired(token)) {
        logoutAdmin();

        return Promise.reject(new Error("Phiên đăng nhập đã hết hạn"));
      }

      config.headers["Authorization"] = `Bearer ${token}`;
    } else {
      delete config.headers["Authorization"];
    }

    config.credentials = "same-origin";
    config.baseURL = baseURL;

    return config;
  },
  (error) => Promise.reject(error),
);

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

axios.interceptors.response.use(
  (res) => {
    toast.dismiss();

    return res;
  },

  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      const token = getToken();

      // Chỉ logout khi request có token
      if (token) {
        logoutAdmin();
      }
    }

    if (status === 403) {
      console.warn("Không có quyền truy cập");
    }

    return Promise.reject(error);
  },
);

// =====================================================
// INITIAL SESSION
// =====================================================

if (
  window.location.pathname.startsWith("/admin") &&
  window.location.pathname !== "/admin/login"
) {
  checkAuthSession();
}

// =====================================================
// EXPORT
// =====================================================

export default axios;
