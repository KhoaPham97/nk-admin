import { FC, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  AiOutlineShoppingCart,
  AiOutlineMenu,
  AiOutlineClose,
  AiOutlineUser,
  AiOutlinePhone,
  AiOutlineMail,
  AiOutlineLogout,
} from "react-icons/ai";

import { FaUser } from "react-icons/fa";

import { MdOutlineDarkMode, MdOutlineLightMode } from "react-icons/md";

import { useAppDispatch, useAppSelector } from "../redux/hooks";

import { updateDarkMode } from "../redux/features/homeSlice";

import useAuth from "../hooks/useAuth";

import SearchBar from "./SearchBar";

/* =========================================================
   CUSTOMER
========================================================= */

interface CustomerInfo {
  _id?: string;
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  username?: string;
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
}

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (value: number | string | undefined) => {
  const numberValue = Number(value || 0);

  return numberValue.toLocaleString("vi-VN") + " ₫";
};

/* =========================================================
   NAVBAR
========================================================= */

const Navbar: FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { requireAuth } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [localCustomer, setLocalCustomer] = useState<CustomerInfo | null>(null);

  /* =====================================================
     SETTINGS
  ===================================================== */

  const settings = useAppSelector((state) => state.settings.settings);

  const storeName =
    settings?.websiteSettings?.siteName ||
    settings?.storeName ||
    "NHẬT KHANG BIKE";

  const slogan = settings?.websiteSettings?.slogan || "Đã chạy phải chất";

  const logo = settings?.logo || "";

  /* =====================================================
     CART
  ===================================================== */

  const cartItems = useAppSelector((state) => state.cartReducer.cartItems);

  const cartCount = cartItems.length;

  /* =====================================================
     REDUX CUSTOMER
  ===================================================== */

  const userInfo = useAppSelector((state) => state.authReducer.userInfo);

  /* =====================================================
     DARK MODE
  ===================================================== */

  const isDarkMode = useAppSelector((state) => state.homeReducer.isDarkMode);

  /* =====================================================
     LOAD LOCAL CUSTOMER
  ===================================================== */

  const loadCustomer = () => {
    try {
      const token =
        localStorage.getItem("customerToken") ||
        localStorage.getItem("customerAccessToken");

      const customerStorage = localStorage.getItem("customer");

      if (!token || !customerStorage) {
        setLocalCustomer(null);
        return;
      }

      const parsed = JSON.parse(customerStorage) as CustomerInfo;

      setLocalCustomer(parsed);
    } catch (error) {
      console.error("Không thể đọc customer từ localStorage:", error);

      setLocalCustomer(null);
    }
  };

  /* =====================================================
     LOAD CUSTOMER ON MOUNT
  ===================================================== */

  useEffect(() => {
    loadCustomer();
  }, []);

  /* =====================================================
     STORAGE EVENT
  ===================================================== */

  useEffect(() => {
    const handleStorage = () => {
      loadCustomer();
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  /* =====================================================
     CUSTOMER
  ===================================================== */

  const reduxCustomer =
    userInfo && typeof userInfo === "object" && Object.keys(userInfo).length > 0
      ? (userInfo as CustomerInfo)
      : null;

  const customer = reduxCustomer || localCustomer;

  /* =====================================================
     TOKEN
  ===================================================== */

  const customerToken =
    localStorage.getItem("customerToken") ||
    localStorage.getItem("customerAccessToken");

  const isLoggedIn = Boolean(customerToken) && Boolean(customer);

  /* =====================================================
     CUSTOMER DISPLAY
  ===================================================== */

  const customerName = customer?.name || customer?.username || "Khách hàng";

  const customerUsername = customer?.username || "";

  const customerPhone = customer?.phone || "Chưa cập nhật";

  const customerEmail = customer?.email || "Chưa cập nhật";

  const customerDebt = Number(customer?.debt || 0);

  /* =====================================================
     THEME
  ===================================================== */

  const toggleTheme = () => {
    const nextDarkMode = !isDarkMode;

    dispatch(updateDarkMode(nextDarkMode));

    document.body.classList.toggle("dark", nextDarkMode);
  };

  /* =====================================================
     CLOSE MENU
  ===================================================== */

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  /* =====================================================
     LOGIN
  ===================================================== */

  const openLogin = () => {
    closeMenu();

    navigate("/login", {
      state: {
        from: location.pathname + location.search,
      },
    });
  };

  /* =====================================================
     REGISTER
  ===================================================== */

  const openRegister = () => {
    closeMenu();

    navigate("/register", {
      state: {
        from: location.pathname + location.search,
      },
    });
  };

  /* =====================================================
     ACCOUNT
  ===================================================== */

  const openAccount = () => {
    closeMenu();

    if (!isLoggedIn) {
      openLogin();
      return;
    }

    navigate("/account");
  };

  /* =====================================================
     CART
  ===================================================== */

  const showCart = () => {
    closeMenu();

    if (!isLoggedIn) {
      navigate("/login", {
        state: {
          from: location.pathname + location.search,
        },
      });

      return;
    }

    navigate("/cart");
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    localStorage.removeItem("customerToken");

    localStorage.removeItem("customerAccessToken");

    localStorage.removeItem("customer");

    localStorage.removeItem("customerUsername");

    setLocalCustomer(null);

    closeMenu();

    navigate("/", {
      replace: true,
    });

    window.location.reload();
  };

  /* =====================================================
     LOGO
  ===================================================== */

  const Logo = ({ mobile = false }: { mobile?: boolean }) => (
    <Link to="/" onClick={closeMenu} className="shrink-0">
      <div className="flex items-center gap-2">
        {logo ? (
          <img
            src={logo}
            alt={storeName}
            className={
              mobile
                ? "h-9 w-9 rounded-lg object-contain"
                : "h-10 w-10 rounded-xl object-contain"
            }
          />
        ) : (
          <div
            className={
              mobile
                ? "flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-black text-white"
                : "flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white"
            }
          >
            NK
          </div>
        )}

        <div className={mobile ? "" : "hidden sm:block"}>
          <div
            className={
              mobile
                ? "text-sm font-black text-gray-900 dark:text-white"
                : "text-lg font-black leading-none tracking-tight text-gray-900 dark:text-white"
            }
          >
            {storeName}
          </div>

          <div
            className={
              mobile
                ? "text-[10px] font-bold text-blue-600"
                : "mt-1 text-xs font-bold tracking-[0.18em] text-blue-600"
            }
          >
            {slogan}
          </div>
        </div>
      </div>
    </Link>
  );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <>
      <header
        className="
          sticky
          top-0
          z-50
          w-full
          border-b
          border-gray-200
          bg-white/95
          shadow-sm
          backdrop-blur
          dark:border-slate-700
          dark:bg-slate-900/95
        "
      >
        <div
          className="
            mx-auto
            max-w-7xl
            px-4
            sm:px-6
            lg:px-8
          "
        >
          <div
            className="
              flex
              h-[72px]
              items-center
              justify-between
              gap-4
            "
          >
            {/* LOGO */}

            <Logo />

            {/* SEARCH */}

            <div
              className="
                hidden
                flex-1
                sm:block
                md:max-w-xl
                lg:max-w-2xl
              "
            >
              <SearchBar onSearch={closeMenu} />
            </div>

            {/* DESKTOP */}

            <div
              className="
                hidden
                items-center
                gap-1
                sm:flex
              "
            >
              <Link
                to="/products"
                className="
                  rounded-lg
                  px-3
                  py-2
                  text-sm
                  font-semibold
                  text-gray-700
                  transition
                  hover:bg-gray-100
                  hover:text-blue-600
                  dark:text-gray-200
                  dark:hover:bg-slate-800
                "
              >
                Sản phẩm
              </Link>

              <Link
                to="/categories"
                className="
                  rounded-lg
                  px-3
                  py-2
                  text-sm
                  font-semibold
                  text-gray-700
                  transition
                  hover:bg-gray-100
                  hover:text-blue-600
                  dark:text-gray-200
                  dark:hover:bg-slate-800
                "
              >
                Danh mục
              </Link>

              {/* ACCOUNT */}

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={openAccount}
                  className="
                    ml-1
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    px-2
                    py-1.5
                    transition
                    hover:bg-gray-100
                    dark:hover:bg-slate-800
                  "
                >
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-full
                      bg-blue-600
                      text-white
                    "
                  >
                    <FaUser size={15} />
                  </div>

                  <div className="hidden text-left lg:block">
                    <div
                      className="
                        max-w-[130px]
                        truncate
                        text-xs
                        font-bold
                        text-gray-900
                        dark:text-white
                      "
                    >
                      {customerName}
                    </div>

                    <div
                      className="
                        max-w-[130px]
                        truncate
                        text-[10px]
                        text-gray-400
                      "
                    >
                      @{customerUsername}
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openLogin}
                  className="
                    ml-1
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-full
                    text-gray-600
                    transition
                    hover:bg-gray-100
                    hover:text-blue-600
                    dark:text-gray-300
                    dark:hover:bg-slate-800
                  "
                  aria-label="Đăng nhập"
                >
                  <FaUser size={18} />
                </button>
              )}

              {/* CART */}

              <button
                type="button"
                onClick={showCart}
                className="
                  relative
                  ml-1
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  text-gray-600
                  transition
                  hover:bg-gray-100
                  hover:text-blue-600
                  dark:text-gray-300
                  dark:hover:bg-slate-800
                "
                aria-label="Giỏ hàng"
              >
                <AiOutlineShoppingCart size={23} />

                {cartCount > 0 && (
                  <span
                    className="
                      absolute
                      -right-1
                      -top-1
                      flex
                      h-5
                      min-w-5
                      items-center
                      justify-center
                      rounded-full
                      bg-red-500
                      px-1
                      text-[10px]
                      font-bold
                      text-white
                    "
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </button>

              {/* THEME */}

              <button
                type="button"
                onClick={toggleTheme}
                className="
                  ml-1
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  text-gray-600
                  transition
                  hover:bg-gray-100
                  hover:text-blue-600
                  dark:text-gray-300
                  dark:hover:bg-slate-800
                "
                aria-label="Đổi giao diện"
              >
                {isDarkMode ? (
                  <MdOutlineLightMode size={23} />
                ) : (
                  <MdOutlineDarkMode size={23} />
                )}
              </button>
            </div>

            {/* MOBILE */}

            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-lg
                text-gray-700
                sm:hidden
                dark:text-white
              "
              aria-label="Mở menu"
            >
              <AiOutlineMenu size={26} />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MOBILE DRAWER
      ===================================================== */}

      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] sm:hidden">
          {/* OVERLAY */}

          <div
            className="
              absolute
              inset-0
              bg-black/40
              backdrop-blur-[2px]
            "
            onClick={closeMenu}
          />

          {/* DRAWER */}

          <div
            className="
              absolute
              right-0
              top-0
              flex
              h-full
              w-[88%]
              max-w-sm
              flex-col
              bg-white
              shadow-2xl
              dark:bg-slate-900
            "
          >
            {/* HEADER */}

            <div
              className="
                flex
                h-[72px]
                items-center
                justify-between
                border-b
                border-gray-100
                px-5
                dark:border-slate-700
              "
            >
              <Logo mobile />

              <button
                type="button"
                onClick={closeMenu}
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  text-gray-500
                  hover:bg-gray-100
                  dark:hover:bg-slate-800
                "
              >
                <AiOutlineClose size={25} />
              </button>
            </div>

            {/* SEARCH */}

            <div
              className="
                border-b
                border-gray-100
                p-5
                dark:border-slate-700
              "
            >
              <SearchBar onSearch={closeMenu} />
            </div>

            {/* CONTENT */}

            <nav className="flex-1 overflow-y-auto p-5">
              {/* MAIN */}

              <div className="space-y-2">
                <Link
                  to="/products"
                  onClick={closeMenu}
                  className="
                    flex
                    rounded-xl
                    px-4
                    py-3
                    font-semibold
                    text-gray-800
                    hover:bg-blue-50
                    hover:text-blue-600
                    dark:text-white
                    dark:hover:bg-slate-800
                  "
                >
                  Sản phẩm
                </Link>

                <Link
                  to="/categories"
                  onClick={closeMenu}
                  className="
                    flex
                    rounded-xl
                    px-4
                    py-3
                    font-semibold
                    text-gray-800
                    hover:bg-blue-50
                    hover:text-blue-600
                    dark:text-white
                    dark:hover:bg-slate-800
                  "
                >
                  Danh mục
                </Link>
              </div>

              <div
                className="
                  my-5
                  border-t
                  border-gray-100
                  dark:border-slate-700
                "
              />

              {/* ACCOUNT */}

              {isLoggedIn ? (
                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-gray-100
                    bg-white
                    shadow-sm
                    dark:border-slate-700
                    dark:bg-slate-800
                  "
                >
                  {/* HEADER */}

                  <div
                    className="
                      bg-gradient-to-r
                      from-blue-600
                      to-blue-500
                      px-4
                      py-4
                    "
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-full
                          bg-white/20
                          text-white
                        "
                      >
                        <FaUser size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-blue-100">Xin chào 👋</p>

                        <p
                          className="
                            truncate
                            text-base
                            font-bold
                            text-white
                          "
                        >
                          {customerName}
                        </p>

                        {customerUsername && (
                          <p className="truncate text-xs text-blue-100">
                            @{customerUsername}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* INFO */}

                  <div className="space-y-3 p-4">
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        bg-gray-50
                        px-3
                        py-2.5
                        dark:bg-slate-700
                      "
                    >
                      <AiOutlinePhone size={18} className="text-blue-600" />

                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400">
                          Số điện thoại
                        </p>

                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                          {customerPhone}
                        </p>
                      </div>
                    </div>

                    <div
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        bg-gray-50
                        px-3
                        py-2.5
                        dark:bg-slate-700
                      "
                    >
                      <AiOutlineMail size={18} className="text-blue-600" />

                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400">Email</p>

                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                          {customerEmail}
                        </p>
                      </div>
                    </div>

                    {/* DEBT */}

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        rounded-xl
                        border
                        border-red-100
                        bg-red-50
                        px-3
                        py-3
                        dark:border-red-900/50
                        dark:bg-red-950/30
                      "
                    >
                      <div>
                        <p className="text-[10px] text-red-500">Công nợ</p>

                        <p className="text-sm font-bold text-red-600 dark:text-red-400">
                          {formatMoney(customerDebt)}
                        </p>
                      </div>

                      <span
                        className="
                          rounded-full
                          bg-red-100
                          px-2
                          py-1
                          text-[10px]
                          font-bold
                          text-red-600
                          dark:bg-red-900/50
                          dark:text-red-300
                        "
                      >
                        {customerDebt > 0 ? "Còn nợ" : "Đã thanh toán"}
                      </span>
                    </div>

                    {/* ACCOUNT */}

                    <button
                      type="button"
                      onClick={openAccount}
                      className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-blue-600
                        py-3
                        text-sm
                        font-bold
                        text-white
                        hover:bg-blue-700
                      "
                    >
                      <AiOutlineUser size={18} />
                      Thông tin tài khoản
                    </button>

                    {/* CART */}

                    <button
                      type="button"
                      onClick={showCart}
                      className="
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-xl
                        border
                        border-gray-200
                        px-4
                        py-3
                        text-gray-800
                        hover:bg-blue-50
                        hover:text-blue-600
                        dark:border-slate-600
                        dark:text-white
                        dark:hover:bg-slate-700
                      "
                    >
                      <div className="flex items-center gap-3">
                        <AiOutlineShoppingCart size={21} />

                        <span className="font-semibold">Giỏ hàng</span>
                      </div>

                      {cartCount > 0 && (
                        <span
                          className="
                            flex
                            h-6
                            min-w-6
                            items-center
                            justify-center
                            rounded-full
                            bg-red-500
                            px-1.5
                            text-xs
                            font-bold
                            text-white
                          "
                        >
                          {cartCount > 99 ? "99+" : cartCount}
                        </span>
                      )}
                    </button>

                    {/* LOGOUT */}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-red-200
                        bg-white
                        py-3
                        text-sm
                        font-bold
                        text-red-500
                        hover:bg-red-50
                        dark:border-red-900
                        dark:bg-slate-800
                      "
                    >
                      <AiOutlineLogout size={18} />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              ) : (
                /* NOT LOGIN */

                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-blue-100
                    bg-blue-50
                    shadow-sm
                    dark:border-slate-700
                    dark:bg-slate-800
                  "
                >
                  <div className="px-4 pt-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-full
                          bg-blue-600
                          text-white
                        "
                      >
                        <FaUser size={20} />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          Tài khoản khách hàng
                        </h3>

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Đăng nhập hoặc tạo tài khoản để mua hàng
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-4">
                    <button
                      type="button"
                      onClick={openLogin}
                      className="
                        flex
                        h-11
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-blue-600
                        bg-white
                        text-sm
                        font-bold
                        text-blue-600
                        hover:bg-blue-50
                        dark:bg-slate-800
                      "
                    >
                      <FaUser size={15} />
                      Đăng nhập
                    </button>

                    <button
                      type="button"
                      onClick={openRegister}
                      className="
                        flex
                        h-11
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-600
                        text-sm
                        font-bold
                        text-white
                        hover:bg-blue-700
                      "
                    >
                      + Đăng ký
                    </button>
                  </div>
                </div>
              )}

              {/* THEME */}

              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  closeMenu();
                }}
                className="
                  mt-4
                  flex
                  w-full
                  items-center
                  justify-between
                  rounded-xl
                  px-4
                  py-3
                  text-gray-800
                  hover:bg-blue-50
                  hover:text-blue-600
                  dark:text-white
                  dark:hover:bg-slate-800
                "
              >
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <MdOutlineLightMode size={23} />
                  ) : (
                    <MdOutlineDarkMode size={23} />
                  )}

                  <span className="font-semibold">Giao diện</span>
                </div>

                <span className="text-xs text-gray-400">
                  {isDarkMode ? "Tối" : "Sáng"}
                </span>
              </button>
            </nav>

            {/* FOOTER */}

            <div
              className="
                border-t
                border-gray-100
                bg-gray-50
                px-5
                py-5
                dark:border-slate-700
                dark:bg-slate-800
              "
            >
              <p className="text-center text-xs text-gray-400">{storeName}</p>

              <p className="mt-1 text-center text-xs font-medium text-blue-600">
                {slogan}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
