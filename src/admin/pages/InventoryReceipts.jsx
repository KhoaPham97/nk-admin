import React, { useEffect, useState } from "react";

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
  CalendarToday,
  Clear,
  Close,
  Inventory2,
  PersonOutline,
  ReceiptLong,
  Search,
  Visibility,
} from "@mui/icons-material";

import axios from "axios";
import { useNavigate } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

const InventoryReceipts = () => {
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [receipts, setReceipts] = useState([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(20);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  // Chi tiết phiếu
  const [detailOpen, setDetailOpen] = useState(false);

  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [detailLoading, setDetailLoading] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // =====================================================
  // SNACKBAR
  // =====================================================

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
  // AUTH ERROR
  // =====================================================

  const handleAuthError = (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("accessToken");

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
  // FORMAT NUMBER
  // =====================================================

  const formatNumber = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString("vi-VN");
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
  // LOAD RECEIPTS
  // =====================================================

  const loadReceipts = async () => {
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

      /*
       * API dự kiến:
       *
       * GET /api/inventory
       *
       * hoặc endpoint được khai báo trong API_ENDPOINTS.
       */

      const response = await axios.get(API_ENDPOINTS.INVENTORY_RECEIPTS, {
        ...getAuthConfig(),
        params,
      });

      const data = response?.data || {};

      const receiptList = data.receipts || data.data || data.items || [];

      setReceipts(Array.isArray(receiptList) ? receiptList : []);

      setTotal(Number(data.total) || 0);

      setTotalPages(Math.max(Number(data.totalPages) || 1, 1));
    } catch (error) {
      console.error("LOAD INVENTORY RECEIPTS ERROR:", error);

      if (handleAuthError(error)) {
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể tải lịch sử nhập kho",
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
    loadReceipts();
  }, [page, limit]);

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = () => {
    setPage(1);

    /*
     * Nếu page đang là 1 thì useEffect không chạy,
     * nên load trực tiếp.
     */
    if (page === 1) {
      loadReceipts();
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);

    setTimeout(() => {
      loadReceipts();
    }, 0);
  };

  // =====================================================
  // VIEW DETAIL
  // =====================================================

  const handleViewDetail = async (receipt) => {
    if (!receipt?._id) {
      return;
    }

    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setSelectedReceipt(null);

      const response = await axios.get(
        `${API_ENDPOINTS.INVENTORY_RECEIPTS}/${receipt._id}`,
        getAuthConfig(),
      );

      const data = response?.data || {};

      const detail = data.receipt || data.data || data;

      setSelectedReceipt(detail);
    } catch (error) {
      console.error("LOAD INVENTORY RECEIPT DETAIL ERROR:", error);

      if (handleAuthError(error)) {
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể tải chi tiết phiếu nhập",
        "error",
      );

      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // =====================================================
  // CLOSE DETAIL
  // =====================================================

  const handleCloseDetail = () => {
    if (detailLoading) {
      return;
    }

    setDetailOpen(false);
    setSelectedReceipt(null);
  };

  // =====================================================
  // GET RECEIPT CODE
  // =====================================================

  const getReceiptCode = (receipt) => {
    return (
      receipt?.code ||
      receipt?.receiptCode ||
      receipt?.referenceCode ||
      receipt?._id ||
      "-"
    );
  };

  // =====================================================
  // GET RECEIPT ITEMS
  // =====================================================

  const getReceiptItems = (receipt) => {
    if (!receipt) {
      return [];
    }

    if (Array.isArray(receipt.items)) {
      return receipt.items;
    }

    if (Array.isArray(receipt.products)) {
      return receipt.products;
    }

    return [];
  };

  // =====================================================
  // GET ITEM QTY
  // =====================================================

  const getItemQty = (item) => {
    return Number(item?.qty ?? item?.quantity ?? 0);
  };

  // =====================================================
  // GET ITEM COST
  // =====================================================

  const getItemCost = (item) => {
    return Number(item?.unitCost ?? item?.costPrice ?? item?.price ?? 0);
  };

  // =====================================================
  // GET ITEM TOTAL
  // =====================================================

  const getItemTotal = (item) => {
    const explicitTotal = Number(item?.total ?? item?.amount ?? item?.subtotal);

    if (Number.isFinite(explicitTotal)) {
      return explicitTotal;
    }

    return getItemQty(item) * getItemCost(item);
  };

  // =====================================================
  // GET TOTAL QTY
  // =====================================================

  const getReceiptTotalQty = (receipt) => {
    const items = getReceiptItems(receipt);

    return items.reduce((totalQty, item) => totalQty + getItemQty(item), 0);
  };

  // =====================================================
  // GET TOTAL AMOUNT
  // =====================================================

  const getReceiptTotalAmount = (receipt) => {
    const explicitTotal = Number(
      receipt?.totalAmount ?? receipt?.total ?? receipt?.amount,
    );

    if (Number.isFinite(explicitTotal)) {
      return explicitTotal;
    }

    return getReceiptItems(receipt).reduce(
      (totalAmount, item) => totalAmount + getItemTotal(item),
      0,
    );
  };

  // =====================================================
  // GET PRODUCT NAME
  // =====================================================

  const getProductName = (item) => {
    return (
      item?.productTitle ||
      item?.title ||
      item?.name ||
      item?.product?.title ||
      "Sản phẩm"
    );
  };

  // =====================================================
  // GET PRODUCT CODE
  // =====================================================

  const getProductCode = (item) => {
    return (
      item?.productCode || item?.code || item?.sku || item?.product?.code || "-"
    );
  };

  // =====================================================
  // GET VARIANT
  // =====================================================

  const getVariantName = (item) => {
    return item?.variantName || item?.variant || "";
  };

  // =====================================================
  // GET SUPPLIER
  // =====================================================

  const getSupplierName = (receipt) => {
    return (
      receipt?.supplierName ||
      receipt?.supplier?.name ||
      receipt?.supplier ||
      "Không có nhà cung cấp"
    );
  };

  // =====================================================
  // GET CREATOR
  // =====================================================

  const getCreatorName = (receipt) => {
    return (
      receipt?.createdBy?.name ||
      receipt?.createdBy?.username ||
      receipt?.creatorName ||
      receipt?.userName ||
      "Admin"
    );
  };

  // =====================================================
  // PAGE CHANGE
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
            Lịch sử nhập kho
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            Theo dõi các phiếu nhập kho và sản phẩm đã nhập
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={18} /> : <Inventory2 />}
          disabled={loading}
          onClick={loadReceipts}
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </Button>
      </Stack>

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
        {/* TOTAL RECEIPTS */}

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <ReceiptLong />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng phiếu nhập
                  </Typography>

                  <Typography variant="h6" fontWeight={700}>
                    {formatNumber(total)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* CURRENT PAGE */}

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

        {/* SHOWING */}

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
                    {formatNumber(receipts.length)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* =================================================
          FILTER
      ================================================= */}

      <Card
        sx={{
          mb: 2,
        }}
      >
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* SEARCH */}

            <Grid item xs={12} md={7}>
              <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Tìm mã phiếu, sản phẩm, mã sản phẩm, nhà cung cấp..."
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

            {/* LIMIT */}

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <Select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));

                    setPage(1);
                  }}
                >
                  <MenuItem value={10}>10 phiếu</MenuItem>

                  <MenuItem value={20}>20 phiếu</MenuItem>

                  <MenuItem value={40}>40 phiếu</MenuItem>

                  <MenuItem value={100}>100 phiếu</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* SEARCH */}

            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleSearch}
                >
                  Tìm kiếm
                </Button>

                <Button variant="outlined" onClick={handleClearSearch}>
                  Xóa
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* =================================================
          TABLE
      ================================================= */}

      <Card>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 1150,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Mã phiếu</strong>
                </TableCell>

                <TableCell>
                  <strong>Nhà cung cấp</strong>
                </TableCell>

                <TableCell>
                  <strong>Sản phẩm</strong>
                </TableCell>

                <TableCell>
                  <strong>Số lượng</strong>
                </TableCell>

                <TableCell>
                  <strong>Tổng tiền</strong>
                </TableCell>

                <TableCell>
                  <strong>Người nhập</strong>
                </TableCell>

                <TableCell>
                  <strong>Ngày nhập</strong>
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
                    colSpan={8}
                    align="center"
                    sx={{
                      py: 7,
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
                      Đang tải lịch sử nhập kho...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : receipts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{
                      py: 7,
                    }}
                  >
                    <Inventory2
                      sx={{
                        fontSize: 48,
                        color: "text.disabled",
                      }}
                    />

                    <Typography
                      color="text.secondary"
                      sx={{
                        mt: 1,
                      }}
                    >
                      Chưa có phiếu nhập kho
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt) => {
                  const items = getReceiptItems(receipt);

                  const totalQty = getReceiptTotalQty(receipt);

                  const totalAmount = getReceiptTotalAmount(receipt);

                  return (
                    <TableRow key={receipt._id} hover>
                      {/* CODE */}

                      <TableCell>
                        <Stack spacing={0.4}>
                          <Typography fontWeight={700} color="primary.main">
                            {getReceiptCode(receipt)}
                          </Typography>

                          <Chip
                            size="small"
                            color="success"
                            label="Đã nhập"
                            sx={{
                              width: "fit-content",
                              height: 22,
                              fontSize: 11,
                            }}
                          />
                        </Stack>
                      </TableCell>

                      {/* SUPPLIER */}

                      <TableCell>
                        <Typography fontWeight={600}>
                          {getSupplierName(receipt)}
                        </Typography>
                      </TableCell>

                      {/* PRODUCTS */}

                      <TableCell>
                        <Typography fontWeight={600}>
                          {formatNumber(items.length)} sản phẩm
                        </Typography>

                        {items.slice(0, 3).map((item, index) => (
                          <Typography
                            key={index}
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {getProductName(item)}

                            {getVariantName(item)
                              ? ` - ${getVariantName(item)}`
                              : ""}
                          </Typography>
                        ))}

                        {items.length > 3 && (
                          <Typography variant="caption" color="primary">
                            + {items.length - 3} sản phẩm khác
                          </Typography>
                        )}
                      </TableCell>

                      {/* QTY */}

                      <TableCell>
                        <Typography fontWeight={700}>
                          {formatNumber(totalQty)}
                        </Typography>
                      </TableCell>

                      {/* TOTAL */}

                      <TableCell>
                        <Typography fontWeight={700} color="success.main">
                          {formatMoney(totalAmount)}
                        </Typography>
                      </TableCell>

                      {/* CREATOR */}

                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={0.8}
                          alignItems="center"
                        >
                          <PersonOutline fontSize="small" color="action" />

                          <Typography>{getCreatorName(receipt)}</Typography>
                        </Stack>
                      </TableCell>

                      {/* DATE */}

                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(
                            receipt.created_at ||
                              receipt.createdAt ||
                              receipt.importDate,
                          )}
                        </Typography>
                      </TableCell>

                      {/* ACTION */}

                      <TableCell align="right">
                        <Tooltip title="Xem chi tiết phiếu nhập">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewDetail(receipt)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
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
            Tổng cộng: <strong>{formatNumber(total)}</strong> phiếu nhập
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
          DETAIL DIALOG
      ================================================= */}

      <Dialog
        open={detailOpen}
        onClose={handleCloseDetail}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Chi tiết phiếu nhập
              </Typography>

              {selectedReceipt && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.3,
                  }}
                >
                  {getReceiptCode(selectedReceipt)}
                </Typography>
              )}
            </Box>

            <IconButton onClick={handleCloseDetail} disabled={detailLoading}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {detailLoading ? (
            <Box
              sx={{
                py: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
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
                Đang tải chi tiết...
              </Typography>
            </Box>
          ) : !selectedReceipt ? (
            <Typography color="text.secondary">Không có dữ liệu.</Typography>
          ) : (
            <Stack spacing={2}>
              {/* RECEIPT INFO */}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Mã phiếu
                    </Typography>

                    <Typography fontWeight={700}>
                      {getReceiptCode(selectedReceipt)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Nhà cung cấp
                    </Typography>

                    <Typography fontWeight={600}>
                      {getSupplierName(selectedReceipt)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Người nhập
                    </Typography>

                    <Typography fontWeight={600}>
                      {getCreatorName(selectedReceipt)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Ngày nhập
                    </Typography>

                    <Typography fontWeight={600}>
                      {formatDate(
                        selectedReceipt.created_at ||
                          selectedReceipt.createdAt ||
                          selectedReceipt.importDate,
                      )}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* NOTE */}

              {selectedReceipt.note && (
                <Alert severity="info" variant="outlined">
                  {selectedReceipt.note}
                </Alert>
              )}

              {/* ITEMS */}

              <Card variant="outlined">
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Sản phẩm</strong>
                        </TableCell>

                        <TableCell>
                          <strong>Mã SP</strong>
                        </TableCell>

                        <TableCell>
                          <strong>Phân loại</strong>
                        </TableCell>

                        <TableCell align="right">
                          <strong>SL</strong>
                        </TableCell>

                        <TableCell align="right">
                          <strong>Giá nhập</strong>
                        </TableCell>

                        <TableCell align="right">
                          <strong>Thành tiền</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {getReceiptItems(selectedReceipt).map((item, index) => (
                        <TableRow key={item?._id || index}>
                          <TableCell>
                            <Typography fontWeight={600}>
                              {getProductName(item)}
                            </Typography>
                          </TableCell>

                          <TableCell>{getProductCode(item)}</TableCell>

                          <TableCell>
                            {getVariantName(item) ? (
                              <Chip size="small" label={getVariantName(item)} />
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell align="right">
                            <Typography fontWeight={600}>
                              {formatNumber(getItemQty(item))}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            {formatMoney(getItemCost(item))}
                          </TableCell>

                          <TableCell align="right">
                            <Typography fontWeight={700}>
                              {formatMoney(getItemTotal(item))}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* TOTAL */}

                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography fontWeight={700}>Tổng cộng</Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography fontWeight={700}>
                            {formatNumber(getReceiptTotalQty(selectedReceipt))}
                          </Typography>
                        </TableCell>

                        <TableCell />

                        <TableCell align="right">
                          <Typography fontWeight={700} color="success.main">
                            {formatMoney(
                              getReceiptTotalAmount(selectedReceipt),
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDetail} disabled={detailLoading}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

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

export default InventoryReceipts;
