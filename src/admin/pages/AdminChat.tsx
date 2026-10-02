import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { ArrowBack, Close, Send } from "@mui/icons-material";

import { io, Socket } from "socket.io-client";

import {
  ChatConversation,
  ChatMessage,
  CHAT_SOCKET_URL,
  closeConversation,
  getAdminConversations,
  getMessages,
  markChatRead,
  sendMessageApi,
} from "../../api/chatApi";

const AdminChat = () => {
  // =====================================================
  // STATE
  // =====================================================

  const [conversations, setConversations] = useState<ChatConversation[]>([]);

  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversation | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [input, setInput] = useState("");

  const [status, setStatus] = useState<"open" | "closed">("open");

  const [loadingConversations, setLoadingConversations] = useState(false);

  const [loadingMessages, setLoadingMessages] = useState(false);

  const [sending, setSending] = useState(false);

  const [typing, setTyping] = useState(false);

  const [toast, setToast] = useState("");

  // =====================================================
  // REFS
  // =====================================================

  const socketRef = useRef<Socket | null>(null);

  const selectedConversationRef = useRef<ChatConversation | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // =====================================================
  // KEEP SELECTED CONVERSATION REF
  // =====================================================

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // =====================================================
  // SCROLL BOTTOM
  // =====================================================

  const scrollBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 50);
  };

  // =====================================================
  // LOAD CONVERSATIONS
  // =====================================================

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);

      const response = await getAdminConversations(status);

      console.log("ADMIN CONVERSATIONS:", response);

      const list = response?.conversations || [];

      setConversations(list);

      // Nếu conversation đang mở vẫn tồn tại,
      // cập nhật thông tin mới từ server
      const selected = selectedConversationRef.current;

      if (selected) {
        const latest = list.find(
          (item: ChatConversation) => item._id === selected._id,
        );

        if (latest) {
          setSelectedConversation(latest);
          selectedConversationRef.current = latest;
        }
      }
    } catch (error: any) {
      console.error(
        "LOAD ADMIN CONVERSATIONS ERROR:",
        error?.response?.data || error,
      );

      setToast(
        error?.response?.data?.message || "Không thể tải danh sách chat",
      );
    } finally {
      setLoadingConversations(false);
    }
  };

  // =====================================================
  // LOAD MESSAGES
  // =====================================================

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);

      console.log("LOAD CHAT MESSAGES:", conversationId);

      const response = await getMessages(conversationId);

      console.log("CHAT MESSAGES RESPONSE:", response);

      const list = response?.messages || response?.data?.messages || [];

      setMessages(list);

      scrollBottom();

      return list;
    } catch (error: any) {
      console.error(
        "LOAD CHAT MESSAGES ERROR:",
        error?.response?.data || error,
      );

      setToast(error?.response?.data?.message || "Không thể tải tin nhắn");

      return [];
    } finally {
      setLoadingMessages(false);
    }
  };

  // =====================================================
  // LOAD INITIAL CONVERSATIONS
  // =====================================================

  useEffect(() => {
    loadConversations();
  }, [status]);

  // =====================================================
  // SOCKET.IO
  // =====================================================

  useEffect(() => {
    console.log("ADMIN SOCKET URL:", CHAT_SOCKET_URL);

    const socket = io(CHAT_SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // ===================================================
    // CONNECT
    // ===================================================

    socket.on("connect", () => {
      console.log("✅ ADMIN SOCKET CONNECTED:", socket.id);

      const selected = selectedConversationRef.current;

      if (selected) {
        socket.emit("chat:join", {
          conversationId: selected._id,
        });

        console.log("JOIN ROOM:", selected._id);
      }
    });

    // ===================================================
    // CONNECT ERROR
    // ===================================================

    socket.on("connect_error", (error) => {
      console.error("❌ ADMIN SOCKET ERROR:", error.message);
    });

    // ===================================================
    // DISCONNECT
    // ===================================================

    socket.on("disconnect", (reason) => {
      console.log("ADMIN SOCKET DISCONNECTED:", reason);
    });

    // ===================================================
    // NEW MESSAGE
    // ===================================================

    socket.on("chat:new-message", (newMessage: ChatMessage) => {
      console.log("📩 ADMIN NEW MESSAGE:", newMessage);

      const selected = selectedConversationRef.current;

      // -------------------------------------------------
      // CASE 1:
      // Đang mở đúng conversation
      // -------------------------------------------------

      if (selected?._id === newMessage.conversationId) {
        setMessages((prev) => {
          const exists = prev.some((item) => item._id === newMessage._id);

          if (exists) {
            return prev;
          }

          return [...prev, newMessage];
        });

        // Chat đang mở -> unread admin = 0
        setConversations((prev) =>
          prev.map((item) =>
            item._id === newMessage.conversationId
              ? {
                  ...item,
                  lastMessage: newMessage.message || item.lastMessage,
                  lastMessageAt: newMessage.createdAt,
                  unreadAdmin: 0,
                }
              : item,
          ),
        );

        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                lastMessage: newMessage.message || prev.lastMessage,
                lastMessageAt: newMessage.createdAt,
                unreadAdmin: 0,
              }
            : null,
        );

        scrollBottom();

        return;
      }

      // -------------------------------------------------
      // CASE 2:
      // Conversation khác có tin mới
      // -------------------------------------------------

      setConversations((prev) =>
        prev
          .map((item) => {
            if (item._id !== newMessage.conversationId) {
              return item;
            }

            return {
              ...item,

              lastMessage: newMessage.message || item.lastMessage,

              lastMessageAt: newMessage.createdAt,

              unreadAdmin:
                newMessage.senderType === "customer"
                  ? Number(item.unreadAdmin || 0) + 1
                  : Number(item.unreadAdmin || 0),
            };
          })
          .sort(
            (a, b) =>
              new Date(b.lastMessageAt || 0).getTime() -
              new Date(a.lastMessageAt || 0).getTime(),
          ),
      );
    });

    // ===================================================
    // CONVERSATION UPDATED
    // ===================================================

    socket.on("chat:conversation-updated", (data) => {
      console.log("🔄 CHAT CONVERSATION UPDATED:", data);

      // QUAN TRỌNG:
      // Chỉ cập nhật STATE
      // Không gọi markChatRead()
      // Không gọi loadConversations()
      // Không gọi getMessages()

      setConversations((prev) => {
        const index = prev.findIndex(
          (item) => item._id === data.conversationId,
        );

        if (index === -1) {
          // Không tự load ở đây để tránh loop.
          // Conversation mới sẽ được load
          // bằng thao tác reload / event new-message.
          return prev;
        }

        const updated = [...prev];

        updated[index] = {
          ...updated[index],

          ...(data.lastMessage !== undefined
            ? {
                lastMessage: data.lastMessage,
              }
            : {}),

          ...(data.lastMessageAt !== undefined
            ? {
                lastMessageAt: data.lastMessageAt,
              }
            : {}),

          ...(data.unreadAdmin !== undefined
            ? {
                unreadAdmin: data.unreadAdmin,
              }
            : {}),

          ...(data.unreadCustomer !== undefined
            ? {
                unreadCustomer: data.unreadCustomer,
              }
            : {}),
        };

        updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() -
            new Date(a.lastMessageAt || 0).getTime(),
        );

        return updated;
      });

      // Cập nhật selected conversation
      setSelectedConversation((prev) => {
        if (!prev || prev._id !== data.conversationId) {
          return prev;
        }

        return {
          ...prev,

          ...(data.lastMessage !== undefined
            ? {
                lastMessage: data.lastMessage,
              }
            : {}),

          ...(data.lastMessageAt !== undefined
            ? {
                lastMessageAt: data.lastMessageAt,
              }
            : {}),

          ...(data.unreadAdmin !== undefined
            ? {
                unreadAdmin: data.unreadAdmin,
              }
            : {}),
        };
      });
    });

    // ===================================================
    // TYPING
    // ===================================================

    socket.on("chat:typing", ({ conversationId, senderType }) => {
      const selected = selectedConversationRef.current;

      if (selected?._id === conversationId && senderType === "customer") {
        setTyping(true);
      }
    });

    // ===================================================
    // STOP TYPING
    // ===================================================

    socket.on("chat:stop-typing", ({ conversationId, senderType }) => {
      const selected = selectedConversationRef.current;

      if (selected?._id === conversationId && senderType === "customer") {
        setTyping(false);
      }
    });

    // ===================================================
    // CHAT CLOSED
    // ===================================================

    socket.on("chat:closed", ({ conversationId }) => {
      console.log("CHAT CLOSED:", conversationId);

      const selected = selectedConversationRef.current;

      if (selected?._id === conversationId) {
        socket.emit("chat:leave", {
          conversationId,
        });

        setSelectedConversation(null);

        selectedConversationRef.current = null;

        setMessages([]);

        setInput("");

        setTyping(false);
      }

      // Không load lại liên tục.
      // Chỉ cập nhật state local.
      setConversations((prev) =>
        prev.filter((item) => item._id !== conversationId),
      );
    });

    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {
      console.log("DISCONNECT ADMIN SOCKET");

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      socket.disconnect();

      socketRef.current = null;
    };
  }, []);

  // =====================================================
  // OPEN CONVERSATION
  // =====================================================

  const openConversation = async (conversation: ChatConversation) => {
    try {
      console.log("OPEN CONVERSATION:", conversation._id);

      // Rời room cũ
      const oldConversation = selectedConversationRef.current;

      if (oldConversation && oldConversation._id !== conversation._id) {
        socketRef.current?.emit("chat:leave", {
          conversationId: oldConversation._id,
        });
      }

      // Set conversation mới
      setSelectedConversation(conversation);

      selectedConversationRef.current = conversation;

      setMessages([]);

      setTyping(false);

      // Join room mới
      socketRef.current?.emit("chat:join", {
        conversationId: conversation._id,
      });

      console.log("ADMIN JOIN ROOM:", conversation._id);

      // Lấy lịch sử từ API
      const messageList = await loadMessages(conversation._id);

      // Đánh dấu đã đọc
      await markChatRead(conversation._id, "admin").catch((error) => {
        console.error("MARK READ ERROR:", error);
      });

      // Reset unread local
      setConversations((prev) =>
        prev.map((item) =>
          item._id === conversation._id
            ? {
                ...item,
                unreadAdmin: 0,
              }
            : item,
        ),
      );

      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              unreadAdmin: 0,
            }
          : null,
      );

      selectedConversationRef.current = selectedConversationRef.current
        ? {
            ...selectedConversationRef.current,
            unreadAdmin: 0,
          }
        : null;

      console.log("MESSAGES LOADED:", messageList.length);

      scrollBottom();
    } catch (error: any) {
      console.error("OPEN CONVERSATION ERROR:", error?.response?.data || error);

      setToast(
        error?.response?.data?.message || "Không thể mở cuộc trò chuyện",
      );
    }
  };

  // =====================================================
  // SEND ADMIN MESSAGE
  // =====================================================

  const sendMessage = async () => {
    if (!selectedConversation || !input.trim() || sending) {
      return;
    }

    const text = input.trim();

    try {
      setSending(true);

      const adminId = localStorage.getItem("adminId") || "";

      const response = await sendMessageApi(selectedConversation._id, {
        senderType: "admin",
        senderId: adminId,
        message: text,
      });

      console.log("ADMIN SEND RESPONSE:", response);

      // API trả về message
      // -> thêm ngay lên UI
      if (response?.message) {
        setMessages((prev) => {
          const exists = prev.some((item) => item._id === response.message._id);

          if (exists) {
            return prev;
          }

          return [...prev, response.message];
        });

        setConversations((prev) =>
          prev.map((item) =>
            item._id === selectedConversation._id
              ? {
                  ...item,
                  lastMessage: response.message.message || item.lastMessage,
                  lastMessageAt: response.message.createdAt,
                  unreadAdmin: 0,
                }
              : item,
          ),
        );

        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                lastMessage: response.message.message || prev.lastMessage,
                lastMessageAt: response.message.createdAt,
                unreadAdmin: 0,
              }
            : null,
        );

        scrollBottom();
      }

      setInput("");

      socketRef.current?.emit("chat:stop-typing", {
        conversationId: selectedConversation._id,
        senderType: "admin",
      });
    } catch (error: any) {
      console.error(
        "SEND ADMIN MESSAGE ERROR:",
        error?.response?.data || error,
      );

      setToast(error?.response?.data?.message || "Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  // =====================================================
  // TYPING
  // =====================================================

  const handleTyping = (value: string) => {
    setInput(value);

    if (!selectedConversation) {
      return;
    }

    socketRef.current?.emit("chat:typing", {
      conversationId: selectedConversation._id,
      senderType: "admin",
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("chat:stop-typing", {
        conversationId: selectedConversation._id,
        senderType: "admin",
      });
    }, 800);
  };

  // =====================================================
  // CLOSE CONVERSATION
  // =====================================================

  const handleCloseChat = async () => {
    if (!selectedConversation) {
      return;
    }

    try {
      const conversationId = selectedConversation._id;

      await closeConversation(conversationId);

      socketRef.current?.emit("chat:leave", {
        conversationId,
      });

      setSelectedConversation(null);

      selectedConversationRef.current = null;

      setMessages([]);

      setInput("");

      setTyping(false);

      // Xóa conversation khỏi list local
      setConversations((prev) =>
        prev.filter((item) => item._id !== conversationId),
      );

      setToast("Đã đóng cuộc trò chuyện");
    } catch (error: any) {
      console.error("CLOSE CHAT ERROR:", error?.response?.data || error);

      setToast(error?.response?.data?.message || "Không thể đóng chat");
    }
  };

  // =====================================================
  // CUSTOMER NAME
  // =====================================================

  const getCustomerName = (conversation: ChatConversation) => {
    const customer = conversation.customerId;

    if (customer && typeof customer === "object") {
      return customer.name || customer.phone || "Khách hàng";
    }

    return "Khách hàng";
  };

  // =====================================================
  // CUSTOMER PHONE
  // =====================================================

  const getCustomerPhone = (conversation: ChatConversation) => {
    const customer = conversation.customerId;

    if (customer && typeof customer === "object") {
      return customer.phone || "";
    }

    return "";
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <Box
      sx={{
        width: "100%",
        height: "calc(100vh - 110px)",
        display: "flex",
        gap: 2,
        overflow: "hidden",
      }}
    >
      {/* ==================================================
          LEFT - CONVERSATIONS
      ================================================== */}

      <Paper
        elevation={0}
        sx={{
          width: 340,
          minWidth: 340,
          height: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 2,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}

        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography fontSize={18} fontWeight={700}>
                Tin nhắn
              </Typography>

              <Typography fontSize={12} color="text.secondary">
                Tư vấn khách hàng
              </Typography>
            </Box>

            <Chip size="small" label={conversations.length} />
          </Box>
        </Box>

        <Divider />

        {/* FILTER */}

        <Box sx={{ p: 1 }}>
          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              size="small"
              variant={status === "open" ? "contained" : "outlined"}
              onClick={() => setStatus("open")}
            >
              Đang chat
            </Button>

            <Button
              fullWidth
              size="small"
              variant={status === "closed" ? "contained" : "outlined"}
              onClick={() => setStatus("closed")}
            >
              Đã đóng
            </Button>
          </Stack>
        </Box>

        <Divider />

        {/* LIST */}

        <List
          disablePadding
          sx={{
            overflowY: "auto",
            flex: 1,
          }}
        >
          {loadingConversations && (
            <Box sx={{ p: 3 }}>
              <Typography
                textAlign="center"
                fontSize={13}
                color="text.secondary"
              >
                Đang tải...
              </Typography>
            </Box>
          )}

          {!loadingConversations && conversations.length === 0 && (
            <Box sx={{ p: 4 }}>
              <Typography
                textAlign="center"
                fontSize={13}
                color="text.secondary"
              >
                Chưa có cuộc trò chuyện
              </Typography>
            </Box>
          )}

          {conversations.map((conversation) => {
            const name = getCustomerName(conversation);

            const phone = getCustomerPhone(conversation);

            const unread = Number(conversation.unreadAdmin || 0);

            const selected = selectedConversation?._id === conversation._id;

            return (
              <ListItemButton
                key={conversation._id}
                selected={selected}
                onClick={() => openConversation(conversation)}
                sx={{
                  alignItems: "flex-start",
                  py: 1.3,
                }}
              >
                <ListItemAvatar>
                  <Avatar>{name.charAt(0).toUpperCase()}</Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Typography
                        fontSize={14}
                        fontWeight={unread > 0 ? 700 : 500}
                        noWrap
                      >
                        {name}
                      </Typography>

                      {unread > 0 && (
                        <Chip
                          label={unread > 99 ? "99+" : unread}
                          color="error"
                          size="small"
                          sx={{
                            height: 20,
                            minWidth: 20,
                            fontSize: 10,
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      {phone && (
                        <Typography
                          component="span"
                          display="block"
                          fontSize={10}
                        >
                          {phone}
                        </Typography>
                      )}

                      <Typography
                        component="span"
                        display="block"
                        fontSize={12}
                        noWrap
                        sx={{
                          mt: 0.4,
                        }}
                      >
                        {conversation.lastMessage || "Chưa có tin nhắn"}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      </Paper>

      {/* ==================================================
          RIGHT - CHAT
      ================================================== */}

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          height: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 2,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!selectedConversation ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <Typography fontSize={52} mb={1}>
              💬
            </Typography>

            <Typography fontWeight={700}>Chọn cuộc trò chuyện</Typography>

            <Typography color="text.secondary" fontSize={13} mt={0.5}>
              Chọn khách hàng bên trái để xem tin nhắn
            </Typography>
          </Box>
        ) : (
          <>
            {/* ==================================================
                CHAT HEADER
            ================================================== */}

            <Box
              sx={{
                minHeight: 70,
                px: 2,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "#fff",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <IconButton
                  sx={{
                    display: {
                      xs: "inline-flex",
                      md: "none",
                    },
                  }}
                  onClick={() => {
                    const id = selectedConversation._id;

                    socketRef.current?.emit("chat:leave", {
                      conversationId: id,
                    });

                    setSelectedConversation(null);

                    selectedConversationRef.current = null;

                    setMessages([]);
                  }}
                >
                  <ArrowBack />
                </IconButton>

                <Avatar>
                  {getCustomerName(selectedConversation)
                    .charAt(0)
                    .toUpperCase()}
                </Avatar>

                <Box>
                  <Typography fontWeight={700} fontSize={15}>
                    {getCustomerName(selectedConversation)}
                  </Typography>

                  <Typography fontSize={11} color="text.secondary">
                    {getCustomerPhone(selectedConversation)}
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<Close />}
                onClick={handleCloseChat}
              >
                Đóng chat
              </Button>
            </Box>

            {/* ==================================================
                PRODUCT CONTEXT
            ================================================== */}

            {selectedConversation.productContext?.productId && (
              <Box
                sx={{
                  px: 2,
                  py: 1.2,
                  bgcolor: "#eff6ff",
                  borderBottom: "1px solid #dbeafe",
                }}
              >
                <Typography fontSize={10} fontWeight={700} color="#2563eb">
                  SẢN PHẨM KHÁCH ĐANG HỎI
                </Typography>

                <Typography fontSize={13} fontWeight={600} mt={0.3}>
                  {selectedConversation.productContext.name}
                </Typography>

                {selectedConversation.productContext.code && (
                  <Typography fontSize={10} color="text.secondary">
                    Mã: {selectedConversation.productContext.code}
                  </Typography>
                )}
              </Box>
            )}

            {/* ==================================================
                MESSAGES
            ================================================== */}

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 2,
                bgcolor: "#f5f7fb",
              }}
            >
              {loadingMessages && (
                <Typography
                  textAlign="center"
                  fontSize={13}
                  color="text.secondary"
                >
                  Đang tải tin nhắn...
                </Typography>
              )}

              {!loadingMessages && messages.length === 0 && (
                <Box
                  sx={{
                    minHeight: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography fontSize={13} color="text.secondary">
                    Chưa có tin nhắn
                  </Typography>
                </Box>
              )}

              {messages.map((item) => {
                const isAdmin = item.senderType === "admin";

                return (
                  <Box
                    key={item._id}
                    sx={{
                      display: "flex",
                      justifyContent: isAdmin ? "flex-end" : "flex-start",
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: "75%",
                      }}
                    >
                      {/* PRODUCT */}

                      {item.product?.productId && (
                        <Box
                          sx={{
                            p: 1,
                            mb: 0.5,
                            bgcolor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 2,
                          }}
                        >
                          {item.product.image && (
                            <Box
                              component="img"
                              src={item.product.image}
                              alt={item.product.name || "product"}
                              sx={{
                                width: "100%",
                                maxHeight: 150,
                                objectFit: "contain",
                                borderRadius: 1,
                                bgcolor: "#f8fafc",
                              }}
                            />
                          )}

                          <Typography fontSize={12} fontWeight={700} mt={0.5}>
                            {item.product.name}
                          </Typography>

                          {item.product.code && (
                            <Typography fontSize={10} color="text.secondary">
                              Mã: {item.product.code}
                            </Typography>
                          )}

                          {item.product.price !== undefined &&
                            Number(item.product.price) > 0 && (
                              <Typography
                                fontSize={11}
                                color="#2563eb"
                                fontWeight={600}
                                mt={0.3}
                              >
                                {Number(item.product.price).toLocaleString(
                                  "vi-VN",
                                )}{" "}
                                đ
                              </Typography>
                            )}
                        </Box>
                      )}

                      {/* IMAGES */}

                      {item.images?.map((image, index) => (
                        <Box
                          key={`${item._id}-${index}`}
                          component="img"
                          src={image}
                          alt="chat"
                          sx={{
                            display: "block",
                            maxWidth: "100%",
                            maxHeight: 250,
                            objectFit: "contain",
                            borderRadius: 2,
                            mb: 0.5,
                          }}
                        />
                      ))}

                      {/* TEXT */}

                      {item.message && (
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            bgcolor: isAdmin ? "#2563eb" : "#fff",
                            color: isAdmin ? "#fff" : "#111827",
                            borderRadius: isAdmin
                              ? "14px 14px 4px 14px"
                              : "14px 14px 14px 4px",
                            fontSize: 13,
                            lineHeight: 1.55,
                            wordBreak: "break-word",
                            boxShadow: isAdmin
                              ? "none"
                              : "0 1px 4px rgba(0,0,0,.06)",
                          }}
                        >
                          {item.message}
                        </Box>
                      )}

                      {/* TIME */}

                      <Typography
                        fontSize={9}
                        color="text.secondary"
                        textAlign={isAdmin ? "right" : "left"}
                        mt={0.3}
                      >
                        {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}

              {typing && (
                <Typography
                  fontSize={12}
                  color="text.secondary"
                  sx={{
                    fontStyle: "italic",
                  }}
                >
                  Khách đang nhập...
                </Typography>
              )}

              <div ref={bottomRef} />
            </Box>

            {/* ==================================================
                INPUT
            ================================================== */}

            <Box
              sx={{
                p: 1.5,
                borderTop: "1px solid #e5e7eb",
                bgcolor: "#fff",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  maxRows={4}
                  placeholder="Nhập tin nhắn..."
                  value={input}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();

                      sendMessage();
                    }
                  }}
                />

                <IconButton
                  color="primary"
                  disabled={sending || !input.trim()}
                  onClick={sendMessage}
                >
                  <Send />
                </IconButton>
              </Stack>

              <Typography fontSize={9} color="text.secondary" mt={0.5}>
                Enter để gửi • Shift + Enter để xuống dòng
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* ==================================================
          TOAST
      ================================================== */}

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast("")}
      >
        <Alert severity="info" onClose={() => setToast("")}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminChat;
