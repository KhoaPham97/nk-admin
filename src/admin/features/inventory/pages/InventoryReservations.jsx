import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";\n\nconst getProductImageUrl = (value) => {\n  const image = String(value || "").trim();\n  if (!image) return "/images/no-image.png";\n  if (/^(https?:|data:|blob:)/i.test(image) || image.startsWith("/")) return image;\n  return image.startsWith("images/") ? `/${image}` : `/images/${image}`;\n};

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
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

import Inventory2Icon from "@mui/icons-material/Inventory2";

import {
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  ChevronDown,
  ChevronUp,
  PackageSearch,
  Clock3,
  Eye,
  X,
  MapPin,
  Phone,
  User,
  CreditCard,
  Truck,
  CalendarDays,
} from "lucide-react";

import { API_ENDPOINTS } from "../../../../api";
import "./InventoryReservations.css";

const API_BASE_URL = String(API_ENDPOINTS?.PRODUCTS || "/api/products").replace(
  /\/products\/?$/,
  "",
);

const API_URL = `${API_BASE_URL}/inventory/reservations`;

const getToken = () =>
  localStorage.getItem("adminToken") ||
  localStorage.getItem("accessToken") ||
  "";

const api = axios.create({
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
const getStockStatusLabel = (status) => {
  const statusMap = {
    ready: "Sẵn sàng xử lý",
    deducted: "Đã trừ kho",
    reserved: "Đã giữ hàng",
    released: "Đã hoàn giữ kho",
    pending: "Chờ xử lý",
    cancelled: "Đã hủy",
  };

  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  return statusMap[normalized] || status || "Không xác định";
};
const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "—";

  const number = Number(value);

  if (!Number.isFinite(number)) return String(value);

  return `${new Intl.NumberFormat("vi-VN").format(number)} ₫`;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Lấy trường đầu tiên có dữ liệu
const pick = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const displayValue = (value) => {
  if (value === undefined || value === null || value === "") return "—";

  if (typeof value === "object") {
    return (
      value.name ||
      value.label ||
      value.title ||
      value.code ||
      JSON.stringify(value)
    );
  }

  return String(value);
};

const getOrderStatusLabel = (status, source) => {
  if (source === "shopee") {
    const map = {
      READY_TO_SHIP: "Chờ giao hàng",
      PROCESSED: "Đã xử lý",
      SHIPPED: "Đã gửi hàng",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
      IN_CANCEL: "Đang hủy",
      TO_CONFIRM_RECEIVE: "Chờ xác nhận nhận hàng",
      UNPAID: "Chưa thanh toán",
    };

    return map[String(status || "").toUpperCase()] || status || "Chưa rõ";
  }

  const map = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    shipping: "Đang giao",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
  };

  return map[status] || status || "Chưa rõ";
};

const getPaymentStatusLabel = (status) => {
  const map = {
    paid: "Đã thanh toán",
    unpaid: "Chưa thanh toán",
    pending: "Chờ thanh toán",
    completed: "Đã thanh toán",
    success: "Thành công",
    failed: "Thất bại",
    refunded: "Đã hoàn tiền",
    partial: "Thanh toán một phần",
  };

  return map[String(status || "").toLowerCase()] || displayValue(status);
};

const getPaymentMethodLabel = (method) => {
  const map = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
    cod: "Thanh toán khi nhận hàng (COD)",
    debt: "Ghi nợ",
  };

  return map[String(method || "").toLowerCase()] || displayValue(method);
};

const getOrderItems = (order) => {
  if (Array.isArray(order?.items)) return order.items;
  if (Array.isArray(order?.orderItems)) return order.orderItems;
  if (Array.isArray(order?.products)) return order.products;
  return [];
};

const getItemName = (item) =>
  pick(
    item.productTitle,
    item.title,
    item.itemName,
    item.name,
    item.productName,
    "Sản phẩm",
  );

const getItemVariant = (item) =>
  pick(
    item.variantName,
    item.modelName,
    item.variationName,
    item.optionName,
    "Mặc định",
  );

const getItemCode = (item) =>
  pick(
    item.variantCode,
    item.variationSku,
    item.itemSku,
    item.sku,
    item.productCode,
  );

const getItemQty = (item) =>
  Number(pick(item.qty, item.quantity, item.amount, 0)) || 0;

const getItemPrice = (item) =>
  pick(
    item.price,
    item.unitPrice,
    item.salePrice,
    item.modelDiscountedPrice,
    item.modelOriginalPrice,
    item.itemPrice,
  );

