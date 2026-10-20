import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import html2canvas from "html2canvas";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
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
  Download,
  Image as ImageIcon,
  Search,
  DeleteOutline,
} from "@mui/icons-material";
import { API_ENDPOINTS } from "../api";

const PRODUCTS_API = API_ENDPOINTS.PRODUCTS;

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const getToken = () =>
  localStorage.getItem("adminToken") || localStorage.getItem("accessToken");

const getAuthConfig = () => {
  const token = getToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const getImageUrl = (thumbnail) => {
  if (!thumbnail) return "";

  const value = String(thumbnail).trim();

  if (/^data:image\//i.test(value)) return value;

  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith("/")) {
    return `${window.location.origin}${value}`;
  }

  return `${window.location.origin}/images/${value}`;
};

const QuoteImage = () => {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quoteDate] = useState(new Date().toLocaleDateString("vi-VN"));

  const quoteRef = useRef(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(PRODUCTS_API, {
        ...getAuthConfig(),
        params: {
          search: search.trim() || undefined,
          type: type || undefined,
          page: 1,
          limit: 10,
        },
      });

      const rows = response.data?.products || [];
      setProducts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không tải được sản phẩm. Kiểm tra API và đăng nhập admin.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, type]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const items = useMemo(() => Object.values(selected), [selected]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.quotePrice || 0) * Number(item.qty || 1),
        0,
      ),
    [items],
  );

  const toggleProduct = (product) => {
    const id = String(product._id);

    setSelected((prev) => {
      const next = { ...prev };

      if (next[id]) {
        delete next[id];
      } else {
        next[id] = {
          _id: id,
          title: product.title || product.name || "Sản phẩm",
          code: product.code || "",
          thumbnail: product.thumbnail || "",
          originalPrice: Number(product.price || 0),
          quotePrice: Number(product.price || 0),
          qty: 1,
        };
      }

      return next;
    });
  };

  const updateItem = (id, field, value) => {
    setSelected((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const removeItem = (id) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const generateImage = async () => {
    if (!items.length) {
      setNotice("Vui lòng chọn ít nhất một sản phẩm.");
      return;
    }

    if (!quoteRef.current) return;

    setGenerating(true);

    try {
      // Chờ các ảnh sản phẩm tải xong trước khi chụp.
      const images = Array.from(quoteRef.current.querySelectorAll("img"));

      await Promise.all(
        images.map(async (img) => {
          if (img.complete && img.naturalWidth > 0) return;

          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }),
      );

      const canvas = await html2canvas(quoteRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );

      if (!blob) throw new Error("Không tạo được ảnh PNG.");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `BaoGia-NhatKhangBike-${Date.now()}.png`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
      setNotice("Đã tạo ảnh báo giá PNG.");
    } catch (err) {
      console.error(err);
      setNotice("Tạo ảnh thất bại. Hãy kiểm tra đường dẫn ảnh sản phẩm.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, bgcolor: "#f5f6f8", minHeight: "100vh" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Tạo ảnh báo giá
          </Typography>
          <Typography color="text.secondary">
            NHẬT KHANG BIKE · Đã chạy phải chất
          </Typography>
        </Box>

        <Card>
          <Box sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Tìm sản phẩm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadProducts();
                }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1 }} />,
                }}
              />

              <FormControl sx={{ minWidth: 180 }}>
                <Select
                  value={type}
                  displayEmpty
                  onChange={(e) => setType(e.target.value)}
                >
                  <MenuItem value="">Tất cả loại phụ tùng</MenuItem>
                  <MenuItem value="1">Phụ tùng xe đạp</MenuItem>
                  <MenuItem value="2">Phụ tùng xe điện</MenuItem>
                  <MenuItem value="3">Phụ tùng xe ba gác</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                onClick={loadProducts}
                disabled={loading}
              >
                Tìm kiếm
              </Button>
            </Stack>
          </Box>

          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Chọn</TableCell>
                  <TableCell>Ảnh</TableCell>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell align="right">Giá gốc</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <CircularProgress size={26} />
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const id = String(product._id);
                    const checked = Boolean(selected[id]);

                    return (
                      <TableRow key={id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={checked}
                            onChange={() => toggleProduct(product)}
                          />
                        </TableCell>

                        <TableCell>
                          <Box
                            component="img"
                            src={getImageUrl(product.thumbnail)}
                            alt=""
                            sx={{
                              width: 54,
                              height: 48,
                              objectFit: "contain",
                              bgcolor: "#fff",
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography fontWeight={600}>
                            {product.title || product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.code || ""}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          {money(product.price)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                {!loading && !products.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Không tìm thấy sản phẩm
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700}>
              Sản phẩm trong báo giá ({items.length})
            </Typography>

            {items.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Chọn sản phẩm ở bảng trên để bắt đầu.
              </Alert>
            ) : (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sản phẩm</TableCell>
                      <TableCell align="right">Giá gốc</TableCell>
                      <TableCell align="right">Giá báo</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.title}</TableCell>

                        <TableCell align="right">
                          {money(item.originalPrice)}
                        </TableCell>

                        <TableCell sx={{ minWidth: 150 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={item.quotePrice}
                            inputProps={{ min: 0 }}
                            onChange={(e) =>
                              updateItem(item._id, "quotePrice", e.target.value)
                            }
                          />
                        </TableCell>

                        <TableCell sx={{ width: 90 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={item.qty}
                            inputProps={{ min: 1 }}
                            onChange={(e) =>
                              updateItem(
                                item._id,
                                "qty",
                                Math.max(1, Number(e.target.value) || 1),
                              )
                            }
                          />
                        </TableCell>

                        <TableCell>
                          <Button
                            color="error"
                            onClick={() => removeItem(item._id)}
                            aria-label="Xóa sản phẩm"
                          >
                            <DeleteOutline />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Divider sx={{ my: 2 }} />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={2}
            >
              <Typography variant="h6" fontWeight={800}>
                Tổng báo giá: {money(total)}
              </Typography>

              <Button
                variant="contained"
                size="large"
                startIcon={
                  generating ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <ImageIcon />
                  )
                }
                onClick={generateImage}
                disabled={generating || items.length === 0}
              >
                {generating ? "Đang tạo ảnh..." : "Tạo ảnh báo giá PNG"}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Khu vực được chụp thành ảnh PNG */}
        <Box sx={{ overflowX: "auto", pb: 2 }}>
          <Paper
            ref={quoteRef}
            elevation={0}
            sx={{
              width: 900,
              mx: "auto",
              p: 4,
              bgcolor: "#fff",
              color: "#172033",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Typography
                sx={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: "#123b67",
                  letterSpacing: 1,
                }}
              >
                NHẬT KHANG BIKE
              </Typography>

              <Typography sx={{ fontSize: 25, fontWeight: 800, mt: 2 }}>
                BẢNG BÁO GIÁ PHỤ TÙNG
              </Typography>

              <Typography sx={{ fontSize: 13, mt: 1, color: "#596579" }}>
                Ngày báo giá: {quoteDate}
              </Typography>
            </Box>

            <Divider sx={{ borderColor: "#123b67", borderBottomWidth: 2 }} />

            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "70px 1fr 130px 65px 140px",
                  gap: 1,
                  alignItems: "center",
                  p: 1.5,
                  bgcolor: "#123b67",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                <Box>HÌNH</Box>
                <Box>SẢN PHẨM</Box>
                <Box sx={{ textAlign: "right" }}>ĐƠN GIÁ</Box>
                <Box sx={{ textAlign: "center" }}>SL</Box>
              </Box>

              {items.map((item, index) => (
                <Box
                  key={item._id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "70px 1fr 130px 65px 140px",
                    gap: 1,
                    alignItems: "center",
                    minHeight: 86,
                    px: 1.5,
                    py: 1,
                    borderBottom: "1px solid #dce3eb",
                    bgcolor: index % 2 ? "#f5f8fc" : "#fff",
                    fontSize: 13,
                  }}
                >
                  <Box
                    component="img"
                    src={getImageUrl(item.thumbnail)}
                    alt={item.title}
                    crossOrigin="anonymous"
                    sx={{
                      width: 62,
                      height: 62,
                      objectFit: "contain",
                      bgcolor: "#fff",
                    }}
                  />

                  <Box>
                    <Typography
                      sx={{ fontSize: 14, fontWeight: 700, color: "#172033" }}
                    >
                      {item.title}
                    </Typography>
                    {item.code && (
                      <Typography sx={{ fontSize: 11, color: "#697586" }}>
                        Mã: {item.code}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {money(item.quotePrice)}
                  </Box>

                  <Box sx={{ textAlign: "center" }}>{item.qty}</Box>

                  <Box
                    sx={{
                      textAlign: "right",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  ></Box>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography
              sx={{
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#123b67",
              }}
            >
              NHẬT KHANG BIKE
            </Typography>
          </Paper>
        </Box>
      </Stack>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3500}
        onClose={() => setNotice("")}
        message={notice}
      />
    </Box>
  );
};

export default QuoteImage;
