import { FC, FormEvent, useState } from "react";
import axios from "axios";
import {
  AiOutlineArrowLeft,
  AiOutlineLock,
  AiOutlineEye,
  AiOutlineEyeInvisible,
} from "react-icons/ai";
import { FaUser } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../api";

// =====================================================
// API
// =====================================================

const API_URL = API_ENDPOINTS.LOGIN || "";

// =====================================================
// TYPES
// =====================================================

interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  accessToken?: string;
  customer?: {
    _id: string;
    name: string;
    phone?: string;
    address?: string;
    email?: string;
    username: string;
    status?: string;

    totalOrders?: number;
    totalSpent?: number;
    totalPurchased?: number;
    totalPaid?: number;
    debt?: number;

    note?: string;
    lastLoginAt?: string;
    created_at?: string;
    updated_at?: string;
  };
}

// =====================================================
// COMPONENT
// =====================================================

const LoginForm: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // QUAY LẠI TRANG TRƯỚC
  // =====================================================

  const handleClose = () => {
    const state = location.state as {
      from?: string;
    } | null;

    if (state?.from) {
      navigate(state.from, {
        replace: true,
      });

      return;
    }

    navigate("/", {
      replace: true,
    });
  };

  // =====================================================
  // QUA TRANG ĐĂNG KÝ
  // =====================================================

  const goToRegister = () => {
    const state = location.state as {
      from?: string;
    } | null;

    navigate("/register", {
      state: {
        from: state?.from || "/",
      },
    });
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setErrorMessage("");

    const username = account.trim().toLowerCase();
    const loginPassword = password;

    // =====================================================
    // VALIDATE
    // =====================================================

    if (!username) {
      setErrorMessage("Vui lòng nhập username");

      return;
    }

    if (!loginPassword) {
      setErrorMessage("Vui lòng nhập mật khẩu");

      return;
    }

    try {
      setLoading(true);

      // =====================================================
      // CALL API
      // =====================================================

      const response = await axios.post<LoginResponse>(
        `${API_URL}`,
        {
          username,
          password: loginPassword,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = response.data;

      // =====================================================
      // CHECK RESPONSE
      // =====================================================

      if (!data.success || !data.customer) {
        setErrorMessage(data.message || "Đăng nhập không thành công");

        return;
      }

      // =====================================================
      // TOKEN
      // =====================================================

      const token = data.accessToken || data.token;

      if (!token) {
        setErrorMessage("Đăng nhập thành công nhưng không nhận được token");

        return;
      }

      // =====================================================
      // LƯU LOGIN
      // =====================================================

      localStorage.setItem("customerToken", token);

      localStorage.setItem("customerAccessToken", token);

      // =====================================================
      // LƯU CUSTOMER
      // =====================================================

      localStorage.setItem("customer", JSON.stringify(data.customer));

      // =====================================================
      // GIỮ LẠI USERNAME
      // =====================================================

      localStorage.setItem("customerUsername", data.customer.username);

      // =====================================================
      // LOGIN THÀNH CÔNG
      // =====================================================
      const state = location.state as {
        from?: string;
      } | null;

      const redirectPath = state?.from || "/";
      window.location.href = redirectPath;
    } catch (error: any) {
      console.error("Customer login error:", error);

      // =====================================================
      // API RESPONSE ERROR
      // =====================================================

      if (error?.response) {
        const status = error.response.status;

        const message = error.response.data?.message;

        if (status === 401) {
          setErrorMessage(message || "Username hoặc mật khẩu không đúng");

          return;
        }

        if (status === 403) {
          setErrorMessage(message || "Tài khoản đã bị khóa");

          return;
        }

        if (status === 400) {
          setErrorMessage(message || "Thông tin đăng nhập không hợp lệ");

          return;
        }

        if (status >= 500) {
          setErrorMessage(
            message || "Máy chủ đang gặp lỗi. Vui lòng thử lại sau.",
          );

          return;
        }

        setErrorMessage(message || "Đăng nhập không thành công");

        return;
      }

      // =====================================================
      // NETWORK ERROR
      // =====================================================

      if (error?.code === "ERR_NETWORK") {
        setErrorMessage("Không thể kết nối đến máy chủ");

        return;
      }

      setErrorMessage("Đã xảy ra lỗi khi đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="
        min-h-screen
        bg-gray-50
        px-4
        py-8
        dark:bg-slate-950
        sm:flex
        sm:items-center
        sm:justify-center
      "
    >
      <div className="w-full max-w-md">
        {/* =================================================
            BACK
        ================================================= */}

        <button
          type="button"
          onClick={handleClose}
          className="
            mb-5
            flex
            items-center
            gap-2
            rounded-lg
            px-2
            py-2
            text-sm
            font-semibold
            text-gray-600
            transition
            hover:text-blue-600
            dark:text-gray-300
            dark:hover:text-blue-400
          "
        >
          <AiOutlineArrowLeft size={20} />

          <span>Quay lại</span>
        </button>

        {/* =================================================
            CARD
        ================================================= */}

        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-gray-100
            bg-white
            shadow-xl
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              bg-gradient-to-r
              from-blue-600
              to-blue-500
              px-6
              py-8
              text-center
              text-white
            "
          >
            <div
              className="
                mx-auto
                mb-3
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-full
                bg-white/20
              "
            >
              <FaUser size={28} />
            </div>

            <h2 className="text-2xl font-bold">Đăng nhập</h2>

            <p className="mt-1 text-sm text-blue-100">
              Đăng nhập tài khoản Nhật Khang Bike
            </p>
          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {/* =================================================
                ERROR
            ================================================= */}

            {errorMessage && (
              <div
                className="
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-red-600
                  dark:border-red-900/50
                  dark:bg-red-950/30
                  dark:text-red-400
                "
              >
                {errorMessage}
              </div>
            )}

            {/* =================================================
                ACCOUNT
            ================================================= */}

            <div>
              <label
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-gray-700
                  dark:text-gray-200
                "
              >
                Tên tài khoản
              </label>

              <div className="relative">
                <FaUser
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                  "
                  size={17}
                />

                <input
                  type="text"
                  value={account}
                  onChange={(e) => {
                    setAccount(e.target.value);

                    if (errorMessage) {
                      setErrorMessage("");
                    }
                  }}
                  placeholder="Nhập username"
                  autoComplete="username"
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    py-3
                    pl-11
                    pr-4
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:bg-white
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:border-gray-700
                    dark:bg-gray-800
                    dark:text-white
                    dark:focus:bg-gray-800
                  "
                />
              </div>

              <p
                className="
                  mt-1.5
                  text-xs
                  text-gray-400
                "
              >
                Sử dụng username được cấp khi đăng ký tài khoản.
              </p>
            </div>

            {/* =================================================
                PASSWORD
            ================================================= */}

            <div>
              <label
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-gray-700
                  dark:text-gray-200
                "
              >
                Mật khẩu
              </label>

              <div className="relative">
                <AiOutlineLock
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                  "
                  size={20}
                />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);

                    if (errorMessage) {
                      setErrorMessage("");
                    }
                  }}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    py-3
                    pl-11
                    pr-12
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:bg-white
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:border-gray-700
                    dark:bg-gray-800
                    dark:text-white
                    dark:focus:bg-gray-800
                  "
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                    transition
                    hover:text-blue-600
                    disabled:cursor-not-allowed
                    dark:hover:text-blue-400
                  "
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <AiOutlineEyeInvisible size={21} />
                  ) : (
                    <AiOutlineEye size={21} />
                  )}
                </button>
              </div>
            </div>

            {/* =================================================
                LOGIN
            ================================================= */}

            <button
              type="submit"
              disabled={loading || !account.trim() || !password}
              className="
                flex
                w-full
                items-center
                justify-center
                rounded-xl
                bg-blue-600
                py-3
                font-semibold
                text-white
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="
                      h-5
                      w-5
                      animate-spin
                      rounded-full
                      border-2
                      border-white/30
                      border-t-white
                    "
                  />
                  Đang đăng nhập...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </button>

            {/* =================================================
                REGISTER
            ================================================= */}

            <div
              className="
                text-center
                text-sm
                text-gray-500
                dark:text-gray-400
              "
            >
              Chưa có tài khoản?
              <button
                type="button"
                onClick={goToRegister}
                disabled={loading}
                className="
                  ml-1
                  font-semibold
                  text-blue-600
                  hover:underline
                  disabled:cursor-not-allowed
                  dark:text-blue-400
                "
              >
                Đăng ký ngay
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
