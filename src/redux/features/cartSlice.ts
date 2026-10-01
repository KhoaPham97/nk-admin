import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CartItem } from "../../interfaces/CartItem";
import { CartSlice } from "../../interfaces/CartSlice";

const initialState: CartSlice = {
  cartOpen: false,
  cartItems: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,

  reducers: {
    /**
     * Mở / đóng cart
     */
    setCartState: (state, action: PayloadAction<boolean>) => {
      state.cartOpen = action.payload;
    },

    /**
     * Thêm sản phẩm vào giỏ
     *
     * Nếu sản phẩm đã tồn tại:
     * -> tăng quantity
     *
     * Nếu chưa tồn tại:
     * -> thêm mới quantity = 1
     */
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const product = action.payload;

      const productId = String(product._id || product.id || "");

      const existingItem = state.cartItems.find(
        (item) => String(item._id || item.id || "") === productId,
      );

      if (existingItem) {
        existingItem.quantity =
          Number(existingItem.quantity || 1) + Number(product.quantity || 1);
      } else {
        state.cartItems.push({
          ...product,
          quantity: Number(product.quantity || 1),
        });
      }
    },

    /**
     * Xóa sản phẩm
     */
    removeFromCart: (state, action: PayloadAction<string>) => {
      const productId = String(action.payload);

      state.cartItems = state.cartItems.filter(
        (item) => String(item._id || item.id || "") !== productId,
      );
    },

    /**
     * Tăng số lượng
     */
    increaseQuantity: (state, action: PayloadAction<string>) => {
      const productId = String(action.payload);

      const item = state.cartItems.find(
        (item) => String(item._id || item.id || "") === productId,
      );

      if (!item) return;

      item.quantity = Number(item.quantity || 1) + 1;
    },

    /**
     * Giảm số lượng
     */
    decreaseQuantity: (state, action: PayloadAction<string>) => {
      const productId = String(action.payload);

      const item = state.cartItems.find(
        (item) => String(item._id || item.id || "") === productId,
      );

      if (!item) return;

      const currentQuantity = Number(item.quantity || 1);

      if (currentQuantity <= 1) {
        state.cartItems = state.cartItems.filter(
          (item) => String(item._id || item.id || "") !== productId,
        );
        return;
      }

      item.quantity = currentQuantity - 1;
    },

    /**
     * Nhập trực tiếp số lượng
     */
    updateQuantity: (
      state,
      action: PayloadAction<{
        id: string;
        quantity: number;
      }>,
    ) => {
      const productId = String(action.payload.id);

      const item = state.cartItems.find(
        (item) => String(item._id || item.id || "") === productId,
      );

      if (!item) return;

      const quantity = Math.max(1, Number(action.payload.quantity || 1));

      item.quantity = quantity;
    },

    /**
     * Xóa toàn bộ giỏ hàng
     */
    clearCart: (state) => {
      state.cartItems = [];
    },
    addListCart: (state, action: PayloadAction<CartItem[]>) => {
      action.payload.forEach((product) => {
        const productId = getProductId(product);

        if (!productId) {
          return;
        }

        const cartItemKey = getCartItemKey(product);

        const existingItem = state.cartItems.find(
          (item) => getCartItemKey(item) === cartItemKey,
        );

        const quantity = Math.max(1, Number(product.quantity || 1));

        if (existingItem) {
          existingItem.quantity = Number(existingItem.quantity || 1) + quantity;
        } else {
          state.cartItems.push({
            ...product,
            quantity,
          });
        }
      });
    },
  },
});

export const {
  setCartState,
  addToCart,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
  updateQuantity,
  clearCart,
  addListCart,
} = cartSlice.actions;

export default cartSlice.reducer;
