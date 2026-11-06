import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  Boxes,
  ClipboardList,
  X,
  CheckCircle2,
  XCircle,
  ArrowDownToLine,
  Package,
  UserRound,
  Store,
  Truck,
  CreditCard,
  MapPin,
  CalendarDays,
  History,
  RotateCcw,
} from "lucide-react";

import { shopeeApi } from "../../services/shopeeApi";
import "./shopee-stock.css";

// =====================================================
// HELPERS
// =====================================================

const getOrderSn = (order) => order?.orderSn || order?.order_sn || "--";

const getOrderStatus = (order) =>
  String(
    order?.orderStatus || order?.order_status || order?.status || "",
  ).toUpperCase();

const getStockStatus = (order) => order?.stockStatus || "pending";

const getOrderShopId = (order) => order?.shopId || order?.shop_id || "";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatVND = (value) => `${toNumber(value).toLocaleString("vi-VN")} ₫`;

const formatCNY = (value) =>
  `¥${toNumber(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getOrdersFromResponse = (response) => {
  const candidates = [
    response?.data,
    response?.orders,
    response?.data?.orders,
    response?.data?.items,
    response?.items,
  ];

  return candidates.find(Array.isArray) || [];
};
const getShopsFromResponse = (response) => {
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
  String(shop?.shop_id ?? shop?.shopId ?? shop?.id ?? shop?._id ?? "");

const getShopName = (shop) =>
  shop?.shopName || shop?.shop_name || shop?.shop?.shop_name || getShopId(shop);

const getPreviewFromResponse = (response) =>
  response?.data?.data || response?.data || response?.preview || response;

const getHistoryFromResponse = (response) =>
  response?.data?.data || response?.data || response;

const orderStatusLabels = {
  UNPAID: "Chưa thanh toán",
  READY_TO_SHIP: "Chờ bàn giao vận chuyển",
  PROCESSED: "Đã xử lý",
  SHIPPED: "Đang vận chuyển",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  IN_CANCEL: "Đang yêu cầu hủy",
  TO_CONFIRM_RECEIVE: "Chờ xác nhận nhận hàng",
  TO_RETURN: "Đang yêu cầu trả hàng",
  RETURNED: "Đã hoàn hàng",
};

const stockStatusLabels = {
  pending: "Chờ xử lý",
  ready: "Đang giữ hàng",
  partially_deducted: "Đã xuất một phần",
  deducted: "Đã xuất kho",
  unmapped: "Chưa ánh xạ SKU",
  blocked: "Không đủ tồn kho",
};

const stockStatusClasses = {
  pending: "ss-value-orange",
  ready: "ss-value-blue",
  partially_deducted: "ss-value-orange",
  deducted: "ss-value-green",
  unmapped: "ss-value-red",
  blocked: "ss-value-red",
};

const transactionLabels = {
  order_reserve: "Giữ tồn kho",
  order_release: "Giải phóng tồn kho",
  order_export: "Xuất kho",
  return_import: "Nhập hàng hoàn",
  return_adjustment: "Điều chỉnh hàng hoàn",
};

// =====================================================
// COMPONENT
// =====================================================

export default function ShopeeStock() {
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);

  const [shopId, setShopId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [stockStatus, setStockStatus] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [preview, setPreview] = useState(null);
  const [detail, setDetail] = useState(null);

  const [activeModal, setActiveModal] = useState("");

  // ===================================================
  // LOAD DATA
  // ===================================================

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");

      try {
        // ==========================================
        // BƯỚC 1: LẤY DANH SÁCH SHOP ĐÃ KẾT NỐI
        // ==========================================

        const shopResponse = await shopeeApi.getShops();

        const loadedShops = getShopsFromResponse(shopResponse).filter((shop) =>
          getShopId(shop),
        );

        setShops(loadedShops);

        if (loadedShops.length === 0) {
          setOrders([]);
          setShopId("");
          setPagination((current) => ({
            ...current,
            page: 1,
            total: 0,
            totalPages: 0,
          }));

          setError("Chưa có gian hàng Shopee nào được kết nối.");
          return;
        }

        // ==========================================
        // BƯỚC 2: TỰ ĐỘNG XÁC ĐỊNH SHOP
        // ==========================================

        let currentShopId = shopId;

        const shopExists = loadedShops.some(
          (shop) => getShopId(shop) === String(currentShopId),
        );

        if (!currentShopId || !shopExists) {
          currentShopId = getShopId(loadedShops[0]);
        }

        setShopId(currentShopId);

        // ==========================================
        // BƯỚC 3: TẢI ĐƠN HÀNG THEO SHOP
        // ==========================================

        const params = {
          page,
          limit: pagination.limit,
          shopId: currentShopId,
          search: keyword.trim(),
          orderStatus,
          stockStatus,
        };

        const orderResponse = await shopeeApi.getOrders(params);

        const loadedOrders = getOrdersFromResponse(orderResponse);

        setOrders(loadedOrders);

        const responsePagination =
          orderResponse?.pagination ||
          orderResponse?.data?.pagination ||
          orderResponse?.data?.data?.pagination ||
          {};

        setPagination((current) => ({
          ...current,
          page: responsePagination.page || page,
          limit: responsePagination.limit || current.limit,
          total: responsePagination.total ?? loadedOrders.length,
          totalPages:
            responsePagination.totalPages ?? (loadedOrders.length ? 1 : 0),
        }));
      } catch (err) {
        console.error(
          "Get Shopee stock orders error:",
          err?.status,
          err?.data || err?.message,
        );

        setError(err?.message || "Không thể tải danh sách đơn hàng Shopee.");
      } finally {
        setLoading(false);
      }
    },
    [shopId, keyword, orderStatus, stockStatus, pagination.limit],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // ===================================================
  // STATS
  // ===================================================

  const stats = useMemo(() => {
    const totalItems = orders.reduce(
      (sum, order) =>
        sum + (Array.isArray(order?.items) ? order.items.length : 0),
      0,
    );

    const ready = orders.filter(
      (order) => getStockStatus(order) === "ready",
    ).length;

    const blocked = orders.filter((order) =>
      ["blocked", "unmapped"].includes(getStockStatus(order)),
    ).length;

    const completed = orders.filter(
      (order) => getOrderStatus(order) === "COMPLETED",
    ).length;

    return {
      total: pagination.total,
      totalItems,
      ready,
      blocked,
      completed,
    };
  }, [orders, pagination.total]);

  // ===================================================
  // CLIENT FILTER
  // ===================================================

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const normalizedKeyword = keyword.trim().toLowerCase();

      const matchesKeyword =
        !normalizedKeyword ||
        getOrderSn(order).toLowerCase().includes(normalizedKeyword) ||
        String(order?.buyerUsername || "")
          .toLowerCase()
          .includes(normalizedKeyword) ||
        String(order?.recipientName || "")
          .toLowerCase()
          .includes(normalizedKeyword);

      const matchesShop =
        !shopId || String(getOrderShopId(order)) === String(shopId);

      const matchesOrderStatus =
        !orderStatus || getOrderStatus(order) === orderStatus;

      const matchesStockStatus =
        !stockStatus || getStockStatus(order) === stockStatus;

      return (
        matchesKeyword &&
        matchesShop &&
        matchesOrderStatus &&
        matchesStockStatus
      );
    });
  }, [orders, keyword, shopId, orderStatus, stockStatus]);

  // ===================================================
  // PREVIEW FIFO
  // ===================================================

  const openPreview = async (order) => {
    setSelectedOrder(order);
    setPreview(null);
    setDetail(null);
    setActiveModal("preview");
    setError("");
    setPreviewLoading(true);

    try {
      const response = await shopeeApi.previewStockDeduction(
        getOrderSn(order),
        {
          shopId: getOrderShopId(order) || shopId,
        },
      );

      setPreview(getPreviewFromResponse(response));
    } catch (err) {
      setError(err?.message || "Không thể kiểm tra tồn kho và phân bổ FIFO.");
    } finally {
      setPreviewLoading(false);
    }
  };
  // ===================================================
  // ORDER DETAIL MODAL
  // ===================================================

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setPreview(null);
    setDetail(null);
    setActiveModal("order");
    setError("");
  };
  // ===================================================
  // STOCK HISTORY
  // ===================================================

  const openHistory = async (order) => {
    setSelectedOrder(order);
    setDetail(null);
    setPreview(null);
    setActiveModal("history");
    setDetailLoading(true);
    setError("");

    try {
      const response = await shopeeApi.getStockHistory(getOrderSn(order), {
        shopId: getOrderShopId(order) || shopId,
      });

      setDetail(getHistoryFromResponse(response));
    } catch (err) {
      setError(err?.message || "Không thể tải lịch sử giao dịch kho.");
    } finally {
      setDetailLoading(false);
    }
  };

  // ===================================================
  // CLOSE MODAL
  // ===================================================

  const closeModal = () => {
    if (processing) return;

    setSelectedOrder(null);
    setPreview(null);
    setDetail(null);
    setActiveModal("");
  };

  // ===================================================
  // CONFIRM DEDUCTION
  // ===================================================

  const confirmDeduction = async () => {
    if (!selectedOrder || !preview?.canConfirmDeduction || processing) {
      return;
    }

    const orderSn = getOrderSn(selectedOrder);

    if (!window.confirm(`Xác nhận xuất kho FIFO cho đơn ${orderSn}?`)) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const response = await shopeeApi.deductStock(orderSn, {
        shopId: getOrderShopId(selectedOrder) || shopId,
      });

      setNotice(
        response?.message ||
          response?.data?.message ||
          "Đã xác nhận xuất kho thành công.",
      );

      setSelectedOrder(null);
      setPreview(null);
      setActiveModal("");

      await load(pagination.page);
    } catch (err) {
      setError(err?.message || "Xuất kho thất bại.");
    } finally {
      setProcessing(false);
    }
  };

  // ===================================================
  // ORDER CARD
  // ===================================================

  const renderOrderCard = (order) => {
    const orderSn = getOrderSn(order);
    const items = Array.isArray(order?.items) ? order.items : [];

    const orderStatus = getOrderStatus(order);
    const stockStatus = getStockStatus(order);

    const statusClass =
      orderStatus === "COMPLETED"
        ? "is-completed"
        : orderStatus === "CANCELLED"
          ? "is-cancelled"
          : "is-processing";

    const alreadyDeducted = Boolean(order?.stockDeducted);

    return (
      <article className="ss-order-card" key={order?._id || orderSn}>
        <div className="ss-order-top">
          <div className="ss-order-code">
            <span className="ss-eyebrow">MÃ ĐƠN SHOPEE</span>
            <button
              type="button"
              className="ss-order-code-button"
              onClick={() => openOrderDetail(order)}
              title="Xem chi tiết đơn hàng"
            >
              {orderSn}
              <Eye size={15} />
            </button>

            <small>
              <CalendarDays size={12} />
              Tạo lúc: {formatDate(order?.createdAt)}
            </small>
          </div>

          <span className={`ss-order-status ${statusClass}`}>
            {orderStatusLabels[orderStatus] || orderStatus || "--"}
          </span>
        </div>

        <div className="ss-customer-box">
          <div className="ss-customer-avatar">
            <UserRound size={19} />
          </div>

          <div className="ss-customer-info">
            <strong>{order?.buyerUsername || "Khách Shopee"}</strong>

            <span>Buyer ID: {order?.buyerUserId || "--"}</span>
          </div>
        </div>

        <div className="ss-order-info-grid">
          <div>
            <span>Người nhận</span>
            <strong>{order?.recipientName || "--"}</strong>
          </div>

          <div>
            <span>Số điện thoại</span>
            <strong>{order?.recipientPhone || "--"}</strong>
          </div>

          <div className="ss-address-info">
            <span>
              <MapPin size={12} />
              Địa chỉ nhận hàng
            </span>

            <strong>{order?.recipientAddress || "--"}</strong>
          </div>

          <div>
            <span>
              <Truck size={12} />
              Đơn vị vận chuyển
            </span>

            <strong>{order?.shippingCarrier || "--"}</strong>
          </div>

          <div>
            <span>
              <CreditCard size={12} />
              Thanh toán
            </span>

            <strong>{order?.paymentMethod || "--"}</strong>
          </div>

          <div>
            <span>
              <Store size={12} />
              Gian hàng
            </span>

            <strong>{order?.shopName || order?.shopId || "--"}</strong>
          </div>
        </div>

        <div className="ss-order-summary">
          <div>
            <span>Sản phẩm</span>
            <strong>{items.length} dòng sản phẩm</strong>
          </div>

          <div>
            <span>Trạng thái kho</span>

            <strong className={stockStatusClasses[stockStatus] || ""}>
              {stockStatusLabels[stockStatus] || stockStatus}
            </strong>
          </div>

          <div className="ss-total-amount">
            <span>Tổng thanh toán</span>
            <strong>{formatVND(order?.totalAmount)}</strong>
          </div>
        </div>

        {order?.cancelReason ? (
          <div className="ss-item-reason">
            <AlertTriangle size={15} />
            Lý do hủy: {order.cancelReason}
          </div>
        ) : null}

        <div className="ss-order-footer">
          <span>Đồng bộ: {formatDate(order?.lastSyncedAt)}</span>

          <div className="ss-order-actions">
            <button
              type="button"
              className="ss-btn ss-btn-outline"
              onClick={() => openHistory(order)}
            >
              <History size={16} />
              Lịch sử
            </button>

            {alreadyDeducted ? (
              <span className="ss-value-green">
                <CheckCircle2 size={15} />
                Đã xuất kho
              </span>
            ) : (
              <button
                type="button"
                className="ss-btn ss-btn-preview"
                onClick={() => openPreview(order)}
              >
                <Eye size={17} />
                Kiểm tra FIFO
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };
  // ===================================================
  // ORDER DETAIL MODAL
  // ===================================================

  const renderOrderModal = () => {
    if (!selectedOrder || activeModal !== "order") {
      return null;
    }

    const order = selectedOrder;
    const items = Array.isArray(order.items) ? order.items : [];

    const orderStatus = getOrderStatus(order);
    const stockStatus = getStockStatus(order);

    const statusClass =
      orderStatus === "COMPLETED"
        ? "is-completed"
        : orderStatus === "CANCELLED"
          ? "is-cancelled"
          : "is-processing";

    return (
      <div className="ss-modal-backdrop" onClick={closeModal}>
        <section
          className="ss-modal ss-order-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ss-order-detail-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="ss-modal-header">
            <div>
              <span>CHI TIẾT ĐƠN SHOPEE</span>

              <h2 id="ss-order-detail-title">Đơn hàng {getOrderSn(order)}</h2>

              <p>Ngày tạo: {formatDate(order.createdAt)}</p>
            </div>

            <button
              type="button"
              className="ss-modal-close"
              onClick={closeModal}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </header>

          <div className="ss-modal-body">
            {/* TRẠNG THÁI */}

            <div className="ss-order-detail-status">
              <div>
                <span>Trạng thái Shopee</span>
                <strong className={`ss-order-status ${statusClass}`}>
                  {orderStatusLabels[orderStatus] || orderStatus || "--"}
                </strong>
              </div>

              <div>
                <span>Trạng thái kho</span>
                <strong className={stockStatusClasses[stockStatus] || ""}>
                  {stockStatusLabels[stockStatus] || stockStatus}
                </strong>
              </div>

              <div>
                <span>Trạng thái xuất kho</span>
                <strong
                  className={
                    order.stockDeducted ? "ss-value-green" : "ss-value-orange"
                  }
                >
                  {order.stockDeducted ? "Đã xuất kho" : "Chưa xuất kho"}
                </strong>
              </div>
            </div>

            {/* KHÁCH HÀNG */}

            <div className="ss-order-detail-section">
              <h3>
                <UserRound size={17} />
                Thông tin khách hàng
              </h3>

              <div className="ss-order-detail-grid">
                <div>
                  <span>Tên tài khoản</span>
                  <strong>{order.buyerUsername || "Khách Shopee"}</strong>
                </div>

                <div>
                  <span>Buyer ID</span>
                  <strong>{order.buyerUserId || "--"}</strong>
                </div>

                <div>
                  <span>Người nhận</span>
                  <strong>{order.recipientName || "--"}</strong>
                </div>

                <div>
                  <span>Số điện thoại</span>
                  <strong>{order.recipientPhone || "--"}</strong>
                </div>

                <div className="ss-detail-full">
                  <span>
                    <MapPin size={13} />
                    Địa chỉ giao hàng
                  </span>
                  <strong>{order.recipientAddress || "--"}</strong>
                </div>
              </div>
            </div>

            {/* VẬN CHUYỂN VÀ THANH TOÁN */}

            <div className="ss-order-detail-section">
              <h3>
                <Truck size={17} />
                Vận chuyển và thanh toán
              </h3>

              <div className="ss-order-detail-grid">
                <div>
                  <span>Đơn vị vận chuyển</span>
                  <strong>{order.shippingCarrier || "--"}</strong>
                </div>

                <div>
                  <span>Phương thức thanh toán</span>
                  <strong>{order.paymentMethod || "--"}</strong>
                </div>

                <div>
                  <span>Gian hàng</span>
                  <strong>{order.shopName || order.shopId || "--"}</strong>
                </div>

                <div>
                  <span>Đồng bộ lần cuối</span>
                  <strong>{formatDate(order.lastSyncedAt)}</strong>
                </div>
              </div>
            </div>

            {/* SẢN PHẨM */}

            <div className="ss-order-detail-section">
              <h3>
                <Package size={17} />
                Sản phẩm trong đơn ({items.length})
              </h3>

              {items.length === 0 ? (
                <div className="ss-empty">
                  <Package size={25} />
                  <strong>Đơn hàng chưa có thông tin sản phẩm.</strong>
                </div>
              ) : (
                <div className="ss-table-scroll">
                  <table className="ss-table ss-order-items-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Sản phẩm Shopee</th>
                        <th>Phân loại</th>
                        <th>Mã SKU</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item, index) => {
                        const itemName =
                          item.itemName ||
                          item.productTitle ||
                          item.productName ||
                          "Sản phẩm";

                        const variantName =
                          item.modelName || item.variantName || "--";

                        const quantity = toNumber(item.quantity);

                        const price = toNumber(
                          item.price ??
                            item.modelPrice ??
                            item.unitPrice ??
                            item.originalPrice,
                        );

                        return (
                          <tr
                            key={`${item.itemId || index}-${item.modelId || ""}`}
                          >
                            <td>{index + 1}</td>

                            <td>
                              <strong>{itemName}</strong>
                            </td>

                            <td>{variantName}</td>

                            <td>
                              {item.variantCode ||
                                item.sku ||
                                item.productCode ||
                                "--"}
                            </td>

                            <td>
                              <strong>{quantity}</strong>
                            </td>

                            <td>{price > 0 ? formatVND(price) : "--"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* TỔNG TIỀN */}

            <div className="ss-order-detail-total">
              <div>
                <span>Tổng số dòng sản phẩm</span>
                <strong>{items.length}</strong>
              </div>

              <div>
                <span>Tổng số lượng</span>
                <strong>
                  {items.reduce(
                    (sum, item) => sum + toNumber(item.quantity),
                    0,
                  )}
                </strong>
              </div>

              <div className="ss-order-detail-grand-total">
                <span>Tổng thanh toán</span>
                <strong>{formatVND(order.totalAmount)}</strong>
              </div>
            </div>

            {order.cancelReason ? (
              <div className="ss-item-reason">
                <AlertTriangle size={15} />
                Lý do hủy: {order.cancelReason}
              </div>
            ) : null}
          </div>

          <footer className="ss-modal-footer">
            <button
              type="button"
              className="ss-btn ss-btn-outline"
              onClick={closeModal}
            >
              Đóng
            </button>

            <button
              type="button"
              className="ss-btn ss-btn-primary"
              onClick={() => openHistory(order)}
            >
              <History size={16} />
              Xem lịch sử kho
            </button>
          </footer>
        </section>
      </div>
    );
  };
  // ===================================================
  // PREVIEW MODAL
  // ===================================================

  const renderPreviewModal = () => {
    if (!selectedOrder || activeModal !== "preview") {
      return null;
    }

    const items = Array.isArray(preview?.items) ? preview.items : [];

    const summary = preview?.summary || {};

    return (
      <div className="ss-modal-backdrop" onClick={closeModal}>
        <section
          className="ss-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ss-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="ss-modal-header">
            <div>
              <span>KIỂM TRA TỒN KHO</span>

              <h2 id="ss-modal-title">Xem trước xuất kho FIFO</h2>

              <p>Đơn hàng: {getOrderSn(selectedOrder)}</p>
            </div>

            <button
              type="button"
              className="ss-modal-close"
              onClick={closeModal}
              disabled={processing}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </header>

          <div className="ss-modal-body">
            {previewLoading ? (
              <div className="ss-empty ss-modal-loading">
                <RefreshCw size={28} className="ss-spin" />

                <strong>Đang kiểm tra tồn kho...</strong>

                <span>Hệ thống đang phân bổ các lô theo FIFO.</span>
              </div>
            ) : !preview ? (
              <div className="ss-empty">
                <AlertTriangle size={28} />

                <strong>Không có dữ liệu xem trước</strong>

                <span>Đóng cửa sổ và thử kiểm tra lại.</span>
              </div>
            ) : (
              <>
                <div
                  className={`ss-preview-result ${
                    preview.canConfirmDeduction
                      ? "is-success"
                      : preview.canDeduct
                        ? "is-warning"
                        : "is-danger"
                  }`}
                >
                  {preview.canConfirmDeduction ? (
                    <CheckCircle2 size={23} />
                  ) : (
                    <AlertTriangle size={23} />
                  )}

                  <div>
                    <strong>
                      {preview.canConfirmDeduction
                        ? "Đủ điều kiện xác nhận xuất kho"
                        : preview.canDeduct
                          ? "Đủ tồn kho, chưa được phép xuất"
                          : "Chưa đủ điều kiện xuất kho"}
                    </strong>

                    <p>{preview.message || "Kết quả kiểm tra phân bổ FIFO."}</p>
                  </div>
                </div>

                <div className="ss-preview-stats">
                  <div>
                    <span>Tổng cần xuất</span>
                    <strong>{summary.totalRequired ?? 0}</strong>
                  </div>

                  <div>
                    <span>Có thể xuất</span>
                    <strong className="ss-value-green">
                      {summary.totalAvailable ?? 0}
                    </strong>
                  </div>

                  <div>
                    <span>Số lượng thiếu</span>
                    <strong className="ss-value-red">
                      {summary.totalShortage ?? 0}
                    </strong>
                  </div>

                  <div>
                    <span>Dòng đủ điều kiện</span>
                    <strong>{summary.eligibleItems ?? 0}</strong>
                  </div>
                </div>

                <div className="ss-detail-title">
                  <h3>Chi tiết sản phẩm</h3>
                  <span>{items.length} dòng</span>
                </div>

                <div className="ss-preview-list">
                  {items.map((item, index) => (
                    <article
                      className="ss-preview-card"
                      key={`${item.itemId || item.productId || "item"}-${item.modelId || index}`}
                    >
                      <div className="ss-preview-card-header">
                        <div>
                          <span>SẢN PHẨM {index + 1}</span>

                          <strong>
                            {item.productTitle ||
                              item.itemName ||
                              item.productName ||
                              "Sản phẩm"}
                          </strong>

                          <small>
                            Biến thể:{" "}
                            {item.variantName || item.variantCode || "--"}
                          </small>

                          {item.productCode ? (
                            <small>Mã sản phẩm: {item.productCode}</small>
                          ) : null}
                        </div>

                        <span
                          className={`ss-item-badge ${
                            item.canDeduct ? "is-success" : "is-danger"
                          }`}
                        >
                          {item.canDeduct ? "Đủ hàng" : "Chưa đủ điều kiện"}
                        </span>
                      </div>

                      <div className="ss-item-quantities">
                        <div>
                          <span>Cần xuất</span>
                          <strong>
                            {item.needDeduct ?? item.requiredQty ?? 0}
                          </strong>
                        </div>

                        <div>
                          <span>Tồn vật lý</span>
                          <strong>{item.physicalQty ?? "--"}</strong>
                        </div>

                        <div>
                          <span>Đang giữ</span>
                          <strong>{item.reservedQty ?? 0}</strong>
                        </div>

                        <div>
                          <span>Đã giữ cho đơn</span>
                          <strong>{item.ownReserved ?? 0}</strong>
                        </div>

                        <div>
                          <span>Đã xuất</span>
                          <strong>{item.alreadyDeducted ?? 0}</strong>
                        </div>

                        <div>
                          <span>Còn thiếu</span>
                          <strong className="ss-value-red">
                            {item.shortage ?? 0}
                          </strong>
                        </div>
                      </div>

                      {item.reason ? (
                        <div className="ss-item-reason">
                          <AlertTriangle size={15} />
                          {item.reason}
                        </div>
                      ) : null}

                      {Array.isArray(item.batches) &&
                      item.batches.length > 0 ? (
                        <div className="ss-allocation">
                          <div className="ss-allocation-heading">
                            <Boxes size={16} />
                            Phân bổ lô FIFO
                          </div>

                          <div className="ss-table-scroll">
                            <table className="ss-table">
                              <thead>
                                <tr>
                                  <th>Mã lô</th>
                                  <th>Ngày nhập</th>
                                  <th>Tồn lô</th>
                                  <th>Số lượng xuất</th>
                                  <th>Giá vốn / đơn vị</th>
                                  <th>Thành tiền</th>
                                </tr>
                              </thead>

                              <tbody>
                                {item.batches.map((batch, batchIndex) => (
                                  <tr key={batch.batchId || batchIndex}>
                                    <td>{batch.batchCode || "--"}</td>

                                    <td>{formatDate(batch.importDate)}</td>

                                    <td>{batch.availableQty ?? 0}</td>

                                    <td>{batch.deductQty ?? 0}</td>

                                    <td>{formatCNY(batch.unitCost)}</td>

                                    <td>{formatCNY(batch.costAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}

                      {item.estimatedCost > 0 ? (
                        <div className="ss-item-cost">
                          Giá vốn dự kiến:{" "}
                          <strong>{formatCNY(item.estimatedCost)}</strong>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>

                {summary.estimatedCost > 0 ? (
                  <div className="ss-item-cost ss-total-cost">
                    Tổng giá vốn dự kiến:{" "}
                    <strong>{formatCNY(summary.estimatedCost)}</strong>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <footer className="ss-modal-footer">
            <button
              type="button"
              className="ss-btn ss-btn-outline"
              onClick={closeModal}
              disabled={processing}
            >
              Đóng
            </button>

            <button
              type="button"
              className="ss-btn ss-btn-confirm"
              disabled={
                !preview?.canConfirmDeduction || previewLoading || processing
              }
              onClick={confirmDeduction}
            >
              {processing ? (
                <RefreshCw size={17} className="ss-spin" />
              ) : (
                <ArrowDownToLine size={17} />
              )}

              {processing ? "Đang xuất kho..." : "Xác nhận xuất kho"}
            </button>
          </footer>
        </section>
      </div>
    );
  };

  // ===================================================
  // HISTORY MODAL
  // ===================================================

  const renderHistoryModal = () => {
    if (!selectedOrder || activeModal !== "history") {
      return null;
    }

    const transactions = Array.isArray(detail?.transactions)
      ? detail.transactions
      : [];

    return (
      <div className="ss-modal-backdrop" onClick={closeModal}>
        <section
          className="ss-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ss-history-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="ss-modal-header">
            <div>
              <span>LỊCH SỬ TỒN KHO</span>

              <h2 id="ss-history-title">Giao dịch theo đơn hàng</h2>

              <p>Đơn hàng: {getOrderSn(selectedOrder)}</p>
            </div>

            <button
              type="button"
              className="ss-modal-close"
              onClick={closeModal}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </header>

          <div className="ss-modal-body">
            {detailLoading ? (
              <div className="ss-empty">
                <RefreshCw size={26} className="ss-spin" />

                <strong>Đang tải lịch sử...</strong>
              </div>
            ) : !detail ? (
              <div className="ss-empty">
                <AlertTriangle size={26} />

                <strong>Không có dữ liệu lịch sử.</strong>
              </div>
            ) : (
              <>
                <div className="ss-preview-stats">
                  <div>
                    <span>Trạng thái kho</span>
                    <strong>
                      {stockStatusLabels[detail.stockStatus] ||
                        detail.stockStatus ||
                        "pending"}
                    </strong>
                  </div>

                  <div>
                    <span>Đã xuất kho</span>
                    <strong>{detail.stockDeducted ? "Có" : "Chưa"}</strong>
                  </div>

                  <div>
                    <span>Đã nhập hàng hoàn</span>
                    <strong>{detail.returnedQty ?? 0}</strong>
                  </div>

                  <div>
                    <span>Số giao dịch</span>
                    <strong>{transactions.length}</strong>
                  </div>
                </div>

                {transactions.length === 0 ? (
                  <div className="ss-empty">
                    <History size={26} />

                    <strong>Đơn hàng chưa có giao dịch kho.</strong>
                  </div>
                ) : (
                  <div className="ss-preview-list">
                    {transactions.map((transaction, index) => (
                      <article
                        className="ss-preview-card"
                        key={transaction._id || index}
                      >
                        <div className="ss-preview-card-header">
                          <div>
                            <span>{formatDate(transaction.createdAt)}</span>

                            <strong>
                              {transactionLabels[transaction.kind] ||
                                transaction.kind ||
                                "Giao dịch kho"}
                            </strong>

                            <small>
                              Mã giao dịch: {transaction._id || "--"}
                            </small>
                          </div>

                          <span className="ss-item-badge is-success">
                            {transaction.status || "completed"}
                          </span>
                        </div>

                        <div className="ss-item-quantities">
                          <div>
                            <span>Tổng số lượng</span>
                            <strong>{transaction.totalQty ?? 0}</strong>
                          </div>

                          <div>
                            <span>Số dòng phân bổ</span>
                            <strong>
                              {transaction.allocations?.length || 0}
                            </strong>
                          </div>
                        </div>

                        {transaction.note ? (
                          <div className="ss-item-reason">
                            {transaction.note}
                          </div>
                        ) : null}

                        {transaction.allocations?.length > 0 ? (
                          <div className="ss-table-scroll">
                            <table className="ss-table">
                              <thead>
                                <tr>
                                  <th>Mã lô</th>
                                  <th>Biến thể</th>
                                  <th>Số lượng</th>
                                  <th>Giá vốn</th>
                                </tr>
                              </thead>

                              <tbody>
                                {transaction.allocations.map(
                                  (allocation, allocationIndex) => (
                                    <tr
                                      key={
                                        allocation._id ||
                                        allocation.batchId ||
                                        allocationIndex
                                      }
                                    >
                                      <td>
                                        {allocation.batchCode ||
                                          allocation.batchId ||
                                          "--"}
                                      </td>

                                      <td>
                                        {allocation.variantName ||
                                          allocation.variantCode ||
                                          "--"}
                                      </td>

                                      <td>{allocation.qty ?? 0}</td>

                                      <td>{formatCNY(allocation.unitCost)}</td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <footer className="ss-modal-footer">
            <button
              type="button"
              className="ss-btn ss-btn-outline"
              onClick={closeModal}
            >
              Đóng
            </button>
          </footer>
        </section>
      </div>
    );
  };

  // ===================================================
  // MAIN RENDER
  // ===================================================

  return (
    <div className="shopee-stock-page">
      <header className="ss-page-header">
        <div>
          <div className="ss-breadcrumb">
            QUẢN LÝ SHOPEE <span>/</span> QUẢN LÝ KHO
          </div>

          <h1>Xuất kho Shopee</h1>

          <p>
            Theo dõi đơn hàng, giữ tồn kho, kiểm tra FIFO và xác nhận xuất kho.
          </p>
        </div>

        <button
          type="button"
          className="ss-btn ss-btn-outline"
          onClick={() => load(pagination.page)}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "ss-spin" : ""} />
          Làm mới
        </button>
      </header>

      {/* QUY TRÌNH KHO */}

      <div className="ss-notice">
        <div className="ss-notice-icon">
          <AlertTriangle size={19} />
        </div>

        <div>
          <strong>Quy trình giữ kho và xuất kho</strong>

          <p>
            READY_TO_SHIP / PROCESSED: giữ tồn kho. SHIPPED: tiếp tục giữ hàng,
            chưa trừ tồn vật lý. COMPLETED: được xác nhận xuất kho FIFO.
            CANCELLED: giải phóng phần hàng đã giữ.
          </p>
        </div>
      </div>

      {/* ALERT */}

      {error ? (
        <div className="ss-alert ss-alert-error">
          <XCircle size={18} />
          <span>{error}</span>

          <button type="button" onClick={() => setError("")} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="ss-alert ss-alert-success">
          <CheckCircle2 size={18} />
          <span>{notice}</span>

          <button type="button" onClick={() => setNotice("")} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {/* STATISTICS */}

      <section className="ss-stats">
        <div className="ss-stat-card">
          <div className="ss-stat-icon ss-purple">
            <ClipboardList size={21} />
          </div>

          <div>
            <span>Đơn cần xử lý</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="ss-stat-card">
          <div className="ss-stat-icon ss-blue">
            <Package size={21} />
          </div>

          <div>
            <span>Dòng sản phẩm trên trang</span>
            <strong>{stats.totalItems}</strong>
          </div>
        </div>

        <div className="ss-stat-card">
          <div className="ss-stat-icon ss-orange">
            <Boxes size={21} />
          </div>

          <div>
            <span>Đơn đang giữ hàng</span>
            <strong>{stats.ready}</strong>
          </div>
        </div>

        <div className="ss-stat-card">
          <div className="ss-stat-icon ss-orange">
            <AlertTriangle size={21} />
          </div>

          <div>
            <span>Đơn cần kiểm tra</span>
            <strong>{stats.blocked}</strong>
          </div>
        </div>
      </section>

      {/* FILTERS */}

      <section className="ss-filter-card">
        <div className="ss-filter-title">
          <div>
            <h3>Danh sách đơn hàng cần xử lý</h3>

            <p>
              Lọc theo gian hàng, trạng thái đơn, trạng thái kho hoặc từ khóa.
            </p>
          </div>

          <span className="ss-count">
            {filteredOrders.length} đơn trên trang
          </span>
        </div>

        <div className="ss-filter-controls">
          <div className="ss-field">
            <label htmlFor="ss-shop">Gian hàng Shopee</label>

            <div className="ss-input-wrap">
              <Store size={17} />

              <select
                id="ss-shop"
                value={shopId}
                onChange={(event) => setShopId(event.target.value)}
              >
                <option value="">Đang chọn gian hàng...</option>
                {shops.map((shop) => {
                  const id = getShopId(shop);

                  return (
                    <option key={id} value={id}>
                      {getShopName(shop)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="ss-field">
            <label htmlFor="ss-order-status">Trạng thái đơn</label>

            <select
              id="ss-order-status"
              value={orderStatus}
              onChange={(event) => setOrderStatus(event.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="READY_TO_SHIP">Chờ bàn giao</option>
              <option value="PROCESSED">Đã xử lý</option>
              <option value="SHIPPED">Đang vận chuyển</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="TO_RETURN">Đang yêu cầu trả hàng</option>
              <option value="RETURNED">Đã hoàn hàng</option>
            </select>
          </div>

          <div className="ss-field">
            <label htmlFor="ss-stock-status">Trạng thái kho</label>

            <select
              id="ss-stock-status"
              value={stockStatus}
              onChange={(event) => setStockStatus(event.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ xử lý</option>
              <option value="ready">Đang giữ hàng</option>
              <option value="partially_deducted">Đã xuất một phần</option>
              <option value="unmapped">Chưa ánh xạ SKU</option>
              <option value="blocked">Không đủ tồn kho</option>
            </select>
          </div>

          <div className="ss-field ss-search-field">
            <label htmlFor="ss-keyword">Tìm đơn hàng</label>

            <div className="ss-input-wrap">
              <Search size={17} />

              <input
                id="ss-keyword"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    load(1);
                  }
                }}
                placeholder="Mã đơn, username hoặc người nhận..."
              />
            </div>
          </div>

          <button
            type="button"
            className="ss-btn ss-btn-primary ss-search-button"
            onClick={() => load(1)}
            disabled={loading}
          >
            <Search size={17} />
            Tìm kiếm
          </button>
        </div>
      </section>

      {/* ORDER LIST */}

      <section className="ss-order-section">
        {loading ? (
          <div className="ss-empty">
            <RefreshCw size={26} className="ss-spin" />

            <strong>Đang tải đơn hàng...</strong>

            <span>Vui lòng chờ trong giây lát.</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="ss-empty">
            <div className="ss-empty-icon">
              <ClipboardList size={30} />
            </div>

            <strong>Không có đơn hàng cần xử lý</strong>

            <span>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span>
          </div>
        ) : (
          <div className="ss-order-grid">
            {filteredOrders.map(renderOrderCard)}
          </div>
        )}

        {pagination.totalPages > 1 ? (
          <div className="ss-pagination">
            <button
              type="button"
              className="ss-btn ss-btn-outline"
              disabled={loading || pagination.page <= 1}
              onClick={() => load(pagination.page - 1)}
            >
              Trang trước
            </button>

            <span>
              Trang {pagination.page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              className="ss-btn ss-btn-outline"
              disabled={loading || pagination.page >= pagination.totalPages}
              onClick={() => load(pagination.page + 1)}
            >
              Trang sau
            </button>
          </div>
        ) : null}
      </section>

      {renderPreviewModal()}
      {renderHistoryModal()}
      {renderOrderModal()}
    </div>
  );
}
