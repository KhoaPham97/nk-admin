import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
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
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import { getRequest, patchRequest } from "../common/ApiMethod";

type CostRow = {
  productId: string;
  productTitle: string;
  productCode?: string;
  type: string;
  thumbnail?: string;
  variantIndex: number;
  variantName: string;
  sku?: string;
  unitCost: number;
  qty: number;
};

const money = (value: number) =>
  `${(Number(value) || 0).toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })} ¥`;
const CostManagement = () => {
  const [items, setItems] = useState<CostRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState({
    variants: 0,
    missing: 0,
    configured: 0,
  });
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [costStatus, setCostStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(30);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const rowKey = (row: CostRow) => `${row.productId}_${row.variantIndex}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getRequest({
        url: "/admin/cost-management",
        params: {
          page: page + 1,
          limit,
          search: search.trim(),
          type,
          costStatus,
        },
      });
      setItems(Array.isArray(res?.items) ? res.items : []);
      setSummary(res?.summary || { variants: 0, missing: 0, configured: 0 });
      setTotal(Number(res?.pagination?.total || 0));
      setDrafts({});
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Không tải được danh sách giá vốn",
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, type, costStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = useMemo(
    () => items.filter((row) => drafts[rowKey(row)] !== undefined),
    [items, drafts],
  );

  const save = async () => {
    if (!changed.length) return;
    const invalid = changed.find((row) => {
      const value = Number(drafts[rowKey(row)]);
      return (
        !Number.isFinite(value) ||
        value < 0 ||
        drafts[rowKey(row)].trim() === ""
      );
    });
    if (invalid) {
      setError(
        `Giá vốn của ${invalid.productTitle} / ${invalid.variantName} không hợp lệ`,
      );
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await patchRequest({
        url: "/admin/cost-management/bulk",
        data: {
          items: changed.map((row) => ({
            productId: row.productId,
            variantIndex: row.variantIndex,
            unitCost: Number(drafts[rowKey(row)]),
          })),
        },
      });
      setMessage(`Đã lưu giá vốn cho ${changed.length} biến thể`);
      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Không lưu được giá vốn",
      );
    } finally {
      setSaving(false);
    }
  };

  const setDraft = (row: CostRow, value: string) => {
    setDrafts((old) => ({ ...old, [rowKey(row)]: value }));
    setMessage("");
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Quản lý giá vốn
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Giá vốn chuẩn CNY (¥) theo từng biến thể. Không thay đổi giá bán
            hoặc tồn kho.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading}
          >
            Tải lại
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={save}
            disabled={!changed.length || saving}
          >
            {saving ? "Đang lưu..." : `Lưu thay đổi (${changed.length})`}
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mb={2}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Tổng biến thể
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {summary.variants.toLocaleString("vi-VN")}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Đã có giá vốn
          </Typography>
          <Typography variant="h5" fontWeight={700} color="success.main">
            {summary.configured.toLocaleString("vi-VN")}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Chưa có giá vốn
          </Typography>
          <Typography variant="h5" fontWeight={700} color="error.main">
            {summary.missing.toLocaleString("vi-VN")}
          </Typography>
        </Paper>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mb={2}>
        <TextField
          size="small"
          fullWidth
          label="Tìm tên, mã sản phẩm, thương hiệu"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <TextField
          size="small"
          select
          label="Loại hàng"
          sx={{ minWidth: 190 }}
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(0);
          }}
        >
          <MenuItem value="all">Tất cả loại hàng</MenuItem>
          <MenuItem value="1">Phụ tùng xe đạp</MenuItem>
          <MenuItem value="2">Phụ tùng xe điện</MenuItem>
          <MenuItem value="3">Phụ tùng xe ba gác</MenuItem>
        </TextField>
        <TextField
          size="small"
          select
          label="Trạng thái giá vốn"
          sx={{ minWidth: 190 }}
          value={costStatus}
          onChange={(e) => {
            setCostStatus(e.target.value);
            setPage(0);
          }}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value="missing">Chưa có giá vốn</MenuItem>
          <MenuItem value="set">Đã có giá vốn</MenuItem>
        </TextField>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Sản phẩm</TableCell>
              <TableCell>SKU / Phân loại</TableCell>
              <TableCell align="right">Tồn</TableCell>
              <TableCell align="right">Giá vốn (CNY ¥)</TableCell>
              <TableCell align="right">Trạng thái</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Không có biến thể phù hợp
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => {
                const key = rowKey(row);
                const value = drafts[key] ?? String(row.unitCost || 0);
                const isDirty =
                  drafts[key] !== undefined &&
                  Number(value) !== Number(row.unitCost || 0);
                return (
                  <TableRow key={key} hover>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Typography fontWeight={600}>
                        {row.productTitle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.productCode || "Chưa có mã"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <Typography>{row.variantName || "Mặc định"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.sku || "Không có SKU"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {Number(row.qty || 0).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell align="right" sx={{ minWidth: 190 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={value}
                        onChange={(e) => setDraft(row, e.target.value)}
                        inputProps={{
                          min: 0,
                          step: "0.01",
                          style: { textAlign: "right" },
                        }}
                        sx={{ width: 165 }}
                      />

                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        {money(Number(value))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {isDirty ? (
                        <Chip size="small" color="warning" label="Chưa lưu" />
                      ) : row.unitCost > 0 ? (
                        <Chip size="small" color="success" label="Đã có giá" />
                      ) : (
                        <Chip size="small" color="error" label="Thiếu giá" />
                      )}
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
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[20, 30, 50, 100]}
        />
      </TableContainer>
    </Box>
  );
};

export default CostManagement;
