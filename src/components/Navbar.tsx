import { FC, useState } from "react";
import { Link } from "react-router-dom";

import {
  AiOutlineShoppingCart,
  AiOutlineMenu,
  AiOutlineClose,
} from "react-icons/ai";

import { FaUser } from "react-icons/fa";

import { MdOutlineDarkMode, MdOutlineLightMode } from "react-icons/md";

import { useAppDispatch, useAppSelector } from "../redux/hooks";

import { setCartState } from "../redux/features/cartSlice";
import { updateModal } from "../redux/features/authSlice";
import { updateDarkMode } from "../redux/features/homeSlice";

import useAuth from "../hooks/useAuth";

import CustomPopup from "./CustomPopup";
import SearchBar from "./SearchBar";

const Navbar: FC = () => {
  const dispatch = useAppDispatch();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /* =====================================================
     SETTINGS
     main.tsx đã load settings vào Redux
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

  const showCart = () => {
    requireAuth(() => {
      dispatch(setCartState(true));
      setIsMenuOpen(false);
    });
  };

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

              {/* USER */}

              <div className="ml-1">
                {isLoggedIn ? (
                  <CustomPopup />
                ) : (
                  <button
                    type="button"
                    onClick={() => dispatch(updateModal(true))}
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

              {/* CART */}

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

              {/* DARK MODE */}

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
          {/* Overlay */}

          <div
            className="
              absolute
              inset-0
              bg-black/40
              backdrop-blur-[2px]
            "
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer */}

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
            {/* Header */}

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

            {/* Search */}

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

            {/* Menu */}

            <nav className="flex-1 overflow-y-auto p-5">
              <div className="space-y-2">
                <Link
                  to="/products"
                  onClick={handleLinkClick}
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
                  onClick={handleLinkClick}
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

              {/* Account */}

              {isLoggedIn ? (
                <div
                  className="
                    rounded-xl
                    bg-gray-50
                    p-3
                    dark:bg-slate-800
                  "
                >
                  <CustomPopup />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    dispatch(updateModal(true));
                    setIsMenuOpen(false);
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
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
                  <FaUser size={18} />
                  Đăng nhập
                </button>
              )}

              {/* Cart */}

              <button
                type="button"
                onClick={showCart}
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

              {/* Theme */}

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

            {/* Footer drawer */}

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
