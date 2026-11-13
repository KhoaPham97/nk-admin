import React, { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Tooltip,
} from "@mui/material";

import { Add, Delete, Save, ContentCopy } from "@mui/icons-material";

import axios from "axios";
import { API_ENDPOINTS } from "../../../../api";

const API_URL = API_ENDPOINTS || "";

const TYPE_NAME = {
  1: "Phụ tùng xe đạp",
  2: "Phụ tùng xe điện",
  3: "Phụ tùng xe ba gác",
};

// =====================================================
// FORMAT
// =====================================================

const formatVND = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const number = Number(String(value).replace(/\D/g, ""));

  if (!Number.isFinite(number)) return "";

  return new Intl.NumberFormat("vi-VN").format(number);
};

const parseVND = (value) => {
  return String(value || "").replace(/\D/g, "");
};

const formatNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(Number(value) || 0);
};

const parseNumber = (value) => {
  return String(value ?? "").replace(/,/g, "");
};

// =====================================================
// EMPTY VARIANT
// =====================================================

const emptyVariant = () => ({
  name: "",

  // Backend tự sinh
  variantCode: "",
  sku: "",

  price: "",
  defaultPrice: "",
  unitCost: "",
  weight: "",

  qty: 0,

  // Chỉ hiển thị, không cho nhập khi tạo mới
  reservedQty: 0,

  packageQuantity: 1,

  thumbnail: "",
  image: "",
});

// =====================================================
// INITIAL FORM
// =====================================================

const initialForm = {
  title: "",
  type: "1",

  price: "",
  rating: 5,
  shopeeItemId: "",
  shopeeShopId: "",
  originalPrice: "",

  thumbnail: "",
  images: [],

  detail: "",
  description: "",

  qty: 0,
  stock: "0",

  brand: "",

  categoryId: "",
  category: "",

  isVisible: true,

  compatibleVehicles: [],

  variants: [],
};

// =====================================================
// COPY
// =====================================================

const copyText = async (value) => {
  if (!value) return;

  try {
    await navigator.clipboard.writeText(String(value));
    alert("Đã sao chép: " + value);
  } catch (error) {
    console.error("Copy error:", error);
    alert("Không thể sao chép");
  }
};

// =====================================================
// COMPONENT
// =====================================================

