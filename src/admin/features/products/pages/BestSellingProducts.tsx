import React, { useEffect, useState } from "react";
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
  Grid,
  MenuItem,
  Pagination,
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
import { API_ENDPOINTS } from "../../../../api";

type Variant = {
  name: string;
  soldQty: number;
  revenue: number;
  stockQty: number;
};
type Row = {
  _id: string;
  productTitle: string;
  productCode: string;
  thumbnail: string;
  soldQty: number;
  revenue: number;
  stockQty: number;
  orderCount: number;
  variants: Variant[];
};
type Stats = { totalProducts: number; totalSold: number; totalRevenue: number };
const vnd = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n || 0)} ₫`;
const num = (n: number) => new Intl.NumberFormat("vi-VN").format(n || 0);
const API = `${(API_ENDPOINTS as any).ORDER || (API_ENDPOINTS as any).ORDERS || ""}/best-selling-products`;

export default function BestSellingProducts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [top10, setTop10] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Stats>({
    totalProducts: 0,
    totalSold: 0,
    totalRevenue: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const [sortBy, setSortBy] = useState("qty");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("adminToken");
        const response = await axios.get(API, {
          params: {
            page,
            limit,
            search: keyword,
            type,
            sortBy,
            fromDate,
            toDate,
          },
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setRows(response.data.data || []);
        setTop10(response.data.top10 || []);
        setSummary(
          response.data.summary || {
            totalProducts: 0,
            totalSold: 0,
            totalRevenue: 0,
          },
        );
        setTotalPages(response.data.pagination?.totalPages || 1);
      } catch (e: any) {
        if (!axios.isCancel(e))
          setError(
            e.response?.data?.message || e.message || "Không thể tải thống kê",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [page, limit, keyword, type, sortBy, fromDate, toDate]);
  const getImageUrl = (filename?: string) => {
    if (!filename) {
      return "";
    }

    if (filename.startsWith("http://") || filename.startsWith("https://")) {
      return filename;
    }

    return `/images/${filename}`;
  };
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={800} mb={2}>
        Thống kê sản phẩm bán chạy
      </Typography>
      <Grid container spacing={2} mb={3}>
        {[
          ["Sản phẩm có phát sinh bán", num(summary.totalProducts)],
          ["Tổng số lượng xuất bán", num(summary.totalSold)],
          ["Doanh thu hàng hóa", vnd(summary.totalRevenue)],
        ].map(([label, value]) => (
          <Grid item xs={12} sm={4} key={label}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">{label}</Typography>
                <Typography variant="h5" fontWeight={800}>
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              label="Tên / mã sản phẩm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setKeyword(search);
                }
              }}
            />
            <Button
              variant="contained"
              onClick={() => {
                setPage(1);
                setKeyword(search);
              }}
            >
              Tìm
            </Button>
            <TextField
              select
              size="small"
              label="Loại sản phẩm"
              sx={{ minWidth: 175 }}
              value={type}
              onChange={(e) => {
                setPage(1);
                setType(e.target.value);
              }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="1">Xe đạp</MenuItem>
              <MenuItem value="2">Xe điện</MenuItem>
              <MenuItem value="3">Xe ba gác</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Xếp hạng theo"
              sx={{ minWidth: 165 }}
              value={sortBy}
              onChange={(e) => {
                setPage(1);
                setSortBy(e.target.value);
              }}
            >
              <MenuItem value="qty">Số lượng bán</MenuItem>
              <MenuItem value="revenue">Doanh thu</MenuItem>
            </TextField>
            <TextField
              size="small"
              type="date"
              label="Từ ngày"
              InputLabelProps={{ shrink: true }}
              value={fromDate}
              onChange={(e) => {
                setPage(1);
                setFromDate(e.target.value);
              }}
            />
            <TextField
              size="small"
              type="date"
              label="Đến ngày"
              InputLabelProps={{ shrink: true }}
              value={toDate}
              onChange={(e) => {
                setPage(1);
                setToDate(e.target.value);
              }}
            />
            <TextField
              select
              size="small"
              label="Số dòng"
              value={limit}
              onChange={(e) => {
                setPage(1);
                setLimit(Number(e.target.value));
              }}
              sx={{ width: 105 }}
            >
              {[10, 20, 50, 100].map((x) => (
                <MenuItem key={x} value={x}>
                  {x}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Top 10 sản phẩm
          </Typography>
          {top10.map((r, i) => (
            <Box
              key={r._id}
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
            >
              <Typography sx={{ width: 24 }}>{i + 1}</Typography>
              <Typography sx={{ width: 220, flexShrink: 0 }} noWrap>
                {r.productTitle}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  bgcolor: "grey.100",
                  height: 19,
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${(sortBy === "qty" ? r.soldQty / (top10[0]?.soldQty || 1) : r.revenue / (top10[0]?.revenue || 1)) * 100}%`,
                    bgcolor: "primary.main",
                  }}
                />
              </Box>
              <Typography sx={{ minWidth: 95, textAlign: "right" }}>
                {sortBy === "qty" ? num(r.soldQty) : vnd(r.revenue)}
              </Typography>
            </Box>
          ))}
          {!loading && !top10.length && (
            <Typography color="text.secondary">Chưa có dữ liệu.</Typography>
          )}
        </CardContent>
      </Card>
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  "Hạng",
                  "Sản phẩm",
                  "Đã bán",
                  "Doanh thu",
                  "Số đơn",
                  "Tồn kho",
                  "Phân loại",
                ].map((x) => (
                  <TableCell key={x}>
                    <b>{x}</b>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <React.Fragment key={r._id}>
                  <TableRow hover>
                    <TableCell>{(page - 1) * limit + i + 1}</TableCell>
                    <TableCell>
                      <Stack direction="row" gap={1} alignItems="center">
                        {r.thumbnail && (
                          <Box
                            component="img"
                            src={getImageUrl(r.thumbnail)}
                            sx={{ width: 42, height: 42, objectFit: "contain" }}
                          />
                        )}
                        <Box>
                          <Typography fontWeight={600}>
                            {r.productTitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.productCode}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip color="primary" label={num(r.soldQty)} />
                    </TableCell>
                    <TableCell>{vnd(r.revenue)}</TableCell>
                    <TableCell>{num(r.orderCount)}</TableCell>
                    <TableCell>{num(r.stockQty)}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() =>
                          setExpanded(expanded === r._id ? null : r._id)
                        }
                      >
                        {expanded === r._id
                          ? "Ẩn"
                          : `Xem (${r.variants.length})`}
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expanded === r._id} unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: "grey.50" }}>
                          {r.variants.map((v, j) => (
                            <Stack
                              key={j}
                              direction="row"
                              spacing={2}
                              py={0.5}
                              flexWrap="wrap"
                            >
                              <Typography sx={{ minWidth: 180 }}>
                                {v.name || "Mặc định"}
                              </Typography>
                              <Typography>
                                Đã bán: <b>{num(v.soldQty)}</b>
                              </Typography>
                              <Typography>
                                Doanh thu: {vnd(v.revenue)}
                              </Typography>
                              <Typography>Tồn: {num(v.stockQty)}</Typography>
                            </Stack>
                          ))}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
              {!loading && !rows.length && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Không có sản phẩm phù hợp
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          py={2}
          gap={2}
        >
          {loading && <CircularProgress size={22} />}
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Stack>
      </Card>
    </Box>
  );
}
