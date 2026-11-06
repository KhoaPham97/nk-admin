import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Search,
  History,
  RefreshCw,
  Package,
  ArrowUpFromLine,
  RotateCcw,
  Store,
  X,
  Clock3,
  Boxes,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

import { shopeeApi } from "../../services/shopeeApi";
import "./shopee-components.css";
import "./ShopeeStockHistory.css";

// =====================================================
// HELPERS
// =====================================================

function extractArray(response, keys = []) {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }

  if (response.data) {
    const result = extractArray(response.data, keys);
    if (result.length) return result;
  }

  if (response.result) {
    const result = extractArray(response.result, keys);
    if (result.length) return result;
  }

  return [];
}

function getShopId(shop) {
  const id =
    shop?.shopId ??
    shop?.shop_id ??
    shop?.shop?.shopId ??
    shop?.shop?.shop_id ??
    shop?.shopInfo?.shop_id;

  return id == null ? "" : String(id);
}

function getShopName(shop) {
  return (
    shop?.shopName ||
    shop?.shop_name ||
    shop?.shop?.shop_name ||
    shop?.shopInfo?.shop_name ||
    `Gian hàng ${getShopId(shop)}`
  );
}

function formatDate(value) {
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
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "--";

  return number.toLocaleString("vi-VN");
}

function getTransactionLabel(kind) {
  const labels = {
    order_reserve: "Giữ hàng",
    order_release: "Giải phóng giữ hàng",
    order_export: "Xuất kho FIFO",
    order_export_adjustment: "Điều chỉnh xuất kho",
    return_import: "Nhập hàng hoàn",
    return_adjustment: "Điều chỉnh hàng hoàn",
  };

  return labels[kind] || kind || "Không xác định";
}

function getTransactionClass(kind) {
  if (kind === "order_reserve") return "reserve";
  if (kind === "order_release") return "release";

  if (kind === "order_export" || kind === "order_export_adjustment") {
    return "export";
  }

  if (kind === "return_import" || kind === "return_adjustment") {
    return "return";
  }

  return "default";
}

function getHistoryQty(item) {
  return Number(item?.qty ?? item?.quantity ?? 0);
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Không thể tải lịch sử kho Shopee."
  );
}

// =====================================================
// COMPONENT
// =====================================================

