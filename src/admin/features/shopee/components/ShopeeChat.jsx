import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, MessageCircle, RefreshCw, Search, Send, Store } from "lucide-react";
import shopeeApi from "../services/shopeeApi";
import "../styles/ShopeeChat.css";

const unwrap = (value) => value?.data?.data || value?.data || value || {};
const getId = (shop) => String(shop?.shop_id ?? shop?.shopId ?? shop?.id ?? "");
const getName = (shop) => shop?.shop_name || shop?.shopName || shop?.name || `Shop ${getId(shop)}`;
const getPreview = (item) => item?.preview || item?.lastMessage?.text || item?.lastMessage?.content?.text || item?.last_message?.content?.text || "Chưa có nội dung";
const getTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const getMessageText = (message) => message?.text || message?.content?.text || message?.rawData?.content?.text || message?.rawData?.content?.custom_preview_text?.text || "";

export default function ShopeeChat({ shops = [], selectedShopId = "", onShopChange }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [reviewTasks, setReviewTasks] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState("");
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async (quiet = false) => {
    if (!selectedShopId) {
      setConversations([]);
      return;
    }
    if (!quiet) setLoading(true);
    try {
      const result = unwrap(await shopeeApi.getChatConversations({ shop_id: selectedShopId, type: filter, pageSize: 40 }));
      const list = Array.isArray(result.conversations) ? result.conversations : [];
      setConversations(list);
      setLastSync(new Date());
      setError(result.warning || "");
      if (active) {
        const updated = list.find((item) => String(item.conversationId) === String(active.conversationId));
        if (updated) setActive(updated);
      }
    } catch (err) {
      setError(err?.status === 404 ? "Shopee Chat đang trả về 404. Hãy kiểm tra quyền Chat API và endpoint của ứng dụng Shopee Open Platform." : (err?.message || "Không thể tải hội thoại Shopee."));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedShopId, filter, active]);

  const loadReviewTasks = useCallback(async () => {
    if (!selectedShopId) { setReviewTasks([]); return; }
    try {
      const result = unwrap(await shopeeApi.getChatReviewTasks({ shop_id: selectedShopId }));
      setReviewTasks(Array.isArray(result.tasks) ? result.tasks : []);
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách tin nhắn chờ nhân viên kiểm tra.");
    }
  }, [selectedShopId]);

  const loadMessages = useCallback(async (conversation, quiet = false) => {
    if (!conversation || !selectedShopId) return;
    try {
      const result = unwrap(await shopeeApi.getChatMessages(conversation.conversationId, { shop_id: selectedShopId, pageSize: 50 }));
      setMessages(Array.isArray(result.messages) ? result.messages : []);
      const list = Array.isArray(result.messages) ? result.messages : [];
      const last = list[list.length - 1];
      if (last?.messageId) {
        await shopeeApi.markChatRead(conversation.conversationId, { shopId: selectedShopId, lastReadMessageId: last.messageId });
      }
      if (!quiet) setError("");
    } catch (err) {
      setError(err?.message || "Không thể tải tin nhắn.");
    }
  }, [selectedShopId]);

  useEffect(() => {
    setActive(null);
    setMessages([]);
    loadConversations();
  }, [selectedShopId, filter]);

  useEffect(() => {
    if (!selectedShopId) return undefined;
    const timer = setInterval(() => loadConversations(true), 25000);
    return () => clearInterval(timer);
  }, [selectedShopId, loadConversations]);

  useEffect(() => {
    if (!active) return undefined;
    loadMessages(active);
    const timer = setInterval(() => loadMessages(active, true), 12000);
    return () => clearInterval(timer);
  }, [active?.conversationId, selectedShopId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const filtered = useMemo(() => [...conversations]
    .sort((a, b) => {
      // Ưu tiên hội thoại có tin nhắn mới nhất từ người mua, sau đó chưa đọc.
      const buyerPriority = Number(Boolean(b.lastMessageFromBuyer)) - Number(Boolean(a.lastMessageFromBuyer));
      if (buyerPriority) return buyerPriority;
      const unreadPriority = Number(b.unreadCount || 0) - Number(a.unreadCount || 0);
      if (unreadPriority) return unreadPriority;
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
    })
    .filter((item) => {
      const term = query.trim().toLowerCase();
      if (!term) return true;
      return [item.buyerName, item.buyerId, item.preview, item.conversationId].some((value) => String(value || "").toLowerCase().includes(term));
    }), [conversations, query]);

  const send = async (event) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value || !active || sending) return;
    if (!active.buyerId) {
      setError("Không xác định được ID người mua từ dữ liệu hội thoại. Vui lòng đồng bộ lại hoặc kiểm tra quyền Chat API.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await shopeeApi.sendChatMessage(active.conversationId, { shopId: selectedShopId, toId: active.buyerId, text: value });
      setDraft("");
      await loadMessages(active, true);
      await loadConversations(true);
    } catch (err) {
      setError(err?.message || "Gửi tin nhắn thất bại.");
    } finally {
      setSending(false);
    }
  };

  const currentShop = shops.find((shop) => getId(shop) === String(selectedShopId));\n  const selectReviewTask = (task) => {\n    setDraft(task.messageText || "");\n    setActiveTaskId(task._id || "");\n    const matched = conversations.find((item) =>\n      (task.conversationId && String(item.conversationId) === String(task.conversationId)) ||\n      (task.buyerName && String(item.buyerName || "").toLowerCase() === String(task.buyerName).toLowerCase())\n    );\n    if (matched) setActive(matched);\n    else setError("Đã nạp nội dung. Chưa tìm thấy hội thoại khớp tự động; nhân viên cần chọn đúng hội thoại trước khi gửi.");\n  };\n  const dismissReviewTask = async (task) => {\n    try {\n      await shopeeApi.updateChatReviewTask(task._id, { shopId: selectedShopId, status: "dismissed" });\n      await loadReviewTasks();\n    } catch (err) { setError(err?.message || "Không thể bỏ qua nhiệm vụ."); }\n  };

  return (
    <section className="sh-chat-page">
      <header className="sh-chat-header">
        <div>
          <div className="sh-chat-eyebrow">CHĂM SÓC KHÁCH HÀNG</div>
          <h2><MessageCircle size={23} /> Shopee Chat</h2>
          <p>Đọc và trả lời tin nhắn trực tiếp từ gian hàng Shopee</p>
        </div>
        <div className="sh-chat-header-actions">
          <label className="sh-chat-shop-select"><Store size={16} />
            <select value={selectedShopId} onChange={(event) => onShopChange?.(event.target.value)} disabled={!shops.length}>
              {!shops.length && <option value="">Chưa có gian hàng</option>}
              {shops.map((shop) => <option key={getId(shop)} value={getId(shop)}>{getName(shop)}</option>)}
            </select>
          </label>
          <button className="sh-chat-refresh" onClick={() => loadConversations()} disabled={loading || !selectedShopId}><RefreshCw size={16} className={loading ? "sh-chat-spin" : ""}/> Làm mới</button>
        </div>
      </header>

      {error && <div className="sh-chat-alert"><AlertCircle size={18}/><span>{error}</span></div>}

      <section className="sh-chat-review-queue">\n        <div className="sh-chat-review-queue-head"><div><strong>Chờ nhân viên kiểm tra</strong><small>{reviewTasks.length} tin nhắn được tạo từ sự kiện gần đây</small></div><button type="button" onClick={loadReviewTasks} disabled={!selectedShopId}>Làm mới danh sách</button></div>\n        {reviewTasks.length ? <div className="sh-chat-review-task-list">\n          {reviewTasks.map((task) => <article className="sh-chat-review-task" key={task._id}>\n            <div className="sh-chat-review-task-meta"><strong>{task.eventType === "new_order" ? "Đơn hàng mới" : task.eventType === "shipped" ? "Đã gửi hàng" : "Khách vừa đánh giá"}</strong><span>{task.referenceId}</span></div>\n            <p>{task.messageText}</p>\n            <div className="sh-chat-review-task-actions"><span>{task.conversationId ? "Đã tìm thấy hội thoại" : "Chưa khớp hội thoại"}</span><button type="button" onClick={() => selectReviewTask(task)}>Kiểm tra nội dung</button><button type="button" className="subtle" onClick={() => dismissReviewTask(task)}>Bỏ qua</button></div>\n          </article>)}\n        </div> : <div className="sh-chat-review-empty">Chưa có sự kiện mới trong 3 ngày gần đây. Hãy đồng bộ đơn hàng/đánh giá Shopee rồi làm mới danh sách.</div>}\n        <p className="sh-chat-review-policy">Tin nhắn chỉ được đưa vào hàng chờ. Nhân viên phải chọn đúng hội thoại, kiểm tra nội dung và bấm Gửi; hệ thống không tự gửi.</p>\n      </section>\n\n      <div className="sh-chat-workspace">
        <aside className="sh-chat-inbox">
          <div className="sh-chat-inbox-title"><strong>Hội thoại</strong><span>{conversations.length}</span></div>
          <div className="sh-chat-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm khách hàng, nội dung..."/></div>
          <div className="sh-chat-filters">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tất cả</button>
            <button className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>Chưa đọc</button>
          </div>
          <div className="sh-chat-conversation-list">
            {filtered.map((item) => (
              <button key={item.conversationId} className={String(active?.conversationId) === String(item.conversationId) ? "sh-chat-conversation active" : "sh-chat-conversation"} onClick={() => setActive(item)}>
                <span className="sh-chat-avatar">{String(item.buyerName || "K").slice(0,1).toUpperCase()}</span>
                <span className="sh-chat-conversation-main">
                  <span className="sh-chat-conversation-top"><strong>{item.buyerName || "Khách Shopee"}</strong><time>{getTime(item.lastMessageAt)}</time></span>
                  <span className="sh-chat-preview">{item.lastMessageFromBuyer ? "Khách: " : ""}{getPreview(item)}</span>
                </span>
                {Number(item.unreadCount) > 0 && <i className="sh-chat-unread">{item.unreadCount}</i>}
              </button>
            ))}
            {!filtered.length && <div className="sh-chat-empty-list">{loading ? "Đang tải hội thoại..." : "Không có hội thoại phù hợp."}</div>}
          </div>
          <div className="sh-chat-sync-note">Cập nhật tự động mỗi 25 giây{lastSync ? ` · ${lastSync.toLocaleTimeString("vi-VN")}` : ""}</div>
        </aside>

        <main className="sh-chat-thread">
          {active ? <>
            <div className="sh-chat-thread-header">
              <span className="sh-chat-avatar large">{String(active.buyerName || "K").slice(0,1).toUpperCase()}</span>
              <div><strong>{active.buyerName || "Khách Shopee"}</strong><small>Mã hội thoại: {active.conversationId}</small></div>
            </div>
            <div className="sh-chat-messages">
              {messages.map((message) => {
                const seller = message.senderType === "seller" || String(message.rawData?.from_shop_id || "") === String(selectedShopId);
                return <div key={message.messageId || message._id} className={seller ? "sh-chat-message seller" : "sh-chat-message buyer"}>
                  <div className="sh-chat-bubble">
                    {getMessageText(message) || `[Tin nhắn ${message.messageType || "khác"}]`}
                    <time>{getTime(message.createdAtShopee || message.createdAt)}</time>
                  </div>
                </div>;
              })}
              {!messages.length && <div className="sh-chat-empty-thread">Chưa có tin nhắn trong hội thoại này.</div>}
              <div ref={bottomRef}/>
            </div>
            <form className="sh-chat-compose" onSubmit={send}>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Nhập tin nhắn trả lời..." rows={2} maxLength={5000}/>
              <button type="submit" disabled={!draft.trim() || sending}><Send size={17}/>{sending ? "Đang gửi" : "Gửi"}</button>
            </form>
            <div className="sh-chat-policy-note">Tin nhắn được gửi thủ công. Shopee có giới hạn số tin nhắn và điều kiện liên hệ người mua.</div>
          </> : <div className="sh-chat-welcome"><MessageCircle size={42}/><strong>Chọn một hội thoại</strong><span>Chọn khách hàng bên trái để xem và trả lời tin nhắn.</span></div>}
        </main>
      </div>
      <div className="sh-chat-footnote">{currentShop ? `Đang làm việc với ${getName(currentShop)}` : "Chưa chọn gian hàng"} · Không sử dụng AI tự động trả lời.</div>
    </section>
  );
}
