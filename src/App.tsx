import React from "react";
import { Provider } from "react-redux";
import "./App.css";

import { store } from "./redux/store";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Cart from "./features/cart/pages/Cart";
import LoginModal from "./components/LoginModal";
import ScrollToTopButton from "./components/ScrollToTopButton";
import ProtectedRoute from "./components/ProtectedRoute";

import { Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// ================================
// USER PAGES
// ================================

import Home from "./features/home/pages/Home";
import SearchPage from "./features/catalog/pages/SearchPage";
import LazyloadProducts from "./features/catalog/pages/LazyloadProducts";
import AllProducts from "./features/catalog/pages/AllProducts";
import AllCategories from "./features/catalog/pages/AllCategories";
import SingleProduct from "./features/catalog/pages/SingleProduct";
import SingleCategory from "./features/catalog/pages/SingleCategory";
import Wishlist from "./features/account/pages/Wishlist";
import Checkout from "./features/checkout/pages/Checkout";
import AnalyticsTracker from "./features/analytics/pages/AnalyticsTracker";
import { ToastContainer } from "react-toastify";
import AuthModal from "./components/AuthModal";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import Account from "./features/account/pages/Account";
import OrderSuccess from "./features/checkout/pages/OrderSuccess";
import ChatWidget from "./components/ChatWidget";
import VehicleProductSearch from "./features/catalog/pages/VehicleProductSearch";
import "react-toastify/dist/ReactToastify.css";
// ================================
// ADMIN
// ================================

import BasicExample from "./admin/AppAdmin";

const CheckAccount = () => {
  const location = useLocation();

  // ==========================================
  // KIỂM TRA ĐANG Ở ADMIN
  // ==========================================

  const isAdmin = location.pathname.startsWith("/admin");

  // ==========================================
  // ADMIN
  //
  // Không render:
  // Navbar
  // Footer
  // Cart
  // LoginModal
  // BannerPopup
  // ==========================================

  if (isAdmin) {
    return (
      <>
        <BasicExample />

        <Toaster position="bottom-center" reverseOrder={false} />
      </>
    );
  }

  // ==========================================
  // WEBSITE KHÁCH HÀNG
  // ==========================================

  return (
    <>
      <Navbar />
      <Routes>
        {/* ================================
            HOME
        ================================= */}
        <Route path="/" element={<Home />} />
        {/* ================================
            SEARCH
        ================================= */}
        <Route path="/search" element={<SearchPage />} />
        {/* ================================
            PRODUCTS
        ================================= */}
        <Route path="/list-product/:type" element={<LazyloadProducts />} />
        <Route path="/products" element={<AllProducts />} />
        <Route path="/product/:productID" element={<SingleProduct />} />
        {/* ================================
            CATEGORY
        ================================= */}
        <Route path="/categories" element={<AllCategories />} />
        <Route path="/category/:slug" element={<SingleCategory />} />
        {/* ================================
            WISHLIST
        ================================= */}
        <Route path="/wishlist" element={<ProtectedRoute />}>
          <Route index element={<Wishlist />} />
        </Route>
        {/* ================================
            ACCOUNT
        ================================= */}
        <Route path="/account" element={<Account />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/order-success/:id" element={<OrderSuccess />} />
        <Route
          path="/tim-phu-tung-theo-xe"
          element={<VehicleProductSearch />}
        />
      </Routes>
      <Toaster position="bottom-center" reverseOrder={false} />
      {/* ================================
          WEBSITE COMPONENTS
      ================================= */}
      <Footer />
      <LoginModal />
      <ScrollToTopButton />
      {/* <BannerPopup />{" "} */}
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
      <AnalyticsTracker />
      <AuthModal />
      <ChatWidget />
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <CheckAccount />
    </Provider>
  );
}

export default App;
