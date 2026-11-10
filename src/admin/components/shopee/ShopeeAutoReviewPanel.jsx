import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import {
  Play,
  Pause,
  RefreshCw,
  MessageSquare,
  CheckCircle,
  XCircle,
  Settings,
  Activity,
  Clock,
  Wifi,
  WifiOff,
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  Store,
  Package,
  Send,
  AlertCircle,
} from "lucide-react";

import { BASE_URL } from "../../../api";
import shopeeAutoReviewApi from "../../services/shopeeAutoReviewApi";

// =====================================================
// HELPERS
// =====================================================

const API_BASE = String(BASE_URL || "").replace(/\/+$/, "");

const SOCKET_URL = API_BASE.replace(/\/api\/?$/i, "");

const getToken = () =>
  localStorage.getItem("adminToken") ||
  localStorage.getItem("accessToken") ||
  "";

const formatDate = (value) => {
  if (!value) return "Chưa có";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Không hợp lệ";

  return date.toLocaleString("vi-VN");
};

const formatDuration = (value) => {
  const seconds = Math.max(0, Math.floor((value || 0) / 1000));

  if (seconds < 60) return `${seconds} giây`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes} phút ${remainingSeconds} giây`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours} giờ ${minutes % 60} phút`;
};

const statusLabel = {
  idle: "Chưa chạy",
  running: "Đang xử lý",
  completed: "Hoàn tất",
  failed: "Có lỗi",
  processing: "Đang xử lý",
  sent: "Đã gửi",
  failed_reply: "Thất bại",
};

const statusClass = {
  idle: "bg-gray-100 text-gray-600",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  processing: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed_reply: "bg-red-100 text-red-700",
};

const getStatusLabel = (status) =>
  statusLabel[status] || status || "Không xác định";

const getStatusClass = (status) =>
  statusClass[status] || "bg-gray-100 text-gray-600";

const initialForm = {
  intervalMinutes: 15,
  maxRepliesPerRun: 10,
  delayBetweenRepliesMs: 3000,
};

const initialProgress = {
  currentShopId: "",
  currentShopName: "",
  currentItemId: "",
  completedItems: 0,
  totalItems: 0,
  pageCount: 0,
  totalPages: 0,
  loaded: 0,
  totalShops: 0,
  stats: {
    total: 0,
    replied: 0,
    failed: 0,
    skipped: 0,
    scanFailed: 0,
  },
  latestReply: null,
  latestError: "",
  startedAt: null,
};

// =====================================================
// COMPONENT
// =====================================================

