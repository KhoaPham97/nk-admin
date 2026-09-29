import { FC, FormEvent, useState } from "react";
import {
  AiOutlineArrowLeft,
  AiOutlineLock,
  AiOutlineMail,
} from "react-icons/ai";
import { FaUser } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

const LoginForm: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* =====================================================
     QUAY LẠI TRANG TRƯỚC
  ===================================================== */

  const handleClose = () => {
    const state = location.state as { from?: string } | null;

    if (state?.from) {
      navigate(state.from, { replace: true });
      return;
    }

    navigate("/", { replace: true });
  };

  /* =====================================================
     QUA TRANG ĐĂNG KÝ
  ===================================================== */

  const goToRegister = () => {
    const state = location.state as { from?: string } | null;

    navigate("/register", {
      state: {
        from: state?.from || "/",
      },
    });
  };

  /* =====================================================
     LOGIN
  ===================================================== */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!account.trim()) {
      return;
    }

    if (!password.trim()) {
      return;
    }

    try {
      setLoading(true);

      /*
       * TODO:
       * Gắn API login hiện tại của bạn vào đây.
       *
       * Ví dụ:
       *
       * const response = await axios.post(...)
       *
       * Sau khi login thành công:
       *
       * const state = location.state as { from?: string } | null;
       *
       * navigate(state?.from || "/", {
       *   replace: true,
       * });
       */

      console.log({
        account,
        password,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
            {/* ACCOUNT */}

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
                Email hoặc số điện thoại
              </label>

              <div className="relative">
                <AiOutlineMail
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
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="Nhập email hoặc số điện thoại"
                  autoComplete="username"
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
                    dark:border-gray-700
                    dark:bg-gray-800
                    dark:text-white
                    dark:focus:bg-gray-800
                  "
                />
              </div>
            </div>

            {/* PASSWORD */}

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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
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
                    dark:border-gray-700
                    dark:bg-gray-800
                    dark:text-white
                  "
                />
              </div>
            </div>

            {/* LOGIN */}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full
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
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            {/* REGISTER */}

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
                className="
                  ml-1
                  font-semibold
                  text-blue-600
                  hover:underline
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