const getItemTotal = (item) => {
  const direct = pick(
    item.total,
    item.lineTotal,
    item.subtotal,
    item.totalPrice,
  );

  if (direct !== undefined) return direct;

  const price = Number(getItemPrice(item)) || 0;
  return price * getItemQty(item);
};

const getCustomerAddress = (order) => {
  const addressObject = pick(
    order?.shippingAddress,
    order?.address,
    order?.recipientAddress,
    order?.receiverAddress,
    order?.deliveryAddress,
  );

  if (typeof addressObject === "string") return addressObject;

  if (addressObject && typeof addressObject === "object") {
    return [
      addressObject?.fullAddress,
      addressObject?.address,
      addressObject?.detail,
      addressObject?.street,
      addressObject?.ward,
      addressObject?.district,
      addressObject?.city,
      addressObject?.province,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return pick(
    order?.fullAddress,
    order?.customerAddress,
    order?.shippingAddressText,
    order?.addressText,
  );
};

const SourceChip = ({ source }) =>
  source === "shopee" ? (
    <Chip
      size="small"
      icon={<Store size={14} />}
      label="Shopee"
      className="ir-source-shopee"
    />
  ) : (
    <Chip
      size="small"
      icon={<ShoppingCart size={14} />}
      label="Website"
      className="ir-source-website"
    />
  );

const SummaryCard = ({ title, value, description, icon, color }) => (
  <Card className="ir-summary-card">
    <CardContent>
      <Box className="ir-summary-top">
        <Box>
          <Typography className="ir-summary-title">{title}</Typography>

          <Typography className="ir-summary-value">
            {formatNumber(value)}
          </Typography>

          <Typography className="ir-summary-description">
            {description}
          </Typography>
        </Box>

        <Box
          className="ir-summary-icon"
          sx={{
            color,
            backgroundColor: `${color}14`,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// =====================================================
// THÔNG TIN ĐƠN HÀNG
// =====================================================

const OrderInfoItem = ({ icon, label, value }) => (
  <Box sx={{ display: "flex", gap: 1.2, alignItems: "flex-start" }}>
    <Box sx={{ color: "text.secondary", pt: 0.3 }}>{icon}</Box>

    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>

      <Typography
        variant="body2"
        fontWeight={600}
        sx={{ overflowWrap: "anywhere" }}
      >
        {displayValue(value)}
      </Typography>
    </Box>
  </Box>
);

const OrderDetailDialog = ({ open, onClose, loading, error, detail }) => {
  const order = detail?.order;
  const source = detail?.source || "website";

  const items = useMemo(() => getOrderItems(order), [order]);

  const orderCode =
    source === "shopee"
      ? pick(order?.orderSn, order?.code)
      : pick(order?.code, order?.orderCode);

  const status =
    source === "shopee"
      ? pick(order?.orderStatus, order?.status)
      : order?.status;

  const customerName = pick(
    order?.buyerUsername,
    order?.customerName,
    order?.recipientName,
    order?.receiverName,
    order?.customer?.name,
  );

  const customerPhone = pick(
    order?.customerPhone,
    order?.recipientPhone,
    order?.receiverPhone,
    order?.phone,
    order?.customer?.phone,
  );

  const address = getCustomerAddress(order);

  const paymentMethod = pick(
    order?.paymentMethod,
    order?.paymentType,
    order?.payMethod,
    order?.payment_method,
  );

  const paymentStatus = pick(
    order?.paymentStatus,
    order?.payStatus,
    order?.payment_state,
  );

  const totalAmount = pick(
    order?.totalAmount,
    order?.totalPrice,
    order?.finalAmount,
    order?.grandTotal,
    order?.total,
    order?.escrowAmount,
  );

  const shippingCode = pick(
    order?.trackingNumber,
    order?.trackingNo,
    order?.shippingCode,
    order?.waybill,
    order?.packageNumber,
  );

  const shippingProvider = pick(
    order?.shippingProvider,
    order?.shippingCarrier,
    order?.carrier,
    order?.shippingName,
    order?.logisticsName,
  );

  const createdAt = pick(
    order?.created_at,
    order?.createdAt,
    order?.createTime,
  );

  const updatedAt = pick(
    order?.updated_at,
    order?.updatedAt,
    order?.updateTime,
  );

  const note = pick(
    order?.note,
    order?.customerNote,
    order?.messageToSeller,
    order?.remark,
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          pr: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Chi tiết đơn hàng
          </Typography>

          {detail && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 0.7 }}
            >
              <SourceChip source={source} />

              <Typography variant="body2" fontWeight={700} color="primary.main">
                {orderCode || "Chưa có mã đơn"}
              </Typography>
            </Stack>
          )}
        </Box>

        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ minHeight: 220 }}>
        {loading ? (
          <Box
            sx={{
              minHeight: 250,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography color="text.secondary">
              Đang tải thông tin đơn hàng...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : !order ? (
          <Alert severity="info">Không có dữ liệu đơn hàng.</Alert>
        ) : (
          <Stack spacing={2.5}>
            {/* TRẠNG THÁI */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Trạng thái đơn hàng
                </Typography>

                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    color={
                      String(status).toLowerCase() === "completed"
                        ? "success"
                        : String(status).toLowerCase() === "cancelled"
                          ? "error"
                          : "warning"
                    }
                    label={getOrderStatusLabel(status, source)}
                  />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Trạng thái kho
                </Typography>

                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    variant="outlined"
                    color={
                      order.stockDeducted || order.stockStatus === "deducted"
                        ? "success"
                        : "default"
                    }
                    label={getStockStatusLabel(order.stockStatus)}
                  />
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* KHÁCH HÀNG */}
            <Box>
              <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                Thông tin khách hàng
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <OrderInfoItem
                    icon={<User size={17} />}
                    label="Tên khách hàng"
                    value={customerName}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <OrderInfoItem
                    icon={<Phone size={17} />}
                    label="Số điện thoại"
                    value={customerPhone}
                  />
                </Grid>

                <Grid item xs={12}>
                  <OrderInfoItem
                    icon={<MapPin size={17} />}
                    label="Địa chỉ giao hàng"
                    value={address}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* THANH TOÁN */}
            <Box>
              <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                Thanh toán
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <OrderInfoItem
                    icon={<CreditCard size={17} />}
                    label="Phương thức"
                    value={getPaymentMethodLabel(paymentMethod)}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <OrderInfoItem
                    icon={<CreditCard size={17} />}
                    label="Trạng thái thanh toán"
                    value={getPaymentStatusLabel(paymentStatus)}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <OrderInfoItem
                    icon={<CalendarDays size={17} />}
                    label="Ngày tạo đơn"
                    value={formatDate(order.createTime)}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* VẬN CHUYỂN */}
            {(shippingCode || shippingProvider) && (
              <>
                <Divider />

                <Box>
                  <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                    Vận chuyển
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <OrderInfoItem
                        icon={<Truck size={17} />}
                        label="Đơn vị vận chuyển"
                        value={shippingProvider}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <OrderInfoItem
                        icon={<Truck size={17} />}
                        label="Mã vận đơn"
                        value={shippingCode}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}

            <Divider />

            {/* SẢN PHẨM */}
            <Box>
              <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                Sản phẩm trong đơn ({items.length})
              </Typography>

              {items.length === 0 ? (
                <Alert severity="info">
                  Đơn hàng không có danh sách sản phẩm.
                </Alert>
              ) : (
                <TableContainer
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sản phẩm</TableCell>
                        <TableCell>Phân loại / Mã</TableCell>
                        <TableCell align="center">SL</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={item._id || item.itemId || index}>
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ minWidth: 120 }}
                            >
                              {getItemName(item)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {getItemVariant(item)}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {getItemCode(item) || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            {formatNumber(getItemQty(item))}
                          </TableCell>

                          <TableCell align="right">
                            {formatMoney(getItemPrice(item))}
                          </TableCell>

                          <TableCell align="right">
                            <Typography fontWeight={700}>
                              {formatMoney(getItemTotal(item))}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* TỔNG TIỀN */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Box
                sx={{
                  minWidth: 240,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Tổng giá trị đơn hàng
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={900}
                  color="primary.main"
                  sx={{ mt: 0.5 }}
                >
                  {formatMoney(totalAmount)}
                </Typography>
              </Box>
            </Box>

            {note && (
              <>
                <Divider />

                <Box>
                  <Typography fontWeight={800} sx={{ mb: 0.5 }}>
                    Ghi chú đơn hàng
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {displayValue(note)}
                  </Typography>
                </Box>
              </>
            )}

            <Divider />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <OrderInfoItem
                  icon={<CalendarDays size={17} />}
                  label="Ngày tạo"
                  value={formatDate(order.createTime)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <OrderInfoItem
                  icon={<CalendarDays size={17} />}
                  label="Cập nhật lần cuối"
                  value={formatDate(updatedAt)}
                />
              </Grid>
            </Grid>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =====================================================
// MAIN
// =====================================================

const InventoryReservations = () => {
  const [rows, setRows] = useState([]);

  const [summary, setSummary] = useState({
    totalProducts: 0,
    websiteQty: 0,
    shopeeReservedQty: 0,
    totalOrders: 0,
  });

  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [type, setType] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [expandedProduct, setExpandedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Dialog chi tiết đơn
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");

  const loadData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await api.get(API_URL, {
          params: {
            search: search.trim(),
            source,
            type,
            page,
            limit: 30,
          },
        });

        const payload = response?.data;

        setRows(Array.isArray(payload?.data) ? payload.data : []);

        setSummary(
          payload?.summary || {
            totalProducts: 0,
            websiteQty: 0,
            shopeeReservedQty: 0,
            totalOrders: 0,
          },
        );

        setTotal(payload?.pagination?.total || 0);
        setTotalPages(payload?.pagination?.totalPages || 1);
      } catch (err) {
        console.error("loadInventoryReservations:", err);

        if (err?.response?.status === 401) {
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          setError(
            err?.response?.data?.message ||
              "Không thể tải danh sách sản phẩm đang được giữ.",
          );
        }

        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, source, type, page],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, source, type]);

  const handleToggleProduct = (productId) => {
    setExpandedProduct((current) => (current === productId ? null : productId));
  };

  // =====================================================
  // CLICK MÃ ĐƠN -> TẢI CHI TIẾT ĐƠN
  // =====================================================

  const handleOpenOrder = async (order) => {
    if (!order?.orderId || !order?.source) {
      setOrderError("Thiếu mã đơn hoặc nguồn đơn hàng.");
      setOrderDetail(null);
      setOrderDialogOpen(true);
      return;
    }

    setOrderDialogOpen(true);
    setOrderDetail(null);
    setOrderError("");
    setOrderLoading(true);

    try {
      const response = await api.get(
        `${API_URL}/order/${encodeURIComponent(order.source)}/${encodeURIComponent(order.orderId)}`,
      );

      const payload = response?.data;

      if (!payload?.success || !payload?.data?.order) {
        throw new Error(
          payload?.message || "Không nhận được dữ liệu chi tiết đơn hàng.",
        );
      }

      setOrderDetail(payload.data);
    } catch (err) {
      console.error("handleOpenOrder:", err);

      setOrderError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể tải chi tiết đơn hàng.",
      );
    } finally {
      setOrderLoading(false);
    }
  };

  const handleCloseOrder = () => {
    setOrderDialogOpen(false);
    setOrderDetail(null);
    setOrderError("");
  };

  const totalCommitted = useMemo(
    () => summary.websiteQty + summary.shopeeReservedQty,
    [summary],
  );

  return (
    <Box className="ir-page">
      <Box className="ir-header">
        <Box>
          <Typography className="ir-eyebrow">QUẢN LÝ KHO</Typography>

          <Typography className="ir-title">
            Sản phẩm đang được giữ hàng
          </Typography>

          <Typography className="ir-subtitle">
            Theo dõi sản phẩm thuộc các đơn Website và Shopee chưa hoàn tất.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            refreshing ? (
              <CircularProgress size={16} />
            ) : (
              <RefreshCw size={17} />
            )
          }
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
          className="ir-refresh-button"
        >
          Làm mới
        </Button>
      </Box>

      {error && (
        <Alert severity="error" className="ir-alert">
          {error}
        </Alert>
      )}

      <Grid container spacing={2} className="ir-summary-grid">
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Sản phẩm có đơn"
            value={summary.totalProducts}
            description="Sản phẩm đang có đơn liên quan"
            icon={<PackageSearch size={23} />}
            color="#2563eb"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Website đã trừ kho"
            value={summary.websiteQty}
            description="Đơn chờ hoàn tất"
            icon={<ShoppingCart size={23} />}
            color="#7c3aed"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Shopee đang giữ"
            value={summary.shopeeReservedQty}
            description="Số lượng chưa xuất kho"
            icon={<Store size={23} />}
            color="#ea580c"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Tổng số lượng cam kết"
            value={totalCommitted}
            description={`${formatNumber(summary.totalOrders)} dòng đơn hàng`}
            icon={<Inventory2Icon size={23} />}
            color="#0891b2"
          />
        </Grid>
      </Grid>

      <Card className="ir-filter-card">
        <Box className="ir-filter-row">
          <TextField
            fullWidth
            size="small"
            placeholder="Tìm sản phẩm, mã biến thể, SKU hoặc mã đơn..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" className="ir-filter-select">
            <Select
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <MenuItem value="all">Tất cả nguồn đơn</MenuItem>
              <MenuItem value="website">Website</MenuItem>
              <MenuItem value="shopee">Shopee</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" className="ir-filter-select">
            <Select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <MenuItem value="all">Tất cả loại sản phẩm</MenuItem>
              <MenuItem value="1">Phụ tùng xe đạp</MenuItem>
              <MenuItem value="2">Phụ tùng xe điện</MenuItem>
              <MenuItem value="3">Phụ tùng xe ba gác</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box className="ir-filter-footer">
          <Typography>
            Tìm thấy <strong>{formatNumber(total)}</strong> sản phẩm
          </Typography>

          <Typography className="ir-stock-note">
            <Clock3 size={14} />
            Dữ liệu được tổng hợp trực tiếp từ đơn hàng
          </Typography>
        </Box>
      </Card>

      <Card className="ir-table-card">
        {loading ? (
          <Box className="ir-loading">
            <CircularProgress />
            <Typography>Đang tải dữ liệu...</Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Box className="ir-empty">
            <PackageSearch size={42} />

            <Typography className="ir-empty-title">
              Không có sản phẩm đang được giữ
            </Typography>

            <Typography>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table className="ir-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell>Phân loại</TableCell>
                    <TableCell align="center">Tồn thực tế</TableCell>
                    <TableCell align="center">Website</TableCell>
                    <TableCell align="center">Shopee giữ</TableCell>
                    <TableCell align="center">Khả dụng</TableCell>
                    <TableCell align="center">Đơn hàng</TableCell>
                    <TableCell align="center">Chi tiết</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((product) => {
                    const isExpanded = expandedProduct === product.productId;

                    return (
                      <React.Fragment key={product.productId}>
                        <TableRow
                          hover
                          className={isExpanded ? "ir-row-expanded" : ""}
                        >
                          <TableCell>
                            <Box className="ir-product-cell">
                              {product.thumbnail ? (
                                <img
                                  src={getProductImageUrl(product.thumbnail)}
                                  alt={product.title}
                                  className="ir-product-image"
                                />
                              ) : (
                                <Box className="ir-product-placeholder">
                                  <Inventory2Icon size={20} />
                                </Box>
                              )}

                              <Box className="ir-product-info">
                                <Typography className="ir-product-title">
                                  {product.title || "Sản phẩm chưa có tên"}
                                </Typography>

                                <Typography className="ir-product-meta">
                                  {product.code || product.productId}
                                  {product.brand ? ` · ${product.brand}` : ""}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={product.typeName}
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell align="center">
                            <strong>{formatNumber(product.physicalQty)}</strong>
                          </TableCell>

                          <TableCell align="center">
                            <span className="ir-website-number">
                              {formatNumber(product.websiteQty)}
                            </span>
                          </TableCell>

                          <TableCell align="center">
                            <span className="ir-shopee-number">
                              {formatNumber(product.shopeeReservedQty)}
                            </span>
                          </TableCell>

                          <TableCell align="center">
                            <Chip
                              size="small"
                              color={
                                product.availableQty <= 0
                                  ? "error"
                                  : product.availableQty <= 5
                                    ? "warning"
                                    : "success"
                              }
                              label={formatNumber(product.availableQty)}
                            />
                          </TableCell>

                          <TableCell align="center">
                            {formatNumber(product.totalOrders)}
                          </TableCell>

                          <TableCell align="center">
                            <Tooltip
                              title={isExpanded ? "Thu gọn" : "Xem đơn hàng"}
                            >
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleToggleProduct(product.productId)
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp size={19} />
                                ) : (
                                  <ChevronDown size={19} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell colSpan={8} className="ir-detail-cell">
                            <Collapse
                              in={isExpanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box className="ir-detail">
                                {(product.variants || []).map((variant) => (
                                  <Box
                                    key={variant.key}
                                    className="ir-variant-block"
                                  >
                                    <Box className="ir-variant-header">
                                      <Box>
                                        <Typography className="ir-variant-name">
                                          {variant.variantName}
                                        </Typography>

                                        <Typography className="ir-variant-code">
                                          Mã: {variant.variantCode || "—"}
                                          {variant.sku
                                            ? ` · SKU: ${variant.sku}`
                                            : ""}
                                        </Typography>
                                      </Box>

                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        flexWrap="wrap"
                                      >
                                        <Chip
                                          size="small"
                                          label={`Tồn ${formatNumber(variant.physicalQty)}`}
                                        />

                                        <Chip
                                          size="small"
                                          color="secondary"
                                          label={`Website ${formatNumber(variant.websiteQty)}`}
                                        />

                                        <Chip
                                          size="small"
                                          color="warning"
                                          label={`Shopee giữ ${formatNumber(variant.shopeeReservedQty)}`}
                                        />

                                        <Chip
                                          size="small"
                                          color="success"
                                          label={`Khả dụng ${formatNumber(variant.availableQty)}`}
                                        />
                                      </Stack>
                                    </Box>

                                    {!variant.orders?.length ? (
                                      <Typography className="ir-no-order">
                                        Không có đơn hàng chi tiết.
                                      </Typography>
                                    ) : (
                                      <TableContainer>
                                        <Table
                                          size="small"
                                          className="ir-order-table"
                                        >
                                          <TableHead>
                                            <TableRow>
                                              <TableCell>Nguồn</TableCell>
                                              <TableCell>Mã đơn</TableCell>
                                              <TableCell>Khách hàng</TableCell>
                                              <TableCell>
                                                Trạng thái đơn
                                              </TableCell>
                                              <TableCell align="center">
                                                Số lượng
                                              </TableCell>
                                              <TableCell>Ngày tạo</TableCell>
                                            </TableRow>
                                          </TableHead>

                                          <TableBody>
                                            {variant.orders.map(
                                              (order, index) => (
                                                <TableRow
                                                  key={`${order.orderId}-${index}`}
                                                  hover
                                                >
                                                  <TableCell>
                                                    <SourceChip
                                                      source={order.source}
                                                    />
                                                  </TableCell>

                                                  <TableCell>
                                                    <Button
                                                      size="small"
                                                      variant="text"
                                                      startIcon={
                                                        <Eye size={14} />
                                                      }
                                                      onClick={() =>
                                                        handleOpenOrder(order)
                                                      }
                                                      sx={{
                                                        textTransform: "none",
                                                        fontWeight: 800,
                                                        minWidth: 0,
                                                        px: 0.5,
                                                      }}
                                                    >
                                                      {order.orderCode ||
                                                        "Xem đơn"}
                                                    </Button>
                                                  </TableCell>

                                                  <TableCell>
                                                    <Typography>
                                                      {order.customerName ||
                                                        "—"}
                                                    </Typography>

                                                    {order.customerPhone && (
                                                      <Typography className="ir-order-phone">
                                                        {order.customerPhone}
                                                      </Typography>
                                                    )}
                                                  </TableCell>

                                                  <TableCell>
                                                    <Chip
                                                      size="small"
                                                      variant="outlined"
                                                      label={getOrderStatusLabel(
                                                        order.orderStatus,
                                                        order.source,
                                                      )}
                                                    />
                                                  </TableCell>

                                                  <TableCell align="center">
                                                    <strong>
                                                      {formatNumber(order.qty)}
                                                    </strong>
                                                  </TableCell>

                                                  <TableCell>
                                                    {formatDate(
                                                      order.createdAt,
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              ),
                                            )}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box className="ir-pagination">
              <Typography>
                Trang {page}/{totalPages}
              </Typography>

              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => {
                  setPage(value);
                  setExpandedProduct(null);
                }}
                color="primary"
                shape="rounded"
              />
            </Box>
          </>
        )}
      </Card>

      <Box className="ir-footnote">
        <Typography>
          <strong>Lưu ý:</strong> Website hiển thị lượng hàng đã trừ kho theo
          đơn chưa hoàn tất. Shopee hiển thị lượng còn giữ kho thực tế. Không
          cộng hai loại này vào phép tính trừ tồn lần thứ hai.
        </Typography>
      </Box>

      {/* DIALOG CHI TIẾT ĐƠN */}
      <OrderDetailDialog
        open={orderDialogOpen}
        onClose={handleCloseOrder}
        loading={orderLoading}
        error={orderError}
        detail={orderDetail}
      />
    </Box>
  );
};

export default InventoryReservations;
