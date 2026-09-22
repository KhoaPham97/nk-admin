import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "../../models/Product";
import { ProductSlice } from "../../models/ProductSlice";
import { Category } from "../../models/Category";

const initialState: ProductSlice = {
  allProducts: [],
  categories: [],
  ebikeProducts: [],
  bikeProducts: [],
  threeWheeleProducts: [],
  wishlist: [],
};

export const productSlice = createSlice({
  name: "productSlice",
  initialState,
  reducers: {
    updateEbikeList: (state, action: PayloadAction<Product[]>) => {
      return { ...state, ebikeProducts: action.payload };
    },
    updateBikeList: (state, action: PayloadAction<Product[]>) => {
      return { ...state, bikeProducts: action.payload };
    },
    updateThreeWheeleList: (state, action: PayloadAction<Product[]>) => {
      return { ...state, threeWheeleProducts: action.payload };
    },
    addToWishlist: (state, action: PayloadAction<Product>) => {
      const { wishlist } = state;
      if (wishlist.findIndex((item) => item.id === action.payload.id) === -1) {
        const updatedList = [...state.wishlist, action.payload];
        return { ...state, wishlist: updatedList };
      }
    },
    addCategories: (state, action: PayloadAction<Category[]>) => {
      return { ...state, categories: action.payload };
    },
    addProducts: (state, action: PayloadAction<Product[]>) => {
      return { ...state, allProducts: action.payload };
    },
  },
});

export const {
  updateEbikeList,
  updateBikeList,
  updateThreeWheeleList,
  addToWishlist,
  addCategories,
  addProducts,
} = productSlice.actions;
export default productSlice.reducer;
