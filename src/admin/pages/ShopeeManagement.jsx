import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./ShopeeManagement.css";
import { BASE_URL } from "../../api";

const API_BASE = BASE_URL;

const getToken = () =>
  localStorage.getItem("adminToken") ||
  localStorage.getItem("accessToken") ||
  "";

const api = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Lỗi API (${response.status})`);
  }
  if (data?.success === false) {
    throw new Error(data.message || "Yêu cầu không thành công.");
  }
  return data;
};

const getShopList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.shops)) return data.shops;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const localDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value, unix = false) => {
  if (value === undefined || value === null || value === "") return "—";
  const date = unix ? new Date(Number(value) * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatMoney = (value, currency = "VND") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ${currency || ""}`.trim();
  }
};

const STATUS_LABELS = {
  UNPAID: "Chưa thanh toán",
  READY_TO_SHIP: "Chờ giao hàng",
  PROCESSED: "Đã xử lý",
  SHIPPED: "Đang giao",
  TO_CONFIRM_RECEIVE: "Chờ xác nhận nhận",
  COMPLETED: "Hoàn thành",
  IN_CANCEL: "Đang hủy",
  CANCELLED: "Đã hủy",
  TO_RETURN: "Yêu cầu trả hàng",
};

const statusClass = (status = "") => {
  const value = String(status).toUpperCase();
  if (["COMPLETED"].includes(value)) return "success";
  if (["CANCELLED", "IN_CANCEL"].includes(value)) return "danger";
  if (["SHIPPED", "TO_CONFIRM_RECEIVE"].includes(value)) return "info";
  if (["UNPAID"].includes(value)) return "warning";
  return "neutral";
};

const getOrderItems = (order) =>
  Array.isArray(order?.item_list) ? order.item_list : [];

const getItemSummary = (order) => {
  const items = getOrderItems(order);
  if (!items.length) return "Không có thông tin sản phẩm";
  const first = items[0];
  const name = first.item_name || first.product_name || "Sản phẩm Shopee";
  const model = first.model_name ? ` · ${first.model_name}` : "";
  const qty = Number(first.model_quantity || first.quantity || 1);
  const extra = items.length > 1 ? ` và ${items.length - 1} sản phẩm khác` : "";
  return `${name}${model} × ${qty}${extra}`;
};

