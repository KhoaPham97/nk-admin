import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import {
  Alert,
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
import ProductImageScanner from "../components/ProductImageScanner";

// ============================================================
// HELPERS
// ============================================================

const formatMoney = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("zh-CN");
};

const parseMoney = (value) => {
  return String(value ?? "").replace(/\D/g, "");
};

const getProductVariants = (product) => {
  if (!Array.isArray(product?.variants)) {
    return [];
  }

  return product.variants;
};

const getProductTitle = (product) => {
  return (
    product?.title || product?.name || product?.code || "Sản phẩm không tên"
  );
};

const getImageUrl = (thumbnail) => {
  if (!thumbnail) {
    return "";
  }

  const value = String(thumbnail);

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  return `/images/${value}`;
};

// ============================================================
// COMPONENT
// ============================================================

const InventoryImport = () => {
  const navigate = useNavigate();

  // ==========================================================
  // PRODUCTS
  // ==========================================================

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ==========================================================
  // SCAN
  // ==========================================================

  // Khi scan xong sẽ = true.
  // Sau khi API trả kết quả, nếu có sản phẩm thì tự chọn.
  const scanSearchPendingRef = useRef(false);

  // ==========================================================
  // SELECTED PRODUCT
  // ==========================================================

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState("");

  // ==========================================================
  // IMPORT INPUT
  // ==========================================================

  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");

  // ==========================================================
  // ITEMS
  // ==========================================================

  const [items, setItems] = useState([]);

  // ==========================================================
  // SAVING
  // ==========================================================

  const [saving, setSaving] = useState(false);

  // ==========================================================
  // SNACKBAR
  // ==========================================================

  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // ==========================================================
  // VARIANTS
  // ==========================================================

  const variants = useMemo(() => {
    return getProductVariants(selectedProduct);
  }, [selectedProduct]);

  // ==========================================================
  // SELECTED VARIANT OBJECT
  // ==========================================================

  const selectedVariantObject = useMemo(() => {
    if (!selectedProduct || !selectedVariant) {
      return null;
    }

    return (
      variants.find(
        (variant) => String(variant?.name || "") === String(selectedVariant),
      ) || null
    );
  }, [selectedProduct, selectedVariant, variants]);

  // ==========================================================
  // CURRENT STOCK
  // ==========================================================

  const currentSelectedQty = useMemo(() => {
    if (!selectedProduct) {
      return 0;
    }

    if (variants.length > 0) {
      return Number(selectedVariantObject?.qty || 0);
    }

    return Number(selectedProduct.qty || 0);
  }, [selectedProduct, variants, selectedVariantObject]);

  // ==========================================================
  // SELECT PRODUCT
  // AUTO SELECT FIRST VARIANT
  // ==========================================================

  const handleProductChange = (_, product) => {
    setSelectedProduct(product);

    setQty("");
    setUnitCost("");

    if (!product) {
      setSelectedVariant("");
      return;
    }

    const productVariants = getProductVariants(product);

    if (productVariants.length > 0) {
      const firstVariant = productVariants[0];

      setSelectedVariant(firstVariant?.name ? String(firstVariant.name) : "");
    } else {
      setSelectedVariant("");
    }
  };

  // ==========================================================
  // SEARCH PRODUCTS
  // ==========================================================

  const searchProducts = async (keyword) => {
    const search = String(keyword || "").trim();

    if (search.length < 2) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    try {
      setLoadingProducts(true);

      const response = await axios.get(API_ENDPOINTS.PRODUCTS, {
        params: {
          search,
          type: "all",
          page: 1,
          limit: 20,
        },
      });

      const data = response?.data;

      const productList =
        data?.products || data?.data?.products || data?.data || [];

      const result = Array.isArray(productList) ? productList : [];

      setProducts(result);

      // ======================================================
      // AUTO SELECT SAU KHI SCAN
      // ======================================================

      if (scanSearchPendingRef.current) {
        scanSearchPendingRef.current = false;

        if (result.length === 0) {
          showSnackbar(`Không tìm thấy sản phẩm với "${search}"`, "warning");
        } else {
          // Nếu chỉ có 1 kết quả -> chọn luôn
          if (result.length === 1) {
            const product = result[0];

            handleProductChange(null, product);

            showSnackbar(`Đã tìm thấy: ${getProductTitle(product)}`, "success");
          } else {
            // Có nhiều kết quả.
            // Ưu tiên kết quả title/name/code chứa keyword.
            const normalizedSearch = search.toLowerCase();

            const exactProduct = result.find((product) => {
              const title = String(
                product?.title || product?.name || "",
              ).toLowerCase();

              const code = String(product?.code || "").toLowerCase();

              const brand = String(product?.brand || "").toLowerCase();

              return (
                title.includes(normalizedSearch) ||
                code.includes(normalizedSearch) ||
                brand.includes(normalizedSearch)
              );
            });

            if (exactProduct) {
              handleProductChange(null, exactProduct);

              showSnackbar(
                `Đã chọn: ${getProductTitle(exactProduct)}`,
                "success",
              );
            } else {
              showSnackbar(
                `Tìm thấy ${result.length} sản phẩm. Vui lòng chọn sản phẩm.`,
                "info",
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("searchProducts:", error);

      setProducts([]);

      scanSearchPendingRef.current = false;

      showSnackbar(
        error?.response?.data?.message || "Không thể tìm kiếm sản phẩm",
        "error",
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  // ==========================================================
  // DEBOUNCE SEARCH
  // ==========================================================

  useEffect(() => {
    const keyword = productSearch.trim();

    if (keyword.length < 2) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    const timer = setTimeout(() => {
      searchProducts(keyword);
    }, 350);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // ==========================================================
  // SCANNER RESULT
  // ==========================================================

  const handleScannerResult = ({ chineseText, vietnameseText }) => {
    const vietnamese = String(vietnameseText || "").trim();
    const chinese = String(chineseText || "").trim();

    const keyword = vietnamese || chinese;

    if (!keyword) {
      showSnackbar("Không nhận diện được tên sản phẩm từ hình ảnh", "warning");

      return;
    }

    // Đánh dấu đây là search từ scanner.
    scanSearchPendingRef.current = true;

    // Clear sản phẩm cũ trước khi tìm sản phẩm mới.
    setSelectedProduct(null);
    setSelectedVariant("");
    setQty("");
    setUnitCost("");

    // Hiển thị text đã dịch vào ô tìm kiếm.
    setProductSearch(keyword);

    showSnackbar(
      vietnamese ? `Đã nhận diện: ${vietnamese}` : `Đã nhận diện: ${chinese}`,
      "info",
    );
  };

  // ==========================================================
  // CHANGE VARIANT
  // ==========================================================

  const handleVariantChange = (event) => {
    const value = String(event.target.value || "");

    setSelectedVariant(value);

    setQty("");
    setUnitCost("");
  };

  // ==========================================================
  // ADD ITEM
  // ==========================================================

  const handleAddItem = () => {
    if (!selectedProduct) {
      showSnackbar("Vui lòng chọn sản phẩm", "warning");
      return;
    }

    if (variants.length > 0 && !selectedVariant) {
      showSnackbar("Vui lòng chọn phân loại sản phẩm", "warning");
      return;
    }

    const quantity = Number(qty);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      showSnackbar("Số lượng nhập phải lớn hơn 0", "warning");
      return;
    }

    const price = Number(unitCost);

    if (!Number.isFinite(price) || price < 0) {
      showSnackbar("Giá nhập không hợp lệ", "warning");
      return;
    }

    const variant =
      variants.find(
        (item) => String(item?.name || "") === String(selectedVariant || ""),
      ) || null;

    const productId = String(selectedProduct?._id || "");

    if (!productId) {
      showSnackbar("Sản phẩm không có ID hợp lệ", "error");
      return;
    }

    const variantName = variant?.name ? String(variant.name) : "";

    const newItem = {
      productId,
      productTitle: getProductTitle(selectedProduct),
      variantName,
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
          String(item.productId) === String(newItem.productId) &&
          String(item.variantName || "") === String(newItem.variantName || ""),
      );

      if (index !== -1) {
        const clone = [...prev];

        const oldItem = clone[index];

        const nextQty = Number(oldItem.qty || 0) + Number(newItem.qty || 0);

        const nextUnitCost = Number(newItem.unitCost || 0);

        clone[index] = {
          ...oldItem,
          qty: nextQty,
          unitCost: nextUnitCost,
          total: nextQty * nextUnitCost,
        };

        return clone;
      }

      return [...prev, newItem];
    });

    setQty("");
    setUnitCost("");

    showSnackbar("Đã thêm sản phẩm vào phiếu nhập", "success");
  };

  // ==========================================================
  // DELETE ITEM
  // ==========================================================

  const handleDeleteItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ==========================================================
  // UPDATE ITEM QTY
  // ==========================================================

  const handleChangeQty = (index, value) => {
    const quantity = Math.max(Number(value) || 0, 0);

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return {
          ...item,
          qty: quantity,
          total: quantity * Number(item.unitCost || 0),
        };
      }),
    );
  };

  // ==========================================================
  // UPDATE ITEM UNIT COST
  // ==========================================================

  const handleChangeUnitCost = (index, value) => {
    const price = value ?? 0;

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }

        return {
          ...item,
          unitCost: price,
          total: Number(item.qty || 0) * price,
        };
      }),
    );
  };

  // ==========================================================
  // TOTAL QTY
  // ==========================================================

  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [items]);

  // ==========================================================
  // TOTAL AMOUNT
  // ==========================================================

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  }, [items]);

  // ==========================================================
  // VALIDATE
  // ==========================================================

  const validateBeforeSave = () => {
    if (items.length === 0) {
      showSnackbar("Chưa có sản phẩm nào trong phiếu nhập", "warning");

      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.productId) {
        showSnackbar(`Sản phẩm dòng ${i + 1} không hợp lệ`, "error");

        return false;
      }

      if (Number(item.qty || 0) <= 0) {
        showSnackbar(`Số lượng dòng ${i + 1} phải lớn hơn 0`, "warning");

        return false;
      }

      if (Number(item.unitCost || 0) < 0) {
        showSnackbar(`Giá nhập dòng ${i + 1} không hợp lệ`, "warning");

        return false;
      }
    }

    return true;
  };

  // ==========================================================
  // SAVE IMPORT
  // ==========================================================

  const handleSave = async () => {
    if (!validateBeforeSave()) {
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

      const token = localStorage.getItem("adminToken");

      const response = await axios.post(
        API_ENDPOINTS.INVENTORY_RECEIPTS,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response?.data?.success === false) {
        throw new Error(
          response?.data?.message || "Không thể lưu phiếu nhập kho",
        );
      }

      showSnackbar("Nhập kho thành công", "success");

      // ======================================================
      // RESET
      // ======================================================

      setItems([]);

      setSupplier("");

      setNote("");

      setSelectedProduct(null);

      setSelectedVariant("");

      setQty("");

      setUnitCost("");

      setProducts([]);

      setProductSearch("");

      scanSearchPendingRef.current = false;
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

  // ==========================================================
  // RENDER
  // ==========================================================

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
          {/* ==================================================
              TITLE + SCANNER
          ================================================== */}

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
              <Typography fontWeight={700}>Thêm sản phẩm nhập kho</Typography>

              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Tìm sản phẩm bằng tên, mã, thương hiệu hoặc quét hình ảnh
              </Typography>
            </Box>

            {/* ==================================================
                SCANNER
            ================================================== */}

            <ProductImageScanner onResult={handleScannerResult} />
          </Stack>

          {/* ==================================================
              SCAN SEARCH INFO
          ================================================== */}

          {productSearch.trim() && (
            <Paper
              variant="outlined"
              sx={{
                mb: 2,
                px: 2,
                py: 1.25,
                background: "rgba(25, 118, 210, 0.04)",
              }}
            >
              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={1}
                alignItems={{
                  xs: "flex-start",
                  sm: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Từ khóa tìm kiếm:
                </Typography>

                <Chip size="small" color="primary" label={productSearch} />
              </Stack>
            </Paper>
          )}

          <Grid container spacing={2}>
            {/* ==================================================
                PRODUCT
            ================================================== */}

            <Grid item xs={12} md={5}>
              <Autocomplete
                options={products}
                loading={loadingProducts}
                value={selectedProduct}
                onChange={handleProductChange}
                onInputChange={(_, value, reason) => {
                  if (reason === "input") {
                    scanSearchPendingRef.current = false;

                    setProductSearch(value);
                  }

                  if (reason === "clear") {
                    scanSearchPendingRef.current = false;

                    setProductSearch("");

                    setProducts([]);

                    setSelectedProduct(null);

                    setSelectedVariant("");

                    setQty("");

                    setUnitCost("");
                  }
                }}
                filterOptions={(options) => options}
                getOptionLabel={(option) => getProductTitle(option)}
                isOptionEqualToValue={(option, value) =>
                  option?._id === value?._id
                }
                noOptionsText={
                  productSearch.trim()
                    ? "Không tìm thấy sản phẩm"
                    : "Nhập tên, mã hoặc thương hiệu để tìm"
                }
                loadingText="Đang tìm sản phẩm..."
                renderOption={(props, option) => {
                  const imageUrl = getImageUrl(option?.thumbnail);

                  return (
                    <li {...props} key={option._id}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{
                          width: "100%",
                        }}
                      >
                        {imageUrl ? (
                          <Box
                            component="img"
                            src={imageUrl}
                            alt={getProductTitle(option)}
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 1,
                              objectFit: "cover",
                              flexShrink: 0,
                              background: "#f5f5f5",
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 1,
                              background: "#f1f3f5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Inventory2Outlined
                              fontSize="small"
                              color="disabled"
                            />
                          </Box>
                        )}

                        <Box
                          sx={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <Typography fontWeight={600} noWrap>
                            {getProductTitle(option)}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            alignItems="center"
                          >
                            {option.code && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Mã: {option.code}
                              </Typography>
                            )}

                            {option.brand && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                • {option.brand}
                              </Typography>
                            )}

                            <Typography
                              variant="caption"
                              color="primary"
                              fontWeight={600}
                            >
                              Tồn:{" "}
                              {Number(option.qty || 0).toLocaleString("vi-VN")}
                            </Typography>

                            {Array.isArray(option.variants) &&
                              option.variants.length > 0 && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  • {option.variants.length} phân loại
                                </Typography>
                              )}
                          </Stack>
                        </Box>
                      </Stack>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Sản phẩm"
                    placeholder="Nhập tên, mã, thương hiệu..."
                    helperText={
                      productSearch.trim()
                        ? "Đang tìm sản phẩm trên server"
                        : "Nhập ít nhất 2 ký tự để tìm hoặc quét ảnh"
                    }
                    InputProps={{
                      ...params.InputProps,

                      endAdornment: (
                        <>
                          {loadingProducts ? (
                            <CircularProgress size={20} />
                          ) : null}

                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* ==================================================
                VARIANT
            ================================================== */}

            <Grid item xs={12} md={3}>
              {variants.length > 0 ? (
                <Select
                  fullWidth
                  displayEmpty
                  value={selectedVariant}
                  onChange={handleVariantChange}
                  renderValue={(value) => {
                    if (!value) {
                      return (
                        <Typography color="text.secondary">
                          Chọn phân loại
                        </Typography>
                      );
                    }

                    return value;
                  }}
                >
                  <MenuItem value="">Chọn phân loại</MenuItem>

                  {variants.map((variant, index) => (
                    <MenuItem
                      key={`${variant?.name}-${index}`}
                      value={variant?.name || ""}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 2,
                        }}
                      >
                        <span>{variant?.name}</span>

                        <Typography variant="caption" color="text.secondary">
                          Tồn:{" "}
                          {Number(variant?.qty || 0).toLocaleString("vi-VN")}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              ) : (
                <TextField
                  fullWidth
                  disabled
                  value={selectedProduct ? "Sản phẩm không có phân loại" : ""}
                  label="Phân loại"
                  placeholder="Không có phân loại"
                />
              )}

              {selectedProduct && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mt: 0.5,
                  }}
                >
                  Tồn hiện tại: {currentSelectedQty.toLocaleString("vi-VN")}
                </Typography>
              )}
            </Grid>

            {/* ==================================================
                QTY
            ================================================== */}

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                type="number"
                label="Số lượng"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputProps={{
                  min: 1,
                  step: 1,
                }}
              />
            </Grid>

            {/* ==================================================
                PRICE
            ================================================== */}

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Giá nhập"
                value={unitCost ? unitCost : ""}
                onChange={(e) => {
                  const value = e.target.value;

                  setUnitCost(value);
                }}
                placeholder="VD: 25.000"
                InputProps={{
                  endAdornment: "¥",
                }}
              />
            </Grid>

            {/* ==================================================
                CURRENT STOCK
            ================================================== */}

            {selectedProduct && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    background: "#fafafa",
                  }}
                >
                  <Stack
                    direction={{
                      xs: "column",
                      sm: "row",
                    }}
                    spacing={{
                      xs: 0.5,
                      sm: 3,
                    }}
                  >
                    <Typography variant="body2">
                      Sản phẩm:{" "}
                      <strong>{getProductTitle(selectedProduct)}</strong>
                    </Typography>

                    {selectedVariant && (
                      <Typography variant="body2">
                        Phân loại: <strong>{selectedVariant}</strong>
                      </Typography>
                    )}

                    <Typography variant="body2">
                      Tồn hiện tại:{" "}
                      <strong>
                        {currentSelectedQty.toLocaleString("vi-VN")}
                      </strong>
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            )}

            {/* ==================================================
                BUTTON
            ================================================== */}

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={handleAddItem}
                disabled={!selectedProduct}
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
                {items.length} dòng · {totalQty.toLocaleString("vi-VN")} sản
                phẩm
              </Typography>
            </Box>

            <Chip
              label={`Tổng: ${formatMoney(totalAmount)} ¥`}
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
                  {items.map((item, index) => {
                    const imageUrl = getImageUrl(item.thumbnail);

                    return (
                      <TableRow
                        key={`${item.productId}-${item.variantName}-${index}`}
                      >
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                          >
                            {imageUrl ? (
                              <Box
                                component="img"
                                src={imageUrl}
                                alt={item.productTitle}
                                sx={{
                                  width: 46,
                                  height: 46,
                                  borderRadius: 1,
                                  objectFit: "cover",
                                  background: "#f5f5f5",
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 46,
                                  height: 46,
                                  borderRadius: 1,
                                  background: "#f1f3f5",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Inventory2Outlined
                                  fontSize="small"
                                  color="disabled"
                                />
                              </Box>
                            )}

                            <Typography fontWeight={600}>
                              {item.productTitle}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          {item.variantName ? (
                            <Chip size="small" label={item.variantName} />
                          ) : (
                            <Chip size="small" label="Mặc định" />
                          )}
                        </TableCell>

                        <TableCell align="right">
                          {Number(item.currentQty || 0).toLocaleString("zh-CN")}
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
                              step: 1,
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
                            value={item.unitCost ? item.unitCost : ""}
                            onChange={(e) =>
                              handleChangeUnitCost(index, e.target.value)
                            }
                            InputProps={{
                              endAdornment: "¥",
                            }}
                            inputProps={{
                              style: {
                                textAlign: "right",
                              },
                            }}
                            sx={{
                              width: 145,
                            }}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Typography fontWeight={600}>
                            {formatMoney(item.total)} ¥
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteItem(index)}
                            disabled={saving}
                          >
                            <DeleteOutline />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                    {formatMoney(totalAmount)} ¥
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

      {/* ======================================================
          SNACKBAR
      ====================================================== */}

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
