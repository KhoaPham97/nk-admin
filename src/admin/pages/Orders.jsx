import React, { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Add,
  ArrowForwardIos,
  CalendarToday,
  Clear,
  PersonOutline,
  ReceiptLong,
  Search,
  Sync,
} from "@mui/icons-material";

import axios from "axios";
import { useNavigate } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

const Orders = () => {
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(false);

  // Đồng bộ giá riêng từng sản phẩm
  const [syncingPriceItem, setSyncingPriceItem] = useState(null);

  // Đồng bộ tồn kho tất cả
  const [syncingStock, setSyncingStock] = useState(false);

  // Đồng bộ tồn kho từng đơn
  const [syncingOrderId, setSyncingOrderId] = useState(null);

  // Rollback tồn kho
  const [rollingBackOrderId, setRollingBackOrderId] = useState(null);

  // Cập nhật trạng thái
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  const [totalPages, setTotalPages] = useState(1);

  const [total, setTotal] = useState(0);

  // =====================================================
  // SNACKBAR
  // =====================================================

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({
      ...prev,
      open: false,
    }));
  };

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return (
      localStorage.getItem("adminToken") || localStorage.getItem("accessToken")
    );
  };

  // =====================================================
  // AXIOS CONFIG
  // =====================================================

  const getAuthConfig = () => {
    const token = getToken();

    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  };

  // =====================================================
  // HANDLE AUTH ERROR
  // =====================================================

  const handleAuthError = (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("adminToken");

      showSnackbar(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        "error",
      );

      navigate("/admin/login");

      return true;
    }

    return false;
  };

  // =====================================================
  // LOAD ORDERS
  // =====================================================

  const loadOrders = async () => {
    try {
      setLoading(true);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const params = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (status !== "all") {
        params.status = status;
      }

      const response = await axios.get(API_ENDPOINTS.ORDER, {
        ...getAuthConfig(),
        params,
      });

      const data = response?.data || {};

      const orderList = data.orders || data.data || [];

      setOrders(Array.isArray(orderList) ? orderList : []);

      setTotal(Number(data.total) || 0);

      setTotalPages(Number(data.totalPages) || 1);
    } catch (error) {
      console.error("LOAD ORDERS ERROR:", error);

      if (handleAuthError(error)) {
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể tải danh sách đơn hàng",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // EFFECT
  // =====================================================

  useEffect(() => {
    loadOrders();
  }, [page, limit, status]);

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);

    setTimeout(() => {
      loadOrders();
    }, 0);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  // =====================================================
  // STATUS FILTER
  // =====================================================

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0 ₫";
    }

    return number.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    });
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =====================================================
  // STATUS LABEL
  // =====================================================

  const getStatusLabel = (orderStatus) => {
    switch (orderStatus) {
      case "pending":
        return "Chờ xử lý";

      case "confirmed":
        return "Đã xác nhận";

      case "processing":
        return "Đang xử lý";

      case "shipping":
        return "Đang giao";

      case "completed":
        return "Hoàn thành";

      case "cancelled":
        return "Đã hủy";

      default:
        return orderStatus || "-";
    }
  };

  // =====================================================
  // STATUS COLOR
  // =====================================================

  const getStatusColor = (orderStatus) => {
    switch (orderStatus) {
      case "pending":
        return "warning";

      case "confirmed":
        return "info";

      case "processing":
        return "primary";

      case "shipping":
        return "secondary";

      case "completed":
        return "success";

      case "cancelled":
        return "error";

      default:
        return "default";
    }
  };

  // =====================================================
  // STATUS OPTIONS
  // =====================================================

  const statusOptions = [
    {
      value: "pending",
      label: "Chờ xử lý",
      color: "warning",
    },
    {
      value: "confirmed",
      label: "Đã xác nhận",
      color: "info",
    },
    {
      value: "processing",
      label: "Đang xử lý",
      color: "primary",
    },
    {
      value: "shipping",
      label: "Đang giao",
      color: "secondary",
    },
    {
      value: "completed",
      label: "Hoàn thành",
      color: "success",
    },
    {
      value: "cancelled",
      label: "Đã hủy",
      color: "error",
    },
  ];

  // =====================================================
  // ITEMS COUNT
  // =====================================================

  const getItemsCount = (order) => {
    if (!Array.isArray(order?.items)) {
      return 0;
    }

    return order.items.reduce((totalQty, item) => {
      return totalQty + Number(item?.qty || 0);
    }, 0);
  };

  // =====================================================
  // CUSTOMER NAME
  // =====================================================

  const getCustomerName = (order) => {
    return (
      order?.customerName ||
      order?.customer?.name ||
      order?.customer?.fullName ||
      order?.name ||
      "Khách hàng"
    );
  };

  // =====================================================
  // GET ITEM PRICE
  // =====================================================

  const getItemPrice = (item) => {
    return Number(
      item?.price ??
        item?.unitPrice ??
        item?.salePrice ??
        item?.productPrice ??
        0,
    );
  };

  // =====================================================
  // GET CURRENT PRICE FROM ITEM
  // =====================================================

  const getCurrentProductPrice = (item) => {
    return Number(
      item?.currentPrice ??
        item?.latestPrice ??
        item?.productCurrentPrice ??
        item?.currentProductPrice ??
        item?.price ??
        0,
    );
  };

  // =====================================================
  // PRICE SYNC KEY
  // =====================================================

  const getPriceSyncKey = (order, item, index) => {
    return `${order?._id || "order"}-${
      item?.productId || item?.product?._id || "product"
    }-${item?.variantName || "default"}-${index}`;
  };

  // =====================================================
  // SYNC PRICE ONE PRODUCT
  // =====================================================

  const handleSyncItemPrice = async (order, item, index) => {
    if (!order?._id || !item) {
      return;
    }

    if (
      syncingStock ||
      syncingOrderId ||
      rollingBackOrderId ||
      updatingStatusId ||
      syncingPriceItem
    ) {
      return;
    }

    if (!item?.productId && !item?.product?._id) {
      showSnackbar("Sản phẩm trong đơn không có productId.", "error");

      return;
    }

    const productId = item?.productId || item?.product?._id;

    const variantName = String(item?.variantName || "").trim();

    const productName =
      item?.title || item?.productTitle || item?.product?.title || "Sản phẩm";

    const syncKey = getPriceSyncKey(order, item, index);

    const confirmed = window.confirm(
      `Bạn có chắc muốn đồng bộ giá sản phẩm "${productName}"?\n\n` +
        `Đơn hàng: ${order.code || order._id}\n` +
        `Giá hiện tại trong đơn: ${formatMoney(getItemPrice(item))}\n` +
        (variantName ? `Phân loại: ${variantName}\n` : ""),
    );

    if (!confirmed) {
      return;
    }

    try {
      setSyncingPriceItem(syncKey);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.post(
        `${API_ENDPOINTS.ORDER}/sync-item-price`,
        {
          orderId: order._id,
          productId,
          variantName,
        },
        getAuthConfig(),
      );

      const data = response?.data || {};

      /*
       * Backend nên trả về:
       *
       * {
       *   success: true,
       *   itemPrice: 38000,
       *   totalAmount: 380000,
       *   order: {...}
       * }
       */

      const newPrice = Number(
        data?.itemPrice ?? data?.price ?? data?.newPrice ?? data?.item?.price,
      );

      const updatedOrder = data?.order;

      setOrders((prev) =>
        prev.map((currentOrder) => {
          if (currentOrder._id !== order._id) {
            return currentOrder;
          }

          // Nếu backend trả nguyên order
          if (updatedOrder?._id) {
            return updatedOrder;
          }

          const newItems = Array.isArray(currentOrder.items)
            ? currentOrder.items.map((currentItem, currentIndex) => {
                const sameProduct =
                  String(
                    currentItem?.productId || currentItem?.product?._id || "",
                  ) === String(productId);

                const sameVariant =
                  String(currentItem?.variantName || "").trim() === variantName;

                /*
                 * index dùng để tránh trường hợp cùng một product
                 * xuất hiện nhiều lần trong order.
                 */
                if (sameProduct && sameVariant && currentIndex === index) {
                  return {
                    ...currentItem,
                    ...(Number.isFinite(newPrice)
                      ? {
                          price: newPrice,
                          unitPrice: newPrice,
                        }
                      : {}),
                  };
                }

                return currentItem;
              })
            : currentOrder.items;

          return {
            ...currentOrder,
            items: newItems,
            ...(Number.isFinite(Number(data?.totalAmount))
              ? {
                  totalAmount: Number(data.totalAmount),
                }
              : {}),
            ...(Number.isFinite(Number(data?.total))
              ? {
                  total: Number(data.total),
                }
              : {}),
          };
        }),
      );

      showSnackbar(
        data?.message || `Đã đồng bộ giá "${productName}" thành công.`,
        "success",
      );
    } catch (error) {
      console.error("SYNC ITEM PRICE ERROR:", error);

      if (handleAuthError(error)) {
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể đồng bộ giá sản phẩm",
        "error",
      );
    } finally {
      setSyncingPriceItem(null);
    }
  };

  // =====================================================
  // SYNC ALL STOCK
  // =====================================================

  const handleSyncStock = async () => {
    if (
      syncingStock ||
      syncingOrderId ||
      rollingBackOrderId ||
      updatingStatusId ||
      syncingPriceItem
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn đồng bộ tồn kho cho tất cả đơn hàng chưa đồng bộ?\n\n" +
        "Hệ thống sẽ trừ tồn kho và ghi lịch sử kho.\n" +
        "Trạng thái đơn hàng sẽ KHÔNG thay đổi.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setSyncingStock(true);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.post(
        `${API_ENDPOINTS.ORDER}/sync-stock`,
        {},
        getAuthConfig(),
      );

      const data = response?.data || {};

      showSnackbar(
        `Đồng bộ thành công: ${data.updatedOrders || 0} đơn / ${
          data.updatedItems || 0
        } sản phẩm`,
        "success",
      );

      await loadOrders();
    } catch (error) {
      console.error("SYNC ALL STOCK ERROR:", error);

      if (handleAuthError(error)) {
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể đồng bộ tồn kho",
        "error",
      );
    } finally {
      setSyncingStock(false);
    }
  };

  // =====================================================
  // SYNC ONE ORDER STOCK
  // =====================================================

  const handleSyncOneOrder = async (order) => {
    if (!order?._id) {
      return;
    }

    if (
      syncingStock ||
      syncingOrderId ||
      rollingBackOrderId ||
      updatingStatusId ||
      syncingPriceItem
    ) {
      return;
    }

    if (order.stockDeducted === true) {
      showSnackbar(`Đơn ${order.code || ""} đã được đồng bộ tồn kho.`, "info");

      return;
    }

    if (order.status === "cancelled") {
      showSnackbar("Đơn hàng đã hủy không thể đồng bộ tồn kho.", "warning");

      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn đồng bộ tồn kho cho đơn ${
        order.code || order._id
      }?\n\n` +
        "Hệ thống sẽ trừ tồn kho và lưu lịch sử kho.\n" +
        "Trạng thái đơn hàng sẽ KHÔNG thay đổi.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setSyncingOrderId(order._id);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.post(
        `${API_ENDPOINTS.ORDER}/sync-stock`,
        {
          orderId: order._id,
        },
        getAuthConfig(),
      );

      const data = response?.data || {};

      setOrders((prev) =>
        prev.map((item) =>
          item._id === order._id
            ? {
                ...item,
                stockDeducted: true,
              }
            : item,
        ),
      );

      showSnackbar(
        `Đồng bộ ${order.code || "đơn hàng"} thành công. Trừ ${
          data.updatedItems || 0
        } sản phẩm.`,
        "success",
      );
    } catch (error) {
      console.error("SYNC ONE ORDER STOCK ERROR:", error);

      if (handleAuthError(error)) {
        return;
      }

      showSnackbar(
        error?.response?.data?.message ||
          "Không thể đồng bộ tồn kho cho đơn hàng",
        "error",
      );
    } finally {
      setSyncingOrderId(null);
    }
  };

  // =====================================================
  // ROLLBACK ONE ORDER STOCK
  // =====================================================

  const handleRollbackOneOrder = async (order) => {
    if (!order?._id) {
      return;
    }

    if (
      syncingStock ||
      syncingOrderId ||
      rollingBackOrderId ||
      updatingStatusId ||
      syncingPriceItem
    ) {
      return;
    }

    if (order.stockDeducted !== true) {
      showSnackbar("Đơn hàng này chưa được đồng bộ tồn kho.", "warning");

      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn rollback tồn kho cho đơn ${
        order.code || order._id
      }?\n\n` +
        "Hệ thống sẽ cộng lại số lượng đã xuất kho.\n" +
        "Lịch sử kho rollback sẽ được ghi lại.\n" +
        "Trạng thái đơn hàng sẽ KHÔNG thay đổi.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setRollingBackOrderId(order._id);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.post(
        `${API_ENDPOINTS.ORDER}/rollback-stock`,
        {
          orderId: order._id,
        },
        getAuthConfig(),
      );

      const data = response?.data || {};

      setOrders((prev) =>
        prev.map((item) =>
          item._id === order._id
            ? {
                ...item,
                stockDeducted: false,
              }
            : item,
        ),
      );

      showSnackbar(
        `Rollback ${order.code || "đơn hàng"} thành công. Hoàn lại ${
          data.restoredItems || 0
        } sản phẩm.`,
        "success",
      );
    } catch (error) {
      console.error("ROLLBACK STOCK ERROR:", error);

      if (handleAuthError(error)) {
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể rollback tồn kho",
        "error",
      );
    } finally {
      setRollingBackOrderId(null);
    }
  };

  // =====================================================
  // UPDATE ORDER STATUS
  // =====================================================

  const handleUpdateOrderStatus = async (order, newStatus) => {
    if (!order?._id) {
      return;
    }

    if (
      updatingStatusId ||
      syncingStock ||
      syncingOrderId ||
      rollingBackOrderId ||
      syncingPriceItem
    ) {
      return;
    }

    if (newStatus === order.status) {
      return;
    }

    const newStatusLabel = getStatusLabel(newStatus);

    const confirmed = window.confirm(
      `Bạn có chắc muốn đổi trạng thái đơn ${
        order.code || order._id
      } sang "${newStatusLabel}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingStatusId(order._id);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.put(
        `${API_ENDPOINTS.ORDER}/${order._id}/status`,
        {
          status: newStatus,
        },
        getAuthConfig(),
      );

      const data = response?.data || {};

      setOrders((prev) =>
        prev.map((item) =>
          item._id === order._id
            ? {
                ...item,
                status: newStatus,
              }
            : item,
        ),
      );

      showSnackbar(
        data?.message || `Đã đổi trạng thái sang "${newStatusLabel}"`,
        "success",
      );
    } catch (error) {
      console.error("UPDATE ORDER STATUS ERROR:", error);

      if (handleAuthError(error)) {
        return;
      }

      showSnackbar(
        error?.response?.data?.message ||
          "Không thể cập nhật trạng thái đơn hàng",
        "error",
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // =====================================================
  // VIEW ORDER
  // =====================================================

  const handleViewOrder = (order) => {
    if (!order?._id) {
      return;
    }

    navigate(`/admin/invoices/${order._id}`);
  };

  // =====================================================
  // STOCK STATUS
  // =====================================================

  const renderStockStatus = (order) => {
    if (order?.status === "cancelled") {
      return <Chip size="small" color="error" label="Đã hủy" />;
    }

    if (order?.stockDeducted === true) {
      return <Chip size="small" color="success" label="Đã đồng bộ" />;
    }

    return <Chip size="small" color="warning" label="Chưa đồng bộ" />;
  };

  // =====================================================
  // STATUS SELECT
  // =====================================================

  const renderStatusSelect = (order) => {
    const isUpdating = updatingStatusId === order._id;

    return (
      <FormControl
        size="small"
        sx={{
          minWidth: 150,
        }}
      >
        <Select
          value={order.status || "pending"}
          disabled={
            isUpdating ||
            syncingStock ||
            Boolean(syncingOrderId) ||
            Boolean(rollingBackOrderId) ||
            Boolean(syncingPriceItem)
          }
          onChange={(event) =>
            handleUpdateOrderStatus(order, event.target.value)
          }
          sx={{
            height: 36,
            borderRadius: 2,

            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              py: 0.5,
              pr: 4,
            },
          }}
          renderValue={(value) => (
            <Stack direction="row" alignItems="center" spacing={0.7}>
              {isUpdating ? (
                <CircularProgress size={16} />
              ) : (
                <Chip
                  size="small"
                  color={getStatusColor(value)}
                  label={getStatusLabel(value)}
                  sx={{
                    height: 24,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                />
              )}
            </Stack>
          )}
        >
          {statusOptions.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              sx={{
                py: 0.8,
              }}
            >
              <Chip
                size="small"
                color={option.color}
                label={option.label}
                sx={{
                  minWidth: 115,
                  fontWeight: 600,
                }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  // =====================================================
  // PRODUCT ITEM UI
  // =====================================================

  const renderProductItem = (order, item, index) => {
    const syncKey = getPriceSyncKey(order, item, index);

    const isSyncing = syncingPriceItem === syncKey;

    const itemPrice = getItemPrice(item);

    const currentPrice = getCurrentProductPrice(item);

    const hasPriceDifference =
      Number.isFinite(itemPrice) &&
      Number.isFinite(currentPrice) &&
      itemPrice !== currentPrice;

    const productName =
      item?.title || item?.productTitle || item?.product?.title || "Sản phẩm";

    const variantName = String(item?.variantName || "").trim();

    return (
      <Box
        key={`${syncKey}`}
        sx={{
          mt: 1,
          p: 1,
          border: "1px solid",
          borderColor: hasPriceDifference ? "warning.light" : "divider",
          borderRadius: 1.5,
          backgroundColor: hasPriceDifference ? "warning.50" : "transparent",
        }}
      >
        {/* PRODUCT NAME */}

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{
                display: "block",
                lineHeight: 1.4,
              }}
            >
              {productName}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              SL: {item?.qty || 0}
              {variantName ? ` • ${variantName}` : ""}
            </Typography>
          </Box>

          <Tooltip title="Đồng bộ giá sản phẩm này">
            <span>
              <Button
                size="small"
                variant={hasPriceDifference ? "contained" : "outlined"}
                color={hasPriceDifference ? "warning" : "primary"}
                disabled={
                  Boolean(syncingPriceItem) ||
                  syncingStock ||
                  Boolean(syncingOrderId) ||
                  Boolean(rollingBackOrderId) ||
                  Boolean(updatingStatusId)
                }
                onClick={() => handleSyncItemPrice(order, item, index)}
                startIcon={
                  isSyncing ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <Sync fontSize="small" />
                  )
                }
                sx={{
                  minWidth: 110,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {isSyncing ? "Đang đồng bộ" : "Đồng bộ giá"}
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {/* PRICE */}

        <Stack
          direction="row"
          spacing={2}
          sx={{
            mt: 0.8,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Giá trong đơn
            </Typography>

            <Typography variant="caption" fontWeight={700}>
              {formatMoney(itemPrice)}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Giá hiện tại
            </Typography>

            <Typography
              variant="caption"
              fontWeight={700}
              color={hasPriceDifference ? "warning.dark" : "success.main"}
            >
              {formatMoney(currentPrice)}
            </Typography>
          </Box>

          {hasPriceDifference && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Chênh lệch
              </Typography>

              <Typography
                variant="caption"
                fontWeight={700}
                color={currentPrice > itemPrice ? "error.main" : "success.main"}
              >
                {currentPrice > itemPrice ? "+" : ""}
                {formatMoney(currentPrice - itemPrice)}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    );
  };

  // =====================================================
  // PAGINATION
  // =====================================================

  const handlePageChange = (_event, value) => {
    setPage(value);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box
      sx={{
        p: {
          xs: 1,
          md: 2,
        },
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "stretch",
          md: "center",
        }}
        spacing={2}
        sx={{
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Quản lý đơn hàng
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            Quản lý đơn hàng, giá sản phẩm và tồn kho
          </Typography>
        </Box>

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={1}
        >
          {/* KHÔNG CÒN NÚT ĐỒNG BỘ GIÁ */}

          <Button
            variant="contained"
            color="warning"
            startIcon={
              syncingStock ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <Sync />
              )
            }
            disabled={
              syncingStock ||
              Boolean(syncingOrderId) ||
              Boolean(rollingBackOrderId) ||
              Boolean(updatingStatusId) ||
              Boolean(syncingPriceItem)
            }
            onClick={handleSyncStock}
          >
            {syncingStock ? "Đang đồng bộ kho..." : "Đồng bộ tồn kho"}
          </Button>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate("/admin/orders/create")}
          >
            Tạo đơn hàng
          </Button>
        </Stack>
      </Stack>

      {/* =================================================
          FILTER
      ================================================= */}

      <Card
        sx={{
          mb: 2,
        }}
      >
        <CardContent>
          <Grid container spacing={2}>
            {/* SEARCH */}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Tìm mã đơn, khách hàng, số điện thoại..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),

                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleClearSearch}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* STATUS */}

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={status}
                  onChange={handleStatusChange}
                  displayEmpty
                >
                  <MenuItem value="all">Tất cả trạng thái</MenuItem>

                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* LIMIT */}

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));

                    setPage(1);
                  }}
                >
                  <MenuItem value={10}>10 đơn / trang</MenuItem>

                  <MenuItem value={20}>20 đơn / trang</MenuItem>

                  <MenuItem value={40}>40 đơn / trang</MenuItem>

                  <MenuItem value={100}>100 đơn / trang</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* SEARCH BUTTON */}

            <Grid item xs={12}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleSearch}
                >
                  Tìm kiếm
                </Button>

                <Button variant="outlined" onClick={handleClearSearch}>
                  Xóa bộ lọc
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <Grid
        container
        spacing={2}
        sx={{
          mb: 2,
        }}
      >
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <ReceiptLong />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng đơn hàng
                  </Typography>

                  <Typography variant="h6" fontWeight={700}>
                    {total.toLocaleString("vi-VN")}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <PersonOutline />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Đang hiển thị
                  </Typography>

                  <Typography variant="h6" fontWeight={700}>
                    {orders.length.toLocaleString("vi-VN")}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <CalendarToday />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Trang hiện tại
                  </Typography>

                  <Typography variant="h6" fontWeight={700}>
                    {page} / {totalPages}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* =================================================
          TABLE
      ================================================= */}

      <Card>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 1450,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Mã đơn</strong>
                </TableCell>

                <TableCell>
                  <strong>Khách hàng</strong>
                </TableCell>

                <TableCell
                  sx={{
                    minWidth: 480,
                  }}
                >
                  <strong>Sản phẩm & giá</strong>
                </TableCell>

                <TableCell>
                  <strong>Tổng tiền</strong>
                </TableCell>

                <TableCell>
                  <strong>Đã trả</strong>
                </TableCell>

                <TableCell>
                  <strong>Còn nợ</strong>
                </TableCell>

                <TableCell>
                  <strong>Trạng thái</strong>
                </TableCell>

                <TableCell>
                  <strong>Tồn kho</strong>
                </TableCell>

                <TableCell>
                  <strong>Ngày tạo</strong>
                </TableCell>

                <TableCell align="right">
                  <strong>Thao tác</strong>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    sx={{
                      py: 6,
                    }}
                  >
                    <CircularProgress />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                      }}
                    >
                      Đang tải đơn hàng...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    sx={{
                      py: 6,
                    }}
                  >
                    <Typography color="text.secondary">
                      Không có đơn hàng
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const isSyncingThisOrder = syncingOrderId === order._id;

                  const isRollingBackThisOrder =
                    rollingBackOrderId === order._id;

                  const stockSynced = order.stockDeducted === true;

                  const isCancelled = order.status === "cancelled";

                  return (
                    <TableRow
                      key={order._id}
                      hover
                      sx={{
                        verticalAlign: "top",
                      }}
                    >
                      {/* CODE */}

                      <TableCell>
                        <Typography fontWeight={600}>
                          {order.code || order._id}
                        </Typography>
                      </TableCell>

                      {/* CUSTOMER */}

                      <TableCell>
                        <Stack spacing={0.3}>
                          <Typography fontWeight={600}>
                            {getCustomerName(order)}
                          </Typography>

                          {order?.customer?.phone && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {order.customer.phone}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      {/* PRODUCTS + PRICE */}

                      <TableCell>
                        <Typography
                          fontWeight={700}
                          sx={{
                            mb: 0.5,
                          }}
                        >
                          {getItemsCount(order)} sản phẩm
                        </Typography>

                        {Array.isArray(order.items) &&
                          order.items.map((item, index) =>
                            renderProductItem(order, item, index),
                          )}
                      </TableCell>

                      {/* TOTAL */}

                      <TableCell>
                        <Typography fontWeight={700}>
                          {formatMoney(order.totalAmount || order.total || 0)}
                        </Typography>
                      </TableCell>

                      {/* PAID */}

                      <TableCell>
                        {formatMoney(order.paidAmount || 0)}
                      </TableCell>

                      {/* DEBT */}

                      <TableCell>
                        <Typography
                          color={
                            Number(order.debt || 0) > 0
                              ? "error.main"
                              : "success.main"
                          }
                          fontWeight={600}
                        >
                          {formatMoney(order.debt || 0)}
                        </Typography>
                      </TableCell>

                      {/* STATUS */}

                      <TableCell>{renderStatusSelect(order)}</TableCell>

                      {/* STOCK */}

                      <TableCell>{renderStockStatus(order)}</TableCell>

                      {/* DATE */}

                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(order.created_at || order.createdAt)}
                        </Typography>
                      </TableCell>

                      {/* ACTION */}

                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          justifyContent="flex-end"
                          alignItems="center"
                        >
                          {/* SYNC STOCK */}

                          {!stockSynced && !isCancelled && (
                            <Tooltip title="Đồng bộ tồn kho cho đơn này">
                              <span>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="warning"
                                  disabled={
                                    syncingStock ||
                                    Boolean(syncingOrderId) ||
                                    Boolean(rollingBackOrderId) ||
                                    Boolean(updatingStatusId) ||
                                    Boolean(syncingPriceItem)
                                  }
                                  onClick={() => handleSyncOneOrder(order)}
                                  startIcon={
                                    isSyncingThisOrder ? (
                                      <CircularProgress
                                        size={15}
                                        color="inherit"
                                      />
                                    ) : (
                                      <Sync />
                                    )
                                  }
                                  sx={{
                                    minWidth: 120,
                                    fontWeight: 600,
                                  }}
                                >
                                  {isSyncingThisOrder
                                    ? "Đang đồng bộ"
                                    : "Đồng bộ kho"}
                                </Button>
                              </span>
                            </Tooltip>
                          )}

                          {/* ROLLBACK */}

                          {stockSynced && (
                            <Tooltip title="Rollback tồn kho">
                              <span>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  disabled={
                                    syncingStock ||
                                    Boolean(syncingOrderId) ||
                                    Boolean(rollingBackOrderId) ||
                                    Boolean(updatingStatusId) ||
                                    Boolean(syncingPriceItem)
                                  }
                                  onClick={() => handleRollbackOneOrder(order)}
                                  startIcon={
                                    isRollingBackThisOrder ? (
                                      <CircularProgress
                                        size={15}
                                        color="inherit"
                                      />
                                    ) : (
                                      <Sync
                                        sx={{
                                          transform: "rotate(180deg)",
                                        }}
                                      />
                                    )
                                  }
                                  sx={{
                                    minWidth: 100,
                                    fontWeight: 600,
                                  }}
                                >
                                  {isRollingBackThisOrder
                                    ? "Đang rollback"
                                    : "Rollback"}
                                </Button>
                              </span>
                            </Tooltip>
                          )}

                          {/* VIEW */}

                          <Tooltip title="Xem đơn hàng">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleViewOrder(order)}
                            >
                              <ArrowForwardIos fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* =================================================
            FOOTER
        ================================================= */}

        <Divider />

        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Tổng cộng: <strong>{total.toLocaleString("vi-VN")}</strong> đơn hàng
          </Typography>

          <Pagination
            color="primary"
            page={page}
            count={Math.max(totalPages, 1)}
            onChange={handlePageChange}
            showFirstButton
            showLastButton
          />
        </Box>
      </Card>

      {/* =================================================
          SNACKBAR
      ================================================= */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Orders;
