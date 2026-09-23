import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  Add,
  ArrowBack,
  DeleteOutline,
  PersonOutline,
  Remove,
  Save,
  ShoppingCartOutlined,
} from "@mui/icons-material";

import axios from "axios";
import { useNavigate } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
};

const getNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const CreateOrder = () => {
  const navigate = useNavigate();

  // =========================================================
  // DATA
  // =========================================================
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // =========================================================
  // CUSTOMER
  // =========================================================
  const [customer, setCustomer] = useState(null);

  // =========================================================
  // PRODUCT
  // =========================================================
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);

  // =========================================================
  // ORDER ITEMS
  // =========================================================
  const [items, setItems] = useState([]);

  // =========================================================
  // PAYMENT
  // =========================================================
  const [discount, setDiscount] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [note, setNote] = useState("");

  // =========================================================
  // LOAD DATA
  // =========================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);

        const [customerRes, productRes] = await Promise.all([
          axios.get(API_ENDPOINTS.CUSTOMERS, {
            params: {
              page: 1,
              limit: 100,
            },
          }),

          axios.get(API_ENDPOINTS.PRODUCTS, {
            params: {
              type: "all",
            },
          }),
        ]);

        const customerData =
          customerRes?.data?.customers || customerRes?.data?.data || [];

        const productData =
          productRes?.data?.products || productRes?.data?.data || [];

        setCustomers(Array.isArray(customerData) ? customerData : []);
        setProducts(Array.isArray(productData) ? productData : []);
      } catch (error) {
        console.error("Load create order data:", error);

        alert(
          error?.response?.data?.message ||
            "Không thể tải dữ liệu khách hàng hoặc sản phẩm",
        );
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  // =========================================================
  // VARIANTS
  // =========================================================
  const variants = useMemo(() => {
    if (!selectedProduct?.variants) return [];

    return Array.isArray(selectedProduct.variants)
      ? selectedProduct.variants
      : [];
  }, [selectedProduct]);

  // =========================================================
  // CURRENT PRODUCT PRICE
  // =========================================================
  const currentPrice = useMemo(() => {
    if (!selectedProduct) return 0;

    if (selectedVariant) {
      const variant = variants.find(
        (item) => String(item.name).trim() === String(selectedVariant).trim(),
      );

      if (variant) {
        return getNumber(variant.price);
      }
    }

    return getNumber(selectedProduct.price);
  }, [selectedProduct, selectedVariant, variants]);

  // =========================================================
  // CURRENT STOCK
  // =========================================================
  const currentStock = useMemo(() => {
    if (!selectedProduct) return 0;

    if (selectedVariant) {
      const variant = variants.find(
        (item) => String(item.name).trim() === String(selectedVariant).trim(),
      );

      if (variant) {
        return getNumber(variant.qty);
      }
    }

    return getNumber(selectedProduct.qty);
  }, [selectedProduct, selectedVariant, variants]);

  // =========================================================
  // SELECT PRODUCT
  // =========================================================
  const handleSelectProduct = (_, value) => {
    setSelectedProduct(value);
    setSelectedVariant("");
    setQuantity(1);
  };

  // =========================================================
  // ADD PRODUCT
  // =========================================================
  const handleAddProduct = () => {
    if (!selectedProduct) {
      alert("Vui lòng chọn sản phẩm");
      return;
    }

    const qty = getNumber(quantity);

    if (qty <= 0) {
      alert("Số lượng phải lớn hơn 0");
      return;
    }

    if (currentStock <= 0) {
      alert("Sản phẩm đã hết hàng");
      return;
    }

    if (qty > currentStock) {
      alert(`Sản phẩm chỉ còn ${currentStock}`);
      return;
    }

    const variantName = selectedVariant || "";

    const existingIndex = items.findIndex(
      (item) =>
        String(item.productId) === String(selectedProduct._id) &&
        String(item.variantName || "") === String(variantName),
    );

    if (existingIndex >= 0) {
      const newItems = [...items];
      const newQty = newItems[existingIndex].qty + qty;

      if (newQty > currentStock) {
        alert(`Sản phẩm chỉ còn ${currentStock}`);
        return;
      }

      newItems[existingIndex] = {
        ...newItems[existingIndex],
        qty: newQty,
        total: newQty * newItems[existingIndex].price,
      };

      setItems(newItems);
    } else {
      const newItem = {
        productId: selectedProduct._id,
        productTitle: selectedProduct.title || "",
        productCode:
          selectedProduct.code ||
          selectedProduct.productCode ||
          selectedProduct.sku ||
          "",
        variantName,
        price: currentPrice,
        qty,
        stock: currentStock,
        thumbnail: selectedProduct.thumbnail || "",
        total: currentPrice * qty,
      };

      setItems((prev) => [...prev, newItem]);
    }

    setSelectedProduct(null);
    setSelectedVariant("");
    setQuantity(1);
  };

  // =========================================================
  // UPDATE ITEM QTY
  // =========================================================
  const handleChangeItemQty = (index, change) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = newItems[index];

      const newQty = item.qty + change;

      if (newQty <= 0) {
        newItems.splice(index, 1);
        return newItems;
      }

      if (newQty > item.stock) {
        alert(`Sản phẩm chỉ còn ${item.stock}`);
        return prev;
      }

      newItems[index] = {
        ...item,
        qty: newQty,
        total: newQty * item.price,
      };

      return newItems;
    });
  };

  // =========================================================
  // REMOVE ITEM
  // =========================================================
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  // =========================================================
  // CALCULATE
  // =========================================================
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + getNumber(item.total), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - getNumber(discount) + getNumber(shippingFee));
  }, [subtotal, discount, shippingFee]);

  const debt = useMemo(() => {
    return Math.max(0, totalAmount - getNumber(paidAmount));
  }, [totalAmount, paidAmount]);

  // =========================================================
  // CREATE ORDER
  // =========================================================
  const handleCreateOrder = async () => {
    if (items.length === 0) {
      alert("Vui lòng thêm ít nhất một sản phẩm");
      return;
    }

    const paid = getNumber(paidAmount);

    if (paid > totalAmount) {
      alert("Số tiền thanh toán không được lớn hơn tổng tiền");
      return;
    }

    try {
      setLoadingOrder(true);

      const payload = {
        customerId: customer?._id || null,

        items: items.map((item) => ({
          productId: item.productId,
          variantName: item.variantName || "",
          qty: Number(item.qty),
        })),

        discount: getNumber(discount),
        shippingFee: getNumber(shippingFee),
        paidAmount: paid,

        paymentMethod,

        note: note?.trim() || "",
      };

      const response = await axios.post(API_ENDPOINTS.ORDER, payload);

      const order = response?.data?.order;

      if (!order?._id) {
        throw new Error("Không nhận được thông tin hóa đơn");
      }

      navigate(`/admin/invoices/${order._id}`);
    } catch (error) {
      console.error("Create order:", error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tạo hóa đơn",
      );
    } finally {
      setLoadingOrder(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (loadingData) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Đang tải dữ liệu...</Typography>
        </Stack>
      </Box>
    );
  }

  // =========================================================
  // UI
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>

          <Box>
            <Typography variant="h5" fontWeight={700}>
              Tạo hóa đơn
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Tạo đơn hàng mới cho khách hàng
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="contained"
          size="large"
          startIcon={
            loadingOrder ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <Save />
            )
          }
          disabled={loadingOrder || items.length === 0}
          onClick={handleCreateOrder}
          sx={{
            minWidth: 160,
            fontWeight: 700,
            borderRadius: 2,
          }}
        >
          {loadingOrder ? "Đang lưu..." : "Tạo hóa đơn"}
        </Button>
      </Box>

      <Grid container spacing={2} alignItems="flex-start">
        {/* ===================================================
            LEFT
        =================================================== */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={2}>
            {/* CUSTOMER */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <PersonOutline />

                  <Typography fontWeight={700} fontSize={17}>
                    Khách hàng
                  </Typography>
                </Stack>

                <Autocomplete
                  fullWidth
                  options={customers}
                  value={customer}
                  onChange={(_, value) => setCustomer(value)}
                  getOptionLabel={(option) => {
                    if (!option) return "";

                    const name = option.name || "";
                    const phone = option.phone || "";

                    return phone ? `${name} - ${phone}` : name;
                  }}
                  isOptionEqualToValue={(option, value) =>
                    option?._id === value?._id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tìm khách hàng"
                      placeholder="Nhập tên hoặc số điện thoại"
                      fullWidth
                    />
                  )}
                />

                {customer && (
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: "background.default",
                    }}
                  >
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">
                          Khách hàng
                        </Typography>

                        <Typography fontWeight={600}>
                          {customer.name || "-"}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">
                          Điện thoại
                        </Typography>

                        <Typography fontWeight={600}>
                          {customer.phone || "-"}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">
                          Địa chỉ
                        </Typography>

                        <Typography fontWeight={600}>
                          {customer.address || "-"}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                )}
              </CardContent>
            </Card>

            {/* PRODUCT */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <ShoppingCartOutlined />

                  <Typography fontWeight={700} fontSize={17}>
                    Sản phẩm
                  </Typography>
                </Stack>

                {/* SEARCH PRODUCT */}
                <Autocomplete
                  fullWidth
                  options={products}
                  value={selectedProduct}
                  onChange={handleSelectProduct}
                  getOptionLabel={(option) => option?.title || ""}
                  isOptionEqualToValue={(option, value) =>
                    option?._id === value?._id
                  }
                  renderOption={(props, option) => (
                    <Box
                      component="li"
                      {...props}
                      key={option._id}
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        alignItems: "center",
                      }}
                    >
                      {option.thumbnail ? (
                        <Box
                          component="img"
                          src={"/images/" + option.thumbnail}
                          alt={option.title}
                          sx={{
                            width: 45,
                            height: 45,
                            objectFit: "contain",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 45,
                            height: 45,
                            borderRadius: 1,
                            backgroundColor: "grey.100",
                          }}
                        />
                      )}

                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={600} noWrap>
                          {option.title}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          {formatMoney(option.price)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tìm sản phẩm"
                      placeholder="Nhập tên sản phẩm..."
                      fullWidth
                    />
                  )}
                />

                {/* VARIANT + QTY + ADD */}
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} md={9}>
                    <TextField
                      select
                      fullWidth
                      label="Phân loại"
                      value={selectedVariant}
                      onChange={(e) => setSelectedVariant(e.target.value)}
                      disabled={!selectedProduct || variants.length === 0}
                    >
                      {variants.length === 0 ? (
                        <MenuItem value="">Không có phân loại</MenuItem>
                      ) : (
                        variants.map((variant, index) => (
                          <MenuItem
                            key={`${variant.name}-${index}`}
                            value={variant.name}
                          >
                            <Box
                              sx={{
                                width: "100%",
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 2,
                              }}
                            >
                              <span>{variant.name}</span>

                              <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                              >
                                {formatMoney(variant.price)} · Còn{" "}
                                {getNumber(variant.qty)}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))
                      )}
                    </TextField>
                  </Grid>

                  <Grid item xs={6} sm={3} md={1.5}>
                    <TextField
                      fullWidth
                      type="number"
                      label="SL"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Number(e.target.value) || 1))
                      }
                      inputProps={{
                        min: 1,
                        max: currentStock || undefined,
                      }}
                      disabled={!selectedProduct}
                    />
                  </Grid>

                  <Grid item xs={6} sm={3} md={1.5}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddProduct}
                      disabled={!selectedProduct}
                      sx={{
                        height: "56px",
                        borderRadius: 1.5,
                        fontWeight: 700,
                      }}
                    >
                      Thêm
                    </Button>
                  </Grid>
                </Grid>

                {/* CURRENT PRODUCT INFO */}
                {selectedProduct && (
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                    }}
                  >
                    <Stack
                      direction={{
                        xs: "column",
                        sm: "row",
                      }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography fontWeight={600}>
                          {selectedProduct.title}
                        </Typography>

                        {selectedVariant && (
                          <Typography variant="body2" color="text.secondary">
                            Phân loại: {selectedVariant}
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={2}>
                        <Typography fontWeight={700}>
                          {formatMoney(currentPrice)}
                        </Typography>

                        <Chip
                          size="small"
                          label={`Còn ${currentStock}`}
                          color={currentStock > 0 ? "success" : "error"}
                        />
                      </Stack>
                    </Stack>
                  </Paper>
                )}
              </CardContent>
            </Card>

            {/* ITEMS */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography fontWeight={700} fontSize={17}>
                      Danh sách sản phẩm
                    </Typography>

                    <Chip label={`${items.length} sản phẩm`} size="small" />
                  </Stack>
                </Box>

                <Divider />

                {items.length === 0 ? (
                  <Box
                    sx={{
                      py: 8,
                      textAlign: "center",
                      color: "text.secondary",
                    }}
                  >
                    <ShoppingCartOutlined
                      sx={{
                        fontSize: 48,
                        opacity: 0.35,
                        mb: 1,
                      }}
                    />

                    <Typography>Chưa có sản phẩm trong hóa đơn</Typography>

                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Tìm và thêm sản phẩm ở phía trên
                    </Typography>
                  </Box>
                ) : (
                  <Stack divider={<Divider />}>
                    {items.map((item, index) => (
                      <Box
                        key={`${item.productId}-${item.variantName}-${index}`}
                        sx={{
                          p: 1.5,
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                        }}
                      >
                        <Stack
                          direction={{
                            xs: "column",
                            sm: "row",
                          }}
                          spacing={1.5}
                          alignItems={{
                            xs: "stretch",
                            sm: "center",
                          }}
                        >
                          {/* IMAGE */}
                          {item.thumbnail ? (
                            <Box
                              component="img"
                              src={"/images/" + item.thumbnail}
                              alt={item.productTitle}
                              sx={{
                                width: 60,
                                height: 60,
                                objectFit: "contain",
                                borderRadius: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 60,
                                height: 60,
                                borderRadius: 1.5,
                                backgroundColor: "grey.100",
                                flexShrink: 0,
                              }}
                            />
                          )}

                          {/* PRODUCT */}
                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <Typography fontWeight={600} noWrap>
                              {item.productTitle}
                            </Typography>

                            {item.variantName && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Phân loại: {item.variantName}
                              </Typography>
                            )}

                            <Typography variant="body2" color="text.secondary">
                              {formatMoney(item.price)}
                            </Typography>
                          </Box>

                          {/* QTY */}
                          <Stack
                            direction="row"
                            alignItems="center"
                            sx={{
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1.5,
                              width: "fit-content",
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleChangeItemQty(index, -1)}
                            >
                              <Remove fontSize="small" />
                            </IconButton>

                            <Typography
                              sx={{
                                minWidth: 35,
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              {item.qty}
                            </Typography>

                            <IconButton
                              size="small"
                              onClick={() => handleChangeItemQty(index, 1)}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          </Stack>

                          {/* TOTAL */}
                          <Typography
                            sx={{
                              minWidth: {
                                sm: 110,
                              },
                              textAlign: {
                                xs: "left",
                                sm: "right",
                              },
                              fontWeight: 700,
                            }}
                          >
                            {formatMoney(item.total)}
                          </Typography>

                          {/* DELETE */}
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <DeleteOutline />
                          </IconButton>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* NOTE */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Typography fontWeight={700} mb={1.5}>
                  Ghi chú
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú cho đơn hàng..."
                />
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* ===================================================
            RIGHT - PAYMENT
        =================================================== */}
        <Grid item xs={12} lg={4}>
          <Box
            sx={{
              position: {
                lg: "sticky",
              },
              top: {
                lg: 16,
              },
            }}
          >
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Thanh toán
                </Typography>

                {/* SUBTOTAL */}
                <Stack direction="row" justifyContent="space-between" mb={1.5}>
                  <Typography color="text.secondary">Tạm tính</Typography>

                  <Typography fontWeight={600}>
                    {formatMoney(subtotal)}
                  </Typography>
                </Stack>

                {/* DISCOUNT */}
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Giảm giá"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(Math.max(0, Number(e.target.value) || 0))
                  }
                  inputProps={{ min: 0 }}
                  sx={{ mb: 1.5 }}
                />

                {/* SHIPPING */}
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Phí giao hàng"
                  value={shippingFee}
                  onChange={(e) =>
                    setShippingFee(Math.max(0, Number(e.target.value) || 0))
                  }
                  inputProps={{ min: 0 }}
                  sx={{ mb: 2 }}
                />

                <Divider sx={{ mb: 2 }} />

                {/* TOTAL */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography fontWeight={700} fontSize={17}>
                    Tổng tiền
                  </Typography>

                  <Typography fontWeight={800} fontSize={22}>
                    {formatMoney(totalAmount)}
                  </Typography>
                </Stack>

                {/* PAID */}
                <TextField
                  fullWidth
                  type="number"
                  label="Đã thanh toán"
                  value={paidAmount}
                  onChange={(e) =>
                    setPaidAmount(Math.max(0, Number(e.target.value) || 0))
                  }
                  inputProps={{
                    min: 0,
                    max: totalAmount,
                  }}
                  sx={{ mb: 2 }}
                />

                {/* DEBT */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mb: 2,
                    borderRadius: 2,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography color="text.secondary">Còn nợ</Typography>

                    <Typography fontWeight={800} fontSize={19}>
                      {formatMoney(debt)}
                    </Typography>
                  </Stack>
                </Paper>

                {/* PAYMENT METHOD */}
                <TextField
                  select
                  fullWidth
                  label="Phương thức thanh toán"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="cash">💵 Tiền mặt</MenuItem>

                  <MenuItem value="transfer">🏦 Chuyển khoản</MenuItem>

                  <MenuItem value="cod">🚚 COD</MenuItem>

                  <MenuItem value="debt">📒 Công nợ</MenuItem>
                </TextField>

                <Divider sx={{ mb: 2 }} />

                {/* ITEM SUMMARY */}
                <Stack spacing={1} mb={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Số mặt hàng
                    </Typography>

                    <Typography variant="body2">{items.length}</Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Tổng số lượng
                    </Typography>

                    <Typography variant="body2">
                      {items.reduce(
                        (sum, item) => sum + getNumber(item.qty),
                        0,
                      )}
                    </Typography>
                  </Stack>
                </Stack>

                {/* CREATE */}
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  startIcon={
                    loadingOrder ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Save />
                    )
                  }
                  disabled={loadingOrder || items.length === 0}
                  onClick={handleCreateOrder}
                  sx={{
                    height: 52,
                    borderRadius: 2,
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {loadingOrder ? "Đang tạo hóa đơn..." : "Tạo hóa đơn"}
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateOrder;
