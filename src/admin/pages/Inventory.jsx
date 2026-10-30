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
  Collapse,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Inventory2Outlined,
  Refresh,
  Search,
  WarningAmberOutlined,
  RemoveShoppingCartOutlined,
  CheckCircleOutline,
  EditOutlined,
  KeyboardArrowDown,
  KeyboardArrowUp,
  FactCheckOutlined,
  FilterAltOffOutlined,
  ViewListOutlined,
  CategoryOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../../api";

const LOW_STOCK = 5;
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (value) => toNumber(value).toLocaleString("vi-VN");
const getVariants = (product) =>
  Array.isArray(product?.variants) ? product.variants : [];
const getQty = (product) => {
  const variants = getVariants(product);
  if (variants.length)
    return variants.reduce((sum, v) => sum + toNumber(v.qty), 0);
  return toNumber(product?.qty);
};
const stockStatus = (qty) =>
  qty <= 0 ? "out" : qty <= LOW_STOCK ? "low" : "in";
const typeName = { 1: "Xe đạp", 2: "Xe điện", 3: "Xe ba gác" };
const imgSrc = (thumbnail) => {
  if (!thumbnail) return "";
  if (/^https?:\/\//i.test(thumbnail)) return thumbnail;
  return `/images/${String(thumbnail)
    .replace(/^\/?images\//, "")
    .replace(/^\//, "")}`;
};
const qtyColor = (qty) =>
  qty <= 0 ? "error.main" : qty <= LOW_STOCK ? "warning.dark" : "success.dark";
const getPackageQty = (variant) => {
  const n = Number(variant?.packageQuantity);
  return Number.isInteger(n) && n > 0 ? n : 1;
};

function StockBadge({ qty }) {
  const status = stockStatus(qty);
  return (
    <Chip
      size="small"
      variant="outlined"
      color={
        status === "out" ? "error" : status === "low" ? "warning" : "success"
      }
      icon={
        status === "out" ? (
          <RemoveShoppingCartOutlined />
        ) : status === "low" ? (
          <WarningAmberOutlined />
        ) : (
          <CheckCircleOutline />
        )
      }
      label={
        status === "out"
          ? "Hết hàng"
          : status === "low"
            ? "Sắp hết"
            : "Còn hàng"
      }
    />
  );
}

function SummaryCard({ title, value, color, icon, onClick, active, caption }) {
  return (
    <Card
      onClick={onClick}
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 3,
        cursor: onClick ? "pointer" : "default",
        borderColor: active ? color : "divider",
        bgcolor: active ? "action.hover" : "background.paper",
        transition: "all .15s",
        "&:hover": onClick ? { borderColor: color } : {},
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color, my: 0.5 }}>
              {fmt(value)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {caption}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: "action.hover",
              borderRadius: 2,
              p: 1.3,
              display: "flex",
              color,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [countMode, setCountMode] = useState(false);
  const [counts, setCounts] = useState({});
  const [page, setPage] = useState(1);
  const [loadedAll, setLoadedAll] = useState(true);
  const pageSize = 30;

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const all = [];
      const limit = 100; // API sản phẩm giới hạn tối đa 100 mỗi trang
      let complete = false;
      for (let currentPage = 1; currentPage <= 200; currentPage++) {
        const response = await axios.get(API_ENDPOINTS.PRODUCTS, {
          params: { type: "all", page: currentPage, limit },
        });
        const data = response?.data?.data ?? response?.data;
        const batch = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
            ? data.products
            : [];
        all.push(...batch);
        const pagination = data?.pagination;
        if (
          !batch.length ||
          (pagination?.totalPages &&
            currentPage >= Number(pagination.totalPages)) ||
          pagination?.hasMore === false ||
          (!pagination && batch.length < limit)
        ) {
          complete = true;
          break;
        }
      }
      const unique = [...new Map(all.map((p) => [String(p._id), p])).values()];
      setProducts(unique);
      setLoadedAll(complete);
      if (!complete)
        setError(
          "Danh sách có thể chưa tải đủ tất cả sản phẩm. Hãy kiểm tra phân trang API.",
        );
    } catch (e) {
      console.error("loadInventory:", e);
      setError(e?.response?.data?.message || "Không thể tải dữ liệu tồn kho");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, stockFilter]);

  const stats = useMemo(() => {
    const s = {
      products: products.length,
      qty: 0,
      low: 0,
      out: 0,
      in: 0,
      variants: 0,
    };
    products.forEach((p) => {
      const qty = getQty(p);
      s.qty += qty;
      s.variants += Math.max(1, getVariants(p).length);
      s[stockStatus(qty)]++;
    });
    return s;
  }, [products]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");
    return products
      .filter((p) => {
        const haystack = [
          p.title,
          p.brand,
          p.code,
          p._id,
          ...getVariants(p).map((v) => v.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("vi-VN");
        return (
          (!keyword || haystack.includes(keyword)) &&
          (typeFilter === "all" || String(p.type) === typeFilter) &&
          (stockFilter === "all" || stockStatus(getQty(p)) === stockFilter)
        );
      })
      .sort((a, b) => {
        const rank = { out: 0, low: 1, in: 2 };
        return (
          rank[stockStatus(getQty(a))] - rank[stockStatus(getQty(b))] ||
          String(a.title || "").localeCompare(String(b.title || ""), "vi")
        );
      });
  }, [products, search, typeFilter, stockFilter]);

  const visible = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const getKey = (p, variant, index) => `${p._id}::${variant?._id || index}`;
  const countResults = useMemo(() => {
    let checked = 0,
      match = 0,
      missing = 0,
      extra = 0;
    products.forEach((p) => {
      const variants = getVariants(p);
      const rows = variants.length ? variants : [null];
      rows.forEach((v, i) => {
        const key = getKey(p, v, i);
        if (counts[key] === undefined || counts[key] === "") return;
        checked++;
        const diff = Number(counts[key]) - (v ? toNumber(v.qty) : getQty(p));
        if (diff === 0) match++;
        else if (diff < 0) missing++;
        else extra++;
      });
    });
    return { checked, match, missing, extra };
  }, [products, counts]);

  const renderCount = (p, variant, index, expected) => {
    if (!countMode) return null;
    const key = getKey(p, variant, index);
    const raw = counts[key];
    const entered = raw !== undefined && raw !== "";
    const diff = entered ? Number(raw) - expected : null;
    return (
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ sm: "center" }}
        sx={{ mt: 1 }}
      >
        <TextField
          size="small"
          type="number"
          label="Đếm thực tế"
          value={raw ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== "" && (!/^\d+$/.test(v) || Number(v) < 0)) return;
            setCounts((prev) => ({ ...prev, [key]: v }));
          }}
          inputProps={{ min: 0, step: 1 }}
          sx={{ width: { xs: "100%", sm: 150 } }}
        />
        {entered && (
          <Chip
            size="small"
            color={diff === 0 ? "success" : diff < 0 ? "error" : "warning"}
            label={
              diff === 0
                ? "✓ Đủ hàng"
                : diff < 0
                  ? `Thiếu ${fmt(-diff)}`
                  : `Dư ${fmt(diff)}`
            }
          />
        )}
      </Stack>
    );
  };

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 5 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={850}>
            Kiểm tra tồn kho
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            Xem tồn kho theo từng phân loại, quy đổi kiện và đối chiếu hàng thực
            tế
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant={countMode ? "contained" : "outlined"}
            startIcon={<FactCheckOutlined />}
            onClick={() => {
              setCountMode((v) => !v);
              setExpanded(
                Object.fromEntries(products.map((p) => [p._id, true])),
              );
            }}
          >
            {countMode ? "Đang kiểm hàng" : "Bắt đầu kiểm hàng"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            disabled={loading}
            onClick={loadProducts}
          >
            Làm mới
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!loadedAll && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Thống kê chỉ tính trên dữ liệu đã tải.
        </Alert>
      )}

      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6} md={3}>
          <SummaryCard
            title="Mã sản phẩm"
            value={stats.products}
            caption={`${fmt(stats.variants)} dòng kiểm kho`}
            color="primary.main"
            icon={<Inventory2Outlined fontSize="large" />}
            onClick={() => setStockFilter("all")}
            active={stockFilter === "all"}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <SummaryCard
            title="Tổng số cái tồn"
            value={stats.qty}
            caption="Tổng theo phân loại"
            color="success.dark"
            icon={<CategoryOutlined fontSize="large" />}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <SummaryCard
            title="Sắp hết (≤5 cái)"
            value={stats.low}
            caption="Nhấn để lọc"
            color="warning.dark"
            icon={<WarningAmberOutlined fontSize="large" />}
            onClick={() => setStockFilter("low")}
            active={stockFilter === "low"}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <SummaryCard
            title="Hết hàng"
            value={stats.out}
            caption="Nhấn để lọc"
            color="error.main"
            icon={<RemoveShoppingCartOutlined fontSize="large" />}
            onClick={() => setStockFilter("out")}
            active={stockFilter === "out"}
          />
        </Grid>
      </Grid>

      {countMode && (
        <Alert
          severity="info"
          icon={<FactCheckOutlined />}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
            spacing={1}
          >
            <Box>
              <strong>Kiểm hàng thực tế:</strong> Đã kiểm{" "}
              {fmt(countResults.checked)} dòng · Đủ {fmt(countResults.match)} ·
              Thiếu {fmt(countResults.missing)} · Dư {fmt(countResults.extra)}.
              <Typography variant="caption" display="block">
                Số đếm chỉ lưu tạm trên trang này, không cập nhật kho trong
                database.
              </Typography>
            </Box>
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                if (window.confirm("Xóa toàn bộ số lượng đã kiểm trên trang?"))
                  setCounts({});
              }}
            >
              Xóa số đã đếm
            </Button>
          </Stack>
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm tên, mã, thương hiệu hoặc tên phân loại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={2.5}>
            <TextField
              select
              size="small"
              label="Loại xe"
              fullWidth
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">Tất cả loại</MenuItem>
              <MenuItem value="1">Xe đạp</MenuItem>
              <MenuItem value="2">Xe điện</MenuItem>
              <MenuItem value="3">Xe ba gác</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2.5}>
            <TextField
              select
              size="small"
              label="Tồn kho"
              fullWidth
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="in">Còn hàng</MenuItem>
              <MenuItem value="low">Sắp hết</MenuItem>
              <MenuItem value="out">Hết hàng</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={1}>
            <Tooltip title="Xóa bộ lọc">
              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setStockFilter("all");
                }}
              >
                <FilterAltOffOutlined />
              </Button>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.5 }}
      >
        <Typography variant="body2" color="text.secondary">
          Hiển thị <strong>{fmt(filtered.length)}</strong> /{" "}
          {fmt(products.length)} sản phẩm
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<ViewListOutlined />}
            onClick={() =>
              setExpanded(Object.fromEntries(visible.map((p) => [p._id, true])))
            }
          >
            Mở tất cả
          </Button>
          <Button size="small" onClick={() => setExpanded({})}>
            Thu gọn
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ py: 10, textAlign: "center" }}>
          <CircularProgress />
          <Typography mt={2}>Đang tải tồn kho...</Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 8, textAlign: "center", borderRadius: 3 }}
        >
          <Inventory2Outlined sx={{ fontSize: 54, color: "text.disabled" }} />
          <Typography color="text.secondary">
            Không tìm thấy sản phẩm phù hợp
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {visible.map((product) => {
            const variants = getVariants(product);
            const qty = getQty(product);
            const isOpen = Boolean(expanded[product._id]);
            const rows = variants.length ? variants : [null];
            return (
              <Card
                key={product._id}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  borderColor:
                    qty <= 0
                      ? "error.light"
                      : qty <= LOW_STOCK
                        ? "warning.light"
                        : "divider",
                }}
              >
                <CardContent
                  sx={{
                    p: { xs: 1.5, md: 2 },
                    "&:last-child": { pb: isOpen ? 1 : 2 },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: { xs: 64, sm: 78 },
                        height: { xs: 64, sm: 78 },
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        bgcolor: "grey.50",
                        flexShrink: 0,
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {product.thumbnail ? (
                        <Box
                          component="img"
                          src={imgSrc(product.thumbnail)}
                          alt={product.title || "Sản phẩm"}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <Inventory2Outlined
                          color="disabled"
                          sx={{ fontSize: 32 }}
                        />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={750} sx={{ lineHeight: 1.35 }}>
                        {product.title || "Chưa đặt tên"}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.7}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ mt: 0.8 }}
                      >
                        <Chip
                          size="small"
                          label={typeName[String(product.type)] || "Khác"}
                        />
                        {product.code && (
                          <Typography variant="caption" color="text.secondary">
                            Mã: {product.code}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {rows.length} phân loại
                        </Typography>
                      </Stack>
                    </Box>
                    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        Tổng tồn
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={850}
                        color={qtyColor(qty)}
                      >
                        {fmt(qty)}{" "}
                        <Typography component="span" variant="caption">
                          cái
                        </Typography>
                      </Typography>
                      <Box
                        sx={{ display: { xs: "none", sm: "block" }, mt: 0.5 }}
                      >
                        <StockBadge qty={qty} />
                      </Box>
                    </Box>
                    <Tooltip title="Chỉnh sửa sản phẩm">
                      <IconButton
                        size="small"
                        onClick={() =>
                          navigate(`/admin/products/${product._id}`)
                        }
                      >
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [product._id]: !prev[product._id],
                        }))
                      }
                      aria-label={
                        isOpen ? "Thu gọn phân loại" : "Xem phân loại"
                      }
                    >
                      {isOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </Stack>
                  {!isOpen && variants.length > 0 && (
                    <Box sx={{ mt: 1.5, pl: { sm: 11 } }}>
                      <Stack
                        direction="row"
                        spacing={0.7}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {variants.slice(0, 5).map((v, i) => (
                          <Chip
                            key={v._id || i}
                            size="small"
                            variant="outlined"
                            color={
                              stockStatus(toNumber(v.qty)) === "out"
                                ? "error"
                                : stockStatus(toNumber(v.qty)) === "low"
                                  ? "warning"
                                  : "default"
                            }
                            label={`${v.name || `Loại ${i + 1}`}: ${fmt(v.qty)}`}
                          />
                        ))}
                        {variants.length > 5 && (
                          <Chip
                            size="small"
                            label={`+${variants.length - 5} phân loại`}
                          />
                        )}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
                <Collapse in={isOpen} unmountOnExit>
                  <Divider />
                  <Box sx={{ bgcolor: "grey.50", p: { xs: 1, md: 2 } }}>
                    <Grid container spacing={1.2}>
                      {rows.map((v, i) => {
                        const rowQty = v ? toNumber(v.qty) : qty;
                        const pack = v ? getPackageQty(v) : 1;
                        const packs = Math.floor(rowQty / pack);
                        const loose = rowQty % pack;
                        return (
                          <Grid item xs={12} md={6} xl={4} key={v?._id || i}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.7,
                                borderRadius: 2,
                                height: "100%",
                                bgcolor: "white",
                              }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={1}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography fontWeight={750}>
                                    {v?.name ||
                                      (variants.length
                                        ? `Phân loại ${i + 1}`
                                        : "Không có phân loại")}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Quy cách: {fmt(pack)} cái / kiện
                                  </Typography>
                                </Box>
                                <StockBadge qty={rowQty} />
                              </Stack>
                              <Stack
                                direction="row"
                                alignItems="baseline"
                                spacing={0.7}
                                sx={{ mt: 1.3 }}
                              >
                                <Typography
                                  variant="h4"
                                  fontWeight={850}
                                  color={qtyColor(rowQty)}
                                >
                                  {fmt(rowQty)}
                                </Typography>
                                <Typography
                                  color="text.secondary"
                                  variant="body2"
                                >
                                  cái
                                </Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    (rowQty / Math.max(LOW_STOCK * 4, rowQty)) *
                                      100,
                                  ),
                                )}
                                color={
                                  rowQty <= 0
                                    ? "error"
                                    : rowQty <= LOW_STOCK
                                      ? "warning"
                                      : "success"
                                }
                                sx={{
                                  mt: 1,
                                  mb: 1.3,
                                  height: 5,
                                  borderRadius: 2,
                                }}
                              />
                              <Box
                                sx={{
                                  bgcolor: "action.hover",
                                  p: 1.1,
                                  borderRadius: 1.5,
                                }}
                              >
                                <Typography variant="body2">
                                  <strong>{fmt(packs)} kiện</strong>
                                  {loose ? ` + ${fmt(loose)} cái lẻ` : ""}
                                </Typography>
                              </Box>
                              {renderCount(product, v, i, rowQty)}
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                </Collapse>
              </Card>
            );
          })}
        </Stack>
      )}

      {!loading && filtered.length > pageSize && (
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="center"
          sx={{ mt: 3 }}
        >
          <Button
            variant="outlined"
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => p - 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            ← Trước
          </Button>
          <Typography variant="body2">
            Trang {page} / {pages}
          </Typography>
          <Button
            variant="outlined"
            disabled={page >= pages}
            onClick={() => {
              setPage((p) => p + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Sau →
          </Button>
        </Stack>
      )}
    </Box>
  );
}
