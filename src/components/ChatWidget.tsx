import { FC, useEffect, useMemo, useRef, useState } from "react";

import { io, Socket } from "socket.io-client";

import {
  getOrCreateConversation,
  getMessages,
  markChatRead,
  sendMessageApi,
  CHAT_SOCKET_URL,
  ChatMessage,
  ProductContext,
} from "../api/chatApi";

interface CustomerInfo {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
}

interface ChatWidgetProps {
  customerId?: string;
  customer?: CustomerInfo;

  // Sản phẩm đang xem
  product?: ProductContext;
}

// ======================================================
// TẠO MỘT OBJECT ID HỢP LỆ CHO GUEST
// ======================================================

const generateObjectId = () => {
  const cryptoObj = window.crypto || window.msCrypto;

  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(12);

    cryptoObj.getRandomValues(bytes);

    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // fallback
  return (Date.now().toString(16) + Math.random().toString(16).substring(2))
    .padEnd(24, "0")
    .substring(0, 24);
};

// ======================================================
// LẤY / TẠO GUEST ID
// ======================================================

const getGuestId = () => {
  const STORAGE_KEY = "nk_guest_chat_id";

  let guestId = localStorage.getItem(STORAGE_KEY);

  // Kiểm tra ObjectId 24 ký tự hex
  const isValidObjectId = /^[a-f\d]{24}$/i.test(guestId || "");

  if (!isValidObjectId) {
    guestId = generateObjectId();

    localStorage.setItem(STORAGE_KEY, guestId);
  }

  return guestId;
};

