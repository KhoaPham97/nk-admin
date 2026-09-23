import { FC } from "react";
import { Product } from "../models/Product";
// import RatingStar from "./RatingStar";
import { addToCart } from "../redux/features/cartSlice";
import { useAppDispatch } from "../redux/hooks";
import toast from "react-hot-toast";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { Link } from "react-router-dom";
import PriceSection from "./PriceSection";
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

  const imageUrl = thumbnail ? `/images/${thumbnail}` : "/images/no-image.jpg";

  const quantity = Number(qty) || 0;

  const addCart = () => {
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

      toast.success("item added to cart successfully", {
        duration: 3000,
      });
    });
  };

  return (
    <div
      className="product-card overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-gray-700 dark:bg-slate-800"
      data-test="product-card"
    >
      {/* ================= IMAGE ================= */}
      <div className="overflow-hidden border-b border-gray-200 text-center dark:border-gray-700">
        <Link to={`/product/${id}`}>
          <img
            src={imageUrl}
            alt={title || "Sản phẩm"}
            width={240}
            height={240}
            loading="lazy"
            decoding="async"
            className="inline-block h-60 w-auto object-contain transition-transform duration-200 hover:scale-110"
          />
        </Link>
      </div>

      {/* ================= PRODUCT INFO ================= */}
      <div className="px-4 pt-4">
        {/* Title */}
        <Link
          to={`/product/${id}`}
          className="block overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold text-gray-800 hover:text-blue-600 hover:underline dark:text-white dark:hover:text-blue-400"
          title={title}
        >
          {title}
        </Link>

        {/* Quantity */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Số lượng
          </span>

          {quantity > 0 ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {quantity}
            </span>
          ) : (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
              Hết hàng
            </span>
          )}
        </div>
      </div>

      {/* ================= RATING ================= */}
      {/*
      <div className="px-4">
        <RatingStar rating={rating} />
      </div>
      */}

      {/* ================= PRICE / CART ================= */}
      <div className="flex flex-wrap items-center justify-between px-4 pb-4 pt-3">
        {/*
        {discountPercentage && (
          <PriceSection
            discountPercentage={discountPercentage}
            price={price}
          />
        )}

        {quantity > 0 ? (
          <button
            type="button"
            className="flex items-center space-x-2 rounded bg-pink-500 px-4 py-2 text-white hover:bg-blue-500"
            onClick={addCart}
            data-test="add-cart-btn"
            title="Thêm vào giỏ hàng"
          >
            <AiOutlineShoppingCart />
          </button>
        ) : (
          <p className="sold-out-badge">
            Tạm hết hàng
          </p>
        )}
        */}
      </div>
    </div>
  );
};

export default ProductCard;
