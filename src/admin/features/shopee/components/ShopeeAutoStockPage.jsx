import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  RefreshCw,
  Play,
  Search,
  PackageCheck,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings2,
  History,
  Boxes,
  CalendarClock,
} from "lucide-react";

import shopeeApi from "../../../services/shopeeApi";
import "../styles/ShopeeAutoStockPage.css";
import { getStatusLabel, getStockLabel } from "../../../common/CommonFunc";

export default function ShopeeAutoStockPage() {
  // =====================================================
  // STATE
  // =====================================================

  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("eligible");
  const [activeTab, setActiveTab] = useState("orders");

  const [historyKeyword, setHistoryKeyword] = useState("");
  const [historyResultFilter, setHistoryResultFilter] = useState("success");
  const [historyView, setHistoryView] = useState("orders");
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  const [autoSettings, setAutoSettings] = useState({
    enabled: false,
    intervalMinutes: 5,
    lastRunAt: null,
  });

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(5);

  const [message, setMessage] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  // =====================================================
  // HELPERS
  // =====================================================

  const normalizeStatus = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour12: false,
    });
  };

  const formatDuration = (value) => {
    const ms = Number(value);

    if (!Number.isFinite(ms) || ms < 0) return "—";
    if (ms < 1000) return `${ms} ms`;

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes} phút ${remainSeconds} giây`;
    }

    return `${(ms / 1000).toFixed(1)} giây`;
  };

  const getStockStatus = (status) => {
    const map = {
      pending: ["Chờ xử lý", "muted"],
      ready: ["Sẵn sàng", "blue"],
      unmapped: ["Chưa ánh xạ SKU", "amber"],
      partially_deducted: ["Đã trừ một phần", "amber"],
      deducted: ["Đã trừ kho", "green"],
      blocked: ["Bị chặn", "red"],
      failed: ["Thất bại", "red"],
    };

    return map[normalizeStatus(status)] || [status || "Chưa rõ", "muted"];
  };

  const getResultStatus = (status) => {
    const map = {
      success: ["Thành công", "green"],
      skipped: ["Bỏ qua", "amber"],
      failed: ["Thất bại", "red"],
      partial: ["Một phần", "blue"],
    };

    return (
      map[normalizeStatus(status)] || [status || "Không xác định", "muted"]
    );
  };

  const getHistoryStatus = (item) => {
    const success = Number(item.successCount || 0);
    const failed = Number(item.failedCount || 0);
    const skipped = Number(item.skippedCount || 0);
    const partial = Number(item.partialCount || 0);
    const status = normalizeStatus(item.status);

    if (status === "running") {
      return { label: "Đang chạy", tone: "blue" };
    }

    if (success > 0 && (failed > 0 || skipped > 0 || partial > 0)) {
      return { label: "Một phần", tone: "amber" };
    }

    if (success === 0 && failed > 0) {
      return { label: "Thất bại", tone: "red" };
    }

    if (success === 0 && skipped > 0) {
      return { label: "Bỏ qua", tone: "muted" };
    }

    if (status === "partial") {
      return { label: "Một phần", tone: "amber" };
    }

    if (status === "failed") {
      return { label: "Thất bại", tone: "red" };
    }

    if (status === "skipped") {
      return { label: "Bỏ qua", tone: "muted" };
    }

    if (status === "completed") {
      return { label: "Hoàn tất", tone: "green" };
    }

    return {
      label: item.status || "Không xác định",
      tone: "muted",
    };
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadAutoStockData = useCallback(async () => {
    setLoading(true);

    try {
      const [ordersRes, historyRes, settingsRes] = await Promise.all([
        shopeeApi.getAutoStockOrders({ limit: 100 }),
        shopeeApi.getAutoStockHistory({ limit: 50 }),
        shopeeApi.getAutoStockSettings(),
      ]);

      const orderList = Array.isArray(ordersRes?.orders)
        ? ordersRes.orders
        : [];

      const historyList = Array.isArray(historyRes?.history)
        ? historyRes.history
        : [];

      const settings = {
        enabled: !!settingsRes?.settings?.enabled,
        intervalMinutes: Number(settingsRes?.settings?.intervalMinutes) || 5,
        lastRunAt: settingsRes?.settings?.lastRunAt || null,
      };

      setOrders(
        orderList.map((order) => ({
          ...order,
          status: order.status || order.orderStatus,
          orderSn: order.orderSn,
          stockStatus: order.stockStatus || "pending",
        })),
      );

      setHistory(historyList);
      setAutoSettings(settings);
      setAutoEnabled(settings.enabled);
      setIntervalMinutes(settings.intervalMinutes);
    } catch (error) {
      console.error("[Shopee Auto Stock] Load error:", error);

      showMessage(
        "error",
        error.message || "Không thể tải dữ liệu từ Backend.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAutoStockData();
  }, [loadAutoStockData]);

  // =====================================================
  // ORDER FILTER
  // =====================================================

  const eligibleOrders = useMemo(() => {
    return orders;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return orders.filter((order) => {
      const status = normalizeStatus(order.status);
      const stockStatus = normalizeStatus(order.stockStatus);

      const eligible = status === "completed" && stockStatus === "ready";

      if (filter === "eligible" && !eligible) return false;

      if (
        filter === "failed" &&
        !["blocked", "failed", "unmapped", "partially_deducted"].includes(
          stockStatus,
        )
      ) {
        return false;
      }

      if (filter === "deducted" && stockStatus !== "deducted") {
        return false;
      }

      return (
        !q ||
        String(order.orderSn || "")
          .toLowerCase()
          .includes(q) ||
        String(order.shopName || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [orders, keyword, filter]);

  const selectedEligible = selected.filter((orderSn) =>
    eligibleOrders.some((order) => order.orderSn === orderSn),
  );

  const selectableVisibleOrders = visibleOrders.filter(
    (order) =>
      normalizeStatus(order.status) === "completed" &&
      normalizeStatus(order.stockStatus) === "ready",
  );

  const allSelected =
    selectableVisibleOrders.length > 0 &&
    selectableVisibleOrders.every((order) => selected.includes(order.orderSn));

  // =====================================================
  // SELECT ORDERS
  // =====================================================

  const toggleOne = (orderSn) => {
    setSelected((current) =>
      current.includes(orderSn)
        ? current.filter((item) => item !== orderSn)
        : [...current, orderSn],
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      const ids = new Set(
        selectableVisibleOrders.map((order) => order.orderSn),
      );

      setSelected((current) => current.filter((orderSn) => !ids.has(orderSn)));
    } else {
      setSelected((current) =>
        Array.from(
          new Set([
            ...current,
            ...selectableVisibleOrders.map((order) => order.orderSn),
          ]),
        ),
      );
    }
  };

  // =====================================================
  // PROCESS SELECTED
  // =====================================================

  const handleProcessSelected = async () => {
    if (!selectedEligible.length || processing) return;

    const confirmed = window.confirm(
      `Bạn muốn xử lý trừ kho ${selectedEligible.length} đơn Shopee?`,
    );

    if (!confirmed) return;

    setProcessing(true);
    setMessage(null);

    try {
      const result = await shopeeApi.processAutoStockSelected(selectedEligible);

      const success = result?.successCount ?? result?.success ?? 0;
      const failed = result?.failedCount ?? result?.failed ?? 0;

      showMessage(
        failed > 0 ? "error" : "success",
        result?.message ||
          `Thành công: ${success} đơn. Thất bại: ${failed} đơn.`,
      );

      setSelected([]);
      await loadAutoStockData();
    } catch (error) {
      console.error("[Shopee Auto Stock] Process error:", error);
      showMessage("error", error.message || "Xử lý đơn hàng thất bại.");
    } finally {
      setProcessing(false);
    }
  };

  // =====================================================
  // SAVE SETTINGS
  // =====================================================

  const handleSaveSettings = async () => {
    if (saving) return;

    setSaving(true);
    setMessage(null);

    try {
      const result = await shopeeApi.saveAutoStockSettings({
        enabled: autoEnabled,
        intervalMinutes,
      });

      const settings = result?.settings || {
        ...autoSettings,
        enabled: autoEnabled,
        intervalMinutes,
      };

      setAutoSettings(settings);
      setAutoEnabled(!!settings.enabled);
      setIntervalMinutes(Number(settings.intervalMinutes) || 5);

      showMessage("success", "Đã lưu cấu hình tự động.");
    } catch (error) {
      console.error("[Shopee Auto Stock] Save settings:", error);
      showMessage("error", error.message || "Không thể lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // RUN NOW
  // =====================================================

  const handleRunNow = async () => {
    if (processing) return;

    setProcessing(true);
    setMessage(null);

    try {
      const result = await shopeeApi.runAutoStockNow();

      if (result?.skipped) {
        showMessage(
          "error",
          result.message || "Job đang được xử lý ở tiến trình khác.",
        );
      } else if (result?.success === false) {
        showMessage("error", result.message || "Không thể chạy Job.");
      } else {
        showMessage(
          "success",
          result?.message ||
            `Đã chạy Job. Thành công: ${
              result?.successCount ?? 0
            }, thất bại: ${result?.failedCount ?? 0}.`,
        );
      }

      await loadAutoStockData();
    } catch (error) {
      console.error("[Shopee Auto Stock] Run error:", error);
      showMessage("error", error.message || "Không thể chạy xử lý tự động.");
    } finally {
      setProcessing(false);
    }
  };

  // =====================================================
  // STATISTICS
  // =====================================================

  const deductedCount = orders.filter(
    (order) => normalizeStatus(order.stockStatus) === "deducted",
  ).length;

  const failedCount = orders.filter((order) =>
    ["blocked", "failed", "unmapped", "partially_deducted"].includes(
      normalizeStatus(order.stockStatus),
    ),
  ).length;

  // =====================================================
  // HISTORY DATA
  // =====================================================

  const historyOrders = useMemo(() => {
    return history.flatMap((item) => {
      const results = Array.isArray(item.results) ? item.results : [];
      const historyId = item._id || item.id || "history";
      const historyDate = item.startedAt || item.processedAt || item.createdAt;

      return results.map((result, index) => ({
        ...result,
        historyId,
        historyTrigger: item.trigger,
        historyStartedAt: historyDate,
        uniqueKey: `${historyId}-${result.orderSn || index}`,
      }));
    });
  }, [history]);

  const visibleHistoryOrders = useMemo(() => {
    const q = historyKeyword.trim().toLowerCase();

    return historyOrders
      .filter((result) => {
        const status = normalizeStatus(result.status);

        if (historyResultFilter !== "all" && status !== historyResultFilter) {
          return false;
        }

        if (!q) return true;

        return (
          String(result.orderSn || "")
            .toLowerCase()
            .includes(q) ||
          String(result.shopName || "")
            .toLowerCase()
            .includes(q) ||
          String(result.shopId || "")
            .toLowerCase()
            .includes(q) ||
          String(result.message || "")
            .toLowerCase()
            .includes(q)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.processedAt || a.historyStartedAt || 0,
        ).getTime();

        const dateB = new Date(
          b.processedAt || b.historyStartedAt || 0,
        ).getTime();

        return dateB - dateA;
      });
  }, [historyOrders, historyKeyword, historyResultFilter]);

  const successfulHistoryCount = historyOrders.filter(
    (result) => normalizeStatus(result.status) === "success",
  ).length;

  const historyRunList = useMemo(() => {
    const q = historyKeyword.trim().toLowerCase();

    return history.filter((item) => {
      const results = Array.isArray(item.results) ? item.results : [];

      if (!q) return true;

      return (
        String(item.trigger || "")
          .toLowerCase()
          .includes(q) ||
        String(item.status || "")
          .toLowerCase()
          .includes(q) ||
        results.some((result) =>
          String(result.orderSn || "")
            .toLowerCase()
            .includes(q),
        )
      );
    });
  }, [history, historyKeyword]);
  const handleOpenOrderDetail = async (orderSn) => {
    if (!orderSn || detailLoading) return;

    setDetailLoading(true);
    setDetailError("");
    setSelectedOrder({ orderSn, loading: true });

    try {
      const result = await shopeeApi.getOrderDetail(orderSn);

      const order =
        result?.order || result?.data?.order || result?.data || result;

      if (!order || typeof order !== "object") {
        throw new Error("Không tìm thấy thông tin đơn hàng.");
      }

      setSelectedOrder({
        ...order,
        orderSn: order.orderSn || orderSn,
      });
    } catch (error) {
      console.error("[Shopee Order Detail]", error);

      setDetailError(error.message || "Không thể tải chi tiết đơn hàng.");
    } finally {
      setDetailLoading(false);
    }
  };
  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="sa-page">
      {selectedOrder && (
        <ShopeeOrderDetailModal
          order={selectedOrder}
          loading={detailLoading}
          error={detailError}
          onClose={() => {
            if (!detailLoading) {
              setSelectedOrder(null);
              setDetailError("");
            }
          }}
        />
      )}
      {/* HEADER */}
      <div className="sa-header">
        <div>
          <div className="sa-eyebrow">QUẢN LÝ SHOPEE</div>
          <h1>Tự động xử lý trừ kho</h1>
          <p>Quản lý đơn Shopee đã hoàn thành nhưng chưa được trừ kho.</p>
        </div>

        <button
          className="sa-btn sa-light"
          onClick={loadAutoStockData}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "sa-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* STATISTICS */}
      <div className="sa-stats">
        <Stat
          icon={<Clock3 />}
          label="Chờ trừ kho"
          value={eligibleOrders.length}
        />

        <Stat
          icon={<CheckCircle2 />}
          label="Đã trừ kho"
          value={deductedCount}
          color="green"
        />

        <Stat
          icon={<AlertTriangle />}
          label="Cần kiểm tra"
          value={failedCount}
          color="amber"
        />

        <Stat icon={<History />} label="Lịch sử xử lý" value={history.length} />
      </div>

      {/* AUTO SETTINGS */}
      <section className="sa-panel">
        <div className="sa-panel-head">
          <div className="sa-title">
            <Settings2 size={19} />

            <div>
              <h2>Tự động xử lý định kỳ</h2>
              <p>
                Chỉ xử lý đơn completed, không tự đổi trạng thái đơn Shopee.
              </p>
            </div>
          </div>

          <label className="sa-switch">
            <input
              type="checkbox"
              checked={autoEnabled}
              onChange={(e) => setAutoEnabled(e.target.checked)}
            />

            <span />
            <b>{autoEnabled ? "Đang bật" : "Đang tắt"}</b>
          </label>
        </div>

        <div className="sa-settings">
          <label>
            <span>Chu kỳ chạy</span>

            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            >
              <option value={1}>1 phút</option>
              <option value={5}>5 phút</option>
              <option value={10}>10 phút</option>
              <option value={15}>15 phút</option>
              <option value={30}>30 phút</option>
              <option value={60}>60 phút</option>
            </select>
          </label>

          <div>
            <span className="sa-muted">Lần chạy gần nhất</span>
            <b>{formatDate(autoSettings.lastRunAt)}</b>
          </div>

          <div className="sa-setting-actions">
            <button
              className="sa-btn sa-light"
              onClick={handleRunNow}
              disabled={processing}
            >
              <Play size={15} />
              {processing ? "Đang xử lý..." : "Chạy ngay"}
            </button>

            <button
              className="sa-btn sa-primary"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </div>
        </div>

        <div className="sa-warning">
          <AlertTriangle size={16} />
          Lịch tự động chạy ở Backend bằng Cron/Job, không phụ thuộc vào việc có
          mở trang Admin hay không.
        </div>
      </section>

      {/* MESSAGE */}
      {message && (
        <div className={`sa-message ${message.type}`}>
          {message.type === "success" ? (
            <CheckCircle2 size={17} />
          ) : (
            <XCircle size={17} />
          )}

          {message.text}

          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* ORDERS / HISTORY */}
      <section className="sa-panel">
        <div className="sa-tabs">
          <button
            className={activeTab === "orders" ? "active" : ""}
            onClick={() => setActiveTab("orders")}
          >
            <Boxes size={16} />
            Đơn hàng
          </button>

          <button
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            <History size={16} />
            Lịch sử xử lý
          </button>
        </div>

        {/* ORDERS TAB */}
        {activeTab === "orders" ? (
          <>
            <div className="sa-toolbar">
              <div>
                <h2>Danh sách đơn Shopee</h2>
                <p>{visibleOrders.length} đơn hàng</p>
              </div>

              <div className="sa-filters">
                <div className="sa-search">
                  <Search size={16} />

                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tìm mã đơn..."
                  />
                </div>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="eligible">Chờ trừ kho</option>
                  <option value="failed">Lỗi / bị chặn</option>
                  <option value="deducted">Đã trừ kho</option>
                  <option value="all">Tất cả đơn</option>
                </select>
              </div>
            </div>

            <div className="sa-bulkbar">
              <label>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                />
                Chọn tất cả đơn đủ điều kiện
              </label>

              <span>
                Đã chọn <b>{selectedEligible.length}</b> đơn đủ điều kiện
              </span>

              <button
                className="sa-btn sa-primary"
                onClick={handleProcessSelected}
                disabled={processing || selectedEligible.length === 0}
              >
                <PackageCheck size={16} />

                {processing
                  ? "Đang xử lý..."
                  : `Xử lý và trừ kho (${selectedEligible.length})`}
              </button>
            </div>

            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Mã đơn Shopee</th>
                    <th>Gian hàng</th>
                    <th>Trạng thái đơn</th>
                    <th>Trạng thái kho</th>
                    <th>Sản phẩm</th>
                    <th>Ngày tạo</th>
                    <th>Thông tin</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleOrders.map((order) => {
                    const [label, tone] = getStockStatus(order.stockStatus);

                    const canSelect =
                      normalizeStatus(order.status) === "completed" &&
                      normalizeStatus(order.stockStatus) === "ready";

                    return (
                      <tr key={order.orderSn}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(order.orderSn)}
                            disabled={!canSelect || processing}
                            onChange={() => toggleOne(order.orderSn)}
                          />
                        </td>

                        <td>
                          <button
                            type="button"
                            className="sa-order-link"
                            onClick={() => handleOpenOrderDetail(order.orderSn)}
                          >
                            {order.orderSn}
                          </button>
                        </td>
                        <td>{order.shopName || "—"}</td>

                        <td>
                          <span className="sa-status neutral">
                            {order.status || "—"}
                          </span>
                        </td>

                        <td>
                          <span className={`sa-status ${tone}`}>{label}</span>
                        </td>

                        <td>
                          {order.itemCount ?? order.items?.length ?? "—"} SP
                          {" / "}
                          {order.totalQty ?? "—"} SL
                        </td>

                        <td>{formatDate(order.createdAt)}</td>

                        <td className="sa-reason">
                          {order.failureReason ||
                            (canSelect ? "Đủ điều kiện xử lý" : "—")}
                        </td>
                      </tr>
                    );
                  })}

                  {!visibleOrders.length && (
                    <tr>
                      <td colSpan="8" className="sa-empty">
                        {loading
                          ? "Đang tải dữ liệu..."
                          : "Không có đơn hàng phù hợp."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* HISTORY TAB */
          <div className="sa-history">
            {/* HISTORY HEADER */}
            <div className="sa-history-toolbar">
              <div>
                <h2>
                  {historyView === "orders"
                    ? "Tra cứu đơn hàng đã xử lý"
                    : "Các lần chạy Auto Stock"}
                </h2>

                <p>
                  {historyView === "orders"
                    ? `${visibleHistoryOrders.length} đơn phù hợp`
                    : `${historyRunList.length} / ${history.length} lần chạy`}
                </p>
              </div>

              <div className="sa-history-filters">
                <div className="sa-search">
                  <Search size={16} />

                  <input
                    value={historyKeyword}
                    onChange={(e) => setHistoryKeyword(e.target.value)}
                    placeholder="Tìm mã đơn hoặc gian hàng..."
                  />
                </div>
              </div>
            </div>

            {/* HISTORY VIEW SWITCH */}
            <div className="sa-history-view-tabs">
              <button
                type="button"
                className={historyView === "orders" ? "active" : ""}
                onClick={() => setHistoryView("orders")}
              >
                <CheckCircle2 size={16} />
                Đơn đã xử lý
              </button>

              <button
                type="button"
                className={historyView === "runs" ? "active" : ""}
                onClick={() => setHistoryView("runs")}
              >
                <CalendarClock size={16} />
                Các lần chạy
              </button>
            </div>

            {/* ORDER HISTORY */}
            {historyView === "orders" && (
              <>
                <div className="sa-history-summary">
                  <div className="sa-history-summary-card">
                    <span>Tổng đơn thành công</span>
                    <strong>{successfulHistoryCount}</strong>
                  </div>

                  <div className="sa-history-summary-card">
                    <span>Đơn đang hiển thị</span>
                    <strong>{visibleHistoryOrders.length}</strong>
                  </div>
                </div>

                <div className="sa-history-result-filters">
                  {[
                    { value: "success", label: "Thành công" },
                    { value: "all", label: "Tất cả" },
                    { value: "failed", label: "Thất bại" },
                    { value: "skipped", label: "Bỏ qua" },
                    { value: "partial", label: "Một phần" },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.value}
                      className={
                        historyResultFilter === item.value ? "active" : ""
                      }
                      onClick={() => setHistoryResultFilter(item.value)}
                    >
                      {item.label}
                      {item.value === "success" && (
                        <b>{successfulHistoryCount}</b>
                      )}
                    </button>
                  ))}
                </div>

                <div className="sa-table-wrap">
                  <table className="sa-table sa-result-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã đơn Shopee</th>
                        <th>Gian hàng</th>
                        <th>Kết quả</th>
                        <th>Trạng thái kho</th>
                        <th>Thời gian xử lý</th>
                        <th>Hình thức</th>
                        <th>Thông tin</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleHistoryOrders.map((result, index) => {
                        const [resultLabel, resultTone] = getResultStatus(
                          result.status,
                        );

                        const [stockLabel, stockTone] = getStockStatus(
                          result.stockStatus,
                        );

                        return (
                          <tr key={result.uniqueKey}>
                            <td>{index + 1}</td>

                            <td>
                              {result.orderSn ? (
                                <button
                                  type="button"
                                  className="sa-order-link"
                                  onClick={() =>
                                    handleOpenOrderDetail(result.orderSn)
                                  }
                                >
                                  {result.orderSn}
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td>{result.shopName || result.shopId || "—"}</td>

                            <td>
                              <span className={`sa-status ${resultTone}`}>
                                {resultLabel}
                              </span>
                            </td>

                            <td>
                              <span className={`sa-status ${stockTone}`}>
                                {stockLabel}
                              </span>
                            </td>

                            <td>
                              {formatDate(
                                result.processedAt || result.historyStartedAt,
                              )}
                            </td>

                            <td>
                              <span
                                className={`sa-status ${
                                  result.historyTrigger === "manual"
                                    ? "blue"
                                    : "neutral"
                                }`}
                              >
                                {result.historyTrigger === "manual"
                                  ? "Thủ công"
                                  : "Cron tự động"}
                              </span>
                            </td>

                            <td className="sa-result-message">
                              {result.message || "—"}
                            </td>
                          </tr>
                        );
                      })}

                      {!visibleHistoryOrders.length && (
                        <tr>
                          <td colSpan="8" className="sa-empty">
                            {loading
                              ? "Đang tải lịch sử..."
                              : historyKeyword
                                ? "Không tìm thấy đơn phù hợp."
                                : "Không có đơn trong nhóm trạng thái này."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* RUN HISTORY */}
            {historyView === "runs" && (
              <div className="sa-history-list">
                {historyRunList.map((item) => {
                  const id = item._id || item.id;
                  const isExpanded = expandedHistoryId === id;
                  const results = Array.isArray(item.results)
                    ? item.results
                    : [];

                  const status = getHistoryStatus(item);
                  const isManual = item.trigger === "manual";

                  const scanned = Number(item.scannedOrders || 0);
                  const success = Number(item.successCount || 0);
                  const failed = Number(item.failedCount || 0);
                  const skipped = Number(item.skippedCount || 0);
                  const partial = Number(item.partialCount || 0);

                  const successRate =
                    scanned > 0 ? Math.min(100, (success / scanned) * 100) : 0;

                  return (
                    <article
                      className={`sa-history-card ${
                        isExpanded ? "expanded" : ""
                      }`}
                      key={id}
                    >
                      <div className="sa-history-card-main">
                        <button
                          type="button"
                          className="sa-history-toggle"
                          onClick={() =>
                            setExpandedHistoryId((current) =>
                              current === id ? null : id,
                            )
                          }
                          aria-expanded={isExpanded}
                        >
                          <span className="sa-history-chevron">
                            {isExpanded ? "−" : "+"}
                          </span>

                          <span className="sa-history-main-info">
                            <span className="sa-history-date">
                              <CalendarClock size={15} />
                              {formatDate(
                                item.startedAt ||
                                  item.processedAt ||
                                  item.createdAt,
                              )}
                            </span>

                            <span className="sa-history-meta">
                              <span
                                className={`sa-status ${
                                  isManual ? "blue" : "neutral"
                                }`}
                              >
                                {isManual ? "Thủ công" : "Cron tự động"}
                              </span>

                              <span className={`sa-status ${status.tone}`}>
                                {status.label}
                              </span>

                              <span className="sa-history-duration">
                                {formatDuration(item.durationMs)}
                              </span>
                            </span>
                          </span>
                        </button>

                        <div className="sa-history-counts">
                          <div>
                            <strong>{scanned}</strong>
                            <span>Đã quét</span>
                          </div>

                          <div className="success">
                            <strong>{success}</strong>
                            <span>Thành công</span>
                          </div>

                          <div className="failed">
                            <strong>{failed}</strong>
                            <span>Thất bại</span>
                          </div>

                          <div className="skipped">
                            <strong>{skipped}</strong>
                            <span>Bỏ qua</span>
                          </div>

                          {partial > 0 && (
                            <div className="partial">
                              <strong>{partial}</strong>
                              <span>Một phần</span>
                            </div>
                          )}
                        </div>

                        <div className="sa-history-rate">
                          <div className="sa-history-rate-text">
                            <span>Tỷ lệ thành công</span>
                            <b>{successRate.toFixed(1)}%</b>
                          </div>

                          <div className="sa-progress">
                            <span style={{ width: `${successRate}%` }} />
                          </div>
                        </div>
                      </div>

                      {item.error && (
                        <div className="sa-history-error">
                          <AlertTriangle size={15} />
                          {item.error}
                        </div>
                      )}

                      {isExpanded && (
                        <div className="sa-history-detail">
                          <div className="sa-detail-heading">
                            <div>
                              <h3>Chi tiết đơn hàng trong lần chạy</h3>
                              <p>{results.length} đơn</p>
                            </div>

                            <div className="sa-detail-time">
                              <span>Bắt đầu: {formatDate(item.startedAt)}</span>
                              <span>
                                Kết thúc: {formatDate(item.finishedAt)}
                              </span>
                            </div>
                          </div>

                          <div className="sa-table-wrap">
                            <table className="sa-table sa-result-table">
                              <thead>
                                <tr>
                                  <th>Mã đơn Shopee</th>
                                  <th>Gian hàng</th>
                                  <th>Kết quả</th>
                                  <th>Trạng thái kho</th>
                                  <th>Thời gian xử lý</th>
                                  <th>Thông tin</th>
                                </tr>
                              </thead>

                              <tbody>
                                {results.map((result, index) => {
                                  const [resultLabel, resultTone] =
                                    getResultStatus(result.status);

                                  const [stockLabel, stockTone] =
                                    getStockStatus(result.stockStatus);

                                  return (
                                    <tr
                                      key={`${
                                        result.orderSn || "order"
                                      }-${index}`}
                                    >
                                      <td>
                                        {result.orderSn ? (
                                          <button
                                            type="button"
                                            className="sa-order-link"
                                            onClick={() =>
                                              handleOpenOrderDetail(
                                                result.orderSn,
                                              )
                                            }
                                          >
                                            {result.orderSn}
                                          </button>
                                        ) : (
                                          "—"
                                        )}
                                      </td>

                                      <td>
                                        {result.shopName ||
                                          result.shopId ||
                                          "—"}
                                      </td>

                                      <td>
                                        <span
                                          className={`sa-status ${resultTone}`}
                                        >
                                          {resultLabel}
                                        </span>
                                      </td>

                                      <td>
                                        <span
                                          className={`sa-status ${stockTone}`}
                                        >
                                          {stockLabel}
                                        </span>
                                      </td>

                                      <td>{formatDate(result.processedAt)}</td>

                                      <td className="sa-result-message">
                                        {result.message || "—"}
                                      </td>
                                    </tr>
                                  );
                                })}

                                {!results.length && (
                                  <tr>
                                    <td colSpan="6" className="sa-empty">
                                      Lần chạy này không có chi tiết đơn.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}

                {!historyRunList.length && (
                  <div className="sa-empty sa-history-empty">
                    {loading
                      ? "Đang tải lịch sử..."
                      : "Không có lần chạy phù hợp."}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// =====================================================
// STAT COMPONENT
// =====================================================

function Stat({ icon, label, value, color = "" }) {
  return (
    <div className="sa-stat">
      <div className={`sa-stat-icon ${color}`}>{icon}</div>

      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
function ShopeeOrderDetailModal({ order, loading, error, onClose }) {
  const items = Array.isArray(order?.items) ? order.items : [];

  const formatMoney = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) return "—";

    return number.toLocaleString("vi-VN") + " đ";
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour12: false,
    });
  };

  const getStatus = (status) => {
    const map = {
      COMPLETED: "Hoàn thành",
      SHIPPED: "Đã giao vận chuyển",
      READY_TO_SHIP: "Chờ giao vận chuyển",
      PROCESSED: "Đang xử lý",
      TO_CONFIRM_RECEIVE: "Chờ xác nhận nhận hàng",
      CANCELLED: "Đã hủy",
      UNPAID: "Chưa thanh toán",
      IN_CANCEL: "Đang yêu cầu hủy",
    };

    return map[String(status || "").toUpperCase()] || status || "—";
  };

  const getMappingStatus = (item) => {
    if (item.mappingStatus === "mapped" || item.productId) {
      return "Đã ánh xạ SKU";
    }

    if (item.mappingStatus === "unmapped") {
      return "Chưa ánh xạ SKU";
    }

    return item.mappingStatus || "Chưa xác định";
  };

  return (
    <div
      className="sa-detail-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="sa-detail-modal">
        <div className="sa-detail-modal-header">
          <div>
            <span>CHI TIẾT ĐƠN SHOPEE</span>
            <h2>{order.orderSn}</h2>
          </div>

          <button type="button" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <div className="sa-detail-modal-body">
          {loading ? (
            <div className="sa-detail-loading">
              <RefreshCw className="sa-spin" size={24} />
              <p>Đang tải thông tin đơn hàng...</p>
            </div>
          ) : error ? (
            <div className="sa-detail-error">
              <AlertTriangle size={22} />
              <p>{error}</p>
              <button type="button" onClick={onClose}>
                Đóng
              </button>
            </div>
          ) : (
            <>
              <div className="sa-detail-section">
                <h3>Thông tin chung</h3>

                <div className="sa-detail-grid">
                  <DetailField label="Mã đơn" value={order.orderSn} />

                  <DetailField
                    label="Gian hàng"
                    value={order.shopName || order.shopId}
                  />

                  <DetailField
                    label="Trạng thái đơn"
                    value={getStatus(order.orderStatus || order.status)}
                  />

                  <DetailField
                    label="Ngày tạo"
                    value={formatDate(
                      order.createdAt ||
                        order.createTime ||
                        order.rawData?.create_time,
                    )}
                  />

                  <DetailField
                    label="Người mua"
                    value={
                      order.buyerUsername ||
                      order.recipientName ||
                      order.buyerName
                    }
                  />

                  <DetailField label="Người nhận" value={order.recipientName} />

                  <DetailField
                    label="Số điện thoại"
                    value={order.phone || order.recipientPhone}
                  />

                  <DetailField
                    label="Đơn vị vận chuyển"
                    value={order.shippingCarrier}
                  />

                  <DetailField label="Thanh toán" value={order.paymentMethod} />

                  <DetailField
                    label="Trạng thái kho"
                    value={getStockLabel(order.stockStatus)}
                  />
                </div>

                {(order.address || order.shippingAddress) && (
                  <div className="sa-detail-address">
                    <b>Địa chỉ giao hàng</b>
                    <p>
                      {typeof (order.address || order.shippingAddress) ===
                      "string"
                        ? order.address || order.shippingAddress
                        : [
                            order.shippingAddress?.fullAddress,
                            order.shippingAddress?.address,
                            order.shippingAddress?.district,
                            order.shippingAddress?.city,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                    </p>
                  </div>
                )}
              </div>

              <div className="sa-detail-section">
                <h3>Sản phẩm ({items.length})</h3>

                <div className="sa-detail-items">
                  {items.map((item, index) => {
                    const quantity = Number(item.quantity || item.qty || 0);

                    const price = Number(
                      item.unitPrice ||
                        item.modelOriginalPrice ||
                        item.price ||
                        0,
                    );

                    return (
                      <div
                        className="sa-detail-product"
                        key={item._id || item.itemId || index}
                      >
                        <div className="sa-detail-product-main">
                          <b>
                            {item.itemName ||
                              item.productName ||
                              item.title ||
                              "Sản phẩm Shopee"}
                          </b>

                          <span>
                            Phân loại:{" "}
                            {item.variantName || item.modelName || "Mặc định"}
                          </span>

                          <span>
                            SKU Shopee:{" "}
                            {item.sku ||
                              item.variationSku ||
                              item.itemSku ||
                              "—"}
                          </span>

                          <span>
                            SKU nội bộ:{" "}
                            {item.variantCode || item.productCode || "—"}
                          </span>

                          <span>Ánh xạ: {getMappingStatus(item)}</span>
                        </div>

                        <div className="sa-detail-product-price">
                          <b>{formatMoney(price)}</b>
                          <span>x {quantity}</span>
                          <strong>{formatMoney(price * quantity)}</strong>
                        </div>
                      </div>
                    );
                  })}

                  {!items.length && (
                    <div className="sa-empty">Không có dữ liệu sản phẩm.</div>
                  )}
                </div>
              </div>

              <div className="sa-detail-total">
                <span>Tổng tiền đơn hàng</span>
                <strong>
                  {formatMoney(
                    order.totalAmount ||
                      order.totalPrice ||
                      order.orderAmount ||
                      order.rawData?.total_amount,
                  )}
                </strong>
              </div>

              {order.note && (
                <div className="sa-detail-address">
                  <b>Ghi chú</b>
                  <p>{order.note}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="sa-detail-field">
      <span>{label}</span>
      <b>
        {value === null || value === undefined || value === ""
          ? "—"
          : String(value)}
      </b>
    </div>
  );
}