const ChatWidget: FC<ChatWidgetProps> = ({ customerId, customer, product }) => {
  const [open, setOpen] = useState(false);

  const [conversationId, setConversationId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [sending, setSending] = useState(false);

  const [typing, setTyping] = useState(false);

  const [unread, setUnread] = useState(0);

  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ======================================================
  // CUSTOMER ID
  // ======================================================
  //
  // Ưu tiên:
  // 1. customerId truyền từ component
  // 2. customer._id
  // 3. localStorage customer
  // 4. guestId
  //
  // ======================================================

  const finalCustomerId = useMemo(() => {
    // Đăng nhập
    if (customerId) {
      return customerId;
    }

    if (customer?._id) {
      return customer._id;
    }

    try {
      const customerStorage = localStorage.getItem("customer");

      if (customerStorage) {
        const parsed = JSON.parse(customerStorage);

        const loggedCustomerId =
          parsed?._id || parsed?.id || parsed?.customerId;

        if (loggedCustomerId) {
          return loggedCustomerId;
        }
      }
    } catch (error) {
      console.error("Read customer storage error:", error);
    }

    // ==============================================
    // CHƯA ĐĂNG NHẬP -> GUEST
    // ==============================================

    return getGuestId();
  }, [customerId, customer?._id]);

  // ======================================================
  // KIỂM TRA KHÁCH ĐÃ ĐĂNG NHẬP HAY CHƯA
  // ======================================================

  const isGuest = useMemo(() => {
    try {
      const customerStorage = localStorage.getItem("customer");

      if (customerStorage) {
        const parsed = JSON.parse(customerStorage);

        if (parsed?._id || parsed?.id || parsed?.customerId) {
          return false;
        }
      }
    } catch {
      // ignore
    }

    return !customerId && !customer?._id;
  }, [customerId, customer?._id]);

  // ======================================================
  // SCROLL
  // ======================================================

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  };

  // ======================================================
  // LOAD CONVERSATION
  // ======================================================

  const loadConversation = async () => {
    if (!finalCustomerId) {
      return;
    }

    try {
      setLoading(true);

      const response = await getOrCreateConversation(finalCustomerId, product);

      console.log("CHAT CONVERSATION:", response);

      const conversation = response?.conversation;

      if (!conversation?._id) {
        throw new Error("Không nhận được conversation");
      }

      setConversationId(conversation._id);

      const messageResponse = await getMessages(conversation._id);

      console.log("CHAT MESSAGES:", messageResponse);

      const list = messageResponse?.messages || [];

      setMessages(list);

      await markChatRead(conversation._id, "customer").catch(() => {});

      setUnread(0);

      scrollToBottom();
    } catch (error: any) {
      console.error(
        "LOAD CUSTOMER CHAT ERROR:",
        error?.response?.data || error,
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // MỞ CHAT -> LOAD
  // ======================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    loadConversation();
  }, [open, finalCustomerId]);

  // ======================================================
  // SOCKET
  // ======================================================

  useEffect(() => {
    console.log("CUSTOMER SOCKET URL:", CHAT_SOCKET_URL);

    const socket = io(CHAT_SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
    });

    socketRef.current = socket;

    // ----------------------------------------------------
    // CONNECT
    // ----------------------------------------------------

    socket.on("connect", () => {
      console.log("✅ CUSTOMER SOCKET CONNECTED:", socket.id);

      if (conversationId) {
        socket.emit("chat:join", {
          conversationId,
        });
      }
    });

    // ----------------------------------------------------
    // CONNECT ERROR
    // ----------------------------------------------------

    socket.on("connect_error", (error) => {
      console.error("❌ CUSTOMER SOCKET ERROR:", error.message);
    });

    // ----------------------------------------------------
    // NEW MESSAGE
    // ----------------------------------------------------

    socket.on("chat:new-message", (newMessage: ChatMessage) => {
      console.log("📩 CUSTOMER NEW MESSAGE:", newMessage);

      if (newMessage.conversationId !== conversationId) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some((item) => item._id === newMessage._id);

        if (exists) {
          return prev;
        }

        return [...prev, newMessage];
      });

      // Admin gửi
      if (newMessage.senderType === "admin") {
        if (open) {
          markChatRead(newMessage.conversationId, "customer").catch(() => {});

          setUnread(0);
        } else {
          setUnread((prev) => prev + 1);
        }
      }

      scrollToBottom();
    });

    // ----------------------------------------------------
    // TYPING
    // ----------------------------------------------------

    socket.on(
      "chat:typing",
      ({ conversationId: incomingConversationId, senderType }) => {
        if (
          incomingConversationId === conversationId &&
          senderType === "admin"
        ) {
          setTyping(true);
        }
      },
    );

    // ----------------------------------------------------
    // STOP TYPING
    // ----------------------------------------------------

    socket.on(
      "chat:stop-typing",
      ({ conversationId: incomingConversationId, senderType }) => {
        if (
          incomingConversationId === conversationId &&
          senderType === "admin"
        ) {
          setTyping(false);
        }
      },
    );

    // ----------------------------------------------------
    // CLOSED
    // ----------------------------------------------------

    socket.on("chat:closed", ({ conversationId: closedConversationId }) => {
      if (closedConversationId === conversationId) {
        setConversationId(null);
        setMessages([]);
        setTyping(false);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, open]);

  // ======================================================
  // JOIN ROOM KHI CÓ CONVERSATION
  // ======================================================

  useEffect(() => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit("chat:join", {
        conversationId,
      });

      console.log("CUSTOMER JOIN ROOM:", conversationId);
    }
  }, [conversationId]);

  // ======================================================
  // SEND MESSAGE
  // ======================================================

  const handleSend = async () => {
    if (!conversationId || !finalCustomerId || sending) {
      return;
    }

    const message = input.trim();

    if (!message && selectedImages.length === 0 && !product?.productId) {
      return;
    }

    try {
      setSending(true);

      const response = await sendMessageApi(conversationId, {
        senderType: "customer",

        // Guest cũng dùng ID riêng
        senderId: finalCustomerId,

        message,

        images: selectedImages,

        product: product || {},
      });

      console.log("CUSTOMER SEND RESPONSE:", response);

      // API thành công ->
      // hiện ngay trên màn hình
      if (response?.message) {
        setMessages((prev) => {
          const exists = prev.some((item) => item._id === response.message._id);

          if (exists) {
            return prev;
          }

          return [...prev, response.message];
        });
      }

      setInput("");

      setSelectedImages([]);

      socketRef.current?.emit("chat:stop-typing", {
        conversationId,
        senderType: "customer",
      });

      scrollToBottom();
    } catch (error: any) {
      console.error("CUSTOMER SEND ERROR:", error?.response?.data || error);
    } finally {
      setSending(false);
    }
  };

  // ======================================================
  // TYPING
  // ======================================================

  const handleTyping = (value: string) => {
    setInput(value);

    if (!conversationId) {
      return;
    }

    socketRef.current?.emit("chat:typing", {
      conversationId,
      senderType: "customer",
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("chat:stop-typing", {
        conversationId,
        senderType: "customer",
      });
    }, 800);
  };

  // ======================================================
  // IMAGE SELECT
  // ======================================================

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    const maxImages = 4 - selectedImages.length;

    const selectedFiles = files.slice(0, maxImages);

    selectedFiles.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        alert(`Ảnh ${file.name} vượt quá 2MB`);

        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== "string") {
          return;
        }

        setSelectedImages((prev) => [...prev, reader.result as string]);
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  };

  // ======================================================
  // REMOVE IMAGE
  // ======================================================

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ======================================================
  // TOGGLE CHAT
  // ======================================================

  const toggleChat = () => {
    const next = !open;

    setOpen(next);

    if (next && conversationId) {
      markChatRead(conversationId, "customer").catch(() => {});

      setUnread(0);
    }
  };

  // ======================================================
  // KHÔNG CÒN return null KHI CHƯA LOGIN
  // ======================================================

  return (
    <>
      {/* ==================================================
          CHAT BUTTON
      ================================================== */}

      {!open && (
        <button
          type="button"
          onClick={toggleChat}
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            width: 60,
            height: 60,
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg,#111827,#2563eb)",
            color: "#fff",
            fontSize: 25,
            cursor: "pointer",
            zIndex: 9999,
            boxShadow: "0 8px 30px rgba(0,0,0,.2)",
          }}
        >
          💬
          {unread > 0 && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -2,
                minWidth: 20,
                height: 20,
                padding: "0 5px",
                borderRadius: 10,
                background: "#ef4444",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      )}

      {/* ==================================================
          CHAT BOX
      ================================================== */}

      {open && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            width: 380,
            height: 580,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "calc(100vh - 32px)",
            background: "#fff",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 15px 60px rgba(0,0,0,.22)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ==================================================
              HEADER
          ================================================== */}

          <div
            style={{
              height: 70,
              background: "linear-gradient(135deg,#111827,#2563eb)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Nhật Khang Bike
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.85,
                  marginTop: 3,
                }}
              >
                {isGuest
                  ? "Tư vấn nhanh • Không cần đăng nhập"
                  : "Tư vấn phụ tùng & xe"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,.15)",
                border: "none",
                color: "#fff",
                width: 34,
                height: 34,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 20,
              }}
            >
              ×
            </button>
          </div>

          {/* ==================================================
              MESSAGES
          ================================================== */}

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              background: "#f5f7fb",
            }}
          >
            {loading && (
              <div
                style={{
                  textAlign: "center",
                  color: "#64748b",
                  padding: 30,
                }}
              >
                Đang tải cuộc trò chuyện...
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#64748b",
                  padding: "50px 20px",
                }}
              >
                <div
                  style={{
                    fontSize: 40,
                    marginBottom: 10,
                  }}
                >
                  👋
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  Xin chào!
                </div>

                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  Bạn chưa cần đăng nhập. Hãy gửi câu hỏi, Nhật Khang Bike sẽ tư
                  vấn cho bạn.
                </div>
              </div>
            )}

            {messages.map((item) => {
              const isCustomer = item.senderType === "customer";

              return (
                <div
                  key={item._id}
                  style={{
                    display: "flex",
                    justifyContent: isCustomer ? "flex-end" : "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                    }}
                  >
                    {/* PRODUCT */}

                    {item.product?.productId && (
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 8,
                          marginBottom: 5,
                        }}
                      >
                        {item.product.image && (
                          <img
                            src={item.product.image}
                            alt={item.product.name || "product"}
                            style={{
                              width: "100%",
                              height: 120,
                              objectFit: "contain",
                              borderRadius: 8,
                              background: "#f8fafc",
                            }}
                          />
                        )}

                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            marginTop: 6,
                          }}
                        >
                          {item.product.name}
                        </div>

                        {item.product.code && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                            }}
                          >
                            Mã: {item.product.code}
                          </div>
                        )}

                        {item.product.price !== undefined &&
                          Number(item.product.price) > 0 && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#2563eb",
                                fontWeight: 700,
                                marginTop: 4,
                              }}
                            >
                              {Number(item.product.price).toLocaleString(
                                "vi-VN",
                              )}{" "}
                              đ
                            </div>
                          )}
                      </div>
                    )}

                    {/* IMAGES */}

                    {item.images?.map((image, index) => (
                      <img
                        key={`${item._id}-${index}`}
                        src={image}
                        alt="chat"
                        style={{
                          maxWidth: "100%",
                          maxHeight: 220,
                          objectFit: "contain",
                          display: "block",
                          marginBottom: 5,
                          borderRadius: 10,
                        }}
                      />
                    ))}

                    {/* TEXT */}

                    {item.message && (
                      <div
                        style={{
                          background: isCustomer ? "#2563eb" : "#fff",
                          color: isCustomer ? "#fff" : "#111827",
                          padding: "9px 12px",
                          borderRadius: isCustomer
                            ? "15px 15px 4px 15px"
                            : "15px 15px 15px 4px",
                          fontSize: 13,
                          lineHeight: 1.5,
                          boxShadow: isCustomer
                            ? "none"
                            : "0 1px 4px rgba(0,0,0,.06)",
                          wordBreak: "break-word",
                        }}
                      >
                        {item.message}
                      </div>
                    )}

                    {/* TIME */}

                    <div
                      style={{
                        fontSize: 9,
                        color: "#94a3b8",
                        marginTop: 3,
                        textAlign: isCustomer ? "right" : "left",
                      }}
                    >
                      {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {typing && (
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Admin đang nhập...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ==================================================
              SELECTED IMAGES
          ================================================== */}

          {selectedImages.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "8px 10px",
                borderTop: "1px solid #e5e7eb",
                overflowX: "auto",
              }}
            >
              {selectedImages.map((image, index) => (
                <div
                  key={index}
                  style={{
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={image}
                    alt="preview"
                    style={{
                      width: 55,
                      height: 55,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      background: "#ef4444",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ==================================================
              INPUT
          ================================================== */}

          <div
            style={{
              padding: 10,
              borderTop: "1px solid #e5e7eb",
              background: "#fff",
              flexShrink: 0,
            }}
          >
            {product?.productId && (
              <div
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  padding: "7px 9px",
                  borderRadius: 8,
                  fontSize: 11,
                  marginBottom: 8,
                }}
              >
                Đang hỏi: <b>{product.name}</b>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 7,
                alignItems: "flex-end",
              }}
            >
              <label
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                📷
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleImageSelect}
                />
              </label>

              <textarea
                value={input}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();

                    handleSend();
                  }
                }}
                placeholder="Nhập tin nhắn..."
                rows={1}
                style={{
                  flex: 1,
                  resize: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "9px 11px",
                  outline: "none",
                  fontSize: 13,
                  minHeight: 38,
                  maxHeight: 80,
                }}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={
                  sending ||
                  (!input.trim() &&
                    selectedImages.length === 0 &&
                    !product?.productId)
                }
                style={{
                  width: 38,
                  height: 38,
                  border: "none",
                  borderRadius: 10,
                  background: sending ? "#94a3b8" : "#2563eb",
                  color: "#fff",
                  cursor: sending ? "default" : "pointer",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                ➤
              </button>
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 9,
                color: "#94a3b8",
              }}
            >
              Enter để gửi • Shift + Enter xuống dòng
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
