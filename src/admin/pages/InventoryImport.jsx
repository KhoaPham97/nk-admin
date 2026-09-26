import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
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
  Typography,
} from "@mui/material";

import {
  AddOutlined,
  DeleteOutline,
  Inventory2Outlined,
  SaveOutlined,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../../api";

const TYPE_OPTIONS = [
  { value: "1", label: "Xe đạp" },
  { value: "2", label: "Xe điện" },
  { value: "3", label: "Xe ba gác" },
];

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString("vi-VN");
};

const getProductVariants = (product) => {
  if (!product?.variants || !Array.isArray(product.variants)) {
    return [];
  }

  return product.variants;
};

const InventoryImport = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState("");

  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");

  const [items, setItems] = useState([]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  // ============================================================
  // LOAD PRODUCTS
  // ============================================================
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);

      const response = await axios.get(API_ENDPOINTS.PRODUCTS, {
        params: {
          type: "all",
        },
      });

      const data = response?.data;

      const productList =
        data?.products || data?.data?.products || data?.data || [];

      setProducts(Array.isArray(productList) ? productList : []);
    } catch (error) {
      console.error("loadProducts:", error);

      showSnackbar("Không thể tải danh sách sản phẩm", "error");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // ============================================================
  // SNACKBAR
  // ============================================================
  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // ============================================================
  // VARIANTS
  // ============================================================
  const variants = useMemo(() => {
    return getProductVariants(selectedProduct);
  }, [selectedProduct]);

  // ============================================================
  // SELECT PRODUCT
  // ============================================================
  const handleProductChange = (_, product) => {
    setSelectedProduct(product);
    setSelectedVariant("");
  };

  // ============================================================
  // ADD ITEM
  // ============================================================
  const handleAddItem = () => {
    if (!selectedProduct) {
      showSnackbar("Vui lòng chọn sản phẩm", "warning");
      return;
    }

    const quantity = Number(qty);

    if (!quantity || quantity <= 0) {
      showSnackbar("Số lượng nhập phải lớn hơn 0", "warning");
      return;
    }

    const price = Number(unitCost);

    if (price < 0) {
      showSnackbar("Giá nhập không hợp lệ", "warning");
      return;
    }

    const variant =
      variants.find((item) => item.name === selectedVariant) || null;

    const newItem = {
      productId: selectedProduct._id,

      productTitle: selectedProduct.title || selectedProduct.name || "",

      variantName: variant?.name || "",

      qty: quantity,

      unitCost: price,

      total: quantity * price,

      thumbnail: selectedProduct.thumbnail || "",

      currentQty: variant
        ? Number(variant.qty || 0)
        : Number(selectedProduct.qty || 0),
    };

    setItems((prev) => {
      const index = prev.findIndex(
        (item) =>
          item.productId === newItem.productId &&
          item.variantName === newItem.variantName,
      );

      if (index !== -1) {
        const clone = [...prev];

        clone[index] = {
          ...clone[index],
          qty: clone[index].qty + newItem.qty,
          total: (clone[index].qty + newItem.qty) * clone[index].unitCost,
        };

        return clone;
      }

      return [...prev, newItem];
    });

    setQty("");
    setUnitCost("");
  };

  // ============================================================
  // DELETE ITEM
  // ============================================================
  const handleDeleteItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ============================================================
  // UPDATE QTY
  // ============================================================
  const handleChangeQty = (index, value) => {
    const quantity = Math.max(Number(value) || 0, 0);

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          qty: quantity,
          total: quantity * Number(item.unitCost || 0),
        };
      }),
    );
  };

  // ============================================================
  // UPDATE UNIT COST
  // ============================================================
  const handleChangeUnitCost = (index, value) => {
    const price = Math.max(Number(value) || 0, 0);

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          unitCost: price,
          total: Number(item.qty || 0) * price,
        };
      }),
    );
  };

  // ============================================================
  // TOTAL
  // ============================================================
  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  }, [items]);

  // ============================================================
  // SAVE IMPORT
  // ============================================================
  const handleSave = async () => {
    if (items.length === 0) {
      showSnackbar("Chưa có sản phẩm nào trong phiếu nhập", "warning");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        supplier: supplier.trim(),

        note: note.trim(),

        items: items.map((item) => ({
          productId: item.productId,
          variantName: item.variantName || "",
          qty: Number(item.qty),
          unitCost: Number(item.unitCost || 0),
        })),
      };
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("accessToken");

      const response = await axios.post(
        `${API_ENDPOINTS.INVENTORY_RECEIPTS}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response?.data?.success) {
        throw new Error(
          response?.data?.message || "Không thể lưu phiếu nhập kho",
        );
      }

      showSnackbar("Nhập kho thành công", "success");

      setItems([]);
      setSupplier("");
      setNote("");
      setSelectedProduct(null);
      setSelectedVariant("");
      setQty("");
      setUnitCost("");

      await loadProducts();
    } catch (error) {
      console.error("handleSave:", error);

      showSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể nhập kho",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* ======================================================
          HEADER
      ====================================================== */}
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
          <Stack direction="row" alignItems="center" spacing={1}>
            <Inventory2Outlined color="primary" />

            <Typography variant="h5" fontWeight={700}>
              Nhập kho
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Tạo phiếu nhập hàng và cập nhật tồn kho
          </Typography>
        </Box>

        <Button variant="outlined" onClick={() => navigate("/admin/inventory")}>
          Quay lại tồn kho
        </Button>
      </Stack>

      {/* ======================================================
          THÔNG TIN PHIẾU
      ====================================================== */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Thông tin phiếu nhập
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nhà cung cấp"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nhập tên nhà cung cấp"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ghi chú"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Nhập hàng Trung Quốc"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ======================================================
          ADD PRODUCT
      ====================================================== */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Thêm sản phẩm nhập kho
          </Typography>

          <Grid container spacing={2}>
            {/* PRODUCT */}
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={products}
                loading={loadingProducts}
                value={selectedProduct}
                onChange={handleProductChange}
                getOptionLabel={(option) => option?.title || option?.name || ""}
                isOptionEqualToValue={(option, value) =>
                  option?._id === value?._id
                }
                renderOption={(props, option) => (
                  <li {...props} key={option._id}>
                    <Box>
                      <Typography fontWeight={600}>
                        {option.title || option.name}
                      </Typography>

                      {option.brand && (
                        <Typography variant="caption" color="text.secondary">
                          {option.brand}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Sản phẩm"
                    placeholder="Tìm sản phẩm..."
                  />
                )}
              />
            </Grid>

            {/* VARIANT */}
            <Grid item xs={12} md={3}>
              {variants.length > 0 ? (
                <Select
                  fullWidth
                  displayEmpty
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                >
                  <MenuItem value="">Chọn phân loại</MenuItem>

                  {variants.map((variant, index) => (
                    <MenuItem
                      key={`${variant.name}-${index}`}
                      value={variant.name}
                    >
                      {variant.name}
                      {" - "}
                      Tồn: {Number(variant.qty || 0).toLocaleString("vi-VN")}
                    </MenuItem>
                  ))}
                </Select>
              ) : (
                <TextField
                  fullWidth
                  disabled
                  value="Sản phẩm không có phân loại"
                  label="Phân loại"
                />
              )}
            </Grid>

            {/* QTY */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                type="number"
                label="Số lượng"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputProps={{
                  min: 1,
                }}
              />
            </Grid>

            {/* PRICE */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                type="number"
                label="Giá nhập"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                inputProps={{
                  min: 0,
                }}
              />
            </Grid>

            {/* BUTTON */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={handleAddItem}
              >
                Thêm vào phiếu
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ======================================================
          ITEMS
      ====================================================== */}
      <Card>
        <CardContent>
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            justifyContent="space-between"
            spacing={2}
            mb={2}
          >
            <Box>
              <Typography fontWeight={700}>Chi tiết nhập kho</Typography>

              <Typography variant="body2" color="text.secondary">
                {items.length} sản phẩm · {totalQty.toLocaleString("vi-VN")} sản
                phẩm
              </Typography>
            </Box>

            <Chip
              label={`Tổng: ${formatMoney(totalAmount)} ₫`}
              color="primary"
            />
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {items.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                py: 6,
                textAlign: "center",
              }}
            >
              <Inventory2Outlined
                sx={{
                  fontSize: 48,
                  color: "text.disabled",
                  mb: 1,
                }}
              />

              <Typography color="text.secondary">
                Chưa có sản phẩm trong phiếu nhập
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sản phẩm</TableCell>

                    <TableCell>Phân loại</TableCell>

                    <TableCell align="right">Tồn hiện tại</TableCell>

                    <TableCell align="right">Số lượng nhập</TableCell>

                    <TableCell align="right">Giá nhập</TableCell>

                    <TableCell align="right">Thành tiền</TableCell>

                    <TableCell align="center">#</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {items.map((item, index) => (
                    <TableRow
                      key={`${item.productId}-${item.variantName}-${index}`}
                    >
                      <TableCell>
                        <Typography fontWeight={600}>
                          {item.productTitle}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {item.variantName || (
                          <Chip size="small" label="Mặc định" />
                        )}
                      </TableCell>

                      <TableCell align="right">
                        {Number(item.currentQty || 0).toLocaleString("vi-VN")}
                      </TableCell>

                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={item.qty}
                          onChange={(e) =>
                            handleChangeQty(index, e.target.value)
                          }
                          inputProps={{
                            min: 1,
                            style: {
                              textAlign: "right",
                            },
                          }}
                          sx={{
                            width: 100,
                          }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={item.unitCost}
                          onChange={(e) =>
                            handleChangeUnitCost(index, e.target.value)
                          }
                          inputProps={{
                            min: 0,
                            style: {
                              textAlign: "right",
                            },
                          }}
                          sx={{
                            width: 130,
                          }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={600}>
                          {formatMoney(item.total)} ₫
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteItem(index)}
                        >
                          <DeleteOutline />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* ==================================================
              FOOTER
          ================================================== */}
          {items.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />

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
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng số lượng
                  </Typography>

                  <Typography variant="h6" fontWeight={700}>
                    {totalQty.toLocaleString("vi-VN")}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng tiền nhập
                  </Typography>

                  <Typography variant="h5" fontWeight={700} color="primary">
                    {formatMoney(totalAmount)} ₫
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SaveOutlined />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{
                    minWidth: 200,
                  }}
                >
                  {saving ? "Đang lưu..." : "Lưu phiếu nhập"}
                </Button>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() =>
          setSnackbar((prev) => ({
            ...prev,
            open: false,
          }))
        }
      >
        <Alert
          severity={snackbar.severity}
          onClose={() =>
            setSnackbar((prev) => ({
              ...prev,
              open: false,
            }))
          }
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryImport;
