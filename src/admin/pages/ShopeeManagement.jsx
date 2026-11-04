import React, { useCallback, useEffect, useState } from "react";
import "./ShopeeManagement.css";
import { BASE_URL } from "../../api";
const API_BASE = BASE_URL;

const getToken = () =>
  localStorage.getItem("adminToken") ||
  localStorage.getItem("accessToken") ||
  "";

const api = async (path, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Lỗi API (${response.status})`);
  }

  return data;
};

const formatDate = (value) => {
  if (!value) return "Chưa có dữ liệu";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có dữ liệu";

  return date.toLocaleString("vi-VN");
};

const getShopList = (data) => {
  if (Array.isArray(data)) return data;
  return data?.shops || data?.data || [];
};

export default function ShopeeManagement() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState("");
  const [disconnecting, setDisconnecting] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncResult, setSyncResult] = useState(null);

  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });

  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await api("/shopee/shops");
      setShops(getShopList(result));
    } catch (err) {
      setError(err.message || "Không thể tải danh sách shop Shopee.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("shopee");

    if (status === "connected") {
      setSuccess("Kết nối Shopee thành công!");
      loadShops();

      params.delete("shopee");
      const query = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
    }

    if (status === "failed") {
      setError("Kết nối Shopee thất bại. Vui lòng thử lại.");
      params.delete("shopee");
      const query = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
    }
  }, [loadShops]);

  const connectShopee = async () => {
    setConnecting(true);
    setError("");
    setSuccess("");

    try {
      const result = await api("/shopee/auth", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const authUrl = result.authUrl || result.data?.authUrl;

      if (!authUrl) {
        throw new Error("Backend không trả về đường dẫn xác thực Shopee.");
      }

      window.location.href = authUrl;
    } catch (err) {
      setError(err.message || "Không thể bắt đầu kết nối Shopee.");
      setConnecting(false);
    }
  };

  const refreshToken = async (shopId) => {
    setRefreshing(String(shopId));
    setError("");
    setSuccess("");

    try {
      await api("/shopee/refresh-token", {
        method: "POST",
        body: JSON.stringify({ shopId }),
      });

      setSuccess("Đã làm mới token Shopee.");
      await loadShops();
    } catch (err) {
      setError(err.message || "Không thể làm mới token.");
    } finally {
      setRefreshing("");
    }
  };

  const disconnectShop = async (shopId) => {
    const confirmed = window.confirm(
      "Bạn chắc chắn muốn ngắt kết nối shop Shopee này?",
    );

    if (!confirmed) return;

    setDisconnecting(String(shopId));
    setError("");
    setSuccess("");

    try {
      await api(`/shopee/shops/${encodeURIComponent(shopId)}`, {
        method: "DELETE",
      });

      setSuccess("Đã ngắt kết nối shop Shopee.");
      await loadShops();
    } catch (err) {
      setError(err.message || "Không thể ngắt kết nối shop.");
    } finally {
      setDisconnecting("");
    }
  };

  const syncOrders = async (shop) => {
    if (!dateFrom || !dateTo) {
      setError("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
      return;
    }

    if (dateFrom > dateTo) {
      setError("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
      return;
    }

    setSyncing(true);
    setError("");
    setSuccess("");
    setSyncResult(null);

    try {
      // Endpoint đồng bộ đơn hàng cần được triển khai ở backend.
      const result = await api("/shopee/orders/sync", {
        method: "POST",
        body: JSON.stringify({
          shopId: shop.shopId,
          timeFrom: dateFrom,
          timeTo: dateTo,
        }),
      });

      const data = result.data || result;

      setSyncResult({
        total: data.total ?? data.totalOrders ?? 0,
        imported: data.imported ?? data.newOrders ?? 0,
        duplicated: data.duplicated ?? data.skipped ?? 0,
        failed: data.failed ?? data.errors?.length ?? 0,
      });

      setSuccess(result.message || "Đồng bộ đơn hàng hoàn tất.");
    } catch (err) {
      setError(
        err.message ||
          "Không thể đồng bộ. Kiểm tra API đồng bộ đơn hàng trên backend.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const connectedShops = shops.filter((shop) => shop.status === "connected");

  const totalImported = shops.reduce(
    (sum, shop) => sum + Number(shop.totalImported || 0),
    0,
  );

  return (
    <div className="shopee-page">
      <div className="shopee-page-header">
        <div>
          <div className="shopee-breadcrumb">
            Quản lý bán hàng <span>/</span> Shopee
          </div>
          <h1>Quản lý Shopee</h1>
          <p>
            Quản lý gian hàng và đồng bộ đơn hàng Shopee về Nhật Khang Bike.
          </p>
        </div>

        <button
          className="shopee-btn shopee-btn-outline"
          onClick={loadShops}
          disabled={loading}
        >
          <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="shopee-alert shopee-alert-error">
          <i className="fa-solid fa-circle-exclamation" />
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="shopee-alert shopee-alert-success">
          <i className="fa-solid fa-circle-check" />
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <div className="shopee-stats">
        <div className="shopee-stat-card">
          <div className="shopee-stat-icon orange">
            <i className="fa-solid fa-store" />
          </div>
          <div>
            <span>Tổng gian hàng</span>
            <strong>{shops.length}</strong>
          </div>
        </div>

        <div className="shopee-stat-card">
          <div className="shopee-stat-icon green">
            <i className="fa-solid fa-link" />
          </div>
          <div>
            <span>Đang kết nối</span>
            <strong>{connectedShops.length}</strong>
          </div>
        </div>

        <div className="shopee-stat-card">
          <div className="shopee-stat-icon blue">
            <i className="fa-solid fa-box" />
          </div>
          <div>
            <span>Đơn đã nhập</span>
            <strong>{totalImported.toLocaleString("vi-VN")}</strong>
          </div>
        </div>
      </div>

      <section className="shopee-section">
        <div className="shopee-section-heading">
          <div>
            <h2>Gian hàng Shopee</h2>
            <p>Các tài khoản Shopee đã liên kết với hệ thống.</p>
          </div>

          <button
            className="shopee-btn shopee-btn-primary"
            onClick={connectShopee}
            disabled={connecting}
          >
            {connecting ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <i className="fa-solid fa-plus" />
            )}
            {connecting ? "Đang chuyển hướng..." : "Kết nối Shopee"}
          </button>
        </div>

        {loading ? (
          <div className="shopee-empty">
            <i className="fa-solid fa-spinner fa-spin" />
            <p>Đang tải danh sách gian hàng...</p>
          </div>
        ) : shops.length === 0 ? (
          <div className="shopee-empty">
            <div className="shopee-empty-icon">
              <i className="fa-solid fa-store" />
            </div>
            <h3>Chưa có gian hàng Shopee</h3>
            <p>
              Kết nối tài khoản Shopee để bắt đầu đồng bộ đơn hàng về hệ thống.
            </p>
            <button
              className="shopee-btn shopee-btn-primary"
              onClick={connectShopee}
              disabled={connecting}
            >
              <i className="fa-solid fa-link" />
              Kết nối ngay
            </button>
          </div>
        ) : (
          <div className="shopee-shop-list">
            {shops.map((shop) => {
              const shopId = String(shop.shopId);
              const isConnected = shop.status === "connected";

              return (
                <div className="shopee-shop-card" key={shopId}>
                  <div className="shopee-shop-top">
                    <div className="shopee-logo">
                      <i className="fa-solid fa-bag-shopping" />
                    </div>

                    <div className="shopee-shop-info">
                      <h3>{shop.shopName || `Shopee Shop ${shopId}`}</h3>
                      <span>Shop ID: {shopId}</span>
                    </div>

                    <span
                      className={`shopee-status ${
                        isConnected ? "is-connected" : "is-disconnected"
                      }`}
                    >
                      <span />
                      {isConnected ? "Đang kết nối" : "Đã ngắt kết nối"}
                    </span>
                  </div>

                  <div className="shopee-shop-details">
                    <div>
                      <span>Trạng thái token</span>
                      <strong>
                        {isConnected ? "Hoạt động" : "Không hoạt động"}
                      </strong>
                    </div>
                    <div>
                      <span>Kết nối lần cuối</span>
                      <strong>{formatDate(shop.lastConnectedAt)}</strong>
                    </div>
                    <div>
                      <span>Đồng bộ gần nhất</span>
                      <strong>{formatDate(shop.lastSyncedAt)}</strong>
                    </div>
                  </div>

                  <div className="shopee-shop-actions">
                    <button
                      className="shopee-btn shopee-btn-primary"
                      onClick={() => syncOrders(shop)}
                      disabled={!isConnected || syncing}
                    >
                      {syncing ? (
                        <i className="fa-solid fa-spinner fa-spin" />
                      ) : (
                        <i className="fa-solid fa-rotate" />
                      )}
                      {syncing ? "Đang đồng bộ..." : "Đồng bộ đơn hàng"}
                    </button>

                    <button
                      className="shopee-btn shopee-btn-outline"
                      onClick={() => refreshToken(shopId)}
                      disabled={!isConnected || refreshing === shopId}
                    >
                      {refreshing === shopId ? (
                        <i className="fa-solid fa-spinner fa-spin" />
                      ) : (
                        <i className="fa-solid fa-key" />
                      )}
                      Làm mới token
                    </button>

                    <button
                      className="shopee-btn shopee-btn-danger-outline"
                      onClick={() => disconnectShop(shopId)}
                      disabled={disconnecting === shopId}
                    >
                      <i className="fa-solid fa-link-slash" />
                      {disconnecting === shopId
                        ? "Đang ngắt..."
                        : "Ngắt kết nối"}
                    </button>
                  </div>

                  <div className="shopee-sync-form">
                    <div className="shopee-sync-form-title">
                      <i className="fa-regular fa-calendar-days" />
                      Khoảng thời gian đồng bộ
                    </div>

                    <div className="shopee-date-fields">
                      <label>
                        <span>Từ ngày</span>
                        <input
                          type="date"
                          value={dateFrom}
                          max={dateTo}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </label>

                      <label>
                        <span>Đến ngày</span>
                        <input
                          type="date"
                          value={dateTo}
                          min={dateFrom}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {syncResult && (
        <section className="shopee-section">
          <div className="shopee-section-heading">
            <div>
              <h2>Kết quả đồng bộ vừa thực hiện</h2>
              <p>Tổng hợp kết quả từ lần đồng bộ gần nhất.</p>
            </div>
          </div>

          <div className="shopee-sync-results">
            <div>
              <span>Tổng đơn từ Shopee</span>
              <strong>{syncResult.total}</strong>
            </div>
            <div>
              <span>Đơn mới được nhập</span>
              <strong className="text-green">{syncResult.imported}</strong>
            </div>
            <div>
              <span>Đơn đã tồn tại</span>
              <strong>{syncResult.duplicated}</strong>
            </div>
            <div>
              <span>Lỗi</span>
              <strong className="text-red">{syncResult.failed}</strong>
            </div>
          </div>
        </section>
      )}

      <section className="shopee-note">
        <i className="fa-solid fa-circle-info" />
        <div>
          <strong>Nguyên tắc đồng bộ tồn kho</strong>
          <p>
            Đồng bộ Shopee chỉ nhập thông tin đơn hàng vào hệ thống. Không tự
            động trừ tồn kho. Admin sẽ xác nhận đơn hàng trước khi xử lý kho
            theo quy trình Nhật Khang Bike.
          </p>
        </div>
      </section>
    </div>
  );
}
