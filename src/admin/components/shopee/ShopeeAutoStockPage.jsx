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
  ChevronDown,
  ChevronRight,
  CalendarClock,
  Timer,
  Store,
} from "lucide-react";

import shopeeApi from "../../services/shopeeApi";
import "./ShopeeAutoStockPage.css";

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
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("orders");

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [historyKeyword, setHistoryKeyword] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  const [autoSettings, setAutoSettings] = useState({
    enabled: false,
    intervalMinutes: 5,
    lastRunAt: null,
  });

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(5);

  const [message, setMessage] = useState(null);

  // =====================================================
  // HELPERS
  // =====================================================

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour12: false,
    });
  };

  const normalizeStatus = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

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

      if (filter === "eligible" && !eligible) {
        return false;
      }

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

  const selectableVisibleOrders = visibleOrders.filter((order) => {
    return (
      normalizeStatus(order.status) === "completed" &&
      normalizeStatus(order.stockStatus) === "ready"
    );
  });

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
  // HISTORY FILTER
  // =====================================================

  const visibleHistory = useMemo(() => {
    const q = historyKeyword.trim().toLowerCase();

    return history.filter((item) => {
      const results = Array.isArray(item.results) ? item.results : [];

      const status = getHistoryStatus(item);
      const rawStatus = normalizeStatus(item.status);

      if (historyStatusFilter === "partial" && status.label !== "Một phần") {
        return false;
      }

      if (
        historyStatusFilter === "failed" &&
        !["failed", "Thất bại"].includes(rawStatus) &&
        Number(item.failedCount || 0) === 0
      ) {
        return false;
      }

      if (
        historyStatusFilter === "skipped" &&
        Number(item.skippedCount || 0) === 0
      ) {
        return false;
      }

      if (historyStatusFilter === "completed" && status.label !== "Hoàn tất") {
        return false;
      }

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
  }, [history, historyKeyword, historyStatusFilter]);

  const toggleHistory = (id) => {
    setExpandedHistoryId((current) => (current === id ? null : id));
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="sa-page">
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

                        <td className="sa-order-sn">{order.orderSn}</td>

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
                          {order.itemCount ?? order.items?.length ?? "—"} SP /{" "}
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
            <div className="sa-history-toolbar">
              <div>
                <h2>Lịch sử chạy Auto Stock</h2>
                <p>
                  {visibleHistory.length} / {history.length} lần chạy
                </p>
              </div>

              <div className="sa-history-filters">
                <div className="sa-search">
                  <Search size={16} />

                  <input
                    value={historyKeyword}
                    onChange={(e) => setHistoryKeyword(e.target.value)}
                    placeholder="Tìm mã đơn trong lịch sử..."
                  />
                </div>

                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả kết quả</option>
                  <option value="completed">Hoàn tất</option>
                  <option value="partial">Một phần</option>
                  <option value="failed">Thất bại</option>
                  <option value="skipped">Có đơn bỏ qua</option>
                </select>
              </div>
            </div>

            <div className="sa-history-list">
              {visibleHistory.map((item) => {
                const id = item._id || item.id;
                const isExpanded = expandedHistoryId === id;
                const results = Array.isArray(item.results) ? item.results : [];

                const status = getHistoryStatus(item);
                const isManual = item.trigger === "manual";

                const scanned = Number(item.scannedOrders || 0);
                const success = Number(item.successCount || 0);
                const failed = Number(item.failedCount || 0);
                const skipped = Number(item.skippedCount || 0);
                const partial = Number(item.partialCount || 0);

                const successRate =
                  scanned > 0 ? Math.min(100, (success / scanned) * 100) : 0;

                const filteredResults = results.filter((result) => {
                  const q = historyKeyword.trim().toLowerCase();

                  if (!q) return true;

                  return (
                    String(result.orderSn || "")
                      .toLowerCase()
                      .includes(q) ||
                    String(result.message || "")
                      .toLowerCase()
                      .includes(q)
                  );
                });

                return (
                  <article
                    className={`sa-history-card ${isExpanded ? "expanded" : ""}`}
                    key={id}
                  >
                    <div className="sa-history-card-main">
                      <button
                        type="button"
                        className="sa-history-toggle"
                        onClick={() => toggleHistory(id)}
                        aria-expanded={isExpanded}
                      >
                        <span className="sa-history-chevron">
                          {isExpanded ? (
                            <ChevronDown size={19} />
                          ) : (
                            <ChevronRight size={19} />
                          )}
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
                              className={`sa-status ${isManual ? "blue" : "neutral"}`}
                            >
                              {isManual ? "Thủ công" : "Cron tự động"}
                            </span>

                            <span className={`sa-status ${status.tone}`}>
                              {status.label}
                            </span>

                            <span className="sa-history-duration">
                              <Timer size={13} />
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
                            <p>
                              {filteredResults.length} / {results.length} đơn
                            </p>
                          </div>

                          <div className="sa-detail-time">
                            <span>Bắt đầu: {formatDate(item.startedAt)}</span>
                            <span>Kết thúc: {formatDate(item.finishedAt)}</span>
                          </div>
                        </div>

                        <div className="sa-detail-summary">
                          <span>
                            <CheckCircle2 size={14} />
                            {success} thành công
                          </span>

                          <span>
                            <AlertTriangle size={14} />
                            {skipped} bỏ qua
                          </span>

                          <span>
                            <XCircle size={14} />
                            {failed} thất bại
                          </span>
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
                                <th>Lý do / Thông tin</th>
                              </tr>
                            </thead>

                            <tbody>
                              {filteredResults.map((result, index) => {
                                const [resultLabel, resultTone] =
                                  getResultStatus(result.status);

                                const [stockLabel, stockTone] = getStockStatus(
                                  result.stockStatus,
                                );

                                return (
                                  <tr
                                    key={`${result.orderSn || "order"}-${index}`}
                                  >
                                    <td className="sa-order-sn">
                                      {result.orderSn || "—"}
                                    </td>

                                    <td>
                                      {result.shopName || result.shopId || "—"}
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

                              {!filteredResults.length && (
                                <tr>
                                  <td colSpan="6" className="sa-empty">
                                    Không tìm thấy đơn hàng trong lần chạy này.
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

              {!visibleHistory.length && (
                <div className="sa-empty sa-history-empty">
                  {loading
                    ? "Đang tải lịch sử..."
                    : "Không có lịch sử phù hợp."}
                </div>
              )}
            </div>
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
