import React from "react";

import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CategoryIcon from "@mui/icons-material/Category";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AddBoxIcon from "@mui/icons-material/AddBox";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import PostAddIcon from "@mui/icons-material/PostAdd";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { useLocation, useNavigate } from "react-router-dom";

interface Props {
  drawerWidth: number;
  mobileOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const AdminSidebar = ({
  drawerWidth,
  mobileOpen,
  onClose,
  isMobile,
}: Props) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuGroups = [
    {
      title: "TỔNG QUAN",
      items: [
        {
          label: "Dashboard",
          icon: <DashboardIcon />,
          path: "/admin",
        },
      ],
    },

    {
      title: "QUẢN LÝ SẢN PHẨM",
      items: [
        {
          label: "Tất cả sản phẩm",
          icon: <Inventory2Icon />,
          path: "/admin/products",
        },

        // ⭐ THÊM SẢN PHẨM
        {
          label: "Nhập sản phẩm",
          icon: <PostAddIcon />,
          path: "/admin/products/create",
        },

        {
          label: "Phụ tùng xe đạp",
          icon: <StorefrontIcon />,
          path: "/admin/products/bicycle",
        },

        {
          label: "Phụ tùng xe điện",
          icon: <StorefrontIcon />,
          path: "/admin/products/electric",
        },

        {
          label: "Phụ tùng xe ba gác",
          icon: <StorefrontIcon />,
          path: "/admin/products/tricycle",
        },

        {
          label: "Danh mục",
          icon: <CategoryIcon />,
          path: "/admin/categories",
        },
      ],
    },

    {
      title: "KHO HÀNG",
      items: [
        {
          label: "Tồn kho",
          icon: <Inventory2Icon />,
          path: "/admin/inventory",
        },

        {
          label: "Nhập kho",
          icon: <AddBoxIcon />,
          path: "/admin/inventory/import",
        },
        {
          label: "Lịch sử nhập kho",
          path: "/admin/inventory-receipts",
          icon: <Inventory2Icon />,
        },
        {
          label: "Lịch sử xuất kho",
          icon: <RemoveCircleOutlineIcon />,
          path: "/admin/inventory-history",
        },
      ],
    },

    {
      title: "BÁN HÀNG",
      items: [
        {
          label: "Đơn hàng",
          icon: <ShoppingCartIcon />,
          path: "/admin/orders",
        },
        {
          label: "Tạo đơn hàng",
          path: "/admin/orders/create",
          icon: <AddShoppingCartIcon />,
        },
        {
          label: "Khách hàng",
          icon: <PeopleIcon />,
          path: "/admin/customers",
        },
      ],
    },

    {
      title: "HỆ THỐNG",
      items: [
        {
          label: "Cài đặt",
          icon: <SettingsIcon />,
          path: "/admin/settings",
        },
      ],
    },
  ];

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* LOGO */}

      <Box
        sx={{
          height: 70,
          display: "flex",
          alignItems: "center",
          px: 2.5,
        }}
      >
        <Box>
          <Typography fontSize={20} fontWeight={800}>
            NHẬT KHANG
          </Typography>

          <Typography fontSize={13} fontWeight={600} color="text.secondary">
            BIKE ADMIN
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* MENU */}

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          py: 1.5,
        }}
      >
        {menuGroups.map((group) => (
          <Box
            key={group.title}
            sx={{
              mb: 1.5,
            }}
          >
            <Typography
              sx={{
                px: 2.5,
                mb: 0.5,
                fontSize: 10,
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: 0.8,
              }}
            >
              {group.title}
            </Typography>

            <List disablePadding>
              {group.items.map((item) => {
                const active =
                  item.path === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname === item.path;

                return (
                  <ListItemButton
                    key={item.path}
                    selected={active}
                    onClick={() => {
                      navigate(item.path);

                      if (isMobile) {
                        onClose();
                      }
                    }}
                    sx={{
                      mx: 1,
                      mb: 0.3,
                      borderRadius: 1.5,
                      minHeight: 44,

                      "&.Mui-selected": {
                        backgroundColor: "rgba(25, 118, 210, 0.10)",
                      },

                      "&.Mui-selected:hover": {
                        backgroundColor: "rgba(25, 118, 210, 0.16)",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: active ? "primary.main" : "text.secondary",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>

                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* FOOTER */}

      <Divider />

      <Box
        sx={{
          p: 2,
        }}
      >
        <Typography fontSize={12} color="text.secondary">
          © {new Date().getFullYear()} Nhật Khang Bike
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* MOBILE */}

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* DESKTOP */

        <Drawer
          variant="permanent"
          open
          sx={{
            width: drawerWidth,
            flexShrink: 0,

            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default AdminSidebar;
