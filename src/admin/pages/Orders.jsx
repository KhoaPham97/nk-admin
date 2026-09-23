import React, { useEffect, useState } from "react";
import {
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
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
} from "@mui/icons-material";

import axios from "axios";
import { useNavigate } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
};

const formatDate = (value) => {
  if (!value) return "-";

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

const Orders = () => {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const [limit] = useState(20);

  const [totalPages, setTotalPages] = useState(1);

  const [total, setTotal] = useState(0);

  // =========================================================
  // LOAD ORDERS
  // =========================================================

  const loadOrders = async () => {
    try {
      setLoading(true);

      const response = await axios.get(API_ENDPOINTS.ORDER, {
        params: {
          page,
          limit,
          search: search.trim(),
          status,
        },
      });

      const data = response?.data || {};

      setOrders(Array.isArray(data.orders) ? data.orders : []);

      setTotal(Number(data.total) || 0);

      setTotalPages(Math.max(Number(data.totalPages) || 1, 1));
    } catch (error) {
      console.error("Load orders:", error);

      alert(
        error?.response?.data?.message || "Không thể tải danh sách đơn hàng",
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD WHEN PAGE / STATUS CHANGES
  // =========================================================

  useEffect(() => {
    loadOrders();
  }, [page, status]);

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = () => {
    setPage(1);

    if (page === 1) {
      loadOrders();
    }
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);

    if (page === 1) {
      setTimeout(() => {
        loadOrders();
      }, 0);
    }
  };

  // =========================================================
  // STATUS
  // =========================================================

  const getStatusConfig = (value) => {
    return (
      STATUS_CONFIG[value] || {
        label: value || "Không xác định",
        color: "default",
      }
    );
  };

  // =========================================================
  // CHANGE STATUS
  // =========================================================

  const handleChangeStatus = async (order, newStatus) => {
    if (!order?._id) return;

    if (order.status === newStatus) return;

    try {
      await axios.patch(`${API_ENDPOINTS.ORDER}/${order._id}/status`, {
        status: newStatus,
      });

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
    } catch (error) {
      console.error("Update order status:", error);

      alert(
        error?.response?.data?.message ||
          "Không thể cập nhật trạng thái đơn hàng",
      );
    }
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  const handlePageChange = (_, value) => {
    setPage(value);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1600px",
        mx: "auto",
        px: {
          xs: 1,
          sm: 2,
          md: 3,
        },
        pb: 4,
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

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
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Đơn hàng
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Quản lý và theo dõi các đơn hàng
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate("/admin/orders/create")}
          sx={{
            height: 44,
            borderRadius: 2,
            fontWeight: 700,
          }}
        >
          Tạo đơn hàng
        </Button>
      </Stack>

      {/* =====================================================
          FILTER
      ===================================================== */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent>
          <Grid container spacing={1.5} alignItems="center">
            {/* SEARCH */}

            <Grid item xs={12} md={7}>
              <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Tìm mã đơn, tên khách hàng, số điện thoại..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),

                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleClearSearch}>
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Grid>

            {/* STATUS */}

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={status}
                  displayEmpty
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">Tất cả trạng thái</MenuItem>

                  <MenuItem value="pending">Chờ xác nhận</MenuItem>

                  <MenuItem value="confirmed">Đã xác nhận</MenuItem>

                  <MenuItem value="shipping">Đang giao</MenuItem>

                  <MenuItem value="completed">Hoàn thành</MenuItem>

                  <MenuItem value="cancelled">Đã hủy</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* SEARCH BUTTON */}

            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Search />}
                onClick={handleSearch}
                sx={{
                  height: 40,
                  fontWeight: 600,
                }}
              >
                Tìm kiếm
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
        <ReceiptLong fontSize="small" />

        <Typography fontWeight={700}>Danh sách đơn hàng</Typography>

        <Chip size="small" label={`${total} đơn`} />
      </Stack>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <TableContainer
          sx={{
            overflowX: "auto",
          }}
        >
          <Table
            sx={{
              minWidth: 1000,
            }}
          >
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: "action.hover",
                }}
              >
                <TableCell>
                  <Typography fontWeight={700}>Mã đơn</Typography>
                </TableCell>

                <TableCell>
                  <Typography fontWeight={700}>Khách hàng</Typography>
                </TableCell>

                <TableCell>
                  <Typography fontWeight={700}>Sản phẩm</Typography>
                </TableCell>

                <TableCell align="right">
                  <Typography fontWeight={700}>Tổng tiền</Typography>
                </TableCell>

                <TableCell align="right">
                  <Typography fontWeight={700}>Đã trả</Typography>
                </TableCell>

                <TableCell align="right">
                  <Typography fontWeight={700}>Còn nợ</Typography>
                </TableCell>

                <TableCell>
                  <Typography fontWeight={700}>Trạng thái</Typography>
                </TableCell>

                <TableCell>
                  <Typography fontWeight={700}>Ngày tạo</Typography>
                </TableCell>

                <TableCell />
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Stack spacing={1} alignItems="center" sx={{ py: 7 }}>
                      <CircularProgress />

                      <Typography variant="body2" color="text.secondary">
                        Đang tải đơn hàng...
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Box sx={{ py: 7 }}>
                      <ReceiptLong
                        sx={{
                          fontSize: 50,
                          opacity: 0.3,
                          mb: 1,
                        }}
                      />

                      <Typography color="text.secondary">
                        Không tìm thấy đơn hàng
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const statusConfig = getStatusConfig(order.status);

                  return (
                    <TableRow
                      key={order._id}
                      hover
                      sx={{
                        cursor: "pointer",
                      }}
                      onClick={() => navigate(`/admin/invoices/${order._id}`)}
                    >
                      {/* CODE */}

                      <TableCell>
                        <Typography
                          fontWeight={700}
                          sx={{
                            whiteSpace: "nowrap",
                          }}
                        >
                          {order.code || "-"}
                        </Typography>
                      </TableCell>

                      {/* CUSTOMER */}

                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonOutline fontSize="small" color="action" />

                          <Box>
                            <Typography fontWeight={600}>
                              {order.customerName || "Khách lẻ"}
                            </Typography>

                            {order.customerPhone && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {order.customerPhone}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* ITEMS */}

                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={600}>
                            {Array.isArray(order.items)
                              ? order.items.length
                              : 0}{" "}
                            sản phẩm
                          </Typography>

                          {order.items?.[0] && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                maxWidth: 240,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "block",
                              }}
                            >
                              {order.items[0].productTitle}

                              {order.items.length > 1 &&
                                ` +${order.items.length - 1}`}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      {/* TOTAL */}

                      <TableCell align="right">
                        <Typography
                          fontWeight={700}
                          sx={{
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(order.totalAmount)}
                        </Typography>
                      </TableCell>

                      {/* PAID */}

                      <TableCell align="right">
                        <Typography
                          sx={{
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(order.paidAmount)}
                        </Typography>
                      </TableCell>

                      {/* DEBT */}

                      <TableCell align="right">
                        <Typography
                          fontWeight={Number(order.debt) > 0 ? 700 : 400}
                          sx={{
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(order.debt)}
                        </Typography>
                      </TableCell>

                      {/* STATUS */}

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          size="small"
                          value={order.status || "pending"}
                          onChange={(e) =>
                            handleChangeStatus(order, e.target.value)
                          }
                          sx={{
                            minWidth: 140,
                            "& .MuiSelect-select": {
                              py: 0.7,
                            },
                          }}
                        >
                          <MenuItem value="pending">Chờ xác nhận</MenuItem>

                          <MenuItem value="confirmed">Đã xác nhận</MenuItem>

                          <MenuItem value="shipping">Đang giao</MenuItem>

                          <MenuItem value="completed">Hoàn thành</MenuItem>

                          <MenuItem value="cancelled">Đã hủy</MenuItem>
                        </Select>
                      </TableCell>

                      {/* DATE */}

                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={0.7}
                          alignItems="center"
                        >
                          <CalendarToday
                            sx={{
                              fontSize: 15,
                              color: "text.secondary",
                            }}
                          />

                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDate(order.created_at)}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* VIEW */}

                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();

                            navigate(`/admin/invoices/${order._id}`);
                          }}
                        >
                          <ArrowForwardIos
                            sx={{
                              fontSize: 16,
                            }}
                          />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ===================================================
            PAGINATION
        =================================================== */}

        {!loading && orders.length > 0 && (
          <>
            <Divider />

            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Trang {page} / {totalPages}
              </Typography>

              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
              />
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
};

export default Orders;
