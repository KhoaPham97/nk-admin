import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
  TableRow,
} from "@mui/material";

import {
  RefreshCw,
  Search,
  CalendarDays,
  TrendingUp,
  Wallet,
  Receipt,
  Package,
  DollarSign,
  Eye,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  RotateCcw,
  Store,
  X,
} from "lucide-react";
import shopeeApi from "../../services/shopeeApi";

// =====================================================
// HELPERS
// =====================================================

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value || 0));

const formatDate = (value, withTime = false) => {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const getToday = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const getDateBefore = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);

  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const PROFIT_STATUS = {
  calculated: {
    label: "Đã xác nhận",
    color: "success",
  },
  pending_estimate: {
    label: "Ước tính",
    color: "info",
  },
  missing_stock_cost: {
    label: "Thiếu giá vốn",
    color: "error",
  },
  needs_return_reconciliation: {
    label: "Cần đối soát hàng hoàn",
    color: "warning",
  },
};

const INCOME_STATUS = {
  released: {
    label: "Đã quyết toán",
    color: "success",
  },
  pending: {
    label: "Đang chờ",
    color: "warning",
  },
};

const getIncomeStatus = (item) => {
  const value = String(item?.incomeStatus || "").toLowerCase();

  if (value === "released" || value === "1" || value.includes("released")) {
    return INCOME_STATUS.released;
  }

  return INCOME_STATUS.pending;
};

const getProfitStatus = (value) =>
  PROFIT_STATUS[value] || {
    label: value || "Chưa xác định",
    color: "default",
  };

