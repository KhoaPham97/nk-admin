import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Snackbar,
  MenuItem,
} from "@mui/material";

import {
  AddOutlined,
  DeleteOutline,
  Inventory2Outlined,
  SaveOutlined,
} from "@mui/icons-material";

import { API_ENDPOINTS, BASE_URL } from "../../api";
import ProductImageScanner from "../components/ProductImageScanner";

const INVENTORY_API = "/inventory";
const DRAFTS_API = BASE_URL + `${INVENTORY_API}/import-drafts`;
const PRODUCTS_API = API_ENDPOINTS.PRODUCTS;

const getToken = () => localStorage.getItem("adminToken");

const getHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const numberValue = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (value) =>
  `${Math.round(numberValue(value)).toLocaleString("vi-VN")} ¥`;

const getProductTitle = (product) =>
  product?.title || product?.name || product?.productTitle || "";

const getProductImage = (product) =>
  product?.thumbnail || product?.image || product?.images?.[0] || "";

const getVariants = (product) =>
  Array.isArray(product?.variants) ? product.variants : [];

const getCurrentQty = (product, variantName) => {
  if (!product) return 0;

  if (!variantName) return numberValue(product.qty);

  const variant = getVariants(product).find(
    (item) => item.name === variantName,
  );

  return numberValue(variant?.qty);
};

const getUnitCost = (product, variantName) => {
  if (!product) return 0;

  if (variantName) {
    const variant = getVariants(product).find(
      (item) => item.name === variantName,
    );

    return numberValue(variant?.unitCost ?? variant?.defaultPrice);
  }

  return numberValue(product.unitCost ?? product.defaultPrice);
};

