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

import { Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import LazyloadProducts from "./pages/LazyloadProducts";
import AllProducts from "./pages/AllProducts";
import AllCategories from "./pages/AllCategories";
import SingleProduct from "./pages/SingleProduct";
import SingleCategory from "./pages/SingleCategory";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import ChatGPTWidget from "./pages/ChatGPTWidget";
import BasicExample from "./admin/AppAdmin";

const CheckAccount = () => {
  const location = useLocation();

  const isAdmin = location.pathname.startsWith("/admin");

  // ==========================================
  // ADMIN
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
  // WEBSITE
  // ==========================================

  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/search" element={<SearchPage />} />

        <Route path="/list-product/:type" element={<LazyloadProducts />} />

        <Route path="/products" element={<AllProducts />} />

        <Route path="/categories" element={<AllCategories />} />

        <Route path="/product/:productID" element={<SingleProduct />} />

        <Route path="/category/:slug" element={<SingleCategory />} />

        <Route path="/wishlist" element={<ProtectedRoute />}>
          <Route index element={<Wishlist />} />
        </Route>

        <Route path="/account" element={<ProtectedRoute />}>
          <Route index element={<Profile />} />
        </Route>
      </Routes>

      <Toaster position="bottom-center" reverseOrder={false} />

      <Footer />
      <Cart />
      <LoginModal />
      <ScrollToTopButton />
      <BannerPopup />
      <ChatGPTWidget />
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
