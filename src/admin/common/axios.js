// axios.js
import Axios from "axios";
import toast from "react-hot-toast";

const axios = Axios.create({});
const serverUrl = window.location.href.includes("localhost")
  ? "http://localhost:3001/api/"
  : "https://nkbike.onrender.com/api/";
export const baseURL = `${serverUrl}`;

axios.defaults.timeout = 120000; // Milliseconds
axios.interceptors.request.use(
  async function (config) {
    // Retreive token from Redux OR localStorage or ....

    config.headers["Content-Type"] = "application/json";
    config.credentials = "same-origin";
    config.baseURL = baseURL;

    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
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
      // Handle unauthorized error (e.g., log out the user)
    }
    throw error; // Propagate the error
  }
);

export default axios;
