import React from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Outlet } from "react-router-dom";

import AdminSidebar from "../components/AdminSidebar";
import AdminHeader from "../components/AdminHeader";

const DRAWER_WIDTH = 260;

const AdminLayout = () => {
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f5f6f8",
      }}
    >
      {/* SIDEBAR */}

      <AdminSidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
        isMobile={isMobile}
      />

      {/* MAIN */}

      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        {/* HEADER */}

        {/* <AdminHeader
          drawerWidth={DRAWER_WIDTH}
          onMenuClick={handleDrawerToggle}
          isMobile={isMobile}
        /> */}

        {/* CONTENT */}

        <Box
          component="main"
          sx={{
            p: {
              xs: 1.5,
              sm: 2,
              md: 3,
            },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
