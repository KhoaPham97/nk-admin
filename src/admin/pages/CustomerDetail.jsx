import React, { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

const API_URL = API_ENDPOINTS || "";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);

  const [loading, setLoading] = useState(true);

  const [debt, setDebt] = useState("");

  const [savingDebt, setSavingDebt] = useState(false);

  const [error, setError] = useState("");

  const loadCustomer = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/${id}`);

      const data = response.data.customer;

      setCustomer(data);
      setDebt(data.debt || 0);
    } catch (error) {
      console.error("Load customer:", error);

      setError(error.response?.data?.message || "Không thể tải khách hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
  };

  const handleSaveDebt = async () => {
    try {
      const value = Number(debt);

      if (Number.isNaN(value) || value < 0) {
        alert("Công nợ không hợp lệ");
        return;
      }

      setSavingDebt(true);

      const response = await axios.patch(`${API_URL}/${id}/debt`, {
        debt: value,
      });

      setCustomer(response.data.customer);
    } catch (error) {
      console.error("Update debt:", error);

      alert(error.response?.data?.message || "Không thể cập nhật công nợ");
    } finally {
      setSavingDebt(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 10,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/admin/customers")}
        >
          Quay lại
        </Button>

        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <Box>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/admin/customers")}
        >
          Khách hàng
        </Button>

        <Box>
          <Typography variant="h5" fontWeight={700}>
            {customer.name}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Chi tiết khách hàng
          </Typography>
        </Box>
      </Box>

      {/* THÔNG TIN */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>
                Thông tin khách hàng
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.5,
                  }}
                >
                  <PhoneIcon color="action" />

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Số điện thoại
                    </Typography>

                    <Typography>{customer.phone || "-"}</Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 1.5,
                  }}
                >
                  <EmailIcon color="action" />

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>

                    <Typography>{customer.email || "-"}</Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 1.5,
                  }}
                >
                  <LocationOnIcon color="action" />

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Địa chỉ
                    </Typography>

                    <Typography>{customer.address || "-"}</Typography>
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ghi chú
                  </Typography>

                  <Typography>{customer.note || "Không có ghi chú"}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* THỐNG KÊ */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {/* ĐƠN */}
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <ShoppingCartIcon color="primary" />

                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Tổng đơn hàng
                  </Typography>

                  <Typography variant="h5" fontWeight={700}>
                    {customer.totalOrders}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* ĐÃ MUA */}
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <PaymentsIcon color="success" />

                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Tổng tiền đã mua
                  </Typography>

                  <Typography variant="h6" fontWeight={700}>
                    {formatMoney(customer.totalSpent)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* CÔNG NỢ */}
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <AccountBalanceWalletIcon color="error" />

                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Công nợ
                  </Typography>

                  <Typography variant="h6" fontWeight={700} color="error.main">
                    {formatMoney(customer.debt)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* CẬP NHẬT CÔNG NỢ */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    Quản lý công nợ
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <TextField
                      label="Công nợ"
                      type="number"
                      value={debt}
                      onChange={(e) => setDebt(e.target.value)}
                      sx={{
                        maxWidth: 300,
                      }}
                      InputProps={{
                        endAdornment: "₫",
                      }}
                    />

                    <Button
                      variant="contained"
                      color="error"
                      disabled={savingDebt}
                      onClick={handleSaveDebt}
                    >
                      {savingDebt ? "Đang lưu..." : "Cập nhật"}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* LỊCH SỬ ĐƠN HÀNG */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Lịch sử đơn hàng
          </Typography>

          <Box
            sx={{
              textAlign: "center",
              py: 5,
            }}
          >
            <ShoppingCartIcon
              sx={{
                fontSize: 50,
                color: "text.secondary",
              }}
            />

            <Typography color="text.secondary" mt={1}>
              Chưa có đơn hàng
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CustomerDetail;
