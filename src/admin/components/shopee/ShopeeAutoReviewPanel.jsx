import { useCallback, useEffect, useState } from "react";
import {
  Play,
  Pause,
  RefreshCw,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  Settings,
  Activity,
} from "lucide-react";

import shopeeAutoReviewApi from "../../services/shopeeAutoReviewApi";

const formatDate = (value) => {
  if (!value) return "Chưa có";

  return new Date(value).toLocaleString("vi-VN");
};

const ShopeeAutoReviewPanel = () => {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    intervalMinutes: 15,
    maxRepliesPerRun: 10,
    delayBetweenRepliesMs: 3000,
  });

  const loadStatus = useCallback(async () => {
    try {
      setError("");

      const result = await shopeeAutoReviewApi.getStatus();
      const data = result.data;

      setSetting(data);

      setForm({
        intervalMinutes: data.intervalMinutes ?? 15,
        maxRepliesPerRun: data.maxRepliesPerRun ?? 10,
        delayBetweenRepliesMs: data.delayBetweenRepliesMs ?? 3000,
      });
    } catch (err) {
      setError(err.message || "Không thể tải trạng thái.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    const timer = setInterval(loadStatus, 15000);

    return () => clearInterval(timer);
  }, [loadStatus]);

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const result = await shopeeAutoReviewApi.updateSettings(form);

      setSetting(result.data);
      setMessage("Đã lưu cấu hình.");
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

      setSetting(result.data);
      setMessage(result.message);
    } catch (err) {
      setError(err.message || "Không thể thay đổi trạng thái.");
    } finally {
      setSaving(false);
      await loadStatus();
    }
  };

  const runNow = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const result = await shopeeAutoReviewApi.runNow();

      setMessage(result.message);
      await loadStatus();
    } catch (err) {
      setError(err.message || "Không thể chạy tự động.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <RefreshCw className="animate-spin" />
      </div>
    );
  }

  const stats = setting?.lastStats || {};

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Tự động trả lời đánh giá Shopee</h2>
          <p className="text-sm text-gray-500">
            Backend tự động xử lý, không cần mở trình duyệt.
          </p>
        </div>

        <div
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            setting?.enabled
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {setting?.enabled ? "Đang bật" : "Đang tắt"}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border p-4">
          <MessageSquare className="mb-2 text-blue-500" />
          <div className="text-2xl font-bold">{stats.total || 0}</div>
          <div className="text-sm text-gray-500">Đánh giá tìm thấy</div>
        </div>

        <div className="rounded-xl border p-4">
          <CheckCircle className="mb-2 text-green-500" />
          <div className="text-2xl font-bold">{stats.replied || 0}</div>
          <div className="text-sm text-gray-500">Đã trả lời</div>
        </div>

        <div className="rounded-xl border p-4">
          <XCircle className="mb-2 text-red-500" />
          <div className="text-2xl font-bold">{stats.failed || 0}</div>
          <div className="text-sm text-gray-500">Thất bại</div>
        </div>

        <div className="rounded-xl border p-4">
          <Activity className="mb-2 text-orange-500" />
          <div className="text-2xl font-bold">{stats.skipped || 0}</div>
          <div className="text-sm text-gray-500">Bỏ qua</div>
        </div>
      </div>

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
            Lưu cấu hình
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
            onClick={loadStatus}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg border px-4 py-2"
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="mb-3 font-semibold">Trạng thái hệ thống</h3>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <span className="text-gray-500">Trạng thái lượt chạy:</span>
            <div className="font-medium">
              {setting?.isRunning
                ? "Đang xử lý"
                : setting?.lastStatus || "idle"}
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
    </div>
  );
};

export default ShopeeAutoReviewPanel;
