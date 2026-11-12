import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  IconButton,
  Tooltip,
  Pagination,
  Divider,
  Alert,
} from "@mui/material";

import {
  Search,
  RefreshCw,
  Download,
  Copy,
  Package,
  Barcode,
  AlertTriangle,
  CheckCircle2,
  Layers3,
  ClipboardList,
} from "lucide-react";

import "../../../styles/SkuManagement.css";
import { BASE_URL } from "../../../../api";

const API_BASE = BASE_URL;

const getToken = () =>
  localStorage.getItem("adminToken") || localStorage.getItem("accessToken");

const typeLabels = {
  1: "Phụ tùng xe đạp",
  2: "Phụ tùng xe điện",
  3: "Phụ tùng xe ba gác",
};

const statusLabels = {
  all: "Tất cả trạng thái",
  complete: "Đầy đủ mã",
  missing: "Thiếu mã",
  duplicate: "Trùng mã",
};

export default function SkuManagement() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    withSku: 0,
    missing: 0,
    duplicate: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const fetchRows = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(limit),
          search,
          type,
          status,
        });

        const response = await fetch(
          `${API_BASE}/admin/sku?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể tải dữ liệu SKU.");
        }

        setRows(result.data || []);
        setStats(result.stats || {});
        setPagination({
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.totalPages || 1,
        });
        setPage(targetPage);
      } catch (err) {
        setError(err.message || "Có lỗi xảy ra.");
      } finally {
        setLoading(false);
      }
    },
    [limit, search, type, status],
  );

  useEffect(() => {
    fetchRows(1);
  }, [fetchRows]);

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  // =====================================================
  // COPY
  // =====================================================

  const copyText = async (value) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError("Không thể sao chép. Hãy kiểm tra quyền clipboard.");
    }
  };

  const copyCurrentPage = async () => {
    const content = rows
      .map((row) =>
        [
          row.productName,
          row.productCode,
          row.variantName,
          row.variantCode,
          row.sku,
        ].join("\t"),
      )
      .join("\n");

    await copyText(
      ["Tên sản phẩm\tMã sản phẩm\tBiến thể\tVariant Code\tSKU", content].join(
        "\n",
      ),
    );
  };

  // =====================================================
  // EXPORT CSV
  // =====================================================

  const handleExport = async () => {
    try {
      setExporting(true);
      setError("");

      const response = await fetch(`${API_BASE}/admin/sku/export.csv`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Không thể xuất file SKU.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "nhat-khang-bike-sku.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Xuất file thất bại.");
    } finally {
      setExporting(false);
    }
  };

  // =====================================================
  // STATUS
  // =====================================================

  const renderStatus = (row) => {
    if (row.duplicate) {
      return <Chip size="small" color="error" label="Trùng mã" />;
    }

    if (row.missing) {
      return <Chip size="small" color="warning" label="Thiếu mã" />;
    }

    return <Chip size="small" color="success" label="Đầy đủ" />;
  };

  const CodeCell = ({ value, label }) => (
    <Box className="sku-code-cell">
      <Typography
        className={`sku-code-text ${value ? "" : "empty"}`}
        title={value || ""}
      >
        {value || "Chưa có"}
      </Typography>

      {value && (
        <Tooltip title={`Sao chép ${label}`}>
          <IconButton size="small" onClick={() => copyText(value)}>
            <Copy size={15} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box className="sku-management">
      <Box className="sku-page-header">
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Quản lý SKU & Variant Code
          </Typography>

          <Typography color="text.secondary" variant="body2">
            Theo dõi mã định danh của toàn bộ biến thể sản phẩm.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={17} />}
            onClick={() => fetchRows(page)}
            disabled={loading}
          >
            Làm mới
          </Button>

          <Button
            variant="outlined"
            startIcon={<Copy size={17} />}
            onClick={copyCurrentPage}
            disabled={!rows.length}
          >
            Sao chép trang
          </Button>

          <Button
            variant="contained"
            startIcon={<Download size={17} />}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Đang xuất..." : "Xuất Excel / CSV"}
          </Button>
        </Stack>
      </Box>

      {/* STATISTICS */}

      <Grid container spacing={2} className="sku-stats">
        <Grid item xs={12} sm={6} md={3}>
          <Card className="sku-stat-card">
            <CardContent>
              <Box className="sku-stat-icon">
                <Layers3 size={22} />
              </Box>

              <Typography color="text.secondary">Tổng biến thể</Typography>

              <Typography variant="h4" fontWeight={800}>
                {Number(stats.total || 0).toLocaleString("vi-VN")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="sku-stat-card">
            <CardContent>
              <Box className="sku-stat-icon success">
                <CheckCircle2 size={22} />
              </Box>

              <Typography color="text.secondary">Có SKU</Typography>

              <Typography variant="h4" fontWeight={800}>
                {Number(stats.withSku || 0).toLocaleString("vi-VN")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="sku-stat-card">
            <CardContent>
              <Box className="sku-stat-icon warning">
                <AlertTriangle size={22} />
              </Box>

              <Typography color="text.secondary">Thiếu mã</Typography>

              <Typography variant="h4" fontWeight={800}>
                {Number(stats.missing || 0).toLocaleString("vi-VN")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="sku-stat-card">
            <CardContent>
              <Box className="sku-stat-icon danger">
                <Barcode size={22} />
              </Box>

              <Typography color="text.secondary">Trùng mã</Typography>

              <Typography variant="h4" fontWeight={800}>
                {Number(stats.duplicate || 0).toLocaleString("vi-VN")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* FILTER */}

      <Card className="sku-filter-card">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Tìm tên sản phẩm, SKU, Variant Code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Loại sản phẩm"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">Tất cả loại</MenuItem>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Trạng thái mã"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Search size={17} />}
                onClick={handleSearch}
              >
                Tìm kiếm
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* TABLE */}

      <Card className="sku-table-card">
        <Box className="sku-table-heading">
          <Box>
            <Typography fontWeight={800}>Danh sách biến thể</Typography>

            <Typography variant="caption" color="text.secondary">
              {pagination.total.toLocaleString("vi-VN")} kết quả
            </Typography>
          </Box>

          <TextField
            select
            size="small"
            label="Số dòng"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            sx={{ width: 110 }}
          >
            {[20, 40, 60, 100].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Divider />

        {loading ? (
          <Box className="sku-loading">
            <CircularProgress />
            <Typography color="text.secondary">Đang tải dữ liệu...</Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Box className="sku-empty">
            <ClipboardList size={42} />
            <Typography fontWeight={700}>Không tìm thấy biến thể</Typography>
            <Typography color="text.secondary" variant="body2">
              Thử thay đổi từ khóa hoặc bộ lọc.
            </Typography>
          </Box>
        ) : (
          <>
            <Box className="sku-table-scroll">
              <table className="sku-table">
                <thead>
                  <tr>
                    <th style={{ width: 55 }}>STT</th>
                    <th>Sản phẩm</th>
                    <th>Biến thể</th>
                    <th>Variant Code</th>
                    <th>SKU</th>
                    <th>Loại</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="sku-index">
                        {(page - 1) * limit + index + 1}
                      </td>

                      <td>
                        <Typography fontWeight={700}>
                          {row.productName}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          Mã SP: {row.productCode || "Chưa có"}
                        </Typography>
                      </td>

                      <td>
                        <Typography fontWeight={600}>
                          {row.variantName}
                        </Typography>
                      </td>

                      <td>
                        <CodeCell
                          value={row.variantCode}
                          label="Variant Code"
                        />
                      </td>

                      <td>
                        <CodeCell value={row.sku} label="SKU" />
                      </td>

                      <td>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={typeLabels[row.type] || "Chưa phân loại"}
                        />
                      </td>

                      <td>{renderStatus(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            <Box className="sku-pagination">
              <Typography variant="body2" color="text.secondary">
                Trang {page}/{pagination.totalPages}
              </Typography>

              <Pagination
                count={pagination.totalPages}
                page={page}
                onChange={(_, value) => fetchRows(value)}
                color="primary"
                shape="rounded"
              />
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
}