const getFeeLabel = (key) => {
  const labels = {
    commission_fee: "Phí cố định / hoa hồng",
    service_fee: "Phí dịch vụ",
    shipping_fee: "Phí vận chuyển",
    voucher_from_seller: "Voucher người bán",
    seller_voucher: "Voucher người bán",
    seller_coin_cash_back: "Hoàn xu người bán",
    buyer_paid_shipping_fee: "Phí vận chuyển người mua",
    actual_shipping_fee: "Phí vận chuyển thực tế",
    escrow_amount: "Tiền thực nhận",
    transaction_fee: "Phí giao dịch",
    payment_fee: "Phí thanh toán",
    order_income: "Thu nhập đơn hàng",
  };

  return (
    labels[key] ||
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
};

// =====================================================
// SMALL COMPONENTS
// =====================================================

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  color = "default",
}) {
  const colors = {
    default: {
      background: "#f3f4f6",
      foreground: "#344054",
    },
    green: {
      background: "#e8f7ee",
      foreground: "#15803d",
    },
    blue: {
      background: "#eaf2ff",
      foreground: "#2563eb",
    },
    orange: {
      background: "#fff3e5",
      foreground: "#c77700",
    },
    red: {
      background: "#feeceb",
      foreground: "#dc2626",
    },
  };

  const theme = colors[color] || colors.default;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 3,
        boxShadow: "none",
      }}
    >
      <CardContent sx={{ p: 2.2, "&:last-child": { pb: 2.2 } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {title}
            </Typography>

            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ mt: 1, letterSpacing: "-0.5px" }}
            >
              {value}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              {description}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              bgcolor: theme.background,
              color: theme.foreground,
            }}
          >
            <Icon size={21} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }) {
  return (
    <Chip
      size="small"
      color={status?.color || "default"}
      label={status?.label || "Chưa xác định"}
      variant="outlined"
      sx={{ fontWeight: 600, borderRadius: 1.5 }}
    />
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ShopeeRevenue({
  shops = [],
  selectedShopId = "",
  onShopChange,
  onRefresh,
  refreshKey,
}) {
  const [from, setFrom] = useState(getDateBefore(7));
  const [to, setTo] = useState(getToday());

  const [keyword, setKeyword] = useState("");
  const [incomeFilter, setIncomeFilter] = useState("all");
  const [profitFilter, setProfitFilter] = useState("all");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ---------------------------------------------------
  // LOAD REPORT
  // ---------------------------------------------------

  const loadReport = useCallback(async () => {
    if (!selectedShopId) {
      setReport(null);
      return;
    }

    if (from && to && from > to) {
      setError("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await shopeeApi.getRevenueReport({
        shop_id: selectedShopId,
        from,
        to,
      });

      if (!response?.success) {
        throw new Error(
          response?.message || "Không thể tải báo cáo doanh thu.",
        );
      }

      setReport(response);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Có lỗi khi tải dữ liệu doanh thu.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedShopId, from, to]);

  useEffect(() => {
    loadReport();
  }, [loadReport, refreshKey]);

  // ---------------------------------------------------
  // REFRESH
  // ---------------------------------------------------

  const handleRefresh = async () => {
    await loadReport();

    if (typeof onRefresh === "function") {
      onRefresh();
    }
  };

  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  const summary = report?.summary || {};
  const items = report?.items || [];

  const filteredItems = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return items.filter((item) => {
      const matchKeyword =
        !search ||
        String(item.orderSn || "")
          .toLowerCase()
          .includes(search) ||
        String(item.buyerUsername || "")
          .toLowerCase()
          .includes(search);

      const income = getIncomeStatus(item);

      const matchIncome =
        incomeFilter === "all" ||
        (incomeFilter === "released" &&
          income.label === INCOME_STATUS.released.label) ||
        (incomeFilter === "pending" &&
          income.label === INCOME_STATUS.pending.label);

      const matchProfit =
        profitFilter === "all" || item.profitStatus === profitFilter;

      return matchKeyword && matchIncome && matchProfit;
    });
  }, [items, keyword, incomeFilter, profitFilter]);

  useEffect(() => {
    setPage(0);
  }, [keyword, incomeFilter, profitFilter]);

  const paginatedItems = filteredItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // ---------------------------------------------------
  // EMPTY SHOP
  // ---------------------------------------------------

  if (!selectedShopId) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 5,
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <Store size={42} color="#98a2b3" />

        <Typography variant="h6" fontWeight={700} sx={{ mt: 2 }}>
          Chưa chọn shop Shopee
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Vui lòng chọn shop Shopee để xem doanh thu và lợi nhuận.
        </Typography>
      </Paper>
    );
  }

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------

  return (
    <Box>
      {/* HEADER */}

      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Doanh thu & Lợi nhuận Shopee
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Đối soát tiền thực nhận, phí Shopee và giá vốn hàng xuất kho.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={
              loading ? <CircularProgress size={16} /> : <RefreshCw size={17} />
            }
            onClick={handleRefresh}
            disabled={loading}
          >
            Làm mới
          </Button>
        </Stack>
      </Stack>

      {/* FILTERS */}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          spacing={1.5}
        >
          <TextField
            select
            size="small"
            label="Shop Shopee"
            value={selectedShopId}
            onChange={(event) => onShopChange?.(event.target.value)}
            sx={{ minWidth: { xs: "100%", md: 220 } }}
          >
            {shops.map((shop) => (
              <MenuItem
                key={shop._id || shop.shopId || shop.shop_id}
                value={String(shop.shopId || shop.shop_id || shop._id)}
              >
                {shop.shopId || shop.shop_name || shop.name || "Shopee Shop"}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            type="date"
            label="Từ ngày"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 155 }}
          />

          <TextField
            size="small"
            type="date"
            label="Đến ngày"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 155 }}
          />

          <Button
            variant="contained"
            startIcon={<CalendarDays size={17} />}
            onClick={loadReport}
            disabled={loading}
          >
            Áp dụng
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={loadReport}>
              Thử lại
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* SUMMARY */}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} xl={3}>
          <SummaryCard
            title="Tiền đã quyết toán"
            value={formatMoney(summary.releasedAmount)}
            description={`${formatNumber(summary.releasedOrders)} đơn đã quyết toán`}
            icon={Wallet}
            color="green"
          />
        </Grid>

        <Grid item xs={12} sm={6} xl={3}>
          <SummaryCard
            title="Tiền đang chờ"
            value={formatMoney(summary.pendingAmount)}
            description={`${formatNumber(summary.pendingOrders)} đơn đang chờ`}
            icon={Clock3}
            color="orange"
          />
        </Grid>

        <Grid item xs={12} sm={6} xl={3}>
          <SummaryCard
            title="Lợi nhuận đã xác nhận"
            value={formatMoney(summary.calculatedProfitVnd)}
            description={`${formatNumber(summary.calculatedOrders)} đơn đủ dữ liệu giá vốn`}
            icon={TrendingUp}
            color="blue"
          />
        </Grid>

        <Grid item xs={12} sm={6} xl={3}>
          <SummaryCard
            title="Lợi nhuận ước tính"
            value={formatMoney(summary.estimatedProfitVnd)}
            description={`${formatNumber(summary.pendingEstimateOrders)} đơn chưa quyết toán`}
            icon={DollarSign}
            color="default"
          />
        </Grid>
      </Grid>

      {/* RECONCILIATION WARNINGS */}

      {(summary.missingCostOrders > 0 ||
        summary.returnReconciliationOrders > 0 ||
        report?.escrowErrorCount > 0) && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {summary.missingCostOrders > 0 && (
            <Grid item xs={12} md={4}>
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                <strong>{summary.missingCostOrders}</strong> đơn thiếu giá vốn.
                Chưa thể xác nhận lợi nhuận.
              </Alert>
            </Grid>
          )}

          {summary.returnReconciliationOrders > 0 && (
            <Grid item xs={12} md={4}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <strong>{summary.returnReconciliationOrders}</strong> đơn cần
                đối soát hàng hoàn.
              </Alert>
            </Grid>
          )}

          {report?.escrowErrorCount > 0 && (
            <Grid item xs={12} md={4}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                Có <strong>{report.escrowErrorCount}</strong> đơn chưa lấy được
                chi tiết thanh toán từ Shopee.
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* COST SUMMARY */}

      <Card
        variant="outlined"
        sx={{ borderRadius: 3, mb: 3, boxShadow: "none" }}
      >
        <CardContent>
          <Typography fontWeight={800} sx={{ mb: 2 }}>
            Tổng hợp giá vốn và đối soát
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Giá vốn hàng xuất
              </Typography>
              <Typography fontWeight={700} sx={{ mt: 0.5 }}>
                {formatNumber(summary.totalExportedCostCny)} CNY
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Giá vốn hàng hoàn
              </Typography>
              <Typography fontWeight={700} sx={{ mt: 0.5 }}>
                {formatNumber(summary.totalReturnedCostCny)} CNY
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Giá vốn ròng
              </Typography>
              <Typography fontWeight={700} sx={{ mt: 0.5 }}>
                {formatNumber(
                  (summary.totalExportedCostCny || 0) -
                    (summary.totalReturnedCostCny || 0),
                )}{" "}
                CNY
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Giá vốn quy đổi
              </Typography>
              <Typography fontWeight={700} sx={{ mt: 0.5 }}>
                {formatMoney(summary.totalCostVnd)}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Typography variant="caption" color="text.secondary">
              Tỷ giá sử dụng: 1 CNY ={" "}
              <strong>{formatNumber(report?.exchangeRate)} VND</strong>
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Cập nhật: {formatDate(report?.syncedAt, true)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* REPORT TABLE */}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            alignItems: { lg: "center" },
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography fontWeight={800}>
              Chi tiết doanh thu theo đơn
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatNumber(filteredItems.length)} đơn hàng
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              placeholder="Tìm mã đơn, khách hàng..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              sx={{ minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={17} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              size="small"
              label="Quyết toán"
              value={incomeFilter}
              onChange={(event) => setIncomeFilter(event.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="released">Đã quyết toán</MenuItem>
              <MenuItem value="pending">Đang chờ</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Giá vốn"
              value={profitFilter}
              onChange={(event) => setProfitFilter(event.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="all">Tất cả trạng thái</MenuItem>
              <MenuItem value="calculated">Đã xác nhận</MenuItem>
              <MenuItem value="pending_estimate">Ước tính</MenuItem>
              <MenuItem value="missing_stock_cost">Thiếu giá vốn</MenuItem>
              <MenuItem value="needs_return_reconciliation">
                Cần đối soát hàng hoàn
              </MenuItem>
            </TextField>
          </Stack>
        </Box>

        <Divider />

        {loading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Đang tải dữ liệu đối soát...
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 800 }}>Đơn hàng</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Ngày đặt</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Quyết toán</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Tiền thực nhận
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Giá vốn
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Lợi nhuận
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Đối soát</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                      Chi tiết
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedItems.map((item) => {
                    const income = getIncomeStatus(item);
                    const profit = getProfitStatus(item.profitStatus);

                    return (
                      <TableRow key={item.orderSn} hover>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ whiteSpace: "nowrap" }}
                          >
                            {item.orderSn}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            {item.buyerUsername || "Khách hàng"}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatDate(item.orderDate)}
                        </TableCell>

                        <TableCell>
                          <StatusChip status={income} />
                        </TableCell>

                        <TableCell align="right">
                          <Typography fontWeight={700}>
                            {formatMoney(item.payoutAmount)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography fontWeight={600}>
                            {formatMoney(item.costVnd)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatNumber(item.netCostCny)} CNY
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          {item.profitVnd !== null &&
                          item.profitVnd !== undefined ? (
                            <Typography
                              fontWeight={800}
                              color={
                                item.profitVnd >= 0
                                  ? "success.main"
                                  : "error.main"
                              }
                            >
                              {formatMoney(item.profitVnd)}
                            </Typography>
                          ) : (
                            <Typography color="text.secondary">
                              Chưa xác định
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <StatusChip status={profit} />
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title="Xem chi tiết">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setSelectedOrder(item)}
                            >
                              <Eye size={18} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Box sx={{ py: 6, textAlign: "center" }}>
                          <Package size={36} color="#98a2b3" />
                          <Typography color="text.secondary" sx={{ mt: 1 }}>
                            Không có dữ liệu phù hợp.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredItems.length}
              page={page}
              onPageChange={(_, value) => setPage(value)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage="Số dòng:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} / ${count}`
              }
            />
          </>
        )}
      </Paper>

      {/* PENDING NOTE */}

      {report?.pendingNote && (
        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
          {report.pendingNote}
        </Alert>
      )}

      {/* ORDER DETAIL DIALOG */}

      <Dialog
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        fullWidth
        maxWidth="md"
      >
        {selectedOrder && (
          <>
            <DialogTitle>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Chi tiết đối soát đơn hàng
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedOrder.orderSn}
                  </Typography>
                </Box>

                <IconButton onClick={() => setSelectedOrder(null)}>
                  <X size={20} />
                </IconButton>
              </Stack>
            </DialogTitle>

            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Khách hàng
                  </Typography>
                  <Typography fontWeight={700}>
                    {selectedOrder.buyerUsername || "--"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Ngày đặt
                  </Typography>
                  <Typography fontWeight={700}>
                    {formatDate(selectedOrder.orderDate, true)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Trạng thái quyết toán
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusChip status={getIncomeStatus(selectedOrder)} />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Trạng thái giá vốn
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusChip
                      status={getProfitStatus(selectedOrder.profitStatus)}
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                Tổng tiền đơn hàng
              </Typography>

              <Stack spacing={1}>
                <DetailRow
                  label="Tổng giá trị đơn"
                  value={formatMoney(selectedOrder.totalOrderAmount)}
                />
                <DetailRow
                  label="Tiền Shopee thực nhận"
                  value={formatMoney(selectedOrder.payoutAmount)}
                  strong
                />
                <DetailRow
                  label="Thời điểm quyết toán"
                  value={formatDate(selectedOrder.actualPayoutTime, true)}
                />
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                Chi tiết phí Shopee
              </Typography>

              {Object.entries(selectedOrder.feeBreakdown || {}).length > 0 ? (
                <Stack spacing={1}>
                  {Object.entries(selectedOrder.feeBreakdown).map(
                    ([key, value]) => (
                      <DetailRow
                        key={key}
                        label={getFeeLabel(key)}
                        value={formatMoney(value)}
                      />
                    ),
                  )}
                </Stack>
              ) : (
                <Typography color="text.secondary" variant="body2">
                  Không có dữ liệu chi tiết phí.
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography fontWeight={800} sx={{ mb: 1.5 }}>
                Giá vốn theo lô FIFO
              </Typography>

              <Stack spacing={1}>
                <DetailRow
                  label="Số lượng hàng xuất"
                  value={`${formatNumber(selectedOrder.exportedQty)} sản phẩm`}
                />
                <DetailRow
                  label="Số lượng hàng hoàn"
                  value={`${formatNumber(selectedOrder.returnedQty)} sản phẩm`}
                />
                <DetailRow
                  label="Giá vốn hàng xuất"
                  value={`${formatNumber(selectedOrder.exportedCostCny)} CNY`}
                />
                <DetailRow
                  label="Giá vốn hàng hoàn"
                  value={`${formatNumber(selectedOrder.returnedCostCny)} CNY`}
                />
                <DetailRow
                  label="Giá vốn ròng"
                  value={`${formatNumber(selectedOrder.netCostCny)} CNY`}
                  strong
                />
                <DetailRow
                  label="Tỷ giá quy đổi"
                  value={`${formatNumber(selectedOrder.exchangeRate)} VND/CNY`}
                />
                <DetailRow
                  label="Giá vốn quy đổi"
                  value={formatMoney(selectedOrder.costVnd)}
                  strong
                />
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Lợi nhuận đối soát
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={800}
                  color={
                    selectedOrder.profitVnd == null
                      ? "text.primary"
                      : selectedOrder.profitVnd >= 0
                        ? "success.main"
                        : "error.main"
                  }
                  sx={{ mt: 0.5 }}
                >
                  {selectedOrder.profitVnd == null
                    ? "Chưa xác định"
                    : formatMoney(selectedOrder.profitVnd)}
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  Lợi nhuận = Tiền thực nhận − Giá vốn ròng quy đổi. Chưa bao
                  gồm các chi phí vận hành ngoài Shopee.
                </Typography>
              </Box>

              {selectedOrder.profitStatus === "missing_stock_cost" && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Đơn này chưa có đủ dữ liệu giá vốn từ lịch sử xuất kho.
                </Alert>
              )}

              {selectedOrder.profitStatus === "needs_return_reconciliation" && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Đơn có hàng hoàn. Cần kiểm tra việc nhập lại kho và đối soát
                  tiền hoàn trước khi xác nhận lợi nhuận.
                </Alert>
              )}

              {selectedOrder.profitStatus === "pending_estimate" && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Đây là lợi nhuận ước tính. Đơn chưa được Shopee quyết toán.
                </Alert>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setSelectedOrder(null)}>Đóng</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

// =====================================================
// DETAIL ROW
// =====================================================

function DetailRow({ label, value, strong = false }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
    >
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
        {label}
      </Typography>

      <Typography
        variant="body2"
        fontWeight={strong ? 800 : 600}
        textAlign="right"
      >
        {value ?? "--"}
      </Typography>
    </Stack>
  );
}
