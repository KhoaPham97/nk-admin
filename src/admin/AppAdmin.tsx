import React from "react";
import { Route, Routes } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import AdminProtectedRoute from "./AdminProtectedRoute";

import AdminLogin from "./pages/AdminLogin";

import Dashboard from "./pages/Dashboard";
import Products from "./features/products/pages/Products";
import Categories from "./pages/Categories";
import CreateProduct from "./features/products/pages/CreateProduct";

import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";

import CreateOrder from "./pages/CreateOrder";
import Orders from "./pages/Orders";
import InvoiceDetail from "./pages/InvoiceDetail";
import Inventory from "./features/inventory/pages/Inventory";
import InventoryImport from "./features/inventory/pages/InventoryImport";
import AdminSettings from "./pages/AdminSettings";
import InventoryHistory from "./features/inventory/pages/InventoryHistory";
import InventoryReceipts from "./features/inventory/pages/InventoryReceipts";
import AdminChat from "./pages/AdminChat";
import ProductPricing from "./features/products/pages/ProductPricing";

import Images from "./pages/Images";
import Vehicles from "./pages/Vehicles";
import CustomerPurchaseStats from "./pages/CustomerPurchaseStats";
import ProductQuotePage from "../quotes/QuoteImage";
import BestSellingProducts from "./features/products/pages/BestSellingProducts";
import InventoryBatchPage from "./features/inventory/pages/InventoryBatchPage";
import CostManagement from "./features/inventory/pages/CostManagement";
import ImportDrafts from "./features/inventory/pages/ImportDrafts";
import ShopeeManagement from "./features/shopee/pages/ShopeeManagement";
import SkuManagement from "./features/products/pages/SkuManagement";
import InventoryReservations from "./features/inventory/pages/InventoryReservations";

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
          {/* DASHBOARD */}
          <Route index element={<Dashboard />} />
          {/* ========================================
              PRODUCTS
          ======================================== */}
          <Route path="products" element={<Products />} />
          <Route path="products/bicycle" element={<Products />} />
          <Route path="products/electric" element={<Products />} />
          <Route path="products/tricycle" element={<Products />} />
          <Route path="products/create" element={<CreateProduct />} />
          <Route path="products-pricing" element={<ProductPricing />} />
          {/* ========================================
              VEHICLES
          ======================================== */}
          <Route path="vehicles" element={<Vehicles />} />
          {/* ========================================
              CATEGORY
          ======================================== */}
          <Route path="categories" element={<Categories />} />
          {/* ========================================
              CUSTOMERS
          ======================================== */}
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          {/* ========================================
              ORDERS
          ======================================== */}
          <Route path="orders" element={<Orders />} />
          <Route path="orders/create" element={<CreateOrder />} />
          {/* ========================================
              INVOICE
          ======================================== */}
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          {/* ========================================
              INVENTORY
          ======================================== */}
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/import" element={<InventoryImport />} />
          <Route path="inventory-history" element={<InventoryHistory />} />
          <Route path="inventory-receipts" element={<InventoryReceipts />} />
          {/* ========================================
              SETTINGS
          ======================================== */}
          <Route path="settings" element={<AdminSettings />} />
          {/* ========================================
              CHAT
          ======================================== */}
          <Route path="chat" element={<AdminChat />} />
          {/* ========================================
              IMAGES
          ======================================== */}
          <Route path="images" element={<Images />} />
          <Route
            path="customer-purchase-stats"
            element={<CustomerPurchaseStats />}
          />
          <Route
            path="best-selling-products"
            element={<BestSellingProducts />}
          />
          <Route
            path="/admin/inventory-batches"
            element={<InventoryBatchPage />}
          />
          <Route path="/admin/inventory-drafts" element={<ImportDrafts />} />
          <Route path="cost-management" element={<CostManagement />} />
          // Bên trong Routes
          <Route path="/admin/product-quote" element={<ProductQuotePage />} />
          <Route path="/admin/shopee" element={<ShopeeManagement />} />
          <Route path="/admin/sku" element={<SkuManagement />} />
          <Route
            path="/admin/inventory/reservations"
            element={<InventoryReservations />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
