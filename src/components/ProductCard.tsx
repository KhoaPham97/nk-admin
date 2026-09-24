import { FC } from "react";
import { Product } from "../models/Product";
import { addToCart } from "../redux/features/cartSlice";
import { useAppDispatch } from "../redux/hooks";
import toast from "react-hot-toast";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { FiArrowRight } from "react-icons/fi";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const ProductCard: FC<Product> = ({
  id,
  price,
  thumbnail,
  title,
  category,
  rating,
  discountPercentage,
  qty,
}) => {
  const dispatch = useAppDispatch();
  const { requireAuth } = useAuth();

  const quantity = Number(qty) || 0;

  /* =========================================================
     IMAGE
  ========================================================= */

  const getImageUrl = (image?: string) => {
    if (!image) {
      return "/images/no-image.jpg";
    }

    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("/")
    ) {
      return image;
    }

    return `/images/${image}`;
  };

  const imageUrl = getImageUrl(thumbnail);

  /* =========================================================
     PRICE
  ========================================================= */

  const numericPrice = Number(price) || 0;

  const formattedPrice =
    numericPrice > 0
      ? new Intl.NumberFormat("vi-VN").format(numericPrice)
      : "Liên hệ";

  /* =========================================================
     ADD CART
  ========================================================= */

  const addCart = () => {
    if (quantity <= 0) {
      toast.error("Sản phẩm hiện đang hết hàng");
      return;
    }

    requireAuth(() => {
      dispatch(
        addToCart({
          id,
          price,
          title,
          category,
          rating,
          thumbnail,
          discountPercentage,
          qty,
        }),
      );

      toast.success("Đã thêm sản phẩm vào giỏ hàng", {
        duration: 2500,
      });
    });
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <article
      className="
        group
        relative
        flex
        h-full
        flex-col
        overflow-hidden
        bg-white
        dark:bg-slate-800
      "
      data-test="product-card"
    >
      {/* =====================================================
          IMAGE
      ===================================================== */}

      <div
        className="
          relative
          aspect-square
          overflow-hidden
          bg-white
          dark:bg-slate-800
        "
      >
        <Link to={`/product/${id}`} className="block h-full w-full">
          <img
            src={imageUrl}
            alt={title || "Sản phẩm"}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = "/images/no-image.jpg";
            }}
            className="
              h-full
              w-full
              object-contain
              p-3
              transition-transform
              duration-500
              group-hover:scale-105
            "
          />
        </Link>

        {/* =================================================
            STOCK BADGE
        ================================================= */}

        <div className="absolute left-3 top-3">
          {quantity > 0 ? (
            <span
              className="
                inline-flex
                items-center
                rounded-full
                bg-green-50
                px-2.5
                py-1
                text-[11px]
                font-semibold
                text-green-700
                ring-1
                ring-inset
                ring-green-200
                dark:bg-green-900/30
                dark:text-green-400
                dark:ring-green-800
              "
            >
              Còn hàng
            </span>
          ) : (
            <span
              className="
                inline-flex
                items-center
                rounded-full
                bg-red-50
                px-2.5
                py-1
                text-[11px]
                font-semibold
                text-red-600
                ring-1
                ring-inset
                ring-red-200
                dark:bg-red-900/30
                dark:text-red-400
                dark:ring-red-800
              "
            >
              Hết hàng
            </span>
          )}
        </div>

        {/* =================================================
            DISCOUNT
        ================================================= */}

        {Number(discountPercentage) > 0 && (
          <span
            className="
              absolute
              right-3
              top-3
              rounded-full
              bg-red-500
              px-2.5
              py-1
              text-[11px]
              font-bold
              text-white
              shadow-sm
            "
          >
            -{discountPercentage}%
          </span>
        )}
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div
        className="
          flex
          flex-1
          flex-col
          border-t
          border-gray-100
          px-3
          pb-3
          pt-3
          dark:border-slate-700
          sm:px-4
        "
      >
        {/* =================================================
            TITLE
        ================================================= */}

        <Link
          to={`/product/${id}`}
          title={title}
          className="
            line-clamp-2
            min-h-[40px]
            text-sm
            font-semibold
            leading-5
            text-gray-800
            transition-colors
            hover:text-blue-600
            dark:text-white
            dark:hover:text-blue-400
            sm:text-[15px]
          "
        >
          {title || "Sản phẩm chưa có tên"}
        </Link>

        {/* =================================================
            CATEGORY
        ================================================= */}

        {category && (
          <p
            className="
              mt-1.5
              truncate
              text-xs
              text-gray-400
              dark:text-gray-500
            "
            title={category}
          >
            {category}
          </p>
        )}

        {/* =================================================
            STOCK
        ================================================= */}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">Tồn kho</span>

          {quantity > 0 ? (
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {quantity} sản phẩm
            </span>
          ) : (
            <span className="text-xs font-semibold text-red-500">Tạm hết</span>
          )}
        </div>

        {/* =================================================
            BOTTOM
        ================================================= */}

        <div className="mt-auto pt-3">
          <div className="mb-3 flex items-end justify-between gap-2">
            {/* PRICE */}

            <div className="min-w-0">
              <p className="text-[11px] text-gray-400">Giá bán</p>

              <p className="mt-0.5 truncate text-base font-bold text-blue-600 sm:text-lg">
                {formattedPrice}
                {numericPrice > 0 && (
                  <span className="ml-0.5 text-xs font-medium">₫</span>
                )}
              </p>
            </div>

            {/* DETAIL */}

            <Link
              to={`/product/${id}`}
              className="
                flex
                shrink-0
                items-center
                gap-1
                text-xs
                font-semibold
                text-gray-400
                transition
                hover:text-blue-600
              "
            >
              Chi tiết
              <FiArrowRight size={13} />
            </Link>
          </div>

          {/* =================================================
              ADD CART
          ================================================= */}

          {quantity > 0 ? (
            <button
              type="button"
              onClick={addCart}
              data-test="add-cart-btn"
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-600
                px-3
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition-all
                duration-200
                hover:bg-blue-700
                hover:shadow-md
                active:scale-[0.98]
              "
              title="Thêm vào giỏ hàng"
            >
              <AiOutlineShoppingCart size={19} />

              <span>Thêm vào giỏ</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="
                flex
                w-full
                cursor-not-allowed
                items-center
                justify-center
                rounded-xl
                bg-gray-100
                px-3
                py-2.5
                text-sm
                font-semibold
                text-gray-400
                dark:bg-slate-700
                dark:text-gray-500
              "
            >
              Tạm hết hàng
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
