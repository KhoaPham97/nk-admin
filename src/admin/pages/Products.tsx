import React, { useEffect, useMemo, useState } from "react";

import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  Divider,
  Chip,
  Button,
  Stack,
  CircularProgress,
  IconButton,
  Grid,
  Autocomplete,
  Alert,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ImageIcon from "@mui/icons-material/Image";

import { useLocation } from "react-router-dom";

import { getRequest, patchRequest } from "../common/ApiMethod";

// =====================================================
// TYPES
// =====================================================

interface Variant {
  name: string;
  price: number | string;
  qty: number | string;
  [key: string]: any;
}

interface Category {
  _id: string;
  name: string;
  type?: string;
  [key: string]: any;
}

interface Product {
  _id: string;

  title: string;

  thumbnail?: string;

  images?: string[];

  brand?: string;

  price?: number | string;

  originalPrice?: number | string;

  qty?: number | string;

  stock?: number | string;

  type?: string;

  categoryId?: string;

  category?: string;

  description?: string;

  detail?: string;

  rating?: number;

  code?: string;

  imageUrl?: string;

  variants?: Variant[];

  [key: string]: any;
}

// =====================================================
// TYPE NAME
// =====================================================

const TYPE_NAME: Record<string, string> = {
  "1": "Phụ tùng xe đạp",
  "2": "Phụ tùng xe điện",
  "3": "Phụ tùng xe ba gác",
};

// =====================================================
// COMPONENT
// =====================================================

