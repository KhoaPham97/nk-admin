import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import { LockOutlined, Visibility, VisibilityOff } from "@mui/icons-material";

import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

import { API_ENDPOINTS } from "../../api";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // NẾU ĐÃ LOGIN -> KHÔNG CHO VÀO TRANG LOGIN
  // =====================================================

  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    if (token) {
      navigate("/admin", {
        replace: true,
      });
    }
  }, [navigate]);

  // =====================================================
  // INPUT
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = form.username.trim();
    const password = form.password;

    // -----------------------------
    // VALIDATE
    // -----------------------------

    if (!username) {
      setError("Vui lòng nhập tài khoản");
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // =================================================
      // CALL API
      // =================================================

      const response = await axios.post(API_ENDPOINTS.SIGNIN, {
        username,
        password,
      });

      const data = response?.data;

      console.log("LOGIN RESPONSE:", data);

      // =================================================
      // CHECK RESPONSE
      // =================================================

      if (!data?.success) {
        throw new Error(data?.message || "Tài khoản hoặc mật khẩu không đúng");
      }

      // =================================================
      // TOKEN
      // =================================================

      const token = data?.token || data?.accessToken || data?.data?.token;

      if (!token) {
        throw new Error("Đăng nhập thành công nhưng server không trả về token");
      }

      // =================================================
      // SAVE TOKEN
      // =================================================

      localStorage.setItem("adminToken", token);

      // =================================================
      // SAVE USER
      // =================================================

      const user = data?.user || data?.data?.user || null;

      if (user) {
        localStorage.setItem("adminUser", JSON.stringify(user));
      }

      // =================================================
      // REDIRECT
      // =================================================

      const from = location.state?.from || "/admin";

      // Chỉ cho redirect trong admin
      const redirectPath =
        typeof from === "string" &&
        from.startsWith("/admin") &&
        from !== "/admin/login"
          ? from
          : "/admin";

      navigate(redirectPath, {
        replace: true,
      });
    } catch (error) {
      console.error("Admin login error:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Đăng nhập thất bại";

      setError(message);

      // Nếu login lỗi thì xoá token cũ
      localStorage.removeItem("adminToken");

      localStorage.removeItem("adminUser");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,

        background:
          "linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)",
      }}
    >
      <Paper
        elevation={12}
        sx={{
          width: "100%",
          maxWidth: 420,
          overflow: "hidden",
          borderRadius: 3,
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <Box
          sx={{
            px: 3,
            py: 4,
            textAlign: "center",
            background: "#111827",
            color: "#fff",
          }}
        >
          <Box
            sx={{
              width: 68,
              height: 68,
              margin: "0 auto 16px",
              borderRadius: "50%",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              backgroundColor: "#fff",
              color: "#111827",
            }}
          >
            <LockOutlined sx={{ fontSize: 34 }} />
          </Box>

          <Typography variant="h5" fontWeight={800}>
            NHẬT KHANG BIKE
          </Typography>

          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              opacity: 0.7,
              letterSpacing: 1,
            }}
          >
            ADMIN MANAGEMENT
          </Typography>
        </Box>

        {/* =================================================
            FORM
        ================================================= */}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: {
              xs: 3,
              sm: 4,
            },
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Đăng nhập
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, mb: 3 }}
          >
            Đăng nhập vào trang quản trị
          </Typography>

          {/* ERROR */}

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          )}

          {/* USERNAME */}

          <TextField
            fullWidth
            name="username"
            label="Tài khoản"
            placeholder="Nhập tài khoản"
            value={form.username}
            onChange={handleChange}
            disabled={loading}
            autoComplete="username"
            autoFocus
            sx={{
              mb: 2,
            }}
          />

          {/* PASSWORD */}

          <TextField
            fullWidth
            name="password"
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                // form tự submit
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="button"
                    edge="end"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
            }}
          />

          {/* LOGIN BUTTON */}

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              height: 50,
              borderRadius: 2,
              fontWeight: 800,
            }}
          >
            {loading ? (
              <CircularProgress size={25} color="inherit" />
            ) : (
              "ĐĂNG NHẬP"
            )}
          </Button>

          {/* FOOTER */}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 3,
            }}
          >
            © {new Date().getFullYear()} Nhật Khang Bike
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminLogin;
