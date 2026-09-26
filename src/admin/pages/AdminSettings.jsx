import React, { useEffect, useState } from "react";
import axios from "axios";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import {
  AccountBalance,
  Business,
  LocalShipping,
  Lock,
  Payments,
  Refresh,
  Save,
  Settings as SettingsIcon,
  ShoppingCart,
  Store,
  Visibility,
  VisibilityOff,
  Web,
} from "@mui/icons-material";

import { API_ENDPOINTS } from "../../api";

// ============================================================
// DEFAULT SETTINGS
// ============================================================

const DEFAULT_SETTINGS = {
  storeName: "NHẬT KHANG BIKE",
  phone: "",
  email: "",
  address: "",
  website: "",
  logo: "",

  order: {
    allowOrder: true,
    autoConfirm: false,
    autoComplete: false,
    holdMinutes: 30,
    allowCancel: true,
    syncPriceBeforeComplete: true,
  },

  payment: {
    cash: true,
    bankTransfer: true,
    cod: true,
    qrCode: true,
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  },

  shipping: {
    enabled: true,
    defaultFee: 0,
    freeShippingFrom: 0,
    note: "",
  },

  pricing: {
    currency: "VND",
    syncPriceForUncompletedOrders: true,
    setPaidWhenCompleted: true,
    useCurrentSellingPriceWhenComplete: true,
  },

  websiteSettings: {
    siteName: "Nhật Khang Bike",
    slogan: "Đã chạy phải chất",
    maintenanceMode: false,
    showPhone: true,
    showAddress: true,
    showPrice: false,
    announcement: "",
  },
};

// ============================================================
// NORMALIZE SETTINGS
// ============================================================

const normalizeSettings = (data = {}) => {
  return {
    ...DEFAULT_SETTINGS,
    ...data,

    order: {
      ...DEFAULT_SETTINGS.order,
      ...(data.order || {}),
    },

    payment: {
      ...DEFAULT_SETTINGS.payment,
      ...(data.payment || {}),
    },

    shipping: {
      ...DEFAULT_SETTINGS.shipping,
      ...(data.shipping || {}),
    },

    pricing: {
      ...DEFAULT_SETTINGS.pricing,
      ...(data.pricing || {}),
    },

    websiteSettings: {
      ...DEFAULT_SETTINGS.websiteSettings,
      ...(data.websiteSettings || {}),
    },
  };
};

// ============================================================
// SECTION TITLE
// ============================================================

const SectionTitle = ({ icon, title, description }) => {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={3}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "primary.main",
          color: "primary.contrastText",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Stack>
  );
};

// ============================================================
// ADMIN SETTINGS
// ============================================================

