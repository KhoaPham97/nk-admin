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
  DialogActions,
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
  Tooltip,
} from "@mui/material";

import {
  Refresh,
  Search,
  Visibility,
  Close,
  FactCheck,
  Edit,
  Inventory2,
} from "@mui/icons-material";

import SyncBatchCostsButton from "./SyncBatchCostsButton";
import { API_ENDPOINTS } from "../../api";

const money = (v) => `¥${Number(v || 0).toLocaleString("vi-VN")}`;

const number = (v) => Number(v || 0).toLocaleString("vi-VN");

const date = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");

const sourceLabel = {
  receipt: "Phiếu nhập",
  historical: "Dựng từ lịch sử",
  opening: "Tồn đầu kỳ",
  manual: "Điều chỉnh thủ công",
};

export default function InventoryBatchPage() {
  // Điều chỉnh tồn sản phẩm thực tế
  const [actualAdjustment, setActualAdjustment] = useState(null);
  const [actualQty, setActualQty] = useState("");
  const [actualNote, setActualNote] = useState("");
  const [savingActual, setSavingActual] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [reconcile, setReconcile] = useState(null);
  const [busy, setBusy] = useState(false);

  // Chỉnh tồn kho
  const [adjustmentBatch, setAdjustmentBatch] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [subtractBatchRow, setSubtractBatchRow] = useState(null);
  const [subtractBatchQty, setSubtractBatchQty] = useState("");
  const [subtractBatchNote, setSubtractBatchNote] = useState("");
  const [savingSubtractBatch, setSavingSubtractBatch] = useState(false);

  const openSubtractBatchDialog = (row) => {
    setSubtractBatchRow(row);
    setSubtractBatchQty("");
    setSubtractBatchNote("");
  };
  const endpoint = API_ENDPOINTS.INVENTORY_BATCHES;
  const token =
    localStorage.getItem("adminToken") || localStorage.getItem("accessToken");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const saveSubtractTotalBatchQty = async () => {
    if (!subtractBatchRow) return;

    const qty = Number(subtractBatchQty);

    if (!Number.isSafeInteger(qty) || qty <= 0) {
      setError("Số lượng cần trừ phải là số nguyên lớn hơn 0");
      return;
    }

    if (qty > Number(subtractBatchRow.batchQty || 0)) {
      setError("Số lượng cần trừ vượt tổng tồn lô");
      return;
    }

    if (!subtractBatchNote.trim()) {
      setError("Vui lòng nhập lý do điều chỉnh");
      return;
    }

    if (
      !window.confirm(
        `Xác nhận trừ ${qty} khỏi tổng tồn lô?\n` +
          `Tổng tồn lô hiện tại: ${subtractBatchRow.batchQty}\n` +
          `Sau điều chỉnh: ${subtractBatchRow.batchQty - qty}\n\n` +
          `Tồn Product và Variant sẽ không thay đổi.`,
      )
    )
      return;

    try {
      setSavingSubtractBatch(true);
      setError("");

      const payload = {
        qtyToSubtract: qty,
        note: subtractBatchNote.trim(),
      };

      if (subtractBatchRow.variantCode) {
        payload.variantCode = subtractBatchRow.variantCode;
      }

      if (subtractBatchRow.variantName) {
        payload.variantName = subtractBatchRow.variantName;
      }

      await axios.patch(
        `${endpoint}/products/${subtractBatchRow.productId}/subtract-total-batch-qty`,
        payload,
        authConfig,
      );

      setSubtractBatchRow(null);
      setSubtractBatchQty("");
      setSubtractBatchNote("");
      setSuccess("Đã trừ tổng tồn lô thành công theo FIFO.");

      await runReconciliation();
      await load();
    } catch (error) {
      setError(
        error.response?.data?.message || "Không thể điều chỉnh tổng tồn lô",
      );
    } finally {
      setSavingSubtractBatch(false);
    }
  };
  // =====================================================
  // LOAD DATA
  // =====================================================

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await axios.get(endpoint, {
        params: {
          page,
          limit: 30,
          search,
          sort: "created_at",
          order: "desc",
        },
        ...authConfig,
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

  // =====================================================
  // OPEN HISTORY
  // =====================================================

  const openHistory = async (batch) => {
    setDetail(batch);
    setHistory([]);
    setHistoryLoading(true);

    try {
      const { data } = await axios.get(
        `${endpoint}/${batch._id}/history`,
        authConfig,
      );

      setHistory(data.histories || []);
    } catch (e) {
      setError(e.response?.data?.message || "Không tải được lịch sử lô.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // =====================================================
  // RECONCILIATION
  // =====================================================

  const runReconciliation = async () => {
    try {
      setBusy(true);
      setError("");

      const { data } = await axios.get(
        `${endpoint}/reconciliation`,
        authConfig,
      );

      setReconcile(data);
    } catch (e) {
      setError(e.response?.data?.message || "Không thể đối chiếu tồn.");
    } finally {
      setBusy(false);
    }
  };

  // =====================================================
  // BACKFILL CURRENT STOCK
  // =====================================================

  const backfillCurrentStock = async () => {
    const ok = window.confirm(
      "Phân bổ hàng loạt tồn kho hiện tại chưa có lô?\n\n" +
        "Hệ thống sẽ tạo/cập nhật lô OPENING riêng cho từng sản phẩm/Variant còn thiếu.\n" +
        "Không thay đổi tồn Product và không gán giả vào lô nhập lịch sử.\n\n" +
        "Nên sao lưu MongoDB trước khi chạy.",
    );

    if (!ok) return;

    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const { data } = await axios.post(
        `${endpoint}/backfill-current-stock`,
        {
          confirm: true,
        },
        authConfig,
      );

      const r = data.report || {};

      window.alert(
        `Hoàn tất\n` +
          `Đã quét ${r.productsScanned || 0} sản phẩm\n` +
          `Tạo ${r.createdBatches || 0} lô mới\n` +
          `Cập nhật ${r.updatedBatches || 0} lô tồn đầu kỳ\n` +
          `Phân bổ ${r.allocatedQty || 0} sản phẩm\n` +
          `Có ${r.mismatchCount || 0} trường hợp lệch cần kiểm tra.`,
      );

      await load();
      await runReconciliation();
    } catch (e) {
      setError(
        e.response?.data?.message || "Không thể phân bổ tồn kho hiện tại.",
      );
    } finally {
      setBusy(false);
    }
  };

  // =====================================================
  // REBUILD HISTORICAL BATCHES
  // =====================================================

  const rebuildHistorical = async () => {
    const ok = window.confirm(
      "Chạy dựng lô lịch sử?\n\n" +
        "Thao tác này không thay đổi tồn Product.\n" +
        "Nếu đã có lô, dữ liệu có thể bị từ chối trừ khi API cho phép replace.\n\n" +
        "Hãy sao lưu MongoDB trước.",
    );

    if (!ok) return;

    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const { data } = await axios.post(
        `${endpoint}/rebuild-historical`,
        {
          confirm: true,
        },
        authConfig,
      );

      window.alert(
        `Hoàn tất.\n` +
          `Tạo ${data.report?.createdBatches || 0} lô.\n` +
          `Tồn đầu kỳ chưa rõ lô: ${data.report?.openingBatches || 0}.`,
      );

      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Không thể dựng lô lịch sử.");
    } finally {
      setBusy(false);
    }
  };

  // =====================================================
  // ADJUSTMENT: OPEN DIALOG
  // =====================================================

  const openAdjustment = (batch) => {
    setError("");
    setSuccess("");

    setAdjustmentBatch(batch);
    setAdjustmentQty(String(batch.remainingQty ?? 0));
    setAdjustmentNote("");
  };

  const closeAdjustment = () => {
    if (savingAdjustment) return;

    setAdjustmentBatch(null);
    setAdjustmentQty("");
    setAdjustmentNote("");
  };

  // =====================================================
  // ADJUSTMENT: SAVE
  // =====================================================

  const saveAdjustment = async () => {
    if (!adjustmentBatch) return;

    const newQty = Number(adjustmentQty);

    if (adjustmentQty === "" || !Number.isInteger(newQty) || newQty < 0) {
      setError("Số lượng tồn phải là số nguyên lớn hơn hoặc bằng 0.");
      return;
    }

    if (!adjustmentNote.trim()) {
      setError("Vui lòng nhập lý do điều chỉnh tồn kho.");
      return;
    }

    const oldQty = Number(adjustmentBatch.remainingQty || 0);

    if (newQty === oldQty) {
      setError("Số lượng mới không thay đổi so với tồn hiện tại.");
      return;
    }

    const delta = newQty - oldQty;

    const ok = window.confirm(
      `Xác nhận điều chỉnh tồn kho?\n\n` +
        `Mã lô: ${adjustmentBatch.batchCode}\n` +
        `Sản phẩm: ${adjustmentBatch.productTitle}\n` +
        `Tồn hiện tại: ${oldQty}\n` +
        `Tồn mới: ${newQty}\n` +
        `Chênh lệch: ${delta > 0 ? "+" : ""}${delta}\n\n` +
        `Lý do: ${adjustmentNote.trim()}`,
    );

    if (!ok) return;

    try {
      setSavingAdjustment(true);
      setError("");
      setSuccess("");

      await axios.patch(
        `${endpoint}/${adjustmentBatch._id}/remaining`,
        {
          remainingQty: newQty,
          note: adjustmentNote.trim(),
        },
        authConfig,
      );

      setAdjustmentBatch(null);
      setAdjustmentQty("");
      setAdjustmentNote("");

      setSuccess(
        `Đã điều chỉnh tồn lô ${adjustmentBatch.batchCode} thành ${newQty}.`,
      );

      await load();

      // Nếu popup chi tiết đang mở đúng lô vừa chỉnh thì cập nhật số lượng.
      setDetail((current) =>
        current?._id === adjustmentBatch._id
          ? {
              ...current,
              remainingQty: newQty,
            }
          : current,
      );
    } catch (e) {
      setError(e.response?.data?.message || "Không thể điều chỉnh tồn kho.");
    } finally {
      setSavingAdjustment(false);
    }
  };
  // =====================================================
  // ACTUAL STOCK ADJUSTMENT
  // =====================================================

  const openActualAdjustment = (row) => {
    console.log("[ACTUAL ADJUSTMENT] Click:", row);

    setError("");
    setSuccess("");
    setActualAdjustment(row);
    setActualQty(String(row.productQty ?? 0));
    setActualNote("");
  };

  const closeActualAdjustment = () => {
    if (savingActual) return;

    setActualAdjustment(null);
    setActualQty("");
    setActualNote("");
  };

  const saveActualAdjustment = async () => {
    if (!actualAdjustment) return;

    const newQty = Number(actualQty);

    if (actualQty === "" || !Number.isSafeInteger(newQty) || newQty < 0) {
      setError("Tồn thực tế phải là số nguyên không âm.");
      return;
    }

    if (!actualNote.trim()) {
      setError("Vui lòng nhập lý do điều chỉnh.");
      return;
    }

    const oldQty = Number(actualAdjustment.productQty || 0);

    if (newQty === oldQty) {
      setError("Tồn thực tế mới không thay đổi.");
      return;
    }

    const delta = newQty - oldQty;

    const ok = window.confirm(
      `XÁC NHẬN ĐIỀU CHỈNH TỒN THỰC TẾ?\n\n` +
        `Sản phẩm: ${actualAdjustment.productTitle}\n` +
        `Variant: ${actualAdjustment.variantName || "Mặc định"}\n\n` +
        `Tồn hiện tại: ${oldQty}\n` +
        `Tồn thực tế mới: ${newQty}\n` +
        `Chênh lệch: ${delta > 0 ? "+" : ""}${delta}\n\n` +
        `Tổng tồn lô: ${actualAdjustment.batchQty}\n` +
        `Lưu ý: Tồn lô không bị thay đổi.\n\n` +
        `Lý do: ${actualNote.trim()}`,
    );

    if (!ok) return;

    try {
      setSavingActual(true);
      setError("");
      setSuccess("");

      const payload = {
        actualQty: newQty,
        note: actualNote.trim(),
      };

      if (actualAdjustment.variantCode) {
        payload.variantCode = actualAdjustment.variantCode;
      }

      const { data } = await axios.patch(
        `${endpoint}/products/${actualAdjustment.productId}/adjust-actual-stock`,
        payload,
        authConfig,
      );

      setActualAdjustment(null);
      setActualQty("");
      setActualNote("");

      setSuccess(
        `Đã điều chỉnh tồn thực tế ${actualAdjustment.productTitle}: ` +
          `${oldQty} → ${newQty}. Tồn lô vẫn giữ nguyên.`,
      );

      // Cập nhật lại danh sách đối chiếu
      await runReconciliation();

      // Cập nhật lại danh sách lô nếu cần
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "Không thể điều chỉnh tồn thực tế.",
      );
    } finally {
      setSavingActual(false);
    }
  };
  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        maxWidth: 1600,
        mx: "auto",
      }}
    >
      {/* HEADER */}
      <Stack
        direction={{ xs: "column", lg: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", lg: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Quản lý lô nhập kho
          </Typography>

          <Typography color="text.secondary" variant="body2">
            Theo dõi từng lần nhập, giá vốn và số lượng còn theo từng Variant.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {/* <SyncBatchCostsButton apiUrl={`${endpoint}`} /> */}

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
            startIcon={<Inventory2 />}
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

      {/* ALERTS */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* RECONCILIATION RESULT */}

      {/* RECONCILIATION RESULT */}
      {reconcile && (
        <Paper variant="outlined" sx={{ mb: 2, overflow: "hidden" }}>
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box>
              <Typography fontWeight={800} variant="h6">
                Kết quả đối chiếu tồn kho
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {reconcile.totalMismatches || 0} trường hợp chênh lệch
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Chip
                color="warning"
                label={`Số trường hợp lệch: ${reconcile.totalMismatches || 0}`}
              />

              <IconButton
                size="small"
                onClick={runReconciliation}
                disabled={busy}
              >
                <Refresh />
              </IconButton>
            </Stack>
          </Box>

          <Divider />

          {reconcile.rows?.length ? (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell>Variant</TableCell>
                    <TableCell align="right">Tồn Product</TableCell>
                    <TableCell align="right">Tổng tồn lô</TableCell>
                    <TableCell align="right">Chênh lệch</TableCell>
                    <TableCell align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {reconcile.rows.map((x) => (
                    <TableRow
                      key={`${x.productId}-${x.variantCode || x.variantName || "default"}`}
                      hover
                    >
                      <TableCell>
                        <Typography fontWeight={700}>
                          {x.productTitle}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          {x.productCode}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {x.variantName || "Mặc định"}
                        {x.variantCode && (
                          <Typography
                            display="block"
                            variant="caption"
                            color="text.secondary"
                          >
                            {x.variantCode}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={700}>
                          {number(x.productQty)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={700}>
                          {number(x.batchQty)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {number(x.batchCount)} lô
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Chip
                          size="small"
                          color={x.difference > 0 ? "success" : "error"}
                          label={`${x.difference > 0 ? "+" : ""}${number(x.difference)}`}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title="Điều chỉnh tồn sản phẩm thực tế">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Edit />}
                            onClick={() => openActualAdjustment(x)}
                          >
                            Điều chỉnh thực tế
                          </Button>
                        </Tooltip>
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          startIcon={<Edit />}
                          onClick={() => openSubtractBatchDialog(x)}
                        >
                          Trừ tổng tồn lô
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box p={3} textAlign="center">
              <Chip
                color="success"
                icon={<FactCheck />}
                label="Không có trường hợp lệch"
              />
            </Box>
          )}

          <Box sx={{ p: 1.5, bgcolor: "action.hover" }}>
            <Typography variant="caption" color="text.secondary">
              Lưu ý: Điều chỉnh tồn thực tế chỉ cập nhật Product/Variant. Không
              thay đổi số lượng còn lại của các lô nhập.
            </Typography>
          </Box>
        </Paper>
      )}

      {/* SUMMARY */}
      <Grid container spacing={2} mb={2}>
        {[
          {
            label: "Tổng số lô",
            value: number(summary.batchCount),
          },
          {
            label: "Tổng số lượng còn",
            value: number(summary.remainingQty),
          },
          {
            label: "Giá trị tồn theo giá vốn",
            value: money(summary.inventoryValue),
          },
        ].map((item) => (
          <Grid item xs={12} sm={4} key={item.label}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary" mb={0.5}>
                  {item.label}
                </Typography>

                <Typography variant="h5" fontWeight={800}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* SEARCH */}
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
      </Paper>

      {/* TABLE */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ overflowX: "auto" }}
      >
        <Table size="small" sx={{ minWidth: 1050 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell>Mã lô</TableCell>
              <TableCell>Sản phẩm</TableCell>
              <TableCell>Variant</TableCell>
              <TableCell>Ngày nhập</TableCell>
              <TableCell align="right">Nhập</TableCell>
              <TableCell align="right">Còn</TableCell>
              <TableCell align="right">Giá vốn</TableCell>
              <TableCell>Nguồn</TableCell>
              <TableCell align="center">Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Đang tải dữ liệu...
                  </Typography>
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

                  <TableCell align="right">{number(b.importQty)}</TableCell>

                  <TableCell align="right">
                    <Chip
                      size="small"
                      color={Number(b.remainingQty) > 0 ? "success" : "default"}
                      label={number(b.remainingQty)}
                    />
                  </TableCell>

                  <TableCell align="right">{money(b.unitCost)}</TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={sourceLabel[b.source] || b.source || "—"}
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
                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="center"
                    >
                      <Tooltip title="Chỉnh tồn kho">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openAdjustment(b)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Xem lịch sử lô">
                        <IconButton size="small" onClick={() => openHistory(b)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">
                    Chưa có dữ liệu lô nhập.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* PAGINATION */}
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        spacing={1}
        mt={2}
        flexWrap="wrap"
      >
        <Typography variant="body2" color="text.secondary">
          Trang {pagination.page || 1}/{pagination.totalPages || 1} ·{" "}
          {number(pagination.total)} lô
        </Typography>

        <Button
          size="small"
          disabled={page <= 1 || loading}
          onClick={() => setPage((x) => x - 1)}
        >
          Trước
        </Button>

        <Button
          size="small"
          disabled={page >= (pagination.totalPages || 1) || loading}
          onClick={() => setPage((x) => x + 1)}
        >
          Sau
        </Button>
      </Stack>
      <Dialog
        open={Boolean(subtractBatchRow)}
        onClose={() => {
          if (!savingSubtractBatch) setSubtractBatchRow(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Trừ tổng tồn lô theo FIFO</DialogTitle>

        <DialogContent>
          {subtractBatchRow && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography fontWeight={700}>
                {subtractBatchRow.productTitle}
              </Typography>

              <Typography>
                Phân loại: {subtractBatchRow.variantName || "Mặc định"}
              </Typography>

              <Typography>
                Tổng tồn lô hiện tại: {subtractBatchRow.batchQty}
              </Typography>

              <TextField
                label="Số lượng cần trừ"
                type="number"
                fullWidth
                value={subtractBatchQty}
                onChange={(e) => setSubtractBatchQty(e.target.value)}
                inputProps={{
                  min: 1,
                  max: subtractBatchRow.batchQty,
                  step: 1,
                }}
              />

              <Typography fontWeight={700}>
                Tổng tồn lô sau điều chỉnh:{" "}
                {Math.max(
                  0,
                  Number(subtractBatchRow.batchQty || 0) -
                    Math.max(0, Number(subtractBatchQty || 0)),
                )}
              </Typography>

              <TextField
                label="Lý do trừ tồn"
                multiline
                minRows={2}
                fullWidth
                value={subtractBatchNote}
                onChange={(e) => setSubtractBatchNote(e.target.value)}
              />

              <Alert severity="info">
                Hệ thống trừ từ lô nhập cũ nhất trước. Không thay đổi tồn
                Product, Variant hoặc số lượng nhập ban đầu của lô.
              </Alert>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setSubtractBatchRow(null)}
            disabled={savingSubtractBatch}
          >
            Hủy
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={saveSubtractTotalBatchQty}
            disabled={savingSubtractBatch}
          >
            {savingSubtractBatch ? "Đang xử lý..." : "Xác nhận trừ tồn"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* =================================================
          ADJUSTMENT DIALOG
      ================================================== */}
      <Dialog
        open={!!adjustmentBatch}
        onClose={closeAdjustment}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography fontWeight={800} variant="h6">
                Điều chỉnh tồn kho
              </Typography>

              <Typography variant="caption" color="text.secondary">
                {adjustmentBatch?.batchCode}
              </Typography>
            </Box>

            <IconButton onClick={closeAdjustment} disabled={savingAdjustment}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {adjustmentBatch && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
                <Typography fontWeight={700}>
                  {adjustmentBatch.productTitle}
                </Typography>

                <Typography variant="body2" color="text.secondary" mb={1}>
                  Mã hàng: {adjustmentBatch.productCode || "—"}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Variant
                    </Typography>

                    <Typography fontWeight={600}>
                      {adjustmentBatch.variantName || "Không Variant"}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Ngày nhập
                    </Typography>

                    <Typography fontWeight={600}>
                      {date(adjustmentBatch.importDate)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Số lượng nhập ban đầu
                    </Typography>

                    <Typography fontWeight={700}>
                      {number(adjustmentBatch.importQty)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Tồn hiện tại
                    </Typography>

                    <Typography fontWeight={800} color="success.main">
                      {number(adjustmentBatch.remainingQty)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Alert severity="info">
                Chỉ điều chỉnh số lượng còn lại của lô. Số lượng nhập ban đầu và
                giá vốn không bị thay đổi.
              </Alert>

              <TextField
                fullWidth
                type="number"
                label="Số lượng tồn mới"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                inputProps={{
                  min: 0,
                  step: 1,
                }}
                disabled={savingAdjustment}
                helperText="Nhập số nguyên lớn hơn hoặc bằng 0."
              />

              {adjustmentQty !== "" &&
                Number.isInteger(Number(adjustmentQty)) &&
                Number(adjustmentQty) >= 0 && (
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2" color="text.secondary">
                        Chênh lệch tồn
                      </Typography>

                      <Typography
                        fontWeight={800}
                        color={
                          Number(adjustmentQty) -
                            Number(adjustmentBatch.remainingQty || 0) >
                          0
                            ? "success.main"
                            : Number(adjustmentQty) -
                                  Number(adjustmentBatch.remainingQty || 0) <
                                0
                              ? "error.main"
                              : "text.primary"
                        }
                      >
                        {Number(adjustmentQty) -
                          Number(adjustmentBatch.remainingQty || 0) >
                        0
                          ? "+"
                          : ""}
                        {number(
                          Number(adjustmentQty) -
                            Number(adjustmentBatch.remainingQty || 0),
                        )}
                      </Typography>
                    </Stack>
                  </Paper>
                )}

              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Lý do điều chỉnh"
                placeholder="Ví dụ: Kiểm kê thực tế thiếu 2 sản phẩm..."
                value={adjustmentNote}
                onChange={(e) => setAdjustmentNote(e.target.value)}
                disabled={savingAdjustment}
                required
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={closeAdjustment}
            color="inherit"
            disabled={savingAdjustment}
          >
            Hủy
          </Button>

          <Button
            variant="contained"
            onClick={saveAdjustment}
            disabled={
              savingAdjustment ||
              !adjustmentBatch ||
              adjustmentQty === "" ||
              !Number.isInteger(Number(adjustmentQty)) ||
              Number(adjustmentQty) < 0 ||
              !adjustmentNote.trim()
            }
            startIcon={
              savingAdjustment ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <Edit />
              )
            }
          >
            {savingAdjustment ? "Đang lưu..." : "Xác nhận điều chỉnh"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(actualAdjustment)}
        onClose={closeActualAdjustment}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Điều chỉnh tồn sản phẩm thực tế</DialogTitle>

        <DialogContent>
          {actualAdjustment && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography fontWeight={700}>
                {actualAdjustment.productTitle}
              </Typography>

              <Typography>
                Phân loại: {actualAdjustment.variantName || "Mặc định"}
              </Typography>

              <Typography>
                Tồn thực tế hiện tại: {actualAdjustment.productQty}
              </Typography>

              <Typography>
                Tổng tồn các lô: {actualAdjustment.batchQty}
              </Typography>

              <TextField
                label="Tồn thực tế mới"
                type="number"
                fullWidth
                value={actualQty}
                onChange={(e) => setActualQty(e.target.value)}
                inputProps={{ min: 0, step: 1 }}
              />

              <TextField
                label="Lý do điều chỉnh"
                fullWidth
                multiline
                minRows={2}
                value={actualNote}
                onChange={(e) => setActualNote(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeActualAdjustment}>Hủy</Button>

          <Button
            variant="contained"
            color="warning"
            onClick={saveActualAdjustment}
            disabled={savingActual}
          >
            {savingActual ? "Đang lưu..." : "Xác nhận điều chỉnh"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* =================================================
          BATCH HISTORY DIALOG
      ================================================== */}
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
            <Box>
              <Typography fontWeight={800}>
                Chi tiết lô {detail?.batchCode}
              </Typography>
            </Box>

            <IconButton onClick={() => setDetail(null)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {detail && (
            <Grid container spacing={2} mb={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Sản phẩm
                </Typography>

                <Typography fontWeight={600}>{detail.productTitle}</Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Variant
                </Typography>

                <Typography fontWeight={600}>
                  {detail.variantName || "—"}
                </Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Số lượng nhập
                </Typography>

                <Typography fontWeight={600}>
                  {number(detail.importQty)}
                </Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Còn lại
                </Typography>

                <Typography fontWeight={800} color="success.main">
                  {number(detail.remainingQty)}
                </Typography>
              </Grid>
            </Grid>
          )}

          <Divider sx={{ mb: 2 }} />

          <Typography fontWeight={700} mb={1}>
            Lịch sử xuất / nhập / điều chỉnh theo lô
          </Typography>

          {historyLoading ? (
            <Box textAlign="center" py={3}>
              <CircularProgress size={26} />
            </Box>
          ) : history.length ? (
            history.map((h) => (
              <Stack
                key={h._id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                py={1.5}
                borderBottom="1px solid"
                borderColor="divider"
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {h.referenceCode || h.type}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    {date(h.created_at)}
                  </Typography>

                  {h.note && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {h.note}
                    </Typography>
                  )}
                </Box>

                <Typography
                  fontWeight={800}
                  color={
                    h.qty > 0
                      ? "success.main"
                      : h.qty < 0
                        ? "error.main"
                        : "text.primary"
                  }
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {h.qty > 0 ? "+" : ""}
                  {number(h.qty)}
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
