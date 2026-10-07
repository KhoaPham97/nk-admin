import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  InputAdornment,
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
} from "@mui/material";
import { API_ENDPOINTS } from "../../api";

interface Variant {
  name?: string;
  value?: string;
  label?: string;
  price?: number | string;
  defaultPrice?: number | string;
  qty?: number | string;
  code?: string;
  sku?: string;
  thumbnail?: string;
  image?: string;
}

interface Product {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  code?: string;
  price?: number | string;
  qty?: number | string;
  stock?: number | string;
  type?: string | number;
  variants?: Variant[];
}

interface PricingRow {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  variantName: string;
  variantCode: string;
  defaultPrice: number;
  qty: number;
}

const ProductPricing: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Tỷ giá CNY -> VND
  const [exchangeRate, setExchangeRate] = useState<number>(3650);

  // Phí vận chuyển / sản phẩm
  const [shipping, setShipping] = useState<number>(0);

  // % lợi nhuận
  const [profitPercent, setProfitPercent] = useState<number>(30);

  const [search, setSearch] = useState("");

  /**
   * ============================
   * FETCH PRODUCTS
   * ============================
   */
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const url = `${API_ENDPOINTS.PRODUCTS}?type=all&limit=999`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      /**
       * Hỗ trợ nhiều kiểu response:
       *
       * {
       *   products: [...]
       * }
       *
       * hoặc
       *
       * [...]
       */
      const productList = Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setProducts(productList);
    } catch (err: any) {
      console.error("Load products error:", err);

      setError(err?.message || "Không thể tải danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  /**
   * ============================
   * FLATTEN VARIANTS
   * ============================
   */
  const pricingRows = useMemo<PricingRow[]>(() => {
    const rows: PricingRow[] = [];

    products.forEach((product, productIndex) => {
      const productId = product._id || product.id || `product-${productIndex}`;

      const productName = product.name || product.title || "Không có tên";

      const productCode = product.code || "";

      /**
       * Nếu sản phẩm có variants
       */
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        product.variants.forEach((variant, variantIndex) => {
          const defaultPrice = Number(variant.defaultPrice ?? 0);

          const qty = Number(variant.qty ?? 0);

          const variantName =
            variant.label ||
            variant.name ||
            variant.value ||
            `Variant ${variantIndex + 1}`;

          const variantCode = variant.code || variant.sku || "";

          rows.push({
            id: `${productId}-${variantIndex}`,
            productId,
            productName,
            productCode,
            variantName,
            variantCode,
            defaultPrice: Number.isFinite(defaultPrice) ? defaultPrice : 0,
            qty: Number.isFinite(qty) ? qty : 0,
          });
        });
      } else {
        /**
         * Sản phẩm không có variant
         *
         * Không dùng defaultPrice vì product
         * không có variant.
         */
        rows.push({
          id: productId,
          productId,
          productName,
          productCode,
          variantName: "Mặc định",
          variantCode: productCode,
          defaultPrice: Number(product.price ?? 0),
          qty: Number(product.qty ?? product.stock ?? 0),
        });
      }
    });

    return rows;
  }, [products]);

  /**
   * ============================
   * SEARCH
   * ============================
   */
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return pricingRows;
    }

    return pricingRows.filter((item) => {
      return (
        item.productName.toLowerCase().includes(keyword) ||
        item.productCode.toLowerCase().includes(keyword) ||
        item.variantName.toLowerCase().includes(keyword) ||
        item.variantCode.toLowerCase().includes(keyword)
      );
    });
  }, [pricingRows, search]);

  /**
   * ============================
   * CALCULATE
   * ============================
   *
   * Giá vốn:
   *
   * defaultPrice * exchangeRate + shipping
   *
   * Giá bán:
   *
   * giá vốn * (1 + profit%)
   */
  const calculateCost = (defaultPrice: number) => {
    return defaultPrice * exchangeRate + shipping;
  };

  const calculateSellingPrice = (defaultPrice: number) => {
    const cost = calculateCost(defaultPrice);

    return cost * (1 + profitPercent / 100);
  };

  /**
   * ============================
   * FORMAT MONEY
   * ============================
   */
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(Math.round(value || 0));
  };

  /**
   * ============================
   * SUMMARY
   * ============================
   */
  const summary = useMemo(() => {
    let totalCost = 0;
    let totalSelling = 0;

    filteredRows.forEach((item) => {
      const cost = calculateCost(item.defaultPrice);

      const selling = calculateSellingPrice(item.defaultPrice);

      totalCost += cost * item.qty;
      totalSelling += selling * item.qty;
    });

    return {
      totalCost,
      totalSelling,
      estimatedProfit: totalSelling - totalCost,
    };
  }, [filteredRows, exchangeRate, shipping, profitPercent]);

  return (
    <Box
      sx={{
        p: {
          xs: 2,
          md: 3,
        },
      }}
    >
      {/* ================= HEADER ================= */}
      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "stretch",
          md: "center",
        }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Định giá sản phẩm
          </Typography>

          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Tính giá vốn từ giá nhập variant và tỷ giá
          </Typography>
        </Box>

        <Button variant="outlined" onClick={loadProducts} disabled={loading}>
          {loading ? "Đang tải..." : "Tải lại sản phẩm"}
        </Button>
      </Stack>

      {/* ================= ERROR ================= */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ================= SETTINGS ================= */}
      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          mb: 3,
        }}
      >
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Thiết lập giá
          </Typography>

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={2}
          >
            <TextField
              label="Tỷ giá CNY → VND"
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">VND</InputAdornment>
                ),
              }}
            />

            <TextField
              label="Phí vận chuyển / SP"
              type="number"
              value={shipping}
              onChange={(e) => setShipping(Number(e.target.value))}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">VND</InputAdornment>
                ),
              }}
            />

            <TextField
              label="Lợi nhuận"
              type="number"
              value={profitPercent}
              onChange={(e) => setProfitPercent(Number(e.target.value))}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Stack>

          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Công thức:
            </Typography>

            <Typography fontWeight={600} mt={0.5}>
              Giá vốn = defaultPrice × tỷ giá + phí vận chuyển
            </Typography>

            <Typography fontWeight={600} mt={0.5}>
              Giá bán = Giá vốn × (1 + lợi nhuận %)
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* ================= SUMMARY ================= */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Tổng giá vốn
            </Typography>

            <Typography variant="h6" fontWeight={700} mt={1}>
              {formatMoney(summary.totalCost)} đ
            </Typography>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Tổng giá bán dự kiến
            </Typography>

            <Typography variant="h6" fontWeight={700} mt={1}>
              {formatMoney(summary.totalSelling)} đ
            </Typography>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Lợi nhuận dự kiến
            </Typography>

            <Typography variant="h6" fontWeight={700} mt={1}>
              {formatMoney(summary.estimatedProfit)} đ
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ================= SEARCH ================= */}
      <TextField
        fullWidth
        placeholder="Tìm sản phẩm, mã sản phẩm, variant..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* ================= TABLE ================= */}
      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            maxHeight: "calc(100vh - 400px)",
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sản phẩm</TableCell>

                <TableCell>Variant</TableCell>

                <TableCell>Mã</TableCell>

                <TableCell align="right">Giá nhập</TableCell>

                <TableCell align="right">Tỷ giá</TableCell>

                <TableCell align="right">Vận chuyển</TableCell>

                <TableCell align="right">Giá vốn</TableCell>

                <TableCell align="right">Lợi nhuận</TableCell>

                <TableCell align="right">Giá bán</TableCell>

                <TableCell align="right">SL</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    Không có sản phẩm
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((item) => {
                  const cost = calculateCost(item.defaultPrice);

                  const selling = calculateSellingPrice(item.defaultPrice);

                  const profit = selling - cost;

                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography fontWeight={600} variant="body2">
                          {item.productName}
                        </Typography>

                        {item.productCode && (
                          <Typography variant="caption" color="text.secondary">
                            {item.productCode}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>{item.variantName}</TableCell>

                      <TableCell>{item.variantCode || "-"}</TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={600}>
                          {formatMoney(item.defaultPrice)} ¥
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        {formatMoney(exchangeRate)}
                      </TableCell>

                      <TableCell align="right">
                        {formatMoney(shipping)} đ
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={700}>
                          {formatMoney(cost)} đ
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography color="success.main" fontWeight={600}>
                          +{formatMoney(profit)} đ
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={700} color="primary.main">
                          {formatMoney(selling)} đ
                        </Typography>
                      </TableCell>

                      <TableCell align="right">{item.qty}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Divider sx={{ mt: 3 }} />

      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        mt={2}
      >
        Đang tính giá dựa trên
        <strong> variant.defaultPrice</strong>. Giá nhập được quy đổi từ CNY
        sang VND theo tỷ giá phía trên.
      </Typography>
    </Box>
  );
};

export default ProductPricing;
