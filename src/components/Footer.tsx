import { FC } from "react";
import { Link } from "react-router-dom";

import {
  FaFacebookF,
  FaPhone,
  FaLocationDot,
  FaEnvelope,
} from "react-icons/fa6";

import { useAppSelector } from "../redux/hooks";

const Footer: FC = () => {
  /* =====================================================
     SETTINGS
  ===================================================== */

  const settings = useAppSelector((state) => state.settings.settings);

  /* =====================================================
     STORE INFO
  ===================================================== */

  const storeName =
    settings?.websiteSettings?.siteName ||
    settings?.storeName ||
    "NHẬT KHANG BIKE";

  const slogan = settings?.websiteSettings?.slogan || "Đã chạy phải chất";

  const phone = settings?.phone || "";

  const email = settings?.email || "";

  const address = settings?.address || "";

  const website = settings?.website || "";

  const showPhone = settings?.websiteSettings?.showPhone ?? true;

  const showAddress = settings?.websiteSettings?.showAddress ?? true;

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="
        mt-auto
        border-t
        border-gray-200
        bg-white
        text-gray-700
        dark:border-slate-700
        dark:bg-slate-900
        dark:text-gray-300
      "
    >
      <div
        className="
          mx-auto
          max-w-7xl
          px-4
          py-10
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            grid
            grid-cols-1
            gap-8
            sm:grid-cols-2
            lg:grid-cols-4
          "
        >
          {/* =================================================
              BRAND
          ================================================= */}

          <div>
            <Link
              to="/"
              className="
                inline-block
                text-xl
                font-black
                text-gray-900
                dark:text-white
              "
            >
              {storeName}
            </Link>

            <p
              className="
                mt-3
                text-sm
                leading-6
                text-gray-500
                dark:text-gray-400
              "
            >
              Phụ tùng xe chất lượng, đa dạng sản phẩm và hỗ trợ khách hàng tận
              tình.
            </p>

            <p
              className="
                mt-3
                text-sm
                font-semibold
                text-blue-600
              "
            >
              {slogan}
            </p>

            {website && (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="
                  mt-3
                  inline-block
                  text-sm
                  text-blue-600
                  hover:underline
                "
              >
                {website}
              </a>
            )}

            {/* FACEBOOK */}

            <div className="mt-5">
              <a
                href="#"
                onClick={(event) => event.preventDefault()}
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-blue-600
                  text-white
                  transition
                  hover:bg-blue-700
                "
                aria-label="Facebook"
              >
                <FaFacebookF size={15} />
              </a>
            </div>
          </div>

          {/* =================================================
              CATEGORY
          ================================================= */}

          <div>
            <h3
              className="
                text-sm
                font-bold
                uppercase
                tracking-wider
                text-gray-900
                dark:text-white
              "
            >
              Sản phẩm
            </h3>

            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  to="/products?type=1"
                  className="
                    text-sm
                    text-gray-500
                    transition
                    hover:text-blue-600
                    dark:text-gray-400
                  "
                >
                  Phụ tùng xe đạp
                </Link>
              </li>

              <li>
                <Link
                  to="/products?type=2"
                  className="
                    text-sm
                    text-gray-500
                    transition
                    hover:text-blue-600
                    dark:text-gray-400
                  "
                >
                  Phụ tùng xe điện
                </Link>
              </li>

              <li>
                <Link
                  to="/products?type=3"
                  className="
                    text-sm
                    text-gray-500
                    transition
                    hover:text-blue-600
                    dark:text-gray-400
                  "
                >
                  Phụ tùng xe ba gác
                </Link>
              </li>

              <li>
                <Link
                  to="/categories"
                  className="
                    text-sm
                    text-gray-500
                    transition
                    hover:text-blue-600
                    dark:text-gray-400
                  "
                >
                  Tất cả danh mục
                </Link>
              </li>
            </ul>
          </div>

          {/* =================================================
              SUPPORT
          ================================================= */}

          <div>
            <h3
              className="
                text-sm
                font-bold
                uppercase
                tracking-wider
                text-gray-900
                dark:text-white
              "
            >
              Hỗ trợ
            </h3>

            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  to="/"
                  className="
                    text-sm
                    text-gray-500
                    hover:text-blue-600
                    dark:text-gray-400
                  "
                >
                  Trang chủ
                </Link>
              </li>

              <li>
                <Link
                  to="/products"
                  className="
                    text-sm
                    text-gray-500
                    hover:text-blue-600
                    dark:text-gray-400
                  "
                >
                  Sản phẩm
                </Link>
              </li>

              <li>
                <Link
                  to="/categories"
                  className="
                    text-sm
                    text-gray-500
                    hover:text-blue-600
                    dark:text-gray-400
                  "
                >
                  Danh mục
                </Link>
              </li>

              <li>
                <Link
                  to="/cart"
                  className="
                    text-sm
                    text-gray-500
                    hover:text-blue-600
                    dark:text-gray-400
                  "
                >
                  Giỏ hàng
                </Link>
              </li>
            </ul>
          </div>

          {/* =================================================
              CONTACT
          ================================================= */}

          <div>
            <h3
              className="
                text-sm
                font-bold
                uppercase
                tracking-wider
                text-gray-900
                dark:text-white
              "
            >
              Liên hệ
            </h3>

            <ul className="mt-4 space-y-4">
              {/* PHONE */}

              {showPhone && phone && (
                <a
                  href={`https://zalo.me/${phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 transition-all hover:border-blue-200 hover:bg-blue-100"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white shadow-sm transition-transform group-hover:scale-105">
                    Zalo
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">Chat qua Zalo</p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Tư vấn sản phẩm & đặt hàng
                    </p>
                  </div>
                </a>
              )}

              {/* ADDRESS */}

              {showAddress && address && (
                <li className="flex items-start gap-3">
                  <FaLocationDot
                    className="
                      mt-1
                      shrink-0
                      text-blue-600
                    "
                    size={15}
                  />

                  <span
                    className="
                      text-sm
                      leading-5
                      text-gray-500
                      dark:text-gray-400
                    "
                  >
                    {address}
                  </span>
                </li>
              )}

              {/* EMAIL */}

              {email && (
                <li className="flex items-start gap-3">
                  <FaEnvelope
                    className="
                      mt-1
                      shrink-0
                      text-blue-600
                    "
                    size={15}
                  />

                  <a
                    href={`mailto:${email}`}
                    className="
                      break-all
                      text-sm
                      text-gray-500
                      hover:text-blue-600
                      dark:text-gray-400
                    "
                  >
                    {email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* =====================================================
          BOTTOM
      ===================================================== */}

      <div
        className="
          border-t
          border-gray-200
          dark:border-slate-700
        "
      >
        <div
          className="
            mx-auto
            flex
            max-w-7xl
            flex-col
            items-center
            justify-between
            gap-2
            px-4
            py-5
            text-center
            sm:flex-row
            sm:px-6
            lg:px-8
          "
        >
          <p
            className="
              text-xs
              text-gray-500
              dark:text-gray-400
            "
          >
            © {currentYear} {storeName}. All rights reserved.
          </p>

          <p
            className="
              text-xs
              font-medium
              text-blue-600
            "
          >
            {slogan}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
