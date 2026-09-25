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
  VisibilityOutlined,
  PersonOutlineOutlined,
  LanguageOutlined,
  AccessTimeOutlined,
  DevicesOutlined,
  SearchOutlined,
  PublicOutlined,
  ComputerOutlined,
  PhoneAndroidOutlined,
  TabletAndroidOutlined,
  WebOutlined,
  StorefrontOutlined,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

// ============================================================
// TYPES
// ============================================================

interface Product {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  qty?: number | string;
  price?: number | string;
}

interface OrderItem {
  productId?: string;
  productTitle?: string;
  qty?: number | string;
  total?: number | string;
}

interface Order {
  _id?: string;
  code?: string;
  customerName?: string;
  status?: string;
  totalAmount?: number | string;
  paidAmount?: number | string;
  debt?: number | string;
  created_at?: string;
  createdAt?: string;
  items?: OrderItem[];
}

interface Customer {
  _id?: string;
  name?: string;
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

interface AnalyticsPage {
  path: string;
  visits: number;
}

interface AnalyticsProduct {
  productId?: string;
  title?: string;
  views: number;
}

interface AnalyticsSearch {
  keyword?: string;
  searches: number;
}

interface AnalyticsSource {
  source?: string;
  referrer?: string;
  visits: number;
}

interface AnalyticsDevice {
  device?: string;
  count: number;
}

interface AnalyticsBrowser {
  browser?: string;
  count: number;
}

interface AnalyticsOS {
  os?: string;
  count: number;
}

interface AnalyticsLanguage {
  language?: string;
  count: number;
}

interface AnalyticsScreen {
  width: number;
  height: number;
  count: number;
}

interface AnalyticsDaily {
  date: string;
  visits: number;
  unique: number;
}

interface AnalyticsRecentVisit {
  _id?: string;
  sessionId?: string;
  event?: string;
  path?: string;
  productId?: string;
  productTitle?: string;
  searchKeyword?: string;
  source?: string;
  device?: string;
  browser?: string;
  os?: string;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
  createdAt?: string;
}

interface AnalyticsOverview {
  totalVisits?: number;
  uniqueVisitors?: number;
  onlineVisitors?: number;

  todayVisits?: number;
  todayUniqueVisitors?: number;

  last7DaysVisits?: number;
  last7DaysUniqueVisitors?: number;

  last30DaysVisits?: number;
  last30DaysUniqueVisitors?: number;

  topPages?: AnalyticsPage[];
  topProducts?: AnalyticsProduct[];
  topSearches?: AnalyticsSearch[];

  topReferrers?: AnalyticsSource[];

  devices?: AnalyticsDevice[];
  browsers?: AnalyticsBrowser[];
  operatingSystems?: AnalyticsOS[];
  languages?: AnalyticsLanguage[];
  screenSizes?: AnalyticsScreen[];

  dailyStats?: AnalyticsDaily[];

  recentVisits?: AnalyticsRecentVisit[];
}

// ============================================================
// FORMAT
// ============================================================

const formatMoney = (value: number | string | undefined | null) => {
  return Number(value || 0).toLocaleString("vi-VN");
};

const formatNumber = (value: number | string | undefined | null) => {
  return Number(value || 0).toLocaleString("vi-VN");
};

const formatDate = (date?: string) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (date?: string) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ============================================================
// STATUS
// ============================================================

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color:
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "info"
      | "success"
      | "warning";
  }
> = {
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

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
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
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        transition: "all .2s ease",

        "&:hover": onClick
          ? {
              transform: "translateY(-3px)",
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
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              {title}
            </Typography>

            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{
                  wordBreak: "break-word",
                }}
              >
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
              minWidth: 48,
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
// ANALYTICS CARD
// ============================================================

interface AnalyticsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: "100%",
        borderRadius: 2.5,
        transition: "all .2s ease",

        "&:hover": {
          boxShadow: 2,
          transform: "translateY(-2px)",
        },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>

          <Typography variant="h5" fontWeight={800} mt={0.5}>
            {formatNumber(value)}
          </Typography>

          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            width: 44,
            height: 44,
            minWidth: 44,
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
    </Paper>
  );
};

