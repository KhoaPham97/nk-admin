import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
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
  DeleteOutline,
  EditOutlined,
  RefreshOutlined,
} from "@mui/icons-material";
import { API_ENDPOINTS } from "../../api";

const DRAFTS_API = API_ENDPOINTS.INVENTORY_RECEIPTS + "/import-drafts";

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
});

const money = (value) =>
  `${Math.round(Number(value) || 0).toLocaleString("vi-VN")} ¥`;

export default function ImportDrafts() {
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(DRAFTS_API, {
        params: {
          page: 1,
          limit: 100,
          search,
          status: "draft",
        },
        headers: getHeaders(),
      });

      setDrafts(response.data?.drafts || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Không thể tải danh sách phiếu nháp",
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadDrafts, 300);
    return () => clearTimeout(timer);
  }, [loadDrafts]);

  const deleteDraft = async (draft) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa phiếu ${draft.code || ""}?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(draft._id);

      await axios.delete(`${DRAFTS_API}/${draft._id}`, {
        headers: getHeaders(),
      });

      setDrafts((previous) =>
        previous.filter((item) => item._id !== draft._id),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa phiếu nháp");
    } finally {
      setDeletingId("");
    }
  };

  const openDraft = (draft) => {
    navigate(`/admin/inventory/import?draftId=${draft._id}`);
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Phiếu nhập kho nháp
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Các phiếu này chưa làm thay đổi tồn kho.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={loadDrafts}
          >
            Làm mới
          </Button>

          <Button
            variant="contained"
            onClick={() => navigate("/admin/inventory/import")}
          >
            Tạo phiếu nhập
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TextField
            fullWidth
            size="small"
            label="Tìm mã phiếu, nhà cung cấp, sản phẩm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ mb: 2 }}
          />

          {loading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Mã phiếu</TableCell>
                    <TableCell>Nhà cung cấp</TableCell>
                    <TableCell align="right">Số mặt hàng</TableCell>
                    <TableCell align="right">Tổng số lượng</TableCell>
                    <TableCell align="right">Tổng tiền (CNY)</TableCell>
                    <TableCell>Ngày cập nhật</TableCell>
                    <TableCell align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {drafts.map((draft) => (
                    <TableRow key={draft._id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>{draft.code}</Typography>
                      </TableCell>

                      <TableCell>{draft.supplier || "—"}</TableCell>

                      <TableCell align="right">
                        {draft.items?.length || 0}
                      </TableCell>

                      <TableCell align="right">
                        {Number(draft.totalQty || 0).toLocaleString("vi-VN")}
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight={700}>
                          {money(draft.totalAmount)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {draft.updatedAt
                          ? new Date(draft.updatedAt).toLocaleString("vi-VN")
                          : "—"}
                      </TableCell>

                      <TableCell align="center">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          justifyContent="center"
                        >
                          <IconButton
                            color="primary"
                            onClick={() => openDraft(draft)}
                            title="Tiếp tục chỉnh sửa"
                          >
                            <EditOutlined />
                          </IconButton>

                          <IconButton
                            color="error"
                            disabled={deletingId === draft._id}
                            onClick={() => deleteDraft(draft)}
                            title="Xóa phiếu nháp"
                          >
                            {deletingId === draft._id ? (
                              <CircularProgress size={20} />
                            ) : (
                              <DeleteOutline />
                            )}
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!drafts.length && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" py={4}>
                          Chưa có phiếu nhập nháp
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
