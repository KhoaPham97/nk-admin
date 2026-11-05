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

  if (!response.ok || data?.success === false) {
    throw new Error(data.message || `Yêu cầu thất bại (${response.status})`);
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const dateToUnix = (value, end = false) => {
  if (!value) return 0;
  const [y, m, d] = value.split("-").map(Number);
  const date = end
    ? new Date(y, m - 1, d, 23, 59, 59)
    : new Date(y, m - 1, d, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
};

const formatDate = (value, unix = false) => {
  if (value === undefined || value === null || value === "") return "—";
  const date = unix ? new Date(Number(value) * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
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
    return `${amount.toLocaleString("vi-VN")} ${currency}`;
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
  if (value === "COMPLETED") return "success";
  if (["CANCELLED", "IN_CANCEL"].includes(value)) return "danger";
  if (["SHIPPED", "TO_CONFIRM_RECEIVE"].includes(value)) return "info";
  if (value === "UNPAID") return "warning";
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
  const qty = Number(
    first.model_quantity || first.quantity || first.amount || 1,
  );
  const extra =
    items.length > 1 ? ` và ${items.length - 1} dòng hàng khác` : "";

  return `${name}${model} × ${qty}${extra}`;
};

const TABS = [
  { id: "shops", label: "Gian hàng", icon: "fa-store" },
  { id: "orders", label: "Đơn hàng", icon: "fa-receipt" },
  { id: "mapping", label: "Ánh xạ SKU", icon: "fa-barcode" },
  { id: "returns", label: "Hàng hoàn", icon: "fa-rotate-left" },
  { id: "history", label: "Lịch sử kho", icon: "fa-clock-rotate-left" },
];

export default function ShopeeManagement() {
  const [activeTab, setActiveTab] = useState("shops");

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
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotal, setTransactionTotal] = useState(0);

  const [returnForm, setReturnForm] = useState({
    returnSn: "",
    itemKey: "",
    receivedQty: 0,
    goodQty: 0,
    damagedQty: 0,
    note: "",
  });
  const [receiving, setReceiving] = useState(false);

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

  const totalAmount = useMemo(
    () =>
      orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0),
    [orders],
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
      setError(err.message || "Không thể tải danh sách shop.");
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

    if (status === "success" || status === "connected") {
      setSuccess("Kết nối Shopee thành công.");
    } else if (status === "error" || status === "failed") {
      setError(
        params.get("message") || "Kết nối Shopee thất bại. Vui lòng thử lại.",
      );
    }

    loadShops();

    params.delete("shopee");
    params.delete("message");
    params.delete("shopId");

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

      const authUrl =
        result.authUrl ||
        result.url ||
        result.data?.authUrl ||
        result.data?.url;

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
    if (!window.confirm("Bạn chắc chắn muốn ngắt kết nối shop Shopee này?")) {
      return;
    }

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

    const from = dateToUnix(dateFrom);
    const to = dateToUnix(dateTo, true);

    // Shopee giới hạn khoảng thời gian theo từng lần truy vấn.
    if (to - from > 15 * 24 * 60 * 60) {
      setError("Khoảng tra cứu không được vượt quá 15 ngày.");
      return;
    }

    setOrderLoading(true);
    setError("");
    setSuccess("");

    if (!append) {
      setOrders([]);
      setSelectedOrder(null);
      setPagination({ more: false, nextCursor: "" });
    }

    try {
      const result = await api("/shopee/orders/sync", {
        method: "POST",
        body: JSON.stringify({
          shopId: shop.shopId,
          timeFrom: from,
          timeTo: to,
          pageSize: 50,
          cursor,
          timeRangeField,
          ...(orderStatus ? { orderStatus } : {}),
        }),
      });

      // Controller trả { success, data: { orderList, more, nextCursor } }
      const payload = result.data || result;
      const rows = Array.isArray(payload.orderList)
        ? payload.orderList
        : Array.isArray(payload.order_list)
          ? payload.order_list
          : Array.isArray(result.orderList)
            ? result.orderList
            : [];

      setOrders((previous) => (append ? [...previous, ...rows] : rows));

      setPagination({
        more: Boolean(payload.more),
        nextCursor: payload.nextCursor || payload.next_cursor || "",
      });

      setSearchedShop(shop);

      setSuccess(
        rows.length
          ? `Đã tải ${rows.length} đơn hàng. Dữ liệu chỉ được xem, chưa lưu vào kho.`
          : "Không tìm thấy đơn hàng trong khoảng thời gian này.",
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
      const address = order.recipient_address || {};
      const haystack = [
        order.order_sn,
        order.buyer_username,
        address.name,
        address.phone,
        ...getOrderItems(order).map((item) => item.item_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [orders, orderSearch]);

  const loadTransactions = async (page = 1) => {
    if (!activeShopId) {
      setError("Vui lòng chọn shop trước khi xem lịch sử.");
      return;
    }

    setTransactionLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        shopId: activeShopId,
        page: String(page),
        limit: "30",
      });

      const result = await api(
        `/shopee/inventory/transactions?${params.toString()}`,
      );

      const payload = result.data || result;
      const rows = Array.isArray(payload.transactions)
        ? payload.transactions
        : Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(result.transactions)
            ? result.transactions
            : [];

      setTransactions(rows);
      setTransactionTotal(
        Number(payload.total || payload.totalItems || rows.length),
      );
      setTransactionPage(page);
    } catch (err) {
      setError(
        `Không tải được lịch sử kho: ${err.message}. Kiểm tra API GET /shopee/inventory/transactions.`,
      );
      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history" && activeShopId) {
      loadTransactions(1);
    }
    // Chỉ tải khi chuyển tab hoặc đổi shop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeShopId]);

  const submitReturnReceipt = async (event) => {
    event.preventDefault();

    const { returnSn, itemKey, receivedQty, goodQty, damagedQty, note } =
      returnForm;

    const received = Number(receivedQty);
    const good = Number(goodQty);
    const damaged = Number(damagedQty);

    if (!activeShopId) {
      setError("Vui lòng chọn shop.");
      return;
    }

    if (!returnSn.trim() || !itemKey.trim()) {
      setError("Vui lòng nhập mã yêu cầu hoàn và itemKey.");
      return;
    }

    if (
      !Number.isInteger(received) ||
      !Number.isInteger(good) ||
      !Number.isInteger(damaged) ||
      received <= 0 ||
      good < 0 ||
      damaged < 0 ||
      good + damaged !== received
    ) {
      setError(
        "Số lượng phải là số nguyên và hàng tốt + hàng hỏng = thực nhận.",
      );
      return;
    }

    setReceiving(true);
    setError("");
    setSuccess("");

    try {
      await api(
        `/shopee/inventory/returns/${encodeURIComponent(returnSn)}/receive`,
        {
          method: "POST",
          body: JSON.stringify({
            shopId: activeShopId,
            itemKey: itemKey.trim(),
            receivedQty: received,
            goodQty: good,
            damagedQty: damaged,
            requestId: `return-${returnSn}-${itemKey}-${Date.now()}`,
            note,
          }),
        },
      );

      setSuccess(
        "Đã gửi xác nhận nhận hàng hoàn. Chỉ số lượng hàng tốt được cộng tồn kho.",
      );

      setReturnForm({
        returnSn: "",
        itemKey: "",
        receivedQty: 0,
        goodQty: 0,
        damagedQty: 0,
        note: "",
      });

      if (activeTab === "history") loadTransactions(1);
    } catch (err) {
      setError(err.message || "Không thể xác nhận hàng hoàn.");
    } finally {
      setReceiving(false);
    }
  };

  const updateReturnQty = (field, value) => {
    setReturnForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const filteredTransactions = useMemo(() => {
    const keyword = transactionSearch.trim().toLowerCase();
    if (!keyword) return transactions;

    return transactions.filter((item) =>
      [
        item.orderSn,
        item.returnSn,
        item.idempotencyKey,
        item.kind,
        item.type,
        item.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [transactions, transactionSearch]);

  const renderShops = () => (
    <section className="shopee-panel">
      <div className="shopee-panel-heading">
        <div>
          <div className="shopee-heading-kicker">TÀI KHOẢN LIÊN KẾT</div>
          <h2>Gian hàng của bạn</h2>
          <p>Quản lý kết nối và quyền truy cập Shopee.</p>
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
          <p>Kết nối tài khoản Shopee để bắt đầu quản lý đơn hàng.</p>
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
                    {connected ? "Đang kết nối" : "Chưa xác định"}
                  </span>
                </div>

                <h3>{shop.shopName || `Shopee Shop ${id}`}</h3>
                <p className="shopee-shop-id">Shop ID: {id}</p>

                <div className="shopee-shop-meta">
                  <div>
                    <span>Ngày tạo</span>
                    <strong>{formatDate(shop.createdAt)}</strong>
                  </div>
                  <div>
                    <span>Cập nhật token</span>
                    <strong>{formatDate(shop.lastTokenUpdatedAt)}</strong>
                  </div>
                </div>

                <div className="shopee-shop-actions">
                  <button
                    className={`shopee-btn ${selected ? "shopee-btn-selected" : "shopee-btn-outline"}`}
                    onClick={() => setActiveShopId(id)}
                  >
                    <i className="fa-solid fa-crosshairs" />
                    {selected ? "Đang chọn" : "Chọn shop"}
                  </button>

                  <button
                    className="shopee-icon-btn"
                    title="Làm mới token"
                    onClick={() => refreshToken(id)}
                    disabled={refreshing === id}
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
  );

  const renderOrders = () => (
    <section className="shopee-panel">
      <div className="shopee-panel-heading">
        <div>
          <div className="shopee-heading-kicker">TRA CỨU TRỰC TIẾP</div>
          <h2>Đơn hàng Shopee</h2>
          <p>Lấy danh sách đơn theo thời gian và trạng thái.</p>
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
            onChange={(event) => setActiveShopId(event.target.value)}
          >
            <option value="">-- Chọn gian hàng --</option>
            {shops.map((shop) => (
              <option key={String(shop.shopId)} value={String(shop.shopId)}>
                {shop.shopName || `Shop ${shop.shopId}`}
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
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>

        <label className="shopee-field">
          <span>Đến ngày</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={localDateString(new Date())}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>

        <label className="shopee-field">
          <span>Lọc theo thời gian</span>
          <select
            value={timeRangeField}
            onChange={(event) => setTimeRangeField(event.target.value)}
          >
            <option value="create_time">Ngày tạo đơn</option>
            <option value="update_time">Ngày cập nhật</option>
          </select>
        </label>

        <label className="shopee-field">
          <span>Trạng thái đơn</span>
          <select
            value={orderStatus}
            onChange={(event) => setOrderStatus(event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="shopee-filter-submit">
          <button
            className="shopee-btn shopee-btn-orange"
            onClick={() => fetchOrders(activeShop)}
            disabled={orderLoading || !activeShop}
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
        Ngày được chuyển thành Unix timestamp trước khi gửi backend. Giới hạn
        khoảng tra cứu 15 ngày mỗi lần. Kết quả chưa được lưu vào MongoDB.
      </div>

      <div className="shopee-orders-toolbar">
        <div>
          <strong>
            {searchedShop
              ? `Kết quả: ${searchedShop.shopName || `Shop ${searchedShop.shopId}`}`
              : "Chưa có dữ liệu tra cứu"}
          </strong>
          <span>{orders.length} đơn đã tải</span>
        </div>

        <label className="shopee-order-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
            placeholder="Tìm mã đơn, khách hàng..."
          />
        </label>
      </div>

      {orderLoading && orders.length === 0 ? (
        <div className="shopee-loading">
          <i className="fa-solid fa-spinner fa-spin" />
          Đang lấy đơn hàng từ Shopee...
        </div>
      ) : !searchedShop ? (
        <div className="shopee-orders-empty">
          <div>
            <i className="fa-solid fa-box-open" />
          </div>
          <strong>Đơn hàng sẽ hiển thị tại đây</strong>
          <span>Chọn shop và khoảng ngày rồi nhấn “Lấy đơn hàng”.</span>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="shopee-orders-empty">
          <div>
            <i className="fa-solid fa-inbox" />
          </div>
          <strong>
            {orders.length ? "Không tìm thấy kết quả" : "Không có đơn hàng"}
          </strong>
          <span>Thử thay đổi khoảng ngày hoặc từ khóa tìm kiếm.</span>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order, index) => {
                const status = String(order.order_status || "").toUpperCase();
                const address = order.recipient_address || {};
                const customer =
                  order.buyer_username || address.name || "Khách Shopee";

                return (
                  <tr key={order.order_sn || index}>
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
                        {address.phone || "Chưa có số điện thoại"}
                      </span>
                    </td>
                    <td className="shopee-product-cell">
                      <strong>{getItemSummary(order)}</strong>
                      <span className="shopee-cell-sub">
                        {getOrderItems(order).length} dòng hàng
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
                        {formatMoney(order.total_amount, order.currency)}
                      </strong>
                    </td>
                    <td>
                      <button
                        className="shopee-icon-btn"
                        title="Xem chi tiết"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <i className="fa-solid fa-eye" />
                      </button>
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
            {orderLoading ? "Đang tải..." : "Tải thêm đơn hàng"}
          </button>
        </div>
      )}
    </section>
  );

  const renderMapping = () => (
    <section className="shopee-panel">
      <div className="shopee-panel-heading">
        <div>
          <div className="shopee-heading-kicker">LIÊN KẾT SẢN PHẨM</div>
          <h2>Ánh xạ SKU Shopee</h2>
          <p>
            Quy đổi SKU và số lượng Shopee sang biến thể trong kho Nhật Khang
            Bike.
          </p>
        </div>
        <span className="shopee-count">Chưa có API danh sách</span>
      </div>

      <div className="shopee-feature-empty">
        <div className="shopee-feature-icon">
          <i className="fa-solid fa-barcode" />
        </div>
        <h3>Phần ánh xạ SKU đang chờ API</h3>
        <p>
          Router hiện tại chưa khai báo API đọc, tạo, sửa và bật/tắt
          ShopeeSkuMapping. Tôi chưa bật nút lưu để tránh tạo mapping giả hoặc
          gửi request đến endpoint chưa tồn tại.
        </p>
        <div className="shopee-feature-steps">
          <div>
            <b>1</b>
            <span>Chọn shop Shopee</span>
          </div>
          <div>
            <b>2</b>
            <span>Chọn item và model SKU</span>
          </div>
          <div>
            <b>3</b>
            <span>Ghép sản phẩm, biến thể và hệ số quy đổi</span>
          </div>
        </div>
      </div>
    </section>
  );

  const renderReturns = () => (
    <>
      <section className="shopee-panel">
        <div className="shopee-panel-heading">
          <div>
            <div className="shopee-heading-kicker">KIỂM SOÁT HÀNG TRẢ</div>
            <h2>Nhận và kiểm tra hàng hoàn</h2>
            <p>
              Ghi nhận hàng thực tế nhận về, phân loại hàng tốt và hàng hỏng.
            </p>
          </div>
          <span className="shopee-readonly">
            <i className="fa-solid fa-shield-halved" /> Nhập kho có kiểm soát
          </span>
        </div>

        <div className="shopee-return-warning">
          <i className="fa-solid fa-triangle-exclamation" />
          <div>
            <strong>Chỉ xác nhận khi đã nhận hàng thực tế</strong>
            <p>
              Số lượng nhập ở đây là đơn vị tồn kho nội bộ. Hàng tốt mới được
              cộng tồn; hàng hỏng chỉ được ghi nhận, không cộng tồn.
            </p>
          </div>
        </div>

        <form className="shopee-return-form" onSubmit={submitReturnReceipt}>
          <label className="shopee-field">
            <span>Shop đang thao tác</span>
            <select
              value={activeShopId}
              onChange={(event) => setActiveShopId(event.target.value)}
              required
            >
              <option value="">-- Chọn shop --</option>
              {shops.map((shop) => (
                <option key={String(shop.shopId)} value={String(shop.shopId)}>
                  {shop.shopName || `Shop ${shop.shopId}`}
                </option>
              ))}
            </select>
          </label>

          <label className="shopee-field">
            <span>Mã yêu cầu hoàn (returnSn)</span>
            <input
              value={returnForm.returnSn}
              onChange={(event) =>
                updateReturnQty("returnSn", event.target.value)
              }
              placeholder="Nhập mã trả hàng Shopee"
              required
            />
          </label>

          <label className="shopee-field">
            <span>Item key</span>
            <input
              value={returnForm.itemKey}
              onChange={(event) =>
                updateReturnQty("itemKey", event.target.value)
              }
              placeholder="Ví dụ: 123456_0"
              required
            />
          </label>

          <label className="shopee-field">
            <span>Số lượng thực nhận</span>
            <input
              type="number"
              min="1"
              step="1"
              value={returnForm.receivedQty}
              onChange={(event) =>
                updateReturnQty("receivedQty", event.target.value)
              }
              required
            />
          </label>

          <label className="shopee-field">
            <span>Hàng tốt</span>
            <input
              type="number"
              min="0"
              step="1"
              value={returnForm.goodQty}
              onChange={(event) =>
                updateReturnQty("goodQty", event.target.value)
              }
              required
            />
          </label>

          <label className="shopee-field">
            <span>Hàng hỏng</span>
            <input
              type="number"
              min="0"
              step="1"
              value={returnForm.damagedQty}
              onChange={(event) =>
                updateReturnQty("damagedQty", event.target.value)
              }
              required
            />
          </label>

          <label className="shopee-field shopee-return-note">
            <span>Ghi chú kiểm hàng</span>
            <input
              value={returnForm.note}
              onChange={(event) => updateReturnQty("note", event.target.value)}
              placeholder="Tình trạng bao bì, lỗi sản phẩm..."
            />
          </label>

          <div className="shopee-return-summary">
            <span>
              Tổng phân loại:{" "}
              <strong>
                {(Number(returnForm.goodQty) || 0) +
                  (Number(returnForm.damagedQty) || 0)}
              </strong>
            </span>
            <span>
              Thực nhận: <strong>{Number(returnForm.receivedQty) || 0}</strong>
            </span>
          </div>

          <div className="shopee-return-submit">
            <button
              className="shopee-btn shopee-btn-orange"
              type="submit"
              disabled={receiving}
            >
              <i
                className={`fa-solid ${receiving ? "fa-spinner fa-spin" : "fa-box-open"}`}
              />
              {receiving ? "Đang xác nhận..." : "Xác nhận nhận hàng"}
            </button>
          </div>
        </form>
      </section>

      <section className="shopee-panel">
        <div className="shopee-panel-heading">
          <div>
            <h2>Danh sách yêu cầu trả hàng</h2>
            <p>
              Chưa có endpoint lấy danh sách ShopeeReturn trong router hiện tại.
            </p>
          </div>
        </div>
        <div className="shopee-feature-empty compact">
          <div className="shopee-feature-icon">
            <i className="fa-solid fa-rotate-left" />
          </div>
          <strong>Chưa thể tải danh sách hàng hoàn</strong>
          <p>
            Form xác nhận ở trên đã kết nối endpoint receive hiện có. Để chọn
            hàng từ danh sách thay vì nhập mã thủ công, cần bổ sung API GET danh
            sách trả hàng.
          </p>
        </div>
      </section>
    </>
  );

  const renderHistory = () => (
    <section className="shopee-panel">
      <div className="shopee-panel-heading">
        <div>
          <div className="shopee-heading-kicker">THEO DÕI BIẾN ĐỘNG KHO</div>
          <h2>Lịch sử giao dịch kho Shopee</h2>
          <p>Các giao dịch xuất kho đơn hàng và nhập hàng hoàn đã ghi nhận.</p>
        </div>
        <button
          className="shopee-btn shopee-btn-outline"
          onClick={() => loadTransactions(1)}
          disabled={transactionLoading}
        >
          <i
            className={`fa-solid ${transactionLoading ? "fa-spinner fa-spin" : "fa-rotate"}`}
          />
          Làm mới
        </button>
      </div>

      <div className="shopee-history-toolbar">
        <label className="shopee-field">
          <span>Gian hàng</span>
          <select
            value={activeShopId}
            onChange={(event) => setActiveShopId(event.target.value)}
          >
            <option value="">-- Chọn shop --</option>
            {shops.map((shop) => (
              <option key={String(shop.shopId)} value={String(shop.shopId)}>
                {shop.shopName || `Shop ${shop.shopId}`}
              </option>
            ))}
          </select>
        </label>

        <label className="shopee-order-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            value={transactionSearch}
            onChange={(event) => setTransactionSearch(event.target.value)}
            placeholder="Tìm mã đơn, mã hoàn..."
          />
        </label>
      </div>

      {transactionLoading ? (
        <div className="shopee-loading">
          <i className="fa-solid fa-spinner fa-spin" /> Đang tải lịch sử...
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="shopee-orders-empty">
          <div>
            <i className="fa-solid fa-clock-rotate-left" />
          </div>
          <strong>Chưa có giao dịch để hiển thị</strong>
          <span>Chọn shop hoặc thử làm mới danh sách giao dịch.</span>
        </div>
      ) : (
        <div className="shopee-table-wrap">
          <table className="shopee-orders-table shopee-history-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Loại giao dịch</th>
                <th>Mã tham chiếu</th>
                <th>Idempotency key</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((item, index) => (
                <tr key={item._id || item.id || index}>
                  <td>
                    <strong>
                      {formatDate(item.createdAt || item.created_at)}
                    </strong>
                  </td>
                  <td>
                    <strong>{item.kind || item.type || "—"}</strong>
                  </td>
                  <td>
                    <strong>{item.orderSn || item.returnSn || "—"}</strong>
                  </td>
                  <td>
                    <span className="shopee-cell-sub">
                      {item.idempotencyKey || "—"}
                    </span>
                  </td>
                  <td>
                    <span className="shopee-order-status success">
                      {item.status || "Đã ghi nhận"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="shopee-history-footer">
        <span>{transactionTotal} giao dịch</span>
        <span>Trang {transactionPage}</span>
      </div>
    </section>
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
            Quản lý gian hàng, đơn hàng và luồng tồn kho Shopee tại Nhật Khang
            Bike.
          </p>
        </div>

        <div className="shopee-hero-actions">
          <button
            className="shopee-btn shopee-btn-light"
            onClick={loadShops}
            disabled={loading}
          >
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
            Làm mới
          </button>
          <button
            className="shopee-btn shopee-btn-orange"
            onClick={connectShopee}
            disabled={connecting}
          >
            <i
              className={`fa-solid ${connecting ? "fa-spinner fa-spin" : "fa-plus"}`}
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
            <small>Tài khoản đã lưu</small>
          </div>
        </article>
        <article className="shopee-overview-card">
          <div className="shopee-overview-icon green">
            <i className="fa-solid fa-link" />
          </div>
          <div>
            <span>Đang kết nối</span>
            <strong>{connectedShops.length}</strong>
            <small>Shop có trạng thái kết nối</small>
          </div>
        </article>
        <article className="shopee-overview-card">
          <div className="shopee-overview-icon blue">
            <i className="fa-solid fa-receipt" />
          </div>
          <div>
            <span>Đơn đang xem</span>
            <strong>{orders.length}</strong>
            <small>Kết quả tra cứu hiện tại</small>
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
            <small>Chỉ tính đơn đã tải</small>
          </div>
        </article>
      </section>

      <nav className="shopee-tabs" aria-label="Quản lý Shopee">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`shopee-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab.id);
              setError("");
              setSuccess("");
            }}
          >
            <i className={`fa-solid ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "shops" && renderShops()}
      {activeTab === "orders" && renderOrders()}
      {activeTab === "mapping" && renderMapping()}
      {activeTab === "returns" && renderReturns()}
      {activeTab === "history" && renderHistory()}

      <aside className="shopee-safety-note">
        <div className="shopee-safety-icon">
          <i className="fa-solid fa-shield-halved" />
        </div>
        <div>
          <strong>Quy tắc tồn kho Nhật Khang Bike</strong>
          <p>
            Tra cứu đơn Shopee không tự lưu đơn và không trừ kho. Chỉ thao tác
            xuất kho đã xác nhận mới được phép trừ tồn FIFO. Hàng hoàn chỉ cộng
            tồn khi đã nhận và kiểm tra thực tế; chỉ số lượng hàng tốt được nhập
            lại.
          </p>
        </div>
      </aside>

      {selectedOrder && (
        <div
          className="shopee-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <section
            className="shopee-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết đơn hàng Shopee"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shopee-modal-heading">
              <div>
                <span className="shopee-heading-kicker">CHI TIẾT ĐƠN HÀNG</span>
                <h2>{selectedOrder.order_sn}</h2>
              </div>
              <button
                className="shopee-icon-btn"
                onClick={() => setSelectedOrder(null)}
                aria-label="Đóng"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="shopee-modal-info">
              <div>
                <span>Trạng thái</span>
                <strong>
                  {STATUS_LABELS[selectedOrder.order_status] ||
                    selectedOrder.order_status ||
                    "—"}
                </strong>
              </div>
              <div>
                <span>Ngày tạo</span>
                <strong>{formatDate(selectedOrder.create_time, true)}</strong>
              </div>
              <div>
                <span>Khách hàng</span>
                <strong>
                  {selectedOrder.buyer_username ||
                    selectedOrder.recipient_address?.name ||
                    "—"}
                </strong>
              </div>
              <div>
                <span>Tổng tiền</span>
                <strong>
                  {formatMoney(
                    selectedOrder.total_amount,
                    selectedOrder.currency,
                  )}
                </strong>
              </div>
            </div>

            <h3>Sản phẩm trong đơn</h3>
            <div className="shopee-modal-items">
              {getOrderItems(selectedOrder).map((item, index) => (
                <div
                  className="shopee-modal-item"
                  key={`${item.item_id || index}-${item.model_id || 0}`}
                >
                  <div>
                    <strong>{item.item_name || "Sản phẩm Shopee"}</strong>
                    <span>
                      {item.model_name ||
                        item.model_sku ||
                        item.item_sku ||
                        "Không có phân loại"}
                    </span>
                  </div>
                  <b>
                    × {item.model_quantity || item.quantity || item.amount || 1}
                  </b>
                </div>
              ))}
            </div>

            <div className="shopee-modal-warning">
              Đơn này đang được xem trực tiếp từ Shopee, chưa được lưu vào
              ShopeeOrder. Vì vậy chưa thể xuất kho từ cửa sổ này.
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
