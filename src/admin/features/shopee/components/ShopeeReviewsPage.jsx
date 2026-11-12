import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  RefreshCw,
  Search,
  Star,
  MessageSquare,
  Send,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle2,
  Store,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Bot,
  Loader2,
  PauseCircle,
} from "lucide-react";

import shopeeApi from "../services/shopeeApi";
import shopeeAutoReviewApi from "../services/shopeeAutoReviewApi";
import ShopeeAutoReviewPanel from "./ShopeeAutoReviewPanel";

import "../styles/ShopeeReviewsPage.css";

const EMPTY_TEMPLATE = {
  _id: "",
  rating: 5,
  name: "",
  content: "",
  isDefault: false,
  isActive: true,
};

const AUTO_REPLY_LIMIT = 10;
const AUTO_REPLY_DELAY = 3000;
const MAX_REPLY_LENGTH = 500;

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response?.items ?? [];
}

function extractReviewPayload(response) {
  const body = response?.data ?? response ?? {};
  const data = body?.data ?? body;

  const reviews = Array.isArray(data)
    ? data
    : data?.reviews || data?.items || [];

  return {
    reviews: Array.isArray(reviews) ? reviews : [],
    pagination: body?.pagination || data?.pagination || {},
    errors: body?.errors || data?.errors || [],
    total: Number(
      body?.pagination?.total ??
        data?.pagination?.total ??
        body?.total ??
        data?.total ??
        reviews.length,
    ),
  };
}

function extractHistoryPayload(response) {
  const body = response?.data ?? response ?? {};
  const data = body?.data ?? body;

  const history = Array.isArray(data)
    ? data
    : data?.logs || data?.items || data?.history || data?.results || [];

  return {
    history: Array.isArray(history) ? history : [],
    pagination: body?.pagination || data?.pagination || {},
    total: Number(
      body?.pagination?.total ??
        data?.pagination?.total ??
        data?.total ??
        history.length,
    ),
  };
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function getShopId(shop) {
  return String(shop?.shopId || shop?.shop_id || "");
}

function getShopName(shop) {
  return shop?.shopName || shop?.shop_name || getShopId(shop);
}

function hasReviewReply(review) {
  return Boolean(
    review?.hasReply ||
    review?.shopeeReply ||
    review?.reply ||
    review?.replyText,
  );
}

function replacePlaceholders(content, review, shopName) {
  return String(content || "")
    .replace(/\{shopName\}/gi, shopName || "Shop")
    .replace(/\{productName\}/gi, review?.productName || "sản phẩm")
    .replace(/\{customerName\}/gi, review?.customerName || "bạn");
}

function getReplyTemplate(templates, rating) {
  const matching = templates.filter(
    (template) =>
      Number(template.rating) === Number(rating) && template.isActive !== false,
  );

  return matching.find((template) => template.isDefault) || matching[0] || null;
}

function StarRating({ rating = 0 }) {
  return (
    <span className="sr-stars">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={15}
          fill={index < Number(rating) ? "#f59e0b" : "none"}
          color={index < Number(rating) ? "#f59e0b" : "#cbd5e1"}
        />
      ))}
    </span>
  );
}

function HistoryStatus({ status }) {
  if (status === "sent") {
    return (
      <span className="sr-status sr-status-replied">
        <CheckCircle2 size={13} />
        Đã gửi
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="sr-status sr-status-pending">
        <AlertCircle size={13} />
        Thất bại
      </span>
    );
  }

  return (
    <span className="sr-status">
      <Clock size={13} />
      Đang xử lý
    </span>
  );
}

