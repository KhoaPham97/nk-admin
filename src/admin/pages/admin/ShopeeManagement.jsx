// src/pages/admin/ShopeeManagement.jsx

import React, { useEffect, useState } from "react";
import {
  Store,
  ShoppingCart,
  Link2,
  PackageCheck,
  PackageX,
  History,
  RefreshCw,
  ShoppingBag,
  AlertCircle,
  Zap,
} from "lucide-react";

import { shopeeApi } from "../../services/shopeeApi";

import ShopeeShops from "../../components/shopee/ShopeeShops";
import ShopeeOrders from "../../components/shopee/ShopeeOrders";
import ShopeeSkuMappings from "../../components/shopee/ShopeeSkuMappings";
import ShopeeStock from "../../components/shopee/ShopeeStock";
import ShopeeReturns from "../../components/shopee/ShopeeReturns";
import ShopeeStockHistory from "../../components/shopee/ShopeeStockHistory";
import ShopeeAutoStockPage from "../../components/shopee/ShopeeAutoStockPage";
import "../../styles/shopee-management.css";

const MENU_ITEMS = [
  {
    id: "shops",
    label: "Gian hàng",
    description: "Kết nối và quản lý shop",
    icon: Store,
  },
  {
    id: "orders",
    label: "Đơn hàng",
    description: "Đồng bộ và quản lý đơn",
    icon: ShoppingCart,
  },
  {
    id: "mappings",
    label: "Ánh xạ SKU",
    description: "Liên kết sản phẩm trong kho",
    icon: Link2,
  },
  {
    id: "stock",
    label: "Xuất kho FIFO",
    description: "Kiểm tra và xác nhận xuất kho",
    icon: PackageCheck,
  },
  {
    id: "returns",
    label: "Hàng hoàn",
    description: "Tiếp nhận hàng trả về",
    icon: PackageX,
  },
  {
    id: "history",
    label: "Lịch sử kho",
    description: "Theo dõi giao dịch kho",
    icon: History,
  },
  {
    id: "auto-stock",
    label: "Tự động trừ kho",
    description: "Xử lý hàng loạt và tự động định kỳ",
    icon: Zap,
  },
];

const DEFAULT_STATS = {
  shops: 0,
  orders: 0,
  pendingStock: 0,
  mappings: 0,
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Không thể tải dữ liệu Shopee"
  );
}

export default function ShopeeManagement() {
  const [activeTab, setActiveTab] = useState("shops");

  const [stats, setStats] = useState(DEFAULT_STATS);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [shopsResult, ordersResult, mappingsResult] =
        await Promise.allSettled([
          shopeeApi.getShops(),
          shopeeApi.getOrders({
            page: 1,
            limit: 1,
          }),
          shopeeApi.getSkuMappings({
            page: 1,
            limit: 1,
          }),
        ]);

      const nextStats = { ...DEFAULT_STATS };

      if (shopsResult.status === "fulfilled") {
        const data = shopsResult.value;

        const shops = data?.shops || data?.data?.shops || data?.data || [];

        nextStats.shops = Array.isArray(shops)
          ? shops.length
          : Number(data?.total || 0);
      }

      if (ordersResult.status === "fulfilled") {
        const data = ordersResult.value;

        nextStats.orders = Number(
          data?.total ||
            data?.totalOrders ||
            data?.pagination?.total ||
            data?.data?.total ||
            0,
        );
      }

      if (mappingsResult.status === "fulfilled") {
        const data = mappingsResult.value;

        nextStats.mappings = Number(
          data?.total ||
            data?.totalMappings ||
            data?.pagination?.total ||
            data?.data?.total ||
            0,
        );
      }

      setStats(nextStats);

      const failed = [shopsResult, ordersResult, mappingsResult].some(
        (item) => item.status === "rejected",
      );

      if (failed) {
        setError(
          "Một số dữ liệu thống kê chưa tải được. Bạn vẫn có thể sử dụng các khu vực chức năng.",
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [refreshKey]);

  // =====================================================
  // CONTENT
  // =====================================================

  const renderContent = () => {
    const commonProps = {
      onRefresh: loadDashboard,
      refreshKey,
    };

    switch (activeTab) {
      case "shops":
        return <ShopeeShops {...commonProps} />;

      case "orders":
        return <ShopeeOrders {...commonProps} />;

      case "mappings":
        return <ShopeeSkuMappings {...commonProps} />;

      case "stock":
        return <ShopeeStock {...commonProps} />;

      case "returns":
        return <ShopeeReturns {...commonProps} />;

      case "history":
        return <ShopeeStockHistory {...commonProps} />;
      case "auto-stock":
        return (
          <ShopeeAutoStockPage
            onRefresh={loadDashboard}
            refreshKey={refreshKey}
          />
        );
      default:
        return <ShopeeShops {...commonProps} />;
    }
  };

  const currentMenu = MENU_ITEMS.find((item) => item.id === activeTab);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="shopee-management">
      {/* HEADER */}

      <header className="shopee-header">
        <div className="shopee-header-left">
          <div className="shopee-logo">
            <ShoppingBag size={27} />
          </div>

          <div>
            <h1>SHOPEE CENTER</h1>
            <p>NHẬT KHANG BIKE · QUẢN LÝ BÁN HÀNG</p>
          </div>
        </div>

        <button
          className="shopee-refresh-button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "shopee-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </header>

      {/* STATISTICS */}

      <section className="shopee-dashboard-stats">
        <article className="shopee-stat-card">
          <div className="shopee-stat-icon orange">
            <Store size={22} />
          </div>

          <div>
            <span>Gian hàng</span>
            <strong>{stats.shops}</strong>
          </div>
        </article>

        <article className="shopee-stat-card">
          <div className="shopee-stat-icon blue">
            <ShoppingCart size={22} />
          </div>

          <div>
            <span>Tổng đơn hàng</span>
            <strong>{stats.orders.toLocaleString("vi-VN")}</strong>
          </div>
        </article>

        <article className="shopee-stat-card">
          <div className="shopee-stat-icon purple">
            <Link2 size={22} />
          </div>

          <div>
            <span>Ánh xạ SKU</span>
            <strong>{stats.mappings.toLocaleString("vi-VN")}</strong>
          </div>
        </article>

        <article className="shopee-stat-card">
          <div className="shopee-stat-icon green">
            <PackageCheck size={22} />
          </div>

          <div>
            <span>Chờ xử lý kho</span>
            <strong>--</strong>
          </div>
        </article>
      </section>

      {/* ERROR */}

      {error && (
        <div className="shopee-dashboard-warning">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button onClick={loadDashboard}>Thử lại</button>
        </div>
      )}

      {/* MAIN LAYOUT */}

      <div className="shopee-layout">
        {/* SIDEBAR */}

        <aside className="shopee-sidebar">
          <div className="shopee-sidebar-title">QUẢN LÝ SHOPEE</div>

          <nav className="shopee-navigation">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  className={`shopee-nav-item ${active ? "active" : ""}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <div className="shopee-nav-icon">
                    <Icon size={19} />
                  </div>

                  <div className="shopee-nav-content">
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="shopee-sidebar-footer">
            <span className="shopee-status-dot" />
            Hệ thống quản lý kho
          </div>
        </aside>

        {/* CONTENT */}

        <main className="shopee-main">
          <div className="shopee-content-heading">
            <div>
              <div className="shopee-breadcrumb">
                Shopee Center / {currentMenu?.label}
              </div>

              <h2>{currentMenu?.label}</h2>

              <p>{currentMenu?.description}</p>
            </div>
          </div>

          <div className="shopee-content-body">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}