const AdminSettings = () => {
  // ==========================================================
  // SETTINGS STATE
  // ==========================================================

  const [settings, setSettings] = useState(normalizeSettings());

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [resetting, setResetting] = useState(false);

  // ==========================================================
  // MESSAGE
  // ==========================================================

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  // ==========================================================
  // PASSWORD STATE
  // ==========================================================

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);

  // ==========================================================
  // GET ACCESS TOKEN
  // ==========================================================

  const getAccessToken = () => {
    return localStorage.getItem("adminToken");
  };

  // ==========================================================
  // AUTH CONFIG
  // ==========================================================

  const getAuthConfig = () => {
    const token = getAccessToken();

    if (!token) {
      throw new Error("ACCESS_TOKEN_MISSING");
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // ==========================================================
  // LOAD SETTINGS
  // ==========================================================

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(API_ENDPOINTS.SETTINGS);

      const data = response?.data?.data || response?.data || {};

      setSettings(normalizeSettings(data));
    } catch (err) {
      console.error("Load settings error:", err);

      setError(err?.response?.data?.message || "Không thể tải cấu hình");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadSettings();
  }, []);

  // ==========================================================
  // UPDATE ROOT
  // ==========================================================

  const updateRoot = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ==========================================================
  // UPDATE GROUP
  // ==========================================================

  const updateGroup = (group, field, value) => {
    setSettings((prev) => ({
      ...prev,

      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  };

  // ==========================================================
  // SAVE SETTINGS
  // ==========================================================

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await axios.put(API_ENDPOINTS.SETTINGS, settings);

      const data = response?.data?.data;

      if (data) {
        setSettings(normalizeSettings(data));
      }

      setMessage("Lưu cấu hình thành công");
    } catch (err) {
      console.error("Save settings error:", err);

      setError(err?.response?.data?.message || "Không thể lưu cấu hình");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // RESET SETTINGS
  // ==========================================================

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn khôi phục toàn bộ cấu hình mặc định?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setResetting(true);
      setMessage("");
      setError("");

      const response = await axios.post(`${API_ENDPOINTS.SETTINGS}/reset`);

      const data = response?.data?.data;

      if (data) {
        setSettings(normalizeSettings(data));
      } else {
        setSettings(normalizeSettings());
      }

      setMessage("Đã khôi phục cấu hình mặc định");
    } catch (err) {
      console.error("Reset settings error:", err);

      setError(err?.response?.data?.message || "Không thể khôi phục cấu hình");
    } finally {
      setResetting(false);
    }
  };

  // ==========================================================
  // CHANGE ADMIN PASSWORD
  // ==========================================================

  const handleChangePassword = async () => {
    setMessage("");
    setError("");

    // ------------------------------------------------------
    // GET TOKEN
    // ------------------------------------------------------

    const token = getAccessToken();

    if (!token) {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

      return;
    }

    // ------------------------------------------------------
    // GET PASSWORD
    // ------------------------------------------------------

    const currentPassword = passwordData.currentPassword;

    const newPassword = passwordData.newPassword;

    const confirmPassword = passwordData.confirmPassword;

    // ------------------------------------------------------
    // VALIDATE
    // ------------------------------------------------------

    if (!currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại");

      return;
    }

    if (!newPassword) {
      setError("Vui lòng nhập mật khẩu mới");

      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");

      return;
    }

    if (!confirmPassword) {
      setError("Vui lòng xác nhận mật khẩu mới");

      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");

      return;
    }

    if (currentPassword === newPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại");

      return;
    }

    // ------------------------------------------------------
    // REQUEST
    // ------------------------------------------------------

    try {
      setChangingPassword(true);

      const response = await axios.put(
        API_ENDPOINTS.CHANGE_ADMIN_PASSWORD,
        {
          currentPassword: currentPassword,
          newPassword: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setMessage(response?.data?.message || "Đổi mật khẩu thành công");

      // ----------------------------------------------------
      // CLEAR FORM
      // ----------------------------------------------------

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowCurrentPassword(false);

      setShowNewPassword(false);

      setShowConfirmPassword(false);
    } catch (err) {
      console.error("Change password error:", err);

      // ----------------------------------------------------
      // 401
      // ----------------------------------------------------

      if (err?.response?.status === 401) {
        setError(
          err?.response?.data?.message ||
            "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
        );

        return;
      }

      setError(err?.response?.data?.message || "Không thể đổi mật khẩu");
    } finally {
      setChangingPassword(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />

          <Typography color="text.secondary">Đang tải cấu hình...</Typography>
        </Stack>
      </Box>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1400,
        mx: "auto",
        px: {
          xs: 1,
          sm: 2,
          md: 3,
        },
        pb: 6,
      }}
    >
      {/* ====================================================
          HEADER
      ==================================================== */}

      <Stack
        direction={{
          xs: "column",
          sm: "row",
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "stretch",
          sm: "center",
        }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <SettingsIcon />

            <Typography variant="h5" fontWeight={700}>
              Cài đặt
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Quản lý cấu hình hệ thống Nhật Khang Bike
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={resetting ? <CircularProgress size={18} /> : <Refresh />}
            disabled={saving || resetting}
            onClick={handleReset}
            sx={{
              height: 44,
              borderRadius: 2,
              fontWeight: 600,
            }}
          >
            Khôi phục
          </Button>

          <Button
            variant="contained"
            startIcon={
              saving ? <CircularProgress size={18} color="inherit" /> : <Save />
            }
            disabled={saving || resetting}
            onClick={handleSave}
            sx={{
              height: 44,
              minWidth: 140,
              borderRadius: 2,
              fontWeight: 700,
            }}
          >
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </Stack>
      </Stack>

      {/* ====================================================
          ALERT
      ==================================================== */}

      {(message || error) && (
        <Alert
          severity={error ? "error" : "success"}
          onClose={() => {
            setMessage("");
            setError("");
          }}
          sx={{ mb: 2 }}
        >
          {error || message}
        </Alert>
      )}

      {/* ====================================================
          STORE
      ==================================================== */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <SectionTitle
            icon={<Store />}
            title="Thông tin cửa hàng"
            description="Thông tin hiển thị cho khách hàng"
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tên cửa hàng"
                value={settings.storeName}
                onChange={(e) => updateRoot("storeName", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Số điện thoại"
                value={settings.phone}
                onChange={(e) => updateRoot("phone", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                value={settings.email}
                onChange={(e) => updateRoot("email", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Website"
                value={settings.website}
                onChange={(e) => updateRoot("website", e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Địa chỉ"
                value={settings.address}
                onChange={(e) => updateRoot("address", e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Logo URL"
                value={settings.logo}
                onChange={(e) => updateRoot("logo", e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ====================================================
          ORDER
      ==================================================== */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <SectionTitle
            icon={<ShoppingCart />}
            title="Đơn hàng"
            description="Cấu hình quy trình xử lý đơn hàng"
          />

          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.order.allowOrder}
                    onChange={(e) =>
                      updateGroup("order", "allowOrder", e.target.checked)
                    }
                  />
                }
                label="Cho phép đặt hàng"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.order.autoConfirm}
                    onChange={(e) =>
                      updateGroup("order", "autoConfirm", e.target.checked)
                    }
                  />
                }
                label="Tự động xác nhận đơn"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.order.allowCancel}
                    onChange={(e) =>
                      updateGroup("order", "allowCancel", e.target.checked)
                    }
                  />
                }
                label="Cho phép hủy đơn"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.order.syncPriceBeforeComplete}
                    onChange={(e) =>
                      updateGroup(
                        "order",
                        "syncPriceBeforeComplete",
                        e.target.checked,
                      )
                    }
                  />
                }
                label="Đồng bộ giá trước khi hoàn thành"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Thời gian giữ đơn"
                value={settings.order.holdMinutes}
                onChange={(e) =>
                  updateGroup("order", "holdMinutes", Number(e.target.value))
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">phút</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ====================================================
          PAYMENT
      ==================================================== */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <SectionTitle
            icon={<Payments />}
            title="Thanh toán"
            description="Các phương thức thanh toán"
          />

          <Grid container spacing={1} mb={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.payment.cash}
                    onChange={(e) =>
                      updateGroup("payment", "cash", e.target.checked)
                    }
                  />
                }
                label="Tiền mặt"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.payment.bankTransfer}
                    onChange={(e) =>
                      updateGroup("payment", "bankTransfer", e.target.checked)
                    }
                  />
                }
                label="Chuyển khoản"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.payment.cod}
                    onChange={(e) =>
                      updateGroup("payment", "cod", e.target.checked)
                    }
                  />
                }
                label="COD"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.payment.qrCode}
                    onChange={(e) =>
                      updateGroup("payment", "qrCode", e.target.checked)
                    }
                  />
                }
                label="QR Code"
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Ngân hàng"
                value={settings.payment.bankName}
                onChange={(e) =>
                  updateGroup("payment", "bankName", e.target.value)
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountBalance />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Số tài khoản"
                value={settings.payment.bankAccountNumber}
                onChange={(e) =>
                  updateGroup("payment", "bankAccountNumber", e.target.value)
                }
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Tên tài khoản"
                value={settings.payment.bankAccountName}
                onChange={(e) =>
                  updateGroup("payment", "bankAccountName", e.target.value)
                }
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ====================================================
          SHIPPING
      ==================================================== */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <SectionTitle
            icon={<LocalShipping />}
            title="Vận chuyển"
            description="Cấu hình phí và chính sách giao hàng"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.shipping.enabled}
                onChange={(e) =>
                  updateGroup("shipping", "enabled", e.target.checked)
                }
              />
            }
            label="Bật vận chuyển"
          />

          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Phí vận chuyển mặc định"
                value={settings.shipping.defaultFee}
                onChange={(e) =>
                  updateGroup("shipping", "defaultFee", Number(e.target.value))
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">đ</InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Miễn phí ship từ"
                value={settings.shipping.freeShippingFrom}
                onChange={(e) =>
                  updateGroup(
                    "shipping",
                    "freeShippingFrom",
                    Number(e.target.value),
                  )
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">đ</InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Ghi chú vận chuyển"
                value={settings.shipping.note}
                onChange={(e) =>
                  updateGroup("shipping", "note", e.target.value)
                }
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ====================================================
          PRICING
      ==================================================== */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <SectionTitle
            icon={<Business />}
            title="Giá bán"
            description="Cấu hình cách hệ thống xử lý giá"
          />

          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.pricing.syncPriceForUncompletedOrders}
                  onChange={(e) =>
                    updateGroup(
                      "pricing",
                      "syncPriceForUncompletedOrders",
                      e.target.checked,
                    )
                  }
                />
              }
              label="Đồng bộ giá cho đơn chưa hoàn thành"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.pricing.useCurrentSellingPriceWhenComplete}
                  onChange={(e) =>
                    updateGroup(
                      "pricing",
                      "useCurrentSellingPriceWhenComplete",
                      e.target.checked,
                    )
                  }
                />
              }
              label="Khi hoàn thành lấy giá bán hiện tại"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.pricing.setPaidWhenCompleted}
                  onChange={(e) =>
                    updateGroup(
                      "pricing",
                      "setPaidWhenCompleted",
                      e.target.checked,
                    )
                  }
                />
              }
              label="Khi hoàn thành tự động chốt đã thanh toán"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* ====================================================
          WEBSITE
      ==================================================== */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <SectionTitle
            icon={<Web />}
            title="Website"
            description="Cấu hình giao diện website"
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tên website"
                value={settings.websiteSettings.siteName}
                onChange={(e) =>
                  updateGroup("websiteSettings", "siteName", e.target.value)
                }
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Slogan"
                value={settings.websiteSettings.slogan}
                onChange={(e) =>
                  updateGroup("websiteSettings", "slogan", e.target.value)
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Thông báo website"
                value={settings.websiteSettings.announcement}
                onChange={(e) =>
                  updateGroup("websiteSettings", "announcement", e.target.value)
                }
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.websiteSettings.maintenanceMode}
                    onChange={(e) =>
                      updateGroup(
                        "websiteSettings",
                        "maintenanceMode",
                        e.target.checked,
                      )
                    }
                  />
                }
                label="Bảo trì website"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.websiteSettings.showPhone}
                    onChange={(e) =>
                      updateGroup(
                        "websiteSettings",
                        "showPhone",
                        e.target.checked,
                      )
                    }
                  />
                }
                label="Hiển thị số điện thoại"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.websiteSettings.showAddress}
                    onChange={(e) =>
                      updateGroup(
                        "websiteSettings",
                        "showAddress",
                        e.target.checked,
                      )
                    }
                  />
                }
                label="Hiển thị địa chỉ"
              />
            </Grid>

            {/* SHOW PRICE */}

            <Grid item xs={12}>
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  border: "1px solid",
                  borderColor: settings.websiteSettings.showPrice
                    ? "primary.main"
                    : "divider",
                  borderRadius: 2,
                  backgroundColor: settings.websiteSettings.showPrice
                    ? "action.hover"
                    : "transparent",
                }}
              >
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    xs: "flex-start",
                    sm: "center",
                  }}
                  spacing={2}
                >
                  <Box>
                    <Typography fontWeight={700}>
                      Hiển thị giá sản phẩm
                    </Typography>

                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {settings.websiteSettings.showPrice
                        ? "Giá sản phẩm đang được hiển thị cho khách hàng."
                        : 'Giá sản phẩm đang được ẩn. Khách hàng sẽ thấy "Liên hệ để biết giá".'}
                    </Typography>
                  </Box>

                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        checked={settings.websiteSettings.showPrice}
                        onChange={(e) =>
                          updateGroup(
                            "websiteSettings",
                            "showPrice",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={
                      settings.websiteSettings.showPrice
                        ? "Đang bật"
                        : "Đang tắt"
                    }
                  />
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ====================================================
          SECURITY
      ==================================================== */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <SectionTitle
            icon={<Lock />}
            title="Bảo mật tài khoản"
            description="Thay đổi mật khẩu tài khoản quản trị"
          />

          <Grid container spacing={2}>
            {/* CURRENT PASSWORD */}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mật khẩu hiện tại"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        edge="end"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                      >
                        {showCurrentPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* NEW PASSWORD */}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mật khẩu mới"
                type={showNewPassword ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                autoComplete="new-password"
                helperText="Tối thiểu 6 ký tự"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        edge="end"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* CONFIRM PASSWORD */}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Xác nhận mật khẩu mới"
                type={showConfirmPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        edge="end"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* CHANGE PASSWORD */}

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                startIcon={
                  changingPassword ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <Lock />
                  )
                }
                disabled={changingPassword}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  console.log("CLICK ĐỔI MẬT KHẨU");

                  handleChangePassword();
                }}
                sx={{
                  height: 44,
                  px: 3,
                  borderRadius: 2,
                  fontWeight: 700,
                }}
              >
                {changingPassword ? "Đang cập nhật..." : "Đổi mật khẩu"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ====================================================
          SAVE
      ==================================================== */}

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          size="large"
          startIcon={
            saving ? <CircularProgress size={20} color="inherit" /> : <Save />
          }
          disabled={saving || resetting}
          onClick={handleSave}
          sx={{
            minWidth: 180,
            height: 48,
            borderRadius: 2,
            fontWeight: 700,
          }}
        >
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </Stack>
    </Box>
  );
};

export default AdminSettings;
