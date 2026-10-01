import React, { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheck,
  FiMapPin,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import { toast } from "react-hot-toast";

import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  decreaseQuantity,
  increaseQuantity,
  removeFromCart,
  clearCart,
} from "../redux/features/cartSlice";
import { API_ENDPOINTS } from "../api";

interface CheckoutForm {
  name: string;
  phone: string;
  address: string;
  note: string;
  paymentMethod: "cod" | "transfer";
}

interface CartVariant {
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

interface CartItem {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  price?: number | string;
  qty?: number | string;
  quantity?: number;
  images?: string[];
  thumbnail?: string;

  variantId?: string;

  variant?: CartVariant;
}

const API_URL = API_ENDPOINTS.ORDER || "";

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const cartItems = useAppSelector(
    (state) => state.cartReducer.cartItems,
  ) as CartItem[];

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    phone: "",
    address: "",
    note: "",
    paymentMethod: "cod",
  });

  /**
   * ================================
   * HELPER
   * ================================
   */

  const getProductId = (item: CartItem) => {
    return String(item._id || item.id || "");
  };

  const getVariantId = (item: CartItem) => {
    return String(
      item.variantId || item.variant?._id || item.variant?.id || "",
    );
  };

  const getItemKey = (item: CartItem) => {
    return `${getProductId(item)}_${getVariantId(item)}`;
  };

  const getVariantName = (variant?: CartVariant) => {
    if (!variant) return "";

    return (
      variant.name ||
      variant.value ||
      variant.label ||
      variant.code ||
      variant.sku ||
      ""
    );
  };

  const getItemName = (item: CartItem) => {
    return item.title || item.name || "Sản phẩm";
  };

  const getItemPrice = (item: CartItem) => {
    const variantPrice = Number(item.variant?.price);

    if (!Number.isNaN(variantPrice) && variantPrice > 0) {
      return variantPrice;
    }

    const productPrice = Number(item.price);

    return Number.isNaN(productPrice) ? 0 : productPrice;
  };

  const getItemStock = (item: CartItem) => {
    const variantStock = Number(item.variant?.qty ?? item.variant?.stock);

    if (!Number.isNaN(variantStock)) {
      return variantStock;
    }

    const productStock = Number(item.qty);

    return Number.isNaN(productStock) ? 0 : productStock;
  };

  const getItemImage = (item: CartItem) => {
    const image =
      item.variant?.image ||
      item.variant?.thumbnail ||
      item.thumbnail ||
      item.images?.[0];

    if (!image) {
      return "/images/no-image.png";
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

  /**
   * ================================
   * CALCULATE
   * ================================
   */

  const subtotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = getItemPrice(item);
      const quantity = Number(item.quantity || 1);

      return total + price * quantity;
    }, 0);
  }, [cartItems]);

  /**
   * Tạm thời để phí ship = 0.
   * Sau này có thể tích hợp đơn vị vận chuyển.
   */
  const shippingFee = 0;

  const total = subtotal + shippingFee;

  /**
   * ================================
   * FORMAT MONEY
   * ================================
   */

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price);
  };

  /**
   * ================================
   * FORM
   * ================================
   */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * ================================
   * QUANTITY
   * ================================
   */

  const handleIncrease = (item: CartItem) => {
    const stock = getItemStock(item);
    const quantity = Number(item.quantity || 1);

    if (stock > 0 && quantity >= stock) {
      toast.error("Số lượng vượt quá tồn kho");
      return;
    }

    dispatch(
      increaseQuantity({
        productId: getProductId(item),
        variantId: getVariantId(item),
      }),
    );
  };

  const handleDecrease = (item: CartItem) => {
    const quantity = Number(item.quantity || 1);

    if (quantity <= 1) {
      return;
    }

    dispatch(
      decreaseQuantity({
        productId: getProductId(item),
        variantId: getVariantId(item),
      }),
    );
  };

  const handleRemove = (item: CartItem) => {
    dispatch(
      removeFromCart({
        productId: getProductId(item),
        variantId: getVariantId(item),
      }),
    );
  };

  /**
   * ================================
   * VALIDATE
   * ================================
   */

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập họ tên");
      return false;
    }

    if (!form.phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return false;
    }

    const phoneRegex = /^(0|\+84)[0-9]{8,10}$/;

    if (!phoneRegex.test(form.phone.trim())) {
      toast.error("Số điện thoại không hợp lệ");
      return false;
    }

    if (!form.address.trim()) {
      toast.error("Vui lòng nhập địa chỉ nhận hàng");
      return false;
    }

    if (cartItems.length === 0) {
      toast.error("Giỏ hàng đang trống");
      return false;
    }

    return true;
  };

  /**
   * ================================
   * CREATE ORDER
   * ================================
   */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const customerData = localStorage.getItem("customer");

      let customer = null;

      try {
        customer = customerData ? JSON.parse(customerData) : null;
      } catch {
        customer = null;
      }

      /**
       * Chuẩn hóa item gửi BE
       */
      const items = cartItems.map((item) => {
        const productId = getProductId(item);
        const variantId = getVariantId(item);

        const quantity = Number(item.quantity || 1);
        const price = getItemPrice(item);

        return {
          product: productId,

          productId,

          variantId: variantId || null,

          variant: item.variant
            ? {
                _id: item.variant._id || item.variant.id || null,

                id: item.variant.id || item.variant._id || null,

                name: getVariantName(item.variant),

                price,

                qty: getItemStock(item),
              }
            : null,

          name: getItemName(item),

          price,

          quantity,

          qty: quantity,

          total: price * quantity,
        };
      });

      const orderData = {
        customerId: customer?._id || customer?.id || null,

        customer: customer || null,

        customerName: form.name.trim(),

        customerPhone: form.phone.trim(),

        shippingAddress: form.address.trim(),

        address: form.address.trim(),

        note: form.note.trim(),

        paymentMethod: form.paymentMethod,

        items,

        subtotal,

        shippingFee,

        total,

        totalAmount: total,

        status: "pending",
      };

      const token =
        localStorage.getItem("customerToken") ||
        localStorage.getItem("customerAccessToken");

      const response = await fetch(`${API_URL}`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },

        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Không thể tạo đơn hàng",
        );
      }

      /**
       * Xóa giỏ hàng sau khi đặt thành công
       */
      localStorage.removeItem("cartItems");

      /**
       * Nếu cartSlice của bạn có clearCart
       * thì có thể import và dispatch ở đây.
       */

      toast.success("Đặt hàng thành công!");
      dispatch(clearCart());

      /**
       * Lấy mã đơn hàng từ BE
       */
      const orderId =
        data?.order?._id ||
        data?.order?.id ||
        data?.order?.orderCode ||
        data?._id ||
        data?.orderCode;

      if (orderId) {
        navigate(`/order-success/${orderId}`);
      } else {
        navigate("/order-success");
      }
    } catch (error: any) {
      console.error("CREATE ORDER ERROR:", error);

      toast.error(error?.message || "Có lỗi xảy ra khi đặt hàng");
    } finally {
      setLoading(false);
    }
  };

  /**
   * ================================
   * EMPTY CART
   * ================================
   */

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">🛒</div>

          <h1 className="text-2xl font-bold text-gray-900">
            Giỏ hàng đang trống
          </h1>

          <p className="text-gray-500 mt-2">
            Bạn chưa có sản phẩm nào trong giỏ hàng.
          </p>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition"
          >
            <FiArrowLeft />
            Tiếp tục mua hàng
          </Link>
        </div>
      </div>
    );
  }

  /**
   * ================================
   * UI
   * ================================
   */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Thanh toán
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                Kiểm tra thông tin trước khi đặt hàng
              </p>
            </div>

            <Link
              to="/cart"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black"
            >
              <FiArrowLeft />
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT */}

          <div className="lg:col-span-2 space-y-6">
            {/* THÔNG TIN NHẬN HÀNG */}

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Thông tin nhận hàng
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* NAME */}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Họ và tên
                  </label>

                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>

                {/* PHONE */}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số điện thoại
                  </label>

                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                    <input
                      type="text"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="09xxxxxxxx"
                      className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>

                {/* ADDRESS */}

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Địa chỉ nhận hàng
                  </label>

                  <div className="relative">
                    <FiMapPin className="absolute left-3 top-4 text-gray-400" />

                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                      className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-black resize-none"
                    />
                  </div>
                </div>

                {/* NOTE */}

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ghi chú
                  </label>

                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Ghi chú cho người bán..."
                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black resize-none"
                  />
                </div>
              </div>
            </div>

            {/* PAYMENT */}

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-5">
                Phương thức thanh toán
              </h2>

              <div className="space-y-3">
                {/* COD */}

                <label
                  className={`flex items-center gap-4 border rounded-xl p-4 cursor-pointer transition ${
                    form.paymentMethod === "cod"
                      ? "border-black bg-gray-50"
                      : "hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={form.paymentMethod === "cod"}
                    onChange={handleChange}
                  />

                  <div>
                    <p className="font-semibold text-gray-900">
                      Thanh toán khi nhận hàng
                    </p>

                    <p className="text-sm text-gray-500">
                      Thanh toán tiền mặt cho đơn vị vận chuyển
                    </p>
                  </div>
                </label>

                {/* TRANSFER */}

                <label
                  className={`flex items-center gap-4 border rounded-xl p-4 cursor-pointer transition ${
                    form.paymentMethod === "transfer"
                      ? "border-black bg-gray-50"
                      : "hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="transfer"
                    checked={form.paymentMethod === "transfer"}
                    onChange={handleChange}
                  />

                  <div>
                    <p className="font-semibold text-gray-900">
                      Chuyển khoản ngân hàng
                    </p>

                    <p className="text-sm text-gray-500">
                      Thông tin tài khoản sẽ được hiển thị sau khi đặt hàng
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* PRODUCTS */}

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">Sản phẩm</h2>

                <span className="text-sm text-gray-500">
                  {cartItems.length} sản phẩm
                </span>
              </div>

              <div className="space-y-5">
                {cartItems.map((item) => {
                  const key = getItemKey(item);

                  const price = getItemPrice(item);

                  const quantity = Number(item.quantity || 1);

                  const variantName = getVariantName(item.variant);

                  return (
                    <div
                      key={key}
                      className="flex gap-4 border-b pb-5 last:border-0 last:pb-0"
                    >
                      {/* IMAGE */}

                      <div className="w-24 h-24 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        <img
                          src={getItemImage(item)}
                          alt={getItemName(item)}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* INFO */}

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 line-clamp-2">
                              {getItemName(item)}
                            </h3>

                            {variantName && (
                              <p className="text-sm text-gray-500 mt-1">
                                Phân loại:{" "}
                                <span className="font-medium text-gray-700">
                                  {variantName}
                                </span>
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            Xóa
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                          {/* QUANTITY */}

                          <div className="flex items-center border rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleDecrease(item)}
                              className="w-9 h-9 hover:bg-gray-100"
                            >
                              -
                            </button>

                            <span className="w-10 text-center text-sm font-semibold">
                              {quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleIncrease(item)}
                              className="w-9 h-9 hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>

                          {/* PRICE */}

                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {formatPrice(price)} ₫ / sản phẩm
                            </p>

                            <p className="font-bold text-gray-900">
                              {formatPrice(price * quantity)} ₫
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT */}

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border shadow-sm p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Đơn hàng</h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tạm tính</span>

                  <span className="font-medium">{formatPrice(subtotal)} ₫</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Phí vận chuyển</span>

                  <span className="font-medium">
                    {shippingFee === 0
                      ? "Miễn phí"
                      : `${formatPrice(shippingFee)} ₫`}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-end">
                    <span className="font-semibold text-gray-900">
                      Tổng cộng
                    </span>

                    <span className="text-2xl font-bold text-black">
                      {formatPrice(total)} ₫
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-black text-white rounded-xl py-4 font-bold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang đặt hàng..." : "Đặt hàng"}
              </button>

              <div className="mt-5 space-y-3 text-sm text-gray-500">
                <div className="flex gap-2">
                  <FiCheck className="text-green-600 mt-0.5 flex-shrink-0" />

                  <span>Kiểm tra hàng trước khi nhận</span>
                </div>

                <div className="flex gap-2">
                  <FiCheck className="text-green-600 mt-0.5 flex-shrink-0" />

                  <span>Hỗ trợ đổi trả theo chính sách</span>
                </div>

                <div className="flex gap-2">
                  <FiCheck className="text-green-600 mt-0.5 flex-shrink-0" />

                  <span>Nhật Khang Bike hỗ trợ tư vấn phụ tùng</span>
                </div>
              </div>

              <Link
                to="/cart"
                className="block text-center mt-5 text-sm font-medium text-gray-600 hover:text-black"
              >
                ← Quay lại giỏ hàng
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
