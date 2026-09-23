import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import {
  AttachMoneyOutlined,
  Inventory2Outlined,
  PeopleAltOutlined,
  ShoppingCartOutlined,
  TrendingUpOutlined,
  WarningAmberOutlined,
  RefreshOutlined,
  ArrowForwardOutlined,
  ReceiptLongOutlined,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

// ============================================================
// FORMAT
// ============================================================

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString("vi-VN");
};

const formatDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ============================================================
// STATUS
// ============================================================

const STATUS_CONFIG = {
  pending: {
    label: "Chờ xác nhận",
    color: "warning",
  },

  confirmed: {
    label: "Đã xác nhận",
    color: "info",
  },

  shipping: {
    label: "Đang giao",
    color: "primary",
  },

  completed: {
    label: "Hoàn thành",
    color: "success",
  },

  cancelled: {
    label: "Đã hủy",
    color: "error",
  },
};

// ============================================================
// STAT CARD
// ============================================================

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  loading,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        transition: "0.2s",

        "&:hover": onClick
          ? {
              transform: "translateY(-2px)",
              boxShadow: 5,
            }
          : {},
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              {title}
            </Typography>

            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h5" fontWeight={800}>
                {value}
              </Typography>
            )}

            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={1}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${color}15`,
              color,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ============================================================
// DASHBOARD
// ============================================================

const Dashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [productsResponse, ordersResponse, customersResponse] =
        await Promise.all([
          axios.get(API_ENDPOINTS.PRODUCTS, {
            params: {
              type: "all",
            },
          }),

          axios.get(API_ENDPOINTS.ORDER, {
            params: {
              page: 1,
              limit: 100,
            },
          }),

          axios.get(API_ENDPOINTS.CUSTOMERS, {
            params: {
              page: 1,
              limit: 100,
            },
          }),
        ]);

      // --------------------------------------------------------
      // PRODUCTS
      // --------------------------------------------------------

      const productData = productsResponse?.data;

      const productList =
        productData?.products ||
        productData?.data?.products ||
        productData?.data ||
        [];

      setProducts(Array.isArray(productList) ? productList : []);

      // --------------------------------------------------------
      // ORDERS
      // --------------------------------------------------------

      const orderData = ordersResponse?.data;

      const orderList =
        orderData?.orders || orderData?.data?.orders || orderData?.data || [];

      setOrders(Array.isArray(orderList) ? orderList : []);

      // --------------------------------------------------------
      // CUSTOMERS
      // --------------------------------------------------------

      const customerData = customersResponse?.data;

      const customerList =
        customerData?.customers ||
        customerData?.data?.customers ||
        customerData?.data ||
        [];

      setCustomers(Array.isArray(customerList) ? customerList : []);
    } catch (err) {
      console.error("loadDashboard:", err);

      setError(
        err?.response?.data?.message || "Không thể tải dữ liệu Dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const statistics = useMemo(() => {
    const completedOrders = orders.filter(
      (order) => order.status === "completed",
    );

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0,
    );

    const totalPaid = orders.reduce(
      (sum, order) => sum + Number(order.paidAmount || 0),
      0,
    );

    const totalDebt = orders.reduce(
      (sum, order) => sum + Number(order.debt || 0),
      0,
    );

    const totalStock = products.reduce(
      (sum, product) => sum + Number(product.qty || 0),
      0,
    );

    const outOfStock = products.filter(
      (product) => Number(product.qty || 0) <= 0,
    ).length;

    const lowStock = products.filter((product) => {
      const qty = Number(product.qty || 0);

      return qty > 0 && qty <= 5;
    }).length;

    return {
      totalRevenue,
      totalPaid,
      totalDebt,
      totalStock,
      outOfStock,
      lowStock,
      totalProducts: products.length,
      totalOrders: orders.length,
      totalCustomers: customers.length,
      completedOrders: completedOrders.length,
    };
  }, [products, orders, customers]);

  // ==========================================================
  // RECENT ORDERS
  // ==========================================================

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          new Date(b.created_at || b.createdAt) -
          new Date(a.created_at || a.createdAt),
      )
      .slice(0, 8);
  }, [orders]);

  // ==========================================================
  // LOW STOCK
  // ==========================================================

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => Number(product.qty || 0) <= 5)
      .sort((a, b) => Number(a.qty || 0) - Number(b.qty || 0))
      .slice(0, 8);
  }, [products]);

  // ==========================================================
  // TOP PRODUCTS
  // ==========================================================

  const topProducts = useMemo(() => {
    const map = {};

    orders.forEach((order) => {
      if (order.status === "cancelled") {
        return;
      }

      if (!Array.isArray(order.items)) {
        return;
      }

      order.items.forEach((item) => {
        const key = item.productId || item.productTitle;

        if (!key) return;

        if (!map[key]) {
          map[key] = {
            title: item.productTitle || "Sản phẩm",
            qty: 0,
            revenue: 0,
          };
        }

        map[key].qty += Number(item.qty || 0);

        map[key].revenue += Number(item.total || 0);
      });
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Box>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <Stack
        direction={{
          xs: "column",
          sm: "row",
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "stretch",
          sm: "center",
        }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Dashboard
          </Typography>

          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Tổng quan hoạt động NHẬT KHANG BIKE
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshOutlined />}
          onClick={loadDashboard}
          disabled={loading}
        >
          Làm mới
        </Button>
      </Stack>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ======================================================
          STAT CARDS
      ====================================================== */}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Doanh thu"
            value={`${formatMoney(statistics.totalRevenue)} ₫`}
            subtitle={`${statistics.completedOrders} đơn hoàn thành`}
            icon={<AttachMoneyOutlined />}
            color="#16a34a"
            loading={loading}
            onClick={() => navigate("/admin/orders")}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Đơn hàng"
            value={statistics.totalOrders.toLocaleString("vi-VN")}
            subtitle="Tổng số đơn hàng"
            icon={<ShoppingCartOutlined />}
            color="#2563eb"
            loading={loading}
            onClick={() => navigate("/admin/orders")}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tồn kho"
            value={statistics.totalStock.toLocaleString("vi-VN")}
            subtitle={`${statistics.totalProducts} mã sản phẩm`}
            icon={<Inventory2Outlined />}
            color="#f59e0b"
            loading={loading}
            onClick={() => navigate("/admin/inventory")}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Khách hàng"
            value={statistics.totalCustomers.toLocaleString("vi-VN")}
            subtitle="Tổng số khách hàng"
            icon={<PeopleAltOutlined />}
            color="#7c3aed"
            loading={loading}
            onClick={() => navigate("/admin/customers")}
          />
        </Grid>
      </Grid>

      {/* ======================================================
          STOCK WARNING
      ====================================================== */}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Hết hàng
                  </Typography>

                  <Typography variant="h4" fontWeight={800} color="error.main">
                    {statistics.outOfStock}
                  </Typography>
                </Box>

                <WarningAmberOutlined color="error" sx={{ fontSize: 42 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Sắp hết hàng
                  </Typography>

                  <Typography
                    variant="h4"
                    fontWeight={800}
                    color="warning.main"
                  >
                    {statistics.lowStock}
                  </Typography>
                </Box>

                <WarningAmberOutlined color="warning" sx={{ fontSize: 42 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Công nợ đơn hàng
                  </Typography>

                  <Typography variant="h4" fontWeight={800}>
                    {formatMoney(statistics.totalDebt)} ₫
                  </Typography>
                </Box>

                <TrendingUpOutlined color="primary" sx={{ fontSize: 42 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <Grid container spacing={3}>
        {/* ====================================================
            RECENT ORDERS
        ==================================================== */}

        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Đơn hàng gần đây
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Các đơn hàng mới nhất
                  </Typography>
                </Box>

                <Button
                  size="small"
                  endIcon={<ArrowForwardOutlined />}
                  onClick={() => navigate("/admin/orders")}
                >
                  Xem tất cả
                </Button>
              </Stack>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Mã đơn</TableCell>

                      <TableCell>Khách hàng</TableCell>

                      <TableCell>Tổng tiền</TableCell>

                      <TableCell>Trạng thái</TableCell>

                      <TableCell>Ngày</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {recentOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          Chưa có đơn hàng
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentOrders.map((order) => {
                        const status = STATUS_CONFIG[order.status] || {
                          label: order.status || "Không xác định",
                          color: "default",
                        };

                        return (
                          <TableRow
                            key={order._id}
                            hover
                            sx={{
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              navigate(`/admin/invoices/${order._id}`)
                            }
                          >
                            <TableCell>
                              <Typography fontWeight={600}>
                                {order.code || order._id?.slice(-8)}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              {order.customerName || "Khách lẻ"}
                            </TableCell>

                            <TableCell>
                              <Typography fontWeight={600}>
                                {formatMoney(order.totalAmount)} ₫
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={status.label}
                                color={status.color}
                              />
                            </TableCell>

                            <TableCell>
                              {formatDate(order.created_at || order.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* ====================================================
            LOW STOCK
        ==================================================== */}

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Cảnh báo tồn kho
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Sản phẩm sắp hết hàng
                  </Typography>
                </Box>

                <WarningAmberOutlined color="warning" />
              </Stack>

              {lowStockProducts.length === 0 ? (
                <Box
                  sx={{
                    py: 5,
                    textAlign: "center",
                  }}
                >
                  <Typography color="text.secondary">
                    Tồn kho đang ổn định
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {lowStockProducts.map((product) => {
                    const qty = Number(product.qty || 0);

                    const percentage = Math.min((qty / 5) * 100, 100);

                    return (
                      <Box key={product._id}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                          mb={0.5}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            noWrap
                            sx={{
                              maxWidth: "75%",
                            }}
                          >
                            {product.title || product.name}
                          </Typography>

                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color={qty <= 0 ? "error.main" : "warning.main"}
                          >
                            {qty}
                          </Typography>
                        </Stack>

                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          color={qty <= 0 ? "error" : "warning"}
                        />
                      </Box>
                    );
                  })}

                  <Button
                    fullWidth
                    variant="outlined"
                    endIcon={<ArrowForwardOutlined />}
                    onClick={() => navigate("/admin/inventory")}
                    sx={{ mt: 1 }}
                  >
                    Xem tồn kho
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ====================================================
            TOP PRODUCTS
        ==================================================== */}

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Sản phẩm bán chạy
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Dựa trên dữ liệu đơn hàng
                  </Typography>
                </Box>

                <ReceiptLongOutlined color="primary" />
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                {topProducts.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography
                      textAlign="center"
                      color="text.secondary"
                      py={4}
                    >
                      Chưa có dữ liệu bán hàng
                    </Typography>
                  </Grid>
                ) : (
                  topProducts.map((product, index) => (
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={4}
                      lg={2.4}
                      key={`${product.title}-${index}`}
                    >
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          height: "100%",
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              backgroundColor: "primary.main",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                            }}
                          >
                            {index + 1}
                          </Box>

                          <Box
                            sx={{
                              minWidth: 0,
                            }}
                          >
                            <Typography fontWeight={600} noWrap>
                              {product.title}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Đã bán {product.qty.toLocaleString("vi-VN")}
                            </Typography>
                          </Box>
                        </Stack>

                        <Typography fontWeight={700} color="primary" mt={2}>
                          {formatMoney(product.revenue)} ₫
                        </Typography>
                      </Paper>
                    </Grid>
                  ))
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
