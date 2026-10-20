import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import { API_ENDPOINTS } from "../../api";

// Truyền API_URL từ router hoặc component cha.
// API_URL là endpoint danh sách sản phẩm của BE.
export default function ProductQuotePage() {
  const API_URL = API_ENDPOINTS.PRODUCTS;
  const token =
    localStorage.getItem("adminToken") || localStorage.getItem("accessToken");

  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedProducts = useMemo(() => Object.values(selected), [selected]);

  const getId = (product) => String(product._id ?? product.id ?? "");

  const getCode = (product) =>
    product.code ?? product.productCode ?? product.product_code ?? "";

  const getTitle = (product) => product.title ?? product.name ?? "";

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    const number = Number(value);

    if (Number.isFinite(number)) {
      return number.toLocaleString("vi-VN") + " ₫";
    }

    return String(value);
  };

  // Tải sản phẩm từ BE
  const loadProducts = useCallback(async () => {
    if (!API_URL) {
      setError("Chưa cấu hình API_URL sản phẩm.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = {
        page: page + 1,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (type) params.type = type;

      const response = await axios.get(API_URL, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const payload = response.data?.data ?? response.data;

      const list = Array.isArray(payload)
        ? payload
        : (payload?.products ?? payload?.items ?? payload?.results ?? []);

      const pagination = payload?.pagination ?? {};

      setProducts(list);
      setTotal(
        Number(
          pagination.total ??
            pagination.totalProducts ??
            payload?.total ??
            list.length,
        ),
      );
    } catch (err) {
      setProducts([]);
      setTotal(0);
      setError(
        err.response?.data?.message ??
          "Không tải được sản phẩm. Kiểm tra API_URL và quyền truy cập.",
      );
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, page, limit, search, type]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Tìm kiếm khi nhấn Enter hoặc nút tìm
  const handleSearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  // Chọn / bỏ chọn một sản phẩm
  const toggleProduct = (product) => {
    const id = getId(product);
    if (!id) return;

    setSelected((prev) => {
      const next = { ...prev };

      if (next[id]) {
        delete next[id];
      } else {
        next[id] = product;
      }

      return next;
    });
  };

  // Chọn / bỏ chọn tất cả sản phẩm của trang hiện tại
  const currentIds = products.map(getId).filter(Boolean);

  const allCurrentSelected =
    currentIds.length > 0 && currentIds.every((id) => Boolean(selected[id]));

  const toggleCurrentPage = () => {
    setSelected((prev) => {
      const next = { ...prev };

      if (allCurrentSelected) {
        currentIds.forEach((id) => delete next[id]);
      } else {
        products.forEach((product) => {
          const id = getId(product);
          if (id) next[id] = product;
        });
      }

      return next;
    });
  };

  // Xuất file Excel báo giá
  const exportExcel = () => {
    if (selectedProducts.length === 0) return;

    const rows = selectedProducts.map((product, index) => ({
      STT: index + 1,
      "Mã sản phẩm": getCode(product),
      "Tên sản phẩm": getTitle(product),
      "Đơn vị": product.unit ?? "",
      "Đơn giá (VNĐ)": Number(product.price) || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 7 },
      { wch: 20 },
      { wch: 42 },
      { wch: 12 },
      { wch: 20 },
    ];

    // Định dạng giá bán
    for (let row = 2; row <= rows.length + 1; row++) {
      const cell = worksheet[`E${row}`];

      if (cell) {
        cell.t = "n";
        cell.z = '#,##0 "₫"';
      }
    }

    // Đóng băng hàng tiêu đề và bật bộ lọc
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    worksheet["!autofilter"] = {
      ref: `A1:E${rows.length + 1}`,
    };

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Báo giá");

    const date = new Date().toLocaleDateString("sv-SE");

    XLSX.writeFile(workbook, `Nhat-Khang-Bike-Bao-Gia-${date}.xlsx`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Tạo báo giá
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Nhật Khang Bike · Chọn sản phẩm để xuất Excel
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="success"
          startIcon={<FileDownloadIcon />}
          onClick={exportExcel}
          disabled={selectedProducts.length === 0}
        >
          Xuất Excel ({selectedProducts.length})
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            fullWidth
            size="small"
            label="Tìm tên hoặc mã sản phẩm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />

          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Nhóm sản phẩm</InputLabel>
            <Select
              value={type}
              label="Nhóm sản phẩm"
              onChange={(e) => {
                setType(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">Tất cả nhóm</MenuItem>
              <MenuItem value="1">Phụ tùng xe đạp</MenuItem>
              <MenuItem value="2">Phụ tùng xe điện</MenuItem>
              <MenuItem value="3">Phụ tùng xe ba gác</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
          >
            Tìm kiếm
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography fontWeight={600}>Sản phẩm đã chọn</Typography>

            <Chip
              label={selectedProducts.length}
              color="primary"
              size="small"
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<DeleteOutlineIcon />}
              disabled={selectedProducts.length === 0}
              onClick={() => setSelected({})}
            >
              Bỏ chọn tất cả
            </Button>
          </Stack>
        </Stack>

        {selectedProducts.length > 0 ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedProducts.slice(0, 5).map(getTitle).join(", ")}
              {selectedProducts.length > 5
                ? ` và ${selectedProducts.length - 5} sản phẩm khác`
                : ""}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Chưa chọn sản phẩm nào.
          </Typography>
        )}
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allCurrentSelected}
                  indeterminate={
                    currentIds.some((id) => selected[id]) && !allCurrentSelected
                  }
                  onChange={toggleCurrentPage}
                  disabled={products.length === 0 || loading}
                />
              </TableCell>

              <TableCell>STT</TableCell>
              <TableCell>Mã hàng</TableCell>
              <TableCell>Tên sản phẩm</TableCell>
              <TableCell align="right">Giá bán</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Đang tải sản phẩm...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  Không tìm thấy sản phẩm.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product, index) => {
                const id = getId(product);
                const checked = Boolean(selected[id]);

                return (
                  <TableRow
                    key={id || index}
                    hover
                    selected={checked}
                    onClick={() => toggleProduct(product)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleProduct(product)}
                      />
                    </TableCell>

                    <TableCell>{page * limit + index + 1}</TableCell>

                    <TableCell>{getCode(product) || "—"}</TableCell>

                    <TableCell>{getTitle(product)}</TableCell>

                    <TableCell align="right">
                      {formatPrice(product.price)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={limit}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Sản phẩm mỗi trang"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} / ${count !== -1 ? count : `hơn ${to}`}`
          }
        />
      </TableContainer>
    </Box>
  );
}
