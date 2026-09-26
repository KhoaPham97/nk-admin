import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { Product } from "../../models/Product";
import { ProductSlice } from "../../models/ProductSlice";
import { Category } from "../../models/Category";

import { API_ENDPOINTS } from "../../api";

// =====================================================
// INITIAL STATE
// =====================================================

const initialState: ProductSlice = {
  allProducts: [],
  categories: [],
  ebikeProducts: [],
  bikeProducts: [],
  threeWheeleProducts: [],
  wishlist: [],
};

// =====================================================
// FETCH HOME PRODUCTS
// =====================================================
//
// type=1 -> xe đạp
// type=2 -> xe điện
// type=3 -> xe ba bánh
//
// Gọi 3 API song song
// =====================================================

export const fetchHomeProducts = createAsyncThunk(
  "productSlice/fetchHomeProducts",

  async (_, { rejectWithValue }) => {
    try {
      const [bikeRes, ebikeRes, threeWRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.PRODUCTS}?type=1&limit=10`),

        fetch(`${API_ENDPOINTS.PRODUCTS}?type=2&limit=10`),

        fetch(`${API_ENDPOINTS.PRODUCTS}?type=3&limit=10`),
      ]);

      // =================================================
      // CHECK API
      // =================================================

      if (!bikeRes.ok || !ebikeRes.ok || !threeWRes.ok) {
        throw new Error("Không thể tải dữ liệu sản phẩm");
      }

      // =================================================
      // GET JSON
      // =================================================

      const [bikeData, ebikeData, threeWData] = await Promise.all([
        bikeRes.json(),
        ebikeRes.json(),
        threeWRes.json(),
      ]);

      // =================================================
      // CONVERT PRODUCT
      // =================================================

      const convertProducts = (products: any[]): Product[] => {
        return products.map((product: any) => ({
          ...product,

          id: product._id,

          qty: product.qty ?? 0,

          discountPercentage: product.discountPercentage ?? 0.1,
        }));
      };

      // =================================================
      // PRODUCT LIST
      // =================================================

      const bikeProducts = convertProducts(bikeData?.products ?? []);

      const ebikeProducts = convertProducts(ebikeData?.products ?? []);

      const threeWheeleProducts = convertProducts(threeWData?.products ?? []);

      // =================================================
      // RETURN
      // =================================================

      return {
        bikeProducts,

        ebikeProducts,

        threeWheeleProducts,
      };
    } catch (error: any) {
      console.error("fetchHomeProducts error:", error);

      return rejectWithValue(
        error?.message || "Không thể tải dữ liệu sản phẩm",
      );
    }
  },
);

// =====================================================
// PRODUCT SLICE
// =====================================================

export const productSlice = createSlice({
  name: "productSlice",

  initialState,

  reducers: {
    // =================================================
    // EBIKE
    // =================================================

    updateEbikeList: (state, action: PayloadAction<Product[]>) => {
      return {
        ...state,
        ebikeProducts: action.payload,
      };
    },

    // =================================================
    // BIKE
    // =================================================

    updateBikeList: (state, action: PayloadAction<Product[]>) => {
      return {
        ...state,
        bikeProducts: action.payload,
      };
    },

    // =================================================
    // THREE WHEELE
    // =================================================

    updateThreeWheeleList: (state, action: PayloadAction<Product[]>) => {
      return {
        ...state,
        threeWheeleProducts: action.payload,
      };
    },

    // =================================================
    // WISHLIST
    // =================================================

    addToWishlist: (state, action: PayloadAction<Product>) => {
      const { wishlist } = state;

      if (wishlist.findIndex((item) => item.id === action.payload.id) === -1) {
        const updatedList = [...state.wishlist, action.payload];

        return {
          ...state,
          wishlist: updatedList,
        };
      }

      return state;
    },

    // =================================================
    // CATEGORIES
    // =================================================

    addCategories: (state, action: PayloadAction<Category[]>) => {
      return {
        ...state,
        categories: action.payload,
      };
    },

    // =================================================
    // ALL PRODUCTS
    // =================================================

    addProducts: (state, action: PayloadAction<Product[]>) => {
      return {
        ...state,
        allProducts: action.payload,
      };
    },
  },

  // ===================================================
  // ASYNC THUNK
  // ===================================================

  extraReducers: (builder) => {
    builder.addCase(fetchHomeProducts.fulfilled, (state, action) => {
      state.bikeProducts = action.payload.bikeProducts;

      state.ebikeProducts = action.payload.ebikeProducts;

      state.threeWheeleProducts = action.payload.threeWheeleProducts;
    });
  },
});

// =====================================================
// EXPORT ACTIONS
// =====================================================

export const {
  updateEbikeList,
  updateBikeList,
  updateThreeWheeleList,
  addToWishlist,
  addCategories,
  addProducts,
} = productSlice.actions;

// =====================================================
// EXPORT REDUCER
// =====================================================

export default productSlice.reducer;
