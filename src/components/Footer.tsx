import { FC } from "react";
import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaPhone,
  FaLocationDot,
  FaEnvelope,
} from "react-icons/fa6";

const Footer: FC = () => {
  const zaloPhone = "0773066022";

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white text-gray-700">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* ================= BRAND ================= */}
          <div>
            <Link
              to="/"
              className="inline-block text-2xl font-black tracking-tight text-gray-900"
            >
              NHẬT KHANG <span className="text-blue-600">BIKE</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-500">
              Chuyên cung cấp phụ tùng xe đạp, xe điện, xe ba gác và các loại
              linh kiện xe chất lượng.
            </p>

            <p className="mt-4 text-sm font-semibold text-gray-900">
              Đã chạy phải chất
            </p>

            {/* Facebook */}
            <div className="mt-6">
              <a
                href="#"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all hover:-translate-y-1 hover:bg-blue-600 hover:text-white"
              >
                <FaFacebookF size={15} />
              </a>
            </div>
          </div>

          {/* ================= DANH MỤC ================= */}
          <div>
            <h3 className="mb-5 text-base font-bold text-gray-900">Danh mục</h3>

            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  to="/category/type/1"
                  className="transition-colors hover:text-blue-600"
                >
                  Phụ tùng xe đạp
                </Link>
              </li>

              <li>
                <Link
                  to="/category/type/2"
                  className="transition-colors hover:text-blue-600"
                >
                  Phụ tùng xe điện
                </Link>
              </li>

              <li>
                <Link
                  to="/category/type/3"
                  className="transition-colors hover:text-blue-600"
                >
                  Phụ tùng xe ba gác
                </Link>
              </li>

              <li>
                <Link
                  to="/products"
                  className="transition-colors hover:text-blue-600"
                >
                  Tất cả sản phẩm
                </Link>
              </li>
            </ul>
          </div>

          {/* ================= HỖ TRỢ ================= */}
          <div>
            <h3 className="mb-5 text-base font-bold text-gray-900">
              Hỗ trợ khách hàng
            </h3>

            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="transition-colors hover:text-blue-600">
                  Trang chủ
                </Link>
              </li>

              <li>
                <Link
                  to="/cart"
                  className="transition-colors hover:text-blue-600"
                >
                  Giỏ hàng
                </Link>
              </li>

              <li>
                <Link
                  to="/wishlist"
                  className="transition-colors hover:text-blue-600"
                >
                  Sản phẩm yêu thích
                </Link>
              </li>

              <li>
                <Link to="/" className="transition-colors hover:text-blue-600">
                  Chính sách mua hàng
                </Link>
              </li>
            </ul>
          </div>

          {/* ================= LIÊN HỆ ================= */}
          <div>
            <h3 className="mb-5 text-base font-bold text-gray-900">Liên hệ</h3>

            <div className="space-y-4">
              {/* ZALO */}
              <a
                href={`https://zalo.me/${zaloPhone}`}
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

              {/* PHONE */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-blue-600">
                  <FaPhone size={14} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">Hotline</p>

                  <p className="text-sm font-medium text-gray-900">
                    Liên hệ qua Zalo
                  </p>
                </div>
              </div>

              {/* LOCATION */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-blue-600">
                  <FaLocationDot size={14} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">Khu vực</p>

                  <p className="text-sm font-medium text-gray-900">Việt Nam</p>
                </div>
              </div>

              {/* EMAIL */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-blue-600">
                  <FaEnvelope size={14} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">Email</p>

                  <p className="text-sm font-medium text-gray-900">
                    Liên hệ qua Zalo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM ================= */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-sm text-gray-500 sm:px-6 md:flex-row lg:px-8">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-gray-700">NHẬT KHANG BIKE</span>
            . All Rights Reserved.
          </p>

          <p className="font-medium text-gray-400">Đã chạy phải chất</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