const ShopeeAutoReviewPanel = () => {
  const socketRef = useRef(null);
  const mountedRef = useRef(false);

  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [socketConnected, setSocketConnected] = useState(false);

  const [form, setForm] = useState(initialForm);

  const [progress, setProgress] = useState(initialProgress);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [historyStatus, setHistoryStatus] = useState("");
  const [historyShopId, setHistoryShopId] = useState("");

  // =====================================================
  // LOAD STATUS
  // =====================================================

  const loadStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);

      const result = await shopeeAutoReviewApi.getStatus();
      const data = result?.data;

      if (!data) return;

      if (!mountedRef.current) return;

      setSetting(data);

      setForm((previous) => ({
        ...previous,
        intervalMinutes: data.intervalMinutes ?? 15,
        maxRepliesPerRun: data.maxRepliesPerRun ?? 10,
        delayBetweenRepliesMs: data.delayBetweenRepliesMs ?? 3000,
      }));

      if (data.lastStats) {
        setProgress((previous) => ({
          ...previous,
          stats: {
            ...previous.stats,
            ...data.lastStats,
          },
        }));
      }

      if (!data.isRunning) {
        setProgress((previous) => ({
          ...previous,
          stats: {
            ...previous.stats,
            ...(data.lastStats || {}),
          },
        }));
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || "Không thể tải trạng thái.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // =====================================================
  // LOAD HISTORY
  // =====================================================

  const loadHistory = useCallback(
    async (page = historyPage, silent = false) => {
      try {
        if (!silent) setHistoryLoading(true);

        setHistoryError("");

        const params = {
          page,
          limit: 20,
        };

        if (historyStatus) {
          params.status = historyStatus;
        }

        if (historyShopId.trim()) {
          params.shopId = historyShopId.trim();
        }

        const result = await shopeeAutoReviewApi.getHistory(params);

        if (!mountedRef.current) return;

        setHistory(Array.isArray(result?.data) ? result.data : []);

        setHistoryPagination(
          result?.pagination || {
            page,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        );

        setHistoryPage(page);
      } catch (err) {
        if (mountedRef.current) {
          setHistoryError(err.message || "Không thể tải lịch sử.");
        }
      } finally {
        if (mountedRef.current) {
          setHistoryLoading(false);
        }
      }
    },
    [historyPage, historyStatus, historyShopId],
  );

  // =====================================================
  // SOCKET.IO
  // =====================================================

  useEffect(() => {
    mountedRef.current = true;

    const token = getToken();

    if (!token || !SOCKET_URL) {
      setSocketConnected(false);

      return () => {
        mountedRef.current = false;
      };
    }

    const socket = io(`${SOCKET_URL}/shopee-reviews`, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setSocketConnected(true);

      loadStatus(true);
      loadHistory(1, true);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleConnectError = (err) => {
      console.error("[Shopee Review Socket]", err.message);
      setSocketConnected(false);
    };

    const handleStarted = (data) => {
      setProgress((previous) => ({
        ...initialProgress,
        ...previous,
        stats: {
          ...initialProgress.stats,
          ...(data?.stats || {}),
        },
        startedAt: data?.timestamp || new Date(),
      }));

      loadStatus(true);
    };

    const handleShopsLoaded = (data) => {
      setProgress((previous) => ({
        ...previous,
        totalShops: data?.totalShops || 0,
      }));
    };

    const handleShopStarted = (data) => {
      setProgress((previous) => ({
        ...previous,
        currentShopId: String(data?.shopId || ""),
        currentShopName: data?.shopName || "",
        currentItemId: "",
        completedItems: 0,
        totalItems: 0,
        pageCount: 0,
        totalPages: 0,
        loaded: 0,
      }));
    };

    const handleProductsLoaded = (data) => {
      setProgress((previous) => ({
        ...previous,
        currentShopId: String(data?.shopId || previous.currentShopId),
        totalItems: data?.totalItems || 0,
      }));
    };

    const handleScanStarted = (data) => {
      setProgress((previous) => ({
        ...previous,
        currentShopId: String(data?.shopId || previous.currentShopId),
        totalItems: data?.totalItems || previous.totalItems,
      }));
    };

    const handleScanProgress = (data) => {
      setProgress((previous) => ({
        ...previous,
        currentShopId: String(data?.shopId || previous.currentShopId),
        currentItemId: String(data?.itemId || ""),
        completedItems: data?.completedItems ?? previous.completedItems,
        totalItems: data?.totalItems ?? previous.totalItems,
        pageCount: data?.pageCount ?? previous.pageCount,
        totalPages: data?.totalPages ?? previous.totalPages,
        loaded: data?.loaded ?? previous.loaded,
      }));
    };

    const handleScanFailed = (data) => {
      setProgress((previous) => ({
        ...previous,
        latestError: `Sản phẩm ${data?.itemId || ""}: ${
          data?.error || "Không thể quét"
        }`,
        stats: {
          ...previous.stats,
          scanFailed: (previous.stats.scanFailed || 0) + 1,
        },
      }));
    };

    const handleScanCompleted = (data) => {
      setProgress((previous) => ({
        ...previous,
        completedItems: data?.completedItems ?? previous.completedItems,
        totalItems: data?.totalItems ?? previous.totalItems,
        totalPages: data?.totalPages ?? previous.totalPages,
        loaded: data?.loaded ?? previous.loaded,
      }));
    };

    const handleReplyStarted = (data) => {
      setProgress((previous) => ({
        ...previous,
        currentShopId: String(data?.shopId || previous.currentShopId),
        latestError: "",
        latestReply: {
          ...data,
          status: "processing",
        },
      }));
    };

    const handleProgress = (data) => {
      setProgress((previous) => ({
        ...previous,
        stats: {
          ...previous.stats,
          ...(data?.stats || {}),
        },
      }));
    };

    const handleReplied = (data) => {
      setProgress((previous) => ({
        ...previous,
        stats: {
          ...previous.stats,
          ...(data?.stats || {}),
          replied: data?.stats?.replied ?? (previous.stats.replied || 0) + 1,
        },
        latestReply: {
          ...data,
          status: "sent",
        },
      }));

      loadHistory(1, true);
    };

    const handleReplyFailed = (data) => {
      setProgress((previous) => ({
        ...previous,
        stats: {
          ...previous.stats,
          ...(data?.stats || {}),
          failed: data?.stats?.failed ?? (previous.stats.failed || 0) + 1,
        },
        latestError: data?.error || "Trả lời đánh giá thất bại.",
        latestReply: {
          ...data,
          status: "failed",
        },
      }));

      loadHistory(1, true);
    };

    const handleShopCompleted = () => {
      setProgress((previous) => ({
        ...previous,
        currentItemId: "",
      }));
    };

    const handleCompleted = (data) => {
      setProgress((previous) => ({
        ...previous,
        stats: {
          ...previous.stats,
          ...(data?.stats || {}),
        },
        currentItemId: "",
      }));

      setMessage("Đã hoàn tất lượt tự động trả lời.");
      loadStatus(true);
      loadHistory(1, true);
    };

    const handleJobError = (data) => {
      setProgress((previous) => ({
        ...previous,
        latestError: data?.error || "Cron xảy ra lỗi.",
        stats: {
          ...previous.stats,
          ...(data?.stats || {}),
        },
      }));

      setError(data?.error || "Cron xảy ra lỗi.");
      loadStatus(true);
    };

    const handleStopped = () => {
      setMessage("Đã gửi yêu cầu dừng tự động trả lời.");
      loadStatus(true);
    };

    const handleSettingsUpdated = (data) => {
      if (data?.settings) {
        setSetting((previous) => ({
          ...previous,
          ...data.settings,
        }));
      }

      loadStatus(true);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socket.on("auto:started", handleStarted);
    socket.on("auto:shops-loaded", handleShopsLoaded);
    socket.on("auto:shop-started", handleShopStarted);
    socket.on("auto:shop-products-loaded", handleProductsLoaded);

    socket.on("auto:scan-started", handleScanStarted);
    socket.on("auto:scan-progress", handleScanProgress);
    socket.on("auto:scan-failed", handleScanFailed);
    socket.on("auto:scan-completed", handleScanCompleted);

    socket.on("auto:reply-started", handleReplyStarted);
    socket.on("auto:progress", handleProgress);
    socket.on("auto:replied", handleReplied);
    socket.on("auto:reply-failed", handleReplyFailed);

    socket.on("auto:shop-completed", handleShopCompleted);
    socket.on("auto:completed", handleCompleted);
    socket.on("auto:error", handleJobError);
    socket.on("auto:stopped", handleStopped);
    socket.on("auto:settings-updated", handleSettingsUpdated);

    return () => {
      mountedRef.current = false;

      socket.removeAllListeners();
      socket.disconnect();

      socketRef.current = null;
    };
  }, [loadStatus, loadHistory]);

  // =====================================================
  // INITIAL LOAD + FALLBACK POLLING
  // =====================================================

  useEffect(() => {
    loadStatus(true);
    loadHistory(1, true);

    const timer = setInterval(() => {
      if (!socketRef.current?.connected) {
        loadStatus(true);
        loadHistory(historyPage, true);
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [loadStatus, loadHistory, historyPage]);

  // =====================================================
  // FORM
  // =====================================================

  const handleChange = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: Number(value),
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        intervalMinutes: Math.min(
          1440,
          Math.max(1, Number(form.intervalMinutes) || 1),
        ),
        maxRepliesPerRun: Math.min(
          500,
          Math.max(1, Number(form.maxRepliesPerRun) || 1),
        ),
        delayBetweenRepliesMs: Math.min(
          60000,
          Math.max(1000, Number(form.delayBetweenRepliesMs) || 1000),
        ),
      };

      const result = await shopeeAutoReviewApi.updateSettings(payload);

      setSetting((previous) => ({
        ...previous,
        ...result.data,
      }));

      setMessage(result.message || "Đã lưu cấu hình.");
    } catch (err) {
      setError(err.message || "Không thể lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoReply = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const result = setting?.enabled
        ? await shopeeAutoReviewApi.disable()
        : await shopeeAutoReviewApi.enable();

      setSetting((previous) => ({
        ...previous,
        ...result.data,
      }));

      setMessage(result.message || "Đã cập nhật trạng thái.");
    } catch (err) {
      setError(err.message || "Không thể thay đổi trạng thái.");
    } finally {
      setSaving(false);
      await loadStatus(true);
    }
  };

  const runNow = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const result = await shopeeAutoReviewApi.runNow();

      setMessage(result.message || "Đã gửi yêu cầu chạy.");

      await loadStatus(true);
    } catch (err) {
      setError(err.message || "Không thể chạy tự động.");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // HISTORY
  // =====================================================

  const applyHistoryFilter = () => {
    loadHistory(1);
  };

  const historyPageCount = historyPagination.totalPages || 0;

  const progressPercent = useMemo(() => {
    if (!progress.totalItems) return 0;

    return Math.min(
      100,
      Math.round((progress.completedItems / progress.totalItems) * 100),
    );
  }, [progress.completedItems, progress.totalItems]);

  const replyStats = progress.stats || setting?.lastStats || {};

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <RefreshCw className="animate-spin" />
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Tự động trả lời đánh giá Shopee</h2>

          <p className="text-sm text-gray-500">
            Backend tự động xử lý, không cần mở trình duyệt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
              setting?.enabled
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {setting?.enabled ? "Đang bật" : "Đang tắt"}
          </div>

          <div
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
              socketConnected
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {socketConnected ? <Wifi size={14} /> : <WifiOff size={14} />}

            {socketConnected ? "Realtime" : "Đang kết nối"}
          </div>
        </div>
      </div>

      {/* ALERT */}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* STATISTICS */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border p-4">
          <MessageSquare className="mb-2 text-blue-500" size={21} />
          <div className="text-2xl font-bold">{replyStats.total || 0}</div>
          <div className="text-sm text-gray-500">Đánh giá tìm thấy</div>
        </div>

        <div className="rounded-xl border p-4">
          <CheckCircle className="mb-2 text-green-500" size={21} />
          <div className="text-2xl font-bold">{replyStats.replied || 0}</div>
          <div className="text-sm text-gray-500">Đã trả lời</div>
        </div>

        <div className="rounded-xl border p-4">
          <XCircle className="mb-2 text-red-500" size={21} />
          <div className="text-2xl font-bold">{replyStats.failed || 0}</div>
          <div className="text-sm text-gray-500">Thất bại</div>
        </div>

        <div className="rounded-xl border p-4">
          <Activity className="mb-2 text-orange-500" size={21} />
          <div className="text-2xl font-bold">{replyStats.skipped || 0}</div>
          <div className="text-sm text-gray-500">Bỏ qua</div>
        </div>

        <div className="rounded-xl border p-4">
          <AlertCircle className="mb-2 text-amber-500" size={21} />
          <div className="text-2xl font-bold">{replyStats.scanFailed || 0}</div>
          <div className="text-sm text-gray-500">Sản phẩm quét lỗi</div>
        </div>
      </div>

      {/* CONFIGURATION */}

      <div className="rounded-xl border p-4">
        <div className="mb-4 flex items-center gap-2 font-semibold">
          <Settings size={18} />
          Cấu hình tự động
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span>Chu kỳ quét (phút)</span>

            <input
              type="number"
              min="1"
              max="1440"
              value={form.intervalMinutes}
              onChange={(e) => handleChange("intervalMinutes", e.target.value)}
              className="w-full rounded-lg border p-2"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Số phản hồi mỗi lượt</span>

            <input
              type="number"
              min="1"
              max="500"
              value={form.maxRepliesPerRun}
              onChange={(e) => handleChange("maxRepliesPerRun", e.target.value)}
              className="w-full rounded-lg border p-2"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Khoảng nghỉ giữa phản hồi (ms)</span>

            <input
              type="number"
              min="1000"
              max="60000"
              step="500"
              value={form.delayBetweenRepliesMs}
              onChange={(e) =>
                handleChange("delayBetweenRepliesMs", e.target.value)
              }
              className="w-full rounded-lg border p-2"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>

          <button
            type="button"
            onClick={toggleAutoReply}
            disabled={saving}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-white disabled:opacity-50 ${
              setting?.enabled ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {setting?.enabled ? <Pause size={16} /> : <Play size={16} />}

            {setting?.enabled ? "Tắt tự động" : "Bật tự động"}
          </button>

          <button
            type="button"
            onClick={runNow}
            disabled={saving || !setting?.enabled || setting?.isRunning}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Chạy ngay
          </button>

          <button
            type="button"
            onClick={() => {
              loadStatus();
              loadHistory(1);
            }}
            disabled={refreshing || saving}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* LIVE PROGRESS */}

      <div className="rounded-xl border p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <Activity size={18} />
            Tiến độ xử lý realtime
          </h3>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
              setting?.isRunning ? "running" : setting?.lastStatus,
            )}`}
          >
            {setting?.isRunning
              ? "Đang xử lý"
              : getStatusLabel(setting?.lastStatus)}
          </span>
        </div>

        {setting?.isRunning && (
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-full animate-pulse rounded-full bg-blue-500" />
          </div>
        )}

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="mb-1 text-gray-500">Shop đang xử lý</div>
            <div className="flex items-center gap-2 font-semibold">
              <Store size={16} />
              {progress.currentShopName || progress.currentShopId || "Chưa có"}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="mb-1 text-gray-500">Sản phẩm đang quét</div>
            <div className="flex items-center gap-2 font-semibold">
              <Package size={16} />
              {progress.currentItemId || "Chưa có"}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-500">Tiến độ quét sản phẩm</span>

            <span className="font-semibold">
              {progress.completedItems}/{progress.totalItems} ({progressPercent}
              %)
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs text-gray-500">Trang đã tải</div>
            <div className="font-semibold">
              {progress.totalPages || progress.pageCount || 0}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Đánh giá đã tải</div>
            <div className="font-semibold">{progress.loaded || 0}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Tổng số shop</div>
            <div className="font-semibold">{progress.totalShops || 0}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Thời điểm bắt đầu</div>
            <div className="font-semibold">
              {formatDate(progress.startedAt || setting?.lastStartedAt)}
            </div>
          </div>
        </div>

        {progress.latestReply && (
          <div className="mt-4 rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Send size={16} />
              Phản hồi gần nhất
              <span
                className={`ml-auto rounded-full px-2 py-1 text-xs ${getStatusClass(
                  progress.latestReply.status,
                )}`}
              >
                {getStatusLabel(progress.latestReply.status)}
              </span>
            </div>

            <div className="space-y-1 text-sm">
              <div>
                Khách hàng:{" "}
                <strong>
                  {progress.latestReply.customerName || "Khách hàng"}
                </strong>
              </div>

              <div>
                Mã đánh giá:{" "}
                <strong>{progress.latestReply.commentId || "—"}</strong>
              </div>

              {progress.latestReply.replyContent && (
                <div className="mt-2 rounded-lg bg-gray-50 p-3">
                  {progress.latestReply.replyContent}
                </div>
              )}

              {progress.latestReply.error && (
                <div className="text-red-600">{progress.latestReply.error}</div>
              )}
            </div>
          </div>
        )}

        {progress.latestError && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <strong>Lỗi gần nhất:</strong> {progress.latestError}
          </div>
        )}
      </div>

      {/* SYSTEM STATUS */}

      <div className="rounded-xl border p-4">
        <h3 className="mb-3 font-semibold">Trạng thái hệ thống</h3>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <span className="text-gray-500">Trạng thái lượt chạy:</span>
            <div className="font-medium">
              {setting?.isRunning
                ? "Đang xử lý"
                : getStatusLabel(setting?.lastStatus)}
            </div>
          </div>

          <div>
            <span className="text-gray-500">Lần chạy gần nhất:</span>
            <div className="font-medium">
              {formatDate(setting?.lastStartedAt)}
            </div>
          </div>

          <div>
            <span className="text-gray-500">Hoàn tất gần nhất:</span>
            <div className="font-medium">
              {formatDate(setting?.lastFinishedAt)}
            </div>
          </div>

          <div>
            <span className="text-gray-500">Lỗi gần nhất:</span>
            <div className="font-medium text-red-600">
              {setting?.lastError || "Không có"}
            </div>
          </div>
        </div>
      </div>

      {/* HISTORY */}

      <div className="rounded-xl border p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <Clock size={18} />
              Lịch sử trả lời đánh giá
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Tổng cộng {historyPagination.total || 0} bản ghi
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadHistory(historyPage)}
            disabled={historyLoading}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <RefreshCw
              size={15}
              className={historyLoading ? "animate-spin" : ""}
            />
            Tải lịch sử
          </button>
        </div>

        {/* FILTER */}

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span>Trạng thái</span>

            <select
              value={historyStatus}
              onChange={(e) => setHistoryStatus(e.target.value)}
              className="w-full rounded-lg border p-2"
            >
              <option value="">Tất cả</option>
              <option value="sent">Đã gửi</option>
              <option value="failed">Thất bại</option>
              <option value="processing">Đang xử lý</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Shop ID</span>

            <input
              value={historyShopId}
              onChange={(e) => setHistoryShopId(e.target.value)}
              placeholder="Nhập shop ID"
              className="w-full rounded-lg border p-2"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={applyHistoryFilter}
              disabled={historyLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              <Search size={16} />
              Lọc lịch sử
            </button>
          </div>
        </div>

        {historyError && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {historyError}
          </div>
        )}

        {/* TABLE */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3">Thời gian</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3">Đánh giá</th>
                <th className="p-3">Nội dung đánh giá</th>
                <th className="p-3">Nội dung trả lời</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Số lần thử</th>
              </tr>
            </thead>

            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <RefreshCw className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Chưa có lịch sử trả lời.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr
                    key={item._id || `${item.shopId}-${item.commentId}`}
                    className="border-b align-top hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap p-3">
                      {formatDate(
                        item.sentAt || item.lastAttemptAt || item.createdAt,
                      )}
                    </td>

                    <td className="p-3">
                      <div className="font-medium">
                        {item.customerName || "Khách hàng"}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        Shop: {item.shopId}
                      </div>

                      <div className="text-xs text-gray-500">
                        ID: {item.commentId}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star size={14} fill="currentColor" />
                        {item.rating || 0}/5
                      </div>
                    </td>

                    <td className="max-w-[200px] whitespace-normal p-3">
                      {item.reviewContent || "Không có nội dung"}
                    </td>

                    <td className="max-w-[240px] whitespace-normal p-3">
                      {item.replyContent || (
                        <span className="text-gray-400">Chưa có</span>
                      )}

                      {item.errorMessage && (
                        <div className="mt-2 text-xs text-red-600">
                          {item.errorMessage}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(
                          item.status,
                        )}`}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </td>

                    <td className="p-3 text-center">{item.attempts || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-500">
            Trang {historyPage} / {historyPageCount || 1}
            {" · "}
            {historyPagination.total || 0} bản ghi
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadHistory(historyPage - 1)}
              disabled={historyLoading || historyPage <= 1}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => loadHistory(historyPage + 1)}
              disabled={
                historyLoading ||
                !historyPageCount ||
                historyPage >= historyPageCount
              }
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopeeAutoReviewPanel;
