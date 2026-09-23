import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
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
  ArrowBack,
  CalendarToday,
  LocalShipping,
  PersonOutline,
  Print,
  ReceiptLong,
  Store,
} from "@mui/icons-material";

import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

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

const PAYMENT_METHODS = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  cod: "COD",
  debt: "Công nợ",
};

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // =========================================================
  // LOAD ORDER
  // =========================================================

  const loadOrder = async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_ENDPOINTS.ORDER}/${id}`);

      const data = response?.data;

      setOrder(data?.order || data?.data || null);
    } catch (error) {
      console.error("Load invoice:", error);

      alert(
        error?.response?.data?.message || "Không thể tải thông tin hóa đơn",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  // =========================================================
  // UPDATE STATUS
  // =========================================================

  const handleChangeStatus = async (newStatus) => {
    if (!order?._id) return;

    if (order.status === newStatus) return;

    try {
      setUpdatingStatus(true);

      const response = await axios.patch(
        `${API_ENDPOINTS.ORDER}/${order._id}/status`,
        {
          status: newStatus,
        },
      );

      const updatedOrder = response?.data?.order;

      if (updatedOrder) {
        setOrder(updatedOrder);
      } else {
        setOrder((prev) => ({
          ...prev,
          status: newStatus,
          updated_at: new Date(),
        }));
      }
    } catch (error) {
      console.error("Update status:", error);

      alert(error?.response?.data?.message || "Không thể cập nhật trạng thái");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // =========================================================
  // PRINT
  // =========================================================

  const handlePrint = () => {
    window.print();
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />

          <Typography color="text.secondary">Đang tải hóa đơn...</Typography>
        </Stack>
      </Box>
    );
  }

  // =========================================================
  // NOT FOUND
  // =========================================================

  if (!order) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack spacing={2} alignItems="center">
          <ReceiptLong
            sx={{
              fontSize: 60,
              opacity: 0.3,
            }}
          />

          <Typography>Không tìm thấy hóa đơn</Typography>

          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/admin/orders")}
          >
            Quay lại đơn hàng
          </Button>
        </Stack>
      </Box>
    );
  }

  // =========================================================
  // DATA
  // =========================================================

  const statusConfig = STATUS_CONFIG[order.status] || {
    label: order.status || "Không xác định",
    color: "default",
  };

  const items = Array.isArray(order.items) ? order.items : [];

  const paymentMethod =
    PAYMENT_METHODS[order.paymentMethod] || order.paymentMethod || "-";

  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      <Box
        className="invoice-page"
        sx={{
          width: "100%",
          maxWidth: "1400px",
          mx: "auto",
          px: {
            xs: 1,
            sm: 2,
            md: 3,
          },
          pb: 5,
        }}
      >
        {/* ===================================================
            HEADER
        =================================================== */}

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
          className="no-print"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="text"
              startIcon={<ArrowBack />}
              onClick={() => navigate("/admin/orders")}
            >
              Đơn hàng
            </Button>

            <Typography color="text.secondary">/</Typography>

            <Typography fontWeight={700}>{order.code}</Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
            >
              In hóa đơn
            </Button>
          </Stack>
        </Stack>

        {/* ===================================================
            INVOICE
        =================================================== */}
        <div className="print-area">
          <Card
            className="invoice-paper"
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {/* =================================================
              STORE HEADER
          ================================================= */}

            <Box
              sx={{
                p: {
                  xs: 2,
                  md: 4,
                },
                textAlign: "center",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                alignItems="center"
              >
                <Store />

                <Typography variant="h5" fontWeight={800}>
                  NHẬT KHANG BIKE
                </Typography>
              </Stack>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                PHỤ TÙNG XE
              </Typography>

              <Typography variant="h6" fontWeight={800} sx={{ mt: 2 }}>
                HÓA ĐƠN BÁN HÀNG
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Mã hóa đơn: <strong>{order.code}</strong>
              </Typography>
            </Box>

            <Divider />

            {/* =================================================
              ORDER INFO
          ================================================= */}

            <Box
              sx={{
                p: {
                  xs: 2,
                  md: 3,
                },
              }}
            >
              <Grid container spacing={2}>
                {/* CUSTOMER */}

                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      height: "100%",
                      borderRadius: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1.5}
                    >
                      <PersonOutline />

                      <Typography fontWeight={700}>Khách hàng</Typography>
                    </Stack>

                    <Stack spacing={0.7}>
                      <Typography>
                        <strong>Tên:</strong> {order.customerName || "Khách lẻ"}
                      </Typography>

                      <Typography>
                        <strong>SĐT:</strong> {order.customerPhone || "-"}
                      </Typography>

                      <Typography>
                        <strong>Địa chỉ:</strong> {order.customerAddress || "-"}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>

                {/* ORDER */}

                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      height: "100%",
                      borderRadius: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1.5}
                    >
                      <CalendarToday />

                      <Typography fontWeight={700}>
                        Thông tin đơn hàng
                      </Typography>
                    </Stack>

                    <Stack spacing={0.8}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        gap={2}
                      >
                        <Typography color="text.secondary">Ngày tạo</Typography>

                        <Typography fontWeight={600}>
                          {formatDate(order.created_at)}
                        </Typography>
                      </Stack>

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={2}
                      >
                        <Typography color="text.secondary">
                          Trạng thái
                        </Typography>

                        <Select
                          size="small"
                          value={order.status || "pending"}
                          disabled={updatingStatus}
                          onChange={(e) => handleChangeStatus(e.target.value)}
                          sx={{
                            minWidth: 160,
                          }}
                        >
                          <MenuItem value="pending">Chờ xác nhận</MenuItem>

                          <MenuItem value="confirmed">Đã xác nhận</MenuItem>

                          <MenuItem value="shipping">Đang giao</MenuItem>

                          <MenuItem value="completed">Hoàn thành</MenuItem>

                          <MenuItem value="cancelled">Đã hủy</MenuItem>
                        </Select>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* =================================================
              PRODUCTS
          ================================================= */}

            <Box
              sx={{
                p: {
                  xs: 1,
                  sm: 2,
                  md: 3,
                },
              }}
            >
              <Typography fontWeight={700} fontSize={17} mb={1.5}>
                Chi tiết sản phẩm
              </Typography>

              <TableContainer>
                <Table
                  sx={{
                    minWidth: 700,
                  }}
                >
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: "action.hover",
                      }}
                    >
                      <TableCell width={50}>#</TableCell>

                      <TableCell>Sản phẩm</TableCell>

                      <TableCell>Phân loại</TableCell>

                      <TableCell align="center">SL</TableCell>

                      <TableCell align="right">Đơn giá</TableCell>

                      <TableCell align="right">Thành tiền</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={`${item.productId}-${index}`}>
                        <TableCell>{index + 1}</TableCell>

                        <TableCell>
                          <Stack spacing={0.3}>
                            <Typography fontWeight={600}>
                              {item.productTitle || "-"}
                            </Typography>

                            {item.productCode && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Mã: {item.productCode}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell>{item.variantName || "-"}</TableCell>

                        <TableCell align="center">{item.qty}</TableCell>

                        <TableCell align="right">
                          {formatMoney(item.price)}
                        </TableCell>

                        <TableCell align="right">
                          <Typography fontWeight={700}>
                            {formatMoney(item.total)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Divider />

            {/* =================================================
              TOTAL
          ================================================= */}

            <Box
              sx={{
                p: {
                  xs: 2,
                  md: 3,
                },
              }}
            >
              <Grid container justifyContent="flex-end">
                <Grid item xs={12} sm={7} md={5}>
                  <Stack spacing={1.2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>Tạm tính</Typography>

                      <Typography>{formatMoney(order.subtotal)}</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography>Giảm giá</Typography>

                      <Typography>- {formatMoney(order.discount)}</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography>Phí giao hàng</Typography>

                      <Typography>{formatMoney(order.shippingFee)}</Typography>
                    </Stack>

                    <Divider />

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography fontWeight={800} fontSize={18}>
                        Tổng tiền
                      </Typography>

                      <Typography fontWeight={800} fontSize={22}>
                        {formatMoney(order.totalAmount)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">
                        Đã thanh toán
                      </Typography>

                      <Typography>{formatMoney(order.paidAmount)}</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontWeight={700}>Còn nợ</Typography>

                      <Typography fontWeight={800}>
                        {formatMoney(order.debt)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* =================================================
              PAYMENT + NOTE
          ================================================= */}

            <Box
              sx={{
                p: {
                  xs: 2,
                  md: 3,
                },
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                    }}
                  >
                    <Typography fontWeight={700} mb={1}>
                      Thanh toán
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>Phương thức:</Typography>

                      <Chip label={paymentMethod} size="small" />
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                    }}
                  >
                    <Typography fontWeight={700} mb={1}>
                      Ghi chú
                    </Typography>

                    <Typography
                      color={order.note ? "text.primary" : "text.secondary"}
                    >
                      {order.note || "Không có ghi chú"}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* =================================================
              FOOTER
          ================================================= */}

            <Box
              sx={{
                p: {
                  xs: 2,
                  md: 3,
                },
                textAlign: "center",
              }}
            >
              <Typography fontWeight={700}>Cảm ơn quý khách!</Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                NHẬT KHANG BIKE
              </Typography>
            </Box>
          </Card>
        </div>
      </Box>

      {/* =====================================================
          PRINT CSS
      ===================================================== */}

      <style>
        {`
    @media print {

      /* ==========================================
         CẤU HÌNH KHỔ GIẤY
      ========================================== */

      @page {
        size: A4;
        margin: 10mm;
      }

      /* ==========================================
         ẨN TOÀN BỘ TRANG WEB
      ========================================== */

      body * {
        visibility: hidden !important;
      }

      /* ==========================================
         CHỈ HIỆN KHU VỰC HÓA ĐƠN
      ========================================== */

      .print-area,
      .print-area * {
        visibility: visible !important;
      }

      .print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;

        width: 100% !important;
        max-width: none !important;

        margin: 0 !important;
        padding: 0 !important;
      }

      /* ==========================================
         CARD HÓA ĐƠN
      ========================================== */

      .invoice-paper {
        width: 100% !important;
        max-width: none !important;

        margin: 0 !important;
        padding: 0 !important;

        border: none !important;
        box-shadow: none !important;

        border-radius: 0 !important;
      }

      /* ==========================================
         ẨN ELEMENT KHÔNG MUỐN IN
      ========================================== */

      .no-print {
        display: none !important;
      }

      /* ==========================================
         TABLE
      ========================================== */

      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }

      tr {
        page-break-inside: avoid !important;
      }

      /* ==========================================
         FONT
      ========================================== */

      body {
        background: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* ==========================================
         KHÔNG CHO CARD BỊ TÁCH XẤU
      ========================================== */

      .MuiCard-root {
        break-inside: avoid;
      }

      /* ==========================================
         LOẠI BỎ MÀU NỀN KHÔNG CẦN THIẾT
      ========================================== */

      .MuiPaper-root {
        box-shadow: none !important;
      }
    }
  `}
      </style>
    </>
  );
};

export default InvoiceDetail;
