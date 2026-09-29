import { FC, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import {
  AiOutlineShoppingCart,
  AiOutlineMenu,
  AiOutlineClose,
} from "react-icons/ai";

import { FaUser } from "react-icons/fa";

import { MdOutlineDarkMode, MdOutlineLightMode } from "react-icons/md";

import { useAppDispatch, useAppSelector } from "../redux/hooks";

import { setCartState } from "../redux/features/cartSlice";

import { updateDarkMode } from "../redux/features/homeSlice";

import useAuth from "../hooks/useAuth";

import CustomPopup from "./CustomPopup";
import SearchBar from "./SearchBar";

const Navbar: FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const cartCount = useAppSelector(
    (state) => state.cartReducer.cartItems.length,
  );

  /* =====================================================
     USER
  ===================================================== */

  const userInfo = useAppSelector((state) => state.authReducer.userInfo);

  const isLoggedIn =
    userInfo &&
    typeof userInfo === "object" &&
    Object.keys(userInfo).length > 0;

  /* =====================================================
     DARK MODE
  ===================================================== */

  const isDarkMode = useAppSelector((state) => state.homeReducer.isDarkMode);

  /* =====================================================
     AUTH
  ===================================================== */

  const { requireAuth } = useAuth();

  /* =====================================================
     CART
  ===================================================== */

  /* =====================================================
     DARK MODE
  ===================================================== */

  const toggleTheme = () => {
    dispatch(updateDarkMode(!isDarkMode));

    document.body.classList.toggle("dark", !isDarkMode);
  };

  /* =====================================================
     CLOSE MOBILE MENU
  ===================================================== */

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  /* =====================================================
     OPEN LOGIN PAGE
  ===================================================== */

  const openLogin = () => {
    setIsMenuOpen(false);
    navigate("/login", {
      state: {
        from: location.pathname + location.search,
      },
    });
  };
  const showCart = () => {
    // dispatch(setCartState(true));
    openLogin();
  };
  /* =====================================================
     OPEN REGISTER PAGE
  ===================================================== */

  const openRegister = () => {
    setIsMenuOpen(false);
    navigate("/register", {
      state: {
        from: location.pathname + location.search,
      },
    });
  };

  return (
    <>
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header
        className="
          sticky
          top-0
          z-50
          w-full
          border-b
          border-gray-200
          bg-white
          shadow-sm
          dark:border-slate-700
          dark:bg-slate-900
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
            {/* =================================================
                LOGO
            ================================================= */}

            <Link
              to="/"
              onClick={handleLinkClick}
              className="group shrink-0"
              data-test="main-logo"
            >
              <div className="flex items-center gap-2">
                {logo ? (
                  <img
                    src={logo}
                    alt={storeName}
                    className="
                      h-10
                      w-10
                      rounded-xl
                      object-contain
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-600
                      text-xl
                      font-black
                      text-white
                    "
                  >
                    NK
                  </div>
                )}

                <div className="hidden sm:block">
                  <div
                    className="
                      text-lg
                      font-black
                      leading-none
                      tracking-tight
                      text-gray-900
                      dark:text-white
                    "
                  >
                    {storeName}
                  </div>

                  <div
                    className="
                      mt-1
                      text-xs
                      font-bold
                      tracking-[0.18em]
                      text-blue-600
                    "
                  >
                    {slogan}
                  </div>
                </div>
              </div>
            </Link>

            {/* =================================================
                SEARCH
            ================================================= */}

            <div
              className="
                hidden
                flex-1
                sm:block
                md:max-w-xl
                lg:max-w-2xl
              "
            >
              <SearchBar onSearch={() => setIsMenuOpen(false)} />
            </div>

            {/* =================================================
                DESKTOP MENU
            ================================================= */}

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
                data-test="main-products"
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
                data-test="main-categories"
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

              {/* =================================================
                  USER DESKTOP
              ================================================= */}

              <div className="ml-1">
                {isLoggedIn ? (
                  <CustomPopup />
                ) : (
                  <button
                    type="button"
                    onClick={openLogin}
                    data-test="login-btn"
                    className="
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
              </div>

              {/* =================================================
                  CART DESKTOP
              ================================================= */}

              <button
                type="button"
                onClick={showCart}
                data-test="cart-btn"
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
                    data-test="cart-item-count"
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

              {/* =================================================
                  DARK MODE
              ================================================= */}

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

            {/* =================================================
                MOBILE BUTTON
            ================================================= */}

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
          {/* =================================================
              OVERLAY
          ================================================= */}

          <div
            className="
              absolute
              inset-0
              bg-black/40
              backdrop-blur-[2px]
            "
            onClick={() => setIsMenuOpen(false)}
          />

          {/* =================================================
              DRAWER
          ================================================= */}

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
            {/* =================================================
                HEADER
            ================================================= */}

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
              <Link
                to="/"
                onClick={handleLinkClick}
                className="flex items-center gap-2"
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={storeName}
                    className="
                      h-9
                      w-9
                      rounded-lg
                      object-contain
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-lg
                      bg-blue-600
                      font-black
                      text-white
                    "
                  >
                    NK
                  </div>
                )}

                <div>
                  <div
                    className="
                      text-sm
                      font-black
                      text-gray-900
                      dark:text-white
                    "
                  >
                    {storeName}
                  </div>

                  <div
                    className="
                      text-[10px]
                      font-bold
                      text-blue-600
                    "
                  >
                    {slogan}
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
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
                aria-label="Đóng menu"
              >
                <AiOutlineClose size={25} />
              </button>
            </div>

            {/* =================================================
                SEARCH
            ================================================= */}

            <div
              className="
                border-b
                border-gray-100
                p-5
                dark:border-slate-700
              "
            >
              <SearchBar onSearch={() => setIsMenuOpen(false)} />
            </div>

            {/* =================================================
                MENU
            ================================================= */}

            <nav className="flex-1 overflow-y-auto p-5">
              {/* MAIN MENU */}

              <div className="space-y-2">
                <Link
                  to="/products"
                  onClick={handleLinkClick}
                  className="
                    flex
                    items-center
                    rounded-xl
                    px-4
                    py-3
                    font-semibold
                    text-gray-800
                    transition
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
                  onClick={handleLinkClick}
                  className="
                    flex
                    items-center
                    rounded-xl
                    px-4
                    py-3
                    font-semibold
                    text-gray-800
                    transition
                    hover:bg-blue-50
                    hover:text-blue-600
                    dark:text-white
                    dark:hover:bg-slate-800
                  "
                >
                  Danh mục
                </Link>
              </div>

              {/* DIVIDER */}

              <div
                className="
                  my-5
                  border-t
                  border-gray-100
                  dark:border-slate-700
                "
              />

              {/* =================================================
                  ACCOUNT
              ================================================= */}

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
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-white/20
                          text-white
                          ring-1
                          ring-white/30
                        "
                      >
                        <FaUser size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-medium text-blue-100">
                          Tài khoản
                        </p>

                        <p className="truncate text-sm font-bold text-white">
                          Xin chào 👋
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    <CustomPopup />
                  </div>
                </div>
              ) : (
                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-blue-100
                    bg-gradient-to-br
                    from-blue-50
                    via-white
                    to-white
                    shadow-sm
                    dark:border-slate-700
                    dark:from-slate-800
                    dark:via-slate-800
                    dark:to-slate-900
                  "
                >
                  {/* ACCOUNT HEADER */}

                  <div className="px-4 pt-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          flex
                          h-12
                          w-12
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-blue-600
                          text-white
                          shadow-sm
                        "
                      >
                        <FaUser size={20} />
                      </div>

                      <div className="min-w-0">
                        <h3
                          className="
                            text-sm
                            font-bold
                            text-gray-900
                            dark:text-white
                          "
                        >
                          Tài khoản khách hàng
                        </h3>

                        <p
                          className="
                            mt-0.5
                            text-xs
                            leading-5
                            text-gray-500
                            dark:text-gray-400
                          "
                        >
                          Đăng nhập hoặc tạo tài khoản để mua hàng
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AUTH ACTIONS */}

                  <div className="grid grid-cols-2 gap-2 p-4">
                    {/* LOGIN */}

                    <button
                      type="button"
                      onClick={openLogin}
                      data-test="mobile-login-btn"
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
                        transition-all
                        hover:bg-blue-50
                        active:scale-[0.98]
                        dark:bg-slate-800
                        dark:hover:bg-slate-700
                      "
                    >
                      <FaUser size={15} />

                      <span>Đăng nhập</span>
                    </button>

                    {/* REGISTER */}

                    <button
                      type="button"
                      onClick={openRegister}
                      data-test="mobile-register-btn"
                      className="
                        flex
                        h-11
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-blue-600
                        text-sm
                        font-bold
                        text-white
                        shadow-sm
                        transition-all
                        hover:bg-blue-700
                        active:scale-[0.98]
                      "
                    >
                      <span className="text-lg leading-none">+</span>

                      <span>Đăng ký</span>
                    </button>
                  </div>

                  {/* ACCOUNT NOTE */}

                  <div
                    className="
                      border-t
                      border-blue-100
                      px-4
                      pb-4
                      pt-3
                      dark:border-slate-700
                    "
                  >
                    <p
                      className="
                        text-center
                        text-[11px]
                        leading-5
                        text-gray-400
                      "
                    >
                      Đăng ký tài khoản để quản lý đơn hàng và thông tin mua
                      hàng.
                    </p>
                  </div>
                </div>
              )}

              {/* =================================================
                  CART
              ================================================= */}

              <button
                type="button"
                onClick={showCart}
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
                  transition
                  hover:bg-blue-50
                  hover:text-blue-600
                  dark:text-white
                  dark:hover:bg-slate-800
                "
              >
                <div className="flex items-center gap-3">
                  <AiOutlineShoppingCart size={23} />

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

              {/* =================================================
                  THEME
              ================================================= */}

              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setIsMenuOpen(false);
                }}
                className="
                  mt-2
                  flex
                  w-full
                  items-center
                  justify-between
                  rounded-xl
                  px-4
                  py-3
                  text-gray-800
                  transition
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

            {/* =================================================
                FOOTER DRAWER
            ================================================= */}

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
              <p
                className="
                  text-center
                  text-xs
                  text-gray-400
                "
              >
                {storeName}
              </p>

              <p
                className="
                  mt-1
                  text-center
                  text-xs
                  font-medium
                  text-blue-600
                "
              >
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
