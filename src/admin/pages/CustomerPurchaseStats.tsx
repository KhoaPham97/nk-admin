import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  AccountCircleOutlined,
  CalendarMonthOutlined,
  Close,
  Inventory2Outlined,
  PaidOutlined,
  PersonSearchOutlined,
  ReceiptLongOutlined,
  RefreshOutlined,
  SearchOutlined,
  ShoppingBagOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { BASE_URL } from "../../api";

const API_URL = BASE_URL + "/order/customer-purchase-stats";

interface CustomerStats {
  customerName: string;
  customerPhone?: string;
  orderCount: number;
  totalQty: number;
  totalSpent: number;
  totalPaid: number;
  totalDebt: number;
  lastOrderAt?: string;
}

interface ProductStats {
  customerName: string;
  productId?: string;
  productTitle: string;
  productCode?: string;
  variantName?: string;
  thumbnail?: string;
  totalQty: number;
  totalAmount: number;
  orderCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const money = (value: unknown) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const numberFormat = (value: unknown) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const formatDate = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("vi-VN");
};

const getInitials = (name?: string) => {
  if (!name) return "K";

  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const CustomerPurchaseStats: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerStats[]>([]);
  const [products, setProducts] = useState<ProductStats[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerStats | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (fromDate) {
        params.fromDate = fromDate;
      }

      if (toDate) {
        params.toDate = toDate;
      }

      const response = await axios.get(API_URL, { params });

      // Bóc tách response từ BE.
      const payload = response.data?.data ?? response.data;

      // Lấy danh sách khách hàng.
      const customerRows = Array.isArray(payload)
        ? payload
        : (payload?.customers ??
          payload?.rows ??
          payload?.results ??
          payload?.customerStats ??
          []);

      const customersData = Array.isArray(customerRows) ? customerRows : [];

      // Ưu tiên danh sách sản phẩm ở cấp response.
      let productRows =
        payload?.productDetails ??
        payload?.products ??
        payload?.productStats ??
        payload?.productRows ??
        payload?.purchaseProducts;

      // Nếu BE trả sản phẩm bên trong từng khách hàng,
      // lấy sản phẩm từ từng customer, không lấy theo index.
      if (!Array.isArray(productRows)) {
        productRows = [];
      }

      if (productRows.length === 0) {
        productRows = customersData.flatMap((customer: any) => {
          const customerProducts =
            customer?.productDetails ??
            customer?.products ??
            customer?.productStats ??
            customer?.purchaseProducts ??
            [];

          if (!Array.isArray(customerProducts)) {
            return [];
          }

          return customerProducts.map((product: any) => ({
            ...product,
            customerId:
              product?.customerId ??
              customer?.customerId ??
              customer?._id ??
              customer?.id,
            customerName:
              product?.customerName ??
              customer?.customerName ??
              customer?.name ??
              customer?.fullName ??
              "",
          }));
        });
      }

      setCustomers(customersData);
      setProducts(productRows);

      // Phân trang.
      const paginationData = payload?.pagination ?? {};

      setPagination({
        page: Number(paginationData.page ?? page + 1),
        limit: Number(paginationData.limit ?? limit),
        total: Number(
          paginationData.total ??
            paginationData.totalCustomers ??
            paginationData.totalItems ??
            customersData.length,
        ),
        totalPages: Number(
          paginationData.totalPages ??
            Math.ceil(
              Number(
                paginationData.total ??
                  paginationData.totalCustomers ??
                  paginationData.totalItems ??
                  customersData.length,
              ) / Math.max(Number(paginationData.limit ?? limit), 1),
            ),
        ),
      });
    } catch (err: any) {
      console.error("Load customer purchase stats error:", err);

      setError(
        err?.response?.data?.message ||
          "Không thể tải thống kê khách hàng. Vui lòng kiểm tra API BE.",
      );

      setCustomers([]);
      setProducts([]);

      setPagination((prev: any) => ({
        ...prev,
        total: 0,
        totalPages: 0,
      }));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, fromDate, toDate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const totals = useMemo(
    () =>
      customers.reduce(
        (result, customer) => ({
          orders: result.orders + Number(customer.orderCount || 0),
          quantity: result.quantity + Number(customer.totalQty || 0),
          spent: result.spent + Number(customer.totalSpent || 0),
          debt: result.debt + Number(customer.totalDebt || 0),
        }),
        { orders: 0, quantity: 0, spent: 0, debt: 0 },
      ),
    [customers],
  );

  const selectedProducts = useMemo(() => {
    if (!selectedCustomer) return [];

    return products.filter(
      (product) =>
        String(product.customerName || "")
          .trim()
          .toLowerCase() === selectedCustomer.customerName.trim().toLowerCase(),
    );
  }, [products, selectedCustomer]);

  const handleSearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const handleReset = () => {
    setSearchInput("");
    setSearch("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color="#172033">
            Thống kê mua hàng khách hàng
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Theo dõi lịch sử mua hàng, doanh số và công nợ khách hàng
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshOutlined />}
          onClick={loadStats}
          disabled={loading}
          sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}
        >
          Làm mới
        </Button>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Khách hàng"
            value={numberFormat(pagination.total)}
            icon={<AccountCircleOutlined />}
            color="#2563eb"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Tổng đơn trên trang"
            value={numberFormat(totals.orders)}
            icon={<ReceiptLongOutlined />}
            color="#7c3aed"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Doanh số trên trang"
            value={money(totals.spent)}
            icon={<PaidOutlined />}
            color="#059669"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard
            title="Công nợ trên trang"
            value={money(totals.debt)}
            icon={<ShoppingBagOutlined />}
            color="#ea580c"
          />
        </Grid>
      </Grid>

      <Card
        elevation={0}
        sx={{
          mb: 2.5,
          border: "1px solid #e8eaf0",
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", lg: "center" }}
          >
            <TextField
              fullWidth
              size="small"
              label="Tìm khách hàng"
              placeholder="Nhập tên hoặc số điện thoại"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              size="small"
              type="date"
              label="Từ ngày"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(0);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { lg: 165 } }}
            />

            <TextField
              size="small"
              type="date"
              label="Đến ngày"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(0);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { lg: 165 } }}
            />

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<PersonSearchOutlined />}
                onClick={handleSearch}
                disabled={loading}
              >
                Tìm
              </Button>

              <Button variant="outlined" onClick={handleReset}>
                Xóa lọc
              </Button>
            </Stack>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 1.5, color: "text.secondary" }}
          >
            <CalendarMonthOutlined sx={{ fontSize: 17 }} />
            <Typography variant="caption">
              Không tính đơn hàng đã hủy
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          border: "1px solid #e8eaf0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: "1px solid #e8eaf0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box>
            <Typography fontWeight={750}>Danh sách khách hàng</Typography>
            <Typography variant="caption" color="text.secondary">
              {numberFormat(pagination.total)} khách hàng
            </Typography>
          </Box>

          <Chip
            size="small"
            label={`${numberFormat(totals.quantity)} sản phẩm trên trang`}
            icon={<Inventory2Outlined />}
            variant="outlined"
          />
        </Box>

        {loading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Đang tải dữ liệu...
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 1050 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell width={55}>STT</TableCell>
                    <TableCell>Khách hàng</TableCell>
                    <TableCell align="center">Số đơn</TableCell>
                    <TableCell align="center">SL đã mua</TableCell>
                    <TableCell align="right">Tổng tiền hàng</TableCell>
                    <TableCell align="right">Đã thanh toán</TableCell>
                    <TableCell align="right">Còn nợ</TableCell>
                    <TableCell>Gần nhất</TableCell>
                    <TableCell align="center">Chi tiết</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 7 }}>
                        <ShoppingBagOutlined
                          sx={{ fontSize: 42, color: "#aeb7c5", mb: 1 }}
                        />
                        <Typography color="text.secondary">
                          Chưa có dữ liệu khách hàng
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer, index) => (
                      <TableRow
                        key={`${customer.customerName}-${index}`}
                        hover
                        sx={{
                          "&:last-child td": { borderBottom: 0 },
                        }}
                      >
                        <TableCell>{page * limit + index + 1}</TableCell>

                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                          >
                            <Avatar
                              sx={{
                                width: 38,
                                height: 38,
                                bgcolor: "#e8efff",
                                color: "#2855bd",
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              {getInitials(customer.customerName)}
                            </Avatar>

                            <Box>
                              <Typography fontWeight={700} variant="body2">
                                {customer.customerName || "Khách lẻ"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {customer.customerPhone ||
                                  "Chưa có số điện thoại"}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={numberFormat(customer.orderCount)}
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>

                        <TableCell align="center">
                          {numberFormat(customer.totalQty)}
                        </TableCell>

                        <TableCell align="right">
                          <Typography fontWeight={700} color="#172033">
                            {money(customer.totalSpent)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography color="success.main">
                            {money(customer.totalPaid)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            fontWeight={700}
                            color={
                              Number(customer.totalDebt) > 0
                                ? "error.main"
                                : "text.secondary"
                            }
                          >
                            {money(customer.totalDebt)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {formatDate(customer.lastOrderAt)}
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title="Xem sản phẩm đã mua">
                            <IconButton
                              color="primary"
                              onClick={() => setSelectedCustomer(customer)}
                              size="small"
                            >
                              <VisibilityOutlined />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />

            <TablePagination
              component="div"
              count={pagination.total}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={limit}
              onRowsPerPageChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage="Số dòng:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} / ${count !== -1 ? count : `hơn ${to}`}`
              }
            />
          </>
        )}
      </Card>

      <Dialog
        open={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ pr: 7 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: "#e8efff", color: "#2855bd" }}>
              {getInitials(selectedCustomer?.customerName)}
            </Avatar>

            <Box>
              <Typography fontWeight={800} variant="h6">
                {selectedCustomer?.customerName || "Khách lẻ"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCustomer?.customerPhone || "Chưa có số điện thoại"}
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={() => setSelectedCustomer(null)}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedCustomer && (
            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
              <Grid item xs={6} md={3}>
                <MiniStat
                  label="Số đơn"
                  value={numberFormat(selectedCustomer.orderCount)}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <MiniStat
                  label="Số lượng mua"
                  value={numberFormat(selectedCustomer.totalQty)}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <MiniStat
                  label="Tổng mua"
                  value={money(selectedCustomer.totalSpent)}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <MiniStat
                  label="Còn nợ"
                  value={money(selectedCustomer.totalDebt)}
                />
              </Grid>
            </Grid>
          )}

          <Typography fontWeight={750} sx={{ mb: 1.5 }}>
            Sản phẩm khách hàng đã mua
          </Typography>

          {selectedProducts.length === 0 ? (
            <Alert severity="info">
              API chưa trả về danh sách sản phẩm của khách hàng này. Cần kiểm
              tra trường productDetails/products trong response của API thống
              kê.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell>Mã SP</TableCell>
                    <TableCell>Phân loại</TableCell>
                    <TableCell align="center">Số lượng</TableCell>
                    <TableCell align="center">Số đơn</TableCell>
                    <TableCell align="right">Thành tiền</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {selectedProducts.map((product, index) => (
                    <TableRow
                      key={`${product.productId || product.productCode}-${product.variantName}-${index}`}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={650}>
                          {product.productTitle || "Sản phẩm"}
                        </Typography>
                      </TableCell>
                      <TableCell>{product.productCode || "—"}</TableCell>
                      <TableCell>{product.variantName || "Mặc định"}</TableCell>
                      <TableCell align="center">
                        {numberFormat(product.totalQty)}
                      </TableCell>
                      <TableCell align="center">
                        {numberFormat(product.orderCount)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700}>
                          {money(product.totalAmount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon,
  color,
}) => (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      borderRadius: 3,
      border: "1px solid #e8eaf0",
    }}
  >
    <CardContent sx={{ p: 2.25 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2.5,
            bgcolor: `${color}14`,
            color,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{
              mt: 0.4,
              overflowWrap: "anywhere",
              color: "#172033",
            }}
          >
            {value}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const MiniStat: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Box
    sx={{
      p: 1.5,
      borderRadius: 2,
      bgcolor: "#f8fafc",
      border: "1px solid #e8eaf0",
      height: "100%",
    }}
  >
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography
      variant="subtitle1"
      fontWeight={800}
      sx={{ mt: 0.5, overflowWrap: "anywhere" }}
    >
      {value}
    </Typography>
  </Box>
);

export default CustomerPurchaseStats;
