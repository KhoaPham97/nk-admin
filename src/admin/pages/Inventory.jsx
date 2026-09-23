import React, { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";

import {
  Inventory2Outlined,
  Refresh,
  Search,
  WarningAmberOutlined,
  RemoveShoppingCartOutlined,
  CheckCircleOutline,
  EditOutlined,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

const Inventory = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [stockFilter, setStockFilter] = useState("all");

  const [typeFilter, setTypeFilter] = useState("all");

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(API_ENDPOINTS.PRODUCTS, {
        params: {
          type: "all",
        },
      });

      const data = response?.data;

      const productList = Array.isArray(data) ? data : data?.products || [];

      setProducts(productList);
    } catch (error) {
      console.error("loadInventory:", error);

      setError(
        error?.response?.data?.message || "Không thể tải dữ liệu tồn kho",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // =====================================================
  // GET PRODUCT QTY
  // =====================================================

  const getProductQty = (product) => {
    const qty = Number(product?.qty);

    return Number.isFinite(qty) ? qty : 0;
  };

  // =====================================================
  // GET VARIANTS
  // =====================================================

  const getVariants = (product) => {
    if (!Array.isArray(product?.variants)) {
      return [];
    }

    return product.variants;
  };

  // =====================================================
  // PRODUCT STATUS
  // =====================================================

  const getStockStatus = (product) => {
    const qty = getProductQty(product);

    if (qty <= 0) {
      return "out";
    }

    if (qty <= 5) {
      return "low";
    }

    return "in";
  };

  // =====================================================
  // FILTER
  // =====================================================

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      // -----------------------------
      // Search
      // -----------------------------

      const matchesSearch =
        !keyword ||
        product?.title?.toLowerCase().includes(keyword) ||
        product?.brand?.toLowerCase().includes(keyword) ||
        product?._id?.toLowerCase().includes(keyword);

      if (!matchesSearch) {
        return false;
      }

      // -----------------------------
      // Type
      // -----------------------------

      const matchesType =
        typeFilter === "all" || String(product?.type) === String(typeFilter);

      if (!matchesType) {
        return false;
      }

      // -----------------------------
      // Stock
      // -----------------------------

      const status = getStockStatus(product);

      if (stockFilter !== "all" && status !== stockFilter) {
        return false;
      }

      return true;
    });
  }, [products, search, stockFilter, typeFilter]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const statistics = useMemo(() => {
    let totalQty = 0;
    let totalProducts = products.length;
    let lowStock = 0;
    let outOfStock = 0;
    let inStock = 0;

    products.forEach((product) => {
      const qty = getProductQty(product);

      totalQty += qty;

      if (qty <= 0) {
        outOfStock++;
      } else if (qty <= 5) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    return {
      totalProducts,
      totalQty,
      lowStock,
      outOfStock,
      inStock,
    };
  }, [products]);

  // =====================================================
  // TYPE LABEL
  // =====================================================

  const getTypeLabel = (type) => {
    const map = {
      1: "Xe đạp",
      2: "Xe điện",
      3: "Xe ba gác",
    };

    return map[String(type)] || type || "Khác";
  };

  // =====================================================
  // STOCK CHIP
  // =====================================================

  const renderStockStatus = (product) => {
    const qty = getProductQty(product);

    if (qty <= 0) {
      return (
        <Chip
          size="small"
          icon={<RemoveShoppingCartOutlined />}
          label="Hết hàng"
          color="error"
          variant="outlined"
        />
      );
    }

    if (qty <= 5) {
      return (
        <Chip
          size="small"
          icon={<WarningAmberOutlined />}
          label="Sắp hết"
          color="warning"
          variant="outlined"
        />
      );
    }

    return (
      <Chip
        size="small"
        icon={<CheckCircleOutline />}
        label="Còn hàng"
        color="success"
        variant="outlined"
      />
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box>
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          flexDirection: {
            xs: "column",
            sm: "row",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Tồn kho
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Theo dõi số lượng sản phẩm trong kho
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadProducts}
          disabled={loading}
        >
          Làm mới
        </Button>
      </Box>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ================================================= */}
      {/* STATISTICS */}
      {/* ================================================= */}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Tổng sản phẩm */}

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Mã sản phẩm
                  </Typography>

                  <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                    {statistics.totalProducts}
                  </Typography>
                </Box>

                <Inventory2Outlined
                  sx={{
                    fontSize: 40,
                    color: "primary.main",
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Tổng tồn */}

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng số lượng
                  </Typography>

                  <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                    {statistics.totalQty}
                  </Typography>
                </Box>

                <Inventory2Outlined
                  sx={{
                    fontSize: 40,
                    color: "success.main",
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Sắp hết */}

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Sắp hết
                  </Typography>

                  <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                    {statistics.lowStock}
                  </Typography>
                </Box>

                <WarningAmberOutlined
                  sx={{
                    fontSize: 40,
                    color: "warning.main",
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Hết hàng */}

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Hết hàng
                  </Typography>

                  <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                    {statistics.outOfStock}
                  </Typography>
                </Box>

                <RemoveShoppingCartOutlined
                  sx={{
                    fontSize: 40,
                    color: "error.main",
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ================================================= */}
      {/* FILTER */}
      {/* ================================================= */}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Tìm tên sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Search
                      sx={{
                        mr: 1,
                        color: "text.secondary",
                      }}
                    />
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Loại sản phẩm</InputLabel>

                <Select
                  value={typeFilter}
                  label="Loại sản phẩm"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">Tất cả</MenuItem>

                  <MenuItem value="1">Xe đạp</MenuItem>

                  <MenuItem value="2">Xe điện</MenuItem>

                  <MenuItem value="3">Xe ba gác</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Tình trạng</InputLabel>

                <Select
                  value={stockFilter}
                  label="Tình trạng"
                  onChange={(e) => setStockFilter(e.target.value)}
                >
                  <MenuItem value="all">Tất cả</MenuItem>

                  <MenuItem value="in">Còn hàng</MenuItem>

                  <MenuItem value="low">Sắp hết</MenuItem>

                  <MenuItem value="out">Hết hàng</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ================================================= */}
      {/* TABLE */}
      {/* ================================================= */}

      <Card>
        <CardContent
          sx={{
            p: 0,
            "&:last-child": {
              pb: 0,
            },
          }}
        >
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sản phẩm</TableCell>

                  <TableCell>Loại</TableCell>

                  <TableCell>Biến thể</TableCell>

                  <TableCell align="center">Tồn kho</TableCell>

                  <TableCell>Trạng thái</TableCell>

                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        Không tìm thấy sản phẩm
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const variants = getVariants(product);

                    const qty = getProductQty(product);

                    return (
                      <TableRow key={product._id} hover>
                        {/* PRODUCT */}

                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              minWidth: 220,
                            }}
                          >
                            {product.thumbnail ? (
                              <Box
                                component="img"
                                src={`/images/${product.thumbnail}`}
                                alt={product.title}
                                sx={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 1,
                                  objectFit: "cover",
                                  border: "1px solid #eee",
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "#f3f4f6",
                                }}
                              >
                                <Inventory2Outlined />
                              </Box>
                            )}

                            <Box>
                              <Typography
                                fontWeight={700}
                                sx={{
                                  maxWidth: 280,
                                }}
                              >
                                {product.title}
                              </Typography>

                              {product.brand && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {product.brand}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>

                        {/* TYPE */}

                        <TableCell>
                          <Chip
                            size="small"
                            label={getTypeLabel(product.type)}
                          />
                        </TableCell>

                        {/* VARIANTS */}

                        <TableCell>
                          {variants.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              Không có
                            </Typography>
                          ) : (
                            <Stack spacing={0.5}>
                              {variants.slice(0, 3).map((variant, index) => (
                                <Box
                                  key={index}
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                  }}
                                >
                                  <Typography variant="body2">
                                    {variant.name}
                                  </Typography>

                                  <Typography variant="body2" fontWeight={700}>
                                    {variant.qty}
                                  </Typography>
                                </Box>
                              ))}

                              {variants.length > 3 && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  +{variants.length - 3} biến thể
                                </Typography>
                              )}
                            </Stack>
                          )}
                        </TableCell>

                        {/* QTY */}

                        <TableCell align="center">
                          <Typography fontWeight={800} fontSize={18}>
                            {qty}
                          </Typography>
                        </TableCell>

                        {/* STATUS */}

                        <TableCell>{renderStockStatus(product)}</TableCell>

                        {/* ACTION */}

                        <TableCell align="right">
                          <Tooltip title="Sửa sản phẩm">
                            <IconButton
                              onClick={() =>
                                navigate(`/admin/products/${product._id}`)
                              }
                            >
                              <EditOutlined />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* RESULT */}

      {!loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Hiển thị <strong>{filteredProducts.length}</strong> /{" "}
          {products.length} sản phẩm
        </Typography>
      )}
    </Box>
  );
};

export default Inventory;
