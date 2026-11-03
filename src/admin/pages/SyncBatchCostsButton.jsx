import React, { useState } from "react";
import axios from "axios";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Box,
  Typography,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";

const SyncBatchCostsButton = ({ apiUrl }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSync = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("accessToken");

      const response = await axios.post(
        `${apiUrl}/sync-costs`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setResult(response.data.summary);
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể đồng bộ giá vốn");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="warning"
        startIcon={
          loading ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <SyncIcon />
          )
        }
        disabled={loading}
        onClick={() => setOpen(true)}
      >
        Đồng bộ giá vốn
      </Button>

      <Dialog
        open={open}
        onClose={() => !loading && setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Đồng bộ giá vốn các lô nhập</DialogTitle>

        <DialogContent>
          <Typography>
            Hệ thống sẽ tìm các lô chưa có giá vốn, đối chiếu sản phẩm và biến
            thể để lấy giá từ defaultPrice.
          </Typography>

          <Alert severity="info" sx={{ mt: 2 }}>
            Giá vốn giữ nguyên CNY. Những lô đã có giá vốn sẽ không bị ghi đè.
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Hủy
          </Button>

          <Button
            variant="contained"
            color="warning"
            onClick={handleSync}
            disabled={loading}
          >
            {loading ? "Đang đồng bộ..." : "Bắt đầu đồng bộ"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(result)}
        autoHideDuration={8000}
        onClose={() => setResult(null)}
      >
        <Alert severity="success" onClose={() => setResult(null)}>
          Đã cập nhật {result?.updated || 0} lô; bỏ qua {result?.skipped || 0}{" "}
          lô; lỗi {result?.failed || 0} lô.
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError("")}
      >
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SyncBatchCostsButton;