const Products = () => {
  const location = useLocation();

  const pathname = location.pathname;

  // =====================================================
  // TYPE FROM URL
  // =====================================================

  const type = useMemo(() => {
    if (pathname === "/admin/products/bicycle") {
      return "1";
    }

    if (pathname === "/admin/products/electric") {
      return "2";
    }

    if (pathname === "/admin/products/tricycle") {
      return "3";
    }

    return "";
  }, [pathname]);

  const typeName = TYPE_NAME[type] || "Tất cả sản phẩm";

  // =====================================================
  // STATE
  // =====================================================

  const [products, setProducts] = useState<Product[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const limit = 20;

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [dirty, setDirty] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // CALCULATE TOTAL QTY
  // =====================================================

  const calculateTotalQty = (variants: Variant[]) => {
    return variants.reduce((total, variant) => {
      return total + (Number(variant.qty) || 0);
    }, 0);
  };

  // =====================================================
  // NORMALIZE PRODUCT
  // =====================================================

  const normalizeProduct = (product: Product): Product => {
    const variants = Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          ...variant,

          name: variant.name || "",

          price: Number(variant.price) || 0,

          qty: Number(variant.qty) || 0,
        }))
      : [];

    return {
      ...product,

      price: Number(product.price) || 0,

      originalPrice: Number(product.originalPrice) || 0,

      variants,

      qty: calculateTotalQty(variants),

      images: Array.isArray(product.images) ? product.images : [],
    };
  };

  // =====================================================
  // LOAD CATEGORY
  // =====================================================

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await getRequest({
        url: "/categorys",
      });

      // API:
      // {
      //   categorys: [...]
      // }

      const list = Array.isArray(res?.categorys) ? res.categorys : [];

      setCategories(list);
    } catch (error) {
      console.error("Load categories error:", error);

      setCategories([]);
    }
  };

  // =====================================================
  // RESET WHEN CHANGE SIDEBAR
  // =====================================================

  useEffect(() => {
    setPage(1);

    setSearch("");

    setProducts([]);

    setSelectedProduct(null);

    setDirty(false);

    setSaveMessage("");

    setErrorMessage("");
  }, [pathname]);

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  useEffect(() => {
    loadProducts();
  }, [pathname, type, page, search]);

  const loadProducts = async () => {
    try {
      setLoading(true);

      setErrorMessage("");

      const params: Record<string, any> = {
        page,
        limit,
      };

      // type
      if (type) {
        params.type = type;
      }

      // search
      if (search.trim()) {
        params.search = search.trim();
      }

      console.log("LOAD PRODUCTS:", params);

      const res = await getRequest({
        url: "/products",
        params,
      });

      console.log("PRODUCT RESPONSE:", res);

      // =================================================
      // PRODUCTS
      // =================================================

      const list = Array.isArray(res?.products) ? res.products : [];

      setProducts(list);

      // =================================================
      // PAGINATION
      // =================================================

      const pagination = res?.pagination || {};

      const responseTotal = Number(pagination.total) || 0;

      const responseTotalPages = Number(pagination.totalPages) || 1;

      const responseHasMore = Boolean(pagination.hasMore);

      setTotal(responseTotal || list.length);

      setTotalPages(responseTotalPages);

      setHasMore(responseHasMore);

      // =================================================
      // SELECT FIRST
      // =================================================

      if (list.length > 0) {
        setSelectedProduct(normalizeProduct(list[0]));
      } else {
        setSelectedProduct(null);
      }

      setDirty(false);
    } catch (error: any) {
      console.error("Load products error:", error);

      setErrorMessage(error?.message || "Không thể tải sản phẩm");

      setProducts([]);

      setSelectedProduct(null);

      setTotal(0);

      setTotalPages(1);

      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SELECT PRODUCT
  // =====================================================

  const selectProduct = (product: Product) => {
    setSelectedProduct(normalizeProduct(product));

    setDirty(false);

    setSaveMessage("");

    setErrorMessage("");
  };

  // =====================================================
  // UPDATE PRODUCT FIELD
  // =====================================================

  const updateProductField = (field: string, value: any) => {
    if (!selectedProduct) {
      return;
    }

    setSelectedProduct({
      ...selectedProduct,

      [field]: value,
    });

    setDirty(true);

    setSaveMessage("");
  };

  // =====================================================
  // UPDATE VARIANT
  // =====================================================

  const updateVariant = (
    index: number,
    field: "name" | "price" | "qty",
    value: any,
  ) => {
    if (!selectedProduct) {
      return;
    }

    const variants = [...(selectedProduct.variants || [])];

    variants[index] = {
      ...variants[index],

      [field]:
        field === "price" || field === "qty" ? Number(value) || 0 : value,
    };

    const totalQty = calculateTotalQty(variants);

    setSelectedProduct({
      ...selectedProduct,

      variants,

      qty: totalQty,
    });

    setDirty(true);

    setSaveMessage("");
  };

  // =====================================================
  // ADD VARIANT
  // =====================================================

  const addVariant = () => {
    if (!selectedProduct) {
      return;
    }

    const variants = [
      ...(selectedProduct.variants || []),

      {
        name: "",
        price: 0,
        qty: 0,
      },
    ];

    const totalQty = calculateTotalQty(variants);

    setSelectedProduct({
      ...selectedProduct,

      variants,

      qty: totalQty,
    });

    setDirty(true);
  };

  // =====================================================
  // DELETE VARIANT
  // =====================================================

  const deleteVariant = (index: number) => {
    if (!selectedProduct) {
      return;
    }

    const variants = [...(selectedProduct.variants || [])];

    variants.splice(index, 1);

    const totalQty = calculateTotalQty(variants);

    setSelectedProduct({
      ...selectedProduct,

      variants,

      qty: totalQty,
    });

    setDirty(true);
  };

  // =====================================================
  // CHANGE CATEGORY
  // =====================================================

  const changeCategory = (category: Category | null) => {
    if (!selectedProduct) {
      return;
    }

    if (!category) {
      setSelectedProduct({
        ...selectedProduct,

        categoryId: "",

        category: "",
      });

      setDirty(true);

      return;
    }

    setSelectedProduct({
      ...selectedProduct,

      categoryId: category._id,

      category: category.name,

      ...(category.type
        ? {
            type: category.type,
          }
        : {}),
    });

    setDirty(true);
  };

  // =====================================================
  // SAVE PRODUCT
  // =====================================================

  const saveProduct = async () => {
    if (!selectedProduct) {
      return;
    }

    try {
      setSaving(true);

      setSaveMessage("");

      setErrorMessage("");

      const variants = selectedProduct.variants || [];

      const finalQty = calculateTotalQty(variants);

      const productToSave = {
        ...selectedProduct,

        variants,

        qty: finalQty,

        ...(type
          ? {
              type,
            }
          : {}),
      };

      console.log("SAVE PRODUCT:", productToSave);

      await patchRequest({
        url: "/product",

        data: [productToSave],
      });

      // =================================================
      // UPDATE CURRENT LIST
      // =================================================

      setProducts((current) =>
        current.map((product) =>
          product._id === productToSave._id ? productToSave : product,
        ),
      );

      setSelectedProduct(productToSave);

      setDirty(false);

      setSaveMessage("Đã lưu sản phẩm");
    } catch (error: any) {
      console.error("Save error:", error);

      setErrorMessage(error?.message || "Không thể lưu sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // TOTAL QTY
  // =====================================================

  const totalQty = useMemo(() => {
    if (!selectedProduct) {
      return 0;
    }

    return calculateTotalQty(selectedProduct.variants || []);
  }, [selectedProduct]);

  // =====================================================
  // CURRENT CATEGORY
  // =====================================================

  const currentCategory =
    categories.find(
      (category) => category._id === selectedProduct?.categoryId,
    ) || null;

  // =====================================================
  // FORMAT PRICE
  // =====================================================

  const formatPrice = (value: any) => {
    const number = Number(value);

    if (Number.isNaN(number)) {
      return "0";
    }

    return number.toLocaleString("vi-VN");
  };

  // =====================================================
  // IMAGE PATH
  // =====================================================

  const getImageUrl = (filename?: string) => {
    if (!filename) {
      return "";
    }

    // Nếu là URL đầy đủ
    if (filename.startsWith("http://") || filename.startsWith("https://")) {
      return filename;
    }

    return `/images/${filename}`;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <Stack
        direction={{
          xs: "column",
          sm: "row",
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "flex-start",
          sm: "center",
        }}
        spacing={1}
        mb={2}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Inventory2Icon />

            <Typography variant="h5" fontWeight={700}>
              Sản phẩm
            </Typography>
          </Stack>

          <Typography color="text.secondary" fontSize={14}>
            {typeName}
          </Typography>
        </Box>

        <Chip label={`${total} sản phẩm`} variant="outlined" />
      </Stack>

      {/* =================================================
          MESSAGE
      ================================================= */}

      {saveMessage && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSaveMessage("")}
        >
          {saveMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setErrorMessage("")}
        >
          {errorMessage}
        </Alert>
      )}

      {/* =================================================
          MAIN
      ================================================= */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            lg: "380px minmax(0, 1fr)",
          },

          gap: 2,

          alignItems: "start",
        }}
      >
        {/* =================================================
            PRODUCT LIST
        ================================================= */}

        <Card>
          <CardContent
            sx={{
              p: 0,

              "&:last-child": {
                pb: 0,
              },
            }}
          >
            {/* SEARCH */}

            <Box p={2}>
              <TextField
                fullWidth
                size="small"
                placeholder={`Tìm ${typeName.toLowerCase()}...`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);

                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={1}
              >
                {total} sản phẩm
              </Typography>
            </Box>

            <Divider />

            {/* LIST */}

            {loading ? (
              <Box
                sx={{
                  py: 8,

                  display: "flex",

                  justifyContent: "center",
                }}
              >
                <CircularProgress />
              </Box>
            ) : products.length === 0 ? (
              <Box
                sx={{
                  py: 8,

                  textAlign: "center",
                }}
              >
                <Typography color="text.secondary">
                  Không có sản phẩm
                </Typography>
              </Box>
            ) : (
              <List
                disablePadding
                sx={{
                  maxHeight: "calc(100vh - 300px)",

                  overflowY: "auto",
                }}
              >
                {products.map((product) => {
                  const active = selectedProduct?._id === product._id;

                  const qty = Number(product.qty) || 0;

                  return (
                    <ListItemButton
                      key={product._id}
                      selected={active}
                      onClick={() => selectProduct(product)}
                      sx={{
                        borderBottom: "1px solid #eee",

                        py: 1.5,

                        alignItems: "flex-start",
                      }}
                    >
                      {/* IMAGE */}

                      <Box
                        sx={{
                          width: 64,

                          height: 64,

                          mr: 1.5,

                          flexShrink: 0,

                          borderRadius: 1.5,

                          overflow: "hidden",

                          background: "#f5f5f5",

                          border: "1px solid #eee",
                        }}
                      >
                        {product.thumbnail ? (
                          <img
                            src={getImageUrl(product.thumbnail)}
                            alt={product.title}
                            style={{
                              width: "100%",

                              height: "100%",

                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: "100%",

                              height: "100%",

                              display: "flex",

                              alignItems: "center",

                              justifyContent: "center",
                            }}
                          >
                            <Inventory2Icon color="disabled" />
                          </Box>
                        )}
                      </Box>

                      {/* INFO */}

                      <Box
                        sx={{
                          minWidth: 0,

                          flex: 1,
                        }}
                      >
                        <Typography fontWeight={active ? 700 : 500} noWrap>
                          {product.title}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          display="block"
                        >
                          {product.brand || "Không thương hiệu"}
                        </Typography>

                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          mt={0.5}
                        >
                          <Chip
                            size="small"
                            label={`SL: ${qty}`}
                            color={qty > 0 ? "success" : "error"}
                            sx={{
                              height: 23,
                            }}
                          />

                          <Typography variant="caption" fontWeight={600}>
                            {formatPrice(product.price)}đ
                          </Typography>
                        </Stack>
                      </Box>
                    </ListItemButton>
                  );
                })}
              </List>
            )}

            {/* =================================================
                PAGINATION
            ================================================= */}

            <Divider />

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              p={1.5}
            >
              <Button
                size="small"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                ← Trước
              </Button>

              <Box
                sx={{
                  textAlign: "center",
                }}
              >
                <Typography variant="caption" display="block" fontWeight={600}>
                  Trang {page} / {totalPages}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {total} sản phẩm
                </Typography>
              </Box>

              <Button
                size="small"
                disabled={!hasMore || loading}
                onClick={() => {
                  if (hasMore) {
                    setPage((current) => current + 1);
                  }
                }}
              >
                Sau →
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* =================================================
            EDIT PRODUCT
        ================================================= */}

        <Card>
          <CardContent>
            {!selectedProduct ? (
              <Box
                sx={{
                  py: 12,

                  textAlign: "center",
                }}
              >
                <Inventory2Icon
                  sx={{
                    fontSize: 50,

                    color: "text.disabled",
                  }}
                />

                <Typography variant="h6" mt={1}>
                  Chọn sản phẩm
                </Typography>

                <Typography color="text.secondary">
                  Chọn sản phẩm bên trái
                </Typography>
              </Box>
            ) : (
              <>
                {/* HEADER */}

                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    xs: "flex-start",
                    sm: "center",
                  }}
                  spacing={2}
                  mb={2}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Chỉnh sửa sản phẩm
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      ID: {selectedProduct._id}
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={
                      saving ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    disabled={saving || !dirty}
                    onClick={saveProduct}
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </Stack>

                <Divider />

                {/* =================================================
                    BASIC INFO
                ================================================= */}

                <Box mt={3}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2}>
                    Thông tin sản phẩm
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid
                      size={{
                        xs: 12,
                      }}
                    >
                      <TextField
                        fullWidth
                        label="Tên sản phẩm"
                        value={selectedProduct.title || ""}
                        onChange={(e) =>
                          updateProductField("title", e.target.value)
                        }
                      />
                    </Grid>

                    <Grid
                      size={{
                        xs: 12,
                        md: 6,
                      }}
                    >
                      <TextField
                        fullWidth
                        label="Thương hiệu"
                        value={selectedProduct.brand || ""}
                        onChange={(e) =>
                          updateProductField("brand", e.target.value)
                        }
                      />
                    </Grid>

                    <Grid
                      size={{
                        xs: 12,
                        md: 6,
                      }}
                    >
                      <TextField
                        fullWidth
                        label="Mã sản phẩm"
                        value={selectedProduct.code || ""}
                        onChange={(e) =>
                          updateProductField("code", e.target.value)
                        }
                      />
                    </Grid>

                    <Grid
                      size={{
                        xs: 12,
                      }}
                    >
                      <Autocomplete
                        options={categories}
                        value={currentCategory}
                        getOptionLabel={(option) => option.name || ""}
                        isOptionEqualToValue={(option, value) =>
                          option._id === value._id
                        }
                        onChange={(_, value) => changeCategory(value)}
                        renderInput={(params) => (
                          <TextField {...params} label="Danh mục" />
                        )}
                      />
                    </Grid>

                    <Grid
                      size={{
                        xs: 12,
                        md: 6,
                      }}
                    >
                      <TextField
                        fullWidth
                        type="number"
                        label="Giá mặc định"
                        value={selectedProduct.price ?? ""}
                        onChange={(e) =>
                          updateProductField(
                            "price",
                            Number(e.target.value) || 0,
                          )
                        }
                      />
                    </Grid>

                    <Grid
                      size={{
                        xs: 12,
                        md: 6,
                      }}
                    >
                      <TextField
                        fullWidth
                        type="number"
                        label="Giá cũ"
                        value={selectedProduct.originalPrice ?? ""}
                        onChange={(e) =>
                          updateProductField(
                            "originalPrice",
                            Number(e.target.value) || 0,
                          )
                        }
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* =================================================
                    VARIANTS
                ================================================= */}

                <Box mt={4}>
                  <Stack
                    direction={{
                      xs: "column",
                      sm: "row",
                    }}
                    justifyContent="space-between"
                    alignItems={{
                      xs: "flex-start",
                      sm: "center",
                    }}
                    spacing={1}
                    mb={2}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Phân loại sản phẩm
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        Tổng số lượng được tính tự động
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={addVariant}
                    >
                      Thêm phân loại
                    </Button>
                  </Stack>

                  {/* TOTAL */}

                  <Card
                    variant="outlined"
                    sx={{
                      mb: 2,
                    }}
                  >
                    <CardContent
                      sx={{
                        py: "12px !important",
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography>Tổng tồn kho</Typography>

                        <Typography
                          variant="h5"
                          fontWeight={700}
                          color={totalQty > 0 ? "success.main" : "error.main"}
                        >
                          {totalQty}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* VARIANTS */}

                  <Stack spacing={1.5}>
                    {(selectedProduct.variants || []).map((variant, index) => (
                      <Card key={index} variant="outlined">
                        <CardContent
                          sx={{
                            py: "12px !important",
                          }}
                        >
                          <Grid container spacing={1.5} alignItems="center">
                            <Grid
                              size={{
                                xs: 12,
                                md: 4,
                              }}
                            >
                              <TextField
                                fullWidth
                                size="small"
                                label="Phân loại"
                                value={variant.name || ""}
                                onChange={(e) =>
                                  updateVariant(index, "name", e.target.value)
                                }
                              />
                            </Grid>

                            <Grid
                              size={{
                                xs: 12,
                                sm: 5,
                                md: 3,
                              }}
                            >
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Giá"
                                value={variant.price ?? 0}
                                onChange={(e) =>
                                  updateVariant(index, "price", e.target.value)
                                }
                              />
                            </Grid>

                            <Grid
                              size={{
                                xs: 12,
                                sm: 5,
                                md: 3,
                              }}
                            >
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Số lượng"
                                value={variant.qty ?? 0}
                                onChange={(e) =>
                                  updateVariant(index, "qty", e.target.value)
                                }
                                inputProps={{
                                  min: 0,
                                }}
                              />
                            </Grid>

                            <Grid
                              size={{
                                xs: 12,
                                md: 2,
                              }}
                              sx={{
                                display: "flex",
                                justifyContent: {
                                  xs: "flex-end",
                                  md: "center",
                                },
                              }}
                            >
                              <IconButton
                                color="error"
                                onClick={() => deleteVariant(index)}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>

                {/* =================================================
                    DESCRIPTION
                ================================================= */}

                <Box mt={4}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2}>
                    Mô tả sản phẩm
                  </Typography>

                  <TextField
                    fullWidth
                    multiline
                    minRows={5}
                    label="Mô tả"
                    value={selectedProduct.description || ""}
                    onChange={(e) =>
                      updateProductField("description", e.target.value)
                    }
                  />
                </Box>

                {/* =================================================
                    IMAGES
                ================================================= */}

                <Box mt={4}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Hình ảnh
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        Hình ảnh lấy từ public/images/
                      </Typography>
                    </Box>

                    <ImageIcon color="action" />
                  </Stack>

                  {/* THUMBNAIL */}

                  <Card
                    variant="outlined"
                    sx={{
                      mb: 2,
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} mb={2}>
                        Ảnh đại diện
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid
                          size={{
                            xs: 12,
                            md: 4,
                          }}
                        >
                          <Box
                            sx={{
                              width: "100%",
                              height: 220,
                              border: "1px solid #ddd",
                              borderRadius: 2,
                              overflow: "hidden",
                              backgroundColor: "#f5f5f5",
                            }}
                          >
                            {selectedProduct.thumbnail ? (
                              <img
                                src={getImageUrl(selectedProduct.thumbnail)}
                                alt={selectedProduct.title}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Typography color="text.secondary">
                                  Chưa có ảnh
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Grid>

                        <Grid
                          size={{
                            xs: 12,
                            md: 8,
                          }}
                        >
                          <TextField
                            fullWidth
                            label="Tên file ảnh"
                            placeholder="6205zz.jpg"
                            value={selectedProduct.thumbnail || ""}
                            onChange={(e) =>
                              updateProductField("thumbnail", e.target.value)
                            }
                            helperText="Ví dụ: 6205zz.jpg → /images/6205zz.jpg"
                          />

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            mt={2}
                          >
                            Đường dẫn hiện tại:
                          </Typography>

                          <Box
                            sx={{
                              mt: 0.5,
                              p: 1.5,
                              borderRadius: 1,
                              backgroundColor: "#f5f5f5",
                              wordBreak: "break-all",
                            }}
                          >
                            <Typography variant="body2">
                              {selectedProduct.thumbnail
                                ? getImageUrl(selectedProduct.thumbnail)
                                : "Chưa có ảnh"}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* OTHER IMAGES */}

                  <Card variant="outlined">
                    <CardContent>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={2}
                      >
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            Hình ảnh sản phẩm
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            Danh sách images[]
                          </Typography>
                        </Box>

                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            const images = [
                              ...(selectedProduct.images || []),
                              "",
                            ];

                            updateProductField("images", images);
                          }}
                        >
                          Thêm ảnh
                        </Button>
                      </Stack>

                      <Stack spacing={2}>
                        {(selectedProduct.images || []).map((image, index) => (
                          <Card key={index} variant="outlined">
                            <CardContent>
                              <Grid container spacing={2} alignItems="center">
                                {/* PREVIEW */}

                                <Grid
                                  size={{
                                    xs: 12,
                                    sm: 3,
                                    md: 2,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: "100%",
                                      height: 100,
                                      border: "1px solid #ddd",
                                      borderRadius: 1,
                                      overflow: "hidden",
                                      backgroundColor: "#f5f5f5",
                                    }}
                                  >
                                    {image ? (
                                      <img
                                        src={getImageUrl(image)}
                                        alt={`Ảnh ${index + 1}`}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "contain",
                                        }}
                                      />
                                    ) : (
                                      <Box
                                        sx={{
                                          width: "100%",
                                          height: "100%",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        <ImageIcon color="disabled" />
                                      </Box>
                                    )}
                                  </Box>
                                </Grid>

                                {/* INPUT */}

                                <Grid
                                  size={{
                                    xs: 12,
                                    sm: 8,
                                    md: 9,
                                  }}
                                >
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label={`Tên file ảnh ${index + 1}`}
                                    placeholder="6205zz-1.jpg"
                                    value={image}
                                    onChange={(e) => {
                                      const images = [
                                        ...(selectedProduct.images || []),
                                      ];

                                      images[index] = e.target.value;

                                      updateProductField("images", images);
                                    }}
                                  />
                                </Grid>

                                {/* DELETE */}

                                <Grid
                                  size={{
                                    xs: 12,
                                    sm: 1,
                                    md: 1,
                                  }}
                                >
                                  <IconButton
                                    color="error"
                                    onClick={() => {
                                      const images = [
                                        ...(selectedProduct.images || []),
                                      ];

                                      images.splice(index, 1);

                                      updateProductField("images", images);
                                    }}
                                  >
                                    <DeleteOutlineIcon />
                                  </IconButton>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        ))}

                        {(selectedProduct.images || []).length === 0 && (
                          <Box
                            sx={{
                              py: 4,
                              textAlign: "center",
                              border: "1px dashed #ccc",
                              borderRadius: 2,
                            }}
                          >
                            <Typography color="text.secondary">
                              Chưa có hình ảnh
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                {/* =================================================
                    FINAL SAVE
                ================================================= */}

                <Divider
                  sx={{
                    my: 3,
                  }}
                />

                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={2}
                  alignItems="center"
                >
                  {dirty && <Chip label="Chưa lưu" color="warning" />}

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={
                      saving ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    disabled={saving || !dirty}
                    onClick={saveProduct}
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Products;
