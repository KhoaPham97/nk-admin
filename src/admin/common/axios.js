// axios.js
import Axios from "axios";
import toast from "react-hot-toast";

const axios = Axios.create({});

const serverUrl = window.location.href.includes("localhost")
  ? "http://localhost:3001/api/"
  : "https://nkbike.onrender.com/api/";

export const baseURL = `${serverUrl}`;

axios.defaults.timeout = 120000;

axios.interceptors.request.use(
  async function (config) {
    // Lấy token mới nhất mỗi lần gọi API
    const token =
      localStorage.getItem("adminToken") || localStorage.getItem("accessToken");

    config.headers = config.headers || {};

    config.headers["Content-Type"] = "application/json";

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    } else {
      delete config.headers["Authorization"];
    }

    config.credentials = "same-origin";
    config.baseURL = baseURL;

    return config;
  },
  function (error) {
    return Promise.reject(error);
  },
);

axios.interceptors.response.use(
  (res) => {
    toast.dismiss();
    return res;
  },
  (error) => {
    if (error?.response?.status === 403) {
      // Handle forbidden error
    }

    if (error?.response?.status === 401) {
      // Handle unauthorized error
    }

    throw error;
  },
);

export default axios;
