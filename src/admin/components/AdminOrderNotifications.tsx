import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { Badge, IconButton, Menu, MenuItem, Box, Typography, Divider, Button, Chip, Tabs, Tab, Stack } from "@mui/material";
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
  const [filter, setFilter] = useState("all");
  const unread = useMemo(() => items.filter((item) => !item.read).length, [items]);
  const internalCount = useMemo(() => items.filter((item) => item.source !== "shopee").length, [items]);
  const shopeeCount = useMemo(() => items.filter((item) => item.source === "shopee").length, [items]);
  const visibleItems = useMemo(() => items.filter((item) => filter === "all" || (filter === "shopee" ? item.source === "shopee" : item.source !== "shopee")), [items, filter]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("accessToken");
    if (!token) return;

    const loadPersistentShopeeNotifications = async () => {
      try {
        const response = await fetch(`${DEFAUL_URL}/api/shopee/notifications?limit=50`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const persisted = (payload.notifications || []).map((entry) => {
          const orderItems = entry.items || entry.orderItems || entry.itemList || entry.productDetails || entry.products || entry.orderItemList || [];
          const productNames = Array.isArray(orderItems)
            ? orderItems.map((product) => ({
                name: product.productName || product.product_name || product.itemName || product.item_name || product.name || product.modelName || product.model_name || product.title || "Sản phẩm Shopee",
                quantity: Number(product.quantity || product.qty || product.amount || 1),
              }))
            : [];
          return {
            id: String(entry.orderId || `shopee-${entry._id}`),
            dbId: entry._id,
            code: entry.orderSn || "Đơn Shopee mới",
            customerName: entry.customerName || "Khách Shopee",
            productNames,
            totalAmount: Number(entry.totalAmount || 0),
            source: "shopee",
            createdAt: entry.orderCreatedAt || entry.notifiedAt || entry.createdAt,
            read: Boolean(entry.read),
          };
        });
        setItems((current) => {
          const internal = current.filter((item) => item.source !== "shopee");
          const merged = [...persisted, ...internal].slice(0, 50);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      } catch (error) {
        console.warn("[Order Notifications] Không tải được thông báo Shopee đã lưu:", error.message);
      }
    };

    loadPersistentShopeeNotifications();

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
        source: payload.source || "website",
        productNames: (payload.items || payload.orderItems || payload.products || []).map((product) => ({
          name: product.productName || product.product_name || product.itemName || product.item_name || product.name || product.modelName || product.title || "Sản phẩm",
          quantity: Number(product.quantity || product.qty || 1),
        })),
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

  const markAllRead = async () => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("accessToken");
    try {
      await fetch(`${DEFAUL_URL}/api/shopee/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    } catch (error) {
      console.warn("[Order Notifications] Không thể đồng bộ trạng thái đã đọc:", error.message);
    }
    setItems((current) => {
      const next = current.map((item) => ({ ...item, read: true }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const openNotification = async (item) => {
    if (item.source === "shopee" && item.dbId) {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("accessToken");
      try {
        await fetch(`${DEFAUL_URL}/api/shopee/notifications/${item.dbId}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
      } catch (error) {
        console.warn("[Order Notifications] Không thể đánh dấu đã đọc:", error.message);
      }
    }
    const next = items.map((entry) =>
      entry.id === item.id ? { ...entry, read: true } : entry
    );
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAnchor(null);

    navigate(item.source === "shopee" ? "/admin/shopee?tab=orders" : "/admin/orders");
  };

  const openInternalOrders = () => {
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
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} PaperProps={{ sx: { width: 380, maxWidth: "94vw", mt: 1, borderRadius: 2 } }}>
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography fontWeight={800}>Thông báo đơn hàng</Typography>
            <Typography variant="caption" color="text.secondary">{unread ? `${unread} thông báo chưa đọc` : "Bạn đã xem hết thông báo"}</Typography>
          </Box>
          <Button size="small" disabled={!unread} onClick={markAllRead}>Đánh dấu đã đọc</Button>
        </Box>
        <Divider />
        <Tabs value={filter} onChange={(_, value) => setFilter(value)} variant="fullWidth" sx={{ minHeight: 44, "& .MuiTab-root": { minHeight: 44, fontSize: 12, fontWeight: 700, textTransform: "none" } }}>
          <Tab value="all" label={`Tất cả (${items.length})`} />
          <Tab value="internal" label={`Nội bộ (${internalCount})`} />
          <Tab value="shopee" label={`Shopee (${shopeeCount})`} />
        </Tabs>
        <Divider />
        {items.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
            <ShoppingBag sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="body2">Chưa có thông báo mới</Typography>
          </Box>
        ) : visibleItems.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
            <Typography variant="body2">Không có thông báo trong mục này</Typography>
          </Box>
        ) : visibleItems.slice(0, 10).map((item) => (
          <MenuItem key={item.id} onClick={() => openNotification(item)} sx={{ whiteSpace: "normal", alignItems: "flex-start", py: 1.5, px: 2, bgcolor: item.read ? "inherit" : "action.hover", borderLeft: item.read ? "3px solid transparent" : `3px solid ${item.source === "shopee" ? "#ee4d2d" : "#1976d2"}` }}>
            <Box sx={{ minWidth: 0, width: "100%" }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography fontWeight={800} fontSize={13}>{item.code}</Typography>
                <Chip size="small" label={item.source === "shopee" ? "Shopee" : item.source === "zalo" ? "Zalo Mini App" : "Website"} sx={{ height: 21, fontSize: 10, fontWeight: 800, bgcolor: item.source === "shopee" ? "#fff0eb" : item.source === "zalo" ? "#eaf3ff" : "#eef2f7", color: item.source === "shopee" ? "#d84315" : item.source === "zalo" ? "#1565c0" : "#475569" }} />
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{item.customerName}</Typography>
              {item.source === "shopee" && item.productNames?.length > 0 && (
                <Box sx={{ mt: 0.5, mb: 0.5, pl: 1, borderLeft: "2px solid #ee4d2d" }}>
                  {item.productNames.slice(0, 3).map((product, index) => (
                    <Typography key={`${item.id}-product-${index}`} variant="caption" display="block" sx={{ lineHeight: 1.5, color: "text.primary" }}>
                      • {product.name}{product.quantity > 1 ? ` × ${product.quantity}` : ""}
                    </Typography>
                  ))}
                  {item.productNames.length > 3 && (
                    <Typography variant="caption" color="text.secondary">+{item.productNames.length - 3} sản phẩm khác</Typography>
                  )}
                </Box>
              )}
              <Typography variant="body2" fontWeight={700}>{formatMoney(item.totalAmount)}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(item.createdAt).toLocaleString("vi-VN")}</Typography>
            </Box>
            {!item.read && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main", ml: 1, mt: 0.7, flexShrink: 0 }} />}
          </MenuItem>
        ))}
        <Divider />
        <Box sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={1}>
            <Button fullWidth size="small" variant="outlined" onClick={openInternalOrders}>Đơn nội bộ</Button>
            <Button fullWidth size="small" variant="contained" onClick={() => { setAnchor(null); navigate("/admin/shopee?tab=orders"); }}>Đơn Shopee</Button>
          </Stack>
        </Box>
      </Menu>
    </>
  );
}
