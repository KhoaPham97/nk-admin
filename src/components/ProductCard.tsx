import { FC, useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { AiOutlineShoppingCart } from "react-icons/ai";

import { FaCheck, FaChevronDown } from "react-icons/fa6";

import { toast } from "react-toastify";

import { Product } from "../models/Product";

import { useAppDispatch, useAppSelector } from "../redux/hooks";

import { addToCart } from "../redux/features/cartSlice";

import useAuth from "../hooks/useAuth";

/* =========================================================
   VARIANT
========================================================= */

interface Variant {
  _id?: string;
  id?: string;

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

/* =========================================================
   PRODUCT CARD PROPS
========================================================= */

interface ProductCardProps extends Product {
  _id?: string;
  id?: string;

  variants?: Variant[];
}

/* =========================================================
   COMPONENT
========================================================= */

const ProductCard: FC<ProductCardProps> = (product) => {
  const dispatch = useAppDispatch();

  const { requireAuth } = useAuth();

  /* =======================================================
     STATE
  ======================================================= */

  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);

  const [isVariantOpen, setIsVariantOpen] = useState<boolean>(false);

  /* =======================================================
     SETTINGS
  ======================================================= */

  const settings = useAppSelector((state) => state.settings?.settings);

  const showPrice = settings?.websiteSettings?.showPrice ?? false;

  /* =======================================================
     PRODUCT ID
  ======================================================= */

  const productId = String(product._id || product.id || "");

  /* =======================================================
     VARIANTS
  ======================================================= */

  const variants = Array.isArray(product.variants) ? product.variants : [];

  const hasVariants = variants.length > 0;

  /* =======================================================
     TÌM VARIANT ĐẦU TIÊN CÒN HÀNG
  ======================================================= */

  useEffect(() => {
    if (!hasVariants) {
      setSelectedVariantIndex(0);
      return;
    }

    const firstAvailableIndex = variants.findIndex((variant) => {
      const qty = Number(variant.qty ?? variant.stock ?? 0) || 0;

      return qty > 0;
    });

    if (firstAvailableIndex >= 0) {
      setSelectedVariantIndex(firstAvailableIndex);
    } else {
      setSelectedVariantIndex(0);
    }

    setIsVariantOpen(false);
  }, [productId, hasVariants, variants]);

  /* =======================================================
     SELECTED VARIANT
  ======================================================= */

  const selectedVariant = hasVariants
    ? variants[selectedVariantIndex] || variants[0]
    : null;

  /* =======================================================
     IMAGE URL
  ======================================================= */

  const getImageUrl = (image?: string): string => {
    if (!image || typeof image !== "string") {
      return "/images/no-image.jpg";
    }

    const value = image.trim();

    if (!value) {
      return "/images/no-image.jpg";
    }

    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/") ||
      value.startsWith("data:image/")
    ) {
      return value;
    }

    return `/images/${value}`;
  };

  /* =======================================================
     VARIANT NAME
  ======================================================= */

  const getVariantName = (variant?: Variant | null): string => {
    if (!variant) {
      return "";
    }

    if (typeof variant.label === "string" && variant.label.trim()) {
      return variant.label.trim();
    }

    if (
      typeof variant.name === "string" &&
      typeof variant.value === "string" &&
      variant.name.trim() &&
      variant.value.trim()
    ) {
      return `${variant.name.trim()}: ${variant.value.trim()}`;
    }

    if (typeof variant.value === "string" && variant.value.trim()) {
      return variant.value.trim();
    }

    if (typeof variant.name === "string" && variant.name.trim()) {
      return variant.name.trim();
    }

    if (typeof variant.code === "string" && variant.code.trim()) {
      return variant.code.trim();
    }

    if (typeof variant.sku === "string" && variant.sku.trim()) {
      return variant.sku.trim();
    }

    return "";
  };

  /* =======================================================
     CATEGORY
  ======================================================= */

  const categoryName = useMemo(() => {
    if (!product.category) {
      return "";
    }

    if (typeof product.category === "string") {
      return product.category;
    }

    if (typeof product.category === "object") {
      const category = product.category as any;

      return category.name || category.title || category.label || "";
    }

    return "";
  }, [product.category]);

  /* =======================================================
     STOCK
  ======================================================= */

  const stock = useMemo(() => {
    if (selectedVariant) {
      return Number(selectedVariant.qty ?? selectedVariant.stock ?? 0) || 0;
    }

    return Number(product.qty) || 0;
  }, [selectedVariant, product.qty]);

  const isInStock = stock > 0;

  /* =======================================================
     PRICE
  ======================================================= */

  const numericPrice = useMemo(() => {
    if (selectedVariant) {
      const variantPrice = Number(selectedVariant.price) || 0;

      if (variantPrice > 0) {
        return variantPrice;
      }
    }

    return Number(product.price) || 0;
  }, [selectedVariant, product.price]);

  const formattedPrice =
    numericPrice > 0
      ? new Intl.NumberFormat("vi-VN").format(numericPrice)
      : "Liên hệ";

  /* =======================================================
     PRODUCT IMAGE
  ======================================================= */

  const productImage =
    selectedVariant?.image ||
    selectedVariant?.thumbnail ||
    product.thumbnail ||
    product.images?.[0] ||
    "";

  /* =======================================================
     SELECT VARIANT
  ======================================================= */

  const handleSelectVariant = (index: number) => {
    const variant = variants[index];

    if (!variant) {
      return;
    }

    const variantQty = Number(variant.qty ?? variant.stock ?? 0) || 0;

    if (variantQty <= 0) {
      toast.info("Phân loại này hiện đã hết hàng");

      return;
    }

    setSelectedVariantIndex(index);

    setIsVariantOpen(false);
  };

  /* =======================================================
     ADD TO CART
  ======================================================= */

  const handleAddToCart = () => {
    if (!productId) {
      toast.error("Không xác định được sản phẩm");
      return;
    }

    if (!selectedVariant) {
      toast.error("Vui lòng chọn phân loại");
      return;
    }

    const variantStock = Number(
      selectedVariant.qty ?? selectedVariant.stock ?? 0,
    );

    if (variantStock <= 0) {
      toast.error("Phân loại này đã hết hàng");
      return;
    }

    const variantId = String(selectedVariant._id || selectedVariant.id || "");

    const cartProduct = {
      ...product,

      _id: productId,
      id: productId,

      price: Number(selectedVariant.price ?? product.price ?? 0),

      qty: variantStock,

      quantity: 1,

      variantId: variantId || undefined,

      variant: {
        ...selectedVariant,

        _id: selectedVariant._id || selectedVariant.id || undefined,

        id: selectedVariant.id || selectedVariant._id || undefined,

        name: getVariantName(selectedVariant),

        qty: variantStock,

        price: Number(selectedVariant.price ?? product.price ?? 0),
      },
    };

    dispatch(addToCart(cartProduct));

    toast.success(
      `Đã thêm ${product.title || product.name || "sản phẩm"} vào giỏ`,
    );
  };
  /* =======================================================
     INVALID PRODUCT
  ======================================================= */

  if (!productId) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        group
        flex
        min-h-full
        h-full
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-gray-100
        bg-white
        shadow-sm
        transition-all
        duration-300
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
          relative
          block
          shrink-0
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
              h-full
              w-full
              object-contain
              p-4
              transition-transform
              duration-500
              group-hover:scale-105
            "
            onError={(e) => {
              const img = e.currentTarget;

              if (!img.src.includes("/images/no-image.jpg")) {
                img.src = "/images/no-image.jpg";
              }
            }}
          />
        </div>

        {/* STOCK */}

        <div
          className={`
            absolute
            left-3
            top-3
            rounded-full
            px-2.5
            py-1
            text-[11px]
            font-semibold
            ${
              isInStock
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }
          `}
        >
          {isInStock ? "Còn hàng" : "Hết hàng"}
        </div>

        {/* VARIANT COUNT */}

        {hasVariants && (
          <div
            className="
              absolute
              right-3
              top-3
              rounded-full
              bg-blue-600
              px-2.5
              py-1
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

      <div
        className="
          flex
          flex-1
          flex-col
          p-4
        "
      >
        {/* TOP */}

        <div>
          {/* CATEGORY */}

          {categoryName && (
            <div
              className="
                mb-1
                text-[11px]
                font-medium
                uppercase
                tracking-wide
                text-blue-600
              "
            >
              {categoryName}
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
            {typeof product.title === "string" ? product.title : "Sản phẩm"}
          </Link>

          {/* =================================================
              VARIANTS
          ================================================= */}

          {hasVariants && (
            <div className="relative mt-3">
              {/* LABEL */}

              <div
                className="
                  mb-1.5
                  flex
                  items-center
                  justify-between
                "
              >
                <span
                  className="
                    text-xs
                    font-medium
                    text-gray-500
                    dark:text-gray-400
                  "
                >
                  Phân loại
                </span>

                <span
                  className="
                    text-[10px]
                    text-gray-400
                  "
                >
                  {variants.length} lựa chọn
                </span>
              </div>

              {/* SELECTED */}

              <button
                type="button"
                onClick={() => setIsVariantOpen((value) => !value)}
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                  rounded-lg
                  border
                  border-gray-200
                  bg-gray-50
                  px-3
                  py-2
                  text-left
                  text-xs
                  transition
                  hover:border-blue-400
                  dark:border-slate-600
                  dark:bg-slate-800
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-2
                  "
                >
                  {selectedVariant &&
                    Number(selectedVariant.qty ?? selectedVariant.stock ?? 0) >
                      0 && (
                      <span
                        className="
                          flex
                          h-4
                          w-4
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-blue-600
                          text-white
                        "
                      >
                        <FaCheck className="text-[8px]" />
                      </span>
                    )}

                  <span
                    className="
                      truncate
                      font-medium
                      text-gray-700
                      dark:text-gray-200
                    "
                  >
                    {getVariantName(selectedVariant) || "Chọn phân loại"}
                  </span>
                </div>

                <FaChevronDown
                  className={`
                    shrink-0
                    text-[10px]
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
                    z-50
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
                          variant._id ||
                          variant.id ||
                          variant.code ||
                          variant.sku ||
                          `${getVariantName(variant)}-${index}`
                        }
                        type="button"
                        disabled={variantQty <= 0}
                        onClick={() => handleSelectVariant(index)}
                        className={`
                            mb-1
                            flex
                            w-full
                            items-center
                            justify-between
                            rounded-lg
                            px-3
                            py-2
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
                          <div
                            className="
                                flex
                                items-center
                                gap-2
                              "
                          >
                            {isSelected && (
                              <FaCheck
                                className="
                                    shrink-0
                                    text-[10px]
                                  "
                              />
                            )}

                            <span
                              className="
                                  truncate
                                  text-xs
                                  font-medium
                                "
                            >
                              {getVariantName(variant) ||
                                `Phân loại ${index + 1}`}
                            </span>
                          </div>

                          <div
                            className="
                                mt-0.5
                                text-[10px]
                                text-gray-400
                              "
                          >
                            {variantQty > 0 ? `Còn ${variantQty}` : "Hết hàng"}
                          </div>
                        </div>

                        {showPrice && variantPrice > 0 && (
                          <span
                            className="
                                  ml-2
                                  shrink-0
                                  text-[11px]
                                  font-semibold
                                  text-blue-600
                                "
                          >
                            {new Intl.NumberFormat("vi-VN").format(
                              variantPrice,
                            )}
                            đ
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================
            BOTTOM
        ================================================= */}

        <div
          className="
            mt-auto
            pt-4
          "
        >
          {/* PRICE */}

          <div
            className="
              flex
              min-h-[48px]
              items-end
              justify-between
              gap-2
            "
          >
            <div className="min-w-0">
              {showPrice ? (
                <>
                  <div
                    className="
                      text-lg
                      font-bold
                      leading-6
                      text-blue-600
                      dark:text-blue-400
                    "
                  >
                    {formattedPrice}

                    {numericPrice > 0 && (
                      <span
                        className="
                          ml-0.5
                          text-xs
                          font-medium
                        "
                      >
                        đ
                      </span>
                    )}
                  </div>

                  {hasVariants && (
                    <div
                      className="
                        mt-0.5
                        max-w-full
                        truncate
                        text-[10px]
                        text-gray-400
                      "
                    >
                      {getVariantName(selectedVariant)}
                    </div>
                  )}
                </>
              ) : (
                <div
                  className="
                    text-sm
                    font-semibold
                    leading-5
                    text-gray-500
                    dark:text-gray-400
                  "
                >
                  Liên hệ để biết giá
                </div>
              )}
            </div>

            {/* STOCK */}

            <div
              className="
                shrink-0
                text-right
                text-[10px]
                text-gray-400
              "
            >
              {isInStock ? `Kho: ${stock}` : "Tạm hết"}
            </div>
          </div>

          {/* ACTION */}

          <div
            className="
              mt-4
              flex
              min-h-[42px]
              gap-2
            "
          >
            {/* DETAIL */}

            <Link
              to={`/product/${productId}`}
              className="
                flex
                flex-1
                items-center
                justify-center
                rounded-xl
                border
                border-blue-200
                px-3
                py-2.5
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
    </div>
  );
};

export default ProductCard;