export default function ShopeeManagement() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState("");
  const [disconnecting, setDisconnecting] = useState("");
  const [activeShopId, setActiveShopId] = useState("");

  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return localDateString(date);
  });
  const [dateTo, setDateTo] = useState(() => localDateString(new Date()));
  const [timeRangeField, setTimeRangeField] = useState("create_time");
  const [orderStatus, setOrderStatus] = useState("");

  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [pagination, setPagination] = useState({
    more: false,
    nextCursor: "",
  });
  const [searchedShop, setSearchedShop] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const connectedShops = useMemo(
    () => shops.filter((shop) => shop.status === "connected"),
    [shops],
  );

  const activeShop = useMemo(
    () => shops.find((shop) => String(shop.shopId) === String(activeShopId)),
    [shops, activeShopId],
  );

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api("/shopee/shops");
      const list = getShopList(result);
      setShops(list);
      setActiveShopId((current) => {
        if (current && list.some((shop) => String(shop.shopId) === current)) {
          return current;
        }
        const connected = list.find((shop) => shop.status === "connected");
        return connected
          ? String(connected.shopId)
          : list[0]
            ? String(list[0].shopId)
            : "";
      });
    } catch (err) {
      setError(err.message || "Không thể tải danh sách gian hàng.");
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
    if (!status) return;

    if (status === "connected") setSuccess("Kết nối Shopee thành công.");
    if (status === "failed")
      setError("Kết nối Shopee thất bại. Vui lòng thử lại.");
    loadShops();

    params.delete("shopee");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
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
      if (!authUrl)
        throw new Error("Backend không trả về đường dẫn xác thực Shopee.");
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
    if (!window.confirm("Bạn chắc chắn muốn ngắt kết nối shop Shopee này?"))
      return;
    setDisconnecting(String(shopId));
    setError("");
    setSuccess("");
    try {
      await api(`/shopee/shops/${encodeURIComponent(shopId)}`, {
        method: "DELETE",
      });
      setSuccess("Đã ngắt kết nối shop Shopee.");
      if (String(activeShopId) === String(shopId)) {
        setOrders([]);
        setPagination({ more: false, nextCursor: "" });
        setSearchedShop(null);
      }
      await loadShops();
    } catch (err) {
      setError(err.message || "Không thể ngắt kết nối shop.");
    } finally {
      setDisconnecting("");
    }
  };

  const fetchOrders = async (shop, cursor = "", append = false) => {
    if (!shop) {
      setError("Vui lòng chọn gian hàng Shopee.");
      return;
    }
    if (shop.status !== "connected") {
      setError("Gian hàng này chưa kết nối.");
      return;
    }
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      setError("Khoảng ngày không hợp lệ.");
      return;
    }

    setOrderLoading(true);
    setError("");
    setSuccess("");
    if (!append) {
      setOrders([]);
      setPagination({ more: false, nextCursor: "" });
    }

    try {
      const result = await api("/shopee/orders/sync", {
        method: "POST",
        body: JSON.stringify({
          shopId: shop.shopId,
          timeFrom: dateFrom,
          timeTo: dateTo,
          pageSize: 50,
          cursor,
          timeRangeField,
          ...(orderStatus ? { orderStatus } : {}),
        }),
      });

      const rows = Array.isArray(result.data) ? result.data : [];
      setOrders((previous) => (append ? [...previous, ...rows] : rows));
      setPagination({
        more: Boolean(result.pagination?.more),
        nextCursor: result.pagination?.nextCursor || "",
      });
      setSearchedShop(shop);
      setSuccess(
        rows.length
          ? `Đã tải ${rows.length} đơn hàng từ Shopee. Dữ liệu chỉ được xem, chưa lưu vào hệ thống.`
          : result.message ||
              "Không tìm thấy đơn hàng trong khoảng thời gian này.",
      );
    } catch (err) {
      setError(err.message || "Không thể lấy đơn hàng Shopee.");
    } finally {
      setOrderLoading(false);
    }
  };

  const loadMoreOrders = () => {
    if (!searchedShop || !pagination.nextCursor || orderLoading) return;
    fetchOrders(searchedShop, pagination.nextCursor, true);
  };

  const visibleOrders = useMemo(() => {
    const keyword = orderSearch.trim().toLowerCase();
    if (!keyword) return orders;
    return orders.filter((order) => {
      const haystack = [
        order.order_sn,
        order.buyer_username,
        order.recipient_address?.name,
        order.recipient_address?.phone,
        ...getOrderItems(order).map((item) => item.item_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [orders, orderSearch]);

  const totalOrders = orders.length;
  const totalAmount = orders.reduce(
    (sum, order) => sum + (Number(order.total_amount) || 0),
    0,
  );

  return (
    <main className="shopee-page">
      <header className="shopee-hero">
        <div className="shopee-hero-copy">
          <div className="shopee-eyebrow">
            <span className="shopee-live-dot" /> KÊNH BÁN HÀNG
          </div>
          <h1>Quản lý Shopee</h1>
          <p>
            Kết nối gian hàng và tra cứu đơn hàng Shopee tập trung tại Nhật
            Khang Bike.
          </p>
        </div>
        <div className="shopee-hero-actions">
          <button
            className="shopee-btn shopee-btn-light"
            onClick={loadShops}
            disabled={loading}
          >
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />{" "}
            Làm mới
          </button>
          <button
            className="shopee-btn shopee-btn-orange"
            onClick={connectShopee}
            disabled={connecting}
          >
            <i
              className={
                connecting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-plus"
              }
            />
            {connecting ? "Đang kết nối..." : "Kết nối gian hàng"}
          </button>
        </div>
      </header>

      {error && (
        <div className="shopee-alert shopee-alert-error" role="alert">
          <i className="fa-solid fa-circle-exclamation" />
          <span>{error}</span>
          <button aria-label="Đóng thông báo" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="shopee-alert shopee-alert-success" role="status">
          <i className="fa-solid fa-circle-check" />
          <span>{success}</span>
          <button aria-label="Đóng thông báo" onClick={() => setSuccess("")}>
            ×
          </button>
        </div>
      )}

      <section className="shopee-overview">
        <article className="shopee-overview-card">
          <div className="shopee-overview-icon orange">
            <i className="fa-solid fa-store" />
          </div>
          <div>
            <span>Tổng gian hàng</span>
            <strong>{shops.length}</strong>
            <small>Tài khoản đã liên kết</small>
          </div>
        </article>
        <article className="shopee-overview-card">
          <div className="shopee-overview-icon green">
            <i className="fa-solid fa-link" />
          </div>
          <div>
            <span>Đang kết nối</span>
            <strong>{connectedShops.length}</strong>
            <small>Gian hàng hoạt động</small>
          </div>
        </article>
        <article className="shopee-overview-card">
          <div className="shopee-overview-icon blue">
            <i className="fa-solid fa-receipt" />
          </div>
          <div>
            <span>Đơn đang hiển thị</span>
            <strong>{totalOrders.toLocaleString("vi-VN")}</strong>
            <small>Trong kết quả tra cứu hiện tại</small>
          </div>
        </article>
        <article className="shopee-overview-card">
          <div className="shopee-overview-icon purple">
            <i className="fa-solid fa-wallet" />
          </div>
          <div>
            <span>Tổng giá trị đơn</span>
            <strong className="shopee-amount">
              {formatMoney(totalAmount, orders[0]?.currency || "VND")}
            </strong>
            <small>Chỉ tính các đơn đã tải</small>
          </div>
        </article>
      </section>

      <section className="shopee-panel">
        <div className="shopee-panel-heading">
          <div>
            <div className="shopee-heading-kicker">TÀI KHOẢN LIÊN KẾT</div>
            <h2>Gian hàng của bạn</h2>
            <p>Quản lý trạng thái kết nối và quyền truy cập Shopee.</p>
          </div>
          <span className="shopee-count">{shops.length} gian hàng</span>
        </div>

        {loading ? (
          <div className="shopee-loading">
            <i className="fa-solid fa-spinner fa-spin" /> Đang tải gian hàng...
          </div>
        ) : shops.length === 0 ? (
          <div className="shopee-empty">
            <div className="shopee-empty-icon">
              <i className="fa-solid fa-store" />
            </div>
            <h3>Chưa kết nối gian hàng nào</h3>
            <p>Kết nối tài khoản Shopee để bắt đầu tra cứu đơn hàng.</p>
            <button
              className="shopee-btn shopee-btn-orange"
              onClick={connectShopee}
              disabled={connecting}
            >
              <i className="fa-solid fa-link" /> Kết nối Shopee
            </button>
          </div>
        ) : (
          <div className="shopee-shop-grid">
            {shops.map((shop) => {
              const id = String(shop.shopId);
              const connected = shop.status === "connected";
              const selected = id === String(activeShopId);
              return (
                <article
                  className={`shopee-shop-card ${selected ? "selected" : ""}`}
                  key={id}
                >
                  <div className="shopee-shop-card-top">
                    <div className="shopee-shop-brand">
                      <i className="fa-solid fa-bag-shopping" />
                    </div>
                    <span
                      className={`shopee-status ${connected ? "connected" : "disconnected"}`}
                    >
                      <i />
                      {connected ? "Đang kết nối" : "Đã ngắt"}
                    </span>
                  </div>
                  <h3>{shop.shopName || `Shopee Shop ${id}`}</h3>
                  <p className="shopee-shop-id">Shop ID: {id}</p>
                  <div className="shopee-shop-meta">
                    <div>
                      <span>Kết nối lần cuối</span>
                      <strong>{formatDate(shop.lastConnectedAt)}</strong>
                    </div>
                    <div>
                      <span>Tra cứu gần nhất</span>
                      <strong>{formatDate(shop.lastSyncedAt)}</strong>
                    </div>
                  </div>
                  <div className="shopee-shop-actions">
                    <button
                      className={`shopee-btn ${selected ? "shopee-btn-selected" : "shopee-btn-outline"}`}
                      onClick={() => setActiveShopId(id)}
                      disabled={!connected}
                    >
                      <i className="fa-solid fa-crosshairs" />{" "}
                      {selected ? "Đang chọn" : "Chọn shop"}
                    </button>
                    <button
                      className="shopee-icon-btn"
                      title="Làm mới token"
                      onClick={() => refreshToken(id)}
                      disabled={!connected || refreshing === id}
                    >
                      <i
                        className={`fa-solid ${refreshing === id ? "fa-spinner fa-spin" : "fa-key"}`}
                      />
                    </button>
                    <button
                      className="shopee-icon-btn danger"
                      title="Ngắt kết nối"
                      onClick={() => disconnectShop(id)}
                      disabled={disconnecting === id}
                    >
                      <i
                        className={`fa-solid ${disconnecting === id ? "fa-spinner fa-spin" : "fa-link-slash"}`}
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="shopee-panel shopee-orders-panel">
        <div className="shopee-panel-heading">
          <div>
            <div className="shopee-heading-kicker">TRA CỨU SHOPEE</div>
            <h2>Đơn hàng Shopee</h2>
            <p>Lấy đơn trực tiếp từ Shopee theo thời gian và trạng thái.</p>
          </div>
          <span className="shopee-readonly">
            <i className="fa-solid fa-eye" /> Chỉ xem dữ liệu
          </span>
        </div>

        <div className="shopee-filter-grid">
          <label className="shopee-field shop-field">
            <span>Gian hàng</span>
            <select
              value={activeShopId}
              onChange={(e) => setActiveShopId(e.target.value)}
            >
              <option value="">-- Chọn gian hàng --</option>
              {shops.map((shop) => (
                <option
                  key={String(shop.shopId)}
                  value={String(shop.shopId)}
                  disabled={shop.status !== "connected"}
                >
                  {shop.shopName || `Shop ${shop.shopId}`}{" "}
                  {shop.status !== "connected" ? "(đã ngắt)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="shopee-field">
            <span>Từ ngày</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="shopee-field">
            <span>Đến ngày</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={localDateString(new Date())}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <label className="shopee-field">
            <span>Lọc theo thời gian</span>
            <select
              value={timeRangeField}
              onChange={(e) => setTimeRangeField(e.target.value)}
            >
              <option value="create_time">Ngày tạo đơn</option>
              <option value="update_time">Ngày cập nhật</option>
            </select>
          </label>
          <label className="shopee-field">
            <span>Trạng thái đơn</span>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="READY_TO_SHIP">Chờ giao hàng</option>
              <option value="PROCESSED">Đã xử lý</option>
              <option value="SHIPPED">Đang giao</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </label>
          <div className="shopee-filter-submit">
            <button
              className="shopee-btn shopee-btn-orange"
              onClick={() => fetchOrders(activeShop)}
              disabled={
                orderLoading || !activeShop || activeShop.status !== "connected"
              }
            >
              <i
                className={
                  orderLoading
                    ? "fa-solid fa-spinner fa-spin"
                    : "fa-solid fa-magnifying-glass"
                }
              />
              {orderLoading ? "Đang tải..." : "Lấy đơn hàng"}
            </button>
          </div>
        </div>
        <div className="shopee-filter-hint">
          <i className="fa-solid fa-circle-info" />
          Shopee giới hạn tối đa 15 ngày cho mỗi lần tra cứu. Kết quả không được
          lưu vào MongoDB và không làm thay đổi tồn kho.
        </div>

        <div className="shopee-orders-toolbar">
          <div>
            <strong>
              {searchedShop
                ? `Kết quả: ${searchedShop.shopName || `Shop ${searchedShop.shopId}`}`
                : "Chưa có dữ liệu tra cứu"}
            </strong>
            <span>
              {searchedShop
                ? `${orders.length} đơn đã tải`
                : "Chọn shop và khoảng ngày để xem đơn hàng"}
            </span>
          </div>
          <label className="shopee-order-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Tìm mã đơn, khách hàng..."
            />
          </label>
        </div>

        {!searchedShop && !orderLoading ? (
          <div className="shopee-orders-empty">
            <div>
              <i className="fa-solid fa-box-open" />
            </div>
            <strong>Đơn hàng sẽ hiển thị tại đây</strong>
            <span>
              Chọn gian hàng, ngày bắt đầu và ngày kết thúc rồi nhấn “Lấy đơn
              hàng”.
            </span>
          </div>
        ) : orderLoading && orders.length === 0 ? (
          <div className="shopee-loading order-loading">
            <i className="fa-solid fa-spinner fa-spin" /> Đang lấy đơn hàng từ
            Shopee...
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="shopee-orders-empty compact">
            <div>
              <i className="fa-solid fa-inbox" />
            </div>
            <strong>
              {orders.length
                ? "Không tìm thấy kết quả phù hợp"
                : "Không có đơn hàng"}
            </strong>
            <span>
              {orders.length
                ? "Thử thay đổi từ khóa tìm kiếm."
                : "Shopee không trả về đơn hàng trong điều kiện đã chọn."}
            </span>
          </div>
        ) : (
          <div className="shopee-table-wrap">
            <table className="shopee-orders-table">
              <thead>
                <tr>
                  <th>Mã đơn / Ngày tạo</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Trạng thái</th>
                  <th className="align-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order, index) => {
                  const status = String(order.order_status || "").toUpperCase();
                  const customer =
                    order.buyer_username ||
                    order.recipient_address?.name ||
                    "Khách Shopee";
                  const items = getOrderItems(order);
                  return (
                    <tr key={order.order_sn || `${index}`}>
                      <td>
                        <strong className="shopee-order-code">
                          {order.order_sn || "—"}
                        </strong>
                        <span className="shopee-cell-sub">
                          {formatDate(order.create_time, true)}
                        </span>
                      </td>
                      <td>
                        <strong>{customer}</strong>
                        <span className="shopee-cell-sub">
                          {order.recipient_address?.phone ||
                            "Khách hàng Shopee"}
                        </span>
                      </td>
                      <td className="shopee-product-cell">
                        <strong>{getItemSummary(order)}</strong>
                        <span className="shopee-cell-sub">
                          {items.length} sản phẩm/dòng hàng
                        </span>
                      </td>
                      <td>
                        <span
                          className={`shopee-order-status ${statusClass(status)}`}
                        >
                          {STATUS_LABELS[status] || status || "Không rõ"}
                        </span>
                      </td>
                      <td className="align-right">
                        <strong className="shopee-order-total">
                          {formatMoney(
                            order.total_amount,
                            order.currency || "VND",
                          )}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.more && (
          <div className="shopee-load-more">
            <button
              className="shopee-btn shopee-btn-outline"
              onClick={loadMoreOrders}
              disabled={orderLoading}
            >
              {orderLoading ? (
                <i className="fa-solid fa-spinner fa-spin" />
              ) : (
                <i className="fa-solid fa-chevron-down" />
              )}
              {orderLoading ? "Đang tải..." : "Tải thêm đơn hàng"}
            </button>
          </div>
        )}
      </section>

      <aside className="shopee-safety-note">
        <div className="shopee-safety-icon">
          <i className="fa-solid fa-shield-halved" />
        </div>
        <div>
          <strong>Kiểm soát tồn kho tại Nhật Khang Bike</strong>
          <p>
            Trang này chỉ tra cứu dữ liệu trực tiếp từ Shopee. Đơn hàng không
            được lưu vào MongoDB và không tự động trừ tồn kho. Việc xử lý tồn
            kho vẫn do quản trị viên chủ động xác nhận theo quy trình riêng.
          </p>
        </div>
      </aside>
    </main>
  );
}
