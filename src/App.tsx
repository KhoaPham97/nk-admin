import React from "react";
import { Provider } from "react-redux";
import "./App.css";

import { store } from "./redux/store";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Cart from "./components/Cart";
import LoginModal from "./components/LoginModal";
import ScrollToTopButton from "./components/ScrollToTopButton";
import BannerPopup from "./components/BannerPopup";
import ProtectedRoute from "./components/ProtectedRoute";

import { Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// ================================
// USER PAGES
// ================================

import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import LazyloadProducts from "./pages/LazyloadProducts";
import AllProducts from "./pages/AllProducts";
import AllCategories from "./pages/AllCategories";
import SingleProduct from "./pages/SingleProduct";
import SingleCategory from "./pages/SingleCategory";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import AnalyticsTracker from "./pages/AnalyticsTracker";
import { ToastContainer } from "react-toastify";
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

        <Route path="/account" element={<ProtectedRoute />}>
          <Route index element={<Profile />} />
        </Route>
      </Routes>
      <Toaster position="bottom-center" reverseOrder={false} />
      {/* ================================
          WEBSITE COMPONENTS
      ================================= */}
      <Footer />
      <Cart />
      <LoginModal />
      <ScrollToTopButton />
      <BannerPopup />{" "}
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
      <AnalyticsTracker />
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
