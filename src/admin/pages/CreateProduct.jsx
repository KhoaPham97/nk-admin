import React, { useEffect, useMemo, useState } from "react";

import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import { Add, Delete, Save } from "@mui/icons-material";

import axios from "axios";
import { API_ENDPOINTS } from "../../api";

const API_URL = API_ENDPOINTS || "";

// =========================================================
// TYPE NAME
// =========================================================

const TYPE_NAME = {
  1: "Phụ tùng xe đạp",
  2: "Phụ tùng xe điện",
  3: "Phụ tùng xe ba gác",
};

// =========================================================
// VARIANT
// =========================================================

const emptyVariant = () => ({
  name: "",
  price: "",
  qty: 0,
});

// =========================================================
// INITIAL FORM
// =========================================================

const initialForm = {
  title: "",

  // =======================================================
  // TYPE
  //
  // 1 = Phụ tùng xe đạp
  // 2 = Phụ tùng xe điện
  // 3 = Phụ tùng xe ba gác
  // =======================================================

  type: "1",

  price: "",

  rating: 5,

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

  variants: [],
};

// =========================================================
// CREATE PRODUCT
// =========================================================

export default function CreateProduct() {
  const [form, setForm] = useState(initialForm);

  const [categories, setCategories] = useState([]);

  const [saving, setSaving] = useState(false);

  // =======================================================
  // LOAD CATEGORY
  // =======================================================

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

      alert("Không thể tải danh mục sản phẩm");
    }
  };

  // =======================================================
  // HANDLE FORM
  // =======================================================

  const handleChange = (field) => (event) => {
    const value = event.target.value;

    setForm((prev) => ({
      ...prev,

      [field]: value,
    }));
  };

  // =======================================================
  // TYPE
  // =======================================================

  const handleTypeChange = (event) => {
    const value = String(event.target.value);

    if (!["1", "2", "3"].includes(value)) {
      return;
    }

    setForm((prev) => ({
      ...prev,

      type: value,
    }));
  };

  // =======================================================
  // CATEGORY
  // =======================================================

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

    // =====================================================
    // IMPORTANT
    //
    // Category KHÔNG tự động thay đổi type.
    // Type được chọn độc lập ở Select phía trên.
    // =====================================================
  };

  // =======================================================
  // VARIANTS
  // =======================================================

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
    setForm((prev) => {
      const variants = [...prev.variants];

      variants[index] = {
        ...variants[index],

        [field]: field === "qty" ? Number(value) || 0 : value,
      };

      return {
        ...prev,

        variants,
      };
    });
  };

  // =======================================================
  // TOTAL VARIANT QTY
  // =======================================================

  const totalVariantQty = useMemo(() => {
    return form.variants.reduce(
      (total, variant) => total + Number(variant.qty || 0),
      0,
    );
  }, [form.variants]);

  // =======================================================
  // AUTO UPDATE QTY / STOCK
  // =======================================================

  useEffect(() => {
    if (form.variants.length > 0) {
      setForm((prev) => ({
        ...prev,

        qty: totalVariantQty,

        stock: String(totalVariantQty),
      }));
    }
  }, [totalVariantQty, form.variants.length]);

  // =======================================================
  // GET TYPE NAME
  // =======================================================

  const getTypeName = (type) => {
    return TYPE_NAME[String(type)] || "";
  };

  // =======================================================
  // VALIDATE
  // =======================================================

  const validate = () => {
    // =====================================================
    // TITLE
    // =====================================================

    if (!form.title.trim()) {
      alert("Vui lòng nhập tên sản phẩm");

      return false;
    }

    // =====================================================
    // TYPE
    // =====================================================

    const productType = String(form.type || "");

    if (!["1", "2", "3"].includes(productType)) {
      alert("Vui lòng chọn loại sản phẩm");

      return false;
    }

    // =====================================================
    // CATEGORY
    // =====================================================

    if (!form.categoryId) {
      alert("Vui lòng chọn danh mục");

      return false;
    }

    // =====================================================
    // VARIANTS
    // =====================================================

    if (form.variants.length > 0) {
      for (let i = 0; i < form.variants.length; i++) {
        const variant = form.variants[i];

        if (!String(variant.name || "").trim()) {
          alert(`Vui lòng nhập tên phân loại dòng ${i + 1}`);

          return false;
        }

        if (Number(variant.qty) < 0) {
          alert(`Số lượng phân loại dòng ${i + 1} không hợp lệ`);

          return false;
        }

        if (Number(variant.price || 0) < 0) {
          alert(`Giá phân loại dòng ${i + 1} không hợp lệ`);

          return false;
        }
      }
    }

    return true;
  };

  // =======================================================
  // SAVE PRODUCT
  // =======================================================

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSaving(true);

      // ===================================================
      // TYPE
      // ===================================================

      const productType = String(form.type);

      // ===================================================
      // QTY
      // ===================================================

      const finalQty =
        form.variants.length > 0 ? totalVariantQty : Number(form.qty || 0);

      // ===================================================
      // STOCK
      // ===================================================

      const finalStock =
        form.variants.length > 0
          ? String(totalVariantQty)
          : String(form.stock || "0");

      // ===================================================
      // PAYLOAD
      // ===================================================

      const payload = {
        // =================================================
        // BASIC
        // =================================================

        title: form.title.trim(),

        // =================================================
        // TYPE
        //
        // Luôn lưu String:
        // "1"
        // "2"
        // "3"
        // =================================================

        type: productType,

        // =================================================
        // PRICE
        // =================================================

        price: String(form.price || "0"),

        originalPrice: String(form.originalPrice || ""),

        // =================================================
        // RATING
        // =================================================

        rating: Number(form.rating || 0),

        // =================================================
        // IMAGES
        // =================================================

        thumbnail: form.thumbnail || "",

        images: form.images || [],

        // =================================================
        // CONTENT
        // =================================================

        detail: form.detail || "",

        description: form.description || "",

        // =================================================
        // QTY
        // =================================================

        qty: finalQty,

        stock: finalStock,

        // =================================================
        // BRAND
        // =================================================

        brand: form.brand || "",

        // =================================================
        // CATEGORY
        // =================================================

        categoryId: form.categoryId,

        category: form.category || "",

        // =================================================
        // VARIANTS
        // =================================================

        variants: form.variants.map((variant) => ({
          name: String(variant.name || "").trim(),

          price: String(variant.price || "0"),

          qty: Number(variant.qty || 0),
        })),
      };

      console.log("CREATE PRODUCT PAYLOAD:", payload);

      // ===================================================
      // API CREATE
      // ===================================================

      const response = await axios.post(API_URL.PRODUCTS, payload);

      console.log("Create product:", response.data);

      alert("Thêm sản phẩm thành công!");

      // ===================================================
      // RESET
      // ===================================================

      setForm({
        ...initialForm,

        type: productType,
      });
    } catch (error) {
      console.error("Create product error:", error);

      alert(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Không thể thêm sản phẩm",
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // RESET
  // =======================================================

  const handleReset = () => {
    const confirmReset = window.confirm(
      "Bạn có chắc muốn xóa dữ liệu đang nhập?",
    );

    if (!confirmReset) {
      return;
    }

    setForm({
      ...initialForm,

      type: "1",
    });
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <Box
      sx={{
        minHeight: "100vh",

        background: "#f5f6f8",

        p: {
          xs: 2,
          md: 3,
        },
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <Box
        sx={{
          display: "flex",

          justifyContent: "space-between",

          alignItems: {
            xs: "flex-start",
            md: "center",
          },

          flexDirection: {
            xs: "column",
            md: "row",
          },

          gap: 2,

          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Nhập sản phẩm
          </Typography>

          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Thêm sản phẩm mới vào hệ thống
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",

            gap: 1,
          }}
        >
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

      {/* =====================================================
          THÔNG TIN SẢN PHẨM
      ===================================================== */}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Thông tin sản phẩm
          </Typography>

          <Grid container spacing={2}>
            {/* =================================================
                TÊN
            ================================================= */}

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Tên sản phẩm *"
                value={form.title}
                onChange={handleChange("title")}
                placeholder="VD: Bạc đạn 6205ZZ"
              />
            </Grid>

            {/* =================================================
                THƯƠNG HIỆU
            ================================================= */}

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Thương hiệu"
                value={form.brand}
                onChange={handleChange("brand")}
              />
            </Grid>

            {/* =================================================
                LOẠI SẢN PHẨM
            ================================================= */}

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                required
                label="Loại sản phẩm *"
                value={form.type}
                onChange={handleTypeChange}
                helperText={
                  form.type
                    ? `Đang chọn: ${getTypeName(form.type)}`
                    : "Vui lòng chọn loại sản phẩm"
                }
              >
                <MenuItem value="">Chọn loại sản phẩm</MenuItem>

                <MenuItem value="1">1 - Phụ tùng xe đạp</MenuItem>

                <MenuItem value="2">2 - Phụ tùng xe điện</MenuItem>

                <MenuItem value="3">3 - Phụ tùng xe ba gác</MenuItem>
              </TextField>
            </Grid>

            {/* =================================================
                DANH MỤC
            ================================================= */}

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                required
                label="Danh mục *"
                value={form.categoryId}
                onChange={handleCategoryChange}
              >
                <MenuItem value="">Chọn danh mục</MenuItem>

                {categories.map((category) => (
                  <MenuItem key={category._id} value={category._id}>
                    {category.name || category.title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* =================================================
                GIÁ BÁN
            ================================================= */}

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Giá bán"
                value={form.price}
                onChange={handleChange("price")}
                type="number"
                inputProps={{
                  min: 0,
                }}
              />
            </Grid>

            {/* =================================================
                GIÁ GỐC
            ================================================= */}

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Giá gốc"
                value={form.originalPrice}
                onChange={handleChange("originalPrice")}
                type="number"
                inputProps={{
                  min: 0,
                }}
              />
            </Grid>

            {/* =================================================
                RATING
            ================================================= */}

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Rating"
                value={form.rating}
                onChange={handleChange("rating")}
                type="number"
                inputProps={{
                  min: 0,
                  max: 5,
                  step: 0.1,
                }}
              />
            </Grid>

            {/* =================================================
                SỐ LƯỢNG
            ================================================= */}

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label={form.variants.length ? "Tổng số lượng" : "Số lượng"}
                value={form.qty}
                onChange={handleChange("qty")}
                type="number"
                disabled={form.variants.length > 0}
                inputProps={{
                  min: 0,
                }}
              />
            </Grid>

            {/* =================================================
                STOCK
            ================================================= */}

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Stock"
                value={form.stock}
                onChange={handleChange("stock")}
                disabled={form.variants.length > 0}
              />
            </Grid>

            {/* =================================================
                THUMBNAIL
            ================================================= */}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Thumbnail"
                value={form.thumbnail}
                onChange={handleChange("thumbnail")}
                placeholder="/images/product.jpg"
              />
            </Grid>

            {/* =================================================
                IMAGES
            ================================================= */}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Images"
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
                multiline
                minRows={3}
                placeholder={"/images/a.jpg\n/images/b.jpg"}
              />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",

                  mt: 0.5,
                }}
              >
                Mỗi hình ảnh nhập một dòng
              </Typography>
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
            sx={{
              display: "flex",

              justifyContent: "space-between",

              alignItems: {
                xs: "flex-start",
                md: "center",
              },

              flexDirection: {
                xs: "column",
                md: "row",
              },

              gap: 2,

              mb: 2,
            }}
          >
            <Box>
              <Typography fontWeight={700}>Phân loại sản phẩm</Typography>

              <Typography variant="body2" color="text.secondary">
                Có thể thêm nhiều phân loại và số lượng
              </Typography>
            </Box>

            <Button variant="outlined" startIcon={<Add />} onClick={addVariant}>
              Thêm phân loại
            </Button>
          </Box>

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
            <>
              <Divider sx={{ mb: 2 }} />

              {form.variants.map((variant, index) => (
                <Grid
                  container
                  spacing={2}
                  key={index}
                  sx={{
                    mb: 1,
                  }}
                >
                  {/* TÊN */}

                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Tên phân loại"
                      value={variant.name}
                      onChange={(e) =>
                        updateVariant(index, "name", e.target.value)
                      }
                      placeholder="VD: 20*50"
                    />
                  </Grid>

                  {/* GIÁ */}

                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Giá"
                      value={variant.price}
                      onChange={(e) =>
                        updateVariant(index, "price", e.target.value)
                      }
                      type="number"
                      inputProps={{
                        min: 0,
                      }}
                    />
                  </Grid>

                  {/* SỐ LƯỢNG */}

                  <Grid item xs={10} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Số lượng"
                      value={variant.qty}
                      onChange={(e) =>
                        updateVariant(index, "qty", e.target.value)
                      }
                      type="number"
                      inputProps={{
                        min: 0,
                      }}
                    />
                  </Grid>

                  {/* DELETE */}

                  <Grid
                    item
                    xs={2}
                    md={1}
                    sx={{
                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",
                    }}
                  >
                    <IconButton
                      color="error"
                      onClick={() => removeVariant(index)}
                    >
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}

              {/* TOTAL */}

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
                <Typography fontWeight={600}>Tổng số lượng</Typography>

                <Typography fontWeight={700}>
                  {totalVariantQty.toLocaleString("vi-VN")}
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* =====================================================
          MÔ TẢ
      ===================================================== */}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Nội dung sản phẩm
          </Typography>

          {/* MÔ TẢ */}

          <TextField
            fullWidth
            label="Mô tả"
            value={form.description}
            onChange={handleChange("description")}
            multiline
            minRows={4}
            placeholder="Nhập mô tả ngắn về sản phẩm..."
          />

          {/* CHI TIẾT */}

          <TextField
            fullWidth
            label="Chi tiết"
            value={form.detail}
            onChange={handleChange("detail")}
            multiline
            minRows={4}
            sx={{
              mt: 2,
            }}
            placeholder="Nhập thông tin chi tiết sản phẩm..."
          />
        </CardContent>
      </Card>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <Box
        sx={{
          display: "flex",

          justifyContent: "flex-end",

          gap: 2,

          pb: 3,
        }}
      >
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
