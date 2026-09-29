import { FC, FormEvent, useState } from "react";
import {
  AiOutlineArrowLeft,
  AiOutlineLock,
  AiOutlineMail,
  AiOutlinePhone,
} from "react-icons/ai";
import { FaUser } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

const RegisterForm: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     TRANG TRƯỚC ĐÓ
  ===================================================== */

  const state = location.state as { from?: string } | null;

  const from = state?.from || "/";

  /* =====================================================
     QUAY LẠI
  ===================================================== */

  const handleBack = () => {
    navigate(from, {
      replace: true,
    });
  };

  /* =====================================================
     QUA TRANG LOGIN
  ===================================================== */

  const goToLogin = () => {
    navigate("/login", {
      state: {
        from,
      },
    });
  };

  /* =====================================================
     REGISTER
  ===================================================== */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");

    if (
      !fullName.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);

      /*
       * TODO:
       * Gắn API đăng ký hiện tại của bạn vào đây.
       *
       * Ví dụ:
       *
       * const response = await axios.post(...)
       *
       * Sau khi API đăng ký thành công:
       *
       * setSuccess(true);
       */

      console.log({
        fullName,
        phone,
        email,
        password,
      });

      setSuccess(true);
    } catch (error: any) {
      console.error(error);

      setError(
        error?.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     REGISTER SUCCESS
  ===================================================== */

  if (success) {
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
          {/* BACK */}

          <button
            type="button"
            onClick={handleBack}
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

          {/* SUCCESS CARD */}

          <div
            className="
              rounded-2xl
              border
              border-gray-100
              bg-white
              p-8
              text-center
              shadow-xl
              dark:border-slate-800
              dark:bg-slate-900
            "
          >
            {/* SUCCESS ICON */}

            <div
              className="
                mx-auto
                mb-5
                flex
                h-20
                w-20
                items-center
                justify-center
                rounded-full
                bg-green-100
                text-4xl
                text-green-600
                dark:bg-green-900/30
                dark:text-green-400
              "
            >
              ✓
            </div>

            <h2
              className="
                text-2xl
                font-bold
                text-gray-900
                dark:text-white
              "
            >
              Đăng ký thành công
            </h2>

            <p
              className="
                mt-4
                leading-6
                text-gray-600
                dark:text-gray-300
              "
            >
              Tài khoản của bạn đã được tạo thành công.
            </p>

            {/* PENDING */}

            <div
              className="
                mt-5
                rounded-xl
                border
                border-yellow-200
                bg-yellow-50
                p-4
                text-left
                text-sm
                leading-6
                text-yellow-800
                dark:border-yellow-900/50
                dark:bg-yellow-900/20
                dark:text-yellow-300
              "
            >
              <strong>Đang chờ xét duyệt</strong>
              <br />
              Tài khoản của bạn đang chờ quản trị viên Nhật Khang Bike xét
              duyệt.
              <br />
              Bạn sẽ có thể đăng nhập sau khi tài khoản được duyệt.
            </div>

            {/* LOGIN */}

            <button
              type="button"
              onClick={goToLogin}
              className="
                mt-6
                w-full
                rounded-xl
                bg-blue-600
                py-3
                font-semibold
                text-white
                transition
                hover:bg-blue-700
              "
            >
              Đi đến đăng nhập
            </button>

            {/* HOME */}

            <button
              type="button"
              onClick={() => navigate("/")}
              className="
                mt-3
                w-full
                rounded-xl
                border
                border-gray-200
                bg-white
                py-3
                font-semibold
                text-gray-700
                transition
                hover:bg-gray-50
                dark:border-gray-700
                dark:bg-gray-800
                dark:text-gray-200
                dark:hover:bg-gray-700
              "
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     REGISTER PAGE
  ===================================================== */

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
          onClick={handleBack}
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
              py-7
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

            <h2 className="text-2xl font-bold">Tạo tài khoản</h2>

            <p className="mt-1 text-sm text-blue-100">
              Đăng ký tài khoản khách hàng
            </p>
          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {/* ERROR */}

            {error && (
              <div
                className="
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                  text-sm
                  text-red-600
                  dark:border-red-900/50
                  dark:bg-red-900/20
                  dark:text-red-400
                "
              >
                {error}
              </div>
            )}

            {/* =================================================
                FULL NAME
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
                Họ và tên
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
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên"
                  autoComplete="name"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    py-3
                    pl-10
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

            {/* =================================================
                PHONE
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
                Số điện thoại
              </label>

              <div className="relative">
                <AiOutlinePhone
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
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nhập số điện thoại"
                  autoComplete="tel"
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

            {/* =================================================
                EMAIL
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
                Email
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
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email"
                  autoComplete="email"
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="new-password"
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

            {/* =================================================
                CONFIRM PASSWORD
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
                Xác nhận mật khẩu
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
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

            {/* =================================================
                REGISTER BUTTON
            ================================================= */}

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
              {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
            </button>

            {/* =================================================
                LOGIN
            ================================================= */}

            <div
              className="
                text-center
                text-sm
                text-gray-500
                dark:text-gray-400
              "
            >
              Đã có tài khoản?
              <button
                type="button"
                onClick={goToLogin}
                className="
                  ml-1
                  font-semibold
                  text-blue-600
                  hover:underline
                  dark:text-blue-400
                "
              >
                Đăng nhập
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
