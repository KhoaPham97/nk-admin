import { useState } from "react";
import {
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import axios from "axios";
import { BASE_URL } from "../../api";

const API_URL = `${BASE_URL}/customers/recalculate-debt`;

export default function RecalculateDebtButton() {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"success" | "error" | "warning">(
    "success",
  );
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleRecalculate = async () => {
    setConfirmOpen(false);
    setLoading(true);

    try {
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("accessToken");

      const response = await axios.post(
        API_URL,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      const result = response.data;

      setSeverity(result.success ? "success" : "warning");
      setMessage(
        `${result.message || "Đối soát hoàn tất"}: ` +
          `Thành công ${result.updatedCount ?? 0}/${result.totalCustomers ?? 0} khách hàng. ` +
          `Lỗi: ${result.failedCount ?? 0}.`,
      );
    } catch (error: any) {
      setSeverity("error");
      setMessage(
        error.response?.data?.message ||
          "Không thể đối soát công nợ. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
      setOpenSnackbar(true);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="warning"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        startIcon={
          loading ? <CircularProgress size={18} color="inherit" /> : undefined
        }
      >
        {loading ? "Đang đối soát..." : "Đối soát công nợ"}
      </Button>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Đối soát công nợ toàn bộ khách hàng?</DialogTitle>

        <DialogContent>
          <Typography>
            Hệ thống sẽ tính lại công nợ từ các đơn hàng chưa hủy và cập nhật
            thông tin khách hàng. Dữ liệu kho và đơn hàng không bị thay đổi.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>

          <Button
            variant="contained"
            color="warning"
            onClick={handleRecalculate}
            disabled={loading}
          >
            Xác nhận đối soát
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={severity}
          onClose={() => setOpenSnackbar(false)}
          variant="filled"
        >
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
