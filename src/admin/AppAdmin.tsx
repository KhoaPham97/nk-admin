import React from "react";
import { Route, Routes } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import AdminProtectedRoute from "./AdminProtectedRoute";

import AdminLogin from "./pages/AdminLogin";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import CreateProduct from "./pages/CreateProduct";

import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";

import CreateOrder from "./pages/CreateOrder";
import Orders from "./pages/Orders";
import InvoiceDetail from "./pages/InvoiceDetail";
import Inventory from "./pages/Inventory";
import InventoryImport from "./pages/InventoryImport";

export default function BasicExample() {
  return (
    <Routes>
      {/* ==========================================
          LOGIN
          Không cần đăng nhập
      ========================================== */}

      <Route path="/admin/login" element={<AdminLogin />} />

      {/* ==========================================
          ADMIN
          BẮT BUỘC ĐĂNG NHẬP
      ========================================== */}

      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          {/* /admin */}

          <Route index element={<Dashboard />} />

          {/* PRODUCTS */}

          <Route path="products" element={<Products />} />

          <Route path="products/bicycle" element={<Products />} />

          <Route path="products/electric" element={<Products />} />

          <Route path="products/tricycle" element={<Products />} />

          <Route path="products/create" element={<CreateProduct />} />

          {/* CATEGORY */}

          <Route path="categories" element={<Categories />} />

          {/* CUSTOMERS */}

          <Route path="customers" element={<Customers />} />

          <Route path="customers/:id" element={<CustomerDetail />} />

          {/* ORDERS */}

          <Route path="orders" element={<Orders />} />

          <Route path="orders/create" element={<CreateOrder />} />

          {/* INVOICE */}

          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/import" element={<InventoryImport />} />
        </Route>
      </Route>
    </Routes>
  );
}
