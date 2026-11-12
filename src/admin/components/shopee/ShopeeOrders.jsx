import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { io } from "socket.io-client";

import { shopeeApi } from "../../services/shopeeApi";
import { DEFAUL_URL } from "../../../api";
import "./style/ShopeeOrders.css";
import { getStatusLabel, getStockLabel } from "../../common/CommonFunc";
// =====================================================
// HELPERS
// =====================================================

const money = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";

const getOrderTime = (order) => {
  const timestamp = order?.rawData?.create_time || order?.rawData?.update_time;

  if (timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  }

  const date = order?.createTime || order?.createdAt;

  if (!date) return "Chưa có";

  const parsed = new Date(date);

  if (parsed.getFullYear() < 2001) return "Không xác định";

  return parsed.toLocaleString("vi-VN");
};

const getMappingLabel = (item) => {
  if (item.mappingStatus === "mapped" && item.productId && item.variantCode) {
    return "Đã ánh xạ";
  }

  return "Chưa ánh xạ";
};

const normalizeList = (result, type = "orders") => {
  if (Array.isArray(result)) return result;

  const data = result?.data || result;

  if (Array.isArray(data)) return data;

  if (type === "shops") {
    return data?.shops || data?.data?.shops || data?.results || [];
  }

  return data?.orders || data?.data?.orders || data?.results || [];
};

// =====================================================
// SOCKET.IO CONFIG
// =====================================================

const getSocketUrl = () => DEFAUL_URL;

