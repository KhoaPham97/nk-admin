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
  const [filter, setFilter] = useState("eligible");
  const [activeTab, setActiveTab] = useState("orders");

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

    return date.toLocaleString("vi-VN");
  };

  const normalizeStatus = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

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

      // Chuẩn hóa trạng thái từ ShopeeOrder
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
    return orders.filter((order) => {
      const status = normalizeStatus(order.status);
      const stockStatus = normalizeStatus(order.stockStatus);

      return status === "completed" && stockStatus !== "deducted";
    });
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return orders.filter((order) => {
      const status = normalizeStatus(order.status);
      const stockStatus = normalizeStatus(order.stockStatus);

      const eligible = status === "completed" && stockStatus !== "deducted";

      if (filter === "eligible" && !eligible) {
        return false;
      }

      if (
        filter === "failed" &&
        !["blocked", "failed", "unmapped"].includes(stockStatus)
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

  const allSelected =
    visibleOrders.filter((order) => {
      return (
        normalizeStatus(order.status) === "completed" &&
        normalizeStatus(order.stockStatus) !== "deducted"
      );
    }).length > 0 &&
    visibleOrders
      .filter((order) => {
        return (
          normalizeStatus(order.status) === "completed" &&
          normalizeStatus(order.stockStatus) !== "deducted"
        );
      })
      .every((order) => selected.includes(order.orderSn));

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
    const selectableOrders = visibleOrders.filter((order) => {
      return (
        normalizeStatus(order.status) === "completed" &&
        normalizeStatus(order.stockStatus) !== "deducted"
      );
    });

    if (allSelected) {
      const ids = new Set(selectableOrders.map((order) => order.orderSn));

      setSelected((current) => current.filter((orderSn) => !ids.has(orderSn)));
    } else {
      setSelected((current) =>
        Array.from(
          new Set([
            ...current,
            ...selectableOrders.map((order) => order.orderSn),
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
    ["blocked", "failed", "unmapped"].includes(
      normalizeStatus(order.stockStatus),
    ),
  ).length;

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
                Chọn tất cả
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
                      normalizeStatus(order.stockStatus) !== "deducted";

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
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Thời gian chạy</th>
                  <th>Loại chạy</th>
                  <th>Kết quả</th>
                  <th>Đã quét</th>
                  <th>Thành công</th>
                  <th>Thất bại</th>
                  <th>Bỏ qua</th>
                  <th>Thông tin</th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr key={item._id || item.id}>
                    <td>{formatDate(item.startedAt || item.processedAt)}</td>

                    <td>{item.trigger === "manual" ? "Thủ công" : "Cron"}</td>

                    <td>
                      <span
                        className={`sa-status ${
                          item.status === "completed"
                            ? "green"
                            : item.status === "running"
                              ? "blue"
                              : "red"
                        }`}
                      >
                        {item.status === "completed"
                          ? "Hoàn tất"
                          : item.status === "running"
                            ? "Đang chạy"
                            : item.status === "partial"
                              ? "Một phần"
                              : "Thất bại"}
                      </span>
                    </td>

                    <td>{item.scannedOrders ?? 0}</td>
                    <td>{item.successCount ?? 0}</td>
                    <td>{item.failedCount ?? 0}</td>
                    <td>{item.skippedCount ?? 0}</td>
                    <td className="sa-reason">{item.error || "—"}</td>
                  </tr>
                ))}

                {!history.length && (
                  <tr>
                    <td colSpan="8" className="sa-empty">
                      {loading
                        ? "Đang tải dữ liệu..."
                        : "Chưa có lịch sử chạy Job."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

// =====================================================
// DATE FORMAT
// =====================================================

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}
