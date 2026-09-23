import React from "react";

import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

interface Props {
  drawerWidth: number;
  onMenuClick: () => void;
  isMobile: boolean;
}

const AdminHeader = ({ drawerWidth, onMenuClick, isMobile }: Props) => {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
      }}
    >
      <Toolbar
        sx={{
          minHeight: "64px !important",
          px: {
            xs: 1.5,
            md: 3,
          },
        }}
      >
        {isMobile && (
          <IconButton onClick={onMenuClick} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          sx={{
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Quản trị hệ thống
        </Typography>

        <Box sx={{ flex: 1 }} />

        <IconButton>
          <NotificationsNoneIcon />
        </IconButton>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            ml: 1,
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
            }}
          >
            K
          </Avatar>

          {!isMobile && (
            <Box>
              <Typography fontSize={13} fontWeight={600}>
                Admin
              </Typography>

              <Typography fontSize={11} color="text.secondary">
                Nhật Khang Bike
              </Typography>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AdminHeader;
