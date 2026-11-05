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
  if (Array.isArray(data?.data?.shops)) return data.data.shops;
  return [];
};

const getMappingList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.mappings)) return data.mappings;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.mappings)) return data.data.mappings;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
};
const getInternalProductList = (result) => {
  const payload = result?.data || result;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(result?.products)) return result.products;

  return [];
};

const getInternalProductId = (product) =>
  String(product?._id || product?.id || "");

const getInternalProductName = (product) =>
  product?.title || product?.name || product?.productName || "Sản phẩm";

const getInternalVariants = (product) =>
  Array.isArray(product?.variants) ? product.variants : [];

const getInternalVariantCode = (variant) =>
  String(variant?.variantCode || "").trim();

const getInternalVariantName = (variant) =>
  variant?.name || variant?.variantName || variant?.title || "Biến thể";
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

const SHOPEE_PRODUCT_STATUSES = [
  { value: "NORMAL", label: "Đang bán" },
  { value: "UNLIST", label: "Đã ẩn" },
  { value: "BANNED", label: "Bị cấm" },
  { value: "REVIEWING", label: "Đang xét duyệt" },
  { value: "SELLER_DELETE", label: "Người bán đã xóa" },
  { value: "SHOPEE_DELETE", label: "Shopee đã xóa" },
];

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
  { id: "products", label: "Sản phẩm", icon: "fa-boxes-stacked" },
  { id: "orders", label: "Đơn hàng", icon: "fa-receipt" },
  { id: "mapping", label: "Ánh xạ SKU", icon: "fa-barcode" },
  { id: "returns", label: "Hàng hoàn", icon: "fa-rotate-left" },
  { id: "history", label: "Lịch sử kho", icon: "fa-clock-rotate-left" },
];

const EMPTY_MAPPING_FORM = {
  shopId: "",
  itemId: "",
  modelId: "0",
  itemSku: "",
  variationSku: "",
  itemName: "",
  modelName: "",
  productId: "",
  variantCode: "",
  variantName: "",
  quantityMultiplier: 1,
  note: "",
};

const PRODUCT_STATUS_LABEL = (status) =>
  SHOPEE_PRODUCT_STATUSES.find((item) => item.value === status)?.label ||
  status ||
  "Không rõ";

const getProductImage = (product) =>
  product?.image || product?.images?.[0] || product?.image?.image_url || "";

const getProductModels = (product) =>
  Array.isArray(product?.models) ? product.models : [];

