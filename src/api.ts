const BASE_URL = window.location.href.includes("localhost")
  ? "http://localhost:3001/api"
  : "https://nkbike.onrender.com/api";

export const API_ENDPOINTS = {
  SIGNIN: `${BASE_URL}/signin`,
  SIGNUP: `${BASE_URL}/signup`,
  PRODUCTS: `${BASE_URL}/products`,
  PRODUCTS_CATEGORIES: `${BASE_URL}/categorys`,
  PRODUCTS_SEARCH: `${BASE_URL}/products/search`,
  PRODUCTS_CATEGORY: `${BASE_URL}/products/category`,
  PRODUCTS_ID: `${BASE_URL}/product/:id`,
  PRODUCTS_CATEGORY_ID: `${BASE_URL}/products/category/:id`,
  PRODUCTS_CATEGORY_ID_PRODUCTS: `${BASE_URL}/products/category/:id/products`,
  PRODUCTS_CATEGORY_ID_PRODUCTS_ID: `${BASE_URL}/products/category/:id/products/:id`,
  PRODUCTS_CATEGORY_ID_PRODUCTS_ID_PRODUCTS: `${BASE_URL}/products/category/:id/products/:id/products`,
  USER: `${BASE_URL}/user/:id`,
  CARTUSER: `${BASE_URL}/user/:id/move-cart-to-db`,
};