export default function CreateProduct() {
  const [form, setForm] = useState(initialForm);

  const [categories, setCategories] = useState([]);

  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // LOAD CATEGORY
  // =====================================================

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await axios.get(`${API_URL.PRODUCTS_CATEGORIES}`);

      const list = res.data?.categorys || res.data?.data || [];

      setCategories(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Load categories error:", error);
      setErrorMessage("Không thể tải danh mục sản phẩm");
    }
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (field) => (event) => {
    const value = event.target.value;

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // =====================================================
  // TYPE
  // =====================================================

  const handleTypeChange = (event) => {
    const value = String(event.target.value);

    if (!["1", "2", "3"].includes(value)) return;

    setForm((prev) => ({
      ...prev,
      type: value,
      categoryId: "",
      category: "",
    }));
  };

  // =====================================================
  // CATEGORY
  // =====================================================

  const handleCategoryChange = (event) => {
    const categoryId = event.target.value;

    const category = categories.find(
      (item) => String(item._id) === String(categoryId),
    );

    setForm((prev) => ({
      ...prev,
      categoryId,
      category: category?.name || category?.title || "",
    }));
  };

  // =====================================================
  // COMPATIBLE VEHICLES
  // =====================================================

  const handleCompatibleVehiclesChange = (event) => {
    const values = event.target.value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    setForm((prev) => ({
      ...prev,
      compatibleVehicles: [...new Set(values)],
    }));
  };

  // =====================================================
  // VARIANTS
  // =====================================================

  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, emptyVariant()],
    }));
  };

  const removeVariant = (index) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const updateVariant = (index, field, value) => {
    // Không cho sửa mã do backend quản lý
    if (["variantCode", "sku", "reservedQty"].includes(field)) {
      return;
    }

    setForm((prev) => {
      const variants = [...prev.variants];

      variants[index] = {
        ...variants[index],
        [field]: value,
      };

      return {
        ...prev,
        variants,
      };
    });
  };

  // =====================================================
  // TOTAL VARIANT QTY
  // =====================================================

  const totalVariantQty = useMemo(() => {
    return form.variants.reduce(
      (total, variant) => total + (Number(variant.qty) || 0),
      0,
    );
  }, [form.variants]);

  // =====================================================
  // AUTO UPDATE PRODUCT QTY
  // =====================================================

  useEffect(() => {
    if (form.variants.length > 0) {
      setForm((prev) => ({
        ...prev,
        qty: totalVariantQty,
        stock: String(totalVariantQty),
      }));
    }
  }, [totalVariantQty, form.variants.length]);

  // =====================================================
  // VALIDATE
  // =====================================================

  const validate = () => {
    if (!form.title.trim()) {
      alert("Vui lòng nhập tên sản phẩm");
      return false;
    }

    if (!["1", "2", "3"].includes(String(form.type))) {
      alert("Vui lòng chọn loại sản phẩm");
      return false;
    }

    if (!form.categoryId) {
      alert("Vui lòng chọn danh mục");
      return false;
    }

    if (Number(form.rating) < 0 || Number(form.rating) > 5) {
      alert("Rating phải từ 0 đến 5");
      return false;
    }

    if (Number(form.qty) < 0) {
      alert("Số lượng sản phẩm không hợp lệ");
      return false;
    }

    if (Number(form.price || 0) < 0) {
      alert("Giá bán không hợp lệ");
      return false;
    }

    if (Number(form.originalPrice || 0) < 0) {
      alert("Giá gốc không hợp lệ");
      return false;
    }

    for (let i = 0; i < form.variants.length; i++) {
      const variant = form.variants[i];

      if (!String(variant.name || "").trim()) {
        alert(`Vui lòng nhập tên phân loại dòng ${i + 1}`);
        return false;
      }

      if (Number(variant.qty) < 0) {
        alert(`Số lượng dòng ${i + 1} không hợp lệ`);
        return false;
      }

      if (Number(variant.price || 0) < 0) {
        alert(`Giá bán dòng ${i + 1} không hợp lệ`);
        return false;
      }

      if (Number(variant.defaultPrice || 0) < 0) {
        alert(`Giá gốc dòng ${i + 1} không hợp lệ`);
        return false;
      }

      if (Number(variant.unitCost || 0) < 0) {
        alert(`Giá vốn dòng ${i + 1} không hợp lệ`);
        return false;
      }

      if (Number(variant.weight || 0) < 0) {
        alert(`Cân nặng dòng ${i + 1} không hợp lệ`);
        return false;
      }

      const packageQuantity = Number(variant.packageQuantity);

      if (!Number.isInteger(packageQuantity) || packageQuantity < 1) {
        alert(`Số lượng/kiện dòng ${i + 1} phải là số nguyên lớn hơn 0`);
        return false;
      }
    }

    return true;
  };

  // =====================================================
  // SAVE PRODUCT
  // =====================================================

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setErrorMessage("");

      const productType = String(form.type);

      const finalQty =
        form.variants.length > 0 ? totalVariantQty : Number(form.qty || 0);

      const finalStock =
        form.variants.length > 0
          ? String(totalVariantQty)
          : String(form.stock || "0");

      // =================================================
      // PAYLOAD
      // =================================================

      const payload = {
        title: form.title.trim(),

        type: productType,

        price: String(form.price || "0"),

        originalPrice: String(form.originalPrice || "0"),

        rating: Number(form.rating || 0),

        shopeeItemId: String(form.shopeeItemId || "").trim(),
        shopeeShopId: String(form.shopeeShopId || "").trim(),

        thumbnail: form.thumbnail || "",

        images: form.images || [],

        detail: form.detail || "",

        description: form.description || "",

        qty: finalQty,

        stock: finalStock,

        brand: form.brand || "",

        categoryId: form.categoryId,

        category: form.category || "",

        isVisible: Boolean(form.isVisible),

        compatibleVehicles: form.compatibleVehicles || [],

        variants: form.variants.map((variant) => ({
          name: String(variant.name || "").trim(),

          // Không gửi variantCode và sku.
          // Backend tự sinh hai mã này.

          price: String(variant.price || "0"),

          defaultPrice: String(variant.defaultPrice || "0"),

          // Giá vốn lưu bằng CNY
          unitCost: Number(variant.unitCost || 0),

          weight: Number(variant.weight || 0),

          qty: Number(variant.qty || 0),

          // Không gửi reservedQty khi tạo mới
          packageQuantity: Number(variant.packageQuantity || 1),

          thumbnail: variant.thumbnail || "",

          image: variant.image || "",
        })),
      };

      const response = await axios.post(API_URL.PRODUCTS, payload);

      alert("Thêm sản phẩm thành công!");

      console.log("Created product:", response.data);

      setForm({
        ...initialForm,
        type: productType,
      });
    } catch (error) {
      console.error("Create product error:", error);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Không thể thêm sản phẩm";

      setErrorMessage(message);
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // RESET
  // =====================================================

  const handleReset = () => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa dữ liệu đang nhập?");

    if (!confirmed) return;

    setForm({
      ...initialForm,
      type: "1",
    });

    setErrorMessage("");
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const getTypeName = (type) => {
    return TYPE_NAME[String(type)] || "";
  };

  const getPackageInfo = (variant) => {
    const perPackage = Number(variant.packageQuantity);
    const qty = Number(variant.qty) || 0;

    if (!Number.isInteger(perPackage) || perPackage < 1) {
      return "Nhập số nguyên ≥ 1";
    }

    return `${Math.floor(qty / perPackage)} kiện + ${qty % perPackage} cái lẻ`;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#f5f6f8",
        p: { xs: 2, md: 3 },
      }}
    >
      {/* HEADER */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Nhập sản phẩm
          </Typography>

          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Thêm sản phẩm mới vào hệ thống Nhật Khang Bike
          </Typography>
        </Box>

        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={handleReset} disabled={saving}>
            Hủy
          </Button>

          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu sản phẩm"}
          </Button>
        </Box>
      </Box>

      {errorMessage && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setErrorMessage("")}
        >
          {errorMessage}
        </Alert>
      )}

      {/* =====================================================
          THÔNG TIN SẢN PHẨM
      ===================================================== */}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Thông tin sản phẩm
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                required
                label="Tên sản phẩm"
                value={form.title}
                onChange={handleChange("title")}
                placeholder="VD: Bạc đạn 6205ZZ"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Thương hiệu"
                value={form.brand}
                onChange={handleChange("brand")}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                required
                label="Loại sản phẩm"
                value={form.type}
                onChange={handleTypeChange}
                helperText={`Đang chọn: ${getTypeName(form.type)}`}
              >
                <MenuItem value="1">1 - Phụ tùng xe đạp</MenuItem>
                <MenuItem value="2">2 - Phụ tùng xe điện</MenuItem>
                <MenuItem value="3">3 - Phụ tùng xe ba gác</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                required
                label="Danh mục"
                value={form.categoryId}
                onChange={handleCategoryChange}
              >
                <MenuItem value="">Chọn danh mục</MenuItem>

                {categories
                  .filter((item) => String(item.type) === form.type)
                  .map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.name || category.title}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Giá bán (VND)"
                value={formatVND(form.price)}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    price: parseVND(event.target.value),
                  }));
                }}
                InputProps={{ endAdornment: "₫" }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Giá gốc (VND)"
                value={formatVND(form.originalPrice)}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    originalPrice: parseVND(event.target.value),
                  }));
                }}
                InputProps={{ endAdornment: "₫" }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Rating"
                value={form.rating}
                onChange={handleChange("rating")}
                inputProps={{ min: 0, max: 5, step: 0.1 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label={form.variants.length ? "Tổng số lượng" : "Số lượng"}
                value={form.qty}
                onChange={handleChange("qty")}
                disabled={form.variants.length > 0}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Stock"
                value={form.stock}
                onChange={handleChange("stock")}
                disabled={form.variants.length > 0}
              />
            </Grid>

            <Grid item xs={12} md={9}>
              <TextField
                fullWidth
                label="Thumbnail"
                value={form.thumbnail}
                onChange={handleChange("thumbnail")}
                placeholder="/images/product.jpg hoặc URL ảnh"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Danh sách hình ảnh"
                value={form.images.join("\n")}
                onChange={(event) => {
                  const images = event.target.value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean);

                  setForm((prev) => ({
                    ...prev,
                    images,
                  }));
                }}
                placeholder={"/images/a.jpg\n/images/b.jpg"}
                helperText="Mỗi hình ảnh nhập một dòng"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Xe tương thích"
                value={form.compatibleVehicles.join(", ")}
                onChange={handleCompatibleVehiclesChange}
                placeholder="VD: m133, xe 133, VC 2021"
                helperText="Nhập các dòng xe, phân cách bằng dấu phẩy hoặc xuống dòng"
              />
              <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                {form.compatibleVehicles.map((vehicle) => (
                  <Chip
                    key={vehicle}
                    label={vehicle}
                    size="small"
                    onDelete={() =>
                      setForm((prev) => ({
                        ...prev,
                        compatibleVehicles: prev.compatibleVehicles.filter(
                          (item) => item !== vehicle,
                        ),
                      }))
                    }
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isVisible}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isVisible: event.target.checked,
                      }))
                    }
                  />
                }
                label={form.isVisible ? "Đang hiển thị" : "Đang ẩn"}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* =====================================================
          VARIANTS
      ===================================================== */}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            flexDirection={{ xs: "column", md: "row" }}
            gap={2}
            mb={2}
          >
            <Box>
              <Typography fontWeight={700}>Phân loại sản phẩm</Typography>

              <Typography variant="body2" color="text.secondary">
                Quản lý SKU, mã biến thể, giá vốn và tồn kho từng phân loại
              </Typography>
            </Box>

            <Button variant="outlined" startIcon={<Add />} onClick={addVariant}>
              Thêm phân loại
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            SKU và Variant Code sẽ được backend tự động cấp khi lưu sản phẩm.
            Form không cho phép chỉnh sửa hai mã này.
          </Alert>

          {form.variants.length === 0 ? (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
                background: "#f8f9fa",
                borderRadius: 2,
              }}
            >
              <Typography color="text.secondary">
                Sản phẩm chưa có phân loại
              </Typography>
            </Box>
          ) : (
            form.variants.map((variant, index) => (
              <Card
                key={index}
                variant="outlined"
                sx={{ mb: 2, borderRadius: 2 }}
              >
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Typography fontWeight={700}>
                      Phân loại #{index + 1}
                    </Typography>

                    <IconButton
                      color="error"
                      onClick={() => removeVariant(index)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    {/* NAME */}

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        required
                        label="Tên phân loại"
                        value={variant.name}
                        onChange={(event) =>
                          updateVariant(index, "name", event.target.value)
                        }
                        placeholder="VD: 20*50"
                      />
                    </Grid>

                    {/* VARIANT CODE */}

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Variant Code"
                        value={variant.variantCode}
                        disabled
                        placeholder="Backend tự sinh khi lưu"
                        InputProps={{
                          endAdornment: variant.variantCode ? (
                            <Tooltip title="Sao chép">
                              <IconButton
                                size="small"
                                onClick={() => copyText(variant.variantCode)}
                              >
                                <ContentCopy fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : null,
                        }}
                      />
                    </Grid>

                    {/* SKU */}

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="SKU"
                        value={variant.sku}
                        disabled
                        placeholder="Backend tự sinh khi lưu"
                        InputProps={{
                          endAdornment: variant.sku ? (
                            <Tooltip title="Sao chép">
                              <IconButton
                                size="small"
                                onClick={() => copyText(variant.sku)}
                              >
                                <ContentCopy fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : null,
                        }}
                      />
                    </Grid>

                    {/* SELL PRICE */}

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Giá bán (VND)"
                        value={formatVND(variant.price)}
                        onChange={(event) =>
                          updateVariant(
                            index,
                            "price",
                            parseVND(event.target.value),
                          )
                        }
                        InputProps={{ endAdornment: "₫" }}
                      />
                    </Grid>

                    {/* DEFAULT PRICE */}

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Giá gốc (CNY)"
                        value={variant.defaultPrice}
                        onChange={(event) =>
                          updateVariant(
                            index,
                            "defaultPrice",
                            event.target.value,
                          )
                        }
                        InputProps={{ endAdornment: "¥" }}
                      />
                    </Grid>

                    {/* UNIT COST */}

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Giá vốn (CNY)"
                        value={variant.unitCost}
                        onChange={(event) =>
                          updateVariant(index, "unitCost", event.target.value)
                        }
                        type="number"
                        inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{ endAdornment: "¥" }}
                        helperText="Lưu vào variants.unitCost"
                      />
                    </Grid>

                    {/* WEIGHT */}

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Cân nặng"
                        value={variant.weight}
                        onChange={(event) =>
                          updateVariant(index, "weight", event.target.value)
                        }
                        type="number"
                        inputProps={{
                          min: 0,
                          step: 0.001,
                        }}
                        InputProps={{ endAdornment: "kg" }}
                      />
                    </Grid>

                    {/* QTY */}

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Tồn kho"
                        value={variant.qty}
                        onChange={(event) =>
                          updateVariant(
                            index,
                            "qty",
                            Math.max(0, Number(event.target.value) || 0),
                          )
                        }
                        type="number"
                        inputProps={{ min: 0, step: 1 }}
                      />
                    </Grid>

                    {/* RESERVED QTY */}

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Đang giữ (reservedQty)"
                        value={variant.reservedQty || 0}
                        disabled
                        helperText="Được quản lý bởi đơn hàng"
                      />
                    </Grid>

                    {/* PACKAGE QUANTITY */}

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Số lượng / kiện"
                        value={variant.packageQuantity}
                        onChange={(event) =>
                          updateVariant(
                            index,
                            "packageQuantity",
                            event.target.value,
                          )
                        }
                        inputProps={{ min: 1, step: 1 }}
                        error={
                          !Number.isInteger(Number(variant.packageQuantity)) ||
                          Number(variant.packageQuantity) < 1
                        }
                        helperText={getPackageInfo(variant)}
                      />
                    </Grid>

                    {/* VARIANT THUMBNAIL */}

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Thumbnail biến thể"
                        value={variant.thumbnail}
                        onChange={(event) =>
                          updateVariant(index, "thumbnail", event.target.value)
                        }
                        placeholder="/images/variant.jpg hoặc URL ảnh"
                      />
                    </Grid>

                    {/* VARIANT IMAGE */}

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Image biến thể"
                        value={variant.image}
                        onChange={(event) =>
                          updateVariant(index, "image", event.target.value)
                        }
                        placeholder="/images/variant-detail.jpg hoặc URL ảnh"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))
          )}

          {form.variants.length > 0 && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                background: "#f5f6f8",
                borderRadius: 2,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Typography fontWeight={600}>
                Tổng tồn kho các phân loại
              </Typography>

              <Typography fontWeight={700}>
                {totalVariantQty.toLocaleString("vi-VN")}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* =====================================================
          DESCRIPTION
      ===================================================== */}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Liên kết Shopee
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Shopee Item ID" value={form.shopeeItemId} onChange={handleChange("shopeeItemId")} helperText="ID sản phẩm Shopee dùng để lấy đánh giá." />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Shopee Shop ID" value={form.shopeeShopId} onChange={handleChange("shopeeShopId")} helperText="Có thể để trống nếu chỉ kết nối một gian hàng." />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Nội dung sản phẩm
          </Typography>

          <TextField
            fullWidth
            label="Mô tả"
            value={form.description}
            onChange={handleChange("description")}
            multiline
            minRows={4}
            placeholder="Nhập mô tả ngắn về sản phẩm..."
          />

          <TextField
            fullWidth
            label="Chi tiết"
            value={form.detail}
            onChange={handleChange("detail")}
            multiline
            minRows={4}
            sx={{ mt: 2 }}
            placeholder="Nhập thông tin chi tiết sản phẩm..."
          />
        </CardContent>
      </Card>

      {/* FOOTER */}

      <Box display="flex" justifyContent="flex-end" gap={2} pb={3}>
        <Button variant="outlined" onClick={handleReset} disabled={saving}>
          Hủy
        </Button>

        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Đang lưu..." : "Lưu sản phẩm"}
        </Button>
      </Box>
    </Box>
  );
}
