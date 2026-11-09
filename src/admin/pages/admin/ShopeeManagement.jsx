import React, { useEffect, useState, useCallback } from "react";
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
  DollarSign,
  MessageSquare,
} from "lucide-react";

import { shopeeApi } from "../../services/shopeeApi";

import ShopeeShops from "../../components/shopee/ShopeeShops";
import ShopeeOrders from "../../components/shopee/ShopeeOrders";
import ShopeeSkuMappings from "../../components/shopee/ShopeeSkuMappings";
import ShopeeStock from "../../components/shopee/ShopeeStock";
import ShopeeReturns from "../../components/shopee/ShopeeReturns";
import ShopeeStockHistory from "../../components/shopee/ShopeeStockHistory";
import ShopeeAutoStockPage from "../../components/shopee/ShopeeAutoStockPage";
import ShopeeRevenue from "../../components/shopee/ShopeeRevenue";
import ShopeeReview from "../../components/shopee/ShopeeReviewsPage";

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
  {
    id: "revenue",
    label: "Doanh thu & Lợi nhuận",
    description: "Đối soát doanh thu, phí và giá vốn Shopee",
    icon: DollarSign,
  },
  {
    id: "reviews",
    label: "Đánh giá Shopee",
    description: "Quản lý đánh giá, mẫu phản hồi và duyệt trả lời",
    icon: MessageSquare,
  },
];

const DEFAULT_STATS = {
  shops: 0,
  orders: 0,
  pendingStock: 0,
  mappings: 0,
};

// Chuẩn hóa dữ liệu shop từ các dạng response API
const extractShops = (response) => {
  const candidates = [
    response?.shops,
    response?.data?.shops,
    response?.data?.data?.shops,
    response?.data?.items,
    response?.items,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) || [];
};

const getShopId = (shop) =>
  String(shop?.shop_id ?? shop?.shopId ?? shop?.id ?? "");

const getShopName = (shop) =>
  shop?.shop_name || shop?.shopName || shop?.name || `Shop ${getShopId(shop)}`;

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
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  // ==========================================
  // LOAD DASHBOARD
  // ==========================================

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const nextStats = { ...DEFAULT_STATS };

      // ==========================================
      // 1. TẢI DANH SÁCH SHOP TRƯỚC
      // ==========================================

      let currentShopId = selectedShopId;
      let shopList = [];

      try {
        const shopResponse = await shopeeApi.getShops();

        shopList = extractShops(shopResponse).filter((shop) => getShopId(shop));

        setShops(shopList);
        nextStats.shops = shopList.length;

        // Giữ shop đang chọn nếu vẫn tồn tại
        const currentShopExists = shopList.some(
          (shop) => getShopId(shop) === String(currentShopId),
        );

        if (!currentShopExists) {
          currentShopId = shopList.length ? getShopId(shopList[0]) : "";
        }

        setSelectedShopId(currentShopId);
      } catch (shopError) {
        console.error("Get Shopee shops error:", shopError);
        setShops([]);
        currentShopId = "";
      }

      // ==========================================
      // 2. CHỈ TẢI ĐƠN VÀ SKU KHI ĐÃ CÓ SHOP
      // ==========================================

      if (currentShopId) {
        const [ordersResult, mappingsResult] = await Promise.allSettled([
          shopeeApi.getOrders({
            page: 1,
            limit: 1,
            shop_id: currentShopId,
          }),

          shopeeApi.getSkuMappings({
            page: 1,
            limit: 1,
            shop_id: currentShopId,
          }),
        ]);

        if (ordersResult.status === "fulfilled") {
          const data = ordersResult.value;

          nextStats.orders = Number(
            data?.total ??
              data?.totalOrders ??
              data?.pagination?.total ??
              data?.data?.total ??
              data?.data?.pagination?.total ??
              0,
          );
        } else {
          console.error("Get Shopee orders error:", ordersResult.reason);
        }

        if (mappingsResult.status === "fulfilled") {
          const data = mappingsResult.value;

          nextStats.mappings = Number(
            data?.total ??
              data?.totalMappings ??
              data?.pagination?.total ??
              data?.data?.total ??
              data?.data?.pagination?.total ??
              0,
          );
        } else {
          console.error("Get Shopee mappings error:", mappingsResult.reason);
        }

        const failed =
          ordersResult.status === "rejected" ||
          mappingsResult.status === "rejected";

        if (failed) {
          setError("Một số dữ liệu đơn hàng hoặc SKU Mapping chưa tải được.");
        }
      } else {
        nextStats.orders = 0;
        nextStats.mappings = 0;

        setError("Chưa có gian hàng Shopee được kết nối.");
      }

      setStats(nextStats);
    } catch (err) {
      console.error("Load Shopee dashboard error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selectedShopId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshKey]);

  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  // ==========================================
  // COMMON PROPS
  // ==========================================

  const commonProps = {
    shops,
    selectedShopId,
    onShopChange: setSelectedShopId,
    onRefresh: loadDashboard,
    refreshKey,
  };

  // ==========================================
  // CONTENT
  // ==========================================

  const renderContent = () => {
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
        return <ShopeeAutoStockPage {...commonProps} />;
      case "revenue":
        return <ShopeeRevenue {...commonProps} />;
      case "reviews":
        return <ShopeeReview {...commonProps} />;

      default:
        return <ShopeeShops {...commonProps} />;
    }
  };

  const currentMenu = MENU_ITEMS.find((item) => item.id === activeTab);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="shopee-management">
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
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "shopee-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </header>

      {/* SHOP SELECTOR */}

      <section className="shopee-shop-selector">
        <div className="shopee-shop-selector-label">
          <Store size={18} />
          <span>Gian hàng đang làm việc</span>
        </div>

        <select
          value={selectedShopId}
          onChange={(event) => setSelectedShopId(event.target.value)}
          disabled={!shops.length}
        >
          {!shops.length && <option value="">Chưa có gian hàng</option>}

          {shops.map((shop) => (
            <option key={getShopId(shop)} value={getShopId(shop)}>
              {getShopName(shop)}
            </option>
          ))}
        </select>

        <span className="shopee-shop-count">{shops.length} gian hàng</span>
      </section>

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