export default function ShopeeStockHistory() {
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");

  // Bộ lọc
  const [orderSn, setOrderSn] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Dữ liệu
  const [transactions, setTransactions] = useState([]);
  const [inventoryHistory, setInventoryHistory] = useState([]);

  // Trạng thái
  const [shopsLoading, setShopsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  // Phân trang
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // ===================================================
  // LOAD SHOPS
  // ===================================================

  const loadShops = useCallback(async () => {
    setShopsLoading(true);
    setError("");

    try {
      const response = await shopeeApi.getShops();

      const list = extractArray(response, ["shops", "shopList", "results"]);

      const validShops = list.filter((shop) => getShopId(shop));

      setShops(validShops);

      setShopId((current) => {
        if (current && validShops.some((shop) => getShopId(shop) === current)) {
          return current;
        }

        return validShops.length === 1 ? getShopId(validShops[0]) : "";
      });
    } catch (e) {
      console.error("[Shopee Stock History] Load shops:", e);

      setError(getErrorMessage(e));
      setShops([]);
      setShopId("");
    } finally {
      setShopsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  // ===================================================
  // LOAD ALL TRANSACTIONS
  // ===================================================

  const loadTransactions = useCallback(
    async (nextPage = 1) => {
      if (!shopId) {
        setTransactions([]);
        setInventoryHistory([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = {
          shopId,
          page: nextPage,
          limit: 50,
        };

        // Mã đơn là tùy chọn
        if (orderSn.trim()) {
          params.orderSn = orderSn.trim();
        }

        if (kind) params.kind = kind;
        if (status) params.status = status;
        if (from) params.from = from;
        if (to) params.to = to;

        const response = await shopeeApi.getStockTransactions(params);

        const list = extractArray(response, ["transactions"]);

        const paginationData =
          response?.pagination || response?.data?.pagination;

        setTransactions(list);

        setPagination(
          paginationData || {
            page: nextPage,
            limit: 50,
            total: list.length,
            totalPages: 1,
          },
        );

        // Chi tiết allocations của giao dịch.
        const details = list.flatMap((transaction) => {
          const allocations = Array.isArray(transaction.allocations)
            ? transaction.allocations
            : [];

          return allocations.map((allocation) => ({
            ...allocation,
            _id:
              allocation._id ||
              `${transaction._id}-${allocation.batchId || allocation.batchCode}`,
            createdAt: transaction.createdAt,
            orderSn: transaction.orderSn,
            transactionKind: transaction.kind,
            productTitle:
              allocation.productTitle ||
              allocation.productName ||
              transaction.productTitle ||
              "--",
            qty: allocation.qty ?? allocation.quantity,
          }));
        });

        setInventoryHistory(details);
        setPage(nextPage);
        setSearched(true);
      } catch (e) {
        console.error("[Shopee Stock History] Load:", e);

        setError(getErrorMessage(e));
        setTransactions([]);
        setInventoryHistory([]);
        setPagination({
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        });
        setSearched(true);
      } finally {
        setLoading(false);
      }
    },
    [shopId, orderSn, kind, status, from, to],
  );

  // Tự động tải khi chọn shop.
  useEffect(() => {
    if (!shopsLoading && shopId) {
      loadTransactions(1);
    }
  }, [shopsLoading, shopId, loadTransactions]);

  // ===================================================
  // ACTIONS
  // ===================================================

  const handleSearch = (event) => {
    event?.preventDefault?.();
    loadTransactions(1);
  };

  const handleClearFilters = () => {
    setOrderSn("");
    setKind("");
    setStatus("");
    setFrom("");
    setTo("");
  };

  const handleShopChange = (value) => {
    setShopId(value);
    setTransactions([]);
    setInventoryHistory([]);
    setSearched(false);
    setError("");
    setPage(1);
  };

  // ===================================================
  // SUMMARY
  // ===================================================

  const summary = useMemo(() => {
    const sumQty = (transactionKind) =>
      transactions
        .filter((item) => item.kind === transactionKind)
        .reduce((sum, item) => sum + Number(item.totalQty || 0), 0);

    return {
      transactions: pagination.total || 0,
      reserveQty: sumQty("order_reserve"),
      exportQty: sumQty("order_export"),
      returnQty: sumQty("return_import"),
      history: inventoryHistory.length,
    };
  }, [transactions, inventoryHistory, pagination.total]);

  const selectedShop = shops.find((shop) => getShopId(shop) === shopId);

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <section className="sc-section sh-history">
      {/* HEADER */}
      <div className="sh-history-header">
        <div className="sh-history-heading">
          <div className="sh-history-icon">
            <History size={23} />
          </div>

          <div>
            <h3>Lịch sử giao dịch kho Shopee</h3>
            <p>
              Xem toàn bộ lịch sử giữ hàng, xuất kho FIFO, giải phóng hàng và
              tiếp nhận hàng hoàn.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="sc-btn sc-btn-light"
          onClick={() => loadTransactions(page)}
          disabled={loading || !shopId}
        >
          <RefreshCw size={16} className={loading ? "sh-spinning" : ""} />
          Làm mới
        </button>
      </div>

      {/* FILTERS */}
      <form className="sh-history-search" onSubmit={handleSearch}>
        <label className="sh-history-field">
          <span>
            <Store size={15} />
            Gian hàng Shopee
          </span>

          <select
            value={shopId}
            disabled={shopsLoading || shops.length === 0}
            onChange={(e) => handleShopChange(e.target.value)}
          >
            <option value="">
              {shopsLoading
                ? "Đang tải gian hàng..."
                : shops.length
                  ? "Chọn gian hàng"
                  : "Chưa có gian hàng kết nối"}
            </option>

            {shops.map((shop) => {
              const id = getShopId(shop);

              return (
                <option key={id} value={id}>
                  {getShopName(shop)}
                </option>
              );
            })}
          </select>
        </label>

        <label className="sh-history-field">
          <span>
            <Search size={15} />
            Mã đơn (không bắt buộc)
          </span>

          <input
            value={orderSn}
            onChange={(e) => setOrderSn(e.target.value)}
            placeholder="Tìm theo mã đơn Shopee..."
          />
        </label>

        <label className="sh-history-field">
          <span>
            <Filter size={15} />
            Loại giao dịch
          </span>

          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Tất cả giao dịch</option>
            <option value="order_reserve">Giữ hàng</option>
            <option value="order_release">Giải phóng giữ hàng</option>
            <option value="order_export">Xuất kho FIFO</option>
            <option value="return_import">Nhập hàng hoàn</option>
            <option value="return_adjustment">Điều chỉnh hàng hoàn</option>
          </select>
        </label>

        <label className="sh-history-field">
          <span>Trạng thái</span>

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="completed">Hoàn tất</option>
            <option value="pending">Đang xử lý</option>
            <option value="failed">Thất bại</option>
          </select>
        </label>

        <label className="sh-history-field">
          <span>Từ ngày</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>

        <label className="sh-history-field">
          <span>Đến ngày</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>

        <div className="sh-history-search-actions">
          <button
            type="submit"
            className="sc-btn sc-btn-primary"
            disabled={loading || shopsLoading || !shopId}
          >
            {loading ? (
              <RefreshCw size={16} className="sh-spinning" />
            ) : (
              <Search size={16} />
            )}
            Tìm kiếm
          </button>

          <button
            type="button"
            className="sc-btn sc-btn-light"
            onClick={handleClearFilters}
            disabled={loading}
            title="Xóa bộ lọc"
          >
            <X size={16} />
            Xóa lọc
          </button>
        </div>
      </form>

      {/* SELECTED SHOP */}
      {selectedShop && (
        <div className="sh-history-shop-info">
          <Store size={15} />
          Gian hàng:
          <strong>{getShopName(selectedShop)}</strong>
          <span>({shopId})</span>
          <span className="sh-history-all-label">
            {orderSn.trim()
              ? `Lọc đơn ${orderSn.trim()}`
              : "Đang xem toàn bộ giao dịch"}
          </span>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="sc-alert sc-alert-error sh-history-alert">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {/* NO SHOP */}
      {!shopsLoading && shops.length === 0 && (
        <div className="sh-history-empty">
          <Store size={32} />
          <strong>Chưa có gian hàng Shopee</strong>
          <p>Hãy kết nối gian hàng Shopee trước khi xem lịch sử kho.</p>
        </div>
      )}

      {/* SUMMARY */}
      {shopId && (
        <div className="sh-history-summary">
          <div className="sh-summary-card">
            <div className="sh-summary-icon neutral">
              <History size={19} />
            </div>
            <div>
              <span>Tổng giao dịch</span>
              <strong>{formatNumber(summary.transactions)}</strong>
            </div>
          </div>

          <div className="sh-summary-card">
            <div className="sh-summary-icon reserve">
              <Package size={19} />
            </div>
            <div>
              <span>Giữ hàng</span>
              <strong>{formatNumber(summary.reserveQty)}</strong>
            </div>
          </div>

          <div className="sh-summary-card">
            <div className="sh-summary-icon export">
              <ArrowUpFromLine size={19} />
            </div>
            <div>
              <span>Xuất kho</span>
              <strong>{formatNumber(summary.exportQty)}</strong>
            </div>
          </div>

          <div className="sh-summary-card">
            <div className="sh-summary-icon returned">
              <RotateCcw size={19} />
            </div>
            <div>
              <span>Nhập hoàn</span>
              <strong>{formatNumber(summary.returnQty)}</strong>
            </div>
          </div>

          <div className="sh-summary-card">
            <div className="sh-summary-icon neutral">
              <Boxes size={19} />
            </div>
            <div>
              <span>Chi tiết lô trang này</span>
              <strong>{formatNumber(summary.history)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS */}
      <div className="sh-history-section">
        <div className="sh-history-section-heading">
          <div>
            <h4>
              <History size={18} />
              Giao dịch Shopee
            </h4>
            <p>Các lần giữ hàng, giải phóng, xuất kho và nhập hàng hoàn.</p>
          </div>

          <span className="sh-history-count">
            {transactions.length} / {formatNumber(pagination.total)} giao dịch
          </span>
        </div>
        <div className="sc-table-wrap sh-history-table-wrap">
          <table className="sc-table sh-history-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Loại giao dịch</th>
                <th>Mã đơn</th>
                <th>Số lượng</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="sc-table-empty">
                    Đang tải lịch sử...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="sc-table-empty">
                    {searched
                      ? "Không tìm thấy giao dịch phù hợp."
                      : "Chọn gian hàng để tải toàn bộ lịch sử."}
                  </td>
                </tr>
              ) : (
                transactions.map((item, index) => (
                  <tr key={item._id || index}>
                    <td className="sh-date-cell">
                      <Clock3 size={14} />
                      {formatDate(item.createdAt || item.created_at)}
                    </td>

                    <td>
                      <span
                        className={`sh-transaction-type ${getTransactionClass(
                          item.kind || item.type,
                        )}`}
                      >
                        {getTransactionLabel(item.kind || item.type)}
                      </span>
                    </td>

                    <td>
                      <strong>{item.orderSn || "--"}</strong>
                      {item.returnSn && (
                        <small className="sh-cell-sub">
                          Mã hoàn: {item.returnSn}
                        </small>
                      )}
                    </td>

                    <td>
                      <strong className="sh-qty-value">
                        {formatNumber(item.totalQty ?? item.quantity)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`sh-transaction-status ${
                          item.status === "completed"
                            ? "success"
                            : item.status === "failed"
                              ? "failed"
                              : "pending"
                        }`}
                      >
                        {item.status === "completed"
                          ? "Hoàn tất"
                          : item.status === "failed"
                            ? "Thất bại"
                            : item.status || "Không rõ"}
                      </span>
                    </td>

                    <td className="sh-note-cell">{item.note || "--"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* PAGINATION */}
        <div className="history-pagination-info">
          <span className="history-pagination-text">
            Hiển thị <strong>{transactions.length}</strong> /{" "}
            <strong>{pagination.total}</strong> giao dịch
          </span>

          <span className="history-page-indicator">
            Trang {pagination.page} / {pagination.totalPages || 1}
          </span>

          <div className="history-pagination-actions">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => loadTransactions(page - 1)}
            >
              <ChevronLeft size={16} />
              Trước
            </button>

            <button
              type="button"
              disabled={loading || page >= (pagination.totalPages || 1)}
              onClick={() => loadTransactions(page + 1)}
            >
              Sau
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* INVENTORY ALLOCATIONS */}
      <div className="sh-history-section">
        <div className="sh-history-section-heading">
          <div>
            <h4>
              <Boxes size={18} />
              Chi tiết phân bổ lô FIFO
            </h4>
            <p>
              Các lô hàng được ghi nhận trong những giao dịch ở trang hiện tại.
            </p>
          </div>

          <span className="sh-history-count">
            {inventoryHistory.length} bản ghi
          </span>
        </div>

        <div className="sc-table-wrap sh-history-table-wrap">
          <table className="sc-table sh-history-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Mã đơn</th>
                <th>Sản phẩm</th>
                <th>Biến thể</th>
                <th>Mã lô</th>
                <th>Loại giao dịch</th>
                <th>Số lượng phân bổ</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="sc-table-empty">
                    Đang tải chi tiết...
                  </td>
                </tr>
              ) : inventoryHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="sc-table-empty">
                    Chưa có chi tiết phân bổ lô trong các giao dịch này.
                  </td>
                </tr>
              ) : (
                inventoryHistory.map((item, index) => {
                  const qty = getHistoryQty(item);

                  return (
                    <tr key={item._id || index}>
                      <td className="sh-date-cell">
                        {formatDate(item.createdAt)}
                      </td>

                      <td>
                        <strong>{item.orderSn || "--"}</strong>
                      </td>

                      <td>
                        <strong>{item.productTitle || "--"}</strong>
                      </td>

                      <td>{item.variantName || "--"}</td>

                      <td>
                        <span className="sh-batch-code">
                          {item.batchCode || "--"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`sh-transaction-type ${getTransactionClass(
                            item.transactionKind,
                          )}`}
                        >
                          {getTransactionLabel(item.transactionKind)}
                        </span>
                      </td>

                      <td>
                        <strong
                          className={
                            qty < 0 ? "sh-qty-negative" : "sh-qty-positive"
                          }
                        >
                          {qty > 0 ? "+" : ""}
                          {formatNumber(qty)}
                        </strong>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