const formatProductPrice = (min, max) => {
  const minimum = Number(min || 0);
  const maximum = Number(max || 0);

  if (!minimum && !maximum) return "Chưa có giá";
  if (!maximum || minimum === maximum) return formatMoney(minimum, "VND");

  return `${formatMoney(minimum, "VND")} – ${formatMoney(maximum, "VND")}`;
};

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

  // SKU mapping
  const [skuMappings, setSkuMappings] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingSaving, setMappingSaving] = useState(false);
  const [mappingDisabling, setMappingDisabling] = useState("");
  const [mappingSearch, setMappingSearch] = useState("");
  const [mappingShopFilter, setMappingShopFilter] = useState("all");
  const [mappingStatusFilter, setMappingStatusFilter] = useState("all");
  const [mappingForm, setMappingForm] = useState(EMPTY_MAPPING_FORM);
  const [editingMappingId, setEditingMappingId] = useState("");
  const [mappingShopeeProducts, setMappingShopeeProducts] = useState([]);
  const [mappingInternalProducts, setMappingInternalProducts] = useState([]);

  const [mappingCatalogLoading, setMappingCatalogLoading] = useState(false);

  const [mappingShopeeKeyword, setMappingShopeeKeyword] = useState("");
  const [mappingInternalKeyword, setMappingInternalKeyword] = useState("");
  // Shopee product catalog
  const [shopeeProducts, setShopeeProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productSyncing, setProductSyncing] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [syncItemStatus, setSyncItemStatus] = useState("NORMAL");
  const [productPage, setProductPage] = useState(1);
  const [productPagination, setProductPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [productSyncProgress, setProductSyncProgress] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

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
        setShopeeProducts([]);
      }

      await loadShops();
    } catch (err) {
      setError(err.message || "Không thể ngắt kết nối shop.");
    } finally {
      setDisconnecting("");
    }
  };

  // =====================================================
  // SHOPEE PRODUCTS
  // =====================================================

  const loadShopeeProducts = async (page = 1) => {
    if (!activeShopId) {
      setShopeeProducts([]);
      setProductPagination({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
      return;
    }

    setProductLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        shopId: String(activeShopId),
        page: String(page),
        limit: "20",
        keyword: productKeyword.trim(),
        status: productStatus,
      });

      const result = await api(`/shopee/products?${params.toString()}`);
      const payload = result.data || result;

      const rows = Array.isArray(payload.products)
        ? payload.products
        : Array.isArray(result.products)
          ? result.products
          : Array.isArray(result.data)
            ? result.data
            : [];

      setShopeeProducts(rows);
      setProductPagination(
        payload.pagination ||
          result.pagination || {
            page,
            limit: 20,
            total: rows.length,
            totalPages: 1,
          },
      );
      setProductPage(page);
    } catch (err) {
      setError(`Không tải được sản phẩm Shopee: ${err.message}`);
      setShopeeProducts([]);
    } finally {
      setProductLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "products" && activeShopId) {
      loadShopeeProducts(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeShopId, productKeyword, productStatus]);

  const syncShopeeProducts = async (continueSync = false) => {
    if (!activeShopId) {
      setError("Vui lòng chọn gian hàng Shopee.");
      return;
    }

    if (activeShop && activeShop.status !== "connected") {
      setError("Gian hàng này chưa kết nối. Vui lòng kết nối lại trước.");
      return;
    }

    const canContinue =
      continueSync &&
      productSyncProgress?.hasMore &&
      String(productSyncProgress.shopId) === String(activeShopId) &&
      productSyncProgress.itemStatus === syncItemStatus;

    const offset = canContinue
      ? Number(productSyncProgress.nextOffset || 0)
      : 0;

    setProductSyncing(true);
    setError("");
    setSuccess("");

    try {
      const result = await api("/shopee/products/sync", {
        method: "POST",
        body: JSON.stringify({
          shopId: String(activeShopId),
          offset,
          pageSize: 100,
          maxPages: 10,
          itemStatus: syncItemStatus,
        }),
      });

      const data = result.data || result;

      setProductSyncProgress({
        shopId: String(activeShopId),
        itemStatus: syncItemStatus,
        syncedCount: Number(data.syncedCount || 0),
        failedCount: Number(data.failedCount || 0),
        totalCount: Number(data.totalCount || 0),
        nextOffset: Number(data.nextOffset || 0),
        hasMore: Boolean(data.hasMore),
        errors: Array.isArray(data.errors) ? data.errors : [],
      });

      await loadShopeeProducts(1);

      setSuccess(
        `Đồng bộ lượt này hoàn tất: ${Number(data.syncedCount || 0)} sản phẩm thành công, ${Number(data.failedCount || 0)} lỗi.`,
      );
    } catch (err) {
      setError(`Đồng bộ sản phẩm thất bại: ${err.message}`);
    } finally {
      setProductSyncing(false);
    }
  };

  const renderProducts = () => {
    const syncMatchesCurrent =
      productSyncProgress &&
      String(productSyncProgress.shopId) === String(activeShopId) &&
      productSyncProgress.itemStatus === syncItemStatus;

    const canContinue = syncMatchesCurrent && productSyncProgress.hasMore;

    return (
      <section className="shopee-panel">
        <div className="shopee-panel-heading">
          <div>
            <div className="shopee-heading-kicker">SHOPEE PRODUCT CATALOG</div>
            <h2>Danh sách sản phẩm Shopee</h2>
            <p>
              Đồng bộ và theo dõi thông tin sản phẩm trên gian hàng. Dữ liệu
              được lưu riêng, không thay đổi sản phẩm hoặc tồn kho nội bộ.
            </p>
          </div>

          <span className="shopee-count">
            {Number(productPagination.total || 0).toLocaleString("vi-VN")} sản
            phẩm
          </span>
        </div>

        <div className="shopee-filter-grid">
          <label className="shopee-field shop-field">
            <span>Gian hàng</span>
            <select
              value={activeShopId}
              onChange={(event) => {
                setActiveShopId(event.target.value);
                setProductSyncProgress(null);
                setExpandedProduct("");
              }}
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
            <span>Trạng thái cần đồng bộ</span>
            <select
              value={syncItemStatus}
              onChange={(event) => {
                setSyncItemStatus(event.target.value);
                setProductSyncProgress(null);
              }}
            >
              {SHOPEE_PRODUCT_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="shopee-filter-submit">
            <button
              type="button"
              className="shopee-btn shopee-btn-orange"
              onClick={() => syncShopeeProducts(false)}
              disabled={productSyncing || productLoading || !activeShopId}
            >
              <i
                className={`fa-solid ${productSyncing ? "fa-spinner fa-spin" : "fa-cloud-arrow-down"}`}
              />
              {productSyncing ? "Đang đồng bộ..." : "Đồng bộ sản phẩm"}
            </button>
          </div>
        </div>

        {productSyncProgress &&
          String(productSyncProgress.shopId) === String(activeShopId) && (
            <div
              style={{
                margin: "18px 0",
                padding: "16px 18px",
                border: "1px solid #fed7aa",
                borderRadius: 12,
                background: "#fffaf5",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <strong style={{ color: "#9a3412" }}>
                    Kết quả đồng bộ gần nhất
                  </strong>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      marginTop: 5,
                    }}
                  >
                    Trạng thái:{" "}
                    {PRODUCT_STATUS_LABEL(productSyncProgress.itemStatus)}
                  </div>
                </div>

                {canContinue && (
                  <button
                    type="button"
                    className="shopee-btn shopee-btn-orange"
                    onClick={() => syncShopeeProducts(true)}
                    disabled={productSyncing}
                  >
                    <i
                      className={`fa-solid ${productSyncing ? "fa-spinner fa-spin" : "fa-forward"}`}
                    />
                    {productSyncing ? "Đang đồng bộ..." : "Đồng bộ tiếp"}
                  </button>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <div>
                  <small style={{ color: "#64748b" }}>
                    Đã đồng bộ lượt này
                  </small>
                  <strong style={{ display: "block", fontSize: 22 }}>
                    {productSyncProgress.syncedCount}
                  </strong>
                </div>
                <div>
                  <small style={{ color: "#64748b" }}>Lỗi</small>
                  <strong
                    style={{
                      display: "block",
                      fontSize: 22,
                      color: productSyncProgress.failedCount ? "#dc2626" : "",
                    }}
                  >
                    {productSyncProgress.failedCount}
                  </strong>
                </div>
                <div>
                  <small style={{ color: "#64748b" }}>
                    Tổng sản phẩm Shopee
                  </small>
                  <strong style={{ display: "block", fontSize: 22 }}>
                    {productSyncProgress.totalCount}
                  </strong>
                </div>
                <div>
                  <small style={{ color: "#64748b" }}>Offset tiếp theo</small>
                  <strong style={{ display: "block", fontSize: 22 }}>
                    {productSyncProgress.nextOffset}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: canContinue ? "#b45309" : "#15803d",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {canContinue
                  ? "Shopee còn sản phẩm. Nhấn “Đồng bộ tiếp” để tải phần tiếp theo."
                  : "Đã hoàn tất phạm vi đồng bộ hiện tại."}
              </div>

              {productSyncProgress.errors?.length > 0 && (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: "pointer", color: "#b91c1c" }}>
                    Xem lỗi đồng bộ ({productSyncProgress.errors.length})
                  </summary>
                  <div style={{ marginTop: 10, overflowX: "auto" }}>
                    {productSyncProgress.errors.map((item, index) => (
                      <div
                        key={`${item.itemId}-${index}`}
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px solid #fee2e2",
                          fontSize: 13,
                        }}
                      >
                        <strong>
                          {item.itemName || item.itemId || "Sản phẩm"}
                        </strong>
                        <div style={{ color: "#b91c1c" }}>{item.message}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

        <div className="shopee-orders-toolbar">
          <div>
            <strong>Kho sản phẩm Shopee</strong>
            <span>
              {productPagination.total || 0} sản phẩm · Trang {productPage}/
              {Math.max(productPagination.totalPages || 1, 1)}
            </span>
          </div>

          <label className="shopee-order-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setProductKeyword(productSearch.trim());
                }
              }}
              placeholder="Tìm tên, SKU hoặc Item ID..."
            />
            <button
              type="button"
              onClick={() => setProductKeyword(productSearch.trim())}
              title="Tìm kiếm"
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                color: "#ea580c",
              }}
            >
              <i className="fa-solid fa-arrow-right" />
            </button>
          </label>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <label className="shopee-field" style={{ minWidth: 190 }}>
            <span>Lọc trạng thái sản phẩm</span>
            <select
              value={productStatus}
              onChange={(event) => setProductStatus(event.target.value)}
            >
              <option value="">Tất cả trạng thái đã lưu</option>
              {SHOPEE_PRODUCT_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="shopee-btn shopee-btn-outline"
            onClick={() => {
              setProductSearch("");
              setProductKeyword("");
              setProductStatus("");
            }}
          >
            <i className="fa-solid fa-filter-circle-xmark" />
            Xóa bộ lọc
          </button>

          <button
            type="button"
            className="shopee-btn shopee-btn-outline"
            onClick={() => loadShopeeProducts(productPage)}
            disabled={productLoading}
          >
            <i
              className={`fa-solid ${productLoading ? "fa-spinner fa-spin" : "fa-rotate"}`}
            />
            Làm mới danh sách
          </button>
        </div>

        {productLoading ? (
          <div className="shopee-loading">
            <i className="fa-solid fa-spinner fa-spin" />
            Đang tải sản phẩm Shopee...
          </div>
        ) : shopeeProducts.length === 0 ? (
          <div className="shopee-orders-empty">
            <div>
              <i className="fa-solid fa-box-open" />
            </div>
            <strong>Chưa có sản phẩm Shopee</strong>
            <span>
              Chọn gian hàng và nhấn “Đồng bộ sản phẩm” để tải dữ liệu từ
              Shopee.
            </span>
          </div>
        ) : (
          <div className="shopee-table-wrap">
            <table className="shopee-orders-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>SKU / Item ID</th>
                  <th>Giá bán</th>
                  <th>Tồn Shopee</th>
                  <th>Phân loại</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shopeeProducts.map((product) => {
                  const id = String(product._id || product.itemId);
                  const models = getProductModels(product);
                  const image = getProductImage(product);

                  return (
                    <React.Fragment key={id}>
                      <tr>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 11,
                              minWidth: 230,
                            }}
                          >
                            {image ? (
                              <img
                                src={image}
                                alt={product.itemName || "Sản phẩm Shopee"}
                                loading="lazy"
                                style={{
                                  width: 54,
                                  height: 54,
                                  objectFit: "cover",
                                  borderRadius: 9,
                                  border: "1px solid #e2e8f0",
                                  background: "#f8fafc",
                                  flexShrink: 0,
                                }}
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 54,
                                  height: 54,
                                  display: "grid",
                                  placeItems: "center",
                                  borderRadius: 9,
                                  background: "#f1f5f9",
                                  color: "#94a3b8",
                                  flexShrink: 0,
                                }}
                              >
                                <i className="fa-solid fa-image" />
                              </div>
                            )}
                            <div>
                              <strong>
                                {product.itemName || "Sản phẩm Shopee"}
                              </strong>
                              <span className="shopee-cell-sub">
                                Danh mục: {product.categoryId || "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{product.itemSku || "Chưa có SKU"}</strong>
                          <span className="shopee-cell-sub">
                            ID: {product.itemId || "—"}
                          </span>
                        </td>
                        <td>
                          <strong className="shopee-order-total">
                            {formatProductPrice(
                              product.price,
                              product.maxPrice,
                            )}
                          </strong>
                        </td>
                        <td>
                          <strong>
                            {Number(product.stock || 0).toLocaleString("vi-VN")}
                          </strong>
                          <span className="shopee-cell-sub">
                            Đơn vị có thể bán
                          </span>
                        </td>
                        <td>
                          <strong>{models.length}</strong>
                          <span className="shopee-cell-sub">
                            {models.length ? "Phân loại" : "Sản phẩm đơn"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`shopee-order-status ${
                              product.itemStatus === "NORMAL"
                                ? "success"
                                : product.itemStatus === "BANNED" ||
                                    product.itemStatus === "SHOPEE_DELETE"
                                  ? "danger"
                                  : "neutral"
                            }`}
                          >
                            {PRODUCT_STATUS_LABEL(product.itemStatus)}
                          </span>
                        </td>
                        <td>
                          <span className="shopee-cell-sub">
                            {formatDate(product.lastSyncedAt)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="shopee-icon-btn"
                            title="Xem chi tiết sản phẩm"
                            onClick={() => setSelectedProduct(product)}
                          >
                            <i className="fa-solid fa-eye" />
                          </button>
                          {models.length > 0 && (
                            <button
                              type="button"
                              className="shopee-icon-btn"
                              title="Hiện/ẩn phân loại"
                              onClick={() =>
                                setExpandedProduct((current) =>
                                  current === id ? "" : id,
                                )
                              }
                            >
                              <i
                                className={`fa-solid ${expandedProduct === id ? "fa-chevron-up" : "fa-chevron-down"}`}
                              />
                            </button>
                          )}
                        </td>
                      </tr>

                      {expandedProduct === id && models.length > 0 && (
                        <tr>
                          <td colSpan="8">
                            <div
                              style={{
                                padding: 12,
                                background: "#f8fafc",
                                borderRadius: 10,
                              }}
                            >
                              <strong
                                style={{ display: "block", marginBottom: 10 }}
                              >
                                Danh sách phân loại
                              </strong>
                              <div className="shopee-table-wrap">
                                <table className="shopee-orders-table">
                                  <thead>
                                    <tr>
                                      <th>Phân loại</th>
                                      <th>Model ID</th>
                                      <th>SKU</th>
                                      <th>Giá</th>
                                      <th>Tồn khả dụng</th>
                                      <th>Đang giữ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {models.map((model, index) => (
                                      <tr key={model.modelId || index}>
                                        <td>
                                          <strong>
                                            {model.modelName || "Mặc định"}
                                          </strong>
                                        </td>
                                        <td>{model.modelId || "0"}</td>
                                        <td>{model.modelSku || "—"}</td>
                                        <td>
                                          {formatMoney(model.price, "VND")}
                                        </td>
                                        <td>
                                          {Number(
                                            model.stock || 0,
                                          ).toLocaleString("vi-VN")}
                                        </td>
                                        <td>
                                          {Number(
                                            model.reservedStock || 0,
                                          ).toLocaleString("vi-VN")}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {productPagination.totalPages > 1 && (
          <div
            className="shopee-load-more"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>
              Trang {productPage} / {productPagination.totalPages} ·{" "}
              {productPagination.total} sản phẩm
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="shopee-btn shopee-btn-outline"
                disabled={productLoading || productPage <= 1}
                onClick={() => loadShopeeProducts(productPage - 1)}
              >
                <i className="fa-solid fa-chevron-left" /> Trước
              </button>
              <button
                type="button"
                className="shopee-btn shopee-btn-outline"
                disabled={
                  productLoading || productPage >= productPagination.totalPages
                }
                onClick={() => loadShopeeProducts(productPage + 1)}
              >
                Sau <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </section>
    );
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

  // =====================================================
  // SKU MAPPING
  // =====================================================
  // =====================================================
  // LOAD CATALOG FOR SKU MAPPING
  // =====================================================

  const loadMappingCatalogs = async (shopId) => {
    if (!shopId) {
      setMappingShopeeProducts([]);
      return;
    }

    setMappingCatalogLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        shopId: String(shopId),
        page: "1",
        limit: "100",
      });

      const [shopeeResult, internalResult] = await Promise.all([
        api(`/shopee/products?${params.toString()}`),
        api("/products?limit=1000"),
      ]);

      const shopeePayload = shopeeResult?.data || shopeeResult;

      const shopeeRows = Array.isArray(shopeePayload?.products)
        ? shopeePayload.products
        : Array.isArray(shopeeResult?.products)
          ? shopeeResult.products
          : Array.isArray(shopeeResult?.data)
            ? shopeeResult.data
            : [];

      const internalRows = getInternalProductList(internalResult);

      setMappingShopeeProducts(shopeeRows);
      setMappingInternalProducts(internalRows);
    } catch (err) {
      setError(`Không tải được danh mục để ánh xạ SKU: ${err.message}`);
    } finally {
      setMappingCatalogLoading(false);
    }
  };
  const loadSkuMappings = async () => {
    // Chưa chọn shop thì không gọi API

    setMappingLoading(true);

    try {
      const result = await api(
        `/shopee/management/sku-mappings?shopId=${encodeURIComponent(shops[0].shopId)}`,
      );

      setSkuMappings(getMappingList(result));
    } catch (err) {
      console.error("Lỗi tải ánh xạ SKU:", err);
      setSkuMappings([]);
      setError(`Không tải được ánh xạ SKU: ${err.message}`);
    } finally {
      setMappingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "mapping") {
      loadSkuMappings();

      if (mappingForm.shopId) {
        loadMappingCatalogs(mappingForm.shopId);
      } else if (activeShopId) {
        loadMappingCatalogs(activeShopId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const updateMappingForm = (field, value) => {
    setMappingForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetMappingForm = () => {
    setMappingForm(EMPTY_MAPPING_FORM);
    setEditingMappingId("");
  };

  const editSkuMapping = (item) => {
    setEditingMappingId(String(item._id || item.id || ""));

    setMappingForm({
      shopId: String(item.shopId || ""),
      itemId: String(item.itemId || ""),
      modelId: String(item.modelId || "0"),
      itemSku: item.itemSku || "",
      variationSku: item.variationSku || "",
      itemName: item.itemName || "",
      modelName: item.modelName || "",
      productId: String(item.productId?._id || item.productId || ""),
      variantCode: item.variantCode || "",
      variantName: item.variantName || "",
      quantityMultiplier: Number(item.quantityMultiplier || 1),
      note: item.note || "",
    });

    document
      .getElementById("shopee-sku-mapping-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveSkuMapping = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const form = mappingForm;

    if (
      !form.shopId ||
      !form.itemId.trim() ||
      !form.productId.trim() ||
      !form.variantCode.trim() ||
      !form.variantName.trim()
    ) {
      setError(
        "Vui lòng nhập đầy đủ Shop, Item ID, Product ID, mã và tên biến thể.",
      );
      return;
    }

    const multiplier = Number(form.quantityMultiplier);

    if (!Number.isInteger(multiplier) || multiplier < 1) {
      setError("Số lượng quy đổi phải là số nguyên lớn hơn hoặc bằng 1.");
      return;
    }

    const payload = {
      shopId: String(form.shopId).trim(),
      itemId: String(form.itemId).trim(),
      modelId: String(form.modelId || "0").trim(),
      itemSku: form.itemSku.trim(),
      variationSku: form.variationSku.trim(),
      itemName: form.itemName.trim(),
      modelName: form.modelName.trim(),
      productId: form.productId.trim(),
      variantCode: form.variantCode.trim(),
      variantName: form.variantName.trim(),
      quantityMultiplier: multiplier,
      note: form.note.trim(),
    };

    setMappingSaving(true);

    try {
      await api("/shopee/management/sku-mappings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(
        editingMappingId
          ? "Đã gửi yêu cầu lưu lại ánh xạ SKU."
          : "Đã tạo ánh xạ SKU thành công.",
      );

      resetMappingForm();
      await loadSkuMappings();
    } catch (err) {
      setError(err.message || "Không thể lưu ánh xạ SKU.");
    } finally {
      setMappingSaving(false);
    }
  };

  const disableSkuMapping = async (item) => {
    const id = item._id || item.id;

    if (!id) {
      setError("Không tìm thấy ID của ánh xạ SKU.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn vô hiệu hóa ánh xạ "${
        item.modelName || item.itemName || item.itemId
      }"?`,
    );

    if (!confirmed) return;

    setMappingDisabling(String(id));
    setError("");
    setSuccess("");

    try {
      await api(`/shopee/sku-mappings/${encodeURIComponent(id)}/disable`, {
        method: "PATCH",
      });

      setSuccess("Đã vô hiệu hóa ánh xạ SKU.");
      await loadSkuMappings();
    } catch (err) {
      setError(err.message || "Không thể vô hiệu hóa ánh xạ SKU.");
    } finally {
      setMappingDisabling("");
    }
  };

  const filteredMappings = useMemo(() => {
    const keyword = mappingSearch.trim().toLowerCase();

    return skuMappings.filter((item) => {
      const haystack = [
        item.itemName,
        item.modelName,
        item.itemSku,
        item.variationSku,
        item.variantCode,
        item.variantName,
        item.itemId,
        item.modelId,
        item.productId?._id || item.productId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchKeyword = !keyword || haystack.includes(keyword);
      const matchShop =
        mappingShopFilter === "all" ||
        String(item.shopId) === String(mappingShopFilter);

      const active = item.isActive !== false;
      const matchStatus =
        mappingStatusFilter === "all" ||
        (mappingStatusFilter === "active" && active) ||
        (mappingStatusFilter === "disabled" && !active);

      return matchKeyword && matchShop && matchStatus;
    });
  }, [skuMappings, mappingSearch, mappingShopFilter, mappingStatusFilter]);

  const activeMappingCount = skuMappings.filter(
    (item) => item.isActive !== false,
  ).length;

  const disabledMappingCount = skuMappings.length - activeMappingCount;

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

  // =====================================================
  // SKU MAPPING UI
  // =====================================================

  const renderMapping = () => {
    const selectedShopeeProduct = mappingShopeeProducts.find(
      (product) => String(product.itemId) === String(mappingForm.itemId),
    );

    const selectedShopeeModel = getProductModels(selectedShopeeProduct).find(
      (model) =>
        String(model.modelId || "0") === String(mappingForm.modelId || "0"),
    );

    const selectedInternalProduct = mappingInternalProducts.find(
      (product) =>
        getInternalProductId(product) === String(mappingForm.productId),
    );

    const internalVariants = getInternalVariants(selectedInternalProduct);

    const selectedInternalVariant = internalVariants.find(
      (variant) =>
        getInternalVariantCode(variant) === String(mappingForm.variantCode),
    );

    const filteredShopeeProducts = mappingShopeeProducts.filter((product) => {
      const keyword = mappingShopeeKeyword.trim().toLowerCase();

      if (!keyword) return true;

      return [
        product.itemName,
        product.itemSku,
        product.itemId,
        ...getProductModels(product).map((model) => model.modelName),
        ...getProductModels(product).map((model) => model.modelSku),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });

    const filteredInternalProducts = mappingInternalProducts.filter(
      (product) => {
        const keyword = mappingInternalKeyword.trim().toLowerCase();

        if (!keyword) return true;

        return [
          getInternalProductName(product),
          product.code,
          product.brand,
          ...getInternalVariants(product).map((variant) => variant.name),
          ...getInternalVariants(product).map((variant) => variant.variantCode),
          ...getInternalVariants(product).map((variant) => variant.sku),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      },
    );

    const handleShopeeProductChange = (itemId) => {
      const product = mappingShopeeProducts.find(
        (item) => String(item.itemId) === String(itemId),
      );

      if (!product) {
        setMappingForm((previous) => ({
          ...previous,
          itemId: "",
          modelId: "0",
          itemSku: "",
          variationSku: "",
          itemName: "",
          modelName: "",
        }));
        return;
      }

      const models = getProductModels(product);
      const firstModel = models[0];

      setMappingForm((previous) => ({
        ...previous,
        itemId: String(product.itemId),
        modelId: String(firstModel?.modelId || "0"),
        itemSku: product.itemSku || "",
        variationSku: firstModel?.modelSku || "",
        itemName: product.itemName || "",
        modelName: firstModel?.modelName || "",
      }));
    };

    const handleShopeeModelChange = (modelId) => {
      const product = selectedShopeeProduct;

      if (!product) return;

      const model = getProductModels(product).find(
        (item) => String(item.modelId || "0") === String(modelId),
      );

      setMappingForm((previous) => ({
        ...previous,
        modelId: String(modelId || "0"),
        variationSku: model?.modelSku || "",
        modelName: model?.modelName || "",
      }));
    };

    const handleInternalProductChange = (productId) => {
      const product = mappingInternalProducts.find(
        (item) => getInternalProductId(item) === String(productId),
      );

      if (!product) {
        setMappingForm((previous) => ({
          ...previous,
          productId: "",
          variantCode: "",
          variantName: "",
        }));
        return;
      }

      const variants = getInternalVariants(product);

      // Tự chọn biến thể đầu tiên có variantCode
      const firstVariant = variants.find((variant) =>
        getInternalVariantCode(variant),
      );

      setMappingForm((previous) => ({
        ...previous,
        productId: getInternalProductId(product),
        variantCode: getInternalVariantCode(firstVariant),
        variantName: getInternalVariantName(firstVariant),
      }));
    };

    const handleInternalVariantChange = (variantCode) => {
      const variant = internalVariants.find(
        (item) => getInternalVariantCode(item) === String(variantCode),
      );

      setMappingForm((previous) => ({
        ...previous,
        variantCode: String(variantCode),
        variantName: getInternalVariantName(variant),
      }));
    };

    return (
      <div className="shopee-mapping">
        <section className="shopee-mapping-stats">
          <article>
            <span>Tổng ánh xạ</span>
            <strong>{skuMappings.length}</strong>
          </article>
          <article>
            <span>Đang hoạt động</span>
            <strong className="mapping-green">{activeMappingCount}</strong>
          </article>
          <article>
            <span>Đã vô hiệu hóa</span>
            <strong className="mapping-gray">{disabledMappingCount}</strong>
          </article>
        </section>

        <section className="shopee-panel" id="shopee-sku-mapping-form">
          <div className="shopee-panel-heading">
            <div>
              <div className="shopee-heading-kicker">SKU CONFIGURATION</div>
              <h2>
                {editingMappingId ? "Chỉnh sửa ánh xạ SKU" : "Tạo ánh xạ SKU"}
              </h2>
              <p>
                Chọn sản phẩm Shopee và sản phẩm trong kho nội bộ. Các thông tin
                SKU sẽ được tự động điền.
              </p>
            </div>

            {editingMappingId && (
              <button
                type="button"
                className="shopee-btn shopee-btn-outline"
                onClick={resetMappingForm}
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          {mappingCatalogLoading ? (
            <div className="shopee-loading">
              <i className="fa-solid fa-spinner fa-spin" />
              Đang tải danh mục sản phẩm...
            </div>
          ) : (
            <form onSubmit={saveSkuMapping}>
              {/* SHOP */}
              <div className="mapping-section-title">
                <span>01</span>
                <div>
                  <strong>Chọn gian hàng Shopee</strong>
                  <small>Chọn gian hàng chứa sản phẩm cần ánh xạ.</small>
                </div>
              </div>

              <div className="mapping-form-grid">
                <label className="shopee-field mapping-full">
                  <span>
                    Gian hàng Shopee <b>*</b>
                  </span>
                  <select
                    value={mappingForm.shopId}
                    required
                    onChange={(event) => {
                      const shopId = event.target.value;

                      setMappingForm({
                        ...EMPTY_MAPPING_FORM,
                        shopId,
                      });

                      setMappingShopeeKeyword("");
                      loadMappingCatalogs(shopId);
                    }}
                  >
                    <option value="">-- Chọn gian hàng --</option>
                    {shops.map((shop) => (
                      <option
                        key={String(shop.shopId)}
                        value={String(shop.shopId)}
                      >
                        {shop.shopName || `Shop ${shop.shopId}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* SHOPEE PRODUCT */}
              <div className="mapping-section-title mapping-section-second">
                <span>02</span>
                <div>
                  <strong>Chọn sản phẩm Shopee</strong>
                  <small>
                    Danh sách lấy từ sản phẩm đã đồng bộ trong hệ thống.
                  </small>
                </div>
              </div>

              <div className="mapping-form-grid">
                <label className="shopee-field mapping-full">
                  <span>Tìm sản phẩm Shopee</span>
                  <input
                    value={mappingShopeeKeyword}
                    onChange={(event) =>
                      setMappingShopeeKeyword(event.target.value)
                    }
                    placeholder="Nhập tên sản phẩm, SKU hoặc Item ID..."
                  />
                </label>

                <label className="shopee-field mapping-full">
                  <span>
                    Sản phẩm Shopee <b>*</b>
                  </span>
                  <select
                    value={mappingForm.itemId}
                    required
                    disabled={!mappingForm.shopId}
                    onChange={(event) =>
                      handleShopeeProductChange(event.target.value)
                    }
                  >
                    <option value="">-- Chọn sản phẩm Shopee --</option>
                    {filteredShopeeProducts.map((product) => (
                      <option
                        key={String(product.itemId)}
                        value={String(product.itemId)}
                      >
                        {product.itemName || "Sản phẩm Shopee"} · ID:{" "}
                        {product.itemId}
                        {product.itemSku ? ` · SKU: ${product.itemSku}` : ""}
                      </option>
                    ))}
                  </select>
                  <small>
                    Tìm thấy {filteredShopeeProducts.length} /{" "}
                    {mappingShopeeProducts.length} sản phẩm
                  </small>
                </label>

                <label className="shopee-field mapping-full">
                  <span>Phân loại Shopee</span>
                  <select
                    value={mappingForm.modelId}
                    disabled={!selectedShopeeProduct}
                    onChange={(event) =>
                      handleShopeeModelChange(event.target.value)
                    }
                  >
                    {!selectedShopeeProduct && (
                      <option value="0">-- Chọn sản phẩm trước --</option>
                    )}

                    {selectedShopeeProduct &&
                      getProductModels(selectedShopeeProduct).length === 0 && (
                        <option value="0">Sản phẩm không có phân loại</option>
                      )}

                    {getProductModels(selectedShopeeProduct).map((model) => (
                      <option
                        key={String(model.modelId)}
                        value={String(model.modelId)}
                      >
                        {model.modelName || "Phân loại mặc định"}
                        {" · "}
                        Model ID: {model.modelId}
                        {model.modelSku ? ` · SKU: ${model.modelSku}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedShopeeProduct && (
                  <div className="mapping-full">
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: 14,
                        border: "1px solid #fed7aa",
                        background: "#fffaf5",
                        borderRadius: 12,
                      }}
                    >
                      {getProductImage(selectedShopeeProduct) && (
                        <img
                          src={getProductImage(selectedShopeeProduct)}
                          alt={selectedShopeeProduct.itemName}
                          style={{
                            width: 64,
                            height: 64,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      )}

                      <div style={{ minWidth: 0 }}>
                        <strong>{selectedShopeeProduct.itemName}</strong>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          Item ID: {mappingForm.itemId}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          Item SKU: {mappingForm.itemSku || "Chưa có"}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          Phân loại: {mappingForm.modelName || "Mặc định"}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          Variation SKU: {mappingForm.variationSku || "Chưa có"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* INTERNAL PRODUCT */}
              <div className="mapping-section-title mapping-section-second">
                <span>03</span>
                <div>
                  <strong>Chọn sản phẩm Nhật Khang Bike</strong>
                  <small>
                    Chọn sản phẩm nội bộ và biến thể tương ứng trong kho.
                  </small>
                </div>
              </div>

              <div className="mapping-form-grid">
                <label className="shopee-field mapping-full">
                  <span>Tìm sản phẩm nội bộ</span>
                  <input
                    value={mappingInternalKeyword}
                    onChange={(event) =>
                      setMappingInternalKeyword(event.target.value)
                    }
                    placeholder="Nhập tên sản phẩm, mã sản phẩm..."
                  />
                </label>

                <label className="shopee-field mapping-full">
                  <span>
                    Sản phẩm kho nội bộ <b>*</b>
                  </span>
                  <select
                    value={mappingForm.productId}
                    required
                    onChange={(event) =>
                      handleInternalProductChange(event.target.value)
                    }
                  >
                    <option value="">
                      -- Chọn sản phẩm Nhật Khang Bike --
                    </option>

                    {filteredInternalProducts.map((product) => (
                      <option
                        key={getInternalProductId(product)}
                        value={getInternalProductId(product)}
                      >
                        {getInternalProductName(product)}
                        {product.code ? ` · ${product.code}` : ""}
                        {` · ${getInternalVariants(product).length} biến thể`}
                      </option>
                    ))}
                  </select>
                  <small>
                    Tìm thấy {filteredInternalProducts.length} /{" "}
                    {mappingInternalProducts.length} sản phẩm
                  </small>
                </label>

                <label className="shopee-field mapping-full">
                  <span>
                    Biến thể nội bộ <b>*</b>
                  </span>
                  <select
                    value={mappingForm.variantCode}
                    required
                    disabled={!selectedInternalProduct}
                    onChange={(event) =>
                      handleInternalVariantChange(event.target.value)
                    }
                  >
                    <option value="">-- Chọn biến thể nội bộ --</option>

                    {internalVariants.map((variant, index) => {
                      const code = getInternalVariantCode(variant);

                      return (
                        <option
                          key={`${code || "missing"}-${index}`}
                          value={code}
                          disabled={!code}
                        >
                          {getInternalVariantName(variant)}
                          {code ? ` · ${code}` : " · Chưa có variantCode"}
                        </option>
                      );
                    })}
                  </select>

                  {selectedInternalProduct && (
                    <small>
                      Chỉ chọn được biến thể đã có `variantCode`. Biến thể chưa
                      có mã cần được bổ sung mã trước khi ánh xạ để hệ thống
                      nhận diện đúng khi xử lý đơn.
                    </small>
                  )}
                </label>

                {selectedInternalVariant && (
                  <div className="mapping-full">
                    <div
                      style={{
                        padding: 14,
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        borderRadius: 12,
                      }}
                    >
                      <strong style={{ color: "#166534" }}>
                        <i className="fa-solid fa-circle-check" /> Đã chọn biến
                        thể kho
                      </strong>
                      <div style={{ marginTop: 8, fontSize: 13 }}>
                        Sản phẩm:{" "}
                        <strong>
                          {getInternalProductName(selectedInternalProduct)}
                        </strong>
                      </div>
                      <div style={{ marginTop: 5, fontSize: 13 }}>
                        Tên biến thể:{" "}
                        <strong>
                          {getInternalVariantName(selectedInternalVariant)}
                        </strong>
                      </div>
                      <div style={{ marginTop: 5, fontSize: 13 }}>
                        Mã biến thể:{" "}
                        <strong>
                          {getInternalVariantCode(selectedInternalVariant)}
                        </strong>
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 12,
                          color: "#64748b",
                          wordBreak: "break-all",
                        }}
                      >
                        Product ID: {mappingForm.productId}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CONFIG */}
              <div className="mapping-section-title mapping-section-second">
                <span>04</span>
                <div>
                  <strong>Quy tắc quy đổi tồn kho</strong>
                  <small>
                    Thiết lập số lượng sản phẩm nội bộ tương ứng với một sản
                    phẩm Shopee.
                  </small>
                </div>
              </div>

              <div className="mapping-form-grid">
                <label className="shopee-field">
                  <span>
                    Số lượng quy đổi <b>*</b>
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={mappingForm.quantityMultiplier}
                    onChange={(event) =>
                      updateMappingForm(
                        "quantityMultiplier",
                        event.target.value,
                      )
                    }
                    required
                  />
                  <small>
                    1 sản phẩm Shopee tương ứng bao nhiêu đơn vị tồn kho?
                  </small>
                </label>

                <label className="shopee-field mapping-full">
                  <span>Ghi chú</span>
                  <textarea
                    rows="3"
                    value={mappingForm.note}
                    onChange={(event) =>
                      updateMappingForm("note", event.target.value)
                    }
                    placeholder="Ghi chú nội bộ..."
                  />
                </label>
              </div>

              <div className="mapping-form-footer">
                <button
                  type="button"
                  className="shopee-btn shopee-btn-outline"
                  onClick={resetMappingForm}
                >
                  Làm mới
                </button>

                <button
                  type="submit"
                  className="shopee-btn shopee-btn-orange"
                  disabled={
                    mappingSaving ||
                    !mappingForm.shopId ||
                    !mappingForm.itemId ||
                    !mappingForm.productId ||
                    !mappingForm.variantCode
                  }
                >
                  <i
                    className={`fa-solid ${
                      mappingSaving ? "fa-spinner fa-spin" : "fa-floppy-disk"
                    }`}
                  />
                  {mappingSaving
                    ? "Đang lưu..."
                    : editingMappingId
                      ? "Lưu thay đổi"
                      : "Tạo ánh xạ"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* MAPPING LIST */}
        <section className="shopee-panel">
          <div className="shopee-panel-heading">
            <div>
              <div className="shopee-heading-kicker">MAPPING MANAGEMENT</div>
              <h2>Danh sách ánh xạ SKU</h2>
              <p>Tra cứu, chỉnh sửa và vô hiệu hóa liên kết SKU.</p>
            </div>

            <button
              className="shopee-btn shopee-btn-outline"
              onClick={loadSkuMappings}
              disabled={mappingLoading}
            >
              <i
                className={`fa-solid ${
                  mappingLoading ? "fa-spinner fa-spin" : "fa-rotate"
                }`}
              />
              Làm mới
            </button>
          </div>

          <div className="mapping-toolbar">
            <label className="shopee-order-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                value={mappingSearch}
                onChange={(event) => setMappingSearch(event.target.value)}
                placeholder="Tìm tên, SKU, Item ID, mã biến thể..."
              />
            </label>

            <select
              value={mappingShopFilter}
              onChange={(event) => setMappingShopFilter(event.target.value)}
            >
              <option value="all">Tất cả gian hàng</option>
              {shops.map((shop) => (
                <option key={String(shop.shopId)} value={String(shop.shopId)}>
                  {shop.shopName || `Shop ${shop.shopId}`}
                </option>
              ))}
            </select>

            <select
              value={mappingStatusFilter}
              onChange={(event) => setMappingStatusFilter(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="disabled">Đã vô hiệu hóa</option>
            </select>
          </div>

          {mappingLoading ? (
            <div className="shopee-loading">
              <i className="fa-solid fa-spinner fa-spin" />
              Đang tải ánh xạ SKU...
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="shopee-orders-empty">
              <div>
                <i className="fa-solid fa-barcode" />
              </div>
              <strong>Chưa có ánh xạ phù hợp</strong>
              <span>Tạo ánh xạ mới hoặc thay đổi điều kiện tìm kiếm.</span>
            </div>
          ) : (
            <div className="shopee-table-wrap">
              <table className="shopee-orders-table mapping-table">
                <thead>
                  <tr>
                    <th>Sản phẩm Shopee</th>
                    <th>SKU Shopee</th>
                    <th>Sản phẩm kho</th>
                    <th>Quy đổi</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMappings.map((item, index) => {
                    const id = item._id || item.id || index;
                    const active = item.isActive !== false;

                    const productId =
                      typeof item.productId === "object"
                        ? item.productId?._id
                        : item.productId;

                    return (
                      <tr key={id}>
                        <td>
                          <strong>{item.itemName || "Sản phẩm Shopee"}</strong>
                          <span className="shopee-cell-sub">
                            Item ID: {item.itemId || "—"}
                          </span>
                          <span className="shopee-cell-sub">
                            {item.modelName || "Không có phân loại"} · Model:{" "}
                            {item.modelId || "0"}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {item.variationSku || item.itemSku || "—"}
                          </strong>
                          {item.itemSku && item.variationSku && (
                            <span className="shopee-cell-sub">
                              Item SKU: {item.itemSku}
                            </span>
                          )}
                        </td>

                        <td>
                          <strong>{item.variantName || "—"}</strong>
                          <span className="shopee-cell-sub">
                            Mã: {item.variantCode || "—"}
                          </span>
                          <span className="shopee-cell-sub">
                            Product ID: {productId || "—"}
                          </span>
                        </td>

                        <td>
                          <span className="mapping-quantity">
                            ×{item.quantityMultiplier || 1}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`mapping-status ${
                              active ? "active" : "disabled"
                            }`}
                          >
                            {active ? "Hoạt động" : "Đã tắt"}
                          </span>
                        </td>

                        <td>
                          <div className="mapping-actions">
                            <button
                              type="button"
                              className="mapping-edit-btn"
                              onClick={async () => {
                                editSkuMapping(item);
                                setMappingShopeeKeyword("");
                                setMappingInternalKeyword("");
                                await loadMappingCatalogs(String(item.shopId));
                              }}
                            >
                              <i className="fa-solid fa-pen" /> Sửa
                            </button>

                            {active && (
                              <button
                                type="button"
                                className="mapping-disable-btn"
                                disabled={mappingDisabling === String(id)}
                                onClick={() => disableSkuMapping(item)}
                              >
                                <i
                                  className={`fa-solid ${
                                    mappingDisabling === String(id)
                                      ? "fa-spinner fa-spin"
                                      : "fa-ban"
                                  }`}
                                />
                                Tắt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mapping-table-footer">
            Hiển thị {filteredMappings.length} / {skuMappings.length} ánh xạ
          </div>
        </section>
      </div>
    );
  };
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
            Quản lý gian hàng, sản phẩm, đơn hàng và luồng tồn kho Shopee tại
            Nhật Khang Bike.
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
      {activeTab === "products" && renderProducts()}
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
            Đồng bộ danh mục sản phẩm Shopee chỉ lưu dữ liệu vào collection
            ShopeeProduct, không cộng/trừ tồn kho nội bộ. Tra cứu đơn Shopee
            không tự lưu đơn và không trừ kho. Chỉ thao tác xuất kho đã xác nhận
            mới được phép trừ tồn FIFO. Hàng hoàn chỉ cộng tồn khi đã nhận và
            kiểm tra thực tế; chỉ số lượng hàng tốt được nhập lại.
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

      {selectedProduct && (
        <div
          className="shopee-modal-backdrop"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            className="shopee-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết sản phẩm Shopee"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shopee-modal-heading">
              <div>
                <span className="shopee-heading-kicker">
                  SHOPEE PRODUCT DETAIL
                </span>
                <h2>{selectedProduct.itemName || "Sản phẩm Shopee"}</h2>
              </div>
              <button
                className="shopee-icon-btn"
                onClick={() => setSelectedProduct(null)}
                aria-label="Đóng"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
                margin: "18px 0",
              }}
            >
              {getProductImage(selectedProduct) && (
                <img
                  src={getProductImage(selectedProduct)}
                  alt={selectedProduct.itemName}
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <strong>{selectedProduct.itemName}</strong>
                <p style={{ color: "#64748b", margin: "7px 0" }}>
                  Item ID: {selectedProduct.itemId || "—"}
                </p>
                <p style={{ color: "#64748b", margin: "7px 0" }}>
                  SKU: {selectedProduct.itemSku || "—"}
                </p>
                <p style={{ color: "#64748b", margin: "7px 0" }}>
                  Trạng thái: {PRODUCT_STATUS_LABEL(selectedProduct.itemStatus)}
                </p>
                <strong style={{ color: "#ea580c", fontSize: 18 }}>
                  {formatProductPrice(
                    selectedProduct.price,
                    selectedProduct.maxPrice,
                  )}
                </strong>
              </div>
            </div>

            <div className="shopee-modal-info">
              <div>
                <span>Tồn khả dụng</span>
                <strong>{Number(selectedProduct.stock || 0)}</strong>
              </div>
              <div>
                <span>Số phân loại</span>
                <strong>{getProductModels(selectedProduct).length}</strong>
              </div>
              <div>
                <span>Danh mục</span>
                <strong>{selectedProduct.categoryId || "—"}</strong>
              </div>
              <div>
                <span>Đồng bộ lần cuối</span>
                <strong>{formatDate(selectedProduct.lastSyncedAt)}</strong>
              </div>
            </div>

            {getProductModels(selectedProduct).length > 0 && (
              <>
                <h3>Danh sách phân loại</h3>
                <div className="shopee-table-wrap">
                  <table className="shopee-orders-table">
                    <thead>
                      <tr>
                        <th>Phân loại</th>
                        <th>Model ID</th>
                        <th>SKU</th>
                        <th>Giá</th>
                        <th>Tồn</th>
                        <th>Đang giữ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getProductModels(selectedProduct).map((model, index) => (
                        <tr key={model.modelId || index}>
                          <td>{model.modelName || "Mặc định"}</td>
                          <td>{model.modelId || "0"}</td>
                          <td>{model.modelSku || "—"}</td>
                          <td>{formatMoney(model.price, "VND")}</td>
                          <td>{Number(model.stock || 0)}</td>
                          <td>{Number(model.reservedStock || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {selectedProduct.description && (
              <div style={{ marginTop: 18 }}>
                <h3>Mô tả sản phẩm</h3>
                <div
                  style={{
                    maxHeight: 220,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    color: "#475569",
                    fontSize: 13,
                  }}
                >
                  {selectedProduct.description}
                </div>
              </div>
            )}

            <div className="shopee-modal-warning">
              Đây là dữ liệu danh mục từ Shopee. Thông tin này không tự động cập
              nhật sản phẩm hoặc tồn kho trong hệ thống Nhật Khang Bike.
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
