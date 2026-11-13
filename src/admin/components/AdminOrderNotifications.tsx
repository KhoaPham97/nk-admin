import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { Badge, IconButton, Menu, MenuItem, Box, Typography, Divider, Button } from "@mui/material";
import { NotificationsActive, ShoppingBag } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { DEFAUL_URL } from "../../api";
import toast from "react-hot-toast";

const STORAGE_KEY = "nkAdminOrderNotifications";

const readSaved = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.slice(0, 30) : [];
  } catch {
    return [];
  }
};

export default function AdminOrderNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState(readSaved);
  const [anchor, setAnchor] = useState(null);
  const unread = useMemo(() => items.filter((item) => !item.read).length, [items]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("accessToken");
    if (!token) return;

    const socket = io(`${DEFAUL_URL}/order-notifications`, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });

    socket.on("order:new", (payload) => {
      const notification = {
        id: payload.orderId || payload._id || String(Date.now()),
        code: payload.code || "Đơn hàng mới",
        customerName: payload.customerName || "Khách hàng",
        totalAmount: Number(payload.totalAmount || 0),
        createdAt: payload.created_at || new Date().toISOString(),
        read: false,
      };
      setItems((current) => {
        if (current.some((item) => item.id === notification.id)) return current;
        const next = [notification, ...current].slice(0, 30);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      toast.success(`Có đơn hàng mới ${notification.code}`, { duration: 5000 });
      try {
        const audio = new Audio("/sounds/order-notification.mp3");
        audio.play().catch(() => {});
      } catch {}
    });

    socket.on("connect_error", (error) => {
      console.warn("Order notification socket:", error.message);
    });

    return () => socket.disconnect();
  }, []);

  const markAllRead = () => {
    setItems((current) => {
      const next = current.map((item) => ({ ...item, read: true }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const openOrders = () => {
    markAllRead();
    setAnchor(null);
    navigate("/admin/orders");
  };

  const formatMoney = (value) => Number(value || 0).toLocaleString("vi-VN") + " ₫";

  return (
    <>
      <IconButton color="primary" onClick={(event) => setAnchor(event.currentTarget)} aria-label="Thông báo đơn hàng mới">
        <Badge badgeContent={unread} color="error" max={99}>
          <NotificationsActive />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} PaperProps={{ sx: { width: 340, maxWidth: "92vw", mt: 1 } }}>
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography fontWeight={800}>Thông báo đơn hàng</Typography>
          <Button size="small" onClick={markAllRead}>Đã đọc</Button>
        </Box>
        <Divider />
        {items.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
            <ShoppingBag sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="body2">Chưa có thông báo mới</Typography>
          </Box>
        ) : items.slice(0, 10).map((item) => (
          <MenuItem key={item.id} onClick={openOrders} sx={{ whiteSpace: "normal", alignItems: "flex-start", py: 1.25, bgcolor: item.read ? "inherit" : "action.hover" }}>
            <Box sx={{ minWidth: 0, width: "100%" }}>
              <Typography fontWeight={700} fontSize={13}>{item.code}</Typography>
              <Typography variant="body2">{item.customerName} · {formatMoney(item.totalAmount)}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(item.createdAt).toLocaleString("vi-VN")}</Typography>
            </Box>
            {!item.read && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main", ml: 1, mt: 0.7, flexShrink: 0 }} />}
          </MenuItem>
        ))}
        <Divider />
        <Box sx={{ p: 1 }}>
          <Button fullWidth onClick={openOrders}>Xem danh sách đơn hàng</Button>
        </Box>
      </Menu>
    </>
  );
}