export default function ShopeeReviewsPage() {
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");
  const [tab, setTab] = useState("reviews");

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pagination, setPagination] = useState({
    more: false,
    nextCursor: "",
    total: 0,
  });

  const [cursorHistory, setCursorHistory] = useState([]);
  const [cursor, setCursor] = useState("");

  const [ratingFilter, setRatingFilter] = useState("");
  const [keyword, setKeyword] = useState("");

  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE);
  const [showPreview, setShowPreview] = useState(false);

  const [editingReview, setEditingReview] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  // Lịch sử tự động trả lời
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
  });

  const [autoReplyRunning, setAutoReplyRunning] = useState(false);
  const [autoProgress, setAutoProgress] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    current: "",
    stopped: false,
  });

  const autoStopRef = useRef(false);
  const autoRunningRef = useRef(false);
  const notifyTimerRef = useRef(null);

  const [message, setMessage] = useState(null);

  const notify = useCallback((type, text) => {
    setMessage({ type, text });

    if (notifyTimerRef.current) {
      window.clearTimeout(notifyTimerRef.current);
    }

    notifyTimerRef.current = window.setTimeout(() => {
      setMessage(null);
    }, 4000);
  }, []);

  const selectedShop = useMemo(
    () => shops.find((shop) => getShopId(shop) === shopId),
    [shops, shopId],
  );

  const shopName = getShopName(selectedShop);

  useEffect(() => {
    return () => {
      if (notifyTimerRef.current) {
        window.clearTimeout(notifyTimerRef.current);
      }

      autoStopRef.current = true;
    };
  }, []);

  // =====================================================
  // LOAD SHOPS
  // =====================================================

  const loadShops = useCallback(async () => {
    try {
      const response = await shopeeApi.getShops();
      const data = extractData(response);
      const list = Array.isArray(data) ? data : data?.shops || [];

      setShops(list);

      setShopId((current) => {
        if (current && list.some((shop) => getShopId(shop) === current)) {
          return current;
        }

        return list.length ? getShopId(list[0]) : "";
      });
    } catch (error) {
      notify(
        "error",
        getErrorMessage(error, "Không thể tải danh sách shop Shopee."),
      );
    }
  }, [notify]);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  // =====================================================
  // LOAD REVIEWS
  // =====================================================

  const loadReviews = useCallback(
    async (nextCursor = "") => {
      if (!shopId) {
        setReviews([]);
        return;
      }

      setLoading(true);

      try {
        const response = await shopeeApi.getReviews({
          shopId,
          limit: 20,
          cursor: nextCursor || "",
        });

        const result = extractReviewPayload(response);

        setReviews(result.reviews);

        setPagination({
          more: Boolean(result.pagination?.more),
          nextCursor:
            result.pagination?.nextCursor ||
            result.pagination?.next_cursor ||
            "",
          total: result.total,
        });
      } catch (error) {
        setReviews([]);

        notify(
          "error",
          getErrorMessage(error, "Không thể tải đánh giá Shopee."),
        );
      } finally {
        setLoading(false);
      }
    },
    [shopId, notify],
  );

  // =====================================================
  // LOAD TEMPLATES
  // =====================================================

  const loadTemplates = useCallback(async () => {
    if (!shopId) {
      setTemplates([]);
      return;
    }

    try {
      const response = await shopeeApi.getReviewTemplates({ shopId });
      const data = extractData(response);

      setTemplates(Array.isArray(data) ? data : data?.templates || []);
    } catch (error) {
      notify("error", getErrorMessage(error, "Không thể tải mẫu trả lời."));
    }
  }, [shopId, notify]);

  // =====================================================
  // LOAD AUTO REPLY HISTORY
  // =====================================================

  const loadHistory = useCallback(async () => {
    if (!shopId) {
      setHistory([]);
      setHistoryPagination({
        total: 0,
        page: 1,
        limit: 50,
      });
      return;
    }

    setHistoryLoading(true);

    try {
      const response = await shopeeAutoReviewApi.getHistory({
        shopId,
        page: 1,
        limit: 50,
      });

      const result = extractHistoryPayload(response);

      // Chỉ hiển thị lịch sử thuộc shop đang chọn.
      const shopHistory = result.history.filter(
        (item) => !item.shopId || String(item.shopId) === String(shopId),
      );

      setHistory(shopHistory);

      setHistoryPagination({
        total: result.total || shopHistory.length,
        page: 1,
        limit: 50,
      });
    } catch (error) {
      setHistory([]);

      notify(
        "error",
        getErrorMessage(error, "Không thể tải lịch sử tự động trả lời."),
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [shopId, notify]);

  // =====================================================
  // LOAD DATA WHEN SHOP / TAB CHANGES
  // =====================================================

  useEffect(() => {
    if (autoRunningRef.current) {
      autoStopRef.current = true;
    }

    setReviews([]);
    setTemplates([]);
    setHistory([]);
    setCursor("");
    setCursorHistory([]);
    setEditingReview(null);
    setReplyContent("");
    setSelectedTemplateId("");

    if (!shopId) return;

    if (tab === "reviews") {
      loadReviews("");
      loadTemplates();
    }

    if (tab === "templates") {
      loadTemplates();
    }

    if (tab === "history") {
      loadHistory();
    }
  }, [shopId, tab, loadReviews, loadTemplates, loadHistory]);

  // =====================================================
  // FILTER REVIEWS
  // =====================================================

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const ratingMatch =
        !ratingFilter || Number(review.rating) === Number(ratingFilter);

      const searchText = [
        review.customerName,
        review.productName,
        review.content,
        review.orderSn,
        review.commentId,
      ]
        .join(" ")
        .toLowerCase();

      const keywordMatch =
        !keyword.trim() || searchText.includes(keyword.trim().toLowerCase());

      return ratingMatch && keywordMatch;
    });
  }, [reviews, ratingFilter, keyword]);

  const reviewStats = useMemo(() => {
    const replied = reviews.filter(hasReviewReply).length;

    return {
      total: reviews.length,
      replied,
      pending: reviews.length - replied,
    };
  }, [reviews]);

  // =====================================================
  // HISTORY STATS
  // =====================================================

  const historyStats = useMemo(() => {
    return {
      total: historyPagination.total,
      sent: history.filter((item) => item.status === "sent").length,
      failed: history.filter((item) => item.status === "failed").length,
      processing: history.filter((item) => item.status === "processing").length,
    };
  }, [history, historyPagination.total]);

  // =====================================================
  // PAGINATION
  // =====================================================

  const nextPage = () => {
    if (!pagination.more || !pagination.nextCursor || loading) return;

    const nextCursor = pagination.nextCursor;

    setCursorHistory((current) => [...current, cursor]);
    setCursor(nextCursor);
    loadReviews(nextCursor);
  };

  const previousPage = () => {
    if (!cursorHistory.length || loading) return;

    const previousCursor = cursorHistory[cursorHistory.length - 1];

    setCursorHistory((current) => current.slice(0, -1));
    setCursor(previousCursor);
    loadReviews(previousCursor);
  };

  const refreshReviews = () => {
    if (loading || autoReplyRunning) return;

    setCursor("");
    setCursorHistory([]);
    loadReviews("");
  };

  // =====================================================
  // MANUAL REPLY
  // =====================================================

  const openReplyEditor = (review) => {
    setEditingReview(review);
    setReplyContent("");
    setSelectedTemplateId("");
  };

  const closeReplyEditor = () => {
    if (saving) return;

    setEditingReview(null);
    setReplyContent("");
    setSelectedTemplateId("");
  };

  const availableTemplates = useMemo(() => {
    if (!editingReview) return [];

    return templates.filter(
      (template) =>
        Number(template.rating) === Number(editingReview.rating) &&
        template.isActive !== false,
    );
  }, [templates, editingReview]);

  const applyTemplate = (templateId) => {
    setSelectedTemplateId(templateId);

    const template = availableTemplates.find(
      (item) => String(item._id) === String(templateId),
    );

    if (!template) {
      setReplyContent("");
      return;
    }

    setReplyContent(
      replacePlaceholders(template.content, editingReview, shopName),
    );
  };

  const suggestReply = async () => {
    if (!editingReview || !shopId || suggesting) return;

    setSuggesting(true);

    try {
      const response = await shopeeApi.suggestReviewReply({
        shopId,
        rating: editingReview.rating,
        review: editingReview,
        shopName,
      });

      const result = extractData(response);

      if (!result?.content) {
        notify("error", result?.message || "Chưa có mẫu trả lời phù hợp.");
        return;
      }

      setReplyContent(result.content);
      setSelectedTemplateId(result.templateId || "");

      notify("success", "Đã tạo nội dung phản hồi.");
    } catch (error) {
      notify(
        "error",
        getErrorMessage(error, "Không thể tạo nội dung trả lời."),
      );
    } finally {
      setSuggesting(false);
    }
  };

  const sendReply = async () => {
    if (!editingReview || saving) return;

    const content = replyContent.trim();

    if (!content) {
      notify("error", "Vui lòng nhập nội dung phản hồi.");
      return;
    }

    if (content.length > MAX_REPLY_LENGTH) {
      notify("error", "Nội dung không được vượt quá 500 ký tự.");
      return;
    }

    if (hasReviewReply(editingReview)) {
      notify("error", "Đánh giá này đã có phản hồi trên Shopee.");
      return;
    }

    if (!window.confirm(`Gửi phản hồi trực tiếp lên Shopee?\n\n${content}`)) {
      return;
    }

    setSaving(true);

    try {
      await shopeeApi.replyReview({
        shopId,
        commentId: editingReview.commentId,
        comment: content,
      });

      notify("success", "Đã gửi phản hồi lên Shopee.");

      setEditingReview(null);
      setReplyContent("");
      setSelectedTemplateId("");

      await loadReviews(cursor);
    } catch (error) {
      notify("error", getErrorMessage(error, "Gửi phản hồi thất bại."));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // MANUAL BULK REPLY
  // =====================================================

  const sleep = (ms) =>
    new Promise((resolve) => window.setTimeout(resolve, ms));

  const startAutoReply = async () => {
    if (!shopId || autoRunningRef.current || loading || saving) return;

    if (templates.filter((item) => item.isActive !== false).length === 0) {
      notify("error", "Chưa có mẫu trả lời nào đang bật.");
      return;
    }

    const confirmed = window.confirm(
      `TỰ TRẢ LỜI THEO LÔ\n\n` +
        `Shop: ${shopName}\n` +
        `Giới hạn: ${AUTO_REPLY_LIMIT} đánh giá/lượt\n` +
        `Thời gian chờ: ${AUTO_REPLY_DELAY / 1000} giây/lần\n\n` +
        `Đây là thao tác chạy thủ công từ trình duyệt. ` +
        `Không chạy cùng lúc với job tự động backend trên cùng shop.\n\n` +
        `Bạn có muốn tiếp tục?`,
    );

    if (!confirmed) return;

    autoStopRef.current = false;
    autoRunningRef.current = true;
    setAutoReplyRunning(true);

    setAutoProgress({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      current: "Đang tải đánh giá...",
      stopped: false,
    });

    let success = 0;
    let failed = 0;
    let skipped = 0;
    let processed = 0;

    try {
      const response = await shopeeApi.getAllReviews({
        shopId,
        pageSize: 100,
      });

      const result = extractReviewPayload(response);

      const uniqueReviews = Array.from(
        new Map(
          result.reviews
            .filter((review) => review.commentId && !hasReviewReply(review))
            .map((review) => [String(review.commentId), review]),
        ).values(),
      );

      if (!uniqueReviews.length) {
        notify("success", "Không có đánh giá chưa phản hồi.");
        return;
      }

      const selectedReviews = uniqueReviews.slice(0, AUTO_REPLY_LIMIT);

      setAutoProgress({
        total: selectedReviews.length,
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        current: `Tìm thấy ${uniqueReviews.length} đánh giá chưa phản hồi.`,
        stopped: false,
      });

      for (let index = 0; index < selectedReviews.length; index++) {
        if (autoStopRef.current) break;

        const review = selectedReviews[index];

        setAutoProgress((current) => ({
          ...current,
          current:
            `(${index + 1}/${selectedReviews.length}) ` +
            `${review.customerName || "Khách hàng"} - ${review.rating} sao`,
        }));

        const template = getReplyTemplate(templates, review.rating);

        if (!template) {
          skipped++;
          processed++;
        } else {
          const content = replacePlaceholders(
            template.content,
            review,
            shopName,
          ).trim();

          if (!content || content.length > MAX_REPLY_LENGTH) {
            skipped++;
            processed++;
          } else {
            try {
              await shopeeApi.replyReview({
                shopId,
                commentId: review.commentId,
                comment: content,
              });

              success++;
            } catch (error) {
              failed++;

              console.error(
                "Shopee bulk reply failed:",
                review.commentId,
                error,
              );
            }

            processed++;
          }
        }

        setAutoProgress((current) => ({
          ...current,
          processed,
          success,
          failed,
          skipped,
        }));

        if (index < selectedReviews.length - 1 && !autoStopRef.current) {
          await sleep(AUTO_REPLY_DELAY);
        }
      }

      notify(
        autoStopRef.current ? "error" : "success",
        `${autoStopRef.current ? "Đã dừng" : "Hoàn tất"}: ` +
          `${success} thành công, ${failed} thất bại, ${skipped} bỏ qua.`,
      );
    } catch (error) {
      notify(
        "error",
        getErrorMessage(error, "Không thể tải toàn bộ đánh giá Shopee."),
      );
    } finally {
      autoRunningRef.current = false;
      setAutoReplyRunning(false);

      setAutoProgress((current) => ({
        ...current,
        current: autoStopRef.current ? "Đã dừng." : "Đã hoàn tất.",
        stopped: autoStopRef.current,
      }));

      setCursor("");
      setCursorHistory([]);
      await loadReviews("");
    }
  };

  const stopAutoReply = () => {
    if (!autoRunningRef.current) return;

    autoStopRef.current = true;

    notify("error", "Đang dừng. Hệ thống sẽ không gửi đánh giá tiếp theo.");
  };

  // =====================================================
  // TEMPLATE CRUD
  // =====================================================

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ ...EMPTY_TEMPLATE, rating: 5 });
    setShowPreview(false);
    setShowTemplateModal(true);
  };

  const openEditTemplate = (template) => {
    setEditingTemplate(template);

    setTemplateForm({
      _id: template._id,
      rating: template.rating,
      name: template.name,
      content: template.content,
      isDefault: Boolean(template.isDefault),
      isActive: template.isActive !== false,
    });

    setShowPreview(false);
    setShowTemplateModal(true);
  };

  const closeTemplateModal = () => {
    if (saving) return;

    setShowTemplateModal(false);
    setEditingTemplate(null);
    setTemplateForm(EMPTY_TEMPLATE);
    setShowPreview(false);
  };

  const saveTemplate = async (event) => {
    event.preventDefault();

    if (!shopId) {
      notify("error", "Vui lòng chọn shop Shopee.");
      return;
    }

    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      notify("error", "Vui lòng nhập tên và nội dung mẫu.");
      return;
    }

    if (templateForm.content.trim().length > MAX_REPLY_LENGTH) {
      notify("error", "Nội dung mẫu không được vượt quá 500 ký tự.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        shopId,
        rating: Number(templateForm.rating),
        name: templateForm.name.trim(),
        content: templateForm.content.trim(),
        isDefault: templateForm.isDefault,
        isActive: templateForm.isActive,
      };

      if (editingTemplate) {
        await shopeeApi.updateReviewTemplate(editingTemplate._id, payload);

        notify("success", "Đã cập nhật mẫu trả lời.");
      } else {
        await shopeeApi.createReviewTemplate(payload);

        notify("success", "Đã tạo mẫu trả lời.");
      }

      setShowTemplateModal(false);
      setEditingTemplate(null);

      await loadTemplates();
    } catch (error) {
      notify("error", getErrorMessage(error, "Không thể lưu mẫu."));
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (template) => {
    if (!window.confirm(`Bạn có chắc muốn xóa mẫu "${template.name}"?`)) {
      return;
    }

    try {
      await shopeeApi.deleteReviewTemplate(template._id, shopId);

      notify("success", "Đã xóa mẫu trả lời.");

      await loadTemplates();
    } catch (error) {
      notify("error", getErrorMessage(error, "Không thể xóa mẫu."));
    }
  };

  const previewContent = useMemo(
    () =>
      replacePlaceholders(
        templateForm.content,
        {
          productName: "Sản phẩm mẫu",
          customerName: "Khách hàng",
        },
        shopName,
      ),
    [templateForm.content, shopName],
  );

  const templateGroups = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        items: templates.filter(
          (template) => Number(template.rating) === rating,
        ),
      })),
    [templates],
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="shopee-reviews-page">
      <div className="sr-page-header">
        <div>
          <h1>Quản lý đánh giá Shopee</h1>
          <p>
            Quản lý đánh giá, mẫu phản hồi, tự động trả lời và lịch sử xử lý.
          </p>
        </div>

        {tab === "reviews" && (
          <div className="sr-header-actions">
            {!autoReplyRunning ? (
              <button
                className="sr-btn sr-btn-primary"
                onClick={startAutoReply}
                disabled={
                  !shopId || loading || saving || templates.length === 0
                }
              >
                <Bot size={17} />
                Trả lời theo lô
              </button>
            ) : (
              <button className="sr-btn sr-btn-danger" onClick={stopAutoReply}>
                <PauseCircle size={17} />
                Dừng xử lý
              </button>
            )}

            <button
              className="sr-btn sr-btn-light"
              onClick={refreshReviews}
              disabled={!shopId || loading || autoReplyRunning}
            >
              <RefreshCw size={16} className={loading ? "sr-spin" : ""} />
              Làm mới
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className={`sr-toast sr-toast-${message.type}`}>
          {message.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}

          <span>{message.text}</span>

          <button onClick={() => setMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="sr-shop-selector">
        <Store size={19} />

        <select
          value={shopId}
          onChange={(event) => setShopId(event.target.value)}
          disabled={autoReplyRunning}
        >
          <option value="">-- Chọn shop Shopee --</option>

          {shops.map((shop) => {
            const id = getShopId(shop);

            return (
              <option key={id} value={id}>
                {getShopName(shop)}
              </option>
            );
          })}
        </select>

        {selectedShop && <span className="sr-shop-id">Shop ID: {shopId}</span>}
      </div>

      {/* TABS */}

      <div className="sr-tabs">
        <button
          className={tab === "reviews" ? "active" : ""}
          onClick={() => setTab("reviews")}
          disabled={autoReplyRunning}
        >
          <MessageSquare size={17} />
          Đánh giá
        </button>

        <button
          className={tab === "templates" ? "active" : ""}
          onClick={() => setTab("templates")}
          disabled={autoReplyRunning}
        >
          <Settings size={17} />
          Mẫu trả lời
        </button>

        <button
          className={tab === "auto" ? "active" : ""}
          onClick={() => setTab("auto")}
          disabled={autoReplyRunning}
        >
          <Bot size={17} />
          Tự động trả lời
        </button>

        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
          disabled={autoReplyRunning}
        >
          <Clock size={17} />
          Lịch sử
        </button>
      </div>

      {/* AUTO REPLY TAB */}

      {tab === "auto" ? (
        <div className="sr-auto-tab">
          <ShopeeAutoReviewPanel />
        </div>
      ) : !shopId ? (
        <div className="sr-empty">
          <Store size={35} />
          <h3>Chưa chọn shop Shopee</h3>
          <p>Vui lòng chọn shop để quản lý dữ liệu.</p>
        </div>
      ) : tab === "history" ? (
        /* =========================================
           HISTORY TAB
        ========================================= */

        <div className="sr-history-section">
          <div className="sr-template-header">
            <div>
              <h2>Lịch sử tự động trả lời</h2>
              <p>
                Theo dõi các đánh giá được cron xử lý và kết quả gửi phản hồi
                lên Shopee.
              </p>
            </div>

            <button
              className="sr-btn sr-btn-light"
              onClick={loadHistory}
              disabled={historyLoading}
            >
              <RefreshCw
                size={16}
                className={historyLoading ? "sr-spin" : ""}
              />
              Làm mới
            </button>
          </div>

          <div className="sr-review-summary">
            <div className="sr-summary-item">
              <span>Tổng lịch sử</span>
              <strong>{historyStats.total}</strong>
            </div>

            <div className="sr-summary-item">
              <span>Thành công</span>
              <strong className="success">{historyStats.sent}</strong>
            </div>

            <div className="sr-summary-item">
              <span>Thất bại</span>
              <strong className="pending">{historyStats.failed}</strong>
            </div>

            <div className="sr-summary-item">
              <span>Đang xử lý</span>
              <strong>{historyStats.processing}</strong>
            </div>
          </div>

          {historyLoading ? (
            <div className="sr-loading">
              <Loader2 size={22} className="sr-spin" />
              Đang tải lịch sử...
            </div>
          ) : history.length === 0 ? (
            <div className="sr-empty">
              <Clock size={35} />
              <h3>Chưa có lịch sử trả lời</h3>
              <p>Lịch sử sẽ xuất hiện sau khi cron tự động xử lý đánh giá.</p>
            </div>
          ) : (
            <div className="sr-history-list">
              {history.map((item) => (
                <article
                  className="sr-history-card"
                  key={item._id || `${item.shopId}-${item.commentId}`}
                >
                  <div className="sr-history-top">
                    <div className="sr-history-customer">
                      <strong>
                        {item.customerName || "Khách hàng Shopee"}
                      </strong>

                      <StarRating rating={item.rating} />
                    </div>

                    <HistoryStatus status={item.status} />
                  </div>

                  <div className="sr-history-meta">
                    <span>
                      <strong>Mã đánh giá:</strong> {item.commentId || "—"}
                    </span>

                    <span>
                      <strong>Mã sản phẩm:</strong> {item.itemId || "—"}
                    </span>

                    <span>
                      <strong>Shop:</strong> {item.shopId || shopId}
                    </span>

                    <span>
                      <strong>Thời gian:</strong>{" "}
                      {formatDate(
                        item.sentAt ||
                          item.lastAttemptAt ||
                          item.processingAt ||
                          item.createdAt,
                      )}
                    </span>

                    <span>
                      <strong>Số lần thử:</strong> {item.attempts || 0}
                    </span>
                  </div>

                  {item.reviewContent && (
                    <div className="sr-history-content">
                      <strong>Nội dung khách đánh giá</strong>
                      <p>{item.reviewContent}</p>
                    </div>
                  )}

                  {item.replyContent && (
                    <div className="sr-existing-reply">
                      <strong>Nội dung phản hồi</strong>
                      <p>{item.replyContent}</p>
                    </div>
                  )}

                  {item.errorMessage && (
                    <div className="sr-history-error">
                      <AlertCircle size={16} />
                      <span>{item.errorMessage}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : tab === "reviews" ? (
        /* =========================================
           REVIEWS TAB
        ========================================= */

        <>
          <div className="sr-review-summary">
            <div className="sr-summary-item">
              <span>Tổng đánh giá trang hiện tại</span>
              <strong>{reviewStats.total}</strong>
            </div>

            <div className="sr-summary-item">
              <span>Đã phản hồi</span>
              <strong className="success">{reviewStats.replied}</strong>
            </div>

            <div className="sr-summary-item">
              <span>Chưa phản hồi</span>
              <strong className="pending">{reviewStats.pending}</strong>
            </div>
          </div>

          {(autoReplyRunning || autoProgress.total > 0) && (
            <div className="sr-auto-progress">
              <div className="sr-auto-progress-header">
                <strong>
                  <Bot size={17} />
                  {autoReplyRunning
                    ? "Đang trả lời theo lô"
                    : autoProgress.stopped
                      ? "Đã dừng"
                      : "Kết quả xử lý"}
                </strong>

                <span>
                  {autoProgress.processed}/{autoProgress.total}
                </span>
              </div>

              <div className="sr-auto-progress-track">
                <div
                  className="sr-auto-progress-bar"
                  style={{
                    width: `${
                      autoProgress.total
                        ? Math.min(
                            100,
                            (autoProgress.processed / autoProgress.total) * 100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="sr-auto-progress-stats">
                <span>Thành công: {autoProgress.success}</span>
                <span>Thất bại: {autoProgress.failed}</span>
                <span>Bỏ qua: {autoProgress.skipped}</span>
              </div>

              <small>{autoProgress.current}</small>
            </div>
          )}

          <div className="sr-filters">
            <div className="sr-search">
              <Search size={17} />

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm sản phẩm, khách hàng, nội dung..."
              />
            </div>

            <select
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
            >
              <option value="">Tất cả số sao</option>

              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} sao
                </option>
              ))}
            </select>

            <button
              className="sr-btn sr-btn-light"
              onClick={refreshReviews}
              disabled={loading || autoReplyRunning}
            >
              <RefreshCw size={16} />
              Làm mới
            </button>
          </div>

          <div className="sr-review-list">
            {loading ? (
              <div className="sr-loading">
                <Loader2 className="sr-spin" size={22} />
                Đang tải đánh giá từ Shopee...
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="sr-empty">
                <MessageSquare size={35} />
                <h3>Không có đánh giá phù hợp</h3>
                <p>Thử thay đổi bộ lọc hoặc tải lại dữ liệu từ Shopee.</p>
              </div>
            ) : (
              filteredReviews.map((review) => {
                const hasReply = hasReviewReply(review);

                return (
                  <article className="sr-review-card" key={review.commentId}>
                    <div className="sr-review-top">
                      <div className="sr-customer">
                        <strong>
                          {review.customerName || "Khách hàng Shopee"}
                        </strong>

                        <StarRating rating={review.rating} />

                        <span className="sr-date">
                          <Clock size={13} />
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      <span
                        className={`sr-status ${
                          hasReply ? "sr-status-replied" : "sr-status-pending"
                        }`}
                      >
                        {hasReply ? "Đã phản hồi" : "Chưa phản hồi"}
                      </span>
                    </div>

                    <div className="sr-product">
                      {review.productImage ? (
                        <img
                          src={review.productImage}
                          alt={review.productName || "Sản phẩm"}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="sr-no-image">
                          <ImageIcon size={22} />
                        </div>
                      )}

                      <div>
                        <strong>
                          {review.productName || "Sản phẩm Shopee"}
                        </strong>

                        <small>Mã đánh giá: {review.commentId}</small>

                        {review.orderSn && (
                          <small>Mã đơn: {review.orderSn}</small>
                        )}
                      </div>
                    </div>

                    <div className="sr-review-content">
                      {review.content || "Khách hàng không để lại nội dung."}
                    </div>

                    {review.images?.length > 0 && (
                      <div className="sr-review-images">
                        {review.images.map((image, index) => (
                          <a
                            href={image}
                            target="_blank"
                            rel="noreferrer"
                            key={`${image}-${index}`}
                          >
                            <img src={image} alt="Ảnh đánh giá" />
                          </a>
                        ))}
                      </div>
                    )}

                    {hasReply && (
                      <div className="sr-existing-reply">
                        <strong>Phản hồi trên Shopee</strong>

                        <p>
                          {review.shopeeReply ||
                            review.reply ||
                            review.replyText}
                        </p>

                        {review.repliedAt && (
                          <small>{formatDate(review.repliedAt)}</small>
                        )}
                      </div>
                    )}

                    {!hasReply && (
                      <div className="sr-review-actions">
                        <button
                          className="sr-btn sr-btn-primary"
                          onClick={() => openReplyEditor(review)}
                        >
                          <Pencil size={15} />
                          Trả lời đánh giá
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>

          <div className="sr-pagination">
            <button
              disabled={!cursorHistory.length || loading}
              onClick={previousPage}
            >
              <ChevronLeft size={15} />
              Trang trước
            </button>

            <span>
              Trang {cursorHistory.length + 1}
              {" · "}
              {pagination.total || reviews.length} đánh giá
            </span>

            <button disabled={!pagination.more || loading} onClick={nextPage}>
              Trang sau
              <ChevronRight size={15} />
            </button>
          </div>
        </>
      ) : (
        /* =========================================
           TEMPLATE TAB
        ========================================= */

        <div className="sr-template-section">
          <div className="sr-template-header">
            <div>
              <h2>Mẫu trả lời theo số sao</h2>
              <p>
                Ưu tiên mẫu mặc định; nếu không có, sử dụng mẫu đang bật đầu
                tiên theo số sao.
              </p>
            </div>

            <button
              className="sr-btn sr-btn-primary"
              onClick={openCreateTemplate}
            >
              <Plus size={17} />
              Thêm mẫu
            </button>
          </div>

          <div className="sr-placeholder-help">
            <span>Biến hỗ trợ:</span>
            <code>{"{shopName}"}</code>
            <code>{"{productName}"}</code>
            <code>{"{customerName}"}</code>
          </div>

          {templateGroups.map((group) => (
            <section className="sr-template-group" key={group.rating}>
              <div className="sr-template-group-title">
                <StarRating rating={group.rating} />
                <strong>{group.rating} sao</strong>
                <span>{group.items.length} mẫu</span>
              </div>

              {group.items.length === 0 ? (
                <div className="sr-template-empty">
                  Chưa có mẫu trả lời cho mức đánh giá này.
                </div>
              ) : (
                <div className="sr-template-grid">
                  {group.items.map((template) => (
                    <div
                      className={`sr-template-card ${
                        template.isActive === false ? "inactive" : ""
                      }`}
                      key={template._id}
                    >
                      <div className="sr-template-card-top">
                        <strong>{template.name}</strong>

                        <div className="sr-template-tags">
                          {template.isDefault && (
                            <span className="sr-tag default">Mặc định</span>
                          )}

                          <span
                            className={`sr-tag ${
                              template.isActive !== false
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {template.isActive !== false
                              ? "Đang bật"
                              : "Đã tắt"}
                          </span>
                        </div>
                      </div>

                      <p>{template.content}</p>

                      <div className="sr-template-actions">
                        <button
                          className="sr-btn sr-btn-light"
                          onClick={() => openEditTemplate(template)}
                        >
                          <Pencil size={14} />
                          Sửa
                        </button>

                        <button
                          className="sr-btn sr-btn-danger-light"
                          onClick={() => deleteTemplate(template)}
                        >
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* MANUAL REPLY MODAL */}

      {editingReview && (
        <div
          className="sr-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReplyEditor();
            }
          }}
        >
          <div className="sr-modal">
            <div className="sr-modal-header">
              <div>
                <h2>Trả lời đánh giá Shopee</h2>
                <p>{editingReview.productName || "Sản phẩm Shopee"}</p>
              </div>

              <button
                type="button"
                onClick={closeReplyEditor}
                disabled={saving}
              >
                <X />
              </button>
            </div>

            <div className="sr-modal-body">
              <div className="sr-editor-review">
                <strong>{editingReview.customerName || "Khách hàng"}</strong>

                <StarRating rating={editingReview.rating} />

                <p>
                  {editingReview.content || "Khách hàng không để lại nội dung."}
                </p>
              </div>

              <label>Chọn mẫu trả lời</label>

              <select
                value={selectedTemplateId}
                onChange={(event) => applyTemplate(event.target.value)}
              >
                <option value="">-- Chọn mẫu trả lời --</option>

                {availableTemplates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                    {template.isDefault ? " (Mặc định)" : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="sr-btn sr-btn-light"
                onClick={suggestReply}
                disabled={suggesting}
              >
                {suggesting ? (
                  <Loader2 size={15} className="sr-spin" />
                ) : (
                  <MessageSquare size={15} />
                )}

                {suggesting ? "Đang tạo nội dung..." : "Tự chọn mẫu phù hợp"}
              </button>

              <label>Nội dung phản hồi</label>

              <textarea
                rows={6}
                maxLength={MAX_REPLY_LENGTH}
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                placeholder="Nhập nội dung phản hồi..."
              />

              <div className="sr-character-count">
                {replyContent.length}/{MAX_REPLY_LENGTH} ký tự
              </div>

              <div className="sr-preview">
                <strong>Lưu ý</strong>
                <p>
                  Nội dung chỉ được gửi lên Shopee khi bạn nhấn Gửi phản hồi.
                </p>
              </div>
            </div>

            <div className="sr-modal-footer">
              <button
                className="sr-btn sr-btn-light"
                onClick={closeReplyEditor}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                className="sr-btn sr-btn-primary"
                onClick={sendReply}
                disabled={
                  saving ||
                  !replyContent.trim() ||
                  hasReviewReply(editingReview)
                }
              >
                {saving ? (
                  <Loader2 size={16} className="sr-spin" />
                ) : (
                  <Send size={16} />
                )}

                {saving ? "Đang gửi..." : "Gửi lên Shopee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE MODAL */}

      {showTemplateModal && (
        <div
          className="sr-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTemplateModal();
            }
          }}
        >
          <form className="sr-modal" onSubmit={saveTemplate}>
            <div className="sr-modal-header">
              <div>
                <h2>
                  {editingTemplate ? "Sửa mẫu trả lời" : "Thêm mẫu trả lời"}
                </h2>
                <p>Thiết lập mẫu phản hồi theo số sao.</p>
              </div>

              <button
                type="button"
                onClick={closeTemplateModal}
                disabled={saving}
              >
                <X />
              </button>
            </div>

            <div className="sr-modal-body">
              <label>Số sao</label>

              <select
                value={templateForm.rating}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    rating: Number(event.target.value),
                  }))
                }
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} sao
                  </option>
                ))}
              </select>

              <label>Tên mẫu</label>

              <input
                value={templateForm.name}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                maxLength={100}
                placeholder="Ví dụ: Cảm ơn khách 5 sao"
              />

              <label>Nội dung trả lời</label>

              <textarea
                rows={5}
                value={templateForm.content}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                maxLength={MAX_REPLY_LENGTH}
                placeholder="Nhập nội dung mẫu..."
              />

              <div className="sr-character-count">
                {templateForm.content.length}/{MAX_REPLY_LENGTH} ký tự
              </div>

              <div className="sr-placeholder-help">
                <span>Biến:</span>
                <code>{"{shopName}"}</code>
                <code>{"{productName}"}</code>
                <code>{"{customerName}"}</code>
              </div>

              <button
                type="button"
                className="sr-btn sr-btn-light"
                onClick={() => setShowPreview((value) => !value)}
              >
                {showPreview ? "Ẩn xem trước" : "Xem trước"}
              </button>

              {showPreview && (
                <div className="sr-preview">
                  <strong>Xem trước nội dung</strong>
                  <p>{previewContent || "Chưa có nội dung mẫu."}</p>
                </div>
              )}

              <div className="sr-template-options">
                <label>
                  <input
                    type="checkbox"
                    checked={templateForm.isDefault}
                    onChange={(event) =>
                      setTemplateForm((current) => ({
                        ...current,
                        isDefault: event.target.checked,
                      }))
                    }
                  />
                  Đặt làm mẫu mặc định cho mức sao này
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={templateForm.isActive}
                    onChange={(event) =>
                      setTemplateForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  Cho phép sử dụng mẫu này
                </label>
              </div>
            </div>

            <div className="sr-modal-footer">
              <button
                type="button"
                className="sr-btn sr-btn-light"
                onClick={closeTemplateModal}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="sr-btn sr-btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={16} className="sr-spin" />
                ) : (
                  <Check size={16} />
                )}

                {saving ? "Đang lưu..." : "Lưu mẫu"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