// ============================================================
// SECTION HEADER
// ============================================================

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  subtitle,
  action,
}) => {
  return (
    <Stack
      direction={{
        xs: "column",
        sm: "row",
      }}
      justifyContent="space-between"
      alignItems={{
        xs: "flex-start",
        sm: "center",
      }}
      spacing={1.5}
      mb={2}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {icon && (
          <Box
            sx={{
              color: "primary.main",
              display: "flex",
            }}
          >
            {icon}
          </Box>
        )}

        <Box>
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>

          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      {action}
    </Stack>
  );
};

// ============================================================
// DASHBOARD
// ============================================================

const AdminStatistics: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);

  const [orders, setOrders] = useState<Order[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const requests: Promise<any>[] = [
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
      ];

      if (API_ENDPOINTS.ANALYTICS_DASHBOARD) {
        requests.push(
          axios.get(API_ENDPOINTS.ANALYTICS_DASHBOARD, {
            params: {
              days: 30,
            },
          }),
        );
      }

      const responses = await Promise.allSettled(requests);

      // ======================================================
      // PRODUCTS
      // ======================================================

      if (responses[0]?.status === "fulfilled") {
        const data = responses[0].value?.data;

        const list = data?.products || data?.data?.products || data?.data || [];

        setProducts(Array.isArray(list) ? list : []);
      }

      // ======================================================
      // ORDERS
      // ======================================================

      if (responses[1]?.status === "fulfilled") {
        const data = responses[1].value?.data;

        const list = data?.orders || data?.data?.orders || data?.data || [];

        setOrders(Array.isArray(list) ? list : []);
      }

      // ======================================================
      // CUSTOMERS
      // ======================================================

      if (responses[2]?.status === "fulfilled") {
        const data = responses[2].value?.data;

        const list =
          data?.customers || data?.data?.customers || data?.data || [];

        setCustomers(Array.isArray(list) ? list : []);
      }

      // ======================================================
      // ANALYTICS
      // ======================================================

      if (responses[3]?.status === "fulfilled") {
        const data = responses[3].value?.data;

        setAnalytics(data?.data || data?.analytics || data || null);
      } else {
        setAnalytics(null);
      }

      // ======================================================
      // MAIN API ERROR
      // ======================================================

      const mainApiFailed =
        responses[0]?.status === "rejected" ||
        responses[1]?.status === "rejected" ||
        responses[2]?.status === "rejected";

      if (mainApiFailed) {
        setError("Không thể tải đầy đủ dữ liệu Dashboard");
      }
    } catch (err: any) {
      console.error("loadDashboard:", err);

      setError(
        err?.response?.data?.message || "Không thể tải dữ liệu Dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // INITIAL
  // ==========================================================

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==========================================================
  // BUSINESS STATISTICS
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

    const pendingOrders = orders.filter(
      (order) => order.status === "pending",
    ).length;

    const shippingOrders = orders.filter(
      (order) => order.status === "shipping",
    ).length;

    const confirmedOrders = orders.filter(
      (order) => order.status === "confirmed",
    ).length;

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

      completedOrders,

      completedOrderCount: completedOrders.length,

      pendingOrders,
      confirmedOrders,
      shippingOrders,
    };
  }, [products, orders, customers]);

  // ==========================================================
  // RECENT ORDERS
  // ==========================================================

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();

        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();

        return dateB - dateA;
      })
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
  // TOP SELLING PRODUCTS
  // ==========================================================

  const topProducts = useMemo(() => {
    const map: Record<
      string,
      {
        title: string;
        qty: number;
        revenue: number;
      }
    > = {};

    orders.forEach((order) => {
      if (order.status === "cancelled") {
        return;
      }

      if (!Array.isArray(order.items)) {
        return;
      }

      order.items.forEach((item) => {
        const key = item.productId || item.productTitle || "unknown";

        if (!key) {
          return;
        }

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
  // ANALYTICS SAFE DATA
  // ==========================================================

  const analyticsData = useMemo(() => {
    return {
      totalVisits: analytics?.totalVisits || 0,

      uniqueVisitors: analytics?.uniqueVisitors || 0,

      onlineVisitors: analytics?.onlineVisitors || 0,

      todayVisits: analytics?.todayVisits || 0,

      todayUniqueVisitors: analytics?.todayUniqueVisitors || 0,

      last7DaysVisits: analytics?.last7DaysVisits || 0,

      last7DaysUniqueVisitors: analytics?.last7DaysUniqueVisitors || 0,

      last30DaysVisits: analytics?.last30DaysVisits || 0,

      last30DaysUniqueVisitors: analytics?.last30DaysUniqueVisitors || 0,

      topPages: Array.isArray(analytics?.topPages) ? analytics.topPages : [],

      topProducts: Array.isArray(analytics?.topProducts)
        ? analytics.topProducts
        : [],

      topSearches: Array.isArray(analytics?.topSearches)
        ? analytics.topSearches
        : [],

      topReferrers: Array.isArray(analytics?.topReferrers)
        ? analytics.topReferrers
        : [],

      devices: Array.isArray(analytics?.devices) ? analytics.devices : [],

      browsers: Array.isArray(analytics?.browsers) ? analytics.browsers : [],

      operatingSystems: Array.isArray(analytics?.operatingSystems)
        ? analytics.operatingSystems
        : [],

      languages: Array.isArray(analytics?.languages) ? analytics.languages : [],

      screenSizes: Array.isArray(analytics?.screenSizes)
        ? analytics.screenSizes
        : [],

      dailyStats: Array.isArray(analytics?.dailyStats)
        ? analytics.dailyStats
        : [],

      recentVisits: Array.isArray(analytics?.recentVisits)
        ? analytics.recentVisits
        : [],
    };
  }, [analytics]);

  // ==========================================================
  // MAX DAILY VISITS
  // ==========================================================

  const maxDailyVisits = useMemo(() => {
    return Math.max(
      ...analyticsData.dailyStats.map((item) => Number(item.visits || 0)),
      1,
    );
  }, [analyticsData.dailyStats]);

  // ==========================================================
  // DEVICE TOTAL
  // ==========================================================

  const deviceTotal = useMemo(() => {
    return analyticsData.devices.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0,
    );
  }, [analyticsData.devices]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Box
      sx={{
        width: "100%",
        pb: 4,
      }}
    >
      {/* ====================================================
          HEADER
      ==================================================== */}

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
          <Typography variant="h5" fontWeight={900}>
            Dashboard
          </Typography>

          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Tổng quan kinh doanh và hành vi khách hàng
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

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ====================================================
          BUSINESS OVERVIEW
      ==================================================== */}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Doanh thu"
            value={`${formatMoney(statistics.totalRevenue)} ₫`}
            subtitle={`${statistics.completedOrderCount} đơn hoàn thành`}
            icon={<AttachMoneyOutlined />}
            color="#16a34a"
            loading={loading}
            onClick={() => navigate("/admin/orders")}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Đơn hàng"
            value={formatNumber(statistics.totalOrders)}
            subtitle={`${statistics.pendingOrders} đơn chờ xử lý`}
            icon={<ShoppingCartOutlined />}
            color="#2563eb"
            loading={loading}
            onClick={() => navigate("/admin/orders")}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tồn kho"
            value={formatNumber(statistics.totalStock)}
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
            value={formatNumber(statistics.totalCustomers)}
            subtitle="Khách đã đăng ký"
            icon={<PeopleAltOutlined />}
            color="#7c3aed"
            loading={loading}
            onClick={() => navigate("/admin/customers")}
          />
        </Grid>
      </Grid>

      {/* ====================================================
          WEBSITE ANALYTICS
      ==================================================== */}

      <Card
        sx={{
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <CardContent
          sx={{
            p: {
              xs: 2,
              md: 3,
            },
          }}
        >
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            justifyContent="space-between"
            alignItems={{
              xs: "flex-start",
              sm: "center",
            }}
            spacing={2}
            mb={3}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <LanguageOutlined color="primary" />

                <Typography variant="h6" fontWeight={800}>
                  Khách truy cập website
                </Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Theo dõi khách hàng kể cả khi chưa đăng ký tài khoản
              </Typography>
            </Box>

            <Chip
              icon={<PersonOutlineOutlined />}
              label={`${formatNumber(
                analyticsData.onlineVisitors,
              )} đang online`}
              color="success"
              variant="outlined"
            />
          </Stack>

          {/* ANALYTICS CARDS */}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsCard
                title="Lượt truy cập"
                value={analyticsData.totalVisits}
                subtitle="30 ngày"
                icon={<VisibilityOutlined />}
                color="#2563eb"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsCard
                title="Khách duy nhất"
                value={analyticsData.uniqueVisitors}
                subtitle="Session khác nhau"
                icon={<PersonOutlineOutlined />}
                color="#7c3aed"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsCard
                title="Hôm nay"
                value={analyticsData.todayVisits}
                subtitle={`${formatNumber(
                  analyticsData.todayUniqueVisitors,
                )} khách`}
                icon={<AccessTimeOutlined />}
                color="#f59e0b"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsCard
                title="7 ngày"
                value={analyticsData.last7DaysVisits}
                subtitle={`${formatNumber(
                  analyticsData.last7DaysUniqueVisitors,
                )} khách`}
                icon={<TrendingUpOutlined />}
                color="#16a34a"
              />
            </Grid>
          </Grid>

          {/* =================================================
              DAILY CHART
          ================================================= */}

          <Box mt={4}>
            <SectionHeader
              icon={<TrendingUpOutlined />}
              title="Lượt truy cập 30 ngày"
              subtitle="Lượt xem và khách duy nhất"
            />

            {analyticsData.dailyStats.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 5,
                  textAlign: "center",
                  borderRadius: 2,
                }}
              >
                <Typography color="text.secondary">
                  Chưa có dữ liệu truy cập
                </Typography>
              </Paper>
            ) : (
              <Box
                sx={{
                  width: "100%",
                  overflowX: "auto",
                  pb: 1,
                }}
              >
                <Box
                  sx={{
                    minWidth: 650,
                    height: 240,
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 1,
                    px: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {analyticsData.dailyStats.map((item, index) => {
                    const visits = Number(item.visits || 0);

                    const height = Math.max(
                      (visits / maxDailyVisits) * 180,
                      visits > 0 ? 8 : 2,
                    );

                    return (
                      <Box
                        key={`${item.date}-${index}`}
                        sx={{
                          flex: 1,
                          minWidth: 18,
                          height: 220,
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        <Box
                          title={`${item.date}: ${formatNumber(visits)} lượt`}
                          sx={{
                            width: "65%",
                            minWidth: 10,
                            height,
                            borderRadius: "5px 5px 0 0",
                            bgcolor: "primary.main",
                            opacity: 0.8,
                            transition: "all .2s",

                            "&:hover": {
                              opacity: 1,
                              transform: "scaleY(1.03)",
                            },
                          }}
                        />

                        {(index === 0 ||
                          index === analyticsData.dailyStats.length - 1 ||
                          index % 5 === 0) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              position: "absolute",
                              bottom: -24,
                              whiteSpace: "nowrap",
                              fontSize: 10,
                            }}
                          >
                            {item.date.slice(5)}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>

          {/* =================================================
              ANALYTICS DETAIL
          ================================================= */}

          <Grid container spacing={2} mt={3}>
            {/* TOP VIEWED PRODUCTS */}

            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: "100%",
                  borderRadius: 2.5,
                }}
              >
                <SectionHeader
                  icon={<VisibilityOutlined />}
                  title="Sản phẩm được xem nhiều"
                  subtitle="Hành vi khách hàng"
                />

                {analyticsData.topProducts.length === 0 ? (
                  <Typography color="text.secondary" py={3} textAlign="center">
                    Chưa có dữ liệu
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {analyticsData.topProducts
                      .slice(0, 6)
                      .map((product, index) => (
                        <Stack
                          key={`${product.productId}-${index}`}
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              width: 30,
                              height: 30,
                              minWidth: 30,
                              borderRadius: "50%",
                              bgcolor: "primary.main",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            {index + 1}
                          </Box>

                          <Box
                            sx={{
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {product.title || "Sản phẩm"}
                            </Typography>

                            <LinearProgress
                              variant="determinate"
                              value={Math.min(
                                (Number(product.views || 0) /
                                  Number(
                                    analyticsData.topProducts[0]?.views || 1,
                                  )) *
                                  100,
                                100,
                              )}
                              sx={{
                                mt: 0.6,
                                height: 5,
                                borderRadius: 3,
                              }}
                            />
                          </Box>

                          <Typography variant="body2" fontWeight={800}>
                            {formatNumber(product.views)}
                          </Typography>
                        </Stack>
                      ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* SEARCH */}

            <Grid item xs={12} md={6}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: "100%",
                  borderRadius: 2.5,
                }}
              >
                <SectionHeader
                  icon={<SearchOutlined />}
                  title="Khách đang tìm gì?"
                  subtitle="Từ khóa tìm kiếm"
                />

                {analyticsData.topSearches.length === 0 ? (
                  <Typography color="text.secondary" py={3} textAlign="center">
                    Chưa có dữ liệu tìm kiếm
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {analyticsData.topSearches
                      .slice(0, 8)
                      .map((item, index) => (
                        <Stack
                          key={`${item.keyword}-${index}`}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: "action.hover",
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                              minWidth: 0,
                            }}
                          >
                            <Chip size="small" label={index + 1} />

                            <Typography variant="body2" fontWeight={600} noWrap>
                              {item.keyword || "---"}
                            </Typography>
                          </Stack>

                          <Typography variant="body2" fontWeight={800}>
                            {formatNumber(item.searches)}
                          </Typography>
                        </Stack>
                      ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* SOURCES */}

            <Grid item xs={12} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: "100%",
                  borderRadius: 2.5,
                }}
              >
                <SectionHeader
                  icon={<PublicOutlined />}
                  title="Nguồn truy cập"
                  subtitle="Khách đến từ đâu?"
                />

                <Stack spacing={1}>
                  {analyticsData.topReferrers.length === 0 ? (
                    <Typography
                      color="text.secondary"
                      textAlign="center"
                      py={3}
                    >
                      Chưa có dữ liệu
                    </Typography>
                  ) : (
                    analyticsData.topReferrers
                      .slice(0, 6)
                      .map((item, index) => (
                        <Stack
                          key={`${item.source}-${index}`}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                              minWidth: 0,
                            }}
                          >
                            <PublicOutlined
                              sx={{
                                fontSize: 18,
                                color: "text.secondary",
                              }}
                            />

                            <Typography
                              variant="body2"
                              noWrap
                              sx={{
                                maxWidth: 160,
                              }}
                            >
                              {item.source || item.referrer || "Trực tiếp"}
                            </Typography>
                          </Stack>

                          <Typography variant="body2" fontWeight={800}>
                            {formatNumber(item.visits)}
                          </Typography>
                        </Stack>
                      ))
                  )}
                </Stack>
              </Paper>
            </Grid>

            {/* DEVICES */}

            <Grid item xs={12} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: "100%",
                  borderRadius: 2.5,
                }}
              >
                <SectionHeader
                  icon={<DevicesOutlined />}
                  title="Thiết bị"
                  subtitle="Khách dùng thiết bị gì?"
                />

                <Stack spacing={1.5}>
                  {analyticsData.devices.slice(0, 5).map((item, index) => {
                    const count = Number(item.count || 0);

                    const percent =
                      deviceTotal > 0 ? (count / deviceTotal) * 100 : 0;

                    const icon =
                      item.device === "mobile" ? (
                        <PhoneAndroidOutlined />
                      ) : item.device === "tablet" ? (
                        <TabletAndroidOutlined />
                      ) : (
                        <ComputerOutlined />
                      );

                    return (
                      <Box key={`${item.device}-${index}`}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={0.5}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            {icon}

                            <Typography variant="body2">
                              {item.device || "Unknown"}
                            </Typography>
                          </Stack>

                          <Typography variant="body2" fontWeight={700}>
                            {percent.toFixed(0)}%
                          </Typography>
                        </Stack>

                        <LinearProgress
                          variant="determinate"
                          value={Math.min(percent, 100)}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>

            {/* BROWSER / OS */}

            <Grid item xs={12} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: "100%",
                  borderRadius: 2.5,
                }}
              >
                <SectionHeader
                  icon={<WebOutlined />}
                  title="Trình duyệt"
                  subtitle="Browser khách sử dụng"
                />

                <Stack spacing={1.2}>
                  {analyticsData.browsers.slice(0, 6).map((item, index) => (
                    <Stack
                      key={`${item.browser}-${index}`}
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography variant="body2">
                        {item.browser || "Unknown"}
                      </Typography>

                      <Typography variant="body2" fontWeight={800}>
                        {formatNumber(item.count)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                {analyticsData.operatingSystems.length > 0 && (
                  <>
                    <Divider
                      sx={{
                        my: 2,
                      }}
                    />

                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      Hệ điều hành
                    </Typography>

                    <Stack spacing={1}>
                      {analyticsData.operatingSystems
                        .slice(0, 5)
                        .map((item, index) => (
                          <Stack
                            key={`${item.os}-${index}`}
                            direction="row"
                            justifyContent="space-between"
                          >
                            <Typography variant="body2">
                              {item.os || "Unknown"}
                            </Typography>

                            <Typography variant="body2" fontWeight={700}>
                              {formatNumber(item.count)}
                            </Typography>
                          </Stack>
                        ))}
                    </Stack>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* =================================================
              TOP PAGES
          ================================================= */}

          <Box mt={3}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
              }}
            >
              <SectionHeader
                icon={<VisibilityOutlined />}
                title="Trang được xem nhiều"
                subtitle="Những khu vực khách quan tâm nhất"
              />

              <Grid container spacing={1}>
                {analyticsData.topPages.slice(0, 8).map((page, index) => (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    key={`${page.path}-${index}`}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{
                        p: 1.2,
                        borderRadius: 1.5,
                        bgcolor: "action.hover",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          minWidth: 0,
                        }}
                      >
                        <Chip size="small" label={index + 1} />

                        <Typography
                          variant="body2"
                          noWrap
                          sx={{
                            maxWidth: 190,
                          }}
                        >
                          {page.path}
                        </Typography>
                      </Stack>

                      <Typography variant="body2" fontWeight={800}>
                        {formatNumber(page.visits)}
                      </Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Box>
        </CardContent>
      </Card>

      {/* ====================================================
          QUICK BUSINESS ALERTS
      ==================================================== */}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
            }}
          >
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

                  <Typography variant="h4" fontWeight={900} color="error.main">
                    {statistics.outOfStock}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    mã sản phẩm
                  </Typography>
                </Box>

                <WarningAmberOutlined
                  color="error"
                  sx={{
                    fontSize: 42,
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
            }}
          >
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
                    fontWeight={900}
                    color="warning.main"
                  >
                    {statistics.lowStock}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    còn từ 1 - 5 sản phẩm
                  </Typography>
                </Box>

                <WarningAmberOutlined
                  color="warning"
                  sx={{
                    fontSize: 42,
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Công nợ
                  </Typography>

                  <Typography variant="h4" fontWeight={900}>
                    {formatMoney(statistics.totalDebt)} ₫
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Tổng tiền còn nợ
                  </Typography>
                </Box>

                <TrendingUpOutlined
                  color="primary"
                  sx={{
                    fontSize: 42,
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ====================================================
          ORDER STATUS
      ==================================================== */}

      <Card
        sx={{
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
        }}
      >
        <CardContent>
          <SectionHeader
            icon={<ShoppingCartOutlined />}
            title="Tình trạng đơn hàng"
            subtitle="Tổng quan đơn hàng hiện tại"
            action={
              <Button
                size="small"
                endIcon={<ArrowForwardOutlined />}
                onClick={() => navigate("/admin/orders")}
              >
                Xem đơn hàng
              </Button>
            }
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Chờ xác nhận
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={900}
                  color="warning.main"
                  mt={0.5}
                >
                  {statistics.pendingOrders}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Đã xác nhận
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={900}
                  color="info.main"
                  mt={0.5}
                >
                  {statistics.confirmedOrders}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Đang giao
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={900}
                  color="primary.main"
                  mt={0.5}
                >
                  {statistics.shippingOrders}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Hoàn thành
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={900}
                  color="success.main"
                  mt={0.5}
                >
                  {statistics.completedOrderCount}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ====================================================
          RECENT ORDERS + LOW STOCK
      ==================================================== */}

      <Grid container spacing={3} mb={3}>
        {/* RECENT ORDERS */}

        <Grid item xs={12} lg={8}>
          <Card
            sx={{
              height: "100%",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
            }}
          >
            <CardContent>
              <SectionHeader
                icon={<ReceiptLongOutlined />}
                title="Đơn hàng gần đây"
                subtitle="Các đơn hàng mới nhất"
                action={
                  <Button
                    size="small"
                    endIcon={<ArrowForwardOutlined />}
                    onClick={() => navigate("/admin/orders")}
                  >
                    Xem tất cả
                  </Button>
                }
              />

              <TableContainer
                sx={{
                  overflowX: "auto",
                }}
              >
                <Table
                  sx={{
                    minWidth: 650,
                  }}
                >
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
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align="center"
                          sx={{
                            py: 5,
                          }}
                        >
                          <CircularProgress size={28} />
                        </TableCell>
                      </TableRow>
                    ) : recentOrders.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align="center"
                          sx={{
                            py: 5,
                          }}
                        >
                          <Typography color="text.secondary">
                            Chưa có đơn hàng
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentOrders.map((order) => {
                        const status = STATUS_CONFIG[order.status || ""] || {
                          label: order.status || "Không xác định",
                          color: "default" as const,
                        };

                        return (
                          <TableRow
                            key={order._id}
                            hover
                            sx={{
                              cursor: order._id ? "pointer" : "default",
                            }}
                            onClick={() => {
                              if (order._id) {
                                navigate(`/admin/invoices/${order._id}`);
                              }
                            }}
                          >
                            <TableCell>
                              <Typography fontWeight={700}>
                                {order.code || order._id?.slice(-8) || "---"}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              {order.customerName || "Khách lẻ"}
                            </TableCell>

                            <TableCell>
                              <Typography fontWeight={700}>
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

        {/* LOW STOCK */}

        <Grid item xs={12} lg={4}>
          <Card
            sx={{
              height: "100%",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
            }}
          >
            <CardContent>
              <SectionHeader
                icon={<WarningAmberOutlined />}
                title="Cảnh báo tồn kho"
                subtitle="Sản phẩm sắp hết hàng"
              />

              {loading ? (
                <Box
                  sx={{
                    py: 5,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress size={28} />
                </Box>
              ) : lowStockProducts.length === 0 ? (
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

                    const percentage =
                      qty <= 0 ? 0 : Math.min((qty / 5) * 100, 100);

                    return (
                      <Box key={product._id || product.id}>
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
                            {product.title || product.name || "Sản phẩm"}
                          </Typography>

                          <Typography
                            variant="body2"
                            fontWeight={800}
                            color={qty <= 0 ? "error.main" : "warning.main"}
                          >
                            {qty}
                          </Typography>
                        </Stack>

                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          color={qty <= 0 ? "error" : "warning"}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                          }}
                        />
                      </Box>
                    );
                  })}

                  <Button
                    fullWidth
                    variant="outlined"
                    endIcon={<ArrowForwardOutlined />}
                    onClick={() => navigate("/admin/inventory")}
                    sx={{
                      mt: 1,
                    }}
                  >
                    Xem tồn kho
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ====================================================
          RECENT VISITORS
      ==================================================== */}

      <Card
        sx={{
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
        }}
      >
        <CardContent>
          <SectionHeader
            icon={<PersonOutlineOutlined />}
            title="Khách truy cập gần đây"
            subtitle="Theo dõi hành vi khách chưa cần đăng nhập"
          />

          <TableContainer
            sx={{
              overflowX: "auto",
            }}
          >
            <Table
              sx={{
                minWidth: 850,
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Thời gian</TableCell>

                  <TableCell>Hành động</TableCell>

                  <TableCell>Trang / sản phẩm</TableCell>

                  <TableCell>Thiết bị</TableCell>

                  <TableCell>Browser</TableCell>

                  <TableCell>Hệ điều hành</TableCell>

                  <TableCell>Nguồn</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {analyticsData.recentVisits.slice(0, 15).map((visit, index) => (
                  <TableRow
                    key={visit._id || `${visit.sessionId}-${index}`}
                    hover
                  >
                    <TableCell>
                      <Typography variant="body2" whiteSpace="nowrap">
                        {formatDateTime(visit.createdAt)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          visit.event === "product_view"
                            ? "Xem SP"
                            : visit.event === "search"
                              ? "Tìm kiếm"
                              : visit.event === "add_cart"
                                ? "Thêm giỏ"
                                : visit.event === "checkout"
                                  ? "Checkout"
                                  : visit.event === "purchase"
                                    ? "Mua hàng"
                                    : "Xem trang"
                        }
                        color={
                          visit.event === "add_cart"
                            ? "success"
                            : visit.event === "checkout"
                              ? "warning"
                              : "default"
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          maxWidth: 260,
                        }}
                      >
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {visit.productTitle ||
                            visit.searchKeyword ||
                            visit.path ||
                            "---"}
                        </Typography>

                        {visit.productTitle && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            display="block"
                          >
                            {visit.path}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.7} alignItems="center">
                        {visit.device === "mobile" ? (
                          <PhoneAndroidOutlined
                            sx={{
                              fontSize: 18,
                            }}
                          />
                        ) : visit.device === "tablet" ? (
                          <TabletAndroidOutlined
                            sx={{
                              fontSize: 18,
                            }}
                          />
                        ) : (
                          <ComputerOutlined
                            sx={{
                              fontSize: 18,
                            }}
                          />
                        )}

                        <Typography variant="body2">
                          {visit.device || "Unknown"}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {visit.browser || "---"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {visit.os || "---"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          maxWidth: 140,
                        }}
                      >
                        {visit.source || "Trực tiếp"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && analyticsData.recentVisits.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{
                        py: 5,
                      }}
                    >
                      <Typography color="text.secondary">
                        Chưa có dữ liệu khách truy cập
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {loading && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{
                        py: 5,
                      }}
                    >
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ====================================================
          TOP SELLING PRODUCTS
      ==================================================== */}

      <Card
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
        }}
      >
        <CardContent>
          <SectionHeader
            icon={<StorefrontOutlined />}
            title="Sản phẩm bán chạy"
            subtitle="Dựa trên dữ liệu đơn hàng"
            action={<ReceiptLongOutlined color="primary" />}
          />

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            {loading ? (
              <Grid
                item
                xs={12}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  py: 5,
                }}
              >
                <CircularProgress size={28} />
              </Grid>
            ) : topProducts.length === 0 ? (
              <Grid item xs={12}>
                <Typography textAlign="center" color="text.secondary" py={4}>
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
                      borderRadius: 2.5,
                      transition: "all .2s ease",

                      "&:hover": {
                        boxShadow: 2,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          minWidth: 36,
                          borderRadius: "50%",
                          bgcolor: "primary.main",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                        }}
                      >
                        {index + 1}
                      </Box>

                      <Box
                        sx={{
                          minWidth: 0,
                        }}
                      >
                        <Typography fontWeight={700} noWrap>
                          {product.title}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          Đã bán {formatNumber(product.qty)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Typography fontWeight={800} color="primary" mt={2}>
                      {formatMoney(product.revenue)} ₫
                    </Typography>
                  </Paper>
                </Grid>
              ))
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminStatistics;
