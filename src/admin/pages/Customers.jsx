import React, { useCallback, useEffect, useState } from "react";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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

  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);

  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await axios.get(API_URL, {
        params: {
          search,
          page: page + 1,
          limit: rowsPerPage,
        },
      });

      setCustomers(response.data.customers || []);

      setTotal(response.data.total || 0);
    } catch (error) {
      console.error("Load customers:", error);
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setOpenDialog(true);
  };

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

  const handleClose = () => {
    setOpenDialog(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      if (!form.name.trim()) {
        alert("Vui lòng nhập tên khách hàng");
        return;
      }

      if (editingCustomer) {
        await axios.put(`${API_URL}/${editingCustomer._id}`, form);
      } else {
        await axios.post(API_URL, form);
      }

      handleClose();

      await loadCustomers();
    } catch (error) {
      console.error("Save customer:", error);

      alert(error.response?.data?.message || "Không thể lưu khách hàng");
    }
  };

  const handleDelete = async (customer) => {
    const ok = window.confirm(`Bạn có chắc muốn xóa "${customer.name}"?`);

    if (!ok) return;

    try {
      await axios.delete(`${API_URL}/${customer._id}`);

      await loadCustomers();
    } catch (error) {
      console.error("Delete customer:", error);

      alert(error.response?.data?.message || "Không thể xóa khách hàng");
    }
  };

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
  };

  return (
    <Box>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Khách hàng
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Quản lý thông tin và lịch sử khách hàng
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
        >
          Thêm khách hàng
        </Button>
      </Box>

      {/* SEARCH */}
      <Card sx={{ mb: 2 }}>
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
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={60}>#</TableCell>

                <TableCell>Khách hàng</TableCell>

                <TableCell>Số điện thoại</TableCell>

                <TableCell>Địa chỉ</TableCell>

                <TableCell align="center">Đơn hàng</TableCell>

                <TableCell align="right">Đã mua</TableCell>

                <TableCell align="right">Công nợ</TableCell>

                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{
                      py: 8,
                    }}
                  >
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{
                      py: 8,
                    }}
                  >
                    <PeopleIcon
                      sx={{
                        fontSize: 50,
                        color: "text.secondary",
                      }}
                    />

                    <Typography color="text.secondary">
                      Chưa có khách hàng
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer, index) => (
                  <TableRow key={customer._id} hover>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>

                    <TableCell>
                      <Typography fontWeight={600}>{customer.name}</Typography>

                      {customer.email && (
                        <Typography variant="caption" color="text.secondary">
                          {customer.email}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>{customer.phone || "-"}</TableCell>

                    <TableCell>{customer.address || "-"}</TableCell>

                    <TableCell align="center">{customer.totalOrders}</TableCell>

                    <TableCell align="right">
                      {formatMoney(customer.totalSpent)}
                    </TableCell>

                    <TableCell align="right">
                      <Typography
                        fontWeight={customer.debt > 0 ? 700 : 400}
                        color={
                          customer.debt > 0 ? "error.main" : "text.primary"
                        }
                      >
                        {formatMoney(customer.debt)}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <IconButton
                        color="info"
                        title="Chi tiết"
                        onClick={() =>
                          navigate(`/admin/customers/${customer._id}`)
                        }
                      >
                        <VisibilityIcon />
                      </IconButton>

                      <IconButton
                        color="primary"
                        title="Sửa"
                        onClick={() => handleOpenEdit(customer)}
                      >
                        <EditIcon />
                      </IconButton>

                      <IconButton
                        color="error"
                        title="Xóa"
                        onClick={() => handleDelete(customer)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

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

      {/* DIALOG */}
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
          <Button onClick={handleClose}>Hủy</Button>

          <Button variant="contained" onClick={handleSave}>
            {editingCustomer ? "Cập nhật" : "Thêm khách hàng"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Customers;
