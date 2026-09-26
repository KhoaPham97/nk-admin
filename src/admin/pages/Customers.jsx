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
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PeopleIcon from "@mui/icons-material/People";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SaveIcon from "@mui/icons-material/Save";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PaymentsIcon from "@mui/icons-material/Payments";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CloseIcon from "@mui/icons-material/Close";

import axios from "axios";
import { useNavigate } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

const API_URL = API_ENDPOINTS.CUSTOMERS || "";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  note: "",
};

const Customers = () => {
  const navigate = useNavigate();

  // =====================================================
  // CUSTOMER
  // =====================================================

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // CREATE / EDIT
  // =====================================================

  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // =====================================================
  // DEBT
  // =====================================================

  const [openDebtDialog, setOpenDebtDialog] = useState(false);
  const [selectedDebtCustomer, setSelectedDebtCustomer] = useState(null);
  const [debt, setDebt] = useState("");
  const [savingDebt, setSavingDebt] = useState(false);

  // =====================================================
  // ORDER HISTORY
  // =====================================================

  const [openOrdersDialog, setOpenOrdersDialog] = useState(false);
  const [selectedOrderCustomer, setSelectedOrderCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // =====================================================
  // SNACKBAR
  // =====================================================

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // =====================================================
  // AUTH
  // =====================================================

  const getToken = () => {
    return (
      localStorage.getItem("adminToken") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  };

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
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // =====================================================
  // STATUS
  // =====================================================

  const getStatusLabel = (status) => {
    const map = {
      pending: "Chờ xử lý",
      confirmed: "Đã xác nhận",
      shipping: "Đang giao",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
      canceled: "Đã hủy",
    };

    return map[status] || status || "Không xác định";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "warning";

      case "confirmed":
        return "info";

      case "shipping":
        return "primary";

      case "completed":
        return "success";

      case "cancelled":
      case "canceled":
        return "error";

      default:
        return "default";
    }
  };

  // =====================================================
  // LOAD CUSTOMERS
  // =====================================================

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.get(API_URL, {
        params: {
          search,
          page: page + 1,
          limit: rowsPerPage,
        },
        ...getAuthConfig(),
      });

      setCustomers(response.data?.customers || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error("Load customers:", error);

      if (error?.response?.status === 401) {
        navigate("/admin/login");
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể tải danh sách khách hàng",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage, navigate]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const statistics = useMemo(() => {
    return customers.reduce(
      (result, customer) => {
        result.totalOrders += Number(customer.totalOrders || 0);

        result.totalSpent += Number(
          customer.totalSpent ?? customer.totalPurchased ?? 0,
        );

        result.totalDebt += Number(customer.debt || 0);

        return result;
      },
      {
        totalOrders: 0,
        totalSpent: 0,
        totalDebt: 0,
      },
    );
  }, [customers]);

  // =====================================================
  // CREATE
  // =====================================================

  const handleOpenCreate = () => {
    setEditingCustomer(null);

    setForm({
      ...emptyForm,
    });

    setOpenDialog(true);
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);

    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      note: customer.note || "",
    });

    setOpenDialog(true);
  };

  // =====================================================
  // CLOSE CREATE / EDIT
  // =====================================================

  const handleClose = () => {
    if (savingCustomer) return;

    setOpenDialog(false);
    setEditingCustomer(null);

    setForm({
      ...emptyForm,
    });
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  // =====================================================
  // SAVE CUSTOMER
  // =====================================================

  const handleSave = async () => {
    try {
      if (!form.name.trim()) {
        showSnackbar("Vui lòng nhập tên khách hàng", "error");
        return;
      }

      setSavingCustomer(true);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      if (editingCustomer) {
        await axios.put(
          `${API_URL}/${editingCustomer._id}`,
          form,
          getAuthConfig(),
        );

        showSnackbar("Cập nhật khách hàng thành công", "success");
      } else {
        await axios.post(API_URL, form, getAuthConfig());

        showSnackbar("Thêm khách hàng thành công", "success");
      }

      handleClose();

      await loadCustomers();
    } catch (error) {
      console.error("Save customer:", error);

      if (error?.response?.status === 401) {
        navigate("/admin/login");
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể lưu khách hàng",
        "error",
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (customer) => {
    const ok = window.confirm(`Bạn có chắc muốn xóa "${customer.name}"?`);

    if (!ok) return;

    try {
      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      await axios.delete(`${API_URL}/${customer._id}`, getAuthConfig());

      showSnackbar("Xóa khách hàng thành công", "success");

      await loadCustomers();
    } catch (error) {
      console.error("Delete customer:", error);

      if (error?.response?.status === 401) {
        navigate("/admin/login");
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể xóa khách hàng",
        "error",
      );
    }
  };

  // =====================================================
  // OPEN DEBT
  // =====================================================

  const handleOpenDebt = (customer) => {
    setSelectedDebtCustomer(customer);

    setDebt(Number(customer?.debt || 0));

    setOpenDebtDialog(true);
  };

  // =====================================================
  // CLOSE DEBT
  // =====================================================

  const handleCloseDebt = () => {
    if (savingDebt) return;

    setOpenDebtDialog(false);
    setSelectedDebtCustomer(null);
    setDebt("");
  };

  // =====================================================
  // UPDATE DEBT
  // =====================================================

  const handleUpdateDebt = async () => {
    if (!selectedDebtCustomer?._id) {
      return;
    }

    const value = Number(debt);

    if (!Number.isFinite(value) || value < 0) {
      showSnackbar("Công nợ không hợp lệ", "error");
      return;
    }

    const ok = window.confirm(
      `Cập nhật công nợ của "${selectedDebtCustomer.name}" thành ${formatMoney(
        value,
      )}?`,
    );

    if (!ok) return;

    try {
      setSavingDebt(true);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.patch(
        `${API_URL}/${selectedDebtCustomer._id}/debt`,
        {
          debt: value,
        },
        getAuthConfig(),
      );

      showSnackbar(
        response?.data?.message || "Cập nhật công nợ thành công",
        "success",
      );

      handleCloseDebt();

      await loadCustomers();
    } catch (error) {
      console.error("Update customer debt:", error);

      if (error?.response?.status === 401) {
        navigate("/admin/login");
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể cập nhật công nợ",
        "error",
      );
    } finally {
      setSavingDebt(false);
    }
  };

  // =====================================================
  // LOAD CUSTOMER ORDERS
  // =====================================================

  const handleOpenOrders = async (customer) => {
    if (!customer?._id) {
      return;
    }

    try {
      setSelectedOrderCustomer(customer);
      setCustomerOrders([]);
      setOpenOrdersDialog(true);
      setLoadingOrders(true);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.get(
        `${API_URL}/${customer._id}/orders`,
        getAuthConfig(),
      );

      const data = response?.data || {};

      console.log("CUSTOMER ORDERS:", data);

      setCustomerOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      console.error("Load customer orders:", error);

      if (error?.response?.status === 401) {
        navigate("/admin/login");
        return;
      }

      showSnackbar(
        error?.response?.data?.message || "Không thể tải lịch sử mua hàng",
        "error",
      );
    } finally {
      setLoadingOrders(false);
    }
  };

  // =====================================================
  // CLOSE ORDERS
  // =====================================================

  const handleCloseOrders = () => {
    if (loadingOrders) return;

    setOpenOrdersDialog(false);
    setSelectedOrderCustomer(null);
    setCustomerOrders([]);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box
      sx={{
        p: {
          xs: 1,
          sm: 2,
          md: 3,
        },
        backgroundColor: "#f5f6f8",
        minHeight: "100%",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          mb: 3,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "primary.main",
                color: "white",
              }}
            >
              <PeopleIcon />
            </Box>

            <Box>
              <Typography variant="h5" fontWeight={800}>
                Khách hàng
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Quản lý khách hàng và lịch sử mua hàng
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{
            borderRadius: 2,
            px: 2.5,
            fontWeight: 700,
          }}
        >
          Thêm khách hàng
        </Button>
      </Box>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {/* CUSTOMERS */}

        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
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
                  Khách hàng
                </Typography>

                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                  {total.toLocaleString("vi-VN")}
                </Typography>
              </Box>

              <PeopleIcon
                sx={{
                  fontSize: 36,
                  color: "primary.main",
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* ORDERS */}

        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
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
                  Tổng đơn hàng
                </Typography>

                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                  {statistics.totalOrders.toLocaleString("vi-VN")}
                </Typography>
              </Box>

              <ShoppingCartIcon
                sx={{
                  fontSize: 36,
                  color: "info.main",
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* PURCHASE */}

        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
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
                  Tổng đã mua
                </Typography>

                <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
                  {formatMoney(statistics.totalSpent)}
                </Typography>
              </Box>

              <TrendingUpIcon
                sx={{
                  fontSize: 36,
                  color: "success.main",
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* DEBT */}

        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
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
                  Tổng công nợ
                </Typography>

                <Typography
                  variant="h6"
                  fontWeight={800}
                  color={
                    statistics.totalDebt > 0 ? "error.main" : "success.main"
                  }
                  sx={{ mt: 0.5 }}
                >
                  {formatMoney(statistics.totalDebt)}
                </Typography>
              </Box>

              <AccountBalanceWalletIcon
                sx={{
                  fontSize: 36,
                  color:
                    statistics.totalDebt > 0 ? "error.main" : "success.main",
                }}
              />
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* =================================================
          SEARCH
      ================================================= */}

      <Card
        sx={{
          mb: 2,
          borderRadius: 3,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <CardContent>
          <TextField
            fullWidth
            value={search}
            placeholder="Tìm tên, số điện thoại, email..."
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: "#fafafa",
              },
            }}
          />
        </CardContent>
      </Card>

      {/* =================================================
          TABLE
      ================================================= */}

      <Card
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 2px 15px rgba(0,0,0,0.05)",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: "#f8f9fb",
                }}
              >
                <TableCell width={60}>
                  <Typography fontWeight={700}>#</Typography>
                </TableCell>

                <TableCell>
                  <Typography fontWeight={700}>Khách hàng</Typography>
                </TableCell>

                <TableCell>
                  <Typography fontWeight={700}>Số điện thoại</Typography>
                </TableCell>

                <TableCell>
                  <Typography fontWeight={700}>Địa chỉ</Typography>
                </TableCell>

                <TableCell align="center">
                  <Typography fontWeight={700}>Đơn hàng</Typography>
                </TableCell>

                <TableCell align="right">
                  <Typography fontWeight={700}>Đã mua</Typography>
                </TableCell>

                <TableCell align="right">
                  <Typography fontWeight={700}>Công nợ</Typography>
                </TableCell>

                <TableCell align="center">
                  <Typography fontWeight={700}>Thao tác</Typography>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <PeopleIcon
                      sx={{
                        fontSize: 52,
                        color: "text.disabled",
                        mb: 1,
                      }}
                    />

                    <Typography color="text.secondary" fontWeight={600}>
                      Chưa có khách hàng
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer, index) => {
                  const spent = Number(
                    customer.totalSpent ?? customer.totalPurchased ?? 0,
                  );

                  const customerDebt = Number(customer.debt || 0);

                  return (
                    <TableRow
                      key={customer._id}
                      hover
                      sx={{
                        "&:last-child td": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      {/* STT */}

                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {page * rowsPerPage + index + 1}
                        </Typography>
                      </TableCell>

                      {/* CUSTOMER */}

                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "primary.50",
                              color: "primary.main",
                              fontWeight: 800,
                            }}
                          >
                            {(customer.name || "?").charAt(0).toUpperCase()}
                          </Box>

                          <Box>
                            <Typography fontWeight={700} noWrap>
                              {customer.name}
                            </Typography>

                            {customer.email && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                              >
                                {customer.email}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* PHONE */}

                      <TableCell>
                        <Typography variant="body2">
                          {customer.phone || "-"}
                        </Typography>
                      </TableCell>

                      {/* ADDRESS */}

                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {customer.address || "-"}
                        </Typography>
                      </TableCell>

                      {/* ORDERS */}

                      <TableCell align="center">
                        <Chip
                          icon={
                            <ReceiptLongIcon
                              sx={{
                                fontSize: 17,
                              }}
                            />
                          }
                          label={customer.totalOrders || 0}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>

                      {/* PURCHASE */}

                      <TableCell align="right">
                        <Typography fontWeight={700} color="success.main">
                          {formatMoney(spent)}
                        </Typography>
                      </TableCell>

                      {/* DEBT */}

                      <TableCell align="right">
                        <Typography
                          fontWeight={customerDebt > 0 ? 800 : 500}
                          color={
                            customerDebt > 0 ? "error.main" : "success.main"
                          }
                        >
                          {formatMoney(customerDebt)}
                        </Typography>
                      </TableCell>

                      {/* ACTION */}

                      <TableCell align="center">
                        <Stack
                          direction="row"
                          spacing={0.3}
                          justifyContent="center"
                        >
                          {/* XEM ĐƠN */}

                          <IconButton
                            color="success"
                            title="Xem đơn đã mua"
                            onClick={() => handleOpenOrders(customer)}
                          >
                            <ShoppingCartIcon />
                          </IconButton>

                          {/* CHI TIẾT KHÁCH */}

                          <IconButton
                            color="info"
                            title="Chi tiết khách hàng"
                            onClick={() =>
                              navigate(`/admin/customers/${customer._id}`)
                            }
                          >
                            <VisibilityIcon />
                          </IconButton>

                          {/* CÔNG NỢ */}

                          <IconButton
                            color="warning"
                            title="Cập nhật công nợ"
                            onClick={() => handleOpenDebt(customer)}
                          >
                            <AccountBalanceWalletIcon />
                          </IconButton>

                          {/* SỬA */}

                          <IconButton
                            color="primary"
                            title="Sửa"
                            onClick={() => handleOpenEdit(customer)}
                          >
                            <EditIcon />
                          </IconButton>

                          {/* XÓA */}

                          <IconButton
                            color="error"
                            title="Xóa"
                            onClick={() => handleDelete(customer)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION */}

        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(event, newPage) => {
            setPage(newPage);
          }}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));

            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 40, 100]}
          labelRowsPerPage="Số dòng"
        />
      </Card>

      {/* =================================================
          CREATE / EDIT DIALOG
      ================================================= */}

      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingCustomer ? "Chỉnh sửa khách hàng" : "Thêm khách hàng"}
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pt: 1,
            }}
          >
            <TextField
              label="Tên khách hàng"
              required
              fullWidth
              value={form.name}
              onChange={handleChange("name")}
            />

            <TextField
              label="Số điện thoại"
              fullWidth
              value={form.phone}
              onChange={handleChange("phone")}
            />

            <TextField
              label="Email"
              fullWidth
              value={form.email}
              onChange={handleChange("email")}
            />

            <TextField
              label="Địa chỉ"
              fullWidth
              value={form.address}
              onChange={handleChange("address")}
            />

            <TextField
              label="Ghi chú"
              fullWidth
              multiline
              rows={3}
              value={form.note}
              onChange={handleChange("note")}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={savingCustomer}>
            Hủy
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={savingCustomer}
            startIcon={
              savingCustomer ? (
                <CircularProgress size={18} color="inherit" />
              ) : null
            }
          >
            {savingCustomer
              ? "Đang lưu..."
              : editingCustomer
                ? "Cập nhật"
                : "Thêm khách hàng"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================================================
          DEBT DIALOG
      ================================================= */}

      <Dialog
        open={openDebtDialog}
        onClose={handleCloseDebt}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cập nhật công nợ</DialogTitle>

        <DialogContent>
          {selectedDebtCustomer && (
            <Box sx={{ pt: 1 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Khách hàng
                </Typography>

                <Typography fontWeight={800} fontSize={17}>
                  {selectedDebtCustomer.name}
                </Typography>

                {selectedDebtCustomer.phone && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedDebtCustomer.phone}
                  </Typography>
                )}
              </Paper>

              <Typography variant="body2" color="text.secondary">
                Công nợ hiện tại
              </Typography>

              <Typography
                variant="h5"
                fontWeight={800}
                color={
                  Number(selectedDebtCustomer.debt) > 0
                    ? "error.main"
                    : "success.main"
                }
                sx={{ mb: 2 }}
              >
                {formatMoney(selectedDebtCustomer.debt)}
              </Typography>

              <TextField
                autoFocus
                fullWidth
                label="Công nợ mới"
                type="number"
                value={debt}
                onChange={(event) => setDebt(event.target.value)}
                inputProps={{
                  min: 0,
                  step: 1000,
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">₫</InputAdornment>
                  ),
                }}
              />

              <Paper
                variant="outlined"
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Công nợ sau khi cập nhật
                </Typography>

                <Typography
                  variant="h6"
                  fontWeight={800}
                  color={Number(debt) > 0 ? "error.main" : "success.main"}
                >
                  {formatMoney(debt)}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDebt} disabled={savingDebt}>
            Hủy
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleUpdateDebt}
            disabled={savingDebt}
            startIcon={
              savingDebt ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
          >
            {savingDebt ? "Đang cập nhật..." : "Cập nhật công nợ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================================================
          CUSTOMER ORDERS DIALOG
      ================================================= */}

      <Dialog
        open={openOrdersDialog}
        onClose={handleCloseOrders}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1,
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <ShoppingCartIcon color="primary" />

              <Typography variant="h6" fontWeight={800}>
                Lịch sử mua hàng
              </Typography>
            </Stack>

            {selectedOrderCustomer && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {selectedOrderCustomer.name}
                {selectedOrderCustomer.phone
                  ? ` • ${selectedOrderCustomer.phone}`
                  : ""}
              </Typography>
            )}
          </Box>

          <IconButton onClick={handleCloseOrders} disabled={loadingOrders}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 0 }}>
          {loadingOrders ? (
            <Box
              sx={{
                py: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <CircularProgress />

              <Typography color="text.secondary">
                Đang tải lịch sử mua hàng...
              </Typography>
            </Box>
          ) : customerOrders.length === 0 ? (
            <Box
              sx={{
                py: 8,
                textAlign: "center",
              }}
            >
              <ShoppingCartIcon
                sx={{
                  fontSize: 60,
                  color: "text.disabled",
                  mb: 1,
                }}
              />

              <Typography fontWeight={700}>Chưa có đơn hàng</Typography>

              <Typography variant="body2" color="text.secondary">
                Khách hàng này chưa có lịch sử mua hàng.
              </Typography>
            </Box>
          ) : (
            <>
              {/* ORDER SUMMARY */}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(3, 1fr)",
                  },
                  gap: 1.5,
                  p: 2,
                  backgroundColor: "#fafafa",
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Tổng đơn
                  </Typography>

                  <Typography fontWeight={800} fontSize={18}>
                    {customerOrders.length}
                  </Typography>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Tổng đã mua
                  </Typography>

                  <Typography
                    fontWeight={800}
                    color="success.main"
                    fontSize={18}
                  >
                    {formatMoney(
                      customerOrders.reduce(
                        (sum, order) =>
                          sum + Number(order.totalAmount ?? order.total ?? 0),
                        0,
                      ),
                    )}
                  </Typography>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Tổng công nợ
                  </Typography>

                  <Typography fontWeight={800} color="error.main" fontSize={18}>
                    {formatMoney(
                      customerOrders.reduce(
                        (sum, order) => sum + Number(order.debt || 0),
                        0,
                      ),
                    )}
                  </Typography>
                </Paper>
              </Box>

              {/* ORDERS TABLE */}

              <TableContainer
                sx={{
                  maxHeight: 500,
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width={60}>
                        <Typography fontWeight={700}>#</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight={700}>Mã đơn</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight={700}>Ngày</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight={700}>Trạng thái</Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={700}>Tổng tiền</Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={700}>Đã trả</Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={700}>Công nợ</Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography fontWeight={700}>Xem</Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {customerOrders.map((order, index) => {
                      const orderTotal = Number(
                        order.totalAmount ?? order.total ?? 0,
                      );

                      const paid = Number(order.paidAmount || 0);

                      const orderDebt = Number(
                        order.debt ?? Math.max(orderTotal - paid, 0),
                      );

                      return (
                        <TableRow key={order._id || order.id || index} hover>
                          <TableCell>{index + 1}</TableCell>

                          <TableCell>
                            <Typography fontWeight={700}>
                              {order.code ||
                                order.orderCode ||
                                order._id ||
                                "-"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {formatDate(
                              order.createdAt || order.created_at || order.date,
                            )}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={getStatusLabel(order.status)}
                              color={getStatusColor(order.status)}
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell align="right">
                            <Typography fontWeight={700}>
                              {formatMoney(orderTotal)}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography color="success.main">
                              {formatMoney(paid)}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography
                              fontWeight={orderDebt > 0 ? 700 : 400}
                              color={
                                orderDebt > 0 ? "error.main" : "text.secondary"
                              }
                            >
                              {formatMoney(orderDebt)}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <IconButton
                              color="primary"
                              title="Xem chi tiết đơn"
                              onClick={() => {
                                if (order._id) {
                                  handleCloseOrders();

                                  navigate(`/admin/invoices/${order._id}`);
                                }
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseOrders} disabled={loadingOrders}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================================================
          SNACKBAR
      ================================================= */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
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

export default Customers;
