import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AiOutlineArrowLeft,
  AiOutlineDelete,
  AiOutlineMinus,
  AiOutlinePlus,
  AiOutlineShoppingCart,
} from "react-icons/ai";

import { useAppDispatch, useAppSelector } from "../redux/hooks";

import {
  decreaseQuantity,
  increaseQuantity,
  removeFromCart,
  updateQuantity,
  clearCart,
} from "../redux/features/cartSlice";

const Cart: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const cartItems = useAppSelector((state) => state.cartReducer.cartItems);

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProductId = (item: any) => {
    return String(item._id || item.id || "");
  };

  const getProductName = (item: any) => {
    return item.name || item.title || "Sản phẩm";
  };

  const getProductImage = (item: any) => {
    if (item.thumbnail) {
      if (
        String(item.thumbnail).startsWith("http") ||
        String(item.thumbnail).startsWith("/")
      ) {
        return item.thumbnail;
      }

      return `/images/${item.thumbnail}`;
    }

    if (item.images?.length) {
      const image = item.images[0];

      if (String(image).startsWith("http") || String(image).startsWith("/")) {
        return image;
      }

      return `/images/${image}`;
    }

    return "/images/no-image.png";
  };

  const getPrice = (item: any) => {
    return Number(item.price || 0);
  };

  const totalQuantity = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + Number(item.quantity || 1),
      0,
    );
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const quantity = Number(item.quantity || 1);

      const price = getPrice(item);

      return total + price * quantity;
    }, 0);
  }, [cartItems]);

  const handleIncrease = (item: any) => {
    dispatch(increaseQuantity(getProductId(item)));
  };

  const handleDecrease = (item: any) => {
    dispatch(decreaseQuantity(getProductId(item)));
  };

  const handleQuantityChange = (item: any, value: string) => {
    const quantity = Number(value);

    if (!Number.isFinite(quantity)) {
      return;
    }

    dispatch(
      updateQuantity({
        id: getProductId(item),
        quantity: Math.max(1, quantity),
      }),
    );
  };

  const handleRemove = (item: any) => {
    dispatch(removeFromCart(getProductId(item)));
  };

  const handleCheckout = () => {
    const token =
      localStorage.getItem("customerToken") ||
      localStorage.getItem("customerAccessToken");

    if (!token) {
      navigate("/login", {
        state: {
          from: "/cart",
        },
      });

      return;
    }

    navigate("/checkout");
  };

  /**
   * GIỎ HÀNG TRỐNG
   */
  if (!cartItems.length) {
    return (
      <div className="min-h-[70vh] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <AiOutlineShoppingCart className="text-5xl text-gray-400" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Giỏ hàng đang trống
            </h1>

            <p className="text-gray-500 mt-3">
              Bạn chưa có sản phẩm nào trong giỏ hàng.
            </p>

            <Link
              to="/products"
              className="mt-7 inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
            >
              <AiOutlineArrowLeft />
              Tiếp tục mua hàng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Giỏ hàng
            </h1>

            <p className="text-gray-500 mt-1">{totalQuantity} sản phẩm</p>
          </div>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-black font-medium"
          >
            <AiOutlineArrowLeft />
            Tiếp tục mua hàng
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* DANH SÁCH */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* TOP */}
              <div className="px-4 md:px-6 py-4 border-b flex items-center justify-between">
                <span className="font-semibold text-gray-800">Sản phẩm</span>

                <button
                  type="button"
                  onClick={() => dispatch(clearCart())}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
                >
                  <AiOutlineDelete />
                  Xóa tất cả
                </button>
              </div>

              {/* ITEMS */}
              <div className="divide-y">
                {cartItems.map((item: any) => {
                  const id = getProductId(item);

                  const quantity = Number(item.quantity || 1);

                  const price = getPrice(item);

                  const image = getProductImage(item);

                  const name = getProductName(item);

                  return (
                    <div key={id} className="p-4 md:p-6">
                      <div className="flex gap-4">
                        {/* IMAGE */}
                        <Link
                          to={`/product/${id}`}
                          className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-xl bg-gray-50 overflow-hidden border"
                        >
                          <img
                            src={image}
                            alt={name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/images/no-image.png";
                            }}
                          />
                        </Link>

                        {/* CONTENT */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                to={`/product/${id}`}
                                className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
                              >
                                {name}
                              </Link>

                              {item.code && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Mã SP: {item.code}
                                </p>
                              )}

                              {item.category?.name && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {item.category.name}
                                </p>
                              )}
                            </div>

                            {/* DELETE */}
                            <button
                              type="button"
                              onClick={() => handleRemove(item)}
                              className="text-gray-400 hover:text-red-500 shrink-0"
                              title="Xóa sản phẩm"
                            >
                              <AiOutlineDelete className="text-xl" />
                            </button>
                          </div>

                          {/* PRICE */}
                          <div className="mt-3">
                            <span className="font-bold text-red-600">
                              {formatMoney(price)}
                            </span>
                          </div>

                          {/* BOTTOM */}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            {/* QUANTITY */}
                            <div className="flex items-center border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleDecrease(item)}
                                className="w-9 h-9 flex items-center justify-center hover:bg-gray-100"
                              >
                                <AiOutlineMinus />
                              </button>

                              <input
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) =>
                                  handleQuantityChange(item, e.target.value)
                                }
                                className="w-12 h-9 text-center outline-none border-x"
                              />

                              <button
                                type="button"
                                onClick={() => handleIncrease(item)}
                                className="w-9 h-9 flex items-center justify-center hover:bg-gray-100"
                              >
                                <AiOutlinePlus />
                              </button>
                            </div>

                            {/* ITEM TOTAL */}
                            <div className="font-bold text-gray-900">
                              {formatMoney(price * quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 lg:sticky lg:top-24">
              <h2 className="text-xl font-bold text-gray-900">
                Tóm tắt đơn hàng
              </h2>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between text-gray-600">
                  <span>Số lượng</span>
                  <span>{totalQuantity}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span>Tính khi đặt hàng</span>
                </div>

                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Tổng tiền</span>

                  <span className="text-xl font-bold text-red-600">
                    {formatMoney(subtotal)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className="w-full mt-6 bg-black text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition"
              >
                Tiến hành đặt hàng
              </button>

              <Link
                to="/products"
                className="w-full mt-3 border border-gray-300 py-3 rounded-xl font-medium flex justify-center hover:bg-gray-50 transition"
              >
                Tiếp tục mua hàng
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
