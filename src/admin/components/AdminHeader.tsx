import React from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";

import { Logout, Menu as MenuIcon, AccountCircle } from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import { useState } from "react";

const AdminHeader = ({ onMenuClick }) => {
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);

  const adminUser = (() => {
    try {
      const user = localStorage.getItem("adminUser");

      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  })();

  const username = adminUser?.username || "Admin";

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // Xóa thông tin đăng nhập
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    // Đóng menu
    setAnchorEl(null);

    // Về trang login
    navigate("/admin/login", {
      replace: true,
    });
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,

        backgroundColor: "#ffffff",
        color: "#111827",

        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <Toolbar
        sx={{
          minHeight: "64px !important",
          px: {
            xs: 1.5,
            sm: 2,
            md: 3,
          },
        }}
      >
        {/* MOBILE MENU */}
        {onMenuClick && (
          <IconButton
            onClick={onMenuClick}
            sx={{
              display: {
                xs: "flex",
                md: "none",
              },
              mr: 1,
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* LOGO */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: {
              xs: "auto",
              md: 240,
            },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: {
                  xs: 16,
                  sm: 18,
                },
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: 0.5,
              }}
            >
              NHẬT KHANG BIKE
            </Typography>

            <Typography
              sx={{
                fontSize: 10,
                color: "#6b7280",
                letterSpacing: 1.5,
                mt: 0.3,
              }}
            >
              ADMIN MANAGEMENT
            </Typography>
          </Box>
        </Box>

        {/* TITLE */}
        <Box
          sx={{
            flex: 1,
            ml: {
              xs: 1,
              md: 3,
            },
          }}
        >
          <Typography
            sx={{
              display: {
                xs: "none",
                sm: "block",
              },
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            Hệ thống quản trị
          </Typography>
        </Box>

        {/* USER */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: {
                xs: "none",
                sm: "block",
              },
              textAlign: "right",
            }}
          >
            <Typography fontSize={14} fontWeight={700}>
              {username}
            </Typography>

            <Typography fontSize={11} color="text.secondary">
              Quản trị viên
            </Typography>
          </Box>

          <IconButton
            onClick={handleMenuOpen}
            sx={{
              p: 0.5,
            }}
          >
            <Avatar
              sx={{
                width: 38,
                height: 38,
                backgroundColor: "#111827",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {username.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Box>
      </Toolbar>

      {/* USER MENU */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            minWidth: 220,
          }}
        >
          <Typography fontWeight={700}>{username}</Typography>

          <Typography fontSize={12} color="text.secondary">
            Quản trị viên
          </Typography>
        </Box>

        <Divider />

        <MenuItem
          onClick={() => {
            handleMenuClose();
            navigate("/admin/settings");
          }}
        >
          <AccountCircle fontSize="small" sx={{ mr: 1.5 }} />
          Tài khoản
        </MenuItem>

        <MenuItem
          onClick={handleLogout}
          sx={{
            color: "error.main",
          }}
        >
          <Logout fontSize="small" sx={{ mr: 1.5 }} />
          Đăng xuất
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default AdminHeader;
