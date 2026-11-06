import React, { useCallback, useEffect, useMemo, useState } from "react";
import { shopeeApi } from "../../services/shopeeApi";
import "./ShopeeOrders.css";

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

const getStatusLabel = (status) => {
  const statuses = {
    UNPAID: "Chưa thanh toán",
    READY_TO_SHIP: "Chờ lấy hàng",
    PROCESSED: "Đang xử lý",
    SHIPPED: "Đang giao",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    IN_CANCEL: "Đang yêu cầu hủy",
    TO_RETURN: "Yêu cầu trả hàng",
  };

  return statuses[status] || status || "Không xác định";
};

const getStockLabel = (status) => {
  const statuses = {
    pending: "Chưa xử lý kho",
    reserved: "Đã giữ hàng",
    deducted: "Đã xuất kho",
    released: "Đã hoàn giữ",
    partial: "Xuất kho một phần",
    returned: "Đã nhận hàng hoàn",
    failed: "Lỗi xuất kho",
  };

  return statuses[status] || status || "Chưa xử lý";
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

  const loadShops = useCallback(async () => {
    try {
      const result = await shopeeApi.getShops();

      console.log("SHOPEE SHOPS RESPONSE:", result);

      const shopList = normalizeList(result, "shops");

      setShops(shopList);

      if (shopList.length === 1) {
        setShopId(String(shopList[0].shopId || shopList[0].shop_id));
      }
    } catch (err) {
      console.error("Load Shopee shops:", err);
      setError(err.message || "Không tải được danh sách gian hàng");
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

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
      setError(err.message || "Không tải được danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [shopId, status, stockStatus, search, page, limit]);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

    return { total, unmapped, pending, deducted };
  }, [orders]);

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

  return (
    <div className="sho-orders">
      <div className="sho-orders-header">
        <div>
          <h2>Quản lý đơn hàng Shopee</h2>
          <p>Đồng bộ đơn hàng và quản lý xuất kho Nhật Khang Bike</p>
        </div>

        <button
          className="sho-btn sho-btn-primary"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? "Đang đồng bộ..." : "↻ Đồng bộ Shopee"}
        </button>
      </div>

      {error && <div className="sho-alert sho-alert-error">{error}</div>}

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
          {shops.map((shop) => (
            <option key={shop.shopId || shop._id} value={shop.shopId}>
              {shop.shopName || shop.shopId}
            </option>
          ))}
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

              {previewing && (
                <div className="sho-alert">Đang kiểm tra phân bổ FIFO...</div>
              )}

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