export default function InventoryImport() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const draftId = searchParams.get("draftId");

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState("");

  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);

  const [items, setItems] = useState([]);
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const searchTimer = useRef(null);

  const totalQty = useMemo(
    () => items.reduce((sum, item) => sum + numberValue(item.qty), 0),
    [items],
  );

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + numberValue(item.qty) * numberValue(item.unitCost),
        0,
      ),
    [items],
  );

  const showMessage = (text, type = "success") => {
    setMessageType(type);
    setMessage(text);
  };

  const loadProducts = async (keyword) => {
    if (!keyword || keyword.trim().length < 2) {
      setProducts([]);
      return;
    }

    try {
      setLoadingProducts(true);

      const response = await axios.get(PRODUCTS_API, {
        params: {
          search: keyword,
          type: "all",
          page: 1,
          limit: 20,
        },
        headers: getHeaders(),
      });

      const data = response.data?.data || response.data;
      const list = Array.isArray(data) ? data : data?.products || [];

      setProducts(list);
    } catch (error) {
      console.error(error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(() => {
      loadProducts(search);
    }, 350);

    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const selectProduct = (product) => {
    setSelectedProduct(product || null);

    const variants = getVariants(product);
    const firstVariant = variants[0]?.name || "";

    setSelectedVariant(firstVariant);
    setUnitCost(getUnitCost(product, firstVariant));
    setQty(1);
  };

  useEffect(() => {
    if (!selectedProduct) return;

    setUnitCost(getUnitCost(selectedProduct, selectedVariant));
  }, [selectedVariant, selectedProduct]);

  const addItem = () => {
    if (!selectedProduct) {
      showMessage("Vui lòng chọn sản phẩm", "warning");
      return;
    }

    const quantity = numberValue(qty);
    const cost = numberValue(unitCost);

    if (quantity <= 0) {
      showMessage("Số lượng phải lớn hơn 0", "warning");
      return;
    }

    if (cost < 0) {
      showMessage("Giá vốn không hợp lệ", "warning");
      return;
    }

    const productId = selectedProduct._id;
    const variantName = selectedVariant || "";

    const newItem = {
      productId,
      productTitle: getProductTitle(selectedProduct),
      productCode:
        selectedProduct.code ||
        selectedProduct.productCode ||
        selectedProduct.sku ||
        "",
      thumbnail: getProductImage(selectedProduct),
      variantName,
      qty: quantity,
      unitCost: cost,
      currentQty: getCurrentQty(selectedProduct, variantName),
    };

    setItems((previous) => {
      const index = previous.findIndex(
        (item) =>
          String(item.productId) === String(productId) &&
          item.variantName === variantName,
      );

      if (index === -1) return [...previous, newItem];

      const next = [...previous];

      next[index] = {
        ...next[index],
        qty: numberValue(next[index].qty) + quantity,
        unitCost: cost,
      };

      return next;
    });

    setSelectedProduct(null);
    setSelectedVariant("");
    setSearch("");
    setQty(1);
    setUnitCost(0);
  };

  const updateItem = (index, field, value) => {
    setItems((previous) =>
      previous.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: numberValue(value),
            }
          : item,
      ),
    );
  };

  const removeItem = (index) => {
    setItems((previous) => previous.filter((_, i) => i !== index));
  };

  const buildPayload = () => ({
    supplier,
    note,
    items: items.map((item) => ({
      productId: item.productId,
      productTitle: item.productTitle,
      productCode: item.productCode,
      thumbnail: item.thumbnail,
      variantName: item.variantName,
      qty: numberValue(item.qty),
      unitCost: numberValue(item.unitCost),
      currentQty: numberValue(item.currentQty),
    })),
  });

  const resetForm = () => {
    setItems([]);
    setSupplier("");
    setNote("");
    setSelectedProduct(null);
    setSelectedVariant("");
    setSearch("");
    setQty(1);
    setUnitCost(0);
  };

  const loadDraft = async (id) => {
    try {
      setLoadingDraft(true);

      const response = await axios.get(`${DRAFTS_API}/${id}`, {
        headers: getHeaders(),
      });

      const draft = response.data?.draft;

      if (!draft) {
        throw new Error("Không tìm thấy dữ liệu phiếu nháp");
      }

      if (draft.status !== "draft") {
        showMessage("Phiếu này đã được nhập kho", "warning");
        setSearchParams({});
        return;
      }

      setSupplier(draft.supplier || "");
      setNote(draft.note || "");
      setItems(draft.items || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          error.message ||
          "Không tải được phiếu nháp",
        "error",
      );
    } finally {
      setLoadingDraft(false);
    }
  };

  useEffect(() => {
    if (draftId) loadDraft(draftId);
  }, [draftId]);

  const saveDraft = async () => {
    try {
      setSavingDraft(true);

      const payload = buildPayload();

      let response;

      if (draftId) {
        response = await axios.put(`${DRAFTS_API}/${draftId}`, payload, {
          headers: getHeaders(),
        });
      } else {
        response = await axios.post(DRAFTS_API, payload, {
          headers: getHeaders(),
        });
      }

      const draft = response.data?.draft;

      if (!draft?._id) {
        throw new Error("Server không trả về thông tin phiếu nháp");
      }

      if (!draftId) {
        setSearchParams({ draftId: draft._id });
      }

      showMessage("Đã lưu phiếu nhập nháp");
    } catch (error) {
      showMessage(
        error.response?.data?.message || error.message || "Lưu nháp thất bại",
        "error",
      );
    } finally {
      setSavingDraft(false);
    }
  };

  const submitImport = async () => {
    if (!items.length) {
      showMessage("Vui lòng thêm sản phẩm nhập kho", "warning");
      return;
    }

    const invalidItem = items.find(
      (item) =>
        !item.productId ||
        numberValue(item.qty) <= 0 ||
        numberValue(item.unitCost) < 0,
    );

    if (invalidItem) {
      showMessage("Vui lòng kiểm tra số lượng và giá vốn", "warning");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...buildPayload(),
        ...(draftId ? { draftId } : {}),
      };

      const response = await axios.post(
        `${BASE_URL}${INVENTORY_API}/batch-import-multiple`,
        payload,
        { headers: getHeaders() },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Nhập kho thất bại");
      }

      const receipt = response.data?.receipt;

      showMessage(
        `Nhập kho thành công${receipt?.code ? `: ${receipt.code}` : ""}`,
      );

      resetForm();
      setSearchParams({});
    } catch (error) {
      showMessage(
        error.response?.data?.message || error.message || "Nhập kho thất bại",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDraft) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Nhập kho
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Giá vốn được lưu bằng CNY (¥)
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            onClick={() => navigate("/admin/inventory-drafts")}
          >
            Phiếu nháp
          </Button>

          <Button
            variant="outlined"
            startIcon={<SaveOutlined />}
            onClick={saveDraft}
            disabled={savingDraft || submitting}
          >
            {savingDraft ? "Đang lưu..." : "Lưu nháp"}
          </Button>

          <Button
            variant="contained"
            startIcon={<Inventory2Outlined />}
            onClick={submitImport}
            disabled={submitting || savingDraft}
          >
            {submitting ? "Đang nhập..." : "Xác nhận nhập kho"}
          </Button>
        </Stack>
      </Stack>

      {draftId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Đang chỉnh sửa phiếu nháp: {draftId}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography fontWeight={700} mb={2}>
                Thông tin sản phẩm
              </Typography>

              <Stack spacing={2}>
                <ProductImageScanner
                  onResult={(result) => {
                    const text =
                      typeof result === "string"
                        ? result
                        : result?.text || result?.name || "";

                    if (text) setSearch(text);
                  }}
                />

                <Autocomplete
                  options={products}
                  loading={loadingProducts}
                  value={selectedProduct}
                  inputValue={search}
                  getOptionLabel={getProductTitle}
                  isOptionEqualToValue={(a, b) =>
                    String(a?._id) === String(b?._id)
                  }
                  onInputChange={(_, value) => setSearch(value)}
                  onChange={(_, value) => selectProduct(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tìm sản phẩm"
                      placeholder="Nhập tên, mã sản phẩm..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingProducts ? (
                              <CircularProgress size={18} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                {selectedProduct && (
                  <>
                    <Typography fontWeight={600}>
                      {getProductTitle(selectedProduct)}
                    </Typography>

                    {getVariants(selectedProduct).length > 0 && (
                      <TextField
                        select
                        label="Phân loại"
                        value={selectedVariant}
                        onChange={(event) =>
                          setSelectedVariant(event.target.value)
                        }
                        fullWidth
                      >
                        {getVariants(selectedProduct).map((variant) => (
                          <MenuItem
                            key={variant._id || variant.name}
                            value={variant.name}
                          >
                            {variant.name} — tồn: {numberValue(variant.qty)}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Số lượng nhập"
                          value={qty}
                          onChange={(event) => setQty(event.target.value)}
                          inputProps={{ min: 1 }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Giá vốn (CNY)"
                          value={unitCost}
                          onChange={(event) => setUnitCost(event.target.value)}
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                    </Grid>

                    <Button
                      variant="contained"
                      startIcon={<AddOutlined />}
                      onClick={addItem}
                    >
                      Thêm vào phiếu
                    </Button>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography fontWeight={700} mb={2}>
                Thông tin phiếu nhập
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Nhà cung cấp"
                  value={supplier}
                  onChange={(event) => setSupplier(event.target.value)}
                  fullWidth
                />

                <TextField
                  label="Ghi chú"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                />

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Tổng số lượng</Typography>
                  <Typography fontWeight={700}>{totalQty}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Tổng tiền hàng</Typography>
                  <Typography fontWeight={700} color="primary.main">
                    {formatMoney(totalAmount)}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography fontWeight={700} mb={2}>
                Danh sách hàng nhập ({items.length})
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sản phẩm</TableCell>
                      <TableCell>Phân loại</TableCell>
                      <TableCell align="right">Tồn hiện tại</TableCell>
                      <TableCell align="right">Số lượng nhập</TableCell>
                      <TableCell align="right">Giá vốn CNY</TableCell>
                      <TableCell align="right">Thành tiền</TableCell>
                      <TableCell align="center">Xóa</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={`${item.productId}-${item.variantName}`}>
                        <TableCell>
                          <Typography fontWeight={600}>
                            {item.productTitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.productCode}
                          </Typography>
                        </TableCell>

                        <TableCell>{item.variantName || "Mặc định"}</TableCell>

                        <TableCell align="right">
                          {numberValue(item.currentQty)}
                        </TableCell>

                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.qty}
                            onChange={(event) =>
                              updateItem(index, "qty", event.target.value)
                            }
                            inputProps={{ min: 0, style: { width: 70 } }}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.unitCost}
                            onChange={(event) =>
                              updateItem(index, "unitCost", event.target.value)
                            }
                            inputProps={{ min: 0, style: { width: 90 } }}
                          />
                        </TableCell>

                        <TableCell align="right">
                          {formatMoney(
                            numberValue(item.qty) * numberValue(item.unitCost),
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <IconButton
                            color="error"
                            onClick={() => removeItem(index)}
                          >
                            <DeleteOutline />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!items.length && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" py={3}>
                            Chưa có sản phẩm trong phiếu nhập
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={3500}
        onClose={() => setMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={messageType}
          onClose={() => setMessage("")}
          variant="filled"
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
