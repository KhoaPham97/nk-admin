import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Play,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { shopeeApi } from "../services/shopeeApi";
import "../styles/shopee-order-sync-monitor.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN", { hour12: false });
};

const number = (value) => Number(value || 0).toLocaleString("vi-VN");

const ACTION_LABELS = {
  reserved: "Đã giữ hàng",
  deducted: "Đã xuất kho",
  released: "Đã giải phóng",
  unmapped: "Chưa ghép SKU",
  checked: "Đã kiểm tra",
  error: "Lỗi xử lý",
};

const STOCK_STATUS_LABELS = { pending: "Chờ giữ kho", unmapped: "Thiếu ánh xạ SKU", ready: "Đã giữ đủ", partially_deducted: "Xuất một phần", deducted: "Đã xuất kho", blocked: "Bị chặn" };

const STATUS_LABELS = {
  running: "Đang chạy",
  success: "Thành công",
  partial: "Hoàn tất có lỗi",
  failed: "Thất bại",
  skipped: "Bỏ qua",
};

export default function ShopeeOrderSyncMonitor() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningNow, setRunningNow] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [statusResult, historyResult] = await Promise.all([
        shopeeApi.getOrderSyncStatus(),
        shopeeApi.getOrderSyncHistory({ limit: 20 }),
      ]);
      setStatus(statusResult || null);
      setHistory(Array.isArray(historyResult?.runs) ? historyResult.runs : []);
      setError("");
    } catch (err) {
      setError(err?.message || "Không thể tải trạng thái đồng bộ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const activeRun = status?.running || null;
  const lastRun = status?.latest || history.find((run) => run.status !== "running") || null;
  const nextScheduledRun = new Date((Math.floor(Date.now() / 300000) + 1) * 300000);
  const scheduleEnabled = status?.backgroundJobsEnabled !== false;
  const liveOrders = Array.isArray(activeRun?.orders) ? activeRun.orders : [];
  const displayedOrders = useMemo(() => {
    const source = selectedRun?.orders || liveOrders;
    const query = search.trim().toLowerCase();
    return [...source]
      .reverse()
      .filter((item) => !query || String(item.orderSn || "").toLowerCase().includes(query))
      .slice(0, 100);
  }, [selectedRun, liveOrders, search]);

  const runNow = async () => {
    setRunningNow(true);
    setError("");
    try {
      const result = await shopeeApi.runOrderSyncNow();
      if (result?.runId) {
        const detail = await shopeeApi.getOrderSyncRun(result.runId);
        setSelectedRun(detail?.run || null);
      }
      await refresh();
    } catch (err) {
      setError(err?.message || "Không thể chạy đồng bộ ngay.");
      await refresh();
    } finally {
      setRunningNow(false);
    }
  };

  const openRun = async (run) => {
    if (!run?._id) return;
    try {
      const result = await shopeeApi.getOrderSyncRun(run._id);
      setSelectedRun(result?.run || run);
    } catch (err) {
      setError(err?.message || "Không tải được chi tiết lần đồng bộ.");
    }
  };

  const closeDetail = () => setSelectedRun(null);

  return (
    <section className="som-page">
      <div className="som-header">
        <div>
          <div className="som-eyebrow"><Activity size={15} /> SHOPEE ORDER AUTOMATION</div>
          <h2>Đồng bộ đơn hàng & giữ hàng</h2>
          <p>Theo dõi từng lần đồng bộ, từng đơn hàng và kết quả xử lý tồn kho.</p>
        </div>
        <div className="som-actions">
          <button className="som-button som-button-light" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} className={loading ? "som-spin" : ""} /> Làm mới
          </button>
          <button className="som-button som-button-primary" onClick={runNow} disabled={runningNow || Boolean(activeRun)}>
            {runningNow || activeRun ? <LoaderCircle size={16} className="som-spin" /> : <Play size={16} />}
            Đồng bộ ngay
          </button>
        </div>
      </div>

      {error && <div className="som-alert"><AlertCircle size={17} />{error}</div>}

      <div className="som-status-card">
        <div className="som-status-top">
          <div className="som-status-title">
            <span className={activeRun ? "som-pulse" : "som-dot"} />
            <div><strong>{activeRun ? "Đang đồng bộ Shopee" : scheduleEnabled ? "Lịch tự động 5 phút/lần" : "Tự động đồng bộ đang tắt"}</strong><small>Giờ Việt Nam · Asia/Ho_Chi_Minh</small></div>
          </div>
          <span className={activeRun ? "som-pill is-running" : "som-pill"}>
            {activeRun ? "ĐANG CHẠY" : "THEO LỊCH"}
          </span>
        </div>
        <div className="som-metrics">
          <div><small>Lần chạy gần nhất</small><strong>{formatDate(activeRun?.startedAt || lastRun?.startedAt)}</strong></div>
          <div><small>Đơn đã kiểm tra trong lượt này</small><strong>{number(activeRun?.processedOrders || liveOrders.length)}</strong></div>
          <div><small>Đơn giữ hàng trong lượt này</small><strong>{number(liveOrders.filter((item) => item.action === "reserved").length)}</strong></div>
          <div><small>Lỗi trong lượt này</small><strong>{number(liveOrders.filter((item) => item.action === "error").length)}</strong></div>
        </div>
        {activeRun ? <div className="som-live-note"><LoaderCircle size={15} className="som-spin" /> Tiến trình đang được cập nhật tự động mỗi 10 giây.</div> : scheduleEnabled ? <div className="som-live-note"><Clock3 size={15} /> Lượt tự động tiếp theo dự kiến: {formatDate(nextScheduledRun)}</div> : <div className="som-alert"><AlertCircle size={16} /> Background jobs đang tắt trên backend này. Kiểm tra cấu hình deployment chính.</div>}
      </div>

      <div className="som-summary-grid">
        <article><small>Lần chạy hoàn tất gần nhất</small><strong>{STATUS_LABELS[lastRun?.status] || "Chưa có dữ liệu"}</strong><span>{formatDate(lastRun?.finishedAt || lastRun?.startedAt)}</span></article>
        <article><small>Tổng đơn lấy về</small><strong>{number(lastRun?.fetched)}</strong><span>Trong lần đồng bộ gần nhất</span></article>
        <article><small>Đơn đã lưu</small><strong>{number(lastRun?.saved)}</strong><span>Đã cập nhật vào hệ thống</span></article>
        <article><small>Lỗi xử lý</small><strong>{number(lastRun?.errorCount)}</strong><span>{lastRun?.message || "Chưa có lỗi được ghi nhận"}</span></article>
      </div>

      <div className="som-columns">
        <div className="som-panel">
          <div className="som-panel-heading"><div><h3>{selectedRun ? "Chi tiết lần đồng bộ" : "Đơn hàng đang được xử lý"}</h3><p>{selectedRun ? formatDate(selectedRun.startedAt) : "Đơn mới nhất của lượt chạy hiện tại"}</p></div>
            {selectedRun && <button className="som-text-button" onClick={closeDetail}>Đang xem lượt chạy · Đóng</button>}
          </div>
          <label className="som-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã đơn Shopee..." /></label>
          {!displayedOrders.length ? <div className="som-empty">{activeRun ? "Đang chờ đơn hàng được xử lý..." : "Chưa có chi tiết đơn hàng trong lượt đồng bộ này."}</div> :
            <div className="som-order-list">
              {displayedOrders.map((item, index) => <div className="som-order-row" key={item.orderSn + index}>
                <div className="som-order-icon">{item.action === "error" ? <XCircle size={17}/> : item.action === "reserved" ? <CheckCircle2 size={17}/> : <Clock3 size={17}/>}</div>
                <div className="som-order-main"><strong>{item.orderSn || "Đơn không có mã"}</strong><small>{item.orderStatus || "—"} · {STOCK_STATUS_LABELS[item.stockStatus] || "Chưa rõ trạng thái kho"} · {formatDate(item.processedAt)}</small>{item.message && <span className={item.action === "error" ? "som-order-error" : "som-order-note"}>{item.message}</span>}</div>
                <span className={"som-action-tag action-" + item.action}>{item.action === "reserved" ? `Đã giữ +${number(item.reservedAdded)}` : (ACTION_LABELS[item.action] || item.action)}</span>
              </div>)}
            </div>
          }
        </div>

        <div className="som-panel">
          <div className="som-panel-heading"><div><h3>Lịch sử đồng bộ</h3><p>20 lần chạy gần nhất</p></div></div>
          <div className="som-history-list">
            {history.length === 0 ? <div className="som-empty">Chưa có lịch sử đồng bộ.</div> : history.map((run) => <button className="som-history-row" key={run._id} onClick={() => openRun(run)}>
              <div><strong>{formatDate(run.startedAt)}</strong><small>{run.trigger === "manual" ? "Chạy thủ công" : "Tự động · 5 phút"}</small></div>
              <div className="som-history-result"><span className={"som-pill status-" + run.status}>{STATUS_LABELS[run.status] || run.status}</span><small>{number(run.saved)} đơn · {number(run.errorCount)} lỗi</small></div>
            </button>)}
          </div>
        </div>
      </div>
      {currentRun && selectedRun && <div className="som-detail-foot">Lượt đồng bộ {selectedRun._id} · {number(selectedRun.orders?.length)} đơn được ghi nhật ký.</div>}
    </section>
  );
}