const getAdminToken = () => {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ShopeeOrders() {
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const [shopId, setShopId] = useState("");
  const [status, setStatus] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [deducting, setDeducting] = useState(false);

  // Realtime status
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSocketSync, setLastSocketSync] = useState(null);

  // Luôn tham chiếu đến hàm loadOrders mới nhất
  const loadOrdersRef = useRef(null);

  // =====================================================
  // LOAD SHOPS
  // =====================================================

  const loadShops = useCallback(async () => {
    try {
      const result = await shopeeApi.getShops();

      console.log("SHOPEE SHOPS RESPONSE:", result);

      const shopList = normalizeList(result, "shops");

      setShops(shopList);

      if (shopList.length === 1) {
        setShopId(String(shopList[0].shopId || shopList[0].shop_id || ""));
      }
    } catch (err) {
      console.error("Load Shopee shops:", err);
      setError(err.message || "Không tải được danh sách gian hàng");
    }
  }, []);

  // =====================================================
  // LOAD ORDERS
  // =====================================================

  const loadOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError("");
      }

      try {
        const result = await shopeeApi.getOrders({
          shopId,
          orderStatus: status,
          stockStatus,
          search,
          page,
          limit,
        });

        setOrders(normalizeList(result));
      } catch (err) {
        console.error("Load Shopee orders:", err);

        if (!silent) {
          setError(err.message || "Không tải được danh sách đơn hàng");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [shopId, status, stockStatus, search, page, limit],
  );

  loadOrdersRef.current = loadOrders;

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // =====================================================
  // SHOPEE REALTIME SOCKET
  // =====================================================

  useEffect(() => {
    const token = getAdminToken();

    if (!token) {
      console.warn("[Shopee Socket] Không tìm thấy admin token");
      return;
    }

    const socket = io(`${getSocketUrl()}/shopee-orders`, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    let refreshTimer = null;

    socket.on("connect", () => {
      console.log("[Shopee Socket] Đã kết nối:", socket.id);

      setSocketConnected(true);

      // Tải lại dữ liệu sau khi kết nối hoặc kết nối lại
      loadOrdersRef.current?.({ silent: true });
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Shopee Socket] Mất kết nối:", reason);

      setSocketConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[Shopee Socket] Lỗi kết nối:", err.message);

      setSocketConnected(false);
    });

    socket.on("shopee:orders:synced", (data) => {
      console.log("[Shopee Socket] Đơn hàng vừa đồng bộ:", data);

      setLastSocketSync(data?.syncedAt || new Date().toISOString());

      // Gộp nhiều sự kiện từ nhiều gian hàng
      // để tránh tải danh sách liên tục.
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        loadOrdersRef.current?.({ silent: true });
        refreshTimer = null;
      }, 500);
    });

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("shopee:orders:synced");

      socket.disconnect();

      setSocketConnected(false);
    };
  }, []);

  // =====================================================
  // STATISTICS
  // =====================================================

  const stats = useMemo(() => {
    const total = orders.length;

    const unmapped = orders.filter((order) =>
      (order.items || []).some(
        (item) => getMappingLabel(item) === "Chưa ánh xạ",
      ),
    ).length;

    const pending = orders.filter(
      (order) =>
        order.stockStatus === "pending" &&
        !["CANCELLED", "IN_CANCEL"].includes(order.orderStatus),
    ).length;

    const deducted = orders.filter(
      (order) => order.stockStatus === "deducted" || order.stockDeductedAt,
    ).length;

    return {
      total,
      unmapped,
      pending,
      deducted,
    };
  }, [orders]);

  // =====================================================
  // MANUAL SYNC
  // =====================================================

  const handleSync = async () => {
    setSyncing(true);
    setError("");

    try {
      await shopeeApi.syncOrders({
        shopId: shopId || undefined,
      });

      await loadOrders();
    } catch (err) {
      setError(err.message || "Đồng bộ đơn thất bại");
    } finally {
      setSyncing(false);
    }
  };

  // =====================================================
  // ORDER DETAIL
  // =====================================================

  const handleDetail = async (order) => {
    setSelectedOrder(order);
    setPreview(null);

    try {
      const result = await shopeeApi.getOrderDetail(order.orderSn);

      const detail =
        result?.order || result?.data?.order || result?.data || result;

      setSelectedOrder(detail);
    } catch (err) {
      console.error("Order detail:", err);
    }
  };

  // =====================================================
  // FIFO PREVIEW
  // =====================================================

  const handlePreview = async (order) => {
    setPreviewing(true);
    setPreview(null);
    setSelectedOrder(order);

    try {
      const result = await shopeeApi.previewStockDeduction(order.orderSn, {
        shopId: order.shopId,
      });

      setPreview(result?.data || result);
    } catch (err) {
      setError(err.message || "Không thể kiểm tra FIFO");
    } finally {
      setPreviewing(false);
    }
  };

  // =====================================================
  // FIFO DEDUCT
  // =====================================================

  const handleDeduct = async () => {
    if (!selectedOrder || !preview?.canDeduct) return;

    const confirmed = window.confirm(
      `Xác nhận xuất kho đơn ${selectedOrder.orderSn}? Hành động này sẽ trừ tồn kho thực tế.`,
    );

    if (!confirmed) return;

    setDeducting(true);

    try {
      await shopeeApi.deductStock(selectedOrder.orderSn, {
        shopId: selectedOrder.shopId,
      });

      alert("Đã xác nhận xuất kho thành công.");

      setPreview(null);

      await loadOrders();

      const result = await shopeeApi.getOrderDetail(selectedOrder.orderSn);

      setSelectedOrder(
        result?.order || result?.data?.order || result?.data || result,
      );
    } catch (err) {
      setError(err.message || "Xuất kho thất bại");
    } finally {
      setDeducting(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="sho-orders">
      {/* HEADER */}
      <div className="sho-orders-header">
        <div>
          <h2>Quản lý đơn hàng Shopee</h2>

          <p>Đồng bộ đơn hàng và quản lý xuất kho Nhật Khang Bike</p>

          {/* SOCKET STATUS */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
              fontSize: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: socketConnected ? "#16a34a" : "#dc2626",
                display: "inline-block",
              }}
            />

            <span>
              {socketConnected
                ? "Đang kết nối cập nhật realtime"
                : "Đang mất kết nối realtime"}
            </span>

            {lastSocketSync && (
              <span style={{ color: "#888" }}>
                · Đồng bộ gần nhất:{" "}
                {new Date(lastSocketSync).toLocaleTimeString("vi-VN")}
              </span>
            )}
          </div>
        </div>

        <button
          className="sho-btn sho-btn-primary"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? "Đang đồng bộ..." : "↻ Đồng bộ Shopee"}
        </button>
      </div>

      {/* ERROR */}
      {error && <div className="sho-alert sho-alert-error">{error}</div>}

      {/* STATISTICS */}
      <div className="sho-order-stats">
        <div>
          <span>Đơn trong danh sách</span>
          <strong>{stats.total}</strong>
        </div>

        <div>
          <span>Đơn chưa ánh xạ</span>
          <strong>{stats.unmapped}</strong>
        </div>

        <div>
          <span>Chờ xử lý kho</span>
          <strong>{stats.pending}</strong>
        </div>

        <div>
          <span>Đã xuất kho</span>
          <strong>{stats.deducted}</strong>
        </div>
      </div>

      {/* FILTERS */}
      <div className="sho-order-filters">
        <input
          value={search}
          placeholder="Tìm mã đơn, tên sản phẩm, username..."
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          value={shopId}
          onChange={(e) => {
            setShopId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả gian hàng</option>

          {shops.map((shop) => {
            const id = shop.shopId || shop.shop_id || shop._id;

            return (
              <option key={id} value={shop.shopId || shop.shop_id || ""}>
                {shop.shopName || shop.shop_name || id}
              </option>
            );
          })}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái đơn</option>

          {[
            "UNPAID",
            "READY_TO_SHIP",
            "PROCESSED",
            "SHIPPED",
            "COMPLETED",
            "CANCELLED",
            "IN_CANCEL",
            "TO_RETURN",
          ].map((value) => (
            <option key={value} value={value}>
              {getStatusLabel(value)}
            </option>
          ))}
        </select>

        <select
          value={stockStatus}
          onChange={(e) => {
            setStockStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái kho</option>

          {[
            "pending",
            "reserved",
            "deducted",
            "released",
            "partial",
            "returned",
            "failed",
          ].map((value) => (
            <option key={value} value={value}>
              {getStockLabel(value)}
            </option>
          ))}
        </select>

        <button className="sho-btn" onClick={loadOrders} disabled={loading}>
          Lọc
        </button>
      </div>

      {/* ORDER TABLE */}
      <div className="sho-order-table-wrap">
        {loading ? (
          <div className="sho-empty">Đang tải đơn hàng...</div>
        ) : orders.length === 0 ? (
          <div className="sho-empty">Không tìm thấy đơn hàng</div>
        ) : (
          <table className="sho-order-table">
            <thead>
              <tr>
                <th>Mã đơn / Thời gian</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th>Thanh toán</th>
                <th>Trạng thái đơn</th>
                <th>Trạng thái kho</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const items = order.items || [];

                const hasUnmapped = items.some(
                  (item) => getMappingLabel(item) === "Chưa ánh xạ",
                );

                return (
                  <tr key={order._id || order.orderSn}>
                    <td>
                      <strong>{order.orderSn}</strong>
                      <small>{getOrderTime(order)}</small>
                    </td>

                    <td>
                      <strong>{order.buyerUsername || "Khách Shopee"}</strong>

                      <small>{order.recipientName || "Ẩn thông tin"}</small>
                    </td>

                    <td>
                      <div className="sho-order-products">
                        {items.slice(0, 2).map((item, index) => (
                          <div key={index}>
                            <strong>
                              {item.itemName || "Sản phẩm Shopee"}
                            </strong>

                            <small>
                              {item.variantName || item.modelName || "Mặc định"}
                              {" · "}
                              SL: {item.quantity || 0}
                            </small>

                            <small>
                              SKU:{" "}
                              {item.variationSku || item.itemSku || "Chưa có"}
                            </small>
                          </div>
                        ))}

                        {items.length > 2 && (
                          <small>+{items.length - 2} sản phẩm khác</small>
                        )}

                        {hasUnmapped && (
                          <span className="sho-tag sho-tag-warning">
                            Chưa ánh xạ
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <strong>{money(order.totalAmount)}</strong>
                      <small>{order.paymentMethod || "Chưa rõ"}</small>
                    </td>

                    <td>
                      <span className="sho-tag sho-tag-status">
                        {getStatusLabel(order.orderStatus)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`sho-tag ${
                          order.stockStatus === "deducted"
                            ? "sho-tag-success"
                            : "sho-tag-warning"
                        }`}
                      >
                        {getStockLabel(order.stockStatus)}
                      </span>
                    </td>

                    <td>
                      <div className="sho-order-actions">
                        <button
                          className="sho-btn"
                          onClick={() => handleDetail(order)}
                        >
                          Chi tiết
                        </button>

                        <button
                          className="sho-btn sho-btn-primary"
                          disabled={
                            hasUnmapped ||
                            !["SHIPPED", "COMPLETED"].includes(
                              order.orderStatus,
                            ) ||
                            order.stockStatus === "deducted" ||
                            Boolean(order.stockDeductedAt)
                          }
                          onClick={() => handlePreview(order)}
                        >
                          Kiểm tra FIFO
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}
      <div className="sho-pagination">
        <button
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          ← Trước
        </button>

        <span>Trang {page}</span>

        <button
          disabled={orders.length < limit}
          onClick={() => setPage((value) => value + 1)}
        >
          Sau →
        </button>
      </div>

      {/* ORDER DETAIL / FIFO MODAL */}
      {(selectedOrder || preview) && (
        <div
          className="sho-modal-backdrop"
          onClick={() => {
            setSelectedOrder(null);
            setPreview(null);
          }}
        >
          <div className="sho-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sho-modal-header">
              <div>
                <h3>Đơn hàng {selectedOrder?.orderSn}</h3>

                <small>{getOrderTime(selectedOrder)}</small>
              </div>

              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setPreview(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="sho-modal-body">
              <div className="sho-detail-grid">
                <div>
                  <small>Người mua</small>
                  <strong>{selectedOrder?.buyerUsername || "Không rõ"}</strong>
                </div>

                <div>
                  <small>Trạng thái đơn</small>
                  <strong>{getStatusLabel(selectedOrder?.orderStatus)}</strong>
                </div>

                <div>
                  <small>Tổng thanh toán</small>
                  <strong>{money(selectedOrder?.totalAmount)}</strong>
                </div>

                <div>
                  <small>Vận chuyển</small>
                  <strong>
                    {selectedOrder?.shippingCarrier || "Chưa xác định"}
                  </strong>
                </div>
              </div>

              <h4>Sản phẩm trong đơn</h4>

              {(selectedOrder?.items || []).map((item, index) => (
                <div className="sho-detail-item" key={index}>
                  <div>
                    <strong>{item.itemName}</strong>

                    <small>
                      Phân loại:{" "}
                      {item.variantName || item.modelName || "Mặc định"}
                    </small>

                    <small>
                      SKU: {item.variationSku || item.itemSku || "Chưa có"}
                    </small>

                    <small>Ánh xạ: {getMappingLabel(item)}</small>
                  </div>

                  <div className="sho-detail-price">
                    <strong>{money(item.unitPrice)}</strong>
                    <small>SL: {item.quantity}</small>
                  </div>
                </div>
              ))}

              {/* FIFO LOADING */}
              {previewing && (
                <div className="sho-alert">Đang kiểm tra phân bổ FIFO...</div>
              )}

              {/* FIFO RESULT */}
              {preview && (
                <div className="sho-fifo-preview">
                  <h4>Kết quả kiểm tra xuất kho FIFO</h4>

                  <div className="sho-detail-grid">
                    <div>
                      <small>Số lượng cần xuất</small>
                      <strong>{preview.summary?.requiredQty ?? 0}</strong>
                    </div>

                    <div>
                      <small>Số lượng có thể xuất</small>
                      <strong>{preview.summary?.availableQty ?? 0}</strong>
                    </div>

                    <div>
                      <small>Thiếu hàng</small>
                      <strong>{preview.summary?.shortageQty ?? 0}</strong>
                    </div>

                    <div>
                      <small>Chi phí dự kiến</small>
                      <strong>{money(preview.summary?.estimatedCost)}</strong>
                    </div>
                  </div>

                  {(preview.items || []).map((item, index) => (
                    <div className="sho-detail-item" key={index}>
                      <div>
                        <strong>{item.itemName || item.variantName}</strong>

                        <small>
                          Cần: {item.requiredQty} · Có thể xuất:{" "}
                          {item.availableQty}
                        </small>

                        {(item.allocations || []).map((batch, batchIndex) => (
                          <small key={batchIndex}>
                            Lô {batch.batchCode || "N/A"}: {batch.qty} sản phẩm
                          </small>
                        ))}
                      </div>
                    </div>
                  ))}

                  {preview.canDeduct ? (
                    <button
                      className="sho-btn sho-btn-primary sho-btn-block"
                      onClick={handleDeduct}
                      disabled={deducting}
                    >
                      {deducting
                        ? "Đang xuất kho..."
                        : "Xác nhận xuất kho FIFO"}
                    </button>
                  ) : (
                    <div className="sho-alert sho-alert-error">
                      Không đủ điều kiện xuất kho. Kiểm tra ánh xạ và tồn kho.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
