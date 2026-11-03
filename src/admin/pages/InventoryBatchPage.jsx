import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
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
  Refresh,
  Search,
  Visibility,
  Close,
  FactCheck,
} from "@mui/icons-material";
import SyncBatchCostsButton from "./SyncBatchCostsButton";

import { API_ENDPOINTS } from "../../api";

const money = (v) => `¥${Number(v || 0).toLocaleString("vi-VN")}`;
const date = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");
const sourceLabel = {
  receipt: "Phiếu nhập",
  historical: "Dựng từ lịch sử",
  opening: "Tồn đầu kỳ chưa rõ lô",
  manual: "Điều chỉnh thủ công",
};

export default function InventoryBatchPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [reconcile, setReconcile] = useState(null);
  const [busy, setBusy] = useState(false);

  const endpoint = API_ENDPOINTS.INVENTORY_BATCHES;
  const token = localStorage.getItem("adminToken"); // Hoặc accessToken tùy tên bạn lưu

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await axios.get(endpoint, {
        params: { page, limit: 30, search },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRows(data.batches || []);
      setSummary(data.summary || {});
      setPagination(data.pagination || {});
    } catch (e) {
      setError(e.response?.data?.message || "Không tải được danh sách lô.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openHistory = async (batch) => {
    try {
      setDetail(batch);
      const { data } = await axios.get(`${endpoint}/${batch._id}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setHistory(data.histories || []);
    } catch (e) {
      setError(e.response?.data?.message || "Không tải được lịch sử lô.");
    }
  };

  const runReconciliation = async () => {
    try {
      setBusy(true);
      const { data } = await axios.get(`${endpoint}/reconciliation`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setReconcile(data);
    } catch (e) {
      setError(e.response?.data?.message || "Không thể đối chiếu tồn.");
    } finally {
      setBusy(false);
    }
  };

  const backfillCurrentStock = async () => {
    const ok = window.confirm(
      "Phân bổ hàng loạt tồn kho hiện tại chưa có lô? Hệ thống sẽ tạo/cập nhật lô OPENING riêng cho từng sản phẩm/Variant còn thiếu, không thay đổi tồn Product và không gán giả vào lô nhập lịch sử. Nên sao lưu MongoDB trước khi chạy.",
    );
    if (!ok) return;
    try {
      setBusy(true);
      setError("");
      const { data } = await axios.post(
        `${endpoint}/backfill-current-stock`,
        {
          confirm: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const r = data.report || {};
      window.alert(
        `Hoàn tất\nĐã quét ${r.productsScanned || 0} sản phẩm\nTạo ${r.createdBatches || 0} lô mới\nCập nhật ${r.updatedBatches || 0} lô tồn đầu kỳ\nPhân bổ ${r.allocatedQty || 0} sản phẩm\nCó ${r.mismatchCount || 0} trường hợp lệch cần kiểm tra.`,
      );
      await Promise.all([load(), runReconciliation()]);
    } catch (e) {
      setError(
        e.response?.data?.message || "Không thể phân bổ tồn kho hiện tại.",
      );
    } finally {
      setBusy(false);
    }
  };

  const rebuildHistorical = async () => {
    const ok = window.confirm(
      "Chạy dựng lô lịch sử? Thao tác này không thay đổi tồn Product. Nếu đã có lô, dữ liệu sẽ bị từ chối trừ khi chọn replace trong API. Hãy sao lưu MongoDB trước.",
    );
    if (!ok) return;
    try {
      setBusy(true);

      const { data } = await axios.post(
        `${endpoint}/rebuild-historical`,
        { confirm: true },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      window.alert(
        `Hoàn tất. Tạo ${data.report?.createdBatches || 0} lô; tồn đầu kỳ chưa rõ lô: ${data.report?.openingBatches || 0}.`,
      );
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Không thể dựng lô lịch sử.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1600, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Quản lý lô nhập kho
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Theo dõi từng lần nhập, giá vốn và số lượng còn theo từng Variant.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <SyncBatchCostsButton apiUrl={`${endpoint}`} />
          <Button
            variant="outlined"
            startIcon={<FactCheck />}
            onClick={runReconciliation}
            disabled={busy}
          >
            Đối chiếu tồn
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FactCheck />}
            onClick={backfillCurrentStock}
            disabled={busy}
          >
            Phân bổ tồn hiện tại
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={rebuildHistorical}
            disabled={busy}
          >
            Dựng lô lịch sử
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={load}
            disabled={loading}
          >
            Làm mới
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {reconcile && (
        <Alert
          severity={reconcile.totalMismatches ? "warning" : "success"}
          sx={{ mb: 2 }}
        >
          Đối chiếu: {reconcile.totalMismatches} Variant/sản phẩm đang lệch giữa
          Product và tổng lô.
          {reconcile.rows?.slice(0, 5).map((x) => (
            <Typography key={`${x.productId}-${x.variantName}`} variant="body2">
              {x.productTitle} {x.variantName && `(${x.variantName})`}: Product{" "}
              {x.productQty}, lô {x.batchQty}, lệch {x.difference}
            </Typography>
          ))}
        </Alert>
      )}

      <Grid container spacing={2} mb={2}>
        {[
          ["Số lô", summary.batchCount || 0],
          ["Tổng số lượng còn", summary.remainingQty || 0],
          ["Giá trị tồn theo giá vốn", money(summary.inventoryValue)],
        ].map(([label, value]) => (
          <Grid item xs={12} sm={4} key={label}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm mã lô, tên sản phẩm, mã hàng hoặc Variant..."
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
          }}
        />
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Mã lô</TableCell>
              <TableCell>Sản phẩm</TableCell>
              <TableCell>Variant</TableCell>
              <TableCell>Ngày nhập</TableCell>
              <TableCell align="right">Nhập</TableCell>
              <TableCell align="right">Còn</TableCell>
              <TableCell align="right">Giá vốn</TableCell>
              <TableCell>Nguồn</TableCell>
              <TableCell align="center">Chi tiết</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              rows.map((b) => (
                <TableRow key={b._id} hover>
                  <TableCell>
                    <Typography fontWeight={700}>{b.batchCode}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{b.productTitle}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {b.productCode}
                    </Typography>
                  </TableCell>
                  <TableCell>{b.variantName || "Không Variant"}</TableCell>
                  <TableCell>{date(b.importDate)}</TableCell>
                  <TableCell align="right">{b.importQty}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      color={b.remainingQty > 0 ? "success" : "default"}
                      label={b.remainingQty}
                    />
                  </TableCell>
                  <TableCell align="right">{money(b.unitCost)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={sourceLabel[b.source] || b.source}
                    />
                    {b.sourceConfidence === "unknown" && (
                      <Typography
                        display="block"
                        variant="caption"
                        color="warning.main"
                      >
                        Nguồn chưa xác định
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => openHistory(b)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Chưa có dữ liệu lô nhập.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        spacing={2}
        mt={2}
      >
        <Typography variant="body2" color="text.secondary">
          Trang {pagination.page || 1}/{pagination.totalPages || 1} ·{" "}
          {pagination.total || 0} lô
        </Typography>
        <Button disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>
          Trước
        </Button>
        <Button
          disabled={page >= (pagination.totalPages || 1)}
          onClick={() => setPage((x) => x + 1)}
        >
          Sau
        </Button>
      </Stack>

      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            Chi tiết lô {detail?.batchCode}
            <IconButton onClick={() => setDetail(null)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Grid container spacing={1} mb={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Sản phẩm
                </Typography>
                <Typography>{detail.productTitle}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Variant
                </Typography>
                <Typography>{detail.variantName || "—"}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Số lượng nhập
                </Typography>
                <Typography>{detail.importQty}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Còn lại
                </Typography>
                <Typography fontWeight={800}>{detail.remainingQty}</Typography>
              </Grid>
            </Grid>
          )}
          <Divider sx={{ mb: 1 }} />
          <Typography fontWeight={700} mb={1}>
            Lịch sử xuất / nhập theo lô
          </Typography>
          {history.length ? (
            history.map((h) => (
              <Stack
                key={h._id}
                direction="row"
                justifyContent="space-between"
                py={1}
                borderBottom="1px solid"
                borderColor="divider"
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {h.referenceCode || h.type}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {date(h.created_at)} · {h.note}
                  </Typography>
                </Box>
                <Typography
                  fontWeight={700}
                  color={h.qty >= 0 ? "success.main" : "error.main"}
                >
                  {h.qty > 0 ? "+" : ""}
                  {h.qty}
                </Typography>
              </Stack>
            ))
          ) : (
            <Typography color="text.secondary">
              Chưa có lịch sử gắn với lô.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
