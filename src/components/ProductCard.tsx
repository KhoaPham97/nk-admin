import { FC, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { FaCheck, FaChevronDown } from "react-icons/fa6";
import { toast } from "react-toastify";

import { Product } from "../models/Product";
import { useAppDispatch } from "../redux/hooks";
import { addToCart } from "../redux/features/cartSlice";
import useAuth from "../hooks/useAuth";

interface Variant {
  name?: string;
  value?: string;
  label?: string;
  price?: number | string;
  qty?: number | string;
  stock?: number | string;
  code?: string;
  sku?: string;
  image?: string;
  thumbnail?: string;
}

interface ProductCardProps extends Product {
  id?: string;
  _id?: string;
  variants?: Variant[];
}

const ProductCard: FC<ProductCardProps> = (product) => {
  const dispatch = useAppDispatch();
  const { requireAuth } = useAuth();

  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);

  const [isVariantOpen, setIsVariantOpen] = useState<boolean>(false);

  // =====================================================
  // PRODUCT ID
  // =====================================================

  const productId = product._id || product.id || "";

  // =====================================================
  // IMAGE
  // =====================================================

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

  // =====================================================
  // VARIANTS
  // =====================================================

  const variants = Array.isArray(product.variants) ? product.variants : [];

  const hasVariants = variants.length > 0;

  const selectedVariant = hasVariants
    ? variants[selectedVariantIndex] || variants[0]
    : null;

  // =====================================================
  // VARIANT NAME
  // =====================================================

  const getVariantName = (variant?: Variant | null) => {
    if (!variant) return "";

    return (
      variant.name ||
      variant.label ||
      variant.value ||
      variant.code ||
      variant.sku ||
      ""
    );
  };

  // =====================================================
  // STOCK
  // =====================================================

  const stock = useMemo(() => {
    if (selectedVariant) {
      return Number(selectedVariant.qty ?? selectedVariant.stock ?? 0) || 0;
    }

    return Number(product.qty) || 0;
  }, [selectedVariant, product.qty]);

  const isInStock = stock > 0;

  // =====================================================
  // PRICE
  // =====================================================

  const numericPrice = useMemo(() => {
    if (selectedVariant) {
      return Number(selectedVariant.price) || Number(product.price) || 0;
    }

    return Number(product.price) || 0;
  }, [selectedVariant, product.price]);

  const formattedPrice =
    numericPrice > 0
      ? new Intl.NumberFormat("vi-VN").format(numericPrice)
      : "Liên hệ";

  // =====================================================
  // IMAGE
  // =====================================================

  const productImage =
    selectedVariant?.image || selectedVariant?.thumbnail || product.thumbnail;

  // =====================================================
  // SELECT VARIANT
  // =====================================================

  const handleSelectVariant = (index: number) => {
    const variant = variants[index];

    const variantQty = Number(variant.qty ?? variant.stock ?? 0) || 0;

    if (variantQty <= 0) {
      toast.info("Phân loại này hiện đã hết hàng");
      return;
    }

    setSelectedVariantIndex(index);
    setIsVariantOpen(false);
  };

  // =====================================================
  // ADD TO CART
  // =====================================================

  const handleAddToCart = () => {
    if (!isInStock) {
      toast.warning("Sản phẩm hiện đã hết hàng");
      return;
    }

    requireAuth(() => {
      const cartProduct: any = {
        ...product,

        // Giữ id cho cart
        id: productId,

        // Giá hiện tại
        price: numericPrice,

        // Số lượng kho hiện tại
        qty: stock,

        // Variant khách chọn
        selectedVariant: selectedVariant
          ? {
              ...selectedVariant,
              name: getVariantName(selectedVariant),
              qty: stock,
              price: numericPrice,
            }
          : null,
      };

      dispatch(addToCart(cartProduct));

      if (selectedVariant) {
        toast.success(
          `Đã thêm ${product.title} - ${getVariantName(
            selectedVariant,
          )} vào giỏ hàng`,
        );
      } else {
        toast.success("Đã thêm sản phẩm vào giỏ hàng");
      }
    });
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="
        group flex h-full flex-col
        overflow-hidden
        rounded-2xl
        border border-gray-100
        bg-white
        shadow-sm
        transition-all duration-300
        hover:-translate-y-1
        hover:shadow-xl
        dark:border-slate-700
        dark:bg-slate-900
      "
    >
      {/* =================================================
          IMAGE
      ================================================= */}

      <Link
        to={`/product/${productId}`}
        className="
          relative block
          overflow-hidden
          bg-gray-50
          dark:bg-slate-800
        "
      >
        <div className="aspect-square w-full">
          <img
            src={getImageUrl(productImage)}
            alt={product.title || "Sản phẩm"}
            loading="lazy"
            className="
              h-full w-full
              object-contain
              p-4
              transition-transform duration-500
              group-hover:scale-105
            "
            onError={(e) => {
              e.currentTarget.src = "/images/no-image.jpg";
            }}
          />
        </div>

        {/* STOCK BADGE */}

        <div
          className={`
            absolute left-3 top-3
            rounded-full px-2.5 py-1
            text-[11px] font-semibold
            ${
              isInStock
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }
          `}
        >
          {isInStock ? "Còn hàng" : "Hết hàng"}
        </div>

        {/* VARIANT BADGE */}

        {hasVariants && (
          <div
            className="
              absolute right-3 top-3
              rounded-full
              bg-blue-600
              px-2.5 py-1
              text-[11px]
              font-semibold
              text-white
              shadow
            "
          >
            {variants.length} phân loại
          </div>
        )}
      </Link>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="flex flex-1 flex-col p-4">
        {/* CATEGORY */}

        {product.category && (
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-blue-600">
            {product.category}
          </div>
        )}

        {/* TITLE */}

        <Link
          to={`/product/${productId}`}
          className="
            line-clamp-2
            min-h-[42px]
            text-sm
            font-semibold
            leading-5
            text-gray-900
            transition
            hover:text-blue-600
            dark:text-white
            dark:hover:text-blue-400
          "
        >
          {product.title}
        </Link>

        {/* =================================================
            VARIANTS
        ================================================= */}

        {hasVariants && (
          <div className="relative mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Phân loại
              </span>

              <span className="text-[10px] text-gray-400">
                {variants.length} lựa chọn
              </span>
            </div>

            {/* MOBILE / COMPACT SELECT */}

            <button
              type="button"
              onClick={() => setIsVariantOpen(!isVariantOpen)}
              className="
                flex w-full
                items-center
                justify-between
                rounded-lg
                border
                border-gray-200
                bg-gray-50
                px-3 py-2
                text-left
                text-xs
                transition
                hover:border-blue-400
                dark:border-slate-600
                dark:bg-slate-800
              "
            >
              <div className="flex min-w-0 items-center gap-2">
                {selectedVariant &&
                  Number(selectedVariant.qty ?? selectedVariant.stock ?? 0) >
                    0 && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                      <FaCheck className="text-[8px]" />
                    </span>
                  )}

                <span className="truncate font-medium text-gray-700 dark:text-gray-200">
                  {getVariantName(selectedVariant) || "Chọn phân loại"}
                </span>
              </div>

              <FaChevronDown
                className={`
                  shrink-0 text-[10px]
                  text-gray-400
                  transition-transform
                  ${isVariantOpen ? "rotate-180" : ""}
                `}
              />
            </button>

            {/* DROPDOWN */}

            {isVariantOpen && (
              <div
                className="
                  absolute
                  left-0
                  right-0
                  top-full
                  z-30
                  mt-1
                  max-h-48
                  overflow-y-auto
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  p-1.5
                  shadow-xl
                  dark:border-slate-600
                  dark:bg-slate-800
                "
              >
                {variants.map((variant, index) => {
                  const variantQty =
                    Number(variant.qty ?? variant.stock ?? 0) || 0;

                  const isSelected = index === selectedVariantIndex;

                  const variantPrice = Number(variant.price) || 0;

                  return (
                    <button
                      key={
                        variant.code ||
                        variant.sku ||
                        `${getVariantName(variant)}-${index}`
                      }
                      type="button"
                      disabled={variantQty <= 0}
                      onClick={() => handleSelectVariant(index)}
                      className={`
                          mb-1 flex
                          w-full
                          items-center
                          justify-between
                          rounded-lg
                          px-3 py-2
                          text-left
                          transition
                          last:mb-0
                          ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "hover:bg-gray-50 dark:hover:bg-slate-700"
                          }
                          ${
                            variantQty <= 0
                              ? "cursor-not-allowed opacity-40"
                              : ""
                          }
                        `}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <FaCheck className="shrink-0 text-[10px]" />
                          )}

                          <span className="truncate text-xs font-medium">
                            {getVariantName(variant) ||
                              `Phân loại ${index + 1}`}
                          </span>
                        </div>

                        <div className="mt-0.5 text-[10px] text-gray-400">
                          {variantQty > 0 ? `Còn ${variantQty}` : "Hết hàng"}
                        </div>
                      </div>

                      {variantPrice > 0 && (
                        <span className="ml-2 shrink-0 text-[11px] font-semibold text-blue-600">
                          {new Intl.NumberFormat("vi-VN").format(variantPrice)}đ
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================
            PRICE
        ================================================= */}

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formattedPrice}
              {numericPrice > 0 && (
                <span className="ml-0.5 text-xs font-medium">đ</span>
              )}
            </div>

            {hasVariants && (
              <div className="mt-0.5 text-[10px] text-gray-400">
                {getVariantName(selectedVariant)}
              </div>
            )}
          </div>

          {/* STOCK */}

          <div className="text-right text-[10px] text-gray-400">
            {isInStock ? `Kho: ${stock}` : "Tạm hết"}
          </div>
        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="mt-4 flex gap-2">
          {/* DETAIL */}

          <Link
            to={`/product/${productId}`}
            className="
              flex flex-1
              items-center
              justify-center
              rounded-xl
              border
              border-blue-200
              px-3 py-2.5
              text-xs
              font-semibold
              text-blue-600
              transition
              hover:border-blue-600
              hover:bg-blue-50
              dark:border-blue-900
              dark:text-blue-400
              dark:hover:bg-blue-900/20
            "
          >
            Chi tiết
          </Link>

          {/* ADD CART */}

          <button
            type="button"
            disabled={!isInStock}
            onClick={handleAddToCart}
            className="
              flex
              items-center
              justify-center
              gap-1.5
              rounded-xl
              bg-blue-600
              px-3
              py-2.5
              text-xs
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-blue-700
              hover:shadow-md
              disabled:cursor-not-allowed
              disabled:bg-gray-300
              dark:disabled:bg-slate-700
            "
          >
            <AiOutlineShoppingCart className="text-base" />

            <span className="hidden sm:inline">
              {isInStock ? "Thêm giỏ" : "Hết hàng"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
